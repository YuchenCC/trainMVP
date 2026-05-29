# US2.3 班次列表查询与火车切换 Spec

## Why

进入"版本火车"模块，默认显示当前用户归属系统相关火车的班次列表，顶部可切换火车。

## What Changes

- 新增 TrainSchedule 模型（1火车→多班次）
- 调整 TrainSystemSnapshot 关联到班次
- 新增 GET /api/trains?userId=xxx（用户归属系统的火车）
- 新增 GET /api/trains/:trainId/schedules（班次列表）
- 前端：班次列表页 + 顶部火车选择器

## Impact

- Affected specs: US2.1, US2.2, US2.4, US2.5, ...
- Affected code: 
  - schema.prisma (TrainSchedule 新增，TrainSystemSnapshot 调整)
  - train.service.ts (list 新增参数，getSchedules 新增)
  - trains/index.tsx (重构为班次列表 + 火车切换)
  - shared 类型定义

## ADDED Requirements

### Requirement: 用户归属系统的火车列表

系统必须返回当前用户参与的系统所关联的火车列表。

#### Scenario: 火车列表查询
- **WHEN** 用户进入"版本火车"模块
- **THEN** 显示顶部火车选择器（显示用户相关火车）
- **AND** 默认选中第一辆火车（或用户上次查看的）

### Requirement: 班次列表显示

显示所选火车的所有班次列表。

#### Scenario: 班次列表渲染
- **WHEN** 用户选择火车
- **THEN** 显示该火车的所有班次（按创建时间倒序）
- **AND** 显示班次名称、时间、状态、关键节点等信息

### Requirement: 火车切换

用户可以在顶部切换火车，切换后刷新班次列表。

## MODIFIED Requirements

无

## REMOVED Requirements

无
