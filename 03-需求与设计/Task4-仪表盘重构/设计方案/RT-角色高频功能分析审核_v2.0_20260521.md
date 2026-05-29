# 角色高频功能分析审核与优化建议

**版本号**: v2.0  
**日期**: 2026年5月21日  
**来源**: 对 `RT-角色高频功能分析与优化_v1.1_20260520.md` 的全面审核  
**审核视角**: 前端架构 + 后端API + 数据模型 三合一

---

## 一、审核总览

### 1.1 现有文档质量评估

| 维度 | 评分 | 说明 |
|------|------|------|
| 角色场景覆盖 | ★★★★☆ | 6种角色覆盖全面，SUPER_ADMIN 不需要单独仪表盘 |
| 痛点识别 | ★★★★★ | 每个角色的高频痛点抓得准确 |
| 前端UI设计 | ★★★★☆ | ASCII原型图清晰，交互设计合理 |
| 后端API分析 | ☆☆☆☆☆ | **完全缺失** — 未分析仪表盘需要哪些新API |
| 数据模型分析 | ☆☆☆☆☆ | **完全缺失** — 未分析风险标记等新实体 |
| 落地可行性 | ★★☆☆☆ | 很多功能缺少后端支撑，实施路径不够具体 |

### 1.2 核心发现

> **关键结论**: 现有分析文档只关注了「前端用户看到什么」，但没有回答「数据从哪里来」。6个仪表盘中，仅约30%可以用现有API实现，其余70%需要新增后端API甚至数据模型。

---

## 二、现有API能力矩阵 vs 各仪表盘需求

### 2.1 现有可用API清单

| API | 提供数据 | 性能评估 |
|-----|---------|---------|
| `GET /api/requirements` | 分页需求列表（支持 systemId/status/keyword 筛选） | ✅ 有索引，查询高效 |
| `GET /api/requirements/search` | 关键词搜需求编号/标题，最多20条 | ✅ 轻量，无性能问题 |
| `GET /api/requirements/:id` | 需求详情含依赖+审计日志 | ⚠️ N+1查询：详情页每次查依赖+日志，可优化 |
| `GET /api/trains` | 火车列表 | ✅ 简单查询 |
| `GET /api/trains/:id/schedules` | 班次详情含容量快照 | ✅ 已有索引 |
| `GET /api/auth/me` | 当前用户信息含 systemIds | ✅ 简单关联查询 |
| `POST /api/trains/:id/onboard` | 纳版操作 | ✅ 已有预检+纳版 |
| `POST /api/requirements/:id/change-sub-status` | 单个子状态变更 | ✅ 事务保护 |

### 2.2 缺失API清单（仪表盘必须）

| 缺失API | 哪些仪表盘需要 | 优先级 | 复杂度 |
|---------|-------------|--------|--------|
| `GET /api/stats/requirements` — 按状态聚合统计 | BA/PM/项目经理/火车管理员全部需要 | **P0** | 低 |
| `GET /api/emergency-changes` — 紧急变更列表（含需求信息） | 项目经理/测试负责人 | **P0** | 中 |
| `GET /api/schedules/progress` — 班次进度聚合 | 项目经理/火车管理员/产品经理 | **P1** | 中 |
| `GET /api/requirements/my-todos` — 当前用户待办聚合 | BA/产品经理/项目经理/技术经理/测试负责人 | **P1** | 中 |
| `POST /api/requirements/batch-review` — 批量评审 | 产品经理/项目经理 | **P2** | 高 |
| `POST /api/requirements/batch-change-sub-status` — 批量子状态变更 | 项目经理 | **P2** | 高 |
| `GET /api/reports/weekly-progress` — 周进度报告 | 项目经理 | **P3** | 高 |


---

## 三、分角色仪表盘可行性深度评估

### 3.1 BA仪表盘（OP-BA-01）— 当前可行性 40%

```
┌──────────────────────────────────────────────────────────────────┐
│ 仪表盘元素                    数据来源                 现状       │
├──────────────────────────────────────────────────────────────────┤
│ 📊 我的系统需求概览（按状态计数） 需要 stats API           ❌ 缺失   │
│ 📋 评审被拒绝列表               listRequirement(status=REJECTED) ✅ 可用  │
│ 📋 变更通过待发起评审            无独立标识字段              ⚠️ 需推导 │
│ 📈 当前班次我的系统需求          listRequirement(systemId+scheduleId) ✅ 可用 │
│ ⚠️ 纳版截止提醒                  TrainSchedule.boardingDate  ✅ 可查  │
└──────────────────────────────────────────────────────────────────┘
```

**"我的系统"判断逻辑**：`SafeUser.systemIds` 从 `SystemMember` 表获取，一个用户可以属于多个系统。当用户属于多个系统时，"我的系统需求概览"应该是所有系统的聚合，而不是只显示一个系统。

### 3.2 产品经理仪表盘（OP-PROD-01）— 当前可行性 35%

```
┌──────────────────────────────────────────────────────────────────┐
│ 仪表盘元素                    数据来源                 现状       │
├──────────────────────────────────────────────────────────────────┤
│ 📌 班次汇总（状态/需求数/容量）   需要 schedules/progress API      ❌ 缺失   │
│ 📋 待评审需求                   listRequirement(status=PENDING_REVIEW) ✅ 可用  │
│ 🎯 P0/P1需求全览                listRequirement(priority in [P0,P1]) ✅ 可用  │
└──────────────────────────────────────────────────────────────────┘
```

### 3.3 项目经理仪表盘（OP-PM-01）— 当前可行性 25%

```
┌──────────────────────────────────────────────────────────────────┐
│ 仪表盘元素                    数据来源                 现状       │
├──────────────────────────────────────────────────────────────────┤
│ 📊 整体项目健康度（总体进度%）    需要全局聚合API              ❌ 缺失   │
│ 🚆 所有火车班次进度看板          需要 schedules/progress API      ❌ 缺失   │
│ 🚨 紧急变更待审核                EmergencyChange表有，无列表API   ⚠️ 数据有   │
│ ⚠️ 风险与阻塞点汇总             Risk/Blockage模型不存在          ❌ 缺失   │
│ 📋 周/月报告快捷生成             需要报告生成引擎                ❌ 缺失   │
└──────────────────────────────────────────────────────────────────┘
```

**风险最大项**：OP-PM-04「风险与阻塞点标记」— 需要新建数据模型，是整个方案中工作量最大、影响最深远的改动。

### 3.4 火车管理员仪表盘（OP-TM-01）— 当前可行性 55%

```
┌──────────────────────────────────────────────────────────────────┐
│ 仪表盘元素                    数据来源                 现状       │
├──────────────────────────────────────────────────────────────────┤
│ 📈 所有火车班次概览              GET /api/trains + schedules      ✅ 可用   │
│ 🔴 待纳版                       listRequirement(status=READY)    ✅ 可用   │
│ 🟡 待确认投产                    listRequirement(subStatus in [SIT,UAT]) ✅ 可用  │
│ ⏱️ 关键日期                      TrainSchedule 日期字段           ✅ 可用   │
└──────────────────────────────────────────────────────────────────┘
```

**可行性最高**，因为火车管理员的很多数据已经存在于现有 API 中。

### 3.5 技术经理仪表盘（OP-TECH-01）— 当前可行性 45%

```
┌──────────────────────────────────────────────────────────────────┐
│ 仪表盘元素                    数据来源                 现状       │
├──────────────────────────────────────────────────────────────────┤
│ 📋 待开发（已纳版待开发）          listRequirement(status=ONBOARDED, subStatus=null) ✅ 可用 │
│ 🟡 待提测                       listRequirement(subStatus=DEV_IN_PROGRESS) ✅ 可用     │
│ 🏗️ 开发进度看板                  需要按subStatus分组查询（现有API支持） ✅ 可用      │
│ 📊 本周开发概览                  需要 stats API                    ❌ 缺失   │
└──────────────────────────────────────────────────────────────────┘
```

### 3.6 测试负责人仪表盘（OP-TEST-01）— 当前可行性 45%

```
┌──────────────────────────────────────────────────────────────────┐
│ 仪表盘元素                    数据来源                 现状       │
├──────────────────────────────────────────────────────────────────┤
│ 🔴 待测试（SIT/UAT）             listRequirement(subStatus in [SIT,UAT]) ✅ 可用  │
│ 🚨 紧急变更待测试                EmergencyChange 表有，无列表API     ⚠️ 数据有 │
│ 🧪 测试进度看板                  需要按subStatus分组查询              ✅ 可用  │
│ ⚠️ 封板后紧急变更                 EmergencyChange + 需求状态过滤      ⚠️ 可查  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 四、后端API需要新增的接口详细设计

### 4.1 需求聚合统计 API（P0 — 最核心）

**接口**: `GET /api/stats/requirements`

```typescript
// 请求参数
interface RequirementStatsQuery {
  systemIds?: string[];   // 按系统筛选（BA/技术经理按自己系统）
  scheduleId?: string;    // 按班次筛选
  trainId?: string;       // 按火车筛选
}

// 响应
interface RequirementStatsResponse {
  byStatus: Record<string, number>;       // { DRAFT: 3, PENDING_REVIEW: 2, READY: 5, ... }
  bySubStatus?: Record<string, number>;   // { DEV_IN_PROGRESS: 2, SIT_TESTING: 1, ... }
  byPriority: Record<string, number>;     // { P0: 1, P1: 3, P2: 8, P3: 2 }
  total: number;
  activeCount: number;                    // 排除 CANCELLED 和 RELEASED
}
```

**实现方式**: Prisma `groupBy` + `count`，利用 `status` 和 `subStatus` 的已有索引。

### 4.2 紧急变更列表 API（P0）

**接口**: `GET /api/emergency-changes`

```typescript
// 请求参数
interface EmergencyChangeQuery {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';  // 审批状态
  approverId?: string;   // 按审批人筛选（默认当前用户）
  page?: number;
  pageSize?: number;
}

// 响应 — 分页列表，每项包含关联的需求摘要
interface EmergencyChangeItem {
  id: string;
  requirementId: string;
  reqCode: string;        // 需求编号
  title: string;          // 需求标题
  system: { id: string; name: string };
  urgency: 'P0' | 'P1';
  reason: string;
  status: ApprovalStatus;
  approvalStep: number;   // 1=测试经理, 2=项目经理
  createdAt: string;
}
```

### 4.3 用户待办聚合 API（P1）

**接口**: `GET /api/requirements/my-todos`

```typescript
// 根据当前登录用户的角色和 systemIds，返回聚合后的待办分类
interface MyTodosResponse {
  pendingReview?: RequirementListItem[];        // 待我评审（项目经理/产品经理）
  rejectedNeedsReEdit?: RequirementListItem[];  // 评审被拒绝需重编（BA）
  changeApprovedNeedsResubmit?: RequirementListItem[]; // 变更通过待重发评审（BA）
  pendingDev?: RequirementListItem[];           // 待开发（技术经理）
  pendingTest?: RequirementListItem[];          // 待测试（测试负责人）
  pendingOnboard?: RequirementListItem[];       // 待纳版（火车管理员）
  pendingRelease?: RequirementListItem[];       // 待投产（火车管理员）
  emergencyPendingApproval?: EmergencyChangeItem[]; // 紧急变更待审批
}
```

**实现方式**: 根据 `request.user.role` 和 `request.user.systemIds`（可从 SystemMember 查询），返回该用户相关的待办分类。每个分类调用已有的查询逻辑，但在一个请求中聚合返回。

### 4.4 班次进度聚合 API（P1）

**接口**: `GET /api/schedules/progress`

```typescript
interface ScheduleProgressItem {
  scheduleId: string;
  scheduleName: string;
  trainName: string;
  status: TrainScheduleStatus;
  totalRequirements: number;       // 总需求数
  completedCount: number;          // 已完成（封板+已投产）
  inProgressCount: number;         // 进行中（开发中+SIT+UAT）
  capacityUsed: number;            // 已用容量
  capacityTotal: number;           // 总容量
  progressPercent: number;         // 进度百分比
  boardDate?: string;
  lockdownDate?: string;
  releaseDate?: string;
}

interface ScheduleProgressResponse {
  schedules: ScheduleProgressItem[];
}
```

---

## 五、数据模型层分析与缺失

### 5.1 现有模型对仪表盘的支持度

| 模型 | 仪表盘使用场景 | 覆盖度 |
|------|--------------|--------|
| Requirement | 所有仪表盘的核心数据源 | ✅ 80% — 缺少风险标记字段 |
| TrainSchedule | 班次进度、关键日期 | ✅ 90% |
| TrainSystem / TrainSystemSnapshot | 容量管理 | ✅ 90% |
| EmergencyChange | 紧急变更审批 | ✅ 70% — 缺少便捷列表查询 |
| SystemMember | 用户系统归属判断 | ✅ 90% |
| StatusLog | 审计日志（详情页用） | ✅ N/A |

### 5.2 缺失：报告模板/导出功能

OP-PM-05「快速报告生成」需要：
- 报告模板引擎（服务端渲染 Markdown/HTML）
- Excel/PDF 导出库（当前项目未安装 `exceljs` 或 `jspdf`）
- 工作量评估：至少 3-4 个人天

**建议**: 报告功能可采用「客户端生成 + 服务端提供数据」的方式，减少后端复杂度。使用前端库（如 `xlsx`）在浏览器端生成导出文件。

---

## 六、前端架构匹配度分析

### 6.1 当前路由与仪表盘方案的冲突

现有 `App.tsx` 中只有一个 `/dashboard` 路由指向 `DashboardPage`（占位页面）。分析文档提议为每种角色创建独立页面：

```
现行: /dashboard → DashboardPage (占位)
提议: /dashboard → 根据角色路由到 ba.tsx / product-mgr.tsx / project-mgr.tsx / ...
```

**两种实现方案对比**:

| 方案 | 路由方式 | 优点 | 缺点 |
|------|---------|------|------|
| A | 单页面 + 角色条件渲染 | 路由不变，改动小 | 单组件逻辑复杂，6种角色分支多 |
| B | 6个独立路由页面 | 各角色解耦，易维护 | 路由数量增加，但更清晰 |

**建议**: 方案B，使用统一入口 `/dashboard`，根据 `user.role` 路由到不同组件，但每个角色的仪表盘是独立文件：

```typescript
// App.tsx 或 Dashboard 入口组件
function DashboardRouter() {
  const { user } = useAuthStore();
  switch (user?.role) {
    case Role.BA: return <BADashboard />;
    case Role.PM: return <ProductMgrDashboard />;
    case Role.PROJECT_MGR: return <ProjectMgrDashboard />;
    case Role.TRAIN_ADMIN: return <TrainAdminDashboard />;
    case Role.TECH_MGR: return <TechMgrDashboard />;
    case Role.TEST_MGR: return <TestMgrDashboard />;
    case Role.SUPER_ADMIN: return <ProjectMgrDashboard />; // 超管用项目经理视图
    default: return <Navigate to="/requirements" />;
  }
}
```

### 6.2 组件复用机会

6个仪表盘中有大量可复用的子组件：

| 复用组件 | 使用角色 | 描述 |
|---------|---------|------|
| `StatusStatCards` | BA/PM/项目经理 | 按状态分组的需求统计卡片 |
| `TodoList` | 全部 | 待办列表（不同角色过滤不同） |
| `ScheduleProgressBar` | PM/火车管理员 | 班次进度条 |
| `SubStatusKanban` | 技术经理/测试负责人 | 子状态看板 |
| `EmergencyChangeList` | PM/测试负责人 | 紧急变更列表 |
| `KeyDateTimeline` | 火车管理员/PM | 关键日期时间线 |

---

## 七、修正后的实施路线图

基于以上分析，原文档的 Sprint 计划需要调整。以下是结合实际代码基础和API现状的修正方案：

### Sprint 0 — 后端基础（1周）

**目标**: 补齐仪表盘所需的核心 API，让前端有数据可展示

| ID | 任务 | 涉及文件 | 说明 |
|----|------|---------|------|
| API-01 | `GET /api/stats/requirements` | `apps/server/src/modules/requirements/service.ts` | 聚合统计，使用 Prisma groupBy |
| API-02 | `GET /api/emergency-changes` | `apps/server/src/modules/requirements/` | 新增紧急变更列表路由 |
| API-03 | `GET /api/requirements/my-todos` | `apps/server/src/modules/requirements/` | 按角色聚合待办 |
| API-04 | `GET /api/schedules/progress` | `apps/server/src/modules/trains/` | 班次进度聚合 |

### Sprint 1 — 低风险前端优化（1周）

**目标**: 快速见效的改动，不依赖新API

| ID | 任务 | 涉及文件 | 说明 |
|----|------|---------|------|
| UI-01 | OP-BA-02 需求列表默认筛选 | `apps/web/src/pages/requirements/index.tsx` | BA登录默认筛选自己系统+活跃状态 |
| UI-02 | OP-BA-03 录入表单默认值 | `apps/web/src/components/requirements/RequirementForm.tsx` | 系统默认值、BA默认值 |
| UI-03 | OP-BA-02 技术经理默认筛选 | `apps/web/src/pages/requirements/index.tsx` | 技术经理默认自己系统+已纳版 |
| UI-04 | 顶部快捷筛选按钮 | `apps/web/src/pages/requirements/index.tsx` | "我的活跃需求"/"我的待开发"等 |

### Sprint 2 — 核心仪表盘（2周）

**目标**: 基于 Sprint 0 的新 API 实现核心仪表盘

| ID | 任务 | 涉及文件 | 说明 |
|----|------|---------|------|
| DB-01 | OP-TM-01 火车管理员仪表盘 | `apps/web/src/pages/dashboard/train-admin.tsx` | 依赖: `stats` + `schedules/progress` |
| DB-02 | OP-BA-01 BA仪表盘 | `apps/web/src/pages/dashboard/ba.tsx` | 依赖: `stats` + `my-todos` |
| DB-03 | 仪表盘路由入口 | `apps/web/src/App.tsx` + `pages/dashboard/index.tsx` | 按角色分发 |
| DB-04 | 复用组件：StatusStatCards | `apps/web/src/components/dashboard/` | 统计卡片 |
| DB-05 | 复用组件：TodoList | `apps/web/src/components/dashboard/` | 待办列表 |

### Sprint 3 — 管理仪表盘（2周）

| ID | 任务 | 涉及文件 | 说明 |
|----|------|---------|------|
| DB-06 | OP-PM-01 项目经理仪表盘 | `apps/web/src/pages/dashboard/project-mgr.tsx` | 依赖: `schedules/progress` + `emergency-changes` |
| DB-07 | OP-PROD-01 产品经理仪表盘 | `apps/web/src/pages/dashboard/product-mgr.tsx` | 依赖: `schedules/progress` |
| DB-08 | OP-TECH-01 技术经理仪表盘 | `apps/web/src/pages/dashboard/tech-mgr.tsx` | 依赖: `stats` |
| DB-09 | OP-TEST-01 测试负责人仪表盘 | `apps/web/src/pages/dashboard/test-mgr.tsx` | 依赖: `emergency-changes` |

### Sprint 4 — 高级功能（评估后决定是否实施）

| ID | 任务 | 说明 | 风险 |
|----|------|------|------|
| ADV-01 | OP-PM-02 批量审核 | 批量评审/批量子状态变更 | 需新建批量接口，事务复杂 |

| ADV-03 | OP-TM-02 纳版优化（智能推荐） | 需分析系统-班次匹配算法 | 复杂度高 |
| ADV-04 | OP-PM-05 快速报告生成 | 前端生成方案 | 需引入 xlsx/jspdf |

---

## 八、关键风险与建议

### 8.1 高风险项

| 风险 | 影响 | 建议 |
|------|------|------|
| "我的系统"多系统时聚合逻辑不明确 | BA/技术经理仪表盘的"我的系统需求概览"需要决定是按第一个系统还是所有系统聚合 | **建议**: 按所有 `systemIds` 聚合，列表默认显示第一个系统的详情，提供系统切换 |
| 紧急变更列表无便捷API | 项目经理/测试负责人仪表盘缺少关键数据 | **Sprint 0 优先实现** |


### 8.2 可降级处理的功能

| 原建议 | 降级方案 | 说明 |
|--------|---------|------|
| 手动标记风险 | 使用需求依赖链的风险等级自动展示 | `buildRequirementDetail` 中已经有依赖风险等级计算 |
| 一键生成周报 | 改为"复制当前仪表盘快照到剪贴板" | 前端 Markdown 模板 + Clipboard API |
| 智能推荐班次 | 改为"显示最近纳版目标班次" | 用历史数据替代算法 |
| 批量评审 | 改为"评审上一个/下一个快捷按钮" | 减少操作步数但不减少请求次数 |

### 8.3 性能注意事项

当前 `listRequirements` 接口使用 `skip/take` 偏移分页（正常），但仪表盘的聚合统计应该使用 `Prisma groupBy` 而非多次 `listRequirements` 调用来避免 N+1：

```typescript
// ✅ 推荐的聚合方式（Sprint 0 实现）
const stats = await prisma.requirement.groupBy({
  by: ['status'],
  where: { systemId: { in: userSystemIds } },
  _count: { id: true },
});

// ❌ 不推荐的方式（当前没有 stats API 时可能被迫使用）
// 多次调用 listRequirements 每个 status 一次
```

---

## 九、改动文件清单（修正版）

### 后端新增/修改

| 文件 | 改动 | 说明 |
|------|------|------|
| `apps/server/src/modules/requirements/service.ts` | 新增 | `getRequirementStats()` 聚合统计函数 |
| `apps/server/src/modules/requirements/service.ts` | 新增 | `getEmergencyChanges()` 紧急变更列表 |
| `apps/server/src/modules/requirements/service.ts` | 新增 | `getMyTodos()` 用户待办聚合 |
| `apps/server/src/modules/requirements/index.ts` | 新增路由 | `GET /api/stats/requirements` |
| `apps/server/src/modules/requirements/index.ts` | 新增路由 | `GET /api/emergency-changes` |
| `apps/server/src/modules/requirements/index.ts` | 新增路由 | `GET /api/requirements/my-todos` |
| `apps/server/src/modules/trains/service.ts` | 新增 | `getScheduleProgress()` 班次进度 |
| `apps/server/src/modules/trains/index.ts` | 新增路由 | `GET /api/schedules/progress` |
| `packages/shared/src/types/` | 新增类型 | `RequirementStatsResponse` 等新响应类型 |

### 前端新增

| 文件 | 改动 | 说明 |
|------|------|------|
| `apps/web/src/pages/dashboard/index.tsx` | 修改 | 按角色路由分发 |
| `apps/web/src/pages/dashboard/ba.tsx` | 新增 | BA仪表盘 |
| `apps/web/src/pages/dashboard/train-admin.tsx` | 新增 | 火车管理员仪表盘 |
| `apps/web/src/pages/dashboard/project-mgr.tsx` | 新增 | 项目经理仪表盘 |
| `apps/web/src/pages/dashboard/product-mgr.tsx` | 新增 | 产品经理仪表盘 |
| `apps/web/src/pages/dashboard/tech-mgr.tsx` | 新增 | 技术经理仪表盘 |
| `apps/web/src/pages/dashboard/test-mgr.tsx` | 新增 | 测试负责人仪表盘 |
| `apps/web/src/components/dashboard/StatusStatCards.tsx` | 新增 | 统计卡片复用组件 |
| `apps/web/src/components/dashboard/TodoList.tsx` | 新增 | 待办列表复用组件 |
| `apps/web/src/pages/requirements/index.tsx` | 修改 | 默认筛选逻辑 |
| `apps/web/src/components/requirements/RequirementForm.tsx` | 修改 | 默认值优化 |
| `apps/web/src/services/requirement.ts` | 新增方法 | `getStats()`, `getMyTodos()` |
| `apps/web/src/services/train.ts` | 新增方法 | `getSchedulesProgress()` |

---

## 十、审核总结

### 10.1 原文档值得保留的内容

- ✅ 6种角色的高频场景和痛点分析 — 准确且有价值
- ✅ ASCII原型图 — 可视化设计清晰
- ✅ 优先级排序逻辑 — 基本合理
- ✅ 分Sprint实施思路 — 方向正确

### 10.2 必须补充的内容

- ❌ 后端API需求分析（本文档第四、五章）
- ❌ 数据模型缺失评估（本文档第五章）
- ❌ 复用组件设计（本文档6.2节）
- ❌ 可降级方案（本文档8.2节）
- ❌ 「`SafeUser.systemIds` 多系统」处理策略

### 10.3 最终建议

**立即行动**: Sprint 0 后端基础 API + Sprint 1 前端默认筛选优化（2周内可交付，快速见效）

**评估后行动**: Sprint 2-3 仪表盘（依赖 Sprint 0 的输出）

**暂缓行动**: Sprint 4 高级功能（风险标记、批量审核、报告生成、纳版智能推荐）需要更多设计和评估

---

*版本记录*:
- v2.0 (2026-05-21): 基于代码库全面审核，补充后端API分析、数据模型分析、可行性评估
