# Task7: 四大模块导览步骤设计

**版本号**: v1.0
**日期**: 2026-06-06
**状态**: 待审核
**依赖**: [RT-Task7-用户导览功能-设计方案_v1.0_20260606.md](./RT-Task7-用户导览功能-设计方案_v1.0_20260606.md)
**现有配置**: [config.ts](../../release-train/apps/web/src/tour/config.ts)

---

## 设计原则

1. **通用导览，角色话术**：每个页面一套导览步骤，所有角色看到相同步骤，话术中说明角色权限差异
2. **跨页跳转**：导览步骤中包含 `navigate` 指令，引导用户从一个页面跳转到另一个页面
3. **目标元素**：优先高亮现有 DOM `id`，缺的用 CSS 选择器，确保每个步骤有唯一挂载点
4. **不影响现有 US7.1/US7.2**：通用导览和角色导览保持不变，本设计作为 US7.3 功能点导览的细化

---

## 一、T仪表盘导览（`/dashboard`）

### 1.1 导览步骤

```
步骤1: 页面标题区
  target:  #main-navigation
  title:   工作台仪表盘
  content: 这里是你的个人工作台，展示了与你角色相关的需求统计、待办事项和关键节点。
           根据你的角色，看到的数据内容会不同：
           · BA：看到自己创建的需求统计
           · PM/项目经理/技术经理：看到待评审需求
           · 火车管理员：看到待纳版需求、变更率监控
  position: bottom

步骤2: 系统筛选器
  target:  #dashboard-system-filter
  title:   系统筛选
  content: 通过这里切换系统，仪表盘的所有数据会跟着变。
           默认显示你所属的系统。
           · BA/PM/技术经理：只能看到自己所属系统的数据
           · 火车管理员/超管：可以看到所有系统的数据
  position: bottom

步骤3: 统计卡片区
  target:  #dashboard-stats
  title:   需求统计
  content: 一眼看清各状态的需求数量：
           · 草稿：BA创建但未提交评审的需求
           · 待评审：等待PM/技术经理审核的需求
           · 已就绪：评审通过，等待纳版的需求
           · 已纳版：已分配到班次的需求
           点击任意卡片可直接跳转到需求池对应的筛选列表。
  position: bottom

步骤4: 待办列表区
  target:  #dashboard-todos
  title:   待处理事项
  content: 这里列出你当前需要处理的事项：
           · BA：审核拒绝的需求需重新编辑；变更通过后需重新提交
           · PM/项目经理/技术经理：待评审需求列表，点击进入评审
           · 火车管理员：待纳版和待投产需求列表，可使用AI智能纳版
  position: top

步骤5: 关键节点区
  target:  #dashboard-key-dates
  title:   关键节点倒计时
  content: 未来14天内即将到来的重要日期——纳版截止、SIT开始、封板、投产，按紧迫程度排列。
           所有角色都可以看到自己相关需求的关键节点。
  position: top

步骤6: 班次选择器
  target:  #dashboard-schedule-select
  title:   班次筛选
  content: 火车管理员可以切换不同班次，查看该班次的统计数据和变更率。
           选择班次后，统计卡片和变更率会自动更新。
           其他角色此选择器不显示。
  position: bottom

步骤7: 变更率监控
  target:  #dashboard-change-rate
  title:   班次变更率监控
  content: 变更率 = (变更需求数 / 已纳版需求数) × 100%
           · 绿色 <10% → 变更率健康
           · 黄色 10%-20% → 需关注
           · 红色 >20% → 需要干预
           点击卡片可查看变更详情列表。
           仅火车管理员和超管可见。
  position: bottom

步骤8: 变更类型分布
  target:  #dashboard-change-type-stats
  title:   变更类型分布
  content: 展示当前班次的变更类型分布：
           · 普通变更（封板前）：正常变更流程，BA可直接提交
           · 紧急变更（封板后）：需要项目经理审批
           紧急变更比例过高会影响发布质量，需要重点关注。
           仅火车管理员和超管可见。
  position: top
```

### 1.2 跳转到需求池

```
步骤-跳转:
  target:  body
  title:   下一步：需求池
  content: 接下来我们去看看需求管理的核心——需求池。
  spotlightClicks: true
  // 回调中 navigate('/requirements')
```

---

## 二、需求池导览（`/requirements`）

### 2.1 导览步骤

```
步骤1: 页面标题 + 操作区
  target:  .rt-page-header
  title:   需求池
  content: 需求池是需求全生命周期管理中心，在这里录入、筛选、评审和跟踪所有需求。
           不同角色有不同的操作权限：
           · BA：创建、编辑、发起评审、需求变更
           · PM/项目经理/技术经理：评审通过/驳回
           · 火车管理员：纳版、AI智能纳版
  position: bottom

步骤2: 新增需求按钮
  target:  .rt-page-header 内的 button（含 PlusOutlined 图标）
  title:   新增需求
  content: 点击这里创建新需求。填写标题、描述、归属系统、优先级、工作量等必填信息后提交。
           仅BA和超管可以创建需求。
  position: left

步骤3: 筛选区域
  target:  #req-filter-bar
  title:   多维筛选
  content: 支持按系统、状态、关键词筛选需求。状态可多选，关键词模糊匹配标题。
           筛选条件变化后列表自动刷新。
           · BA：默认筛选自己创建的需求
           · PM/项目经理/技术经理：默认筛选待评审需求
           · 火车管理员：默认筛选已就绪需求（待纳版）
  position: bottom

步骤4: 需求列表表格
  target:  #req-table
  title:   需求列表
  content: 展示所有需求的标题、系统、优先级、状态、工作量、BA、创建时间。
           点击行跳转需求详情；表头点击可排序（优先级、工作量、创建时间）。
           不同状态显示不同颜色标签。
  position: top

步骤5: 操作按钮矩阵
  target:  #req-table 内第一行操作列
  title:   操作按钮
  content: 根据需求当前状态和你的角色权限，显示不同的操作按钮：
           · 草稿 → 编辑 / 发起评审（BA）
           · 待评审 → 通过评审 / 驳回（PM/项目经理/技术经理）
           · 已就绪 → 纳版 / AI智能纳版（火车管理员）
           · 已纳版 → 子状态变更 / 需求变更（BA）
           · 变更审批 → 通过 / 驳回（项目经理）
  position: left
```

### 2.2 跳转到需求详情

```
步骤-跳转:
  target:  body
  title:   下一步：需求详情
  content: 点击需求标题进入详情页，查看完整信息、AI审查结果、变更历史。
  spotlightClicks: true
  // 回调中 navigate('/requirements/:id')
```

---

## 三、需求详情页导览（`/requirements/:id`）

### 3.1 导览步骤

```
步骤1: 需求基础信息
  target:  .rt-page-header
  title:   需求详情
  content: 展示需求的完整信息：标题、描述、系统、优先级、工作量、BA、创建时间。
           不同角色有不同的操作权限：
           · BA：编辑、发起评审、需求变更
           · PM/项目经理/技术经理：评审通过/驳回
           · 火车管理员：纳版、AI智能纳版
  position: bottom

步骤2: 需求状态时间线
  target:  #req-status-timeline
  title:   状态时间线
  content: 展示需求的状态流转历史：
           草稿 → 待评审 → 已就绪 → 已纳版 → DEV → SIT → UAT → 封板 → 投产
           每个状态节点显示操作人和时间。
  position: right

步骤3: AI 审查结果卡片
  target:  #req-ai-review-card
  title:   AI 审查结果
  content: 展示 BA 提交前的 AI 审查结果：
           · 评分（满分100分）
           · 问题列表
           · 优化建议
           帮助评审人快速了解需求质量。
           仅在需求经过 AI 审查后显示。
  position: bottom

步骤4: 需求变更按钮
  target:  #req-change-btn
  title:   需求变更
  content: 已就绪或已纳版的需求可以发起变更。
           点击「需求变更」进入变更流程。
           · BA：可发起普通变更（封板前）和紧急变更（封板后）
           · 项目经理：审批紧急变更
           仅在需求状态允许变更时显示。
  position: left

步骤5: 变更历史 Tab
  target:  #req-change-history-tab
  title:   变更历史
  content: 点击查看该需求的所有变更记录：
           · 变更时间、变更类型、变更原因
           · 变更前后的内容对比
           · 审批人、审批时间（紧急变更）
           仅在有变更历史时显示。
  position: bottom
```

---

## 四、AI 需求审查导览（需求创建/编辑页）

> **入口**: 需求创建页 `/requirements/new` 或编辑页 `/requirements/:id/edit` 的「AI 审查」按钮
> **核心能力**: Coze AI 自动审查需求质量，检查用户故事格式、验收条件、工作量合理性

### 4.1 导览步骤

```
步骤1: AI 审查按钮
  target:  表单底部含 RobotOutlined 图标的 Button
  title:   AI 需求审查
  content: 点击「AI 审查」，Coze AI 会自动检查你填写的需求质量。
           审查前请先填好标题、描述、系统、优先级和工作量等必填项。
           所有角色都可以使用 AI 审查功能。
  position: top

步骤2: AI 审查过程
  target:  .ant-modal
  title:   AI 正在分析...
  content: AI 会逐项检查：
           · 用户故事格式是否规范
           · 需求描述是否清晰完整
           · 验收条件是否明确
           · 工作量点数是否合理
  position: bottom

步骤3: AI 审查报告 — 评分
  target:  .ant-modal 内的分数区域
  title:   AI 评分
  content: 满分100分，综合本地规则（20%）和 AI 分析（80%）评分。
           · ≥80分 → 通过，可放心提交评审
           · 60-79分 → 需改进，建议按 AI 建议优化
           · <60分 → 问题较多，需重点修改
  position: bottom

步骤4: AI 审查报告 — 优化建议
  target:  .ant-modal 内的「AI 优化建议」区域
  title:   AI 优化标题和描述
  content: AI 会给出优化后的标题和描述建议，点击「应用建议」可自动填入表单。
           还会列出具体问题列表和最佳实践建议，帮助提升需求质量。
  position: top

步骤5: AI 审查报告 — 验收条件
  target:  .ant-modal 内的「验收条件」折叠面板
  title:   AI 建议验收条件
  content: AI 根据需求描述自动生成验收条件建议，可以直接用于后续测试。
           点击「应用建议」将标题、描述和验收条件一并填入表单。
  position: top
```

---

## 五、需求变更导览

> **入口**: 需求详情页 `/requirements/:id` 的「需求变更」按钮
> **核心能力**: 普通变更（封板前）、紧急变更（封板后）、变更审批流程

### 5.1 导览步骤

```
步骤1: 需求变更按钮
  target:  #req-change-btn
  title:   需求变更
  content: 已就绪或已纳版的需求可以发起变更。
           点击「需求变更」进入变更流程。
           · BA：可发起变更
           · 项目经理：可审批紧急变更
  position: left

步骤2: 变更类型选择
  target:  变更 Modal 内的变更类型 Radio
  title:   变更类型
  content: 选择变更类型：
           · 普通变更：封板日期前，正常变更流程，BA提交后直接生效
           · 紧急变更：封板日期后，需要项目经理审批
           系统会根据当前日期和班次封板日期自动判断。
  position: bottom

步骤3: 变更原因填写
  target:  变更 Modal 内的变更原因 TextArea
  title:   变更原因
  content: 详细填写变更原因，包括：
           · 变更背景和触发因素
           · 变更影响范围
           · 变更后的新内容
           变更原因会记录在需求变更历史中。
  position: top

步骤4: 提交变更
  target:  变更 Modal 内的「提交变更」按钮
  title:   提交变更
  content: 提交后：
           · 普通变更 → 直接生效，需求状态更新，变更率+1
           · 紧急变更 → 进入待审批状态，等待项目经理审批
  position: top

步骤5: 变更审批（项目经理专属）
  target:  需求详情页的审批按钮区
  title:   审批操作
  content: 项目经理查看变更详情后，可以：
           · 通过 → 变更生效，需求状态更新，紧急变更率+1
           · 驳回 → 变更取消，需求保持原状态
           仅项目经理角色可见审批按钮。
  position: left
```

---

## 六、月历视图导览（`/calendar`）

### 6.1 导览步骤

```
步骤1: 页头 + 火车筛选
  target:  #calendar-train-select
  title:   月历视图
  content: 月历视图用双月日历展示所有版本火车的班次时间线，直观对比多个火车的并行节奏。
           顶部的下拉框可切换查看不同火车。
           所有角色都可以查看月历视图。
  position: bottom

步骤2: 左月历
  target:  #calendar-left
  title:   当月日历
  content: 彩色横条代表班次的时间跨度，从班次的开始日期到结束日期。
           不同班次用不同颜色区分，重叠时自动分行。
  position: top

步骤3: 里程碑标记
  target:  .rt-page 内日历中第一个 Tag 标记
  title:   关键里程碑
  content: 日历上的标记点表示班次的关键节点：
           · 蓝标「纳版」= 纳版截止日期
           · 橙标「封板」= 需求冻结日期
           · 绿标「投产」= 统一上线日期
           所有角色都可以看到里程碑标记。
  position: bottom

步骤4: 右月历
  target:  #calendar-right
  title:   次月日历
  content: 右侧展示次月的班次排布，跨月班次的色条会自动延伸到下月。
           使用左右箭头切换查看其他月份。
  position: top

步骤5: 左下进度列表
  target:  .rt-page 内日历下方的列表区域
  title:   班次进度概览
  content: 这里列出当前筛选条件下所有班次的进度条和状态标签，一目了然。
           点击班次可跳转查看详情。
  position: top
```

### 6.2 跳转到版本火车

```
步骤-跳转:
  target:  body
  title:   下一步：版本火车管理
  content: 现在去看看版本火车的创建和管理。
  spotlightClicks: true
  // 回调中 navigate('/trains')
```

---

## 七、版本火车导览（`/trains`）

### 7.1 导览步骤

```
步骤1: 页面标题
  target:  .rt-page-header
  title:   版本火车列表
  content: 版本火车是一个固定周期的发布计划容器，包含参与系统、团队容量和关键节点。
           每个火车可以创建多个班次（发布窗口）。
           仅火车管理员和超管可以管理火车。
  position: bottom

步骤2: 创建火车按钮
  target:  .rt-page-header 内的「创建火车」按钮
  title:   创建版本火车
  content: 新建一个版本火车，设置名称和描述，然后选择搭载系统并配置团队容量（1-500点）。
           系统会检查所选系统是否已在其他进行中的火车中。
  position: left

步骤3: 火车列表表格
  target:  #train-table
  title:   火车概览
  content: 展示所有已创建的版本火车，包含名称、搭载系统数、容量、班次数。
           点击火车名称进入详情。
  position: top

步骤4: 火车详情（若有数据行）
  target:  #train-table 内第一行「查看」按钮
  title:   火车详情页
  content: 详情页展示搭载系统的容量使用率（进度条）、班次列表入口和已纳版需求汇总。
           可以编辑火车信息（乐观锁防冲突）或取消火车（仅计划中且无纳版需求时）。
  position: left
```

---

## 八、班次列表导览（`/schedules`）

### 8.1 导览步骤

```
步骤1: 页头 + 火车筛选
  target:  .rt-page-header
  title:   版本火车 — 班次列表
  content: 这里展示所有班次，可以按火车筛选查看。
           班次是火车的具体发布窗口，有明确的起止日期和关键节点。
           所有角色都可以查看班次列表。
  position: bottom

步骤2: 新增班次按钮
  target:  .rt-page-header 内的「创建班次」按钮
  title:   创建班次
  content: 为一个版本火车创建新的班次（发布窗口）。
           设置起止日期后，系统可自动推算纳版截止、封板、投产等关键节点。
           仅火车管理员和超管可以创建班次。
  position: left

步骤3: 班次列表表格
  target:  #schedule-table
  title:   班次概览
  content: 每行显示班次名称、所属火车、起止日期、状态、搭载系统数、已纳版需求数。
           点击行跳转班次详情，可查看完整的关键日期时间线。
  position: top

步骤4: 管理火车按钮
  target:  .rt-page-header 内的「管理火车」按钮
  title:   管理版本火车
  content: 点击进入火车列表，可以创建新火车、配置搭载系统和团队容量。
           每个火车可创建多个班次。
  position: bottom
```

---

## 九、班次详情页导览（`/schedules/:id`）

### 9.1 导览步骤

```
步骤1: 班次基础信息
  target:  .rt-page-header
  title:   班次详情
  content: 这里展示班次名称、所属火车、起止日期、状态等基础信息。
           状态包括：计划中、进行中、已封板、已投产、已取消。
           所有角色都可以查看班次详情。
  position: bottom

步骤2: 关键节点时间线
  target:  #schedule-timeline
  title:   关键节点时间线
  content: 时间线展示班次的所有关键日期：
           · 纳版截止：需求提交截止时间
           · SIT 开始：系统集成测试开始
           · 封板日期：需求冻结，不再接受变更
           · UAT 开始：用户验收测试开始
           · 投产日期：正式上线发布
           点击节点可编辑日期（仅火车管理员，且班次状态为计划中时可编辑）。
  position: bottom

步骤3: 搭载系统容量
  target:  #schedule-systems
  title:   搭载系统容量
  content: 展示班次搭载的所有系统及其容量使用情况：
           · 总容量（来自火车配置）
           · 已用容量（已纳版需求工作量之和）
           · 剩余容量
           进度条颜色：绿色<70%、黄色70%-90%、红色>90%。
  position: top

步骤4: 已纳版需求列表
  target:  #schedule-requirements
  title:   已纳版需求
  content: 展示所有已纳版到当前班次的需求，包含：
           · 需求标题、系统、优先级、工作量
           · 子状态（DEV/SIT/UAT/封板/投产）
           · 变更标记（如有变更会显示变更类型）
           点击需求行可跳转需求详情。
  position: top

步骤5: 变更统计卡片
  target:  #schedule-change-stats
  title:   变更统计
  content: 展示当前班次的变更数据：
           · 变更率 = 变更需求数 / 已纳版需求数
           · 普通变更数（封板前）
           · 紧急变更数（封板后）
           变更率>20%会标红预警。
           所有角色都可以查看变更统计。
  position: bottom

步骤6: AI 智能纳版按钮
  target:  #schedule-smart-onboard-btn
  title:   AI 智能纳版
  content: 点击「AI 智能纳版」，系统会自动推荐最适合当前班次的待纳版需求。
           AI 会考虑系统容量、优先级、依赖关系等因素，生成推荐列表。
           仅火车管理员和超管可见此按钮。
  position: left
```

---

## 十、AI 智能纳版导览（班次详情页 Modal）

> **入口**: 班次详情页 `/schedules/:id` 的「AI 智能纳版」按钮
> **核心能力**: AI 推荐需求、容量校验、批量纳版

### 10.1 导览步骤

```
步骤1: 推荐需求列表
  target:  .ant-modal 内的推荐列表
  title:   AI 推荐需求
  content: AI 根据以下因素推荐需求：
           · 优先级（P0/P1优先）
           · 工作量（剩余容量足够）
           · 系统平衡（避免单系统过载）
           · 依赖关系（前置需求已纳版）
           勾选要纳版的需求。
  position: bottom

步骤2: 容量校验
  target:  .ant-modal 内的容量提示区域
  title:   容量校验
  content: AI 会实时校验勾选需求的总工作量是否超出剩余容量。
           · 绿色 = 容量充足
           · 红色 = 容量不足，需减少需求
  position: top

步骤3: 确认纳版
  target:  .ant-modal 内的「确认纳版」按钮
  title:   确认纳版
  content: 确认后，勾选的需求会批量更新状态为「已纳版」，并关联到当前班次。
           需求详情页会显示纳版信息。
  position: top
```

---

## 实现要点

### DOM 挂载点需要新增

当前页面缺少 `id` 属性，需在以下组件/元素上添加：

| 页面 | 需要新增的 id | 对应元素 |
|------|--------------|---------|
| dashboard | `#dashboard-system-filter` | SystemSelector 的 Select |
| dashboard | `#dashboard-stats` | 统计卡片行容器 |
| dashboard | `#dashboard-todos` | 待办列表卡片 |
| dashboard | `#dashboard-key-dates` | 关键节点卡片 |
| dashboard | `#dashboard-schedule-select` | 班次选择器 |
| dashboard | `#dashboard-change-rate` | 变更率卡片 |
| dashboard | `#dashboard-change-type-stats` | 变更类型分布 |
| requirements | `#req-table` | 需求表格容器 |
| requirements | `#req-filter-bar` | 筛选区域容器 |
| requirement-detail | `#req-status-timeline` | 状态时间线 |
| requirement-detail | `#req-ai-review-card` | AI 审查结果卡片 |
| requirement-detail | `#req-change-btn` | 需求变更按钮 |
| requirement-detail | `#req-change-history-tab` | 变更历史 Tab |
| calendar | `#calendar-train-select` | 火车下拉筛选 |
| calendar | `#calendar-left` | 左月历容器 |
| calendar | `#calendar-right` | 右月历容器 |
| schedules | `#schedule-table` | 班次表格 |
| schedule-detail | `#schedule-timeline` | 关键节点时间线 |
| schedule-detail | `#schedule-systems` | 搭载系统容量区 |
| schedule-detail | `#schedule-requirements` | 已纳版需求列表 |
| schedule-detail | `#schedule-change-stats` | 变更统计卡片 |
| schedule-detail | `#schedule-smart-onboard-btn` | AI 智能纳版按钮 |
| trains | `#train-table` | 火车表格 |

### 跨页跳转实现

导览步骤中需要跨页跳转时，在步骤的 callback 中执行 `navigate(xxx)`：

```typescript
// config.ts 中扩展 TourStep
export interface TourStep {
  // ... 原有字段
  onBeforeShow?: () => void;  // 步骤显示前回调，用于 navigate
}
```

在 TourProvider 中监听 `EVENTS.STEP_BEFORE`，调用对应回调。

### 现有配置保留

本设计**不替换** [config.ts](../../release-train/apps/web/src/tour/config.ts) 中已有的 `generalTour`、`baTour`、`pmTour`、`trainAdminTour`。
新增页面级导览作为 `featureTours` 的一部分，追加到 `getTourConfigs()` 中：

```typescript
export const dashboardTour: TourConfig = { ... }
export const requirementsTour: TourConfig = { ... }
export const requirementDetailTour: TourConfig = { ... }
export const calendarTour: TourConfig = { ... }
export const trainsTour: TourConfig = { ... }
export const schedulesTour: TourConfig = { ... }
export const scheduleDetailTour: TourConfig = { ... }
```

每人每页面只自动触发一次，之后通过右上角「帮助」按钮手动触发。

---

*来源：现有代码 + US7.3功能点导览需求 + 四大模块用户故事*
*审核后进入编码阶段*