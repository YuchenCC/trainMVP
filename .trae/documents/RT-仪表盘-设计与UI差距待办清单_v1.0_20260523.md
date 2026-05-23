# 仪表盘功能 — 设计与 UI 差距分析与待办清单

**版本号**: v1.1
**日期**: 2026-05-23
**状态**: 更新中
**参考文档**:
- [RT-角色高频功能分析审核_v2.1_20260521.md](file:///Users/laiyang/Library/Application%20Support/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/版本火车/.trae/documents/RT-角色高频功能分析审核_v2.1_20260521.md)
- [RT-仪表盘实施计划_v1.0_20260522.md](file:///Users/laiyang/Library/Application%20Support/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/版本火车/.trae/documents/RT-仪表盘实施计划_v1.0_20260522.md)
- [RT-仪表盘功能开发交接文档_v1.0_20260523.md](file:///Users/laiyang/Library/Application%20Support/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/版本火车/.trae/documents/RT-仪表盘功能开发交接文档_v1.0_20260523.md)
- [dashboard-prototype.html](file:///Users/laiyang/Library/Application%20Support/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/版本火车/release-train/apps/web/public/dashboard-prototype.html)
- [当前代码](file:///Users/laiyang/Library/Application%20Support/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/版本火车/release-train/apps/server/src/modules/requirements/service.ts)
- [当前代码](file:///Users/laiyang/Library/Application%20Support/TRAE%20SOLO%20CN/ModularData/ai-agent/work-mode-projects/版本火车/release-train/apps/web/src/)

---

## 版本记录

| 版本 | 日期 | 变更说明 |
|------|------|---------|
| v1.0 | 2026-05-23 | 初版，基于设计文档和 UI 原型与当前代码的对比分析生成 |
| v1.1 | 2026-05-23 | **月历组件大改**：双月视图、火车下拉票（API驱动）、班次连续条、孤儿事件、CSS修复；标记相关待办为已完成；补充新增待办 |

---

## 一、分析来源与范围

### 1.1 分析输入

| 来源 | 类型 | 内容 |
|------|------|------|
| RT-角色高频功能分析审核_v2.1 | 设计文档 | 6 个角色仪表盘的功能清单、数据来源、排除项 |
| RT-仪表盘实施计划_v1.0 | 实施计划 | 4 个后端 API 详细设计、7 个 US 定义、前端组件设计、路由配置 |
| dashboard-prototype.html | UI 原型 | 完整 HTML/CSS 原型，含 6 角色仪表盘和月历视图的视觉设计 |
| 当前代码（后端） | 代码 | requirements service.ts / index.ts、train.service.ts、schedule.ts |
| 当前代码（前端） | 代码 | App.tsx / MainLayout.tsx / 4 个组件 / 3 个页面 |

### 1.2 已实现范围（vs 设计 + UI）

| 功能 | 状态 | 说明 |
|------|------|------|
| 4 个后端 API | ✅ 已实现 | getRequirementStats / getEmergencyChanges / getMyTodos / getScheduleProgress |
| 前端 Service 层 | ✅ 已实现 | requirement.ts / train.ts 调用后端 API |
| 共享类型 | ✅ 已实现 | dashboard.ts 定义 4 个响应类型 |
| StatusStatCards 组件 | ✅ 已实现(4卡) | 比设计少 1 卡，比原型少 1 卡 |
| TodoList 组件 | ✅ 已实现(平铺) | 比原型简化（无 Tab、无分页、无操作按钮） |
| ScheduleProgressCard 组件 | ✅ 已实现(Card网格) | 比原型简化（无容量、无需求数、日期估算替代需求聚合） |
| CalendarView 组件 | ✅ 已实现(v1.1) | 双月视图 + <>切换月份 + 火车下拉票(API) + 班次连续条(macOS风格) + 孤儿事件(Tag) + 底部班次卡片 |
| BA 仪表盘页面 | ✅ 已实现 | 功能可用，布局和内容未对齐设计+UI |
| 项目经理仪表盘页面 | ✅ 已实现 | 与 BA 结构相同，未对齐原型中的项目总览视图 |
| 产品经理仪表盘 | ❌ 未实现 | 设计+UI 中均有 |
| 火车管理员仪表盘 | ❌ 未实现 | 设计+UI 中均有 |
| 技术经理仪表盘 | ❌ 未实现 | 设计+UI 中均有 |
| 测试负责人仪表盘 | ❌ 未实现 | 设计+UI 中均有 |
| 角色切换器 | ❌ 未实现 | UI 原型中有 6 角色按钮切换 |
| 角色路由分发 | ❌ 未实现 | 入口页为占位页面，非自动分发 |

---

## 二、设计与代码差距

> 此节总结设计文档（RT-仪表盘实施计划_v1.0）与实际实现之间的偏差。

### 2.1 核心偏差

| # | 设计项 | 设计文档要求 | 实际实现 | 影响 |
|---|--------|------------|---------|------|
| D-01 | 进度计算 | `completedCount / totalRequirements * 100`（基于需求完成度） | 基于日期阶段估算（planning=25/testing=60/pre-release=85/released=100） | 进度数据不准确，无法反映真实开发状态 |
| D-02 | 容量数据 | 跨系统 SUM `TrainSystemSnapshot.capacityPoints / usedPoints` | 未查询快照表 | 前端的 ScheduleProgressCard 容量列始终为 0 |
| D-03 | 需求聚合 | 关联 `Requirement` count 计算 totalRequirements / completedCount | 未关联需求表 | 前端的"已完成数/总数"始终为默认值 |
| D-04 | 排序 | `orderBy: { createdAt: 'desc' }` | `orderBy: { startDate: 'asc' }` | 合理变更（按时间轴展示），无影响 |
| D-05 | ScheduleProgressItem 字段 | `scheduleId`, `scheduleName`, `status`, `totalRequirements`, `completedCount`, `capacityUsed`, `capacityTotal`, `progressPercent`, `boardingDate`, `lockdownDate` | `id`, `trainId`, `version`, `currentPhase`, `progress`, `sitStartDate`, `sitEndDate`, `uatStartDate`, `uatEndDate` | 类型定义中包含设计字段，但后端只填充阶段字段 |
| D-06 | 角色待办完整性 | TECH_MGR 有 `pendingDev` + `pendingToSubmitTest`，TEST_MGR 有 `pendingTest` | `default` 返回空对象 | 技术经理和测试负责人无法使用待办功能 |
| D-07 | SUPER_ADMIN 映射 | 应映射到 ProjectMgrDashboard | 未处理 | 超管角色无可用仪表盘 |
| D-08 | 角色路由分发 | `dashboard/index.tsx` 根据 role 自动分发 | 占位页，需手动导航 | 用户无法通过单一入口进入对应仪表盘 |

### 2.2 设计方案差异摘要

```
设计文档期望的数据流:
  GET /api/schedules/progress
  └── TrainSchedule.findMany()
      ├── include requirements → count → totalRequirements / completedCount / progressPercent
      └── include snapshots → SUM capacityPoints / usedPoints / capacityUsed / capacityTotal

当前实现的数据流:
  GET /api/schedules/progress
  └── TrainSchedule.findMany()
      └── 基于关键日期 vs 当前日期 → currentPhase / progress（估算值）
```

---

## 三、UI 原型与代码差距

> 此节总结 UI 原型（dashboard-prototype.html）与实际实现之间的视觉和功能偏差。

### 3.1 全局布局

| # | UI 原型 | 当前实现 | 优先级 |
|---|---------|---------|--------|
| U-01 | 角色切换器：6 角色按钮（BA/PM/项目经理/火车管理员/技术经理/测试负责人） | ❌ 无 | 🔴 P0 |
| U-02 | 顶栏右侧显示"当前班次：2026年Q2第1班" | ❌ 无 | 🟢 P3 |
| U-03 | 侧边栏导航项有圆点指示器（`.nav-dot`） | ❌ 无 | 🟢 P3 |
| U-04 | 仪表盘布局为按角色切换的单一入口（`/dashboard`） | 手动导航 `/dashboard/ba` 或 `/dashboard/pm` | 🔴 P0 |

### 3.2 BA 仪表盘

| # | UI 原型 | 当前实现 | 优先级 |
|---|---------|---------|--------|
| U-05 | 5 张统计卡片：草稿/待评审/已就绪/已纳版/已投产 | 4 张：总需求/活跃/草稿/待评审 | 🟡 P2 |
| U-06 | 每张卡片有子标题（如"待完善·发起评审"） | ❌ 无子标题 | 🟡 P2 |
| U-07 | 卡片 hover 效果（上移 + 蓝色边框 + 阴影） | ❌ 无交互反馈 | 🟢 P3 |
| U-08 | 卡片右侧彩色竖条装饰 | ❌ 无装饰 | 🟢 P3 |
| U-09 | 黄色 Alert 告警条（纳版截止提醒） | ❌ 无 | 🟡 P2 |
| U-10 | 快速操作区（未纳版/已就绪/紧急变更 3 个统计） | ❌ 无 | 🟡 P2 |
| U-11 | 关键日期 Timeline（封板/投产/纳版截止 + 剩余天数） | ❌ 无 | 🟡 P2 |
| U-12 | 已就绪需求列表（Table 格式） | ❌ 无（当前用 ScheduleProgressCard 替代） | 🟡 P2 |
| U-13 | 页面标题"业务BA · 用户中心系统" + 当前班次信息 | "BA 仪表盘" | 🟢 P3 |

### 3.3 产品经理仪表盘

| # | UI 原型 | 当前实现 | 优先级 |
|---|---------|---------|--------|
| U-14 | **整个页面未实现** | ❌ 无 | 🔴 P0 |

产品经理仪表盘应有：
- 统计卡片 5 张（全系统维度）
- 两栏布局：班次汇总（含容量 Table）+ 待评审需求列表
- P0/P1 重点需求列表

### 3.4 项目经理仪表盘

| # | UI 原型 | 当前实现 | 优先级 |
|---|---------|---------|--------|
| U-15 | `grid-2-1` 布局：火车班次进度（Table）+ 紧急变更待审批 | 垂直布局：StatusStatCards + ScheduleProgressCard + TodoList | 🟡 P2 |
| U-16 | 进度 Table 含"容量"列 + 进度"24/28·85%"格式 | 无容量列，进度仅显示百分比 | 🟡 P2 |
| U-17 | 紧急变更 Table 中嵌入"通过/驳回"操作按钮 | ❌ 无操作按钮 | 🔴 P0 |
| U-18 | 依赖风险提示 Table（含风险等级 Tag） | ❌ 无 | 🟡 P2 |
| U-19 | 页面标题"项目经理 · 全局管控" | "项目经理仪表盘" | 🟢 P3 |

### 3.5 火车管理员仪表盘

| # | UI 原型 | 当前实现 | 优先级 |
|---|---------|---------|--------|
| U-20 | **整个页面未实现** | ❌ 无 | 🔴 P0 |

火车管理员仪表盘应有：
- `grid-2-1` 布局：所有火车班次概览 Table + 关键日期 Timeline
- 待纳版需求 Table（`status=READY`）
- 待确认投产 Table（含测试状态 Tag）

### 3.6 技术经理仪表盘

| # | UI 原型 | 当前实现 | 优先级 |
|---|---------|---------|--------|
| U-21 | **整个页面未实现** | ❌ 无 | 🔴 P0 |

技术经理仪表盘应有：
- 5 张统计卡片（待开发/开发中/SIT测试/UAT测试/已封板）
- **4 列 Kanban 看板**：待开发 / 开发中 / SIT测试 / UAT测试
- 看板卡片含编号/标题/优先级/点数/计划提测日期

### 3.7 测试负责人仪表盘

| # | UI 原型 | 当前实现 | 优先级 |
|---|---------|---------|--------|
| U-22 | **整个页面未实现** | ❌ 无 | 🔴 P0 |

### 3.8 月历视图

> v1.1 更新：月历组件已大幅改造，大部分差距已闭合。

| # | UI 原型 | 当前实现 | 优先级 | v1.1 状态 |
|---|---------|---------|--------|-----------|
| U-23 | 顶部火车切换按钮（Q2/Q3/Q4） | ✅ Select 下拉框（从 API 获取真实火车列表，切换时后台按 trainId 查询） | 🟡 P2 | ✅ 已闭合（Select 替代按钮） |
| U-24 | 班次日期范围用紫色底色标记 | ✅ 班次 startDate~endDate 连续彩色条（macOS 风格），多班次重叠分多行 | 🟡 P2 | ✅ 已闭合 |
| U-25 | 页面底部班次说明栏（含各关键日期 + 需求数） | ✅ 底部卡片展示班次详情（纳版日/封板日/投产日/需求数） | 🟢 P3 | ✅ 已闭合 |

**v1.1 新增功能（设计文档未明确但已实现）**：

| 功能 | 说明 |
|------|------|
| 双月视图 | 左右两个 Calendar 并排，`<>` 按钮切换前后双月，"今天"按钮回当前 |
| 孤儿事件 | 里程碑事件（纳版/封板/投产）日期不在班次区间内时，独立渲染彩色 Tag（带 Tooltip），flex 两列排列 |
| CSS 彻底覆盖 | 隐藏 Ant Design 默认日期数字（`.ant-picker-calendar-date-value`），清除单元格左右 margin/padding，实现无缝连续的班次条 |
| 容器高度动态计算 | 根据当天最大 rowIndex 设 paddingTop，避免 absolute 班次条与孤儿事件重叠 |
| 后端 endDate 字段 | `getScheduleProgress` 新增返回 `endDate` 字段，班次条长度基于真实起止日期 |
| 注释完善 | CalendarView.tsx 全文件已加详细注释（interface / 函数 / 变量 / 关键逻辑） |

### 3.9 复用组件差异汇总

| 组件 | UI 原型 | 当前实现 | 优先级 |
|------|---------|---------|--------|
| StatusStatCards | 5 卡网格 + 子标题 + hover 效果 + 彩色竖条 + 点击跳转 | 4 卡 Statistic + 无交互 | 🟡 P2 |
| TodoList | Tabs 切换 + Table + 操作按钮 + 分页 | Card 平铺 + List + 无分页 | 🟡 P2 |
| ScheduleProgressCard | Table 布局 + 容量列 + 需求数 + 进度分子分母 | Card 网格 + 无容量 + 无需求数 | 🟡 P2 |

---

## 四、待办事项清单

### 🔴 P0 — 阻塞级（缺失的核心功能）

| ID | 待办项 | 关联差距 | 预估工时 | 前置依赖 |
|----|--------|---------|---------|---------|
| T-01 | **仪表盘路由分发组件**：`dashboard/index.tsx` 根据 `useAuthStore().user.role` 自动分发到对应仪表盘 | D-08, U-04 | 2h | 无 |
| T-02 | **角色切换器组件**：仪表盘顶部 6 角色按钮一键切换，切换时更新侧边栏用户名称/角色 | U-01 | 3h | T-01 |
| T-03 | **产品经理仪表盘页面**：5 卡 + 班次汇总(含容量) + 待评审列表 + P0/P1列表 | U-14 | 4h | T-01, T-02 |
| T-04 | **火车管理员仪表盘页面**：班次概览Table(含容量) + 关键日期Timeline + 待纳版 + 待确认投产 | U-20 | 4h | T-01, T-02 |
| T-05 | **技术经理仪表盘页面**：5 卡(子状态统计) + 4 列 Kanban 看板 | U-21 | 5h | T-01, T-02 |
| T-06 | **测试负责人仪表盘页面**：待测试列表 + 紧急变更待测试 + 测试进度看板 | U-22 | 4h | T-01, T-02 |
| T-07 | **`getScheduleProgress` 改造 — 关联 Requirement 聚合**：查询每个班次的需求数、完成数、进度百分比 | D-01, D-03 | 3h | 无 |
| T-08 | **`getScheduleProgress` 改造 — 关联 TrainSystemSnapshot 容量聚合**：跨系统 SUM capacityPoints / usedPoints | D-02 | 2h | 无 |
| T-09 | **`ScheduleProgressItem` 类型对齐**：清理类型，确保后端填充的字段与类型定义一致 | D-05, D-01~D-03 | 1h | T-07, T-08 |
| T-10 | **紧急变更审批操作按钮**：TodoList 中嵌入"通过/驳回"按钮，调用 `approveEmergencyChange` / `rejectEmergencyChange` API | U-17 | 3h | 无 |
| T-11 | **后端 `getMyTodos` 补齐 TECH_MGR / TEST_MGR 分支** | D-06 | 2h | 无 |
| T-12 | **SUPER_ADMIN 角色映射**：映射到项目经理仪表盘 | D-07 | 0.5h | T-01 |

### 🟡 P2 — 重要级（功能提升）

| ID | 待办项 | 关联差距 | 预估工时 | 前置依赖 |
|----|--------|---------|---------|---------|
| T-13 | **StatusStatCards 扩展至 5 张**：草稿/待评审/已就绪/已纳版/已投产 | U-05 | 1h | 无 |
| T-14 | **统计卡片增加子标题**：每张卡底部加 sub 信息 | U-06 | 0.5h | T-13 |
| T-15 | **统计卡片增加点击跳转**：点击跳转 `/requirements?status=xxx` | — | 0.5h | T-13 |
| T-16 | **ScheduleProgressCard 增加容量列**：显示 `capacityUsed/capacityTotal`，超 85% 告警色 | U-16 | 2h | T-08 |
| T-17 | **ScheduleProgressCard 增加需求进度列**：显示 `completedCount/totalRequirements` + 百分比 | U-16 | 1h | T-07 |
| T-18 | **TodoList 改为 Tabs 切换布局**：用 Ant Design Tabs 分组展示不同类型待办 | — | 2h | 无 |
| T-19 | **TodoList 增加分页**：每页 5 条 | — | 1h | T-18 |
| T-20 | **BA 仪表盘 — 纳版截止 Alert 提醒**：黄色 Alert + 倒计时 | U-09 | 1h | 无 |
| T-21 | **BA 仪表盘 — 快速操作区**：未纳版/已就绪/紧急变更 3 个统计 | U-10 | 1.5h | 无 |
| T-22 | **BA 仪表盘 — 关键日期 Timeline**：Timeline 组件展示封板/投产/纳版截止 | U-11 | 1.5h | 无 |
| T-23 | **BA 仪表盘 — 已就绪需求列表 Table**：展示 `status=READY` 的需求 | U-12 | 1h | 无 |
| T-24 | **项目经理仪表盘 — 依赖风险提示 Table**：复用 riskLevel 计算逻辑 | U-18 | 2h | 无 |
| T-25 | **ProjectMgrDashboard 布局改造**：改为两栏 `grid-2-1`（进度表 + 紧急变更） | U-15 | 2h | T-16, T-17 |
| T-26 | **月历 — 顶部火车切换器**：Q2/Q3/Q4 按钮切换 | U-23 | 2h | 无 | ✅ 已完成（v1.1：Select 下拉框 + API 驱动） |
| T-27 | **月历 — 班次范围底色标记**：Kalender dateCellRender 加紫色底色 | U-24 | 1.5h | 无 | ✅ 已完成（v1.1：双月连续彩色条 + macOS 风格） |

### 🟢 P3 — 提升级（视觉/体验完善）

| ID | 待办项 | 关联差距 | 预估工时 | 前置依赖 |
|----|--------|---------|---------|---------|
| T-28 | **顶栏增加"当前班次"信息** | U-02 | 1h | 无 |
| T-29 | **侧边栏增加圆点指示器** | U-03 | 0.5h | 无 |
| T-30 | **仪表盘页面标题完善** | U-13, U-19 | 0.5h | 无 |
| T-31 | **统计卡片 hover 效果** | U-07 | 0.5h | T-13 |
| T-32 | **统计卡片右侧彩色竖条** | U-08 | 0.5h | T-13 |
| T-33 | **ScheduleProgressCard 改为 Table 布局** | — | 2h | T-16, T-17 |
| T-34 | **月历 — 底部班次说明栏** | U-25 | 1.5h | 无 | ✅ 已完成（v1.1：底部卡片展示纳版日/封板日/投产日/需求数） |

---

## 五、实施批次建议

### Batch 1：P0 核心功能 + 后端改造（预估 3-4 天）

```
T-01 → T-02 → T-07 → T-08 → T-09 → T-11 → T-12（后端 + 路由）

然后并行：
├── T-03 PM仪表盘
├── T-04 火车管理员仪表盘
├── T-05 技术经理仪表盘（含 Kanban）
├── T-06 测试负责人仪表盘
└── T-10 紧急变更审批按钮
```

### Batch 2：P2 功能增强（预估 2-3 天）

```
T-13 → T-14 → T-15 → T-31 → T-32（统计卡片增强）
T-16 → T-17 → T-33（进度卡增强 + 改 Table）
T-18 → T-19（TodoList Tabs 改造）
T-20 → T-21 → T-22 → T-23（BA仪表盘增强）
T-24 → T-25（项目经理仪表盘增强）
T-26 → T-27（月历增强）
```

### Batch 3：P3 视觉打磨（预估 0.5 天）

```
T-28 → T-29 → T-30 → T-34（全局完善）
```

---

## 六、文件改动清单

### 后端改动

| 文件 | 改动内容 | 关联待办 |
|------|---------|---------|
| `apps/server/src/modules/trains/services/train.service.ts` | `getScheduleProgress` 增加 Requirement 聚合 + TrainSystemSnapshot 聚合 | T-07, T-08 |
| `apps/server/src/modules/requirements/service.ts` | `getMyTodos` 增加 TECH_MGR / TEST_MGR 分支 | T-11 |

### 共享类型改动

| 文件 | 改动内容 | 关联待办 |
|------|---------|---------|
| `packages/shared/src/types/dashboard.ts` | `ScheduleProgressItem` 增加 scheduleName / status / boardingDate / lockdownDate 字段对齐 | T-09 |

### 前端改动

| 文件 | 改动内容 | 关联待办 |
|------|---------|---------|
| `apps/web/src/pages/dashboard/index.tsx` | 改为角色路由分发组件 | T-01 |
| `apps/web/src/components/dashboard/RoleSelector.tsx` | **新建** — 角色切换器组件 | T-02 |
| `apps/web/src/pages/dashboard/pm.tsx` | **新建** — 产品经理仪表盘 | T-03 |
| `apps/web/src/pages/dashboard/train-admin.tsx` | **新建** — 火车管理员仪表盘 | T-04 |
| `apps/web/src/pages/dashboard/tech-mgr.tsx` | **新建** — 技术经理仪表盘（含 Kanban） | T-05 |
| `apps/web/src/pages/dashboard/test-mgr.tsx` | **新建** — 测试负责人仪表盘 | T-06 |
| `apps/web/src/components/dashboard/StatusStatCards.tsx` | 改为 5 卡 + 子标题 + hover + 跳转 | T-13~T-15, T-31, T-32 |
| `apps/web/src/components/dashboard/ScheduleProgressCard.tsx` | 增加容量列 + 需求进度列 + Table 布局 | T-16, T-17, T-33 |
| `apps/web/src/components/dashboard/TodoList.tsx` | 改为 Tabs + Table + 分页 | T-18, T-19 |
| `apps/web/src/components/dashboard/TodoList.tsx` | 紧急变更项增加通过/驳回按钮 | T-10 |
| `apps/web/src/pages/dashboard/ba.tsx` | 增加 Alert + 快速操作区 + Timeline + 就绪需求列表 | T-20~T-23 |
| `apps/web/src/pages/dashboard/pm.tsx` | 改为项目经理仪表盘（布局改造 + 依赖风险） | T-24, T-25 |
| `apps/web/src/components/dashboard/CalendarView.tsx` | 增加火车切换器 + 班次范围底色 + 说明栏 | T-26, T-27, T-34 |
| `apps/web/src/layouts/MainLayout.tsx` | 顶栏增加"当前班次"信息 | T-28 |
| `apps/web/src/layouts/MainLayout.tsx` | 侧边栏增加圆点指示器 | T-29 |
| `apps/web/src/App.tsx` | 注册新增仪表盘路由 | T-03~T-06 |

---

## 七、测试策略

| 待办批次 | 测试重点 | 测试方法 |
|---------|---------|---------|
| Batch 1（后端） | `getScheduleProgress` 返回值正确性 | 单元测试：mock Prisma 检查聚合逻辑 |
| Batch 1（后端） | `getMyTodos` 角色分支覆盖率 | 单元测试：每个角色分支至少一个 case |
| Batch 1（前端） | 角色切换器切换正确性 | 组件测试：点击按钮检查仪表盘显示和侧边栏更新 |
| Batch 1（前端） | 4 个新仪表盘页面渲染 | 集成测试：mock API 响应，检查 Table/Card/Kanban 布局 |
| Batch 2 | 统计卡片数据映射 | 组件测试：传入 mock 数据断言 5 卡值正确 |
| Batch 2 | TodoList Tabs 切换 | 组件测试：点击 Tab 检查内容切换 |
| Batch 2 | 紧急变更审批按钮 | 交互测试：点击通过/驳回，断言 API 调用 |
| Batch 3 | 视觉样式 | 视觉回归：与原型截图对比 |