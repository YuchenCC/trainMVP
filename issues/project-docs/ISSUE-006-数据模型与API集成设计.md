# ISSUE-006: 数据模型与API集成设计

## Status
Completed

## Type
AFK

## Blocked by
- ISSUE-004
- ISSUE-005

## What to build
编写数据模型与 API 集成设计文档，面向后续维护者说明 Prisma 模型、核心关联、API 分组、请求响应约定、前端 service 调用和权限要求。

## Acceptance criteria
- [ ] 按业务域说明核心 Prisma model，包括 User、System、Requirement、RequirementDependency、Train、TrainSchedule、TrainSystemSnapshot、StatusLog、EmergencyChange。
- [ ] 说明关键索引、唯一约束和容量快照设计理由。
- [ ] 梳理 API 分组：认证、系统、需求、火车、班次、纳版、智能纳版、仪表盘聚合。
- [ ] 说明前端 services 与后端 routes/service 的对应关系。
- [ ] 标明各类 API 的鉴权和 RBAC 要求。

## Source materials
- `release-train/apps/server/prisma/schema.prisma`
- `release-train/apps/server/src/modules/auth/index.ts`
- `release-train/apps/server/src/modules/requirements/index.ts`
- `release-train/apps/server/src/modules/trains/`
- `release-train/apps/server/src/modules/smart-onboard/`
- `release-train/apps/web/src/services/`
- `release-train/packages/shared/src/types/`

## Output
- `docs/project-engineering/RT-数据模型与API集成设计_v1.0_20260528.md`
