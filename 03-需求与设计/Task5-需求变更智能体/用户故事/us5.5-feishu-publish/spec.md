# US5.5 飞书发布 + 消息卡片 规格

## Why

需求变更智能体分析结果需要通过飞书交互式卡片传递给群聊成员，支持一键确认或拒绝变更，形成闭环的需求变更确认流程。

## What Changes

- 智能体发布到飞书（Coze 平台飞书渠道配置）
- 飞书消息卡片模板（交互式卡片，含确认/拒绝按钮）
- 按钮回调 → Coze → 调用确认接口更新变更单状态

## Impact

- Affected specs：T5 需求变更智能体（依赖 US5.4）
- Affected code：Coze 平台 + 飞书开放平台（无代码仓库变更）

## ADDED Requirements

### Requirement: 飞书交互式卡片

智能体 SHALL 在检测到变更后发送交互式消息卡片到群聊。

#### Scenario: 卡片内容
- **WHEN** 变更分析完成
- **THEN** 卡片展示：系统名称、关联需求、变更内容列表、影响评估（工作量/进度/风险）、确认/拒绝按钮

#### Scenario: 点击确认
- **WHEN** 用户点击「✅ 确认变更」按钮
- **THEN** 回调触发 Coze 工作流 → 调用 POST /api/plugin/change-requests/:id/confirm → 变更单状态变为 CONFIRMED

#### Scenario: 点击拒绝
- **WHEN** 用户点击「❌ 拒绝」按钮
- **THEN** 回调触发 Coze 工作流 → 调用 POST /api/plugin/change-requests/:id/confirm（action=reject）→ 变更单状态变为 REJECTED

### Requirement: 飞书渠道发布

智能体 SHALL 通过飞书渠道发布，支持群聊 @ 触发。

#### Scenario: @智能体触发
- **WHEN** 用户在飞书群聊 @需求变更助手 并发送变更讨论
- **THEN** 智能体响应，执行变更检测流程
