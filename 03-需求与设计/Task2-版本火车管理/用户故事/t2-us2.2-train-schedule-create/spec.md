# US2.2 火车班次创建 Spec

## Why

US2.1（版本火车创建）已完成，创建了火车容器和搭载系统配置。US2.2 需要在火车下创建具体班次，设置时间范围和关键节点，并保存容量快照。

## What Changes

- 新增班次数据模型（班次存储在 Train 模型中，通过日期字段区分）
- 班次创建时保存火车搭载系统的容量快照（TrainSystemSnapshot）
- 自动计算关键节点日期（统一纳版日、统一封板日、统一投产日）
- 火车状态从 PLANNING 变为 IN_PROGRESS
- 支持班次时间编辑和关键节点手动调整

## Impact

- Affected specs: US2.3 班次列表、US2.5 纳版搭载
- Affected code:
  - `apps/server/prisma/schema.prisma` — 新增 TrainSystemSnapshot 模型
  - `apps/server/src/modules/trains/services/train.service.ts` — createTrainSchedule
  - `apps/server/src/modules/trains/routes/schedule.ts` — 班次路由
  - `apps/server/src/__tests__/t2-us2.2-train-schedule.test.ts` — TDD 测试

## ADDED Requirements

### Requirement: 火车班次创建

系统 SHALL 支持火车管理员为已创建的版本火车创建班次。

#### Scenario: 创建班次成功
- **WHEN** 火车管理员提交班次创建请求（trainId、startDate、endDate）
- **THEN** 班次创建成功，火车状态从 PLANNING 变为 IN_PROGRESS
- **AND** 关键节点日期自动计算并保存
- **AND** 为每个搭载系统创建容量快照

#### Scenario: 班次名称自动生成
- **WHEN** 火车管理员不填写班次名称
- **THEN** 班次名称自动生成，格式为「{火车名}第{序号}班」

#### Scenario: 班次名称手动指定
- **WHEN** 火车管理员填写班次名称
- **THEN** 使用指定的班次名称

#### Scenario: 结束时间早于开始时间
- **WHEN** 火车管理员提交的结束时间早于或等于开始时间
- **THEN** 返回业务错误「结束时间必须晚于开始时间」

#### Scenario: 火车状态非 PLANNING
- **WHEN** 火车管理员对非规划中的火车创建班次
- **THEN** 返回业务错误「火车状态必须为规划中」

#### Scenario: 火车不存在
- **WHEN** 火车管理员提交不存在的火车 ID
- **THEN** 返回 404 业务错误

### Requirement: 关键节点自动计算

系统 SHALL 在班次创建时自动计算三个关键节点日期。

#### Scenario: 关键节点计算
- **WHEN** 创建班次时
- **THEN** 统一纳版日 = 周期过半前的最后一个周五
- **AND** 统一封板日 = 投产前一周的周五
- **AND** 统一投产日 = 结束时间

### Requirement: 容量快照保存

系统 SHALL 在班次创建时保存火车搭载系统的容量配置快照。

#### Scenario: 创建容量快照
- **WHEN** 班次创建成功
- **THEN** 为每个搭载系统创建容量快照记录
- **AND** 快照包含当时的 capacityPoints、usedPoints、baUserId、pmUserId 等配置
- **AND** 后续调整火车容量配置不影响已创建的班次快照

### Requirement: 班次编辑

系统 SHALL 支持火车管理员编辑已有班次的时间范围和关键节点。

#### Scenario: 编辑班次时间
- **WHEN** 火车管理员编辑班次时间
- **THEN** 关键节点日期自动重新计算
- **AND** 用户可手动覆盖关键节点日期

#### Scenario: 班次只读状态
- **WHEN** 火车状态为 IN_PROGRESS
- **THEN** 仍可编辑班次时间
- **AND** 班次编辑不影响已纳版需求的班次关联
