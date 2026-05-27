# ISSUE-009: 部署运行、演示手册与评审证据包

## Status
Completed

## Type
HITL

## Blocked by
- ISSUE-001
- ISSUE-002
- ISSUE-003
- ISSUE-004
- ISSUE-005
- ISSUE-006
- ISSUE-007
- ISSUE-008

## What to build
编写最终交付和评审使用的运行演示手册，包含本地启动、测试账号、演示路线、截图/录屏清单、文档证据索引和竞赛讲解脚本。

## Acceptance criteria
- [ ] 给出本地运行前置条件、环境变量、数据库初始化、seed 数据和启动命令。
- [ ] 整理测试账号、角色权限和推荐演示账号。
- [ ] 设计评审演示路线，覆盖需求创建、评审、纳版、智能纳版、班次状态、仪表盘。
- [ ] 建立证据包索引，将关键代码、关键文档、测试结果和演示截图/录屏对应到赛道评分点。
- [ ] 记录当前环境风险，例如 pnpm/docker PATH、依赖版本和数据库要求。

## Source materials
- `release-train/测试账号文档.md`
- `release-train/TEST_GUIDE.md`
- `release-train/SMART_ONBOARD_GUIDE.md`
- `release-train/package.json`
- `release-train/apps/server/package.json`
- `release-train/apps/web/package.json`
- `release-train/.env.example`
- `release-train/docker-compose.yml`
- `handoff-*.md`

## Output
- `docs/project-engineering/RT-部署运行演示手册与评审证据包_v1.0_20260528.md`
