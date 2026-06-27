# RT-T2-日志模块-分层测试策略

> 版本：v1.1
> 日期：2026-06-26
> 代码提交：9ee4b91c5dfc7531caf398b74970d8137ee35c65

---

## 目录

1. [测试策略概述](#测试策略概述)
2. [L1 单元测试策略](#l1-单元测试策略)
3. [L2 API自动化测试策略](#l2-api自动化测试策略)
4. [L3 Playwright测试策略](#l3-playwright测试策略)
5. [测试覆盖率目标](#测试覆盖率目标)
6. [优先级规划](#优先级规划)
7. [测试工具与环境](#测试工具与环境)
8. [代码质量问题与修复建议](#代码质量问题与修复建议)

---

## 测试策略概述

### 模块功能分析

日志模块是系统的基础设施模块，为整个应用提供日志记录、请求追踪、敏感信息脱敏和监控指标功能。

| 子模块 | 文件 | 功能特点 | 推荐测试方式 |
|--------|------|----------|-------------|
| sanitizers.ts | 364行 | 纯工具函数，无外部依赖 | **L1 单测** |
| logger.ts | 239行 | 封装Fastify Logger，有外部依赖 | **L1 单测（Mock依赖）** |
| correlation.ts | 85行 | Fastify中间件，涉及HTTP请求 | **L1 单测 + L2 API自动化** |
| metrics.ts | 173行 | 内存指标存储 + HTTP端点 | **L1 单测 + L2 API自动化** |

### 测试分层策略

```
┌─────────────────────────────────────────────────────────┐
│                    L3 Playwright                        │
│  用户体验层面：验证日志模块与前端的集成效果               │
│  当前模块不涉及UI，暂不需要                              │
├─────────────────────────────────────────────────────────┤
│                    L2 API自动化                          │
│  业务流程层面：验证中间件和端点的集成效果                 │
│  • correlation中间件功能验证                             │
│  • /metrics端点验证                                     │
├─────────────────────────────────────────────────────────┤
│                    L1 单元测试                           │
│  基础保障层面：验证单个函数的正确性                       │
│  • 脱敏工具函数（通过公共API间接测试）                    │
│  • Logger核心方法（Mock依赖）                            │
│  • Correlation ID生成逻辑                               │
│  • 指标收集逻辑                                         │
└─────────────────────────────────────────────────────────┘
```

---

## L1 单元测试策略

### L1.1 覆盖范围

| 文件 | 可测试函数 | 测试策略 |
|------|-----------|----------|
| `sanitizers.ts` | `sanitizeObject`, `sanitizeValue`, `sanitizeRequestLog`, `REDACT_CONFIG` | 通过公共API间接测试内部函数逻辑 |
| `logger.ts` | `Logger`类所有方法, `createBusinessLogger`, `logBusinessOperation`, `getLoggerFromRequest`, `setGlobalLogger`, `getGlobalLogger` | Mock FastifyBaseLogger，注意模块级状态重置 |
| `correlation.ts` | `generateCorrelationId`, `getCorrelationId` | 直接单测，中间件通过API测试验证 |
| `metrics.ts` | `initializeMetrics`, `recordBusinessOperation`, `getMetricsSnapshot` | 直接单测，注意模块级状态重置 |

### L1.2 单测覆盖点识别

#### sanitizers.ts

> **注意**：`pathMatch`、`fieldMatch`、`sanitizeEmail`、`sanitizePhone` 等内部函数未导出，无法直接单测。通过调用公共API `sanitizeObject` 和 `sanitizeValue` 间接覆盖这些函数的逻辑。

**类型1：公共API测试（间接覆盖内部函数）**

| 公共API | 测试点 | 间接覆盖的内部函数 | 关联案例 |
|---------|--------|-------------------|----------|
| `sanitizeObject` | 认证敏感字段匹配（password、token、authorization等） | `pathMatch`, `fieldMatch`, `isAuthRedactPath`, `isAuthRedactField` | TC-SAN-001~010 |
| `sanitizeObject` | 个人敏感字段格式脱敏（email、phone、idCard等） | `sanitizeByKey`, `sanitizeEmail`, `sanitizePhone`, `sanitizeIdCard`, `sanitizeBankCard`, `sanitizeChineseName`, `sanitizeBirthday`, `sanitizeAddress`, `sanitizeSocialSecurity`, `sanitizeDocumentNumber` | TC-SAN-011~023 |
| `sanitizeObject` | 递归处理（嵌套对象、数组、null/undefined） | `sanitizeObject`（递归逻辑） | TC-SAN-024~028 |
| `sanitizeValue` | 按字段名脱敏（单个值） | `isAuthRedactField`, `isPersonalSensitiveField`, `sanitizeByKey` | TC-SAN-011~023 |
| `sanitizeRequestLog` | 请求日志脱敏中间件 | 直接测试 | TC-SEC-005 |

#### logger.ts

**类型1：封装类（Mock依赖）**

| 方法 | 测试点 | 关联案例 |
|------|--------|----------|
| `Logger.info` | 正常记录、metadata脱敏、context注入 | TC-LOG-001, TC-LOG-010 |
| `Logger.warn` | 正常记录 | TC-LOG-002 |
| `Logger.error` | 正常记录、error对象序列化 | TC-LOG-003 |
| `Logger.logBusiness` | 业务元数据组装、脱敏处理 | TC-LOG-006 |
| `Logger.withCorrelationId` | 链式调用、上下文隔离（返回新实例） | TC-LOG-007, TC-LOG-009 |
| `Logger.withUser` | 链式调用、上下文隔离（返回新实例） | TC-LOG-008, TC-LOG-009 |

**类型2：全局Logger（Mock依赖）**

| 函数 | 测试点 | 关联案例 |
|------|--------|----------|
| `setGlobalLogger` | 设置成功 | TC-LOG-011 |
| `getGlobalLogger` | 获取成功、未初始化抛出异常 | TC-LOG-011, TC-LOG-012 |
| `createBusinessLogger` | 创建业务日志辅助函数 | TC-LOG-006 |
| `logBusinessOperation` | 静默失败处理 | TC-EDGE-008 |

**类型3：请求Logger（Bug修复验证）**

| 函数 | 测试点 | 关联案例 |
|------|--------|----------|
| `getLoggerFromRequest` | 正确设置correlationId（修复返回值未赋值问题） | TC-LOG-013 |

#### correlation.ts

**类型1：纯工具函数（直接单测）**

| 函数 | 测试点 | 关联案例 |
|------|--------|----------|
| `generateCorrelationId` | 生成唯一ID、格式验证 | TC-CORR-001 |
| `getCorrelationId` | 从请求头获取、无效时生成新ID | TC-CORR-002, TC-CORR-003 |

#### metrics.ts

**类型1：内存存储操作（直接单测）**

| 函数 | 测试点 | 关联案例 |
|------|--------|----------|
| `recordBusinessOperation` | 记录成功/失败操作 | TC-MET-005~007 |
| `getMetricsSnapshot` | 返回完整指标快照 | TC-MET-008 |

### L1.3 Mock策略与模块级状态重置

| 依赖 | Mock/重置方式 | 用途 |
|------|--------------|------|
| `FastifyBaseLogger` | Vitest `vi.mock` | 验证Logger方法调用和参数 |
| `FastifyRequest` | 创建模拟对象 | 测试getCorrelationId、getLoggerFromRequest |
| `FastifyReply` | 创建模拟对象 | 测试响应头设置 |
| `globalLogger`（模块级变量） | 在 `beforeEach` 中重新导入模块或设置为null | 测试间隔离，避免互相污染 |
| `metrics`（模块级变量） | 在 `beforeEach` 中调用重置函数或重新导入模块 | 测试间隔离，避免互相污染 |

#### 模块级状态重置方案

**方案1：添加重置函数（推荐）**

在 `logger.ts` 和 `metrics.ts` 中添加导出的重置函数：

```typescript
// logger.ts
export function resetGlobalLogger(): void {
  globalLogger = null;
}

// metrics.ts
export function resetMetrics(): void {
  metrics.httpRequestTotal = [];
  metrics.httpRequestDuration = [];
  metrics.businessOperationTotal = [];
}
```

**方案2：使用 Vitest 的模块重新导入**

```typescript
// 在测试文件的 beforeEach 中
import { vi, beforeEach } from 'vitest';

beforeEach(async () => {
  vi.resetModules();
  await import('../logger');
  await import('../metrics');
});
```

---

## L2 API自动化测试策略

### L2.1 覆盖范围

| 测试目标 | 测试方式 | 关联案例 |
|----------|----------|----------|
| correlation中间件集成 | 发起HTTP请求，验证请求对象和响应头 | TC-CORR-004~006 |
| /metrics端点 | 发起GET请求，验证响应格式和内容 | TC-MET-004 |
| 指标收集集成 | 发起多个请求，验证指标正确性 | TC-MET-001~003 |

### L2.2 API测试场景

#### 请求追踪中间件测试

| 场景 | 请求 | 预期响应 |
|------|------|----------|
| 自动生成correlationId | GET /api/test（无x-correlation-id头） | 响应头包含x-correlation-id |
| 传递correlationId | GET /api/test（含x-correlation-id头） | 响应头使用相同的correlationId |
| 无效correlationId处理 | GET /api/test（含超长x-correlation-id） | 响应头使用新生成的correlationId |

#### 监控指标端点测试

| 场景 | 请求 | 预期响应 |
|------|------|----------|
| 获取指标 | GET /metrics | 返回text/plain格式，包含http_request_total等指标 |
| 指标累计 | 连续发起请求后GET /metrics | 指标值正确累计 |
| 状态码分类 | 发起成功和失败请求后GET /metrics | 按状态码分类统计 |

---

## L3 Playwright测试策略

日志模块为后端基础设施模块，不涉及前端UI交互，当前不需要L3 Playwright测试。

**注意**：如果未来前端页面需要展示日志内容或监控指标图表，需增加L3测试验证：
- 日志列表展示（脱敏效果验证）
- 监控仪表盘数据展示
- 日志搜索功能

---

## 测试覆盖率目标

### 增量覆盖率目标

| 模块 | 文件 | 目标覆盖率 | 说明 |
|------|------|-----------|------|
| sanitizers.ts | 364行 | **≥ 90%** | 纯工具函数，应达到高覆盖率 |
| logger.ts | 239行 | **≥ 80%** | 封装类，核心方法需覆盖 |
| correlation.ts | 85行 | **≥ 70%** | 中间件逻辑，部分通过API测试覆盖 |
| metrics.ts | 173行 | **≥ 70%** | 指标收集逻辑，部分通过API测试覆盖 |
| **合计** | 861行 | **≥ 80%** | 新增代码增量覆盖率 |

### API自动化覆盖率目标

| 测试目标 | 覆盖率 | 说明 |
|----------|--------|------|
| correlation中间件 | **100%** | 所有关键路径 |
| /metrics端点 | **100%** | 响应格式和内容验证 |
| 指标收集集成 | **90%** | 主要场景覆盖 |

---

## 优先级规划

### P0（优先实现）

```
L1 单测：
├── sanitizers.ts - 核心脱敏函数（TC-SAN-001~010）
├── sanitizers.ts - 个人敏感字段格式脱敏（TC-SAN-011~023）
├── logger.ts - Logger核心方法（TC-LOG-001~006）
├── logger.ts - 日志脱敏metadata（TC-LOG-010）
└── logger.ts - getLoggerFromRequest Bug修复验证（TC-LOG-013）

L2 API自动化：
├── correlation中间件（TC-CORR-004~005）
└── /metrics端点（TC-MET-004）
```

### P1（其次实现）

```
L1 单测：
├── sanitizers.ts - 对象递归处理（TC-SAN-024~028）
├── logger.ts - 上下文管理（TC-LOG-007~009）
├── logger.ts - 全局Logger（TC-LOG-011~012）
├── correlation.ts - ID生成逻辑（TC-CORR-001~003）
└── metrics.ts - 指标收集逻辑（TC-MET-005~008）

L2 API自动化：
├── 指标收集集成（TC-MET-001~003）
└── 分布式链路追踪（TC-CORR-006）
```

### P2（最后实现）

```
L1 单测：
└── 边界场景（TC-EDGE-001~008）

安全测试：
└── TC-SEC-001~005
```

---

## 测试工具与环境

### 工具链

| 层级 | 工具 | 用途 |
|------|------|------|
| L1 单测 | Vitest | 单元测试框架 |
| L2 API自动化 | Vitest + Supertest | API集成测试 |
| Mock | Vitest Mock | 依赖Mock |

### 测试命令

```bash
# 运行所有测试
pnpm test

# 运行日志模块单测
pnpm test --filter=server -- src/common/logger/__tests__

# 运行特定测试文件
pnpm test --filter=server -- src/common/logger/__tests__/sanitizers.test.ts

# 生成覆盖率报告
pnpm test --filter=server -- --coverage
```

### 测试目录结构

```
release-train/apps/server/src/common/logger/
├── __tests__/
│   ├── sanitizers.test.ts       # 脱敏工具单测（已有）
│   ├── logger.test.ts           # Logger单测（待创建）
│   ├── correlation.test.ts      # 请求追踪单测（待创建）
│   └── metrics.test.ts          # 监控指标单测（待创建）
├── sanitizers.ts
├── logger.ts
├── correlation.ts
├── metrics.ts
└── index.ts
```

---

## 代码质量问题与修复建议

### 问题1：getLoggerFromRequest 中 correlationId 未正确设置（高严重度）

**位置**：`logger.ts:219`

**问题描述**：
```typescript
// 当前代码（有bug）
if (request.correlationId) {
  logger.withCorrelationId(request.correlationId); // 返回值未赋值！
}
return logger;
```

`withCorrelationId` 方法返回新的 Logger 实例（不可变模式），但返回值未赋值回 `logger`，导致 correlationId 实际上不会被设置。

**修复方案**：
```typescript
// 修复后代码
if (request.correlationId) {
  logger = logger.withCorrelationId(request.correlationId); // 正确赋值
}
return logger;
```

**关联测试**：TC-LOG-013

### 问题2：sanitizers.ts 内部函数未导出（中严重度）

**问题描述**：`pathMatch`、`fieldMatch`、`sanitizeEmail` 等内部函数未导出，无法直接进行单元测试。

**修复方案**：
- **方案A**（推荐）：保持现状，通过公共API `sanitizeObject` 和 `sanitizeValue` 间接测试内部逻辑
- **方案B**：导出内部函数供测试使用，如 `export { pathMatch, fieldMatch }`

### 问题3：模块级状态无重置机制（中严重度）

**问题描述**：`metrics.ts` 的 `metrics` 对象和 `logger.ts` 的 `globalLogger` 都是模块级变量，测试间会互相污染。

**修复方案**：添加重置函数，在 `beforeEach` 中调用：

```typescript
// logger.ts
export function resetGlobalLogger(): void {
  globalLogger = null;
}

// metrics.ts
export function resetMetrics(): void {
  metrics.httpRequestTotal = [];
  metrics.httpRequestDuration = [];
  metrics.businessOperationTotal = [];
}
```

### 问题4：设计文档读取失败

**问题描述**：尝试读取 `RT-T2-日志模块设计_v1.0_20260520.md` 返回空内容，需确认该文件是否存在或内容是否为空。