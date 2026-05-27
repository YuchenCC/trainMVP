# 系统总体架构与技术实现地图

**版本号**: v1.0  
**日期**: 2026-05-28  
**对应 Issue**: ISSUE-005  
**代码基线**: `main` 最新代码

---

## 一、文档目标

本文档说明 `release-train` 工程的总体技术架构、模块边界、代码组织和需求到实现的映射关系。后续 AI 或开发者应优先使用本文档定位代码，而不是从全仓库无序搜索。

## 二、工程结构

```text
release-train/
├── apps/
│   ├── server/              # 后端应用：Fastify + Prisma
│   └── web/                 # 前端应用：React + Vite + Ant Design
├── packages/
│   └── shared/              # 前后端共享类型、枚举、常量、DTO
├── docker-compose.yml       # 本地数据库等基础设施
├── package.json             # monorepo 根脚本
└── pnpm-workspace.yaml      # pnpm workspace 配置
```

依赖方向：

```text
apps/web    -> packages/shared
apps/server -> packages/shared
packages/shared 不依赖应用层
```

## 三、技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | React 18、Vite、Ant Design、Zustand、Axios | 页面、交互、状态管理和 API 调用 |
| 后端 | Fastify、Prisma、JWT、bcrypt、sanitize-html | API、鉴权、业务规则、数据访问 |
| 数据库 | PostgreSQL | 通过 Prisma schema 管理 |
| 共享包 | TypeScript | 统一领域枚举、DTO、权限矩阵 |
| AI能力 | Coze API | 智能纳版解释和建议输出 |
| 测试 | Vitest、Testing Library、Supertest | 后端服务测试和前端组件测试 |

## 四、后端架构

后端入口是 `apps/server/src/app.ts`，负责：

- 加载环境变量。
- 初始化 Coze 客户端。
- 注册 Fastify 插件：CORS、JWT、限流、Swagger。
- 注册认证中间件、日志、错误处理。
- 注册业务路由。

后端模块：

| 模块 | 路径 | 职责 |
|------|------|------|
| auth | `apps/server/src/modules/auth` | 登录、当前用户、开发 seed |
| systems | `apps/server/src/modules/systems` | 系统列表、系统成员查询 |
| requirements | `apps/server/src/modules/requirements` | 需求 CRUD、评审、变更、统计、待办 |
| trains | `apps/server/src/modules/trains` | 火车、班次、容量、纳版、投产、回滚 |
| smart-onboard | `apps/server/src/modules/smart-onboard` | AI 智能纳版建议与确认 |
| common/middleware | `apps/server/src/common/middleware` | JWT 鉴权、RBAC |
| common/errors | `apps/server/src/common/errors` | 统一错误处理 |
| common/logger | `apps/server/src/common/logger` | 日志、脱敏、指标 |

## 五、前端架构

前端入口是 `apps/web/src/App.tsx`，负责路由装配和鉴权守卫。

当前主要路由：

| 路由 | 页面 | 说明 |
|------|------|------|
| `/login` | `pages/login` | 登录页 |
| `/dashboard` | `pages/dashboard` | 统一仪表盘 |
| `/requirements` | `pages/requirements` | 需求列表 |
| `/requirements/new` | `pages/requirements/create.tsx` | 新建需求 |
| `/requirements/:id` | `pages/requirements/detail.tsx` | 需求详情 |
| `/requirements/:id/edit` | `pages/requirements/edit.tsx` | 编辑需求 |
| `/trains` | `pages/trains/index.tsx` | 火车列表 |
| `/trains/new` | `pages/trains/create.tsx` | 创建火车 |
| `/trains/:id` | `pages/trains/[id].tsx` | 火车详情 |
| `/trains/:id/edit` | `pages/trains/edit.tsx` | 编辑火车 |
| `/schedules` | `pages/trains/schedules/index.tsx` | 班次列表 |
| `/trains/:trainId/schedules/:scheduleId` | `pages/trains/schedule-detail.tsx` | 班次详情 |
| `/systems` | `pages/systems` | 系统管理 |
| `/calendar` | `pages/calendar` | 日历页 |

注意：旧 handoff 中提到的 `/dashboard/ba` 和 `/dashboard/pm` 已被 Task4 合并为统一 `/dashboard`。

## 六、共享包职责

`packages/shared` 是前后端领域契约中心：

| 文件 | 职责 |
|------|------|
| `constants/index.ts` | 角色、状态、权限矩阵、显示标签 |
| `constants/error-codes.ts` | 错误码注册表 |
| `types/api.ts` | 通用 API 响应和分页类型 |
| `types/auth.ts` | 登录、用户安全视图 |
| `types/requirement.ts` | 需求 DTO 和列表详情类型 |
| `types/train.ts` | 火车、班次、纳版相关类型 |
| `types/smart-onboard.ts` | 智能纳版输入输出 |
| `types/dashboard.ts` | 仪表盘聚合数据 |

## 七、需求到实现地图

| 业务能力 | 后端 | 前端 | 测试 |
|----------|------|------|------|
| 登录与鉴权 | `modules/auth`、`common/middleware` | `stores/auth.ts`、`AuthGuard.tsx` | `t0-framework.test.ts`、`t0-security.test.ts` |
| 需求录入 | `requirements/index.ts`、`service.ts:createRequirement` | `RequirementForm.tsx`、`create.tsx` | `t1-us1-requirement-entry.test.ts` |
| 需求列表筛选 | `service.ts:listRequirements` | `pages/requirements/index.tsx` | `t1-us1.3-requirement-list.test.tsx` |
| 需求详情 | `service.ts:getRequirementById` | `pages/requirements/detail.tsx` | `t1-us1.4-requirement-detail-risklevel.test.ts` |
| 需求变更 | `service.ts:changeRequirement` | 需求列表/详情操作 | `t1-us1.11-requirement-change.test.ts` |
| 火车 CRUD | `trains/services/train.service.ts` | `pages/trains`、`TrainForm.tsx` | `t2-us2.1-train-crud.test.ts` |
| 班次管理 | `routes/schedule.ts`、`train.service.ts` | `pages/trains/schedules`、`schedule-detail.tsx` | `t2-us2.2*.test.ts` |
| 纳版/移除/投产/回滚 | `routes/operations.ts`、`train.service.ts` | `schedule-detail.tsx` | 后端相关测试 |
| 智能纳版 | `modules/smart-onboard` | `SmartOnboardSuggestion.tsx` | Task3 测试案例 |
| 仪表盘 | `getRequirementStats`、`getMyTodos`、`getScheduleProgress` | `pages/dashboard`、`components/dashboard` | 待补充专项测试 |

## 八、运行时集成链路

### 8.1 普通需求创建链路

```text
RequirementForm
  -> services/requirement.ts
  -> POST /api/requirements
  -> requirementRoutes
  -> createRequirement()
  -> Prisma Requirement / StatusLog
```

### 8.2 班次纳版链路

```text
schedule-detail.tsx
  -> services/train.ts
  -> POST /api/trains/schedules/:scheduleId/onboard
  -> operationsRoutes
  -> onboardRequirements()
  -> Requirement.status = ONBOARDED
  -> TrainSystemSnapshot.usedPoints 更新
  -> StatusLog 写入
```

### 8.3 智能纳版链路

```text
SmartOnboardSuggestion
  -> services/smart-onboard.ts
  -> POST /api/smart-onboard/suggest
  -> generateOnboardSuggestions()
  -> getScheduleCapacity()
  -> getRequirementsForAI()
  -> Coze / 规则结果解析
  -> 前端展示建议
```

## 九、当前工程注意事项

- 项目根要求 Node >= 18、pnpm >= 8。
- 当前本机 PowerShell 中 `pnpm` 和 `docker` 未直接在 PATH 中，`corepack pnpm` 可用但版本与现有 `node_modules` 锁结构不兼容。
- `package-lock.json` 和 `pnpm-lock.yaml` 同时存在，实际工程应以 pnpm workspace 为准。
- 代码结构映射文档内容标注 v1.4，但文件名仍是 v1.0，后续可统一版本命名。

## 十、版本记录

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v1.0 | 2026-05-28 | 初始版本，整理系统架构、模块边界和实现地图 |
