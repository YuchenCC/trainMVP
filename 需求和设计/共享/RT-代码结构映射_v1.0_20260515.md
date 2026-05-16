# 代码结构映射 — 用户故事 → 代码文件

**版本号**: v1.0
**日期**: 2026-05-15
**用途**: Bug 修复时快速定位代码文件，先判断属于哪个 US，再查此表

---

## 项目目录总览

```
release-train/
├── apps/
│   ├── server/src/           # 后端 (Fastify + Prisma)
│   │   ├── modules/
│   │   │   ├── auth/         # 认证模块
│   │   │   ├── requirements/ # 需求模块 (核心)
│   │   │   └── systems/      # 系统模块
│   │   ├── common/
│   │   │   ├── errors/       # 错误处理
│   │   │   ├── middleware/   # 中间件 (鉴权/校验)
│   │   │   └── token-blacklist/ # Token 黑名单
│   │   └── prisma/           # Prisma 客户端
│   └── web/src/              # 前端 (React + Ant Design)
│       ├── pages/
│       │   ├── requirements/ # 需求页面 (核心)
│       │   ├── login/        # 登录页
│       │   ├── systems/      # 系统管理页
│       │   ├── trains/       # 版本火车页
│       │   └── dashboard/    # 仪表盘
│       ├── components/
│       │   ├── requirements/ # 需求组件
│       │   └── AuthGuard.tsx # 路由守卫
│       ├── services/         # API 调用层
│       ├── stores/           # 状态管理 (Zustand)
│       └── ...
├── packages/shared/src/      # 共享类型/常量
│   ├── types/                # 类型定义
│   └── constants/            # 常量定义
└── prisma/schema.prisma      # 数据库模型
```

---

## US → 代码映射

### US1.1 需求录入

| 层级 | 文件 | 说明 |
|------|------|------|
| 页面 | `apps/web/src/pages/requirements/create.tsx` | 创建页面入口 |
| 组件 | `apps/web/src/components/requirements/RequirementForm.tsx` | 表单组件（创建/编辑共用） |
| API | `apps/web/src/services/requirement.ts` → `create()` | 前端 API 调用 |
| 路由 | `apps/server/src/modules/requirements/index.ts` → `POST /api/requirements` | 后端路由 |
| 业务 | `apps/server/src/modules/requirements/service.ts` → `createRequirement()` | 后端业务逻辑 |
| 类型 | `packages/shared/src/types/requirement.ts` | 需求类型定义 |
| 常量 | `packages/shared/src/constants/index.ts` | 优先级/状态常量 |
| 测试 | `apps/server/src/__tests__/t1-us1-requirement-entry.test.ts` | 后端测试 |

### US1.2 需求编辑

| 层级 | 文件 | 说明 |
|------|------|------|
| 页面 | `apps/web/src/pages/requirements/edit.tsx` | 编辑页面入口 |
| 组件 | `apps/web/src/components/requirements/RequirementForm.tsx` | 表单组件（创建/编辑共用，mode='edit'） |
| API | `apps/web/src/services/requirement.ts` → `update()` | 前端 API 调用 |
| 路由 | `apps/server/src/modules/requirements/index.ts` → `PUT /api/requirements/:id` | 后端路由 |
| 业务 | `apps/server/src/modules/requirements/service.ts` → `updateRequirement()` | 后端业务逻辑 |

### US1.3 需求列表查询与筛选

| 层级 | 文件 | 说明 |
|------|------|------|
| 页面 | `apps/web/src/pages/requirements/index.tsx` | 列表页（含筛选/分页/排序/操作按钮） |
| API | `apps/web/src/services/requirement.ts` → `list()` | 前端 API 调用 |
| 路由 | `apps/server/src/modules/requirements/index.ts` → `GET /api/requirements` | 后端路由 |
| 业务 | `apps/server/src/modules/requirements/service.ts` → `listRequirements()` | 后端业务逻辑 |
| 权限 | `apps/web/src/stores/auth.ts` → `checkPermission()` | 权限校验函数 |
| 权限 | `apps/web/src/pages/requirements/index.tsx` → `getActionButtons()` | 操作按钮权限矩阵 |

### US1.4 需求详情查看

| 层级 | 文件 | 说明 |
|------|------|------|
| 页面 | `apps/web/src/pages/requirements/detail.tsx` | 详情页（含操作按钮/操作历史） |
| API | `apps/web/src/services/requirement.ts` → `getById()` | 前端 API 调用 |
| 路由 | `apps/server/src/modules/requirements/index.ts` → `GET /api/requirements/:id` | 后端路由 |
| 业务 | `apps/server/src/modules/requirements/service.ts` → `getRequirementDetail()` | 后端业务逻辑 |
| 权限 | `apps/web/src/pages/requirements/detail.tsx` → `canEditRequirement()` | 编辑权限判断 |

### US1.5 发起评审

| 层级 | 文件 | 说明 |
|------|------|------|
| 页面 | `apps/web/src/pages/requirements/index.tsx` → `handleSubmitReview()` | 列表页发起评审 |
| 页面 | `apps/web/src/pages/requirements/detail.tsx` | 详情页发起评审按钮 |
| API | `apps/web/src/services/requirement.ts` → `submitReview()` | 前端 API 调用 |
| 路由 | `apps/server/src/modules/requirements/index.ts` → `POST /api/requirements/:id/submit-review` | 后端路由 |
| 业务 | `apps/server/src/modules/requirements/service.ts` → `submitForReview()` | 后端业务逻辑 |

### US1.6 评审通过

| 层级 | 文件 | 说明 |
|------|------|------|
| 页面 | `apps/web/src/pages/requirements/index.tsx` → `handleApprove()` | 列表页评审通过 |
| 页面 | `apps/web/src/pages/requirements/detail.tsx` | 详情页评审通过按钮 |
| API | `apps/web/src/services/requirement.ts` → `approve()` | 前端 API 调用 |
| 路由 | `apps/server/src/modules/requirements/index.ts` → `POST /api/requirements/:id/approve` | 后端路由 |
| 业务 | `apps/server/src/modules/requirements/service.ts` → `approveRequirement()` | 后端业务逻辑 |

### US1.7 评审拒绝

| 层级 | 文件 | 说明 |
|------|------|------|
| 页面 | `apps/web/src/pages/requirements/index.tsx` → `handleReject()` | 列表页评审拒绝 |
| 页面 | `apps/web/src/pages/requirements/detail.tsx` | 详情页评审拒绝按钮 |
| API | `apps/web/src/services/requirement.ts` → `reject()` | 前端 API 调用 |
| 路由 | `apps/server/src/modules/requirements/index.ts` → `POST /api/requirements/:id/reject` | 后端路由 |
| 业务 | `apps/server/src/modules/requirements/service.ts` → `rejectRequirement()` | 后端业务逻辑 |

### US1.8 重新编辑

| 层级 | 文件 | 说明 |
|------|------|------|
| 页面 | `apps/web/src/pages/requirements/index.tsx` → `handleResubmit()` | 列表页重新编辑 |
| 页面 | `apps/web/src/pages/requirements/detail.tsx` | 详情页重新编辑按钮 |
| API | `apps/web/src/services/requirement.ts` → `resubmit()` | 前端 API 调用 |
| 路由 | `apps/server/src/modules/requirements/index.ts` → `POST /api/requirements/:id/resubmit` | 后端路由 |
| 业务 | `apps/server/src/modules/requirements/service.ts` → `resubmitRequirement()` | 后端业务逻辑 |

### US1.9 取消需求

| 层级 | 文件 | 说明 |
|------|------|------|
| 页面 | `apps/web/src/pages/requirements/index.tsx` → `handleCancel()` | 列表页取消需求 |
| 页面 | `apps/web/src/pages/requirements/detail.tsx` | 详情页取消按钮 |
| API | `apps/web/src/services/requirement.ts` → `cancel()` | 前端 API 调用 |
| 路由 | `apps/server/src/modules/requirements/index.ts` → `POST /api/requirements/:id/cancel` | 后端路由 |
| 业务 | `apps/server/src/modules/requirements/service.ts` → `cancelRequirement()` | 后端业务逻辑 |

### US1.10 子状态变更（推进/回退）

| 层级 | 文件 | 说明 |
|------|------|------|
| 页面 | `apps/web/src/pages/requirements/index.tsx` → `handleOpenChangeSubStatus()` | 列表页子状态变更按钮+弹窗 |
| 页面 | `apps/web/src/pages/requirements/detail.tsx` | 详情页子状态变更按钮 |
| API | `apps/web/src/services/requirement.ts` → `changeSubStatus()` | 前端 API 调用 |
| 路由 | `apps/server/src/modules/requirements/index.ts` → `POST /api/requirements/:id/change-sub-status` | 后端路由 |
| 业务 | `apps/server/src/modules/requirements/service.ts` → `changeSubStatus()` | 后端业务逻辑 |
| 常量 | `packages/shared/src/constants/index.ts` → `REQ_SUB_STATUS_*` | 子状态标签/颜色 |

---

## 通用模块映射

| 模块 | 文件 | 涉及 US |
|------|------|---------|
| 认证/登录 | `apps/server/src/modules/auth/index.ts` | 全部 |
| 认证状态 | `apps/web/src/stores/auth.ts` | 全部 |
| 路由守卫 | `apps/web/src/components/AuthGuard.tsx` | 全部 |
| 权限中间件 | `apps/server/src/common/middleware/index.ts` | 全部 |
| 错误处理 | `apps/server/src/common/errors/index.ts` | 全部 |
| 系统管理 | `apps/server/src/modules/systems/` + `apps/web/src/pages/systems/` | US1.1/US1.2 |
| 系统 API | `apps/web/src/services/system.ts` | US1.1/US1.2 |
| 共享类型 | `packages/shared/src/types/` | 全部 |
| 共享常量 | `packages/shared/src/constants/` | 全部 |
| 数据库模型 | `apps/server/prisma/schema.prisma` | 全部 |

---

## 快速定位速查

| 报错/现象 | 先查 US | 先看文件 |
|-----------|---------|----------|
| 创建需求失败 | US1.1 | `RequirementForm.tsx` → `service.ts:createRequirement()` |
| 编辑保存失败 | US1.2 | `RequirementForm.tsx` → `service.ts:updateRequirement()` |
| 列表显示异常 | US1.3 | `index.tsx` → `service.ts:listRequirements()` |
| 详情页数据不对 | US1.4 | `detail.tsx` → `service.ts:getRequirementDetail()` |
| 按钮不显示/多显示 | US1.3/US1.4 | `index.tsx:getActionButtons()` / `detail.tsx:canEditRequirement()` |
| 权限校验异常 | US1.3 | `stores/auth.ts:checkPermission()` |
| 状态流转报错 | US1.5~1.10 | `service.ts` 对应函数 |
| 子状态不对 | US1.10 | `service.ts:changeSubStatus()` |
| 系统下拉框无数据 | US1.1 | `services/system.ts` → `systems/service.ts:listSystems()` |
| 登录/Token 问题 | T0 | `auth/index.ts` → `stores/auth.ts` |