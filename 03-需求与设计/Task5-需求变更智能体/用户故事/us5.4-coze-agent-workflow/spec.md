# US5.4 Coze 智能体 Prompt + 工作流 规格

## Why

业务 BA 和产品经理在飞书群聊中讨论需求变更时，希望智能体自动检测变更内容、对比存量需求、评估影响并创建变更单，减少人工记录和同步的成本。

## What Changes

- Coze 平台配置「需求变更助手」智能体
- 设计 5 步工作流：参数提取 → 查询系统 → 查询需求 → 变更分析 → 创建变更单
- 编写系统提示词和参数提取节点提示词
- 配置插件调用（US5.3 的 4 个接口）

## Impact

- Affected specs：T5 需求变更智能体（依赖 US5.3 插件 API）
- Affected code：Coze 平台（无代码）

## ADDED Requirements

### Requirement: 参数提取

智能体 SHALL 从用户对话中提取系统名称、需求关键词和对话原文。

#### Scenario: 正常提取
- **WHEN** 用户发送含【系统】标签的消息
- **THEN** 智能体提取 systemName、keywords、conversation

#### Scenario: 缺少系统名
- **WHEN** 用户消息不含【系统】标签
- **THEN** 智能体回复"请使用【系统】XXX 格式指定系统名称"

### Requirement: 变更检测与分析

智能体 SHALL 对比对话内容和存量需求，识别变更类型，评估工作量/进度/风险影响。

#### Scenario: 检测到变更
- **WHEN** 对话描述了明确的字段变更（如新增功能、修改范围）
- **THEN** 智能体生成变更摘要和影响评估

#### Scenario: 未检测到变更
- **WHEN** 对话仅为讨论，无明确变更意图
- **THEN** 智能体回复"未检测到需求变更"

### Requirement: 创建变更单并输出

智能体 SHALL 调用插件 API 创建变更单，并生成结构化 Markdown 摘要和飞书确认卡片。

#### Scenario: 变更确认流程
- **WHEN** 检测到变更并分析完成
- **THEN** 创建 ChangeRequest → 输出变更分析 → 发送飞书确认卡片（含确认/拒绝按钮）

## Coze 工作流节点

```
[开始] → [参数提取] → [插件:getSystems] → [插件:getRequirements]
  → [LLM 变更分析] → {有变更?}
    ├─ 否 → [回复: 未检测到变更]
    └─ 是 → [插件:createChangeRequest] → [飞书卡片] → [回复]
```
