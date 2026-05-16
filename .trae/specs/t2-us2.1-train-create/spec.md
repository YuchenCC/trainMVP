# US2.1 版本火车创建（含搭载系统配置）规格

## Why

需要实现版本火车管理的基础功能，允许火车管理员创建版本火车并配置搭载系统及团队容量，为后续的火车班次创建和纳版搭载奠定基础。

## What Changes

- 新增 Train 模型字段：version（乐观锁）、时间字段改为可选
- 新增 TrainSystem 模型字段：团队成员配置、容量点数
- 新增 9 个 API 接口：创建火车、列表、详情、更新、取消、搭载系统增删改查、可选系统列表
- 新增前端页面：火车创建页、火车详情页、火车编辑页
- 新增前端组件：火车表单、搭载系统列表

## Impact

- Affected specs：需求池管理（Task 1）、AI调度与日历（Task 3）
- Affected code：
  - `apps/server/prisma/schema.prisma`
  - `apps/server/src/modules/trains/`
  - `apps/web/src/pages/trains/`
  - `apps/web/src/components/trains/`
  - `apps/web/src/services/train.ts`
  - `packages/shared/src/types/train.ts`

## ADDED Requirements

### Requirement: 创建版本火车

系统 SHALL 支持火车管理员创建新的版本火车，设置名称、描述，并配置搭载系统及团队成员和容量。

#### Scenario: 创建火车-正常流程
- **WHEN** 火车管理员填写完整信息（名称、至少一个搭载系统）并提交
- **THEN** 系统创建版本火车，状态为「计划中」，返回完整火车详情

#### Scenario: 创建火车-系统冲突
- **WHEN** 添加的系统已参与其他计划中/进行中的火车
- **THEN** 系统返回错误：系统已在火车[{name}]中，无法重复添加

#### Scenario: 创建火车-无权限
- **WHEN** 非火车管理员角色用户提交创建
- **THEN** 系统返回 403 错误：无权限执行此操作

### Requirement: 查询版本火车列表

系统 SHALL 支持所有已登录用户查询版本火车列表，并按状态筛选。

#### Scenario: 查询列表-分页筛选
- **WHEN** 用户请求 GET /api/trains?status=PLANNING&page=1&pageSize=20
- **THEN** 系统返回符合条件的第一页数据（20条）

### Requirement: 查询版本火车详情

系统 SHALL 支持所有已登录用户查询版本火车详情，包含搭载系统信息。

#### Scenario: 查询详情-包含搭载系统
- **WHEN** 用户请求 GET /api/trains/{id}
- **THEN** 系统返回火车详情，包含 systems 数组，每项包含系统信息和容量使用率

### Requirement: 更新版本火车基本信息

系统 SHALL 支持火车管理员更新版本火车名称和描述，使用乐观锁防止并发冲突。

#### Scenario: 更新-版本冲突
- **WHEN** 用户提交的 version 与数据库中的 version 不一致
- **THEN** 系统返回 409 错误：版本火车已被其他人修改，请刷新后重试

### Requirement: 取消版本火车

系统 SHALL 支持火车管理员取消版本火车，前提是火车状态为「计划中」且无已纳版需求。

#### Scenario: 取消-有纳版需求
- **WHEN** 火车下存在已纳版需求时尝试取消
- **THEN** 系统返回错误：无法取消有纳版需求的火车

### Requirement: 添加搭载系统

系统 SHALL 支持火车管理员向火车添加搭载系统，校验系统冲突和容量点数范围。

#### Scenario: 添加系统-容量超范围
- **WHEN** 提交的容量点数不在 1-500 范围内
- **THEN** 系统返回错误：容量点数必须为1-500的正整数

### Requirement: 移除搭载系统

系统 SHALL 支持火车管理员移除搭载系统，前提是该系统下无已纳版需求（usedPoints === 0）。

#### Scenario: 移除-有已纳版需求
- **WHEN** 该系统已有需求纳版时尝试移除
- **THEN** 系统返回错误：无法移除，该系统已有X个需求纳版

### Requirement: 更新搭载系统配置

系统 SHALL 支持火车管理员更新搭载系统的成员配置和容量点数。

#### Scenario: 更新容量
- **WHEN** 火车管理员调整某系统的本期可用点数
- **THEN** 系统重新计算剩余可用点数和使用率并返回

### Requirement: 获取可选系统列表

系统 SHALL 支持获取可添加到指定火车的系统列表（排除已在该火车中的系统和已参与其他计划中/进行中火车的系统）。

#### Scenario: 获取可选系统
- **WHEN** 用户请求 GET /api/systems/available?trainId={id}
- **THEN** 系统返回可添加的系统列表

## MODIFIED Requirements

### Requirement: 需求关联火车

需求与火车的关联关系在纳版时建立（US2.5），本次不做修改。

## REMOVED Requirements

### Requirement: 火车班次创建

火车班次创建（设置开始/结束时间、计算关键节点）作为独立功能在 US2.2 中实现。

**Reason**: 功能拆分，便于独立开发和测试

**Migration**: 火车创建后，startDate/endDate 为空，需通过 US2.2 创建班次后填充
