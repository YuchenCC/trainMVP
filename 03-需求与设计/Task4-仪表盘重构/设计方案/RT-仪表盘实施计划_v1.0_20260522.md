# 角色仪表盘 + 月历 实施计划

**版本号**: v1.0  
**日期**: 2026-05-22  
**状态**: 待审核  
**参考文档**: RT-角色高频功能分析审核_v2.1_20260521.md

---

## 目录

1. [总体架构](#一总体架构)
2. [实施顺序](#二实施顺序)
3. [Sprint 0：后端查询 API + 共享类型](#三sprint-0后端查询-api--共享类型)
4. [Sprint 0.5：前端 Service 层 + 路由配置](#四sprint-05前端-service-层--路由配置)
5. [用户故事 US-1：月历视图](#五用户故事-us-1月历视图)
6. [用户故事 US-2：BA 仪表盘](#六用户故事-us-2ba-仪表盘)
7. [用户故事 US-3：项目经理仪表盘](#七用户故事-us-3项目经理仪表盘)
8. [用户故事 US-4：火车管理员仪表盘](#八用户故事-us-4火车管理员仪表盘)
9. [用户故事 US-5：测试负责人仪表盘](#九用户故事-us-5测试负责人仪表盘)
10. [用户故事 US-6：产品经理仪表盘](#十用户故事-us-6产品经理仪表盘)
11. [用户故事 US-7：技术经理仪表盘](#十一用户故事-us-7技术经理仪表盘)
12. [前端优化项](#十二前端优化项)
13. [文件改动总清单](#十三文件改动总清单)
14. [测试策略](#十四测试策略)

---

## 一、总体架构

### 1.1 分层架构

```
┌─────────────────────────────────────────────────────────────┐
│                    前端 (apps/web)                           │
│                                                             │
│  DashboardPages/           DashboardComponents/             │
│  ├─ CalendarPage.tsx       ├─ StatusStatCards.tsx           │
│  ├─ BADashboard.tsx        ├─ TodoList.tsx                 │
│  ├─ ProjectMgrDashboard    ├─ ScheduleProgressCard.tsx      │
│  ├─ TrainAdminDashboard    └─ RequirementCard.tsx           │
│  ├─ TestMgrDashboard                                        │
│  ├─ ProductMgrDashboard                                     │
│  └─ TechMgrDashboard                                        │
│                                                             │
│  Services/                                                  │
│  ├─ requirement.ts (+getStats, +getEmergencyChanges,       │
│  │                   +getMyTodos)                            │
│  └─ train.ts (+getSchedulesProgress)                        │
├─────────────────────────────────────────────────────────────┤
│                    共享层 (packages/shared)                  │
│                                                             │
│  types/dashboard.ts  — 仪表盘专用响应类型                   │
│  新增: RequirementStatsResponse, EmergencyChangeItem,       │
│         MyTodosResponse, ScheduleProgressItem               │
├─────────────────────────────────────────────────────────────┤
│                    后端 (apps/server)                        │
│                                                             │
│  modules/requirements/          modules/trains/             │
│  ├─ service.ts                  ├─ services/               │
│  │   +getRequirementStats()     │   train.service.ts       │
│  │   +getEmergencyChanges()      │   +getSchedulesProgress()│
│  │   +getMyTodos()              ├─ routes/                 │
│  ├─ index.ts                    │   schedule.ts            │
│  │   +3 个 GET 路由             │   +GET progress 路由      │
├─────────────────────────────────────────────────────────────┤
│                    数据库 (PostgreSQL)                       │
│                                                             │
│  Requirement / EmergencyChange / StatusLog /                │
│  TrainSchedule / TrainSystemSnapshot / TrainSystem          │
│  (全部为已有表，不新增任何模型)                              │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 核心约束

- **不新建任何数据模型**（表/枚举），所有查询基于已有 Prisma Schema
- **仪表盘只展示有数据支撑的内容**，不做凭空造牌
- **4 个新增后端 API 均为只读聚合查询**，无副作用
- **前端按角色分发仪表盘**，角色路由映射在入口组件中

### 1.3 角色 → 仪表盘映射

| 角色 | 仪表盘组件 |
|------|-----------|
| BA | `BADashboard` |
| PM (产品经理) | `ProductMgrDashboard` |
| PROJECT_MGR (项目经理) | `ProjectMgrDashboard` |
| TRAIN_ADMIN (火车管理员) | `TrainAdminDashboard` |
| TECH_MGR (技术经理) | `TechMgrDashboard` |
| TEST_MGR (测试负责人) | `TestMgrDashboard` |
| SUPER_ADMIN | `ProjectMgrDashboard` |

---

## 二、实施顺序

```
Sprint 0 (后端 API + 共享类型)
    │
    ▼
Sprint 0.5 (前端 Service 层 + 路由配置)
    │
    ├──────────────────────────────────────┐
    ▼                                      ▼
第一批用户故事                          前端优化项（可并行）
    │                                      │
    ├─ US-1: 月历视图                     ├─ 默认筛选
    ├─ US-2: BA 仪表盘                    ├─ 快捷筛选按钮
    └─ US-3: 项目经理仪表盘               ├─ 录入表单默认值
              │                           ├─ 班次快速切换
              ▼                           └─ 评审快捷模式
第二批用户故事
    │
    ├─ US-4: 火车管理员仪表盘
    ├─ US-5: 测试负责人仪表盘
    ├─ US-6: 产品经理仪表盘
    └─ US-7: 技术经理仪表盘
```

### Git 分支策略

| 阶段 | 分支名 | 内容 |
|------|--------|------|
| Sprint 0 | `task-dashboard-backend` | 4 个后端 API + 共享类型 |
| Sprint 0.5 | `task-dashboard-services` | 前端 Service 层 + 路由 |
| 第一批 US | `task-dashboard-batch1` | US-1 + US-2 + US-3 |
| 第二批 US | `task-dashboard-batch2` | US-4 + US-5 + US-6 + US-7 |
| 优化项 | `task-dashboard-uopt` | 前端优化项 |

---

## 三、Sprint 0：后端查询 API + 共享类型

> **目标**: 提供仪表盘所需的 4 个后端聚合查询 API，全部只读、无副作用

### 3.1 API-01：需求聚合统计

**路由**: `GET /api/stats/requirements`

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| systemIds | string | 否 | 逗号分隔的系统ID列表，不传则不限系统 |
| scheduleId | string | 否 | 班次ID，不传则不限班次 |
| trainId | string | 否 | 火车ID（查询该火车下所有班次的需求，用于项目经理视角） |

**实现文件**:
- 后端: `apps/server/src/modules/requirements/service.ts` → 新增函数 `getRequirementStats()`
- 后端路由: `apps/server/src/modules/requirements/index.ts` → 新增路由（**必须在 `/api/requirements/:id` 之前注册**）
- 共享类型: `packages/shared/src/types/dashboard.ts` → `RequirementStatsResponse`

**查询实现** (Prisma):

```typescript
// apps/server/src/modules/requirements/service.ts
export async function getRequirementStats(params: {
  systemIds?: string[];
  scheduleId?: string;
  trainId?: string;
}): Promise<RequirementStatsResponse> {
  // 构建 where 条件
  const where: Prisma.RequirementWhereInput = {};
  if (params.systemIds?.length) {
    where.systemId = { in: params.systemIds };
  }
  if (params.scheduleId) {
    where.scheduleId = params.scheduleId;
  }
  if (params.trainId) {
    where.trainSchedule = { trainId: params.trainId };
  }

  // Prisma groupBy — 利用 [status, subStatus] 已有索引
  const byStatus = await prisma.requirement.groupBy({
    by: ['status'],
    where,
    _count: true,
  });
  const bySubStatus = await prisma.requirement.groupBy({
    by: ['subStatus'],
    where: { ...where, status: ReqStatus.ONBOARDED },
    _count: true,
  });
  const byPriority = await prisma.requirement.groupBy({
    by: ['priority'],
    where,
    _count: true,
  });
  const total = await prisma.requirement.count({ where });
  const activeCount = await prisma.requirement.count({
    where: {
      ...where,
      status: { notIn: [ReqStatus.CANCELLED, ReqStatus.RELEASED] },
    },
  });

  return { byStatus, bySubStatus, byPriority, total, activeCount };
}
```

**响应类型** (`packages/shared/src/types/dashboard.ts`):

```typescript
export interface RequirementStatsResponse {
  byStatus: Record<string, number>;    // { DRAFT: 3, PENDING_REVIEW: 2, ... }
  bySubStatus: Record<string, number>; // { DEV_IN_PROGRESS: 2, SIT_TESTING: 1, ... } 仅已纳版
  byPriority: Record<string, number>;  // { P0: 1, P1: 3, P2: 8, P3: 2 }
  total: number;
  activeCount: number;                 // 排除 CANCELLED + RELEASED
}
```

### 3.2 API-02：紧急变更列表

**路由**: `GET /api/emergency-changes`

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 审批状态过滤（PENDING/APPROVED/REJECTED） |
| approverId | string | 否 | 审批人ID |

**实现文件**:
- 后端: `apps/server/src/modules/requirements/service.ts` → 新增函数 `getEmergencyChanges()`
- 后端路由: `apps/server/src/modules/requirements/index.ts` → 新增路由

**查询实现**:

```typescript
export async function getEmergencyChanges(params: {
  status?: ApprovalStatus;
  approverId?: string;
}): Promise<PaginatedResponse<EmergencyChangeItem>> {
  const where: Prisma.EmergencyChangeWhereInput = {};
  if (params.status) where.status = params.status;
  if (params.approverId) where.approverId = params.approverId;

  const [list, total] = await Promise.all([
    prisma.emergencyChange.findMany({
      where,
      include: {
        requirement: { select: { reqCode: true, title: true, system: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.emergencyChange.count({ where }),
  ]);
  return { list, total, page: 1, pageSize: list.length };
}
```

**响应类型**:

```typescript
export interface EmergencyChangeItem {
  id: string;
  requirementId: string;
  reqCode: string;
  title: string;
  system: { id: string; name: string };
  urgency: 'P0' | 'P1';
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvalStep: number;
  approverId?: string;
  createdAt: string;
}
```

### 3.3 API-03：用户待办聚合

**路由**: `GET /api/requirements/my-todos`

**查询参数**: 无（根据 `request.user` 自动判断角色）

**实现文件**:
- 后端: `apps/server/src/modules/requirements/service.ts` → 新增函数 `getMyTodos()`
- 后端路由: `apps/server/src/modules/requirements/index.ts` → 新增路由

**查询实现**（按角色分支）:

```typescript
export async function getMyTodos(user: SafeUser): Promise<MyTodosResponse> {
  const role = user.role;

  switch (role) {
    case Role.BA: {
      // 评审被拒绝的需求
      const pendingReviewRejected = await prisma.requirement.findMany({
        where: { status: ReqStatus.REJECTED, systemId: { in: user.systemIds } },
        include: { system: { select: { id: true, name: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      });
      // 变更通过待重发评审：DRAFT + 有 CHANGE_REQUIREMENT 操作记录的 StatusLog
      const changedDraftIds = await prisma.statusLog.findMany({
        where: {
          operationType: OperationType.CHANGE_REQUIREMENT,
          requirement: { status: ReqStatus.DRAFT, systemId: { in: user.systemIds } },
        },
        select: { requirementId: true },
        distinct: ['requirementId'],
      });
      const changeApprovedNeedsResubmit = await prisma.requirement.findMany({
        where: { id: { in: changedDraftIds.map(l => l.requirementId) } },
        include: { system: { select: { id: true, name: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      });
      return { pendingReviewRejected, changeApprovedNeedsResubmit };
    }
    case Role.PM: {
      const pendingReviewList = await prisma.requirement.findMany({
        where: { status: ReqStatus.PENDING_REVIEW },
        include: { system: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return { pendingReviewList };
    }
    case Role.PROJECT_MGR: {
      const pendingReviewList = await prisma.requirement.findMany({
        where: { status: ReqStatus.PENDING_REVIEW },
        include: { system: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      const emergencyPendingApproval = await prisma.emergencyChange.findMany({
        where: { status: ApprovalStatus.PENDING },
        include: {
          requirement: { select: { reqCode: true, title: true, system: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return { pendingReviewList, emergencyPendingApproval };
    }
    // ... 其余角色类似
  }
}
```

> **"变更通过待重发评审"推导逻辑**:
> 1. 查询 `StatusLog` 表，找 `operationType = CHANGE_REQUIREMENT` 且对应 `Requirement.status = DRAFT` 的记录
> 2. 去重取 `requirementId`，再查 `Requirement` 表返回详情
> 3. 这利用了 `StatusLog` 已有数据和 `CHANGE_REQUIREMENT` 操作类型的语义

**响应类型**:

```typescript
export interface MyTodosResponse {
  // BA
  pendingReviewRejected?: RequirementListItem[];
  changeApprovedNeedsResubmit?: RequirementListItem[];
  // PM
  pendingReviewList?: RequirementListItem[];
  // PROJECT_MGR
  emergencyPendingApproval?: EmergencyChangeItem[];
  // TRAIN_ADMIN
  pendingOnboard?: RequirementListItem[];
  pendingRelease?: RequirementListItem[];
  // TECH_MGR
  pendingDev?: RequirementListItem[];
  pendingToSubmitTest?: RequirementListItem[];
  // TEST_MGR
  pendingTest?: RequirementListItem[];
}
```

### 3.4 API-04：班次进度聚合

**路由**: `GET /api/schedules/progress`

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| trainId | string | 否 | 火车ID，不传则返回所有班次 |

**实现文件**:
- 后端: `apps/server/src/modules/trains/services/train.service.ts` → 新增函数 `getSchedulesProgress()`
- 后端路由: `apps/server/src/modules/trains/routes/schedule.ts` → 新增路由

**查询实现**:

```typescript
export async function getSchedulesProgress(trainId?: string): Promise<ScheduleProgressItem[]> {
  const where: Prisma.TrainScheduleWhereInput = {};
  if (trainId) where.trainId = trainId;

  const schedules = await prisma.trainSchedule.findMany({
    where,
    include: {
      train: { select: { id: true, name: true } },
      requirements: { select: { id: true, status: true, subStatus: true } },
      snapshots: { select: { usedPoints: true, capacityPoints: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return schedules.map(sch => {
    const totalRequirements = sch.requirements.length;
    const completedCount = sch.requirements.filter(
      r => r.subStatus === ReqSubStatus.FROZEN || r.status === ReqStatus.RELEASED
    ).length;
    const capacityUsed = sch.snapshots.reduce((sum, s) => sum + s.usedPoints, 0);   // 跨系统 SUM
    const capacityTotal = sch.snapshots.reduce((sum, s) => sum + s.capacityPoints, 0); // 跨系统 SUM
    const progressPercent = totalRequirements > 0
      ? Math.round((completedCount / totalRequirements) * 100)
      : 0;

    return {
      scheduleId: sch.id,
      scheduleName: sch.name,
      trainName: sch.train.name,
      status: sch.status,
      totalRequirements,
      completedCount,
      inProgressCount: totalRequirements - completedCount,
      capacityUsed,
      capacityTotal,
      progressPercent,
      boardingDate: sch.boardingDate?.toISOString() || null,
      lockdownDate: sch.lockdownDate?.toISOString() || null,
      releaseDate: sch.releaseDate?.toISOString() || null,
    };
  });
}
```

**响应类型**:

```typescript
export interface ScheduleProgressItem {
  scheduleId: string;
  scheduleName: string;
  trainName: string;
  status: TrainScheduleStatus;
  totalRequirements: number;
  completedCount: number;
  inProgressCount: number;
  capacityUsed: number;           // TrainSystemSnapshot.usedPoints 跨系统 SUM
  capacityTotal: number;          // TrainSystemSnapshot.capacityPoints 跨系统 SUM
  progressPercent: number;
  boardingDate: string | null;
  lockdownDate: string | null;
  releaseDate: string | null;
}
```

### 3.5 路由注册（注意顺序）

在 [requirements/index.ts](file:///Users/laiyang/Library/Application%20Support/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/69fab7e1a29c125df6f0f954/release-train/apps/server/src/modules/requirements/index.ts) 中，新增路由必须在 `GET /api/requirements/:id` 之前注册：

```
1. GET /api/requirements/search    ← 已有
2. GET /api/requirements            ← 已有（列表）
3. GET /api/stats/requirements      ← 新增（这里）
4. GET /api/emergency-changes       ← 新增（这里）
5. GET /api/requirements/my-todos   ← 新增（这里）
6. GET /api/requirements/:id        ← 已有（详情，通配路由必须在最后）
```

### 3.6 共享类型新建文件

**文件**: `packages/shared/src/types/dashboard.ts`

包含: `RequirementStatsResponse`, `EmergencyChangeItem`, `MyTodosResponse`, `ScheduleProgressItem`

**导出注册**: 在 `packages/shared/src/index.ts` 中添加 `export * from './types/dashboard';`

---

## 四、Sprint 0.5：前端 Service 层 + 路由配置

> **目标**: 封装后端 API 调用 + 配置仪表盘路由入口 + 注册复用组件骨架

### 4.1 前端 Service 新增方法

**文件**: [apps/web/src/services/requirement.ts](file:///Users/laiyang/Library/Application%20Support/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/69fab7e1a29c125df6f0f954/release-train/apps/web/src/services/requirement.ts)

新增方法:

```typescript
// 需求聚合统计
getStats: async (params: {
  systemIds?: string;
  scheduleId?: string;
  trainId?: string;
}): Promise<ApiResponse<RequirementStatsResponse>> => {
  const response = await api.get('/stats/requirements', { params });
  return response.data;
},

// 紧急变更列表
getEmergencyChanges: async (params: {
  status?: string;
  approverId?: string;
}): Promise<ApiResponse<PaginatedResponse<EmergencyChangeItem>>> => {
  const response = await api.get('/emergency-changes', { params });
  return response.data;
},

// 我的待办
getMyTodos: async (): Promise<ApiResponse<MyTodosResponse>> => {
  const response = await api.get('/requirements/my-todos');
  return response.data;
},
```

**文件**: [apps/web/src/services/train.ts](file:///Users/laiyang/Library/Application%20Support/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/69fab7e1a29c125df6f0f954/release-train/apps/web/src/services/train.ts)

新增方法:

```typescript
// 班次进度聚合
getSchedulesProgress: async (trainId?: string): Promise<ApiResponse<ScheduleProgressItem[]>> => {
  const response = await api.get('/schedules/progress', { params: trainId ? { trainId } : {} });
  return response.data;
},
```

### 4.2 仪表盘路由入口

**新建文件**: `apps/web/src/pages/dashboard/index.tsx`

```typescript
// ========== 仪表盘路由入口 ==========
// 根据当前登录用户的 role 分发到对应的仪表盘组件
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth';
import { Role } from '@release-train/shared';
import BADashboard from './ba';
import ProductMgrDashboard from './product-mgr';
import ProjectMgrDashboard from './project-mgr';
import TrainAdminDashboard from './train-admin';
import TechMgrDashboard from './tech-mgr';
import TestMgrDashboard from './test-mgr';

const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();

  if (!user) return null;

  switch (user.role) {
    case Role.BA:           return <BADashboard />;
    case Role.PM:           return <ProductMgrDashboard />;
    case Role.PROJECT_MGR:  return <ProjectMgrDashboard />;
    case Role.TRAIN_ADMIN:  return <TrainAdminDashboard />;
    case Role.TECH_MGR:     return <TechMgrDashboard />;
    case Role.TEST_MGR:     return <TestMgrDashboard />;
    case Role.SUPER_ADMIN:  return <ProjectMgrDashboard />;
    default:                return <Navigate to="/requirements" />;
  }
};

export default DashboardPage;
```

### 4.3 路由注册 + 侧边栏入口改造

**修改文件**: `apps/web/src/App.tsx` 或路由配置文件（如有）→ 添加 `/dashboard` 路由指向 `DashboardPage`

**修改文件**: [apps/web/src/layouts/MainLayout.tsx](file:///Users/laiyang/Library/Application%20Support/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/69fab7e1a29c125df6f0f954/release-train/apps/web/src/layouts/MainLayout.tsx)

1. `BREADCRUMB_MAP` 已有 `/dashboard` 映射，无需改动
2. 侧边栏添加仪表盘菜单项 + 月历菜单项:

```typescript
const menuItems: MenuProps['items'] = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: '仪表盘',
  },
  {
    key: '/calendar',
    icon: <CalendarOutlined />,
    label: '月历',
  },
  // ... 已有菜单项
];
```

3. `DYNAMIC_BREADCRUMB` 添加 /calendar 映射

### 4.4 复用组件骨架创建

在此阶段创建 3 个复用组件的骨架文件（含 Props 接口 + 基础 JSX + 空状态占位），后续各仪表盘引用时直接传入数据即可:

| 文件 | 用途 | 被哪些仪表盘使用 |
|------|------|-----------------|
| `apps/web/src/components/dashboard/StatusStatCards.tsx` | 状态统计卡片组 | BA / 项目经理 / 技术经理 |
| `apps/web/src/components/dashboard/TodoList.tsx` | 待办列表（带 Tab 切换） | BA / 产品经理 / 项目经理 |
| `apps/web/src/components/dashboard/ScheduleProgressCard.tsx` | 班次进度表格（含容量） | 火车管理员 / 项目经理 / 产品经理 |

---

## 五、用户故事 US-1：月历视图

> **作为** 所有角色用户  
> **我想要** 在月历视图中查看每个火车的所有班次和关键时间点  
> **以便** 直观了解版本火车的时间安排，避免错过关键日期

### 5.1 验收标准

- [ ] 侧边栏有「月历」入口，点击进入月历页面
- [ ] 顶部有火车切换器（按钮组），点击切换不同火车
- [ ] 左上角月份导航器，支持前后翻月 +「今天」按钮
- [ ] 7 列表格月历，按周显示
- [ ] 当月日历格内标记每个班次的关键事件:
  - 🔵 纳版日 (boardingDate)
  - 🟠 封板日 (lockdownDate)
  - 🟢 投产日 (releaseDate)
  - 🟣 班次时间跨度条（从 startDate 到 endDate）
- [ ] 右下角图例卡片，展示当月各班次关键日期详情
- [ ] 点击具体日期跳转对应班次详情页

### 5.2 技术实现

**页面文件**: `apps/web/src/pages/calendar/index.tsx`

**数据来源**: 
- 火车列表: `trainService.list()`（现有接口）
- 班次数据: `trainService.getSchedule(trainId)`（现有接口，返回 `TrainScheduleDetail` 含 `snapshots`）

> 月历页不依赖 Sprint 0 新增 API，可独立开发

**组件设计**:

```
┌──────────────────────────────────────────────────────────────┐
│  🚂 版本火车月历                                              │
│  [Q2·用户中心 ▾]  ◀ 2026年5月 ▶  [今天] [Q1] [Q2] [Q3]    │
├──────────────────────────────────────────────────────────────┤
│  日  一   二   三   四   五   六                              │
│                        1   2                                 │
│  3   4   5   6   7   8   9                                   │
│  ...                                                         │
│  25  26  27  28  29  30  31                                  │
│                                                              │
│  5-11  纳版 🔵                                              │
│  5-23  封板 🟠                                              │
│  5-30  投产 🟢                                              │
├──────────────────────────────────────────────────────────────┤
│  ┌────────────┐ ┌────────────┐ ┌────────────┐              │
│  │ Q2第1班     │ │ Q2第2班     │ │ Q2第3班     │              │
│  │ 🔵 5-11    │ │ 🔵 5-25    │ │ 🔵 6-08    │              │
│  │ 🟠 5-23    │ │ 🟠 6-06    │ │ 🟠 6-20    │              │
│  │ 🟢 5-30    │ │ 🟢 6-13    │ │ 🟢 6-27    │              │
│  └────────────┘ └────────────┘ └────────────┘              │
└──────────────────────────────────────────────────────────────┘
```

**核心逻辑**:

```typescript
// 1. 根据火车ID获取所有班次
const schedules = await trainService.getSchedule(trainId);

// 2. 提取当前月的班次事件
const monthEvents = schedules.flatMap(sch => [
  { type: 'boarding', date: sch.boardingDate, label: '纳版', schedule: sch },
  { type: 'lockdown', date: sch.lockdownDate, label: '封板', schedule: sch },
  { type: 'release', date: sch.releaseDate, label: '投产', schedule: sch },
]);

// 3. 前端计算月末日历布局（Ant Design Calendar 组件或自定义表格）
// 4. 标记每天的事件
```

**文件清单**:

| 文件 | 操作 | 说明 |
|------|------|------|
| `apps/web/src/pages/calendar/index.tsx` | **新建** | 月历页面主组件 |
| `apps/web/src/pages/calendar/CalendarGrid.tsx` | **新建** | 月历格子渲染 |
| `apps/web/src/pages/calendar/ScheduleLegend.tsx` | **新建** | 底部班次图例卡片 |
| `apps/web/src/layouts/MainLayout.tsx` | **修改** | 添加侧边栏月历菜单 + 面包屑 |

### 5.3 可选增强（非 MVP）

- 拖拽选择日期范围快速创建班次（产品经理/火车管理员）
- 导出月历为图片

---

## 六、用户故事 US-2：BA 仪表盘

> **作为** BA  
> **我想要** 在仪表盘中一眼看到自己系统的需求概览、待办事项和当前班次进度  
> **以便** 快速处理被驳回需求和变更通过后的重发评审，不遗漏纳版截止日

### 6.1 验收标准

- [ ] BA 登录后进入 `/dashboard` 自动展示 BA 仪表盘
- [ ] **第一行**: 左侧 — 5 张状态统计卡片（草稿/待评审/已就绪/已纳版/已投产），右侧 — 纳版截止提醒卡片
- [ ] **第二行**: 待办列表，Tab 切换「评审被拒绝」「变更通过待重发」
- [ ] **第三行**: 当前班次需求表格（reqCode, title, status, subStatus, progress, updatedAt）
- [ ] 点击统计卡片跳转需求列表（预填状态筛选）
- [ ] 点击待办行跳转需求详情页
- [ ] 空状态展示友好提示（Ant Design Empty 组件）

### 6.2 数据加载

页面 mount 时并行请求（`Promise.all`）:

```typescript
const [stats, todos, currentScheduleReqs] = await Promise.all([
  requirementService.getStats({ systemIds: user.systemIds.join(',') }),
  requirementService.getMyTodos(),
  requirementService.list({
    scheduleId: currentScheduleId,  // 从 todos 或 stats 中获取当前班次ID
    systemId: user.systemIds[0],
    page: 1,
    pageSize: 10,
  }),
]);
```

**「当前班次」判断逻辑**: 查询班次进度 API，取 `status === IN_PROGRESS` 的第一个班次；如果没有则取「规划中」的第一个。

### 6.3 页面文件

**新建**: `apps/web/src/pages/dashboard/ba.tsx`

**使用的复用组件**:
- `StatusStatCards` — 状态统计卡片
- `TodoList` — 待办列表

**不依赖** `ScheduleProgressCard`（BA 看的是自己系统的需求，不是全部班次进度）

**额外区域**:
- 纳版截止提醒卡片（Alert + Statistic）

**文件清单**:

| 文件 | 操作 | 说明 |
|------|------|------|
| `apps/web/src/pages/dashboard/ba.tsx` | **新建** | BA 仪表盘主组件 |

---

## 七、用户故事 US-3：项目经理仪表盘

> **作为** 项目经理  
> **我想要** 在仪表盘中看到全系统的需求状态分布、所有班次进度、紧急变更待审列表和依赖风险  
> **以便** 把控项目整体节奏，及时处理紧急变更审批

### 7.1 验收标准

- [ ] 项目经理登录后进入 `/dashboard` 自动展示项目经理仪表盘
- [ ] **第一行**: 全系统需求状态分布卡片（不限系统）
- [ ] **第二行**: 左侧 — 班次进度表（含容量进度），右侧 — 紧急变更待审核表格
- [ ] **第三行**: 依赖风险提示表格（已纳版需求中有依赖风险等级的）
- [ ] 紧急变更表格每行有「审批」「驳回」操作按钮，直接调用现有 API
- [ ] 无依赖风险时第三行显示「暂无依赖风险」

### 7.2 数据加载

```typescript
const [stats, schedulesProgress, emergencyChanges, riskReqs] = await Promise.all([
  requirementService.getStats({}),  // 不限系统
  trainService.getSchedulesProgress(),
  requirementService.getEmergencyChanges({ status: 'PENDING' }),
  requirementService.list({ status: ReqStatus.ONBOARDED, page: 1, pageSize: 50 }),
  // ↑ 拉取已纳版需求列表，前端过滤有依赖风险的需求（依赖关系通过详情接口获取）
]);
```

> **依赖风险数据获取策略**: 已纳版需求列表 → 前端遍历 `dependencies` 中有 `riskLevel !== null` 的项。如果现有列表接口不返回依赖信息，需要在后端增加一个简单的查询（或前端对列表逐条调详情，性能较差，建议走后端聚合）。

**替代方案（推荐）**: 在 `getMyTodos()` API 的 `PROJECT_MGR` 分支中增加依赖风险查询:

```typescript
// 查询已纳版需求中，依赖方状态不是 RELEASED/FROZEN 且被依赖方状态异常的情况
const riskRequirements = await prisma.requirement.findMany({
  where: {
    status: ReqStatus.ONBOARDED,
    dependants: {
      some: {
        dependency: {
          status: { notIn: [ReqStatus.RELEASED, ReqStatus.ONBOARDED] },
        },
      },
    },
  },
  include: { system: { select: { id: true, name: true } } },
  take: 50,
});
```

### 7.3 页面文件

**新建**: `apps/web/src/pages/dashboard/project-mgr.tsx`

**使用的复用组件**:
- `StatusStatCards` — 状态统计卡片（不限系统）
- `ScheduleProgressCard` — 班次进度表格

**额外区域**:
- 紧急变更待审核表格（含审批/驳回操作）
- 依赖风险提示表格

**文件清单**:

| 文件 | 操作 | 说明 |
|------|------|------|
| `apps/web/src/pages/dashboard/project-mgr.tsx` | **新建** | 项目经理仪表盘主组件 |

---

## 八、用户故事 US-4：火车管理员仪表盘

> **作为** 火车管理员  
> **我想要** 在仪表盘中看到所有火车班次的概览、待纳版/待投产需求和关键日期时间线  
> **以便** 高效管理版本火车的运转节奏

### 8.1 验收标准

- [ ] 火车管理员登录后展示火车管理员仪表盘
- [ ] **第一行**: 左侧 — 班次进度表（`ScheduleProgressCard`），右侧 — 关键日期时间线（Timeline）
- [ ] **第二行**: 左侧 — 待纳版需求表格（`status=READY`），右侧 — 待确认投产表格（`status=ONBOARDED, subStatus=SIT_TESTING+UAT_TESTING`）
- [ ] 时间线显示距今天数（如"3天后"、"10天后"）
- [ ] 点击需求行跳转详情
- [ ] **不需要 capacityUsed/capacityTotal**（火车管理员关注进度和关键日期，不关注容量）

### 8.2 数据加载

```typescript
const [schedulesProgress, pendingOnboard, pendingRelease] = await Promise.all([
  trainService.getSchedulesProgress(),
  requirementService.list({ status: ReqStatus.READY, page: 1, pageSize: 10 }),
  requirementService.list({
    status: ReqStatus.ONBOARDED,
    subStatus: [ReqSubStatus.SIT_TESTING, ReqSubStatus.UAT_TESTING],
    page: 1,
    pageSize: 10,
  }),
]);
```

**关键日期时间线数据**: 从 `schedulesProgress` 中提取 `boardingDate / lockdownDate / releaseDate`，前端计算距今天数。

### 8.3 页面文件

**新建**: `apps/web/src/pages/dashboard/train-admin.tsx`

**使用的复用组件**:
- `ScheduleProgressCard` — 班次进度

**额外区域**:
- 关键日期 Timeline（Ant Design Timeline 组件）
- 待纳版表格
- 待确认投产表格

**文件清单**:

| 文件 | 操作 | 说明 |
|------|------|------|
| `apps/web/src/pages/dashboard/train-admin.tsx` | **新建** | 火车管理员仪表盘主组件 |

---

## 九、用户故事 US-5：测试负责人仪表盘

> **作为** 测试负责人  
> **我想要** 在仪表盘中看到待测试需求和紧急变更待测试列表，以及测试进度看板  
> **以便** 高效安排测试工作和响应紧急变更

### 9.1 验收标准

- [ ] 测试负责人登录后展示测试负责人仪表盘
- [ ] **第一行**: 左侧 — 待测试需求表格（`subStatus=SIT_TESTING+UAT_TESTING`），右侧 — 紧急变更待测试表格
- [ ] **第二行**: 测试进度看板（4列：SIT测试 / UAT测试 / 封板 / 已投产）
- [ ] 看板每列有计数 Badge
- [ ] 点击需求行跳转详情
- [ ] **不依赖紧急变更审批按钮**（测试负责人在紧急变更流程中是审批人，这里只展示待测试列表）

### 9.2 数据加载

```typescript
const [pendingTest, emergencyPendingApproval, allOnboardedReqs] = await Promise.all([
  requirementService.list({
    status: ReqStatus.ONBOARDED,
    subStatus: [ReqSubStatus.SIT_TESTING, ReqSubStatus.UAT_TESTING],
    page: 1,
    pageSize: 20,
  }),
  requirementService.getEmergencyChanges({
    status: 'PENDING',
    approverId: user.id,
  }),
  requirementService.list({
    status: ReqStatus.ONBOARDED,
    systemId: user.systemIds.join(','),
    page: 1,
    pageSize: 200,  // 较大 pagesize 用于前端分列
  }),
]);
```

**看板分列逻辑**: 前端对 `allOnboardedReqs` 按 `subStatus` 分组到:
- SIT测试 (`SIT_TESTING`)
- UAT测试 (`UAT_TESTING`)
- 封板 (`FROZEN`)
- 已投产 (`RELEASED`)

### 9.3 页面文件

**新建**: `apps/web/src/pages/dashboard/test-mgr.tsx`

**使用的复用组件**:
- **不依赖** `StatusStatCards` / `TodoList` / `ScheduleProgressCard`（看板布局独特）

**文件清单**:

| 文件 | 操作 | 说明 |
|------|------|------|
| `apps/web/src/pages/dashboard/test-mgr.tsx` | **新建** | 测试负责人仪表盘主组件 |

---

## 十、用户故事 US-6：产品经理仪表盘

> **作为** 产品经理  
> **我想要** 在仪表盘中看到所有班次的进展汇总（含容量）、待评审需求列表和 P0/P1 重点需求  
> **以便** 高效评审和把控重点需求

### 10.1 验收标准

- [ ] 产品经理登录后展示产品经理仪表盘
- [ ] **第一行**: 班次汇总表格（`ScheduleProgressCard`，含容量 `capacityUsed/capacityTotal`）
- [ ] **第二行**: 左侧 — 待评审需求表格，右侧 — P0/P1 需求表格
- [ ] 班次汇总显示容量使用率（超过 85% 显示警告 Badge）
- [ ] 点击需求行跳转详情
- [ ] 产品经理最关注**容量**和**评审**两个维度

### 10.2 数据加载

```typescript
const [schedulesProgress, pendingReview, highPriority] = await Promise.all([
  trainService.getSchedulesProgress(),
  requirementService.list({ status: ReqStatus.PENDING_REVIEW, page: 1, pageSize: 10 }),
  requirementService.list({
    priority: [Priority.P0, Priority.P1],
    page: 1,
    pageSize: 20,
  }),
]);
```

### 10.3 页面文件

**新建**: `apps/web/src/pages/dashboard/product-mgr.tsx`

**使用的复用组件**:
- `ScheduleProgressCard` — 班次进度（含容量）

**文件清单**:

| 文件 | 操作 | 说明 |
|------|------|------|
| `apps/web/src/pages/dashboard/product-mgr.tsx` | **新建** | 产品经理仪表盘主组件 |

---

## 十一、用户故事 US-7：技术经理仪表盘

> **作为** 技术经理  
> **我想要** 在仪表盘中看到自己系统的需求状态统计和开发进度看板  
> **以便** 按子状态分组管理开发任务，快速推进需求流转

### 11.1 验收标准

- [ ] 技术经理登录后展示技术经理仪表盘
- [ ] 顶部有 `系统切换 <Select>`（用户可能管理多个系统，来自 `user.systemIds`）
- [ ] **第一行**: 系统需求状态统计卡片（当前选中系统）
- [ ] **第二行**: 开发进度看板（4列: 待开发 / 开发中 / SIT测试 / UAT测试）
- [ ] 看板每列有计数 Badge
- [ ] 每张需求卡片显示：reqCode, title, priority, storyPoints
- [ ] 卡片底部有操作按钮：「标记开发中」（调用 `changeSubStatus`）
- [ ] 点击卡片跳转详情页
- [ ] 系统切换时重新加载数据（`useEffect` 监听 `currentSystem`）

### 11.2 数据加载

需求列表一次拉取，前端按 `subStatus` 分列:

```typescript
const [stats, onboardedReqs] = await Promise.all([
  requirementService.getStats({ systemIds: currentSystem }),
  requirementService.list({
    status: ReqStatus.ONBOARDED,
    systemId: currentSystem,
    page: 1,
    pageSize: 200,
  }),
]);

// 前端分列
const columns = {
  [ReqSubStatus.DEV_IN_PROGRESS]: onboardedReqs.list.filter(r => r.subStatus === ReqSubStatus.DEV_IN_PROGRESS),
  [ReqSubStatus.SIT_TESTING]: onboardedReqs.list.filter(r => r.subStatus === ReqSubStatus.SIT_TESTING),
  [ReqSubStatus.UAT_TESTING]: onboardedReqs.list.filter(r => r.subStatus === ReqSubStatus.UAT_TESTING),
  null: onboardedReqs.list.filter(r => !r.subStatus),  // 待开发
};
```

> **不需要拖拽排序**（MVP 不做），只需按列分组展示 + 按钮推进状态

### 11.3 自定义组件

**新建可选组件**: `apps/web/src/components/dashboard/RequirementCard.tsx`

用于看板列的卡片渲染（技术经理 + 测试负责人共用）:

```tsx
interface RequirementCardProps {
  data: RequirementListItem;
  onAction?: () => void;
  actionLabel?: string;
}
```

### 11.4 页面文件

**新建**: `apps/web/src/pages/dashboard/tech-mgr.tsx`

**使用的复用组件**:
- `StatusStatCards` — 状态统计卡片

**文件清单**:

| 文件 | 操作 | 说明 |
|------|------|------|
| `apps/web/src/pages/dashboard/tech-mgr.tsx` | **新建** | 技术经理仪表盘主组件 |
| `apps/web/src/components/dashboard/RequirementCard.tsx` | **新建** | 需求看板卡片组件 |

---

## 十二、前端优化项

> **目标**: 不依赖后端新建 API，纯前端逻辑优化

### 12.1 UI-OPT-01：需求列表默认筛选

**文件**: [apps/web/src/pages/requirements/index.tsx](file:///Users/laiyang/Library/Application%20Support/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/69fab7e1a29c125df6f0f954/release-train/apps/web/src/pages/requirements/index.tsx)

**改动**: 页面首次加载 `useEffect` 中根据用户角色预设筛选条件:

| 角色 | 默认筛选 |
|------|---------|
| BA | `systemId = user.systemIds[0]` + 排除 CANCELLED + RELEASED |
| TECH_MGR | `systemId = user.systemIds[0]` + `status = ONBOARDED` |
| 其他 | 不预设 |

```typescript
useEffect(() => {
  if (!user) return;
  const defaults: Partial<RequirementListQuery> = {};

  if (user.role === Role.BA || user.role === Role.TECH_MGR) {
    defaults.systemId = user.systemIds[0] || undefined;
  }
  if (user.role === Role.BA) {
    defaults.status = Object.values(ReqStatus).filter(
      s => s !== ReqStatus.CANCELLED && s !== ReqStatus.RELEASED
    );
  }
  if (user.role === Role.TECH_MGR) {
    defaults.status = [ReqStatus.ONBOARDED];
  }

  setFilters(prev => ({ ...prev, ...defaults }));
  fetchList(defaults);
}, [user]);
```

### 12.2 UI-OPT-02：快捷筛选按钮

**文件**: 同上 `apps/web/src/pages/requirements/index.tsx`

**改动**: 表格上方增加 `<Segmented>` 快捷筛选按钮组，根据角色显示不同选项:

| 角色 | 快捷筛选选项 |
|------|------------|
| BA | 全部 / 我的活跃 / 待我评审 / 待纳版 |
| TECH_MGR | 全部 / 待开发 / 开发中 / 待提测 |
| 其他 | 全部（或隐藏） |

点击后自动填充 `status` + `subStatus` 筛选条件并触发查询。

### 12.3 UI-OPT-03：录入表单默认值

**文件**: `apps/web/src/components/requirements/RequirementForm.tsx`（确认存在后修改）

**改动**: 创建需求时预设默认值:
- `systemId` → `defaultValue = user.systemIds[0]`（BA/技术经理有且仅有一个系统时）
- `baId` → `defaultValue = { value: user.id, label: user.displayName }`（BA 角色时）

### 12.4 UI-OPT-04：班次快速切换

**文件**: [apps/web/src/layouts/MainLayout.tsx](file:///Users/laiyang/Library/Application%20Support/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/69fab7e1a29c125df6f0f954/release-train/apps/web/src/layouts/MainLayout.tsx)

**改动**: 顶部 Header 右侧（用户头像左侧）增加「最近班次」下拉按钮:

```tsx
// localStorage 存取
const RECENT_SCHEDULES_KEY = 'recent_schedules';  // 最多5个
const FAVORITE_SCHEDULES_KEY = 'favorite_schedules';

// 每次访问班次详情页时写入 localStorage
// MainLayout 顶部渲染下拉 <Select> 组件
```

### 12.5 UI-OPT-05：评审快捷模式

**改动文件**: 需求列表页（跳转逻辑）+ 需求详情页（添加上一个/下一个按钮）

**实现**:

```typescript
// 列表页: navigate 传递相邻ID
navigate(`/requirements/${currentId}`, {
  state: {
    prevId: previousReq?.id,
    nextId: nextReq?.id,
    contextList: 'pendingReview',
  },
});

// 详情页: 读取 state 渲染 prev/next 按钮
// 新增文件或改造: apps/web/src/pages/requirements/detail.tsx
```

---

## 十三、文件改动总清单

### 后端（`apps/server`）

| 文件 | 操作 | 内容 |
|------|------|------|
| `src/modules/requirements/service.ts` | **修改** | +`getRequirementStats()` +`getEmergencyChanges()` +`getMyTodos()` |
| `src/modules/requirements/index.ts` | **修改** | +3 条新路由（health 路由与中间件复用已有 `fastify.authenticate`） |
| `src/modules/trains/services/train.service.ts` | **修改** | +`getSchedulesProgress()` |
| `src/modules/trains/routes/schedule.ts` | **修改** | +1 条 GET progress 路由 |

### 共享层（`packages/shared`）

| 文件 | 操作 | 内容 |
|------|------|------|
| `src/types/dashboard.ts` | **新建** | `RequirementStatsResponse`, `EmergencyChangeItem`, `MyTodosResponse`, `ScheduleProgressItem` |
| `src/index.ts` | **修改** | +`export * from './types/dashboard'` |

### 前端页面（`apps/web/src/pages/`）

| 文件 | 操作 | 内容 |
|------|------|------|
| `dashboard/index.tsx` | **新建** | 仪表盘路由入口（按 role 分发） |
| `dashboard/ba.tsx` | **新建** | BA 仪表盘 |
| `dashboard/project-mgr.tsx` | **新建** | 项目经理仪表盘 |
| `dashboard/train-admin.tsx` | **新建** | 火车管理员仪表盘 |
| `dashboard/test-mgr.tsx` | **新建** | 测试负责人仪表盘 |
| `dashboard/product-mgr.tsx` | **新建** | 产品经理仪表盘 |
| `dashboard/tech-mgr.tsx` | **新建** | 技术经理仪表盘 |
| `calendar/index.tsx` | **新建** | 月历页面主组件 |
| `calendar/CalendarGrid.tsx` | **新建** | 月历格子渲染 |
| `calendar/ScheduleLegend.tsx` | **新建** | 底部班次图例卡片 |

### 前端组件（`apps/web/src/components/dashboard/`）

| 文件 | 操作 | 内容 |
|------|------|------|
| `StatusStatCards.tsx` | **新建** | 状态统计卡片组 |
| `TodoList.tsx` | **新建** | 待办列表（Tab 切换） |
| `ScheduleProgressCard.tsx` | **新建** | 班次进度表格 |
| `RequirementCard.tsx` | **新建** | 看板需求卡片 |

### 前端修改（已有文件）

| 文件 | 操作 | 内容 |
|------|------|------|
| `layouts/MainLayout.tsx` | **修改** | +仪表盘/月历侧边栏菜单 + 面包屑 + 最近班次入口 |
| `pages/requirements/index.tsx` | **修改** | +默认筛选逻辑 + 快捷筛选按钮 |
| `pages/requirements/detail.tsx` | **修改** | +评审上一个/下一个按钮 |
| `components/requirements/RequirementForm.tsx` | **修改** | +录入表单默认值 |
| `services/requirement.ts` | **修改** | +`getStats()` +`getEmergencyChanges()` +`getMyTodos()` |
| `services/train.ts` | **修改** | +`getSchedulesProgress()` |
| `App.tsx` 或路由配置 | **修改** | +`/dashboard` +`/calendar` 路由 |

### 共计

| 类别 | 新建 | 修改 |
|------|------|------|
| 后端 | 0 | 4 |
| 共享层 | 1 | 1 |
| 前端页面 | 12 | 2 |
| 前端组件 | 4 | 0 |
| 前端服务 | 0 | 2 |
| 前端布局/路由 | 0 | 2 |
| **合计** | **17** | **11** |

---

## 十四、任务分解建议

### 第一批（月历 + BA + 项目经理）

| Task | 优先级 | 估算 |
|------|--------|------|
| API-01 `GET /api/stats/requirements` | P0 | 1h |
| API-02 `GET /api/emergency-changes` | P0 | 0.5h |
| API-03 `GET /api/requirements/my-todos` | P1 | 2h |
| `packages/shared/src/types/dashboard.ts` | P0 | 0.5h |
| 前端 Service 层新方法 | P0 | 0.5h |
| US-1 月历视图 | P1 | 3h |
| US-2 BA 仪表盘 | P1 | 2h |
| US-3 项目经理仪表盘 | P1 | 2h |
| 仪表盘路由入口 + MainLayout 改造 | P0 | 1h |
| **第一批小计** | | **~12h** |

### 第二批（火车管理员 + 测试 + 产品 + 技术）

| Task | 优先级 | 估算 |
|------|--------|------|
| API-04 `GET /api/schedules/progress` | P1 | 1.5h |
| US-4 火车管理员仪表盘 | P1 | 2h |
| US-5 测试负责人仪表盘 | P1 | 1.5h |
| US-6 产品经理仪表盘 | P1 | 1.5h |
| US-7 技术经理仪表盘 | P1 | 2h |
| RequirementCard 组件 | P1 | 1h |
| **第二批小计** | | **~9.5h** |

### 前端优化项（可单独并行）

| Task | 估算 |
|------|------|
| UI-OPT-01 默认筛选 | 1h |
| UI-OPT-02 快捷筛选按钮 | 1h |
| UI-OPT-03 录入表单默认值 | 0.5h |
| UI-OPT-04 班次快速切换 | 1.5h |
| UI-OPT-05 评审快捷模式 | 2h |
| **优化项小计** | **~6h** |

### 总计: ~27.5h（约 3.5 个工作日）

---

*版本记录*:
- v1.0 (2026-05-22): 初版实施计划，基于 RT-角色高频功能分析审核_v2.1_20260521.md