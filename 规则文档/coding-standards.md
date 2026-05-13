# Release Train 统一编码规范

## 一、规范概述

| 项目 | 内容 |
|------|------|
| 文档类型 | 编码规范 |
| 适用工程 | `release-train` |
| 技术栈 | React + Vite + Ant Design + Zustand / Fastify + Prisma / pnpm monorepo |
| 制定日期 | 2026-05-10 |
| 版本 | v1.1 |

本规范用于统一 `release-train` 工程的目录组织、命名、类型、接口、数据访问、错误处理、测试和安全边界。所有新增业务模块（需求池、版本火车、AI排期与优化）均应遵守本文。

---

## 二、基础原则

### 2.1 工程原则

| 原则 | 要求 |
|------|------|
| 类型优先 | 跨端共享的领域类型、枚举、API DTO 优先放入 `packages/shared` |
| 分层清晰 | 页面、状态、API 服务、后端路由、业务逻辑、数据访问不得互相越层调用 |
| 后端兜底 | 权限、状态流转、数据归属必须在后端校验，前端控制仅用于体验优化 |
| 响应统一 | 所有 API 成功/失败响应必须遵守 `ApiResponse<T>` |
| 安全默认 | 敏感信息、鉴权、CORS、日志脱敏遵守 `RT-安全规范_20260510.md` |
| 小步提交 | 每次变更围绕单一业务目标，避免顺手重构无关模块 |

### 2.2 禁止事项

- 禁止在代码、配置、注释、文档中提交明文密码、Token、API Key。
- 禁止前端直接拼接后端 URL 域名；统一使用 `apps/web/src/services/api.ts` 中的 axios 实例。
- 禁止后端手写 SQL 拼接用户输入；默认使用 Prisma ORM。
- 禁止绕过 `packages/shared` 重复定义角色、状态、API 响应等共享类型。
- 禁止在业务代码中使用 `any` 逃避类型约束；确需兼容外部数据时使用 `unknown` 后显式收窄。

---

## 三、Monorepo 规范

### 3.1 包管理

- 统一使用 `pnpm`，不得混用 `npm install`、`yarn install`。
- 根目录已有 `pnpm-lock.yaml`，依赖变更必须同步提交 lockfile。
- Node 版本遵守根 `package.json`：`>=18.0.0`。
- pnpm 版本遵守根 `package.json`：`>=8.0.0`。

### 3.2 目录职责

| 目录 | 职责 |
|------|------|
| `apps/web` | 前端应用，只放 UI、路由、前端状态、浏览器侧服务封装 |
| `apps/server` | 后端应用，只放 Fastify 路由、鉴权、业务服务、Prisma 调用 |
| `packages/shared` | 前后端共享类型、枚举、常量、API DTO |
| `doc` | 产品、架构、接口、数据库、编码规范等项目文档 |

### 3.3 依赖方向

允许：

```text
apps/web    -> packages/shared
apps/server -> packages/shared
```

禁止：

```text
packages/shared -> apps/web
packages/shared -> apps/server
apps/web        -> apps/server
apps/server     -> apps/web
```

---

## 四、TypeScript 通用规范

### 4.1 语言规则

- 使用 `strict: true`，新增代码不得依赖关闭严格模式。
- 导出类型使用 `export interface` 或 `export type`，按语义选择：
  - 对象结构、可扩展 DTO：优先 `interface`
  - 联合类型、映射类型、工具类型：使用 `type`
- 类型导入使用 `import type`。
- 不使用 `var`；默认 `const`，需要重赋值时使用 `let`。
- 异步函数必须返回 `Promise<T>`，公共函数不要依赖隐式返回类型。
- 业务枚举统一从 `@release-train/shared` 引入。

### 4.2 命名规则

| 对象 | 命名 |
|------|------|
| 文件夹 | kebab-case 或领域名小写，如 `requirements`、`auth` |
| React 组件文件 | PascalCase，如 `AuthGuard.tsx` |
| 页面入口文件 | `index.tsx` |
| TS 工具/服务文件 | camelCase 或领域名，如 `api.ts`、`dateUtils.ts` |
| 类型、接口、组件 | PascalCase |
| 变量、函数 | camelCase |
| 常量 | UPPER_SNAKE_CASE |
| 枚举成员 | UPPER_SNAKE_CASE |
| Prisma model | PascalCase |
| 数据库字段 | camelCase，与 Prisma schema 保持一致 |

### 4.3 注释规则

- 注释解释业务约束和不明显的设计选择，不重复描述代码字面含义。
- 状态机、权限矩阵、复杂查询必须补充短注释。
- 不在注释中写敏感信息、真实账号、真实 Token。

---

## 五、共享包规范

### 5.1 放入共享包的内容

以下内容必须放在 `packages/shared`：

- 角色枚举：`Role`、`SystemRole`
- 需求状态：`ReqStatus`、`ReqSubStatus`
- 火车状态：`TrainStatus`
- 审批状态：`ApprovalStatus`
- API 响应类型：`ApiResponse<T>`、`PaginatedResponse<T>`
- 跨端 DTO：如 `LoginRequest`、`LoginResponse`、需求创建/更新请求、火车排期请求
- 安全用户视图：如 `SafeUser`

### 5.2 导出规则

- 每个领域类型放在 `src/types/<domain>.ts`。
- 常量与枚举放在 `src/constants/index.ts`。
- `src/index.ts` 统一出口，应用侧只从 `@release-train/shared` 引入。

```typescript
// 推荐
import type { ApiResponse, LoginRequest } from '@release-train/shared';
import { Role } from '@release-train/shared';

// 不推荐
import type { ApiResponse } from '@release-train/shared/src/types/api';
```

---

## 六、前端编码规范

### 6.1 目录职责

| 目录 | 规范 |
|------|------|
| `components` | 可复用 UI 组件，不直接访问路由和全局业务流程 |
| `layouts` | 页面布局、菜单、导航、权限入口展示 |
| `pages` | 路由页面，负责组织组件和调用 store/service |
| `services` | API 调用封装，只暴露语义化函数或统一 axios 实例 |
| `stores` | Zustand 状态，存放跨页面状态 |
| `hooks` | 可复用 React hooks |
| `utils` | 无副作用工具函数 |
| `types` | 仅前端私有类型，跨端类型放 `packages/shared` |

### 6.2 React 组件

- 组件使用函数组件。
- 页面组件默认导出，复用组件优先命名导出。
- 组件 props 必须定义类型，不使用匿名大对象堆在参数中。
- 表单使用 Ant Design `Form`，校验规则贴近字段定义。
- 页面内联样式只用于少量一次性布局；可复用样式应抽离。

```typescript
interface RequirementListProps {
  systemId?: string;
}

export function RequirementList({ systemId }: RequirementListProps) {
  // ...
}
```

### 6.3 状态管理

- 仅跨页面、登录态、筛选条件、用户上下文等使用 Zustand。
- 表单临时状态优先交给 Ant Design Form 或组件本地 state。
- store 文件按领域命名，如 `auth.ts`、`requirement.ts`、`train.ts`。
- store action 中允许调用 `services`，页面不直接操作 localStorage。
- localStorage key 统一集中在 store 或工具函数中，不在页面散落使用。

### 6.4 API 调用

- 前端 HTTP 请求统一通过 `apps/web/src/services/api.ts`。
- 业务 service 返回业务数据，不把 axios response 泄露到页面层。
- 401 统一清理登录态并跳转 `/login`。
- 页面只处理用户提示和交互分支，不解析后端错误结构。

```typescript
export async function getCurrentUser(): Promise<SafeUser> {
  const { data } = await api.get<ApiResponse<SafeUser>>('/auth/me');
  return data.data!;
}
```

### 6.5 UI 规范

- 使用 Ant Design 组件作为默认 UI 基础。
- 图标使用 `@ant-design/icons`。
- 页面标题、按钮、提示文案使用中文，领域术语与 PRD 保持一致。
- 列表页优先使用表格、筛选表单、分页；不要自行拼复杂基础控件。
- 权限不可见的操作按钮前端可隐藏，但后端仍必须校验权限。

---

## 七、后端编码规范

### 7.1 模块结构

每个业务模块放在 `apps/server/src/modules/<domain>` 下。复杂模块推荐结构：

```text
modules/requirements/
├── index.ts          # 注册路由
├── routes.ts         # 路由定义
├── service.ts        # 业务逻辑
├── validators.ts     # 请求 schema
└── permissions.ts    # 权限判断
```

当前模块简单时可先放在 `index.ts`，当文件超过约 200 行或出现多条业务流程时再拆分。

### 7.2 Fastify 路由

- 路由路径统一以 `/api` 开头。
- 路由注册函数命名为 `<domain>Route` 或 `<action>Route`。
- 所有非公开接口必须添加 `onRequest: [fastify.authenticate]`。
- 所有请求体、路径参数、查询参数必须配置 Fastify schema。
- Reply 类型必须使用 `ApiResponse<T>`。

```typescript
fastify.post<{
  Body: CreateRequirementRequest;
  Reply: ApiResponse<RequirementDetail>;
}>(
  '/api/requirements',
  {
    onRequest: [fastify.authenticate],
    schema: {
      body: createRequirementBodySchema,
    },
  },
  async (request, reply) => {
    const result = await createRequirement(request.body, request.user);
    return reply.send({ success: true, data: result });
  }
);
```

### 7.3 业务服务

- 路由层负责协议适配：读取 request、调用 service、返回 response。
- service 层负责业务规则：权限、状态流转、容量校验、状态日志。
- Prisma 调用应集中在 service 或 repository 风格函数中，避免散落到多个路由 handler。
- 会产生状态变更的操作必须在同一事务中写入主表和 `StatusLog`。

### 7.4 错误处理

#### 7.4.1 错误抛出规范

- 业务错误统一使用 `errors` 工厂抛出，禁止直接 `reply.status(400).send(...)` 拼错误响应。
- 未找到资源时，根据业务语义返回：
  - 不存在：`errors.notFound('需求')`
  - 无权访问：`errors.forbidden()`
- 生产环境不得向前端暴露堆栈、SQL、内部路径。

#### 7.4.2 错误码体系

所有业务错误必须携带语义化错误码（`code` 字段），前端根据错误码做统一处理，**禁止前端解析 `message` 文本做分支判断**。

**错误码管理方式**：

错误码、类型、默认提示统一在 `packages/shared/src/constants/error-codes.ts` 中集中注册，前后端共享。后端 `errors` 工厂通过 `makeError()` 从注册表读取，确保错误码、状态码、类型与注册表一致。

**错误码命名规则**：

- 格式：`UPPER_SNAKE_CASE`，如 `BAD_REQUEST`、`NOT_FOUND`、`REQUIREMENT_NOT_DRAFT`
- 通用错误码使用大类名（如 `FORBIDDEN`），业务错误码使用 `{资源}_{原因}` 格式（如 `REQUIREMENT_NOT_DRAFT`）
- 错误码必须全局唯一，新增时先检查是否已有语义相同的码

**错误类型分类**：

每个错误码必须标注类型（`ErrorType`），用于区分技术错误和业务错误：

| 类型 | 枚举值 | HTTP 状态码 | 说明 | 示例 |
|------|--------|------------|------|------|
| 技术错误 | `TECHNICAL` | 对应 HTTP 状态码（401/403/404/429/500） | IP访问拒绝、认证失败、限流、服务器/数据库异常、资源不存在 | `UNAUTHORIZED`、`FORBIDDEN`、`INTERNAL_ERROR` |
| 业务错误 | `BUSINESS` | **统一 200** | 角色权限、参数校验、唯一/重复、非空、业务规则 | `PERMISSION_DENIED`、`BAD_REQUEST`、`CONFLICT` |

> **核心约定**：业务错误统一返回 HTTP 200，通过响应体 `success: false` + `code` 区分。前端无需根据 HTTP 状态码判断业务结果，只需检查 `success` 字段。

**错误码分类（按 HTTP 状态码）**：

| 类别 | HTTP 状态码 | 错误类型 | 错误码示例 | 说明 |
|------|------------|---------|-----------|------|
| 认证 | 401 | TECHNICAL | `UNAUTHORIZED` | 未登录、Token 过期、Token 被吊销 |
| IP拒绝 | 403 | TECHNICAL | `FORBIDDEN` | IP访问拒绝等基础设施层拦截 |
| 资源 | 404 | TECHNICAL | `NOT_FOUND` | 资源不存在 |
| 限流 | 429 | TECHNICAL | `RATE_LIMIT_EXCEEDED` | 请求频率超限 |
| 系统 | 500 | TECHNICAL | `INTERNAL_ERROR` | 服务器内部错误，不暴露细节 |
| 角色权限 | **200** | BUSINESS | `PERMISSION_DENIED` | 用户角色权限不足 |
| 参数校验 | **200** | BUSINESS | `BAD_REQUEST`、`VALIDATION_ERROR` | 参数缺失、格式错误、枚举值非法 |
| 业务规则 | **200** | BUSINESS | `REQUIREMENT_NOT_DRAFT`、`DEPENDENCY_CIRCULAR` | 状态不允许操作、循环依赖等 |
| 冲突 | **200** | BUSINESS | `CONFLICT`、`VERSION_CONFLICT` | 乐观锁冲突、编号冲突、重复操作 |

**当前已注册错误码**（`packages/shared/src/constants/error-codes.ts`）：

| 错误码 | 类型 | HTTP 状态码 | 工厂方法 | 默认消息 |
|--------|------|------------|---------|---------|
| `UNAUTHORIZED` | TECHNICAL | 401 | `errors.unauthorized()` | 未登录或登录已过期 |
| `FORBIDDEN` | TECHNICAL | 403 | `errors.forbidden()` | 访问被拒绝 |
| `NOT_FOUND` | TECHNICAL | 404 | `errors.notFound('资源名')` | {资源名}不存在 |
| `RATE_LIMIT_EXCEEDED` | TECHNICAL | 429 | Fastify rate-limit 自动生成 | 请求过于频繁，请稍后再试 |
| `INTERNAL_ERROR` | TECHNICAL | 500 | `errors.internal()` | 服务器内部错误 |
| `PERMISSION_DENIED` | BUSINESS | **200** | `errors.permissionDenied()` | 无权限执行此操作 |
| `BAD_REQUEST` | BUSINESS | **200** | `errors.badRequest()` | 请求参数错误 |
| `VALIDATION_ERROR` | BUSINESS | **200** | Fastify schema 自动生成 | 请求参数验证失败 |
| `CONFLICT` | BUSINESS | **200** | `errors.conflict()` | 数据冲突 |

#### 7.4.3 新增错误码流程

1. 在 `packages/shared/src/constants/error-codes.ts` 的 `ERROR_CODE_MAP` 中注册新条目：
   - 确定错误类型（`TECHNICAL` 或 `BUSINESS`）
   - 命名遵循 `{资源}_{原因}` 格式
   - 默认消息使用中文，简洁描述错误原因（不超过 30 字）
2. 在 `apps/server/src/common/errors/index.ts` 的 `errors` 工厂中新增对应方法
3. 同步更新本规范的错误码表

```typescript
// 步骤 1：在 shared/error-codes.ts 注册
// ========== 业务错误 ==========
REQUIREMENT_NOT_DRAFT: {
  code: 'REQUIREMENT_NOT_DRAFT',
  type: ErrorType.BUSINESS,
  statusCode: 200, // 业务错误统一 200
  message: '仅草稿状态可编辑',
},

// 步骤 2：在 server/common/errors/index.ts 新增工厂方法
requirementNotDraft: (message?: string) =>
  makeError('REQUIREMENT_NOT_DRAFT', message),
```

#### 7.4.4 错误提示规范

| 规则 | 说明 |
|------|------|
| 语言 | 用户可见的错误提示使用中文，技术日志使用英文 |
| 简洁 | 单条错误提示不超过 30 字，不暴露内部状态和堆栈 |
| 可操作 | 提示应告知用户下一步操作，如"请刷新后重试"、"请先选择系统" |
| 不暴露 | 禁止在 `message` 中返回 SQL 语句、表名、字段名、文件路径 |
| 批量校验 | 多个字段校验失败时，一次性返回所有错误，不逐条返回 |
| 前端映射 | 前端对已知错误码做统一映射，未知错误码显示通用提示"操作失败，请稍后重试" |

**错误消息示例**：

| ✅ 推荐 | ❌ 不推荐 |
|---------|----------|
| `归属系统不存在` | `System with id 'cuid_xxx' not found in database` |
| `仅草稿状态可编辑` | `Cannot edit requirement in status READY` |
| `依赖需求不存在：REQ-2026-0001, REQ-2026-0002` | `Foreign key constraint violation on requirement_dependency` |
| `需求已被其他人修改，请刷新后重试` | `Version conflict: expected 3, got 4` |
| `请求过于频繁，请稍后再试` | `Rate limit exceeded: 100 requests per minute` |

#### 7.4.5 前端错误处理

- 前端统一在 Axios 响应拦截器中处理 401（跳转登录页）。
- 业务错误码通过 `code` 字段判断，**不通过 `message` 文本匹配**。
- 已知错误码 → 显示对应的中文提示；未知错误码 → 显示通用提示"操作失败，请稍后重试"。
- 表单提交错误在对应字段下方显示，全局错误使用 `message.error()`。

```typescript
// 推荐：通过 code 判断
if (error.response?.data?.code === 'VERSION_CONFLICT') {
  message.warning('需求已被其他人修改，请刷新后重试');
}

// 不推荐：通过 message 文本判断
if (error.response?.data?.message?.includes('版本')) { ... }
```

### 7.5 认证与权限

- JWT payload 只放非敏感字段：`sub`、`username`、`role`。
- 权限校验不得只依赖角色，还要校验资源归属，如系统成员、需求归属人、火车管理员权限。
- RBAC 规则以设计方案权限矩阵为准，新增操作必须同步补充权限说明。
- 超级管理员可兜底操作，但仍要记录审计日志。

---

## 八、Prisma 与数据层规范

### 8.1 Schema 规范

- model 使用 PascalCase，字段使用 camelCase。
- 所有核心业务表必须包含 `createdAt`、`updatedAt`，纯关联表可按需要简化。
- 外键字段命名为 `<relationName>Id`，关系字段命名为领域名，如 `systemId` + `system`。
- 常用筛选、排序、关联查询字段必须添加索引。
- 多字段唯一约束使用 `@@unique([...])`，并在注释中说明业务含义。

### 8.2 查询规范

- 查询列表必须分页，不返回无限列表。
- API 响应不得返回 `password`、`ssoId` 等敏感字段。
- 返回用户信息时使用 `select` 构造安全视图。
- 需要一致性的多表写入使用 `prisma.$transaction`。
- 禁止使用拼接式 `$queryRawUnsafe`。

### 8.3 状态流转

- `Requirement.status` 和 `Requirement.subStatus` 的变更必须写入 `StatusLog`。
- 封板后回退到草稿必须走 `EmergencyChange` 审批流程。
- 已投产需求不得直接取消，只能通过回滚业务流程处理。
- 工作量点数变更需校验项目经理或技术经理权限。

---

## 九、API 设计规范

### 9.1 响应格式

成功响应：

```json
{
  "success": true,
  "data": {}
}
```

失败响应：

```json
{
  "success": false,
  "message": "无权限执行此操作",
  "code": "FORBIDDEN"
}
```

分页响应：

```json
{
  "success": true,
  "data": {
    "list": [],
    "total": 0,
    "page": 1,
    "pageSize": 20
  }
}
```

### 9.2 URL 规范

| 场景 | 示例 |
|------|------|
| 列表 | `GET /api/requirements` |
| 详情 | `GET /api/requirements/:id` |
| 创建 | `POST /api/requirements` |
| 更新 | `PATCH /api/requirements/:id` |
| 删除/取消 | `POST /api/requirements/:id/cancel` |
| 状态动作 | `POST /api/requirements/:id/submit-review` |
| 领域子资源 | `GET /api/trains/:id/requirements` |

业务动作使用动词短语作为子路径，普通 CRUD 使用 HTTP 方法表达。

### 9.3 参数规范

- 列表查询统一支持 `page`、`pageSize`。
- 筛选字段使用领域名，如 `status`、`systemId`、`trainId`。
- 日期字段传输使用 ISO 8601 字符串。
- 后端必须校验 `page >= 1`、`pageSize` 在合理范围内。

### 9.4 分页规范

#### 9.4.1 分页模式

本项目统一使用**偏移分页（Offset-based Pagination）**，不使用游标分页。

| 模式 | 适用场景 | 本项目 |
|------|---------|--------|
| 偏移分页 | 数据总量可控、需要跳页、需要显示总页数 | ✅ 默认 |
| 游标分页 | 实时数据流、无限滚动、数据量极大 | ❌ 不使用 |

#### 9.4.2 请求参数

所有列表接口统一使用以下查询参数：

| 参数 | 类型 | 必填 | 默认值 | 约束 |
|------|------|------|--------|------|
| `page` | `number` | 否 | `1` | `>= 1` |
| `pageSize` | `number` | 否 | `20` | `>= 1, <= 100` |

```typescript
// packages/shared/src/types/api.ts — 已定义
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}
```

**后端校验规则**：

- `page` 未传或非法 → 默认 `1`
- `pageSize` 未传或非法 → 默认 `20`
- `pageSize > 100` → 强制截断为 `100`（防止一次查询过多数据）
- `pageSize < 1` → 默认 `20`

#### 9.4.3 响应格式

分页接口统一返回 `PaginatedResponse<T>`：

```typescript
// packages/shared/src/types/api.ts — 已定义
export interface PaginatedResponse<T> {
  list: T[];        // 当前页数据
  total: number;    // 总记录数
  page: number;     // 当前页码
  pageSize: number; // 每页条数
}
```

响应示例：

```json
{
  "success": true,
  "data": {
    "list": [{ "id": "xxx", "title": "需求A" }],
    "total": 156,
    "page": 1,
    "pageSize": 20
  }
}
```

#### 9.4.4 后端实现规范

- 使用 Prisma 的 `skip` + `take` 实现分页，禁止查出全量数据后在前端或 service 层截断。
- 分页查询必须同时执行 `findMany`（数据）和 `count`（总数），两者使用相同的 `where` 条件。
- 当 `total` 为 0 时，`list` 返回空数组 `[]`，不返回 `null`。

```typescript
// 标准分页查询模式
async function listRequirements(params: {
  page?: number;
  pageSize?: number;
  status?: string;
}): Promise<PaginatedResponse<RequirementItem>> {
  const page = Math.max(1, params.page ?? 1);           // 页码 >= 1
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20)); // 每页 1~100

  const where = { status: params.status };               // 筛选条件

  const [list, total] = await Promise.all([
    prisma.requirement.findMany({
      where,
      skip: (page - 1) * pageSize,                       // 偏移量
      take: pageSize,                                    // 每页条数
      orderBy: { createdAt: 'desc' },                    // 排序
    }),
    prisma.requirement.count({ where }),                 // 总数（相同条件）
  ]);

  return { list, total, page, pageSize };
}
```

#### 9.4.5 前端分页规范

- 列表页统一使用 Ant Design `Table` 组件的内置分页，不自行实现分页控件。
- 分页参数变更时重新请求后端接口，不在前端做假分页。
- 筛选条件变更时重置页码为 `1`。

```typescript
// 标准前端分页模式
<Table
  dataSource={data?.list ?? []}
  pagination={{
    current: data?.page ?? 1,
    pageSize: data?.pageSize ?? 20,
    total: data?.total ?? 0,
    showSizeChanger: true,                               // 允许切换每页条数
    pageSizeOptions: ['10', '20', '50', '100'],          // 可选每页条数
    showTotal: (total) => `共 ${total} 条`,              // 显示总数
  }}
  onChange={(pagination) => {
    fetchList({ page: pagination.current, pageSize: pagination.pageSize });
  }}
/>
```

#### 9.4.6 不分页的例外场景

以下场景可以不使用分页，但必须在代码注释中说明原因：

| 场景 | 说明 | 示例 |
|------|------|------|
| 下拉选项 | 数据量可控（如系统列表已限制 50 条） | 系统选择器 |
| 导出 | 用户明确需要全量导出 | Excel 导出 |
| 内部关联 | 非用户直接触发的内部查询 | 权限校验时的角色列表 |

> 即使不分页，也必须设置 `take` 上限，防止意外全量查询。

---

## 十、测试规范

### 10.1 测试分层

| 层级 | 工具 | 覆盖内容 |
|------|------|----------|
| 共享包单元测试 | Vitest | 类型辅助函数、状态转换工具 |
| 前端组件测试 | Vitest | 表单校验、权限展示、store action |
| 后端单元测试 | Vitest | service 业务规则、权限函数、状态流转 |
| 后端接口测试 | Supertest 或 Fastify inject | 登录、鉴权、CRUD、错误响应 |

### 10.2 必测场景

- 认证：登录成功、密码错误、Token 失效。
- 权限：未登录 401、无角色权限 403、无资源归属 403。
- 需求状态：草稿、待评审、已就绪、已纳版、封板、投产、取消。
- 状态日志：每次状态变化都有 `StatusLog`。
- 数据安全：用户响应不包含 `password`、`ssoId`。
- 分页筛选：列表接口返回 `PaginatedResponse<T>`。

### 10.3 测试命名

- 测试文件与被测文件同名，加 `.test.ts` 或 `.test.tsx`。
- 用例描述使用中文业务语义。

```typescript
it('未登录访问需求列表时返回 401', async () => {
  // ...
});
```

---

## 十一、日志与可观测性

- 后端使用 Fastify logger，不直接在业务代码中大量 `console.log`。
- 错误日志可记录错误码、用户 ID、资源 ID、请求路径。
- 日志不得记录密码、Token、完整请求体中的敏感字段。
- 重要业务操作必须留业务审计记录：
  - 需求状态变化：`StatusLog`
  - 紧急变更审批：`EmergencyChange`
  - 火车纳版、移除、投产、回滚：后续需补充对应审计表或日志规范

---

## 十二、提交前检查清单

每次提交前至少确认：

- [ ] `pnpm` lockfile 与依赖变更一致。
- [ ] 新增跨端类型已放入 `packages/shared`。
- [ ] 新增 API 使用统一 `ApiResponse<T>`。
- [ ] 非公开接口已添加鉴权。
- [ ] 权限和资源归属在后端校验。
- [ ] Prisma 查询未返回敏感字段。
- [ ] 状态变更写入审计日志。
- [ ] 页面通过 `services/api.ts` 访问后端。
- [ ] 无 `any`、无调试后门、无硬编码密钥。
- [ ] 相关测试已补充或说明不补充原因。
- [ ] 安全要求符合 `RT-安全规范_20260510.md`。

---

## 十三、推荐开发流程

1. 在 `packages/shared` 定义领域类型、枚举、请求/响应 DTO。
2. 在 `apps/server` 实现 Fastify schema、service、Prisma 查询和权限校验。
3. 为关键业务规则补充 service 或接口测试。
4. 在 `apps/web/src/services` 增加语义化 API 函数。
5. 在 `stores` 或页面组件中接入数据。
6. 使用 Ant Design 组件完成页面交互。
7. 手动验证登录、权限、错误提示、列表分页和状态流转。

---

*文档编号：RT-CODE-STD*  
*创建时间：2026-05-10*  
*版本：v1.1*  
*关联文档：RT-T0-基础框架与数据层-设计方案_20260510.md、RT-安全规范_20260510.md*
