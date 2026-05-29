# US6.1 AI需求审查 规格

## Why

当前需求提交评审前缺乏前置自动质量检测环节，大量存在格式错误、描述模糊、缺失验收条件等问题的需求直接进入评审流程，导致人工评审耗时久、返工率高。需要在需求创建时提供 AI 智能审查能力，从源头提升需求质量。

## What Changes

- 需求表单新增「AI 审查」按钮，提交评审前可触发自动质量检查
- 后端新增需求审查服务：本地规则审查（7 项检查）+ Coze AI 审查
- 审查结果含评分、问题列表、优化建议、优化标题/描述、验收条件
- AI 审查不可用时自动降级到本地规则审查
- 共享类型包新增 ReviewIssue/ReviewIssueType/ReviewResult

## Impact

- Affected specs：T1 需求池管理（需求创建/编辑流程）
- Affected code：
  - `apps/server/src/modules/requirement-review/`
  - `apps/server/src/common/coze/`
  - `apps/web/src/components/requirements/RequirementForm.tsx`
  - `apps/web/src/services/requirement.ts`
  - `packages/shared/src/types/review.ts`
  - `packages/shared/src/constants/`

## ADDED Requirements

### Requirement: AI 审查按钮

系统 SHALL 在需求表单中提供「AI 审查」按钮，允许用户在提交评审前检查需求质量。

#### Scenario: 必填项未填时点击
- **WHEN** 需求标题/描述/系统/优先级/故事点数任一为空
- **THEN** Toast 提示"请先填写必填项后再进行 AI 审查"

#### Scenario: 表单完整时点击
- **WHEN** 表单必填项已填写完毕
- **THEN** 弹出审查 Modal，显示 loading 动画，调用后端审查 API

### Requirement: 本地规则审查

系统 SHALL 执行 7 项本地规则检查，不依赖 AI。

#### Scenario: 标题过短
- **WHEN** 标题 < 5 字符
- **THEN** 扣 10 分（medium），提示"标题过短"

#### Scenario: 描述过短
- **WHEN** 描述 < 50 字符
- **THEN** 扣 20 分（high），提示"描述过短"

#### Scenario: 不符合用户故事格式
- **WHEN** 描述不匹配「作为...我想要...以便...」正则
- **THEN** 扣 10 分（medium），提示"不符合用户故事格式"

#### Scenario: 缺少优先级
- **WHEN** 优先级不在 P0/P1/P2/P3 中
- **THEN** 扣 20 分（high），提示"未设置优先级"

#### Scenario: 故事点数无效
- **WHEN** storyPoints 不在 1-100 范围
- **THEN** 扣 10 分（medium），提示"故事点数无效"

#### Scenario: 未关联系统
- **WHEN** systemId 为空
- **THEN** 扣 20 分（high），提示"未关联系统"

#### Scenario: 未分配BA
- **WHEN** baId 为空
- **THEN** 扣 20 分（high），提示"未分配 BA"

### Requirement: Coze AI 审查

系统 SHALL 调用 Coze 工作流进行 AI 智能审查，返回评分、问题列表、优化建议、优化标题/描述、验收条件。

#### Scenario: AI审查成功
- **WHEN** Coze 工作流正常返回
- **THEN** 获取 issues/suggestions/score/optimizedTitle/optimizedDescription/acceptanceCriteria

#### Scenario: AI审查失败/超时
- **WHEN** Coze API 异常或超时
- **THEN** 降级到本地规则审查，不阻塞主流程，后端记录 warn 日志

### Requirement: 评分计算

系统 SHALL 根据本地规则得分（70%权重）和 AI 得分（30%权重）计算综合评分。

#### Scenario: 综合评分
- **WHEN** 本地规则无问题（100分）+ AI 评分 80
- **THEN** 综合评分 = 100×0.7 + 80×0.3 = 94 分，passed=true

#### Scenario: 得分低于 60
- **WHEN** 综合评分 < 60
- **THEN** passed=false，显示"需要改进"

### Requirement: 枚举值中文映射

系统 SHALL 将数据库枚举值映射为中文后传递给 Coze。

| 数据库枚举 | Coze 输入中文 |
|-----------|-------------|
| P0/P1/P2/P3 | 紧急/高/中/低 |
| NEW_FEATURE/OPTIMIZATION/BUG | 功能需求/优化/缺陷 |
| BUSINESS/USER_FEEDBACK/DATA_ANALYSIS/COMPETITOR | 业务需求/用户反馈/数据分析/竞品分析 |

### Requirement: Coze 流式响应处理

系统 SHALL 正确处理 Coze SDK 流式响应事件。

#### Scenario: 消息事件解析
- **WHEN** 收到 Message 事件，content 为 JSON 字符串
- **THEN** 解析 JSON → 如果有 output 字段则提取 → 作为审查结果

#### Scenario: Error 事件处理
- **WHEN** 收到 Error 事件
- **THEN** 抛出包含 error_message 和 debug_url 的异常

#### Scenario: 工作流完成
- **WHEN** 收到 Done 事件
- **THEN** 停止流式读取，返回已提取的结果
