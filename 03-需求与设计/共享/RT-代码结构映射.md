# 代码结构映射 — 用户故事 → 代码文件

**版本号**: v1.5
**日期**: 2026-05-29
**用途**: Bug 修复时快速定位代码文件，先判断属于哪个 US，再查此表
**变更**: v1.5 — 新增 US2.5~2.9 代码映射、T3智能纳版、T4仪表盘重构、T5需求变更智能体、T6需求审查

---

## 项目目录总览

```
release-train/
├── dev.sh                     # 服务管理脚本（start/stop/restart/status）
├── server.log                 # 后端日志（dev.sh 启动时生成）
├── web.log                    # 前端日志（dev.sh 启动时生成）
├── apps/
│   ├── server/src/           # 后端 (Fastify + Prisma)
│   │   ├── modules/
│   │   │   ├── auth/         # 认证模块
│   │   │   ├── requirements/ # 需求模块 (核心)
│   │   │   ├── requirement-review/ # AI需求审查 (T6新增)
│   │   │   ├── smart-onboard/     # 智能纳版 (T3新增)
│   │   │   ├── systems/      # 系统模块
│   │   │   └── trains/       # 版本火车模块
│   │   │       ├── index.ts          # 火车路由 (GET/POST /api/trains)
│   │   │       ├── routes/
│   │   │       │   └── schedule.ts   # 班次路由
│   │   │       └── services/
│   │   │           └── train.service.ts  # 火车+班次业务逻辑
│   │   ├── common/
│   │   │   ├── errors/       # 错误处理
│   │   │   ├── middleware/   # 中间件 (鉴权/校验)
│   │   │   ├── logger/       # 日志
│   │   │   └── token-blacklist/ # Token 黑名单
│   │   ├── prisma/           # Prisma 客户端单例
│   │   └── __tests__/        # 后端测试
│   │       ├── t0-framework.test.ts
│   │       ├── t0-security.test.ts
│   │       ├── t1-us1-requirement-entry.test.ts
│   │       ├── t1-us1.4-requirement-detail-risklevel.test.ts
│   │       ├── t1-us1.11-requirement-change.test.ts
│   │       ├── t2-us2.1-train-crud.test.ts
│   │       ├── t2-us2.2-train-schedule-create.test.ts
│   │       └── t2-us2.2x-schedule-ext.test.ts
│   └── web/src/              # 前端 (React + Ant Design)
│       ├── pages/
│       │   ├── dashboard/    # 仪表盘（首页 /dashboard）
│       │   ├── requirements/ # 需求页面 (核心)
│       │   ├── login/        # 登录页
│       │   ├── systems/      # 系统管理页
│       │   ├── trains/       # 版本火车页
│       │   │   ├── index.tsx             # 火车列表 /trains
│       │   │   ├── create.tsx            # 创建火车 /trains/new
│       │   │   ├── [id].tsx              # 火车详情 /trains/:id
│       │   │   ├── [id]/edit.tsx         # 编辑火车 /trains/:id/edit
│       │   │   └── schedule-detail.tsx   # 班次详情 /trains/:trainId/schedules/:scheduleId
│       │   └── schedules/    # 班次列表页 /schedules
│       ├── components/
│       │   ├── dashboard/
│       │   │   └── CalendarView.tsx      # 月历视图（双月显示）
│       │   ├── requirements/ # 需求组件
│       │   ├── schedules/
│       │   │   └── ScheduleCalendar.tsx  # 单班次月历视图组件
│       │   ├── trains/       # 火车组件
│       │   │   ├── TrainForm.tsx         # 火车表单
│       │   │   └── TrainSystemList.tsx   # 系统人员配置
│       │   └── AuthGuard.tsx # 路由守卫
│       ├── services/         # API 调用层
│       │   ├── api.ts        # axios 实例
│       │   ├── train.ts      # 火车/班次 API
│       │   ├── system.ts     # 系统 API
│       │   └── requirement.ts# 需求 API
│       ├── stores/           # 状态管理 (Zustand)
│       └── ...
├── packages/shared/src/      # 共享类型/常量
│   ├── types/                # 类型定义
│   │   └── train.ts          # TrainScheduleDetail 含 sitDate/uatDate
│   └── constants/            # 常量定义
└── apps/server/prisma/
    └── schema.prisma         # 数据库模型 (TrainSchedule 含 sitDate/uatDate)
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

### US2.1 版本火车创建

| 层级 | 文件 | 说明 |
|------|------|------|
| 页面 | `apps/web/src/pages/trains/create.tsx` | 创建火车页面 |
| 组件 | `apps/web/src/components/trains/TrainForm.tsx` | 火车表单组件 |
| API | `apps/web/src/services/train.ts` → `createTrain()` | 前端 API 调用 |
| 路由 | `apps/server/src/modules/trains/index.ts` → `POST /api/trains` | 后端路由 |
| 业务 | `apps/server/src/modules/trains/services/train.service.ts` → `createTrain()` | 后端业务逻辑 |
| 类型 | `packages/shared/src/types/train.ts` | 火车类型定义 |
| 测试 | `apps/server/src/__tests__/t2-us2.1-train-crud.test.ts` | 后端测试（22个用例：创建/列表/详情/更新/取消/系统管理） |

### US2.2 火车班次创建

| 层级 | 文件 | 说明 |
|------|------|------|
| 页面 | `apps/web/src/pages/trains/index.tsx` → 模态框 | 列表页创建班次模态框 |
| 页面 | `apps/web/src/pages/trains/schedule-detail.tsx` | 班次详情页（含编辑班次模态框） |
| API | `apps/web/src/pages/trains/index.tsx` → `handleCreateSubmit()` | 前端 API 调用 |
| API | `apps/web/src/pages/trains/schedule-detail.tsx` → `handleEditSubmit()` | 班次编辑提交 |
| 路由 | `apps/server/src/modules/trains/routes/schedule.ts` → `POST /api/trains/:trainId/schedules` | 创建班次 |
| 路由 | `apps/server/src/modules/trains/routes/schedule.ts` → `PUT /api/trains/:trainId/schedules/:scheduleId` | 编辑班次 |
| 业务 | `apps/server/src/modules/trains/services/train.service.ts` → `createTrainSchedule()` | 创建业务逻辑（含自动生成班次名称/关键日期） |
| 业务 | `apps/server/src/modules/trains/services/train.service.ts` → `updateTrainSchedule()` | 更新业务逻辑 |
| 工具 | `apps/server/src/modules/trains/utils/key-dates.ts` | 关键日期计算工具 |
| 类型 | `packages/shared/src/types/train.ts` | 班次类型定义（含 sitDate/uatDate） |
| 数据 | `apps/server/prisma/schema.prisma` → `TrainSchedule` | 含 boardingDate/sitDate/uatDate/lockdownDate/releaseDate |
| 测试 | `apps/server/src/__tests__/t2-us2.2-train-schedule-create.test.ts` | 后端测试（11个用例） |

**关键日期节点顺序**：纳版 → 开始 → SIT提测 → UAT提测 → 封板 → 投产 → 结束

**关键日期计算规则**（[key-dates.ts](file:///Users/laiyang/Library/Application%20Support/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/版本火车/release-train/apps/server/src/modules/trains/utils/key-dates.ts)）：
| 节点 | 计算 |
|------|------|
| 纳版 | 开始 - 3天 |
| SIT提测 | 开始后 (开始→封板 × 50%) |
| UAT提测 | SIT → 封板中点 |
| 封板 | 投产 - 3天 |
| 投产 | 结束日期 |

### US2.2.1 火车班次状态变更

| 层级 | 文件 | 说明 |
|------|------|------|
| 页面 | `apps/web/src/pages/trains/schedule-detail.tsx` | 班次详情页状态操作按钮 |
| 路由 | `apps/server/src/modules/trains/routes/schedule.ts` → `POST /api/trains/:trainId/schedules/:scheduleId/status` | 后端路由 |
| 业务 | `apps/server/src/modules/trains/services/train.service.ts` → `updateTrainScheduleStatus()` | 状态变更业务逻辑 |
| 状态机 | `PLANNING` → `IN_PROGRESS` → `LOCKED_DOWN` → `RELEASED` | 状态流转规则 |
| 联动 | 封板时同步需求子状态为 `FROZEN`，投产时同步需求状态为 `RELEASED` | 需求状态联动 |

### US2.2.2 火车班次取消

| 层级 | 文件 | 说明 |
|------|------|------|
| 路由 | `apps/server/src/modules/trains/routes/schedule.ts` → `DELETE /api/trains/:trainId/schedules/:scheduleId` | 后端路由 |
| 业务 | `apps/server/src/modules/trains/services/train.service.ts` → `cancelTrainSchedule()` | 取消业务逻辑 |
| 联动 | 取消时将 `ONBOARDED` 状态的需求改回 `READY` | 需求状态回滚 |

### US2.2.3 关键日期预览

| 层级 | 文件 | 说明 |
|------|------|------|
| 前端预览 | `apps/web/src/pages/trains/schedule-detail.tsx` → `handlePreviewDates()` | 编辑班次时调用 POST /api/trains/schedules/preview |
| 路由 | `apps/server/src/modules/trains/routes/schedule.ts` → `POST /api/trains/schedules/preview` | 预览关键日期 |
| 业务 | `apps/server/src/modules/trains/services/train.service.ts` → `previewKeyDates()` | 计算 boardingDate/sitDate/uatDate/lockdownDate/releaseDate |
| 工具 | `apps/server/src/modules/trains/utils/key-dates.ts` → `calculateKeyDates()` | 关键日期计算算法 |
| 测试 | `apps/server/src/__tests__/t2-us2.2x-schedule-ext.test.ts` | US2.2.3 关键日期预览测试 |

### US2.3 版本火车列表

| 层级 | 文件 | 说明 |
|------|------|------|
| 页面 | `apps/web/src/pages/trains/index.tsx` | 火车+班次列表页 |
| API | `apps/web/src/services/train.ts` → `listTrains()` | 前端 API 调用 |
| 路由 | `apps/server/src/modules/trains/index.ts` → `GET /api/trains` | 后端路由 |
| 业务 | `apps/server/src/modules/trains/services/train.service.ts` → `listTrains()` | 后端业务逻辑 |

### US2.4 版本火车详情查看

| 层级 | 文件 | 说明 |
|------|------|------|
| 页面 | `apps/web/src/pages/trains/[id].tsx` | 火车详情页 |
| API | `apps/web/src/services/train.ts` → `getTrain()` | 前端 API 调用 |
| 路由 | `apps/server/src/modules/trains/index.ts` → `GET /api/trains/:id` | 后端路由 |
| 业务 | `apps/server/src/modules/trains/services/train.service.ts` → `getTrainById()` | 后端业务逻辑 |

### US2.5 纳版搭载

| 层级 | 文件 | 说明 |
|------|------|------|
| 页面 | `apps/web/src/pages/requirements/` 相关 | 需求列表/详情页纳版功能 |
| 路由 | `apps/server/src/modules/trains/` 相关 | 后端路由 |
| 业务 | `apps/server/src/modules/trains/services/train.service.ts` 相关 | 后端业务逻辑 |

### US2.6 从火车移除

| 层级 | 文件 | 说明 |
|------|------|------|
| 页面 | `apps/web/src/pages/trains/[id].tsx` 或相关 | 火车详情页移除需求 |
| 路由 | `apps/server/src/modules/trains/` 相关 | 后端路由 |
| 业务 | `apps/server/src/modules/trains/services/train.service.ts` 相关 | 后端业务逻辑 |

### US2.7 确认投产

| 层级 | 文件 | 说明 |
|------|------|------|
| 页面 | `apps/web/src/pages/trains/schedule-detail.tsx` | 班次详情页投产功能 |
| 路由 | `apps/server/src/modules/trains/` 相关 | 后端路由 |
| 业务 | `apps/server/src/modules/trains/services/train.service.ts` 相关 | 后端业务逻辑 |

### US2.8 回滚

| 层级 | 文件 | 说明 |
|------|------|------|
| 页面 | `apps/web/src/pages/trains/schedule-detail.tsx` | 班次详情页回滚功能 |
| 路由 | `apps/server/src/modules/trains/` 相关 | 后端路由 |
| 业务 | `apps/server/src/modules/trains/services/train.service.ts` 相关 | 后端业务逻辑 |

### US2.9 完成版本火车

| 层级 | 文件 | 说明 |
|------|------|------|
| 页面 | `apps/web/src/pages/trains/[id].tsx` | 火车详情页完成功能 |
| 路由 | `apps/server/src/modules/trains/` 相关 | 后端路由 |
| 业务 | `apps/server/src/modules/trains/services/train.service.ts` 相关 | 后端业务逻辑 |

---

## 路由与导航映射

| 路径 | 页面文件 | 说明 |
|------|---------|------|
| `/dashboard` | `apps/web/src/pages/dashboard/` | 仪表盘（首页）⭐ |
| `/login` | `apps/web/src/pages/login/` | 登录页 |
| `/requirements` | `apps/web/src/pages/requirements/` | 需求列表 |
| `/schedules` | `apps/web/src/pages/schedules/` | 班次列表 |
| `/trains` | `apps/web/src/pages/trains/index.tsx` | 火车列表 |
| `/trains/new` | `apps/web/src/pages/trains/create.tsx` | 创建火车 |
| `/trains/:id` | `apps/web/src/pages/trains/[id].tsx` | 火车详情 |
| `/trains/:id/edit` | `apps/web/src/pages/trains/[id]/edit.tsx` | 编辑火车 |
| `/trains/:trainId/schedules/:scheduleId` | `apps/web/src/pages/trains/schedule-detail.tsx` | 班次详情 |
| `/systems` | `apps/web/src/pages/systems/` | 系统管理 |

| 导航入口 | 目标 | 代码位置 |
|----------|------|----------|
| 左侧菜单"仪表盘" | `/dashboard` | `MainLayout.tsx:menuItems` |
| 左侧菜单"版本火车" | `/schedules` | `MainLayout.tsx:menuItems` |
| 登录后自动跳转 | `/dashboard` | `login/index.tsx` / `AuthGuard.tsx` |
| 路由兜底 | → `/dashboard` | `App.tsx:<Route path="*">` |

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
| 火车管理 | `apps/server/src/modules/trains/` + `apps/web/src/pages/trains/` | US2.1~US2.9 |
| 火车 API | `apps/web/src/services/train.ts` | US2.1~US2.9 |
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
| 创建火车失败 | US2.1 | `TrainForm.tsx` → `train.service.ts:createTrain()` |
| 创建班次失败 | US2.2 | `trains/index.tsx` 模态框 → `train.service.ts:createTrainSchedule()` |
| 班次名称自动生成问题 | US2.2 | `train.service.ts` → `scheduleName` 变量赋值逻辑 |
| 火车列表问题 | US2.3 | `trains/index.tsx` → `train.service.ts:listTrains()` |
| 火车详情问题 | US2.4 | `trains/[id].tsx` → `train.service.ts:getTrainById()` |
| 班次详情问题 | US2.4/US2.2 | `trains/schedule-detail.tsx` → `train.service.ts:getTrainScheduleById()` |
| 班次状态变更失败 | US2.2.1 | `train.service.ts:updateTrainScheduleStatus()` → `validTransitions` 状态机校验 |
| 状态联动异常 | US2.2.1 | `train.service.ts:updateTrainScheduleStatus()` 内 `ONBOARDED` → `FROZEN`/`RELEASED` 逻辑 |
| 关键日期计算错误 | US2.2.3 | `key-dates.ts:calculateKeyDates()`（纳版=开始-3天/SIT=开始→封板×50%/UAT=SIT→封板中点/封板=投产-3天） |
| 预览关键日期 API | US2.2.3 | `train.service.ts:previewKeyDates()` → `POST /api/trains/schedules/preview` |
| 班次详情编辑 SIT/UAT | US2.2 | `schedule-detail.tsx:handleEditSubmit()` → `PUT` 含 sitDate/uatDate |
| 月历视图无默认火车 | Dashboard | `CalendarView.tsx:loadData()` → 加载火车列表后需调用 `getScheduleProgress` |
| 单班次月历不显示 SIT/UAT | US2.2 | `ScheduleCalendar.tsx:getEventsForDate()` → 检查 sitDate/uatDate |
| 服务启动/重启 | 运维 | `dev.sh start|stop|restart|status` |
| 路由跳转错误 | 路由 | 路由表：`/schedules`=班次列表 `/trains`=火车列表 `/dashboard`=首页 |
| 取消班次需求回滚 | US2.2.2 | `train.service.ts:cancelTrainSchedule()` → `ONBOARDED` → `READY` |
| AI审查失败/无返回 | T6 US6.1 | `requirement-review/service.ts:runAiReview()` → Coze timeout/error catch → 降级 |
| AI审查前端超时 | T6 US6.1 | `api.ts:timeout` (3min) + `requirement.ts:reviewData()` |
| 审查结果不显示验收条件 | T6 US6.2 | `RequirementForm.tsx:reviewResult.acceptanceCriteria` → Tabs/Criteria |
| 智能纳版Coze报错 | T3 | `smart-onboard/service.ts:generateOnboardSuggestions()` → Coze WORKFLOW_ID |
| Coze SDK参数包装 | T3/T6 | `coze/index.ts:runWorkflow()` — SDK自动包装parameters，不要双重嵌套 |
| Coze枚举映射 | T6 US6.1 | `service.ts:mapPriorityToChinese()` / `mapReqTypeToChinese()` |