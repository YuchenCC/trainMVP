# 角色高频功能分析审核与优化建议（修订版）

**版本号**: v2.1  
**日期**: 2026年5月21日  
**修订说明**: v2.0 → v2.1 — 移除所有需要新建数据模型的功能，仪表盘只展示现有数据可支撑的内容  

---

## 一、审核结论（修订）

### 1.1 核心约束

> **原则**: 仪表盘不做凭空造牌。所有展示的数据必须来自现有数据库表，不为此新建任何数据模型（表/枚举）。

### 1.2 明确排除清单

| 排除项 | 原因 | 来源 |
|--------|------|------|
| 风险/阻塞点手动标记 | 需要新建 `RequirementRisk` 表 | OP-PM-04 |
| 周/月报告一键生成 | 需要报告引擎 + 导出库 | OP-PM-05 |
| 批量评审/批量子状态变更 | 需要新建批量接口，改变业务流程 | OP-PM-02 |
| 纳版智能推荐班次 | 需要匹配算法，缺乏依据 | OP-TM-02 |
| 仪表盘凭空造牌 | 无数据支撑的指标不展示 | 全局原则 |

### 1.3 保留范围

| 保留项 | 数据来源 | 说明 |
|--------|---------|------|
| 需求聚合统计 | `Requirement` 表 groupBy | 按状态/优先级/系统聚合计数 |
| 紧急变更待办列表 | `EmergencyChange` 表（已有） | 关联需求摘要 |
| 个人待办聚合 | `Requirement` + `StatusLog` + `EmergencyChange` | 按角色+状态推导 |
| 班次进度 | `TrainSchedule` + `Requirement` | 需求数/容量/进度% |
| 需求列表默认筛选 | 前端逻辑 | 根据角色预设筛选条件 |
| 录入表单默认值 | 前端逻辑 | 系统/BA 默认值 |
| 依赖风险等级提示 | `buildRequirementDetail` 已有 | 复用现有依赖风险计算 |

---

## 二、分角色仪表盘 — 「有数据才展示」版

### 2.1 BA仪表盘 — 可行性 75%

**可以展示的**（有数据支撑）：

| 模块 | 数据来源 | 实现方式 |
|------|---------|---------|
| 📊 我的系统需求概览 | `GET /api/stats/requirements?systemIds=...` | Prisma groupBy 按 status 聚合 |
| 📋 评审被拒绝列表 | `GET /api/requirements?status=REJECTED&systemId=...` | 现有 listRequirements |
| 📋 变更通过待重发评审 | `GET /api/requirements?status=DRAFT&systemId=...` + 前端过滤「有变更记录」 | 需要查 StatusLog 判断 |
| 📈 当前班次需求 | `GET /api/requirements?scheduleId=...&systemId=...` | 现有 listRequirements |
| ⚠️ 纳版截止提醒 | `TrainSchedule.boardingDate` | 日期对比即可 |

**不能展示的**（无数据支撑，排除）：

| 模块 | 原因 |
|------|------|
| 纳版邮件/通知 | 无消息通知系统 |

### 2.2 火车管理员仪表盘 — 可行性 80%

**可以展示的**：

| 模块 | 数据来源 | 实现方式 |
|------|---------|---------|
| 📈 所有火车班次概览 | `GET /api/trains` + `GET /api/schedules/progress` | 聚合统计 |
| 🔴 待纳版需求 | `GET /api/requirements?status=READY` | 现有接口 |
| 🟡 待确认投产 | `GET /api/requirements?status=ONBOARDED&subStatus=SIT_TESTING` + UAT_TESTING | 现有接口，两次查询或合并 |
| ⏱️ 关键日期 | `TrainSchedule.lockdownDate / releaseDate` | 已有字段 |

**不能展示的**：

| 模块 | 原因 |
|------|------|
| 状态变更影响预览 | 需要额外的影响分析逻辑 |
| 封板前待纳版预警 | 可以用现有数据做简单计数，但「预警」机制无支撑 |

### 2.3 项目经理仪表盘 — 可行性 55%

**可以展示的**：

| 模块 | 数据来源 | 实现方式 |
|------|---------|---------|
| 📊 需求状态分布 | `GET /api/stats/requirements?trainId=...` | 按火车聚合 Prisma groupBy |
| 🚆 所有班次进度 | `GET /api/schedules/progress` | 聚合统计 |
| 🚨 紧急变更待审核 | `GET /api/emergency-changes?status=PENDING` | 查询现有 EmergencyChange 表 |
| ⚠️ 依赖风险提示 | 依赖链风险等级（`buildRequirementDetail` 中已有） | 直接在需求列表展示依赖风险列 |

**不能展示的**（排除）：

| 模块 | 原因 |
|------|------|
| 风险与阻塞点汇总 | 无 Risk 模型 |
| 项目整体健康度评分 | 无定义标准，凭空造牌 |
| 周/月报告快捷生成 | 无报告引擎 |
| 紧急变更批量审核 | 无批量接口 |

### 2.4 产品经理仪表盘 — 可行性 60%

**可以展示的**：

| 模块 | 数据来源 | 实现方式 |
|------|---------|---------|
| 📌 班次汇总（含容量） | `GET /api/schedules/progress` | 聚合统计 + TrainSystemSnapshot 跨系统 SUM |
| 📋 待评审需求 | `GET /api/requirements?status=PENDING_REVIEW` | 现有接口 |
| 🎯 P0/P1全览 | `GET /api/requirements?priority=P0&priority=P1` | 现有接口，两次查询 |

**不能展示的**：

| 模块 | 原因 |
|------|------|
| — | 现有数据基本覆盖产品经理需求 |

### 2.5 技术经理仪表盘 — 可行性 75%

**可以展示的**：

| 模块 | 数据来源 | 实现方式 |
|------|---------|---------|
| 📋 待开发 | `GET /api/requirements?status=ONBOARDED&systemId=...` (subStatus=null) | 现有接口 |
| 🟡 待提测 | `GET /api/requirements?status=ONBOARDED&subStatus=DEV_IN_PROGRESS&systemId=...` | 现有接口 |
| 🏗️ 开发进度看板 | 按 subStatus 分组（4列：开发中/SIT/UAT/封板） | 前端对同一查询结果分组渲染 |
| 📊 概览统计 | `GET /api/stats/requirements?systemIds=...` | 聚合统计 |

### 2.6 测试负责人仪表盘 — 可行性 70%

**可以展示的**：

| 模块 | 数据来源 | 实现方式 |
|------|---------|---------|
| 🔴 待测试 | `GET /api/requirements?status=ONBOARDED&subStatus=SIT_TESTING` + UAT_TESTING | 现有接口 |
| 🚨 紧急变更待测试 | `GET /api/emergency-changes?status=PENDING&approverId=...` | 查询现有 EmergencyChange 表 |
| 🧪 测试进度看板 | 按 subStatus 分组 | 前端对查询结果分组 |

---

## 三、需要新增的后端 API（纯查询，不新建模型）

### 3.1 API 清单

| API | 优先级 | 查询的表 | 实现方式 |
|-----|--------|---------|---------|
| `GET /api/stats/requirements` | **P0** | `Requirement` | `prisma.groupBy({ by: ['status'], _count: true })` |
| `GET /api/emergency-changes` | **P0** | `EmergencyChange` + `Requirement` | `prisma.emergencyChange.findMany({ include: { requirement: ... } })` |
| `GET /api/requirements/my-todos` | **P1** | `Requirement` + `EmergencyChange` | 根据 `request.user.role` 构造不同查询条件 |
| `GET /api/schedules/progress` | **P1** | `TrainSchedule` + `Requirement` | 关联查询 + 聚合计数 |

所有新增 API 都只读现有表，不创建新模型、不修改 Schema、无数据迁移。

### 3.2 需求聚合统计 API 详细设计

```
GET /api/stats/requirements?systemIds=sys1,sys2&scheduleId=sch1

响应:
{
  byStatus: { DRAFT: 3, PENDING_REVIEW: 2, READY: 5, ONBOARDED: 8, ... },
  bySubStatus: { DEV_IN_PROGRESS: 2, SIT_TESTING: 1, ... },    // 仅已纳版
  byPriority: { P0: 1, P1: 3, P2: 8, P3: 2 },
  total: 25,
  activeCount: 18       // 排除 CANCELLED + RELEASED
}
```

**实现**: Prisma `groupBy`，利用 `status` + `subStatus` 已有索引。不需要 JOIN 或子查询。

### 3.3 紧急变更列表 API 详细设计

```
GET /api/emergency-changes?status=PENDING&approverId=xxx

响应: 分页列表，每项含:
{
  id, requirementId, reqCode, title,
  system: { id, name },
  urgency, reason, status, approvalStep, createdAt
}
```

**实现**: 查询 `EmergencyChange` 表（已存在），`include: { requirement: { select: { reqCode, title, system } } }`。

### 3.4 用户待办聚合 API 详细设计

```
GET /api/requirements/my-todos

根据 request.user.role 返回不同分类:

角色=BA → pendingReviewRejected, changeApprovedNeedsResubmit
角色=PM → pendingReviewList
角色=PROJECT_MGR → pendingReviewList, emergencyPendingApproval
角色=TECH_MGR → pendingDev, pendingToSubmitTest
角色=TEST_MGR → pendingTest, emergencyPendingApproval
角色=TRAIN_ADMIN → pendingOnboard, pendingRelease
```

**实现**: 一个接口内按角色分支，每个分支调用现有 `listRequirements` 逻辑的组合。

### 3.5 班次进度聚合 API 详细设计

```
GET /api/schedules/progress?trainId=xxx

响应:
[
  {
    scheduleId, scheduleName, trainName, status,
    totalRequirements: 28,        // 该班次总需求数
    completedCount: 12,           // subStatus in [FROZEN] + status=RELEASED
    inProgressCount: 16,          // 其他
    capacityUsed: 85,             // TrainSystemSnapshot.usedPoints 跨系统 SUM
    capacityTotal: 100,           // TrainSystemSnapshot.capacityPoints 跨系统 SUM
    progressPercent: 43,          // completedCount / totalRequirements * 100
    boardingDate, lockdownDate, releaseDate
  }
]
```

**实现**: 查询 `TrainSchedule` 列表 + 每个班次的 `Requirement.count` 聚合 + `TrainSystemSnapshot` 容量跨系统 SUM。

---

## 四、UI 原型设计

> 技术栈: React + Ant Design 5 + @ant-design/icons。以下原型用 ASCII 表现布局结构，标注对应的 Ant Design 组件和数据字段。

### 4.1 复用 UI 组件设计

先定义 3 个被所有仪表盘共享的组件，避免重复设计：

#### 4.1.1 StatusStatCards — 状态统计卡片组

```
┌──────────────────────────────────────────────────────────────────────┐
│  <Row gutter={16}>                                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │ <Card>    │ │ <Card>    │ │ <Card>    │ │ <Card>    │ │ <Card>    │ │
│  │ <Statistic │ │ <Statistic│ │ <Statistic│ │ <Statistic│ │ <Statistic│ │
│  │  title=   │ │  title=   │ │  title=   │ │  title=   │ │  title=   │ │
│  │  "草稿"   │ │  "待评审" │ │  "已就绪" │ │  "已纳版" │ │  "已投产" │ │
│  │  value=3  │ │  value=2  │ │  value=5  │ │  value=8  │ │  value=12 │ │
│  │  />       │ │  />       │ │  />       │ │  />       │ │  />       │ │
│  │ ──────────│ │ ──────────│ │ ──────────│ │ ──────────│ │ ──────────│ │
│  │ 点击跳转  │ │ 点击跳转  │ │ 点击跳转  │ │ 点击跳转  │ │ 点击跳转  │ │
│  │ 需求列表  │ │ 需求列表  │ │ 需求列表  │ │ 需求列表  │ │ 需求列表  │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
│  </Row>                                                              │
└──────────────────────────────────────────────────────────────────────┘
```

**Props**:
```typescript
interface StatusStatCardsProps {
  data: RequirementStatsResponse;     // 来自 GET /api/stats/requirements
  onCardClick?: (status: string) => void;  // 点击跳转需求列表 ?status=xxx
}
```

**数据映射**: `data.byStatus` → 每张 Card 的 `value`。空状态显示 `Skeleton` 占位。

#### 4.1.2 TodoList — 待办列表

```
┌──────────────────────────────────────────────────────────────────────┐
│  <Card title="📋 我的待办" extra={<Badge count={5} />}>              │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │ <Tabs>                                                            ││
│  │  Tab1: 🔴 评审被拒绝 (2)     Tab2: 🟡 变更通过待重发 (1)         ││
│  │ ─────────────────────────────────────────────────────────────────││
│  │ <Table                                                           ││
│  │  columns={[reqCode, title, system.name, reason, updatedAt, action]}││
│  │  dataSource={todoItems}                                          ││
│  │  pagination={{ pageSize: 5 }}                                    ││
│  │  rowKey="id"                                                     ││
│  │ />                                                               ││
│  └──────────────────────────────────────────────────────────────────┘│
│  </Card>                                                              │
└──────────────────────────────────────────────────────────────────────┘
```

**Props**:
```typescript
interface TodoListProps {
  tabs: TodoTab[];           // [{ key, label, count, items: RequirementListItem[] }]
  loading?: boolean;
  emptyText?: string;
}
```

**数据来源**: `GET /api/requirements/my-todos`。按角色返回不同分类。

#### 4.1.3 ScheduleProgressCard — 班次进度卡片

```
┌──────────────────────────────────────────────────────────────────┐
│  <Card title="🚆 班次进度">                                      │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ <Table                                                        ││
│  │  columns={[                                              ││
│  │    scheduleName, trainName, status(Tag),              ││
│  │    progress(Progress), capacity(Badge), keyDates      ││
│  │  ]}                                                   ││
│  │  dataSource={scheduleProgressList}                     ││
│  │ />                                                       ││
│  └──────────────────────────────────────────────────────────────┘│
│  </Card>                                                          │
└──────────────────────────────────────────────────────────────────┘
```

**进度列渲染**:
```tsx
<Space direction="vertical" size={0}>
  <Progress percent={progressPercent} size="small" />
  <Text type="secondary" style={{ fontSize: 12 }}>
    {completedCount}/{totalRequirements} 已完成
  </Text>
</Space>
```

**容量列渲染**:
```tsx
<Space>
  <Badge status={capacityUsed / capacityTotal > 0.85 ? 'warning' : 'success'} />
  <Text>{capacityUsed}/{capacityTotal}</Text>
</Space>
```

---

### 4.2 火车管理员仪表盘（可行性最高，优先实现）

```
┌──────────────────────────────────────────────────────────────────────┐
│  🚂 仪表盘 · 火车管理员视角                                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─ 第一行：班次进度看板 ──────────────────────────────────────────┐ │
│  │                            │                                      │ │
│  │  <ScheduleProgressCard     │  <Card title="⏱️ 关键日期">         │ │
│  │   data={schedulesProgress}│  ┌──────────────────────────────┐  │ │
│  │   />                      │  │ <Timeline                    │  │ │
│  │                            │  │   items={[                  │  │ │
│  │                            │  │     { children: 'Q2第1班封板 │  │ │
│  │                            │  │        color: 'orange',     │  │ │
│  │                            │  │        5-23 (3天后)' },     │  │ │
│  │                            │  │     { children: 'Q2第1班投产'│  │ │
│  │                            │  │       color: 'green',       │  │ │
│  │                            │  │       5-30 (10天后)' },     │  │ │
│  │                            │  │     { children: 'Q2第2班纳版'│  │ │
│  │                            │  │       color: 'blue',        │  │ │
│  │                            │  │       6-13 (24天后)' },     │  │ │
│  │                            │  │   ]}                        │  │ │
│  │                            │  │   />                         │  │ │
│  │                            │  └──────────────────────────────┘  │ │
│  └────────────────────────────┴────────────────────────────────────┘ │
│                                                                       │
│  ┌─ 第二行：待办列表（两栏）──────────────────────────────────────┐ │
│  │                                     │                            │ │
│  │  <Card title="🔴 待纳版需求">       │ <Card title="🟡 待确认投产">│ │
│  │  ┌─────────────────────────────┐   │ ┌────────────────────────┐ │ │
│  │  │ <Table                      │   │ │ <Table                 │ │ │
│  │  │  columns={[                │   │ │  columns={[           │ │ │
│  │  │   reqCode, title,            │   │ │   reqCode, title,     │ │ │
│  │  │   system.name, priority,     │   │ │   system.name,        │ │ │
│  │  │   storyPoints                │   │ │   subStatus(Tag),     │ │ │
│  │  │  ]}                         │   │ │   updatedAt            │ │ │
│  │  │  dataSource={               │   │ │  ]}                   │ │ │
│  │  │   listRequirements(         │   │ │  dataSource={         │ │ │
│  │  │    status=READY             │   │ │   listRequirements(   │ │ │
│  │  │   )                         │   │ │    status=ONBOARDED    │ │ │
│  │  │  }                          │   │ │    subStatus=SIT_TESTING│ │ │
│  │  │  onClick → 跳转详情          │   │ │       + UAT_TESTING   │ │ │
│  │  │  />                         │   │ │   )                   │ │ │
│  │  └─────────────────────────────┘   │ │  onClick → 跳转详情    │ │ │
│  │                                     │ │  />                   │ │ │
│  │                                     │ └────────────────────────┘ │ │
│  └─────────────────────────────────────┴────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

**数据加载**: 页面 mount 时并行请求:
1. `GET /api/schedules/progress` → `schedulesProgress`
2. `GET /api/requirements?status=READY&page=1&pageSize=5` → 待纳版
3. `GET /api/requirements?status=ONBOARDED&subStatus=SIT_TESTING&subStatus=UAT_TESTING&page=1&pageSize=5` → 待确认投产

**关键日期数据来源**: `schedulesProgress` 响应中的 `lockdownDate` / `releaseDate` / `boardingDate`，前端计算距今天数。

---

### 4.3 BA 仪表盘

```
┌──────────────────────────────────────────────────────────────────────┐
│  🚂 仪表盘 · BA 视角（用户中心）                                     │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─ 第一行：需求状态概览 + 班次纳版提醒 ───────────────────────────┐ │
│  │                                                                   │ │
│  │  <StatusStatCards                              │ <Card title="⚠️ 纳版提醒">│
│  │   data={stats}                                 │ ┌──────────────────┐│ │
│  │   systemIds={user.systemIds}                   │ │ <Alert           ││ │
│  │   onCardClick={status =>                       │ │  type="warning"   ││ │
│  │     navigate(`/requirements?status=${status}`)  │ │  message=         ││ │
│  │   }                                            │ │  "Q2第1班纳版截止││ │
│  │   />                                           │ │  5月23日 (3天后)" ││ │
│  │                                                │ │ />                ││ │
│  │                                                │ │                   ││ │
│  │                                                │ │ <Statistic        ││ │
│  │                                                │ │  title="未纳版需求"││ │
│  │                                                │ │  value=5          ││ │
│  │                                                │ │ />                ││ │
│  │                                                │ └──────────────────┘│ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─ 第二行：待办列表 ──────────────────────────────────────────────┐ │
│  │                                                                   │ │
│  │  <TodoList                                                        │ │
│  │   tabs={[                                                         │ │
│  │     { key: 'rejected', label: '🔴 评审被拒绝',                    │ │
│  │       items: myTodos.pendingReviewRejected },                     │ │
│  │     { key: 'resubmit', label: '🟡 变更通过待重发',                │ │
│  │       items: myTodos.changeApprovedNeedsResubmit },               │ │
│  │   ]}                                                              │ │
│  │   loading={loading}                                               │ │
│  │   />                                                              │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─ 第三行：当前班次需求 ──────────────────────────────────────────┐ │
│  │                                                                   │ │
│  │  <Card title="📈 当前班次 我的系统需求"                           │ │
│  │        extra={<Button>查看全量列表 →</Button>}>                   │ │
│  │  ┌───────────────────────────────────────────────────────────────┐│ │
│  │  │ <Table                                                         ││ │
│  │  │  columns={[reqCode, title, status(Tag), subStatus(Tag),       ││ │
│  │  │            progress(Progress), updatedAt]}                     ││ │
│  │  │  dataSource={currentScheduleRequirements}                     ││ │
│  │  │  pagination={false}                                           ││ │
│  │  │  />                                                           ││ │
│  │  └───────────────────────────────────────────────────────────────┘│ │
│  │  </Card>                                                          │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

**数据加载**:
1. `GET /api/stats/requirements?systemIds=xxx` → StatusStatCards
2. `GET /api/requirements/my-todos` → TodoList
3. `GET /api/requirements?scheduleId=当前班次&systemId=xxx&page=1&pageSize=10` → 班次需求

**"当前班次"判断**: 从 `schedulesProgress` 中取 `status=IN_PROGRESS` 的第一个班次。

---

### 4.4 项目经理仪表盘

```
┌──────────────────────────────────────────────────────────────────────┐
│  🚂 仪表盘 · 项目经理视角                                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─ 第一行：全系统需求状态分布 ────────────────────────────────────┐ │
│  │                                                                   │ │
│  │  <StatusStatCards                                                 │ │
│  │   data={stats}     // GET /api/stats/requirements（不限系统）      │ │
│  │   onCardClick={status => navigate(`/requirements?status=${status}`)}│ │
│  │   />                                                              │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─ 第二行：班次进度 + 紧急变更待办 ───────────────────────────────┐ │
│  │                                     │                             │ │
│  │  <ScheduleProgressCard             │ <Card title="🚨 紧急变更待审核">│ │
│  │   data={schedulesProgress}         │ ┌──────────────────────────┐│ │
│  │   />                               │ │ <Table                   ││ │
│  │                                     │ │  columns={[             ││ │
│  │                                     │ │   reqCode, title,       ││ │
│  │                                     │ │   system.name,          ││ │
│  │                                     │ │   urgency(Tag: P0=red), ││ │
│  │                                     │ │   approvalStep(Badge),  ││ │
│  │                                     │ │   action(审批/驳回按钮) ││ │
│  │                                     │ │  ]}                     ││ │
│  │                                     │ │  dataSource={           ││ │
│  │                                     │ │   emergencyChanges      ││ │
│  │                                     │ │  }                      ││ │
│  │                                     │ │  />                     ││ │
│  │                                     │ └──────────────────────────┘│ │
│  │                                     │ </Card>                     │ │
│  └─────────────────────────────────────┴────────────────────────────┘ │
│                                                                       │
│  ┌─ 第三行：依赖风险概览 ──────────────────────────────────────────┐ │
│  │                                                                   │ │
│  │  <Card title="⚠️ 依赖风险提示">                                   │ │
│  │  ┌───────────────────────────────────────────────────────────────┐│ │
│  │  │ <Table                                                         ││ │
│  │  │  columns={[reqCode, title, system.name,                       ││ │
│  │  │            dependsOn(依赖列表), riskLevel(Tag)]}               ││ │
│  │  │  dataSource={riskRequirements}  // 筛选 status=ONBOARDED      ││ │
│  │  │                                  且依赖中有 riskLevel 不为 null││ │
│  │  │  pagination={{ pageSize: 10 }}                                 ││ │
│  │  │  />                                                           ││ │
│  │  └───────────────────────────────────────────────────────────────┘│ │
│  │  </Card>                                                          │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

**依赖风险数据来源**: `listRequirements(status=ONBOARDED)` → 每条需求 include dependencies → 前端过滤 `dependencies` 中有 `riskLevel !== null` 的项。或者新增一个简单的后端查询。

**紧急变更操作**: 审批/驳回按钮直接调用现有 `approveEmergencyChange()` / `rejectEmergencyChange()` API。

---

### 4.5 产品经理仪表盘

```
┌──────────────────────────────────────────────────────────────────────┐
│  🚂 仪表盘 · 产品经理视角                                            │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─ 第一行：班次汇总（含容量） ────────────────────────────────────┐ │
│  │                                                                   │ │
│  │  <ScheduleProgressCard                                            │ │
│  │   data={schedulesProgress}   // 含 capacityUsed/capacityTotal     │ │
│  │   />                                                              │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─ 第二行：待评审 + P0/P1 重点需求 ───────────────────────────────┐ │
│  │                                     │                             │ │
│  │  <Card title="📋 待评审需求">       │ <Card title="🎯 P0/P1 需求"> │ │
│  │  ┌─────────────────────────────┐   │ ┌──────────────────────────┐│ │
│  │  │ <Table                      │   │ │ <Table                  ││ │
│  │  │  columns={[                │   │ │  columns={[             ││ │
│  │  │   reqCode, title,            │   │ │   reqCode, title,      ││ │
│  │  │   system.name, priority,     │   │ │   system.name,         ││ │
│  │  │   createdAt                  │   │ │   status(Tag),         ││ │
│  │  │  ]}                         │   │ │   priority(Tag: P0=red) ││ │
│  │  │  dataSource={               │   │ │  ]}                    ││ │
│  │  │   listRequirements(         │   │ │  dataSource={          ││ │
│  │  │    status=PENDING_REVIEW    │   │ │   listRequirements(    ││ │
│  │  │   )                         │   │ │    priority=P0+P1      ││ │
│  │  │  }                          │   │ │   )                    ││ │
│  │  │  onClick → 跳转详情          │   │ │  }                    ││ │
│  │  │  />                         │   │ │  />                    ││ │
│  │  └─────────────────────────────┘   │ └──────────────────────────┘│ │
│  │                                     │                             │ │
│  └─────────────────────────────────────┴────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

**班次快速切换（OP-PROD-02）**：MainLayout 顶部导航栏右侧增加下拉：

```
┌──────────────────────────────────────────────────┐
│  [ 最近班次 ▾ ]  [ 收藏班次 ★ ]            │
│  ┌──────────────────────┐  ┌───────────────┐   │
│  │ Q2第1班 (用户中心)    │  │ ★ Q2第1班     │   │
│  │ Q2第2班 (订单系统)    │  │   (已收藏)    │   │
│  │ Q1第3班 (支付系统)    │  │   取消收藏     │   │
│  └──────────────────────┘  └───────────────┘   │
└──────────────────────────────────────────────────┘
```

**实现**: `localStorage` 存最近 5 个班次 ID + 收藏列表。点击跳转 `/trains/:trainId/schedules/:scheduleId`。

---

### 4.6 技术经理仪表盘

```
┌──────────────────────────────────────────────────────────────────────┐
│  🚂 仪表盘 · 技术经理视角（用户中心系统）                            │
├──────────────────────────────────────────────────────────────────────┤
│  当前系统：<Select value={currentSystem} options={user.systemIds}>   │
│                                                                       │
│  ┌─ 第一行：系统需求状态统计 ──────────────────────────────────────┐ │
│  │                                                                   │ │
│  │  <StatusStatCards                                                 │ │
│  │   data={stats}                  // systemIds={currentSystem}      │ │
│  │   onCardClick={status => navigate(`/requirements?status=${status}&systemId=${currentSystem}`)}│ │
│  │   />                                                              │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─ 第二行：开发看板（4列拖拽看板） ───────────────────────────────┐ │
│  │                                                                   │ │
│  │  <Row gutter={16}>                                                │ │
│  │  <Col span={6}>                                                   │ │
│  │   <Card title="🏗️ 待开发" style={{ bg: '#f5f5f5' }}>             │ │
│  │     <List dataSource={onboardedNullSubStatus}                     │ │
│  │           renderItem={r => <RequirementCard data={r} />} />       │ │
│  │   </Card>                                                         │ │
│  │  </Col>                                                           │ │
│  │  <Col span={6}>                                                   │ │
│  │   <Card title="💻 开发中" style={{ bg: '#e6f7ff' }}>             │ │
│  │     <List dataSource={devInProgress} ... />                       │ │
│  │   </Card>                                                         │ │
│  │  </Col>                                                           │ │
│  │  <Col span={6}>                                                   │ │
│  │   <Card title="🧪 SIT测试" style={{ bg: '#fff7e6' }}>            │ │
│  │     <List dataSource={sitTesting} ... />                          │ │
│  │   </Card>                                                         │ │
│  │  </Col>                                                           │ │
│  │  <Col span={6}>                                                   │ │
│  │   <Card title="🔒 UAT测试" style={{ bg: '#f9f0ff' }}>            │ │
│  │     <List dataSource={uatTesting} ... />                          │ │
│  │   </Card>                                                         │ │
│  │  </Col>                                                           │ │
│  │  </Row>                                                           │ │
│  │                                                                   │ │
│  │  数据来源: 一次 listRequirements(status=ONBOARDED&systemId=xxx)  │ │
│  │  前端按 subStatus 分组到4列：【null, DEV_IN_PROGRESS,             │ │
│  │  SIT_TESTING, UAT_TESTING】。每列标题带计数 Badge。               │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

**RequirementCard 组件**（List 内的卡片项）:
```
┌─────────────────────┐
│ REQ-UC-008          │
│ 用户注销功能         │
│ P1 · 5点            │
│ 计划 5-21 开始       │
│ [标记开发中]         │
└─────────────────────┘
```

点击跳转详情页，底部按钮调用 `changeSubStatus()` 推进状态。

---

### 4.7 测试负责人仪表盘

```
┌──────────────────────────────────────────────────────────────────────┐
│  🚂 仪表盘 · 测试负责人视角                                          │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─ 第一行：待测试 + 紧急变更 ─────────────────────────────────────┐ │
│  │                                     │                             │ │
│  │  <Card title="🔴 待测试需求">        │ <Card title="🚨 紧急变更待测试">│ │
│  │  ┌─────────────────────────────┐   │ ┌──────────────────────────┐│ │
│  │  │ <Table                      │   │ │ <Table                   ││ │
│  │  │  columns={[                │   │ │  columns={[reqCode,      ││ │
│  │  │   reqCode, title,            │   │ │   title, system.name,   ││ │
│  │  │   system.name,               │   │ │   urgency(Tag),         ││ │
│  │  │   subStatus(Tag),            │   │ │   reason, createdAt     ││ │
│  │  │   updatedAt                  │   │ │  ]}                     ││ │
│  │  │  ]}                         │   │ │  dataSource={           ││ │
│  │  │  dataSource={               │   │ │   emergencyChanges      ││ │
│  │  │   listRequirements(         │   │ │   (status=PENDING,       ││ │
│  │  │    status=ONBOARDED          │   │ │    approverId=currentUser) ││ │
│  │  │    subStatus=SIT_TESTING     │   │ │  }                      ││ │
│  │  │       + UAT_TESTING          │   │ │  />                     ││ │
│  │  │   )                         │   │ └──────────────────────────┘│ │
│  │  │  }                          │   │ </Card>                     │ │
│  │  │  onClick → 跳转详情          │   │                             │ │
│  │  │  />                         │   │                             │ │
│  │  └─────────────────────────────┘   │                             │ │
│  │  </Card>                            │                             │ │
│  └─────────────────────────────────────┴────────────────────────────┘ │
│                                                                       │
│  ┌─ 第二行：测试进度看板 ──────────────────────────────────────────┐ │
│  │                                                                   │ │
│  │  同技术经理看板布局，但列调整：                                    │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │ │
│  │  │ SIT测试   │ │ UAT测试  │ │ 封板     │ │ 已投产   │           │ │
│  │  │ 3个需求   │ │ 2个需求  │ │ 5个需求  │ │ 12个需求 │           │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │ │
│  │                                                                   │ │
│  │  数据来源: listRequirements(status=ONBOARDED&systemId=xxx)       │ │
│  │  前端按 subStatus 分组。                                          │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
```

---

### 4.8 需求列表页改造（不依赖新 API）

#### 4.8.1 默认筛选逻辑（OP-BA-02 / OP-TECH-02）

```typescript
// 页面首次加载时，根据用户角色预设筛选条件
useEffect(() => {
  if (!user) return;
  
  const defaultParams: Partial<RequirementListQuery> = {};
  
  switch (user.role) {
    case Role.BA:
    case Role.TECH_MGR:
      // 默认筛选自己系统
      defaultParams.systemId = user.systemIds[0];
      break;
  }
  
  if (user.role === Role.BA) {
    // BA 默认排除已取消和已投产（只看活跃需求）
    const activeStatuses = Object.values(ReqStatus)
      .filter(s => s !== ReqStatus.CANCELLED && s !== ReqStatus.RELEASED);
    defaultParams.status = activeStatuses;
  }
  
  if (user.role === Role.TECH_MGR) {
    // 技术经理只看已纳版的
    defaultParams.status = [ReqStatus.ONBOARDED];
  }
  
  setFilters(defaultParams);
  fetchList(defaultParams);
}, [user]);
```

#### 4.8.2 快捷筛选按钮（需求列表顶部）

```
┌──────────────────────────────────────────────────────────────────────┐
│  [全部需求] [我的活跃需求] [待我评审] [待开发] [待测试]           │
│                                                                       │
│  ─── 点击后自动填充对应筛选条件 + 触发查询                         │
│  "我的活跃需求" → status ≠ CANCELLED,RELEASED & systemId = 我的系统  │
│  "待我评审"     → status = PENDING_REVIEW                            │
│  "待开发"       → status = ONBOARDED & subStatus = null              │
│  "待测试"       → status = ONBOARDED & subStatus in [SIT,UAT]        │
└──────────────────────────────────────────────────────────────────────┘
```

组件: `<Segmented>` 或 `<Radio.Group>`，根据角色显示不同选项。

#### 4.8.3 录入表单默认值（OP-BA-03）

```
创建需求时：
  - 归属系统 <Select> → defaultValue = user.systemIds[0]
  - 业务归属人 <Select> → defaultValue = { value: user.id, label: user.displayName }
  - 产品经理 <Select>  → 无默认值（可选字段）
```

#### 4.8.4 评审快捷模式（OP-PROD-03）

需求详情页操作栏增加：

```
┌──────────────────────────────────────────────────────────────────────┐
│  [← 上一个]  REQ-UC-005 · 登录优化    [下一个 →]                   │
│                                                                       │
│  实现:                                                               │
│  1. 从列表页传入待评审需求 ID 数组（通过 URL state 或 context）     │
│  2. 计算当前需求在数组中的位置，渲染 prev/next 按钮                 │
│  3. 点击 prev/next → navigate(`/requirements/${prevId}`)            │
│  4. 如果是列表页跳转来的，自动获取同状态相邻需求                    │
│                                                                       │
│  使用场景: 产品经理从"待评审列表"进入评审，                        │
│           评审完一个后点"下一个"继续评审下一个。                     │
└──────────────────────────────────────────────────────────────────────┘
```

**数据传递方式**:
```typescript
// 从列表页跳转时，通过 navigate state 携带相邻 ID
navigate(`/requirements/${currentId}`, {
  state: {
    prevId: 'xxx',
    nextId: 'yyy',
    contextList: 'pendingReview'  // 上下文标识
  }
});

// 详情页读取
const { prevId, nextId } = (location.state as any) || {};
```

---

### 4.9 仪表盘路由入口

```typescript
// apps/web/src/pages/dashboard/index.tsx
function DashboardPage() {
  const { user } = useAuthStore();
  
  switch (user?.role) {
    case Role.BA:           return <BADashboard />;
    case Role.PM:           return <ProductMgrDashboard />;
    case Role.PROJECT_MGR:  return <ProjectMgrDashboard />;
    case Role.TRAIN_ADMIN:  return <TrainAdminDashboard />;
    case Role.TECH_MGR:     return <TechMgrDashboard />;
    case Role.TEST_MGR:     return <TestMgrDashboard />;
    case Role.SUPER_ADMIN:  return <ProjectMgrDashboard />;
    default:                return <Navigate to="/requirements" />;
  }
}
```

**面包屑**: `首页 > 仪表盘`，MainLayout 的 `BREADCRUMB_MAP` 已支持。

---

## 五、修正后的实施计划（仅含可行项）

### Sprint 0 — 后端查询 API（1周）

| ID | 任务 | 文件 |
|----|------|------|
| API-01 | `GET /api/stats/requirements` | `apps/server/src/modules/requirements/service.ts` `index.ts` |
| API-02 | `GET /api/emergency-changes` | `apps/server/src/modules/requirements/service.ts` `index.ts` |
| API-03 | `GET /api/requirements/my-todos` | `apps/server/src/modules/requirements/service.ts` `index.ts` |
| API-04 | `GET /api/schedules/progress` | `apps/server/src/modules/trains/service.ts` `index.ts` |
| API-05 | 共享类型定义 | `packages/shared/src/types/` |

### Sprint 1 — 前端默认筛选优化（1周，不依赖新API）

| ID | 任务 | 文件 |
|----|------|------|
| UI-01 | BA 登录默认筛选：自己系统 + 排除已取消/已投产 | `apps/web/src/pages/requirements/index.tsx` |
| UI-02 | 技术经理默认筛选：自己系统 + 已纳版 | `apps/web/src/pages/requirements/index.tsx` |
| UI-03 | 录入表单默认值：系统 = 自己系统，BA = 自己 | `apps/web/src/components/requirements/RequirementForm.tsx` |
| UI-04 | 快捷筛选按钮：「我的活跃需求」「待我评审」等 | `apps/web/src/pages/requirements/index.tsx` |
| UI-05 | OP-PROD-02 班次快速切换：顶部最近班次入口 | `apps/web/src/layouts/MainLayout.tsx` |
| UI-06 | OP-PROD-03 评审快捷模式：详情页上一个/下一个 | `apps/web/src/pages/requirements/detail.tsx` |

### Sprint 2 — BA + 火车管理员仪表盘（1.5周，依赖 Sprint 0）

| ID | 任务 | 文件 |
|----|------|------|
| DB-01 | 仪表盘入口：按 role 路由分发 | `apps/web/src/pages/dashboard/index.tsx` |
| DB-02 | 火车管理员仪表盘 | `apps/web/src/pages/dashboard/train-admin.tsx` |
| DB-03 | BA 仪表盘 | `apps/web/src/pages/dashboard/ba.tsx` |
| DB-04 | 复用组件：StatusStatCards | `apps/web/src/components/dashboard/StatusStatCards.tsx` |
| DB-05 | 复用组件：TodoList | `apps/web/src/components/dashboard/TodoList.tsx` |
| DB-06 | 前端 service 新增方法 | `apps/web/src/services/requirement.ts` `train.ts` |

### Sprint 3 — 其余角色仪表盘（1.5周）

| ID | 任务 | 文件 |
|----|------|------|
| DB-07 | 项目经理仪表盘 | `apps/web/src/pages/dashboard/project-mgr.tsx` |
| DB-08 | 产品经理仪表盘 | `apps/web/src/pages/dashboard/product-mgr.tsx` |
| DB-09 | 技术经理仪表盘 | `apps/web/src/pages/dashboard/tech-mgr.tsx` |
| DB-10 | 测试负责人仪表盘 | `apps/web/src/pages/dashboard/test-mgr.tsx` |

---

## 五、改动文件清单

### 后端（4个新增函数 + 4个路由）

| 文件 | 改动 |
|------|------|
| `apps/server/src/modules/requirements/service.ts` | 新增 `getRequirementStats()`, `getEmergencyChanges()`, `getMyTodos()` |
| `apps/server/src/modules/requirements/index.ts` | 新增 3 个路由 |
| `apps/server/src/modules/trains/service.ts` | 新增 `getScheduleProgress()` |
| `apps/server/src/modules/trains/index.ts` | 新增 1 个路由 |
| `packages/shared/src/types/` | 新增响应类型 |

### 前端（6个新页面 + 4个修改 + 2个新组件）

| 文件 | 改动 |
|------|------|
| `apps/web/src/pages/dashboard/index.tsx` | 修改：按角色分发 |
| `apps/web/src/pages/dashboard/ba.tsx` | 新增 |
| `apps/web/src/pages/dashboard/train-admin.tsx` | 新增 |
| `apps/web/src/pages/dashboard/project-mgr.tsx` | 新增 |
| `apps/web/src/pages/dashboard/product-mgr.tsx` | 新增 |
| `apps/web/src/pages/dashboard/tech-mgr.tsx` | 新增 |
| `apps/web/src/pages/dashboard/test-mgr.tsx` | 新增 |
| `apps/web/src/components/dashboard/StatusStatCards.tsx` | 新增 |
| `apps/web/src/components/dashboard/TodoList.tsx` | 新增 |
| `apps/web/src/pages/requirements/index.tsx` | 修改：默认筛选、快捷筛选按钮 |
| `apps/web/src/pages/requirements/detail.tsx` | 修改：评审上一个/下一个按钮 |
| `apps/web/src/layouts/MainLayout.tsx` | 修改：班次快速切换入口 |
| `apps/web/src/components/requirements/RequirementForm.tsx` | 修改：默认值 |
| `apps/web/src/services/requirement.ts` | 新增 `getStats()`, `getMyTodos()` |
| `apps/web/src/services/train.ts` | 新增 `getSchedulesProgress()` |

---

## 六、与原 v1.1 文档的差异总结

| v1.1 建议 | v2.1 处理 | 原因 |
|-----------|----------|------|
| OP-BA-01 BA 仪表盘 | ✅ 保留，简化 | 用 stats API 替换手动预估 |
| OP-BA-02 需求列表默认筛选 | ✅ 保留 | 纯前端改动，不依赖后端 |
| OP-BA-03 录入表单默认值 | ✅ 保留 | 纯前端改动 |
| OP-BA-04 纳版时间提醒 | ✅ 保留，简化 | 仪表盘展示 boardingDate 即可，不做通知 |
| OP-PROD-01 产品经理仪表盘 | ✅ 保留，简化 | 展示班次进度 + 待评审列表 |
| OP-PROD-02 班次快速切换 | ✅ 保留 | 纯前端：localStorage 记录最近班次 |
| OP-PROD-03 评审快捷模式 | ✅ 保留 | 纯前端：详情页添加上一个/下一个按钮 |
| OP-PM-01 项目经理仪表盘 | ✅ 保留，大幅简化 | 仅展示进度 + 紧急变更待办 + 依赖风险 |
| OP-PM-02 紧急变更批量审核 | ❌ 排除 | 需新建批量接口 |
| OP-PM-03 跨班次概览 | ❌ 排除 | 热力图/进度对比图无数据模型支撑 |
| OP-PM-04 风险与阻塞点标记 | ❌ 排除 | 需新建 RequirementRisk 模型 |
| OP-PM-05 快速报告生成 | ❌ 排除 | 需报告引擎 |
| OP-TM-01 火车管理员仪表盘 | ✅ 保留 | 数据最齐全 |
| OP-TM-02 纳版优化 | ❌ 排除 | 智能推荐无算法支撑 |
| OP-TM-03 状态变更增强 | ❌ 排除 | 影响预览需额外分析逻辑 |
| OP-TECH-01 技术经理仪表盘 | ✅ 保留，简化 | 看板用现有查询 + 前端分组 |
| OP-TECH-02 默认筛选 | ✅ 保留 | 纯前端 |
| OP-TEST-01 测试负责人仪表盘 | ✅ 保留，简化 | 紧急变更改查 EmergencyChange 表 |
| OP-TEST-02 投产前检查清单 | ❌ 排除 | 需额外测试完成标记 |

**保留率**: 原文档 22 项优化建议 → 修订后保留 15 项（约 68%），全部可在现有数据模型上实现。

---

*版本记录*:
- v2.0 (2026-05-21): 基于代码库全面审核
- v2.1 (2026-05-21): 移除所有需要新建数据模型的功能，仪表盘只展示现有数据可支撑的内容
