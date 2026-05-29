# US5.1 需求变更记录 API 规格

## Why

需求变更过程需要结构化记录和追溯，需要独立的变更单模型和 CRUD API，区分于现有的状态操作日志（StatusLog），专门承载对话原文、变更摘要、影响分析和确认状态。

## What Changes

- 新增 ChangeRequest 数据模型（Prisma schema）
- 新增 4 个 API：创建变更单、查询列表、确认/拒绝变更单、变更编号生成
- 变更编号格式：CR-{年份}-{4位序号}

## Impact

- Affected specs：T5 需求变更智能体（被 US5.2/US5.3/US5.4 依赖）
- Affected code：
  - `apps/server/prisma/schema.prisma`
  - `apps/server/src/modules/requirements/`（新增 change-request 子模块）
  - `packages/shared/src/types/`
  - `packages/shared/src/constants/`

## ADDED Requirements

### Requirement: 创建需求变更单

系统 SHALL 支持为需求创建变更单，记录对话原文、变更摘要、影响分析和来源标记。

#### Scenario: 创建变更单-完整字段
- **WHEN** 用户提交完整变更信息（对话原文/变更摘要/工作量影响/进度影响/风险等级）
- **THEN** 系统创建变更单，changeCode 自动生成为 CR-{年份}-{4位序号}，status 为 PENDING，source 标记为 manual

#### Scenario: 创建变更单-最小字段
- **WHEN** 仅提交必填字段（requirementId）
- **THEN** 系统创建变更单，changeSummary/workloadImpact 等为 null

#### Scenario: 创建变更单-需求不存在
- **WHEN** requirementId 对应的需求不存在
- **THEN** 返回错误：REQUIREMENT_NOT_FOUND

### Requirement: 查询需求变更记录列表

系统 SHALL 支持按需求ID查询该需求的所有变更记录，按创建时间倒序排列。

#### Scenario: 查询列表-有变更记录
- **WHEN** 请求 GET /api/requirements/:id/change-requests
- **THEN** 返回该需求的变更记录列表，按 createdAt 倒序

#### Scenario: 查询列表-无变更记录
- **WHEN** 需求从未有过变更
- **THEN** 返回空列表，total 为 0

### Requirement: 确认/拒绝变更单

系统 SHALL 支持项目经理或火车管理员确认或拒绝待处理的变更单。

#### Scenario: 确认变更单
- **WHEN** 授权用户提交 action=confirm
- **THEN** 变更单 status 变为 CONFIRMED，记录 confirmedBy 和 confirmedAt

#### Scenario: 拒绝变更单
- **WHEN** 授权用户提交 action=reject
- **THEN** 变更单 status 变为 REJECTED

#### Scenario: 重复确认
- **WHEN** 变更单已确认/已拒绝
- **THEN** 返回错误：不允许重复操作

## 变更状态机

```
PENDING ──确认──▶ CONFIRMED ──执行──▶ EXECUTED
  │
  └──拒绝──▶ REJECTED
```
