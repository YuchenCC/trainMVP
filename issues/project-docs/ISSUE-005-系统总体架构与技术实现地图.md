# ISSUE-005: 系统总体架构与技术实现地图

## Status
Completed

## Type
AFK

## Blocked by
- ISSUE-003
- ISSUE-004

## What to build
编写系统总体架构文档，说明 release-train monorepo 的前端、后端、共享包、数据库、AI 服务、日志与测试模块如何协同，并给出需求模块到代码实现的工程地图。

## Acceptance criteria
- [ ] 描述 monorepo 结构和依赖方向：apps/web、apps/server、packages/shared。
- [ ] 说明前端技术栈、后端技术栈、数据库和 AI 服务接入方式。
- [ ] 给出核心模块边界：auth、requirements、systems、trains、smart-onboard、dashboard。
- [ ] 给出主要页面路由、后端路由和 service 层对应关系。
- [ ] 修正旧代码结构映射中与当前代码不一致的内容，例如统一 `/dashboard` 和默认路由现状。

## Source materials
- `需求和设计/共享/RT-代码结构映射_v1.0_20260515.md`
- `release-train/package.json`
- `release-train/apps/server/src/app.ts`
- `release-train/apps/web/src/App.tsx`
- `release-train/apps/web/src/layouts/MainLayout.tsx`
- `release-train/apps/server/src/modules/`
- `release-train/apps/web/src/pages/`

## Output
- `docs/project-engineering/RT-系统总体架构与技术实现地图_v1.0_20260528.md`
