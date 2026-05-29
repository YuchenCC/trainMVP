# US6.2 审查结果展示 规格

## Why

AI 审查完成后，需要清晰直观地展示审查结果给用户。评分、问题、建议、验收条件等信息需要分类展示，方便 BA 快速理解并修改需求。同时支持一键复制验收条件和优化建议。

## What Changes

- 审查 Modal 设计：评分头部卡片 + AI优化建议区 + Tabs 布局
- 评分头部：渐变色卡片 + 圆形评分 badge，按通过/需改进/问题较多三种状态
- Tabs：问题（按严重程度分组）+ 建议（蓝色编号列表）+ 验收条件（绿色勾号列表）
- 复制按钮：合并复制优化建议和验收条件
- 审查中 loading 动画

## Impact

- Affected specs：T6 US6.1 AI需求审查
- Affected code：
  - `apps/web/src/components/requirements/RequirementForm.tsx`

## ADDED Requirements

### Requirement: 审查中状态

系统 SHALL 在调用审查 API 期间展示 loading 动画，包含检查进度提示。

#### Scenario: 审查 loading 展示
- **WHEN** 点击 AI 审查且 API 调用中
- **THEN** Modal 展示 4 步检查进度：标题检查 → 用户故事格式 → 验收条件 → 优先级与工作量，每步带 Spin 动画。Modal 不可关闭。

### Requirement: 评分头部卡片

系统 SHALL 在审查结果顶部展示评分头部卡片，根据分数显示不同颜色。

#### Scenario: 审查通过（≥60 分）
- **WHEN** 综合评分 ≥ 60
- **THEN** 绿色渐变背景，白色圆形 badge 显示分数，文字"审查通过"，边框色 #10b981

#### Scenario: 需要改进（40-59 分）
- **WHEN** 综合评分 40-59
- **THEN** 黄色渐变背景，白色圆形 badge 显示分数，文字"需要改进"

#### Scenario: 问题较多（<40 分）
- **WHEN** 综合评分 < 40
- **THEN** 红色渐变背景，文字"问题较多"，显示问题数量

### Requirement: AI 优化建议区

系统 SHALL 在审查结果中展示 AI 优化后的标题和描述（紫色渐变卡片）。

#### Scenario: AI 返回优化标题
- **WHEN** optimizedTitle 有值
- **THEN** 紫色卡片顶部展示 ✨ AI 优化建议 标签 + 优化标题

#### Scenario: AI 返回优化描述
- **WHEN** optimizedDescription 有值
- **THEN** 卡片内展示完整优化描述，maxHeight 240px 可滚动

### Requirement: 问题 Tab

系统 SHALL 按严重程度分组展示审查发现的问题，每项包含问题描述和改进建议。

#### Scenario: 严重问题（high）
- **WHEN** issue.severity = high
- **THEN** 红色背景 + 红色左边框 + "严重"标签

#### Scenario: 中等问题（medium）
- **WHEN** issue.severity = medium
- **THEN** 黄色背景 + 黄色左边框 + "中等"标签

#### Scenario: 轻微问题（low）
- **WHEN** issue.severity = low
- **THEN** 蓝色背景 + 蓝色左边框 + "轻微"标签

#### Scenario: Tab 标签数量
- **WHEN** 存在问题
- **THEN** Tab 标签显示为 ⚠️ 问题 (N)

### Requirement: 建议 Tab

系统 SHALL 以蓝色编号圆圈列表展示 AI 优化建议。

#### Scenario: 有建议时
- **WHEN** suggestions 数组有值
- **THEN** 每条建议前显示蓝色圆圈编号，Tab 标签显示为 💡 建议 (N)

### Requirement: 验收条件 Tab

系统 SHALL 以绿色勾号列表展示 AI 建议的验收条件。

#### Scenario: 有验收条件时
- **WHEN** acceptanceCriteria 数组有值
- **THEN** 每条验收条件前显示绿色 CheckCircleOutlined 图标，Tab 标签显示为 ✅ 验收条件 (N)

### Requirement: 复制按钮

系统 SHALL 在 Modal Footer 提供复制按钮，合并复制优化建议和验收条件。

#### Scenario: 有验收条件时点击复制
- **WHEN** acceptanceCriteria 有值，点击"复制建议和验收条件"
- **THEN** 复制内容 =【优化建议】+ 编号列表 + 空行 +【验收条件】+ 编号列表。Toast 提示"建议和验收条件已复制"

#### Scenario: 无验收条件时
- **WHEN** AI 降级，无 acceptanceCriteria
- **THEN** 复制按钮不显示

### Requirement: Modal 关闭

系统 SHALL 允许用户通过多种方式关闭审查结果 Modal。

#### Scenario: 点击「我知道了」
- **WHEN** 点击 Footer 的"我知道了"按钮
- **THEN** Modal 关闭，表单状态保留

#### Scenario: 点击遮罩或 X
- **WHEN** 点击 Modal 外部遮罩或右上角 X
- **THEN** Modal 关闭
