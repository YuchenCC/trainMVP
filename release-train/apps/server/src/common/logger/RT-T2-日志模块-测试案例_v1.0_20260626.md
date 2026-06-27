# RT-T2-日志模块-测试案例

> 版本：v1.1
> 日期：2026-06-26
> 代码提交：9ee4b91c5dfc7531caf398b74970d8137ee35c65
> 来源：代码分析生成

---

## 目录

1. [模块概述](#模块概述)
2. [测试案例总览](#测试案例总览)
3. [T2.1 敏感信息脱敏](#t21-敏感信息脱敏)
4. [T2.2 统一日志接口](#t22-统一日志接口)
5. [T2.3 请求追踪](#t23-请求追踪)
6. [T2.4 监控指标](#t24-监控指标)
7. [边界与异常场景](#边界与异常场景)
8. [安全测试场景](#安全测试场景)

---

## 模块概述

日志模块包含以下核心功能：

| 子模块 | 文件 | 功能 |
|--------|------|------|
| 敏感信息脱敏 | `sanitizers.ts` | 认证敏感字段完全替换 + 个人敏感字段格式脱敏 |
| 统一日志接口 | `logger.ts` | 封装Fastify Logger，提供结构化和业务日志能力 |
| 请求追踪 | `correlation.ts` | 为每个请求生成/传递correlation ID，支持分布式链路追踪 |
| 监控指标 | `metrics.ts` | HTTP请求和业务操作的Prometheus指标收集 |

---

## 测试案例总览

| 子模块 | 案例数 | L1单测 | L2 API自动化 | 已有覆盖 | 待新增 |
|--------|--------|--------|--------------|----------|--------|
| T2.1 敏感信息脱敏 | 28 | 28 | 0 | 28 | 0 |
| T2.2 统一日志接口 | 13 | 13 | 0 | 15 | 0 |
| T2.3 请求追踪 | 6 | 3 | 3 | 6 | 0 |
| T2.4 监控指标 | 8 | 4 | 4 | 8 | 0 |
| **合计** | **55** | **48** | **7** | **57** | **0** |

---

## T2.1 敏感信息脱敏

### T2.1.1 认证敏感字段完全脱敏

| 编号 | 描述 | 前置条件 | 操作步骤 | 预期结果 | 已有覆盖 |
|------|------|----------|----------|----------|----------|
| TC-SAN-001 | 脱敏密码字段 | 输入对象包含password字段 | `sanitizeObject({ password: 'secret123' })` | 返回值中password为`[REDACTED]` | ✅ |
| TC-SAN-002 | 脱敏嵌套密码字段 | 输入对象包含嵌套的password字段 | `sanitizeObject({ user: { password: 'secret123' } })` | 返回值中user.password为`[REDACTED]` | ✅ |
| TC-SAN-003 | 脱敏token字段 | 输入对象包含token字段 | `sanitizeObject({ token: 'abc123xyz' })` | 返回值中token为`[REDACTED]` | ✅ |
| TC-SAN-004 | 脱敏authorization请求头 | 输入对象包含headers.authorization | `sanitizeObject({ headers: { authorization: 'Bearer xxx' } })` | 返回值中authorization为`[REDACTED]` | ✅ |
| TC-SAN-005 | 脱敏cookie请求头 | 输入对象包含headers.cookie | `sanitizeObject({ headers: { cookie: 'session=abc' } })` | 返回值中cookie为`[REDACTED]` | ❌ |
| TC-SAN-006 | 脱敏apiKey字段 | 输入对象包含apiKey字段 | `sanitizeObject({ apiKey: 'key123' })` | 返回值中apiKey为`[REDACTED]` | ❌ |
| TC-SAN-007 | 脱敏secret字段 | 输入对象包含secret字段 | `sanitizeObject({ secret: 'secret123' })` | 返回值中secret为`[REDACTED]` | ❌ |
| TC-SAN-008 | 脱敏accessToken字段 | 输入对象包含accessToken字段 | `sanitizeObject({ accessToken: 'token123' })` | 返回值中accessToken为`[REDACTED]` | ❌ |
| TC-SAN-009 | 脱敏refreshToken字段 | 输入对象包含refreshToken字段 | `sanitizeObject({ refreshToken: 'token456' })` | 返回值中refreshToken为`[REDACTED]` | ❌ |
| TC-SAN-010 | 大小写不敏感匹配 | 输入对象包含PASSWORD大写字段 | `sanitizeObject({ PASSWORD: 'secret123' })` | 返回值中PASSWORD为`[REDACTED]` | ✅ |

### T2.1.2 个人敏感字段格式脱敏

| 编号 | 描述 | 前置条件 | 操作步骤 | 预期结果 | 已有覆盖 |
|------|------|----------|----------|----------|----------|
| TC-SAN-011 | 脱敏邮箱 | 输入对象包含email字段 | `sanitizeObject({ email: 'zhangsan@example.com' })` | 返回值中email为`z***@example.com` | ✅ |
| TC-SAN-012 | 脱敏手机号(phone) | 输入对象包含phone字段 | `sanitizeObject({ phone: '13812345678' })` | 返回值中phone为`138****5678` | ✅ |
| TC-SAN-013 | 脱敏手机号(mobile) | 输入对象包含mobile字段 | `sanitizeObject({ mobile: '13812345678' })` | 返回值中mobile为`138****5678` | ✅ |
| TC-SAN-014 | 脱敏身份证号 | 输入对象包含idCard字段 | `sanitizeObject({ idCard: '310101199001011234' })` | 返回值中idCard为`310***********1234` | ✅ |
| TC-SAN-015 | 脱敏银行卡号 | 输入对象包含bankCard字段 | `sanitizeObject({ bankCard: '6222021234567890123' })` | 返回值中bankCard为`**** **** **** 0123` | ✅ |
| TC-SAN-016 | 脱敏中文姓名(2字) | 输入对象包含realName字段(2字) | `sanitizeObject({ realName: '张三' })` | 返回值中realName为`张*` | ✅ |
| TC-SAN-017 | 脱敏中文姓名(3字) | 输入对象包含realName字段(3字) | `sanitizeObject({ realName: '欧阳娜' })` | 返回值中realName为`欧*娜` | ✅ |
| TC-SAN-018 | 脱敏中文姓名(4字) | 输入对象包含realName字段(4字) | `sanitizeObject({ realName: '司马相如' })` | 返回值中realName为`司*如` | ❌ |
| TC-SAN-019 | 脱敏生日 | 输入对象包含birthday字段 | `sanitizeObject({ birthday: '1990-01-01' })` | 返回值中birthday为`****-**-**` | ✅ |
| TC-SAN-020 | 脱敏地址 | 输入对象包含address字段 | `sanitizeObject({ address: '上海市浦东新区张江镇某路123号' })` | 返回值中address为`上海市***` | ✅ |
| TC-SAN-021 | 脱敏社保号 | 输入对象包含socialSecurity字段 | `sanitizeObject({ socialSecurity: '310000199001011234' })` | 返回值中socialSecurity为`*** *** *** 1234` | ❌ |
| TC-SAN-022 | 脱敏护照号 | 输入对象包含passport字段 | `sanitizeObject({ passport: 'G12345678' })` | 返回值中passport为`****5678` | ❌ |
| TC-SAN-023 | 脱敏驾照号 | 输入对象包含driverLicense字段 | `sanitizeObject({ driverLicense: 'A1234567' })` | 返回值中driverLicense为`****4567` | ❌ |

### T2.1.3 对象递归处理

| 编号 | 描述 | 前置条件 | 操作步骤 | 预期结果 | 已有覆盖 |
|------|------|----------|----------|----------|----------|
| TC-SAN-024 | 处理数组中的敏感字段 | 输入对象包含数组，数组元素含敏感字段 | `sanitizeObject({ users: [{ password: 'pass1' }, { password: 'pass2' }] })` | 数组中所有password字段均为`[REDACTED]` | ✅ |
| TC-SAN-025 | 处理null值 | 输入对象包含null值 | `sanitizeObject({ a: null })` | 返回值中a保持为null | ✅ |
| TC-SAN-026 | 处理undefined值 | 输入对象包含undefined值 | `sanitizeObject({ b: undefined })` | 返回值中b保持为undefined | ✅ |
| TC-SAN-027 | 保留非敏感字段不变 | 输入对象只包含普通字段 | `sanitizeObject({ name: 'test', age: 25 })` | 返回值与输入值相同 | ✅ |
| TC-SAN-028 | 处理多层嵌套对象 | 输入对象包含3层以上嵌套 | `sanitizeObject({ a: { b: { c: { password: 'secret' } } } })` | 最内层password为`[REDACTED]` | ❌ |

---

## T2.2 统一日志接口

### T2.2.1 Logger核心方法

| 编号 | 描述 | 前置条件 | 操作步骤 | 预期结果 | 已有覆盖 |
|------|------|----------|----------|----------|----------|
| TC-LOG-001 | info级别日志记录 | 初始化Logger实例 | `logger.info('test message', { data: 'value' })` | 日志正常输出，包含message和metadata | ❌ |
| TC-LOG-002 | warn级别日志记录 | 初始化Logger实例 | `logger.warn('warning message')` | 日志正常输出，级别为warn | ❌ |
| TC-LOG-003 | error级别日志记录 | 初始化Logger实例 | `logger.error('error message', new Error('test'))` | 日志正常输出，包含error对象信息 | ❌ |
| TC-LOG-004 | debug级别日志记录 | 初始化Logger实例 | `logger.debug('debug message')` | 日志正常输出，级别为debug | ❌ |
| TC-LOG-005 | trace级别日志记录 | 初始化Logger实例 | `logger.trace('trace message')` | 日志正常输出，级别为trace | ❌ |
| TC-LOG-006 | 业务日志记录 | 初始化Logger实例 | `logger.logBusiness({ module: 'test', action: 'create' })` | 日志正常输出，包含业务元数据 | ❌ |

### T2.2.2 上下文管理

| 编号 | 描述 | 前置条件 | 操作步骤 | 预期结果 | 已有覆盖 |
|------|------|----------|----------|----------|----------|
| TC-LOG-007 | 设置correlationId | 初始化Logger实例 | `logger.withCorrelationId('corr-123').info('test')` | 日志中包含correlationId | ❌ |
| TC-LOG-008 | 设置用户信息 | 初始化Logger实例 | `logger.withUser('user-1', 'admin').info('test')` | 日志中包含userId和userRole | ❌ |
| TC-LOG-009 | 链式设置上下文 | 初始化Logger实例 | `logger.withCorrelationId('c1').withUser('u1').info('test')` | 日志中同时包含correlationId和userId | ❌ |
| TC-LOG-010 | 日志脱敏metadata | 初始化Logger实例 | `logger.info('test', { password: 'secret' })` | metadata中的password被脱敏为`[REDACTED]` | ❌ |

### T2.2.3 全局Logger

| 编号 | 描述 | 前置条件 | 操作步骤 | 预期结果 | 已有覆盖 |
|------|------|----------|----------|----------|----------|
| TC-LOG-011 | 设置全局Logger | 无 | `setGlobalLogger(logger)` | 全局Logger被设置 | ❌ |
| TC-LOG-012 | 获取未初始化的全局Logger | 未调用setGlobalLogger | `getGlobalLogger()` | 抛出错误'Global logger not initialized' | ❌ |

### T2.2.4 请求Logger（Bug修复验证）

| 编号 | 描述 | 前置条件 | 操作步骤 | 预期结果 | 已有覆盖 |
|------|------|----------|----------|----------|----------|
| TC-LOG-013 | getLoggerFromRequest应正确设置correlationId | 请求对象包含correlationId | `getLoggerFromRequest(request)` | 返回的Logger实例包含correlationId | ❌ |

---

## T2.3 请求追踪

### T2.3.1 Correlation ID生成与传递

| 编号 | 描述 | 前置条件 | 操作步骤 | 预期结果 | 已有覆盖 |
|------|------|----------|----------|----------|----------|
| TC-CORR-001 | 生成新的correlationId | 请求头无x-correlation-id | 发起请求 | 请求对象包含自动生成的correlationId | ❌ |
| TC-CORR-002 | 从请求头获取correlationId | 请求头包含x-correlation-id | 发起请求 | 使用请求头中的correlationId | ❌ |
| TC-CORR-003 | 无效correlationId自动生成 | 请求头包含无效的correlationId(超长) | 发起请求 | 自动生成新的correlationId | ❌ |
| TC-CORR-004 | 响应头包含correlationId | 发起请求 | 检查响应头 | 响应头包含x-correlation-id | ❌ |

### T2.3.2 请求追踪中间件

| 编号 | 描述 | 前置条件 | 操作步骤 | 预期结果 | 已有覆盖 |
|------|------|----------|----------|----------|----------|
| TC-CORR-005 | onResponse记录请求完成日志 | 注册correlationMiddleware | 发起请求 | 日志记录包含correlationId、method、url、statusCode、duration | ❌ |
| TC-CORR-006 | 分布式链路追踪传递 | 服务A调用服务B | 服务A传递x-correlation-id | 服务B使用相同的correlationId | ❌ |

---

## T2.4 监控指标

### T2.4.1 HTTP请求指标

| 编号 | 描述 | 前置条件 | 操作步骤 | 预期结果 | 已有覆盖 |
|------|------|----------|----------|----------|----------|
| TC-MET-001 | 增加HTTP请求计数 | 注册metrics中间件 | 发起10次GET请求 | httpRequestTotal指标值为10 | ❌ |
| TC-MET-002 | 按状态码统计请求 | 注册metrics中间件 | 发起成功和失败请求 | 各状态码独立计数 | ❌ |
| TC-MET-003 | 记录请求耗时 | 注册metrics中间件 | 发起请求 | httpRequestDuration指标记录平均耗时 | ❌ |
| TC-MET-004 | /metrics端点返回Prometheus格式 | 注册metrics中间件 | GET /metrics | 返回text/plain格式，包含完整指标 | ❌ |

### T2.4.2 业务操作指标

| 编号 | 描述 | 前置条件 | 操作步骤 | 预期结果 | 已有覆盖 |
|------|------|----------|----------|----------|----------|
| TC-MET-005 | 记录业务操作成功 | 调用recordBusinessOperation | `recordBusinessOperation('test', 'create', 'success')` | businessOperationTotal指标增加 | ❌ |
| TC-MET-006 | 记录业务操作失败 | 调用recordBusinessOperation | `recordBusinessOperation('test', 'create', 'failure')` | 失败计数增加 | ❌ |
| TC-MET-007 | 按模块统计业务操作 | 调用不同模块的recordBusinessOperation | 调用moduleA和moduleB | 各模块独立计数 | ❌ |
| TC-MET-008 | 获取指标快照 | 执行若干操作后 | `getMetricsSnapshot()` | 返回当前所有指标的完整快照 | ❌ |

---

## 边界与异常场景

| 编号 | 描述 | 模块 | 预期结果 | 已有覆盖 |
|------|------|------|----------|----------|
| TC-EDGE-001 | 空对象脱敏 | sanitizers | 返回空对象 | ❌ |
| TC-EDGE-002 | 超大数组脱敏 | sanitizers | 递归处理完成，无内存溢出 | ❌ |
| TC-EDGE-003 | 循环引用对象脱敏 | sanitizers | 不进入死循环，正常处理 | ❌ |
| TC-EDGE-004 | 特殊字符邮箱脱敏 | sanitizers | 正常脱敏，不报错 | ❌ |
| TC-EDGE-005 | 非标准手机号格式 | sanitizers | 返回`[REDACTED]` | ❌ |
| TC-EDGE-006 | 并发请求生成correlationId | correlation | 每个请求获得唯一ID | ❌ |
| TC-EDGE-007 | 高频请求指标计数 | metrics | 计数准确，无丢失 | ❌ |
| TC-EDGE-008 | 日志记录失败静默处理 | logger | 不影响业务流程，仅控制台输出错误 | ❌ |

---

## 安全测试场景

| 编号 | 描述 | 模块 | 预期结果 | 已有覆盖 |
|------|------|------|----------|----------|
| TC-SEC-001 | 密码字段完全脱敏 | sanitizers | 日志中无任何密码明文 | ✅ |
| TC-SEC-002 | Token字段完全脱敏 | sanitizers | 日志中无任何Token明文 | ✅ |
| TC-SEC-003 | Authorization头脱敏 | sanitizers | 日志中无Bearer Token | ✅ |
| TC-SEC-004 | 身份证号脱敏 | sanitizers | 日志中身份证号部分脱敏，不可逆向 | ✅ |
| TC-SEC-005 | 请求日志脱敏中间件 | sanitizers | 请求日志中的敏感字段被正确替换 | ❌ |

---

## 现有测试与提案差距分析

### sanitizers.ts 已有测试覆盖（17/28）

**已覆盖的测试点**：
- 认证敏感字段：password、token、authorization、大小写不敏感匹配
- 个人敏感字段：email、phone、mobile、idCard、bankCard、realName(2字/3字)、birthday、address
- 对象递归处理：数组、null、undefined、非敏感字段保留

**未覆盖的测试点**：
- 认证敏感字段：cookie、apiKey、secret、accessToken、refreshToken
- 个人敏感字段：realName(4字)、socialSecurity、passport、driverLicense
- 对象递归处理：多层嵌套对象
- 请求日志脱敏中间件：`sanitizeRequestLog` 函数

### 代码质量问题

| 文件 | 问题描述 | 严重程度 | 关联测试 |
|------|----------|----------|----------|
| `logger.ts` | `getLoggerFromRequest` 中 `logger.withCorrelationId()` 返回值未赋值，导致 correlationId 不会被设置 | **高** | TC-LOG-013 |
| `sanitizers.ts` | 内部函数（pathMatch、fieldMatch、sanitizeEmail等）未导出，无法直接单测 | 中 | 通过公共API间接测试 |
| `metrics.ts` | 模块级变量 `metrics` 无重置机制，测试间会互相污染 | 中 | 需要 beforeEach 重置 |
| `logger.ts` | 模块级变量 `globalLogger` 无重置机制，测试间会互相污染 | 中 | 需要 beforeEach 重置 |