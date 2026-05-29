# US5.2 需求详情-变更记录展示 规格

## Why

BA 和项目经理在查看需求详情时需要了解该需求历史上发生过哪些变更（AI 检测或人工记录），以及每次变更的影响评估和确认状态，以便全面掌握需求的演变过程。

## What Changes

- 需求详情页新增「变更记录」卡片，位于「操作历史」Timeline 下方
- 复用现有 Timeline 组件展示变更记录时间线
- 区分 Coze 智能体来源和人工来源的变更
- 前端新增 getChangeRequests API 调用

## Impact

- Affected specs：T5 需求变更智能体（依赖 US5.1 API）
- Affected code：
  - `apps/web/src/pages/requirements/detail.tsx`
  - `apps/web/src/services/requirement.ts`
  - `packages/shared/src/types/`

## ADDED Requirements

### Requirement: 变更记录区域展示

系统 SHALL 在需求详情页操作历史下方展示变更记录卡片，使用 Timeline 组件按时间倒序排列。

#### Scenario: 有变更记录时
- **WHEN** 需求存在变更记录（ChangeRequest）
- **THEN** 卡片标题显示「变更记录（N）」，Timeline 展示每条变更的来源标签、状态标签、摘要、影响评估和时间

#### Scenario: 无变更记录时
- **WHEN** 需求从未发生过变更
- **THEN** 卡片内显示「暂无变更记录」空态提示

#### Scenario: Coze 智能体来源的变更
- **WHEN** 变更记录 source=coze
- **THEN** 显示紫色「Coze 智能体」标签

#### Scenario: 人工来源的变更
- **WHEN** 变更记录 source=manual
- **THEN** 显示蓝色「人工」标签

### Requirement: 变更状态标签

系统 SHALL 根据变更单状态显示不同颜色的标签。

#### Scenario: 待确认状态
- **WHEN** status=PENDING
- **THEN** 显示橙色「待确认」标签

#### Scenario: 已确认状态
- **WHEN** status=CONFIRMED
- **THEN** 显示绿色「已确认」标签

#### Scenario: 已拒绝状态
- **WHEN** status=REJECTED
- **THEN** 显示默认色「已拒绝」标签
