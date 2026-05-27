# ISSUE-004: 领域模型、术语体系与状态机

## Status
Completed

## Type
AFK

## Blocked by
- ISSUE-003

## What to build
编写领域模型文档，将项目核心术语、实体关系、需求状态机、班次状态机、权限触发点和审计点统一表达，保证后续工程文档和代码说明使用同一套业务语言。

## Acceptance criteria
- [ ] 建立术语表，覆盖版本火车、班次、纳版、团队容量、依赖风险、需求变更、紧急变更、投产、回滚等。
- [ ] 绘制或描述核心实体关系：系统、用户、需求、依赖、火车、班次、容量快照、状态日志、紧急变更。
- [ ] 梳理需求主状态和子状态流转，明确允许路径、操作入口和操作角色。
- [ ] 梳理班次状态流转，说明封板、投产和需求状态联动。
- [ ] 标注必须审计的业务动作和对应的审计数据。

## Source materials
- `需求和设计/共享/CONTEXT.md`
- `需求和设计/共享/版本火车需求管理系统_MVP_PRD_v2.11.md`
- `需求和设计/RT-Task1-需求池管理-PRD.md`
- `需求和设计/RT-Task2-版本火车管理-PRD.md`
- `release-train/apps/server/prisma/schema.prisma`
- `release-train/packages/shared/src/constants/index.ts`

## Output
- `docs/project-engineering/RT-领域模型术语体系与状态机_v1.0_20260528.md`
