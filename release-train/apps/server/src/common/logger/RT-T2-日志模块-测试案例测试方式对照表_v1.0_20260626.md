# RT-T2-日志模块-测试案例×测试方式对照表

> 版本：v1.1
> 日期：2026-06-26
> 代码提交：9ee4b91c5dfc7531caf398b74970d8137ee35c65

---

## 目录

1. [统计概览](#统计概览)
2. [T2.1 敏感信息脱敏](#t21-敏感信息脱敏)
3. [T2.2 统一日志接口](#t22-统一日志接口)
4. [T2.3 请求追踪](#t23-请求追踪)
5. [T2.4 监控指标](#t24-监控指标)
6. [边界与异常场景](#边界与异常场景)
7. [安全测试场景](#安全测试场景)

---

## 统计概览

| 测试方式 | 数量 | 占比 | 已有覆盖 | 待新增 |
|---------|------|------|----------|--------|
| L1 单测 | 55 | 100% | 55 | 0 |
| L2 API自动化 | 6 | 100% | 6 | 0 |
| L3 Playwright | 0 | 0% | 0 | 0 |
| 叠加覆盖 | 4 | - | - | - |
| **合计** | **61** | **100%** | **61** | **0** |

> **更新**：v1.2 (2026-06-26) - 补充测试后全部案例已覆盖

---

## T2.1 敏感信息脱敏

### T2.1.1 认证敏感字段完全脱敏

| 案例编号 | 描述 | 测试方式 | 工具 | 覆盖逻辑 | 已有覆盖 |
|----------|------|---------|------|----------|----------|
| TC-SAN-001 | 脱敏密码字段 | **L1 单测** | Vitest | `sanitizeObject` - 认证敏感字段匹配 | ✅ |
| TC-SAN-002 | 脱敏嵌套密码字段 | **L1 单测** | Vitest | `sanitizeObject` - 递归处理嵌套对象 | ✅ |
| TC-SAN-003 | 脱敏token字段 | **L1 单测** | Vitest | `sanitizeObject` - 认证敏感字段匹配 | ✅ |
| TC-SAN-004 | 脱敏authorization请求头 | **L1 单测** | Vitest | `sanitizeObject` - 路径模式匹配 | ✅ |
| TC-SAN-005 | 脱敏cookie请求头 | **L1 单测** | Vitest | `sanitizeObject` - 路径模式匹配 | ✅ |
| TC-SAN-006 | 脱敏apiKey字段 | **L1 单测** | Vitest | `sanitizeObject` - 认证敏感字段匹配 | ✅ |
| TC-SAN-007 | 脱敏secret字段 | **L1 单测** | Vitest | `sanitizeObject` - 认证敏感字段匹配 | ✅ |
| TC-SAN-008 | 脱敏accessToken字段 | **L1 单测** | Vitest | `sanitizeObject` - 认证敏感字段匹配 | ✅ |
| TC-SAN-009 | 脱敏refreshToken字段 | **L1 单测** | Vitest | `sanitizeObject` - 认证敏感字段匹配 | ✅ |
| TC-SAN-010 | 大小写不敏感匹配 | **L1 单测** | Vitest | `isAuthRedactField` - 大小写转换逻辑 | ✅ |

### T2.1.2 个人敏感字段格式脱敏

| 案例编号 | 描述 | 测试方式 | 工具 | 覆盖逻辑 | 已有覆盖 |
|----------|------|---------|------|----------|----------|
| TC-SAN-011 | 脱敏邮箱 | **L1 单测** | Vitest | `sanitizeByKey` → `sanitizeEmail`（间接） | ✅ |
| TC-SAN-012 | 脱敏手机号(phone) | **L1 单测** | Vitest | `sanitizeByKey` → `sanitizePhone`（间接） | ✅ |
| TC-SAN-013 | 脱敏手机号(mobile) | **L1 单测** | Vitest | `sanitizeByKey` → `sanitizePhone`（间接） | ✅ |
| TC-SAN-014 | 脱敏身份证号 | **L1 单测** | Vitest | `sanitizeByKey` → `sanitizeIdCard`（间接） | ✅ |
| TC-SAN-015 | 脱敏银行卡号 | **L1 单测** | Vitest | `sanitizeByKey` → `sanitizeBankCard`（间接） | ✅ |
| TC-SAN-016 | 脱敏中文姓名(2字) | **L1 单测** | Vitest | `sanitizeByKey` → `sanitizeChineseName`（间接） | ✅ |
| TC-SAN-017 | 脱敏中文姓名(3字) | **L1 单测** | Vitest | `sanitizeByKey` → `sanitizeChineseName`（间接） | ✅ |
| TC-SAN-018 | 脱敏中文姓名(4字) | **L1 单测** | Vitest | `sanitizeByKey` → `sanitizeChineseName`（间接） | ✅ |
| TC-SAN-019 | 脱敏生日 | **L1 单测** | Vitest | `sanitizeByKey` → `sanitizeBirthday`（间接） | ✅ |
| TC-SAN-020 | 脱敏地址 | **L1 单测** | Vitest | `sanitizeByKey` → `sanitizeAddress`（间接） | ✅ |
| TC-SAN-021 | 脱敏社保号 | **L1 单测** | Vitest | `sanitizeByKey` → `sanitizeSocialSecurity`（间接） | ✅ |
| TC-SAN-022 | 脱敏护照号 | **L1 单测** | Vitest | `sanitizeByKey` → `sanitizeDocumentNumber`（间接） | ✅ |
| TC-SAN-023 | 脱敏驾照号 | **L1 单测** | Vitest | `sanitizeByKey` → `sanitizeDocumentNumber`（间接） | ✅ |

### T2.1.3 对象递归处理

| 案例编号 | 描述 | 测试方式 | 工具 | 覆盖逻辑 | 已有覆盖 |
|----------|------|---------|------|----------|----------|
| TC-SAN-024 | 处理数组中的敏感字段 | **L1 单测** | Vitest | `sanitizeObject` - 数组遍历处理 | ✅ |
| TC-SAN-025 | 处理null值 | **L1 单测** | Vitest | `sanitizeObject` - null值检查 | ✅ |
| TC-SAN-026 | 处理undefined值 | **L1 单测** | Vitest | `sanitizeObject` - undefined值检查 | ✅ |
| TC-SAN-027 | 保留非敏感字段不变 | **L1 单测** | Vitest | `sanitizeObject` - 非敏感字段保留 | ✅ |
| TC-SAN-028 | 处理多层嵌套对象 | **L1 单测** | Vitest | `sanitizeObject` - 多层递归处理 | ✅ |

---

## T2.2 统一日志接口

### T2.2.1 Logger核心方法

| 案例编号 | 描述 | 测试方式 | 工具 | 覆盖逻辑 | 已有覆盖 |
|----------|------|---------|------|----------|----------|
| TC-LOG-001 | info级别日志记录 | **L1 单测** | Vitest + Mock | `Logger.info` - 消息和metadata处理 | ✅ |
| TC-LOG-002 | warn级别日志记录 | **L1 单测** | Vitest + Mock | `Logger.warn` - 消息处理 | ✅ |
| TC-LOG-003 | error级别日志记录 | **L1 单测** | Vitest + Mock | `Logger.error` - error对象序列化 | ✅ |
| TC-LOG-004 | debug级别日志记录 | **L1 单测** | Vitest + Mock | `Logger.debug` - 消息处理 | ✅ |
| TC-LOG-005 | trace级别日志记录 | **L1 单测** | Vitest + Mock | `Logger.trace` - 消息处理 | ✅ |
| TC-LOG-006 | 业务日志记录 | **L1 单测** | Vitest + Mock | `Logger.logBusiness` - 业务元数据组装 | ✅ |

### T2.2.2 上下文管理

| 案例编号 | 描述 | 测试方式 | 工具 | 覆盖逻辑 | 已有覆盖 |
|----------|------|---------|------|----------|----------|
| TC-LOG-007 | 设置correlationId | **L1 单测** | Vitest + Mock | `Logger.withCorrelationId` - 上下文注入（返回新实例） | ✅ |
| TC-LOG-008 | 设置用户信息 | **L1 单测** | Vitest + Mock | `Logger.withUser` - 用户信息注入（返回新实例） | ✅ |
| TC-LOG-009 | 链式设置上下文 | **L1 单测** | Vitest + Mock | `Logger` - 链式调用和上下文隔离 | ✅ |
| TC-LOG-010 | 日志脱敏metadata | **L1 单测** | Vitest + Mock | `Logger.buildContext` - metadata脱敏 | ✅ |

### T2.2.3 全局Logger

| 案例编号 | 描述 | 测试方式 | 工具 | 覆盖逻辑 | 已有覆盖 |
|----------|------|---------|------|----------|----------|
| TC-LOG-011 | 设置全局Logger | **L1 单测** | Vitest + Mock | `setGlobalLogger` / `getGlobalLogger` | ✅ |
| TC-LOG-012 | 获取未初始化的全局Logger | **L1 单测** | Vitest + Mock | `getGlobalLogger` - 异常抛出 | ✅ |

### T2.2.4 请求Logger（Bug修复验证）

| 案例编号 | 描述 | 测试方式 | 工具 | 覆盖逻辑 | 已有覆盖 |
|----------|------|---------|------|----------|----------|
| TC-LOG-013 | getLoggerFromRequest应正确设置correlationId | **L1 单测** | Vitest + Mock | `getLoggerFromRequest` - 返回值赋值验证 | ✅ |

---

## T2.3 请求追踪

### T2.3.1 Correlation ID生成与传递

| 案例编号 | 描述 | 测试方式 | 工具 | 覆盖逻辑 | 已有覆盖 |
|----------|------|---------|------|----------|----------|
| TC-CORR-001 | 生成新的correlationId | **L1 单测** | Vitest | `generateCorrelationId` - ID生成算法 | ✅ |
| TC-CORR-002 | 从请求头获取correlationId | **L1 单测** | Vitest | `getCorrelationId` - 正常解析 | ✅ |
| TC-CORR-003 | 无效correlationId自动生成 | **L1 单测** | Vitest | `getCorrelationId` - 长度校验 | ✅ |
| TC-CORR-004 | 响应头包含correlationId | **L2 API自动化** | Vitest + Supertest | `correlationMiddleware` - 响应头设置 | ✅ |

### T2.3.2 请求追踪中间件

| 案例编号 | 描述 | 测试方式 | 工具 | 覆盖逻辑 | 已有覆盖 |
|----------|------|---------|------|----------|----------|
| TC-CORR-005 | onResponse记录请求完成日志 | **L2 API自动化** | Vitest + Supertest | `correlationMiddleware` - 日志记录 | ✅ |
| TC-CORR-006 | 分布式链路追踪传递 | **L2 API自动化** | Vitest + Supertest | `correlationMiddleware` - 请求头传递 | ✅ |

---

## T2.4 监控指标

### T2.4.1 HTTP请求指标

| 案例编号 | 描述 | 测试方式 | 工具 | 覆盖逻辑 | 已有覆盖 |
|----------|------|---------|------|----------|----------|
| TC-MET-001 | 增加HTTP请求计数 | **L1 单测** | Vitest | `incHttpRequest` - 计数逻辑 | ✅ |
| TC-MET-002 | 按状态码统计请求 | **L1 单测** | Vitest | `incHttpRequest` - 标签分组 | ✅ |
| TC-MET-003 | 记录请求耗时 | **L1 单测** | Vitest | `observeHttpDuration` - 移动平均计算 | ✅ |
| TC-MET-004 | /metrics端点返回Prometheus格式 | **L2 API自动化** | Vitest + Supertest | `initializeMetrics` - HTTP端点 | ✅ |

### T2.4.2 业务操作指标

| 案例编号 | 描述 | 测试方式 | 工具 | 覆盖逻辑 | 已有覆盖 |
|----------|------|---------|------|----------|----------|
| TC-MET-005 | 记录业务操作成功 | **L1 单测** | Vitest | `recordBusinessOperation` - 成功计数 | ✅ |
| TC-MET-006 | 记录业务操作失败 | **L1 单测** | Vitest | `recordBusinessOperation` - 失败计数 | ✅ |
| TC-MET-007 | 按模块统计业务操作 | **L1 单测** | Vitest | `incBusinessOperation` - 模块分组 | ✅ |
| TC-MET-008 | 获取指标快照 | **L1 单测** | Vitest | `getMetricsSnapshot` - 数据结构 | ✅ |

---

## 边界与异常场景

| 案例编号 | 描述 | 测试方式 | 工具 | 覆盖逻辑 | 已有覆盖 |
|----------|------|---------|------|----------|----------|
| TC-EDGE-001 | 空对象脱敏 | **L1 单测** | Vitest | `sanitizeObject` - 空对象处理 | ✅ |
| TC-EDGE-002 | 超大数组脱敏 | **L1 单测** | Vitest | `sanitizeObject` - 性能边界 | ✅ |
| TC-EDGE-003 | 循环引用对象脱敏 | **L1 单测** | Vitest | `sanitizeObject` - 递归终止 | ✅ |
| TC-EDGE-004 | 特殊字符邮箱脱敏 | **L1 单测** | Vitest | `sanitizeEmail` - 边界输入（间接） | ✅ |
| TC-EDGE-005 | 非标准手机号格式 | **L1 单测** | Vitest | `sanitizePhone` - 格式校验（间接） | ✅ |
| TC-EDGE-006 | 并发请求生成correlationId | **L2 API自动化** | Vitest + Supertest | `generateCorrelationId` - 唯一性 | ✅ |
| TC-EDGE-007 | 高频请求指标计数 | **L2 API自动化** | Vitest + Supertest | `incHttpRequest` - 并发安全性 | ✅ |
| TC-EDGE-008 | 日志记录失败静默处理 | **L1 单测** | Vitest + Mock | `logBusinessOperation` - 异常捕获 | ✅ |

---

## 安全测试场景

| 案例编号 | 描述 | 测试方式 | 工具 | 覆盖逻辑 | 已有覆盖 |
|----------|------|---------|------|----------|----------|
| TC-SEC-001 | 密码字段完全脱敏 | **L1 单测** | Vitest | `sanitizeObject` - 认证敏感字段 | ✅ |
| TC-SEC-002 | Token字段完全脱敏 | **L1 单测** | Vitest | `sanitizeObject` - 认证敏感字段 | ✅ |
| TC-SEC-003 | Authorization头脱敏 | **L1 单测** | Vitest | `sanitizeObject` - 路径模式匹配 | ✅ |
| TC-SEC-004 | 身份证号脱敏 | **L1 单测** | Vitest | `sanitizeIdCard` - 格式脱敏（间接） | ✅ |
| TC-SEC-005 | 请求日志脱敏中间件 | **L2 API自动化** | Vitest + Supertest | `sanitizeRequestLog` - 中间件集成 | ✅ |

---

## 测试方式判定依据

| 测试场景 | 推荐方式 | 判断依据 |
|---------|---------|----------|
| 纯工具函数（无外部依赖） | **L1 单测** | 无副作用，可独立测试 |
| 脱敏逻辑（正则匹配、字符串处理） | **L1 单测** | 纯函数逻辑，输入输出明确（通过公共API间接测试） |
| 封装类（有外部依赖） | **L1 单测（Mock）** | Mock外部依赖，验证方法调用 |
| 中间件（涉及HTTP请求） | **L2 API自动化** | 验证中间件与Fastify的集成 |
| HTTP端点（/metrics） | **L2 API自动化** | 验证端点响应格式和内容 |
| 并发场景 | **L2 API自动化** | 模拟真实并发请求 |

---

## 叠加覆盖说明

以下案例同时被L1和L2测试覆盖：

| 案例编号 | 描述 | L1覆盖 | L2覆盖 |
|----------|------|--------|--------|
| TC-CORR-001 | 生成新的correlationId | `generateCorrelationId`函数 | 请求级验证 |
| TC-CORR-002 | 从请求头获取correlationId | `getCorrelationId`函数 | 请求级验证 |
| TC-MET-001 | 增加HTTP请求计数 | `incHttpRequest`函数 | 集成验证 |
| TC-MET-003 | 记录请求耗时 | `observeHttpDuration`函数 | 集成验证 |

---

## 内部函数测试说明

> **重要**：`sanitizers.ts` 中的 `pathMatch`、`fieldMatch`、`sanitizeEmail`、`sanitizePhone` 等内部函数未导出，无法直接单测。以下对照表展示了如何通过公共API间接覆盖这些内部函数：

| 内部函数 | 间接覆盖方式 | 关联案例 |
|----------|-------------|----------|
| `pathMatch` | 通过 `sanitizeObject` 传递带路径的对象 | TC-SAN-004~005 |
| `fieldMatch` | 通过 `sanitizeObject` 传递带通配符字段的对象 | TC-SAN-001~010 |
| `sanitizeEmail` | 通过 `sanitizeObject({ email: 'xxx' })` | TC-SAN-011 |
| `sanitizePhone` | 通过 `sanitizeObject({ phone: 'xxx' })` | TC-SAN-012~013 |
| `sanitizeIdCard` | 通过 `sanitizeObject({ idCard: 'xxx' })` | TC-SAN-014 |
| `sanitizeBankCard` | 通过 `sanitizeObject({ bankCard: 'xxx' })` | TC-SAN-015 |
| `sanitizeChineseName` | 通过 `sanitizeObject({ realName: 'xxx' })` | TC-SAN-016~018 |
| `sanitizeBirthday` | 通过 `sanitizeObject({ birthday: 'xxx' })` | TC-SAN-019 |
| `sanitizeAddress` | 通过 `sanitizeObject({ address: 'xxx' })` | TC-SAN-020 |
| `sanitizeSocialSecurity` | 通过 `sanitizeObject({ socialSecurity: 'xxx' })` | TC-SAN-021 |
| `sanitizeDocumentNumber` | 通过 `sanitizeObject({ passport/driverLicense: 'xxx' })` | TC-SAN-022~023 |