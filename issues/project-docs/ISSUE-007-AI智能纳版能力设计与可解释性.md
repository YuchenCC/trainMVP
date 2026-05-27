# ISSUE-007: AI智能纳版能力设计与可解释性

## Status
Completed

## Type
AFK

## Blocked by
- ISSUE-004
- ISSUE-006

## What to build
编写智能纳版能力设计文档，突出项目在需求智能分析和 AI 辅助决策上的竞赛价值。文档应清晰说明规则引擎、AI 解释层、依赖风险、容量分配和人工确认之间的边界。

## Acceptance criteria
- [ ] 描述智能纳版输入、输出、交互流程和确认纳版流程。
- [ ] 说明优先级排序、容量检查、可装则装、依赖风险分级等规则。
- [ ] 明确 AI 不直接决定纳版结果，只负责解释、总结和风险表达。
- [ ] 说明 Coze 接入、超时保护、mock 数据和测试案例。
- [ ] 给出竞赛展示时的推荐演示场景：容量充足、容量不足、链式依赖、依赖取消。

## Source materials
- `需求和设计/Task3-智能纳版/RT-Task3-智能纳版-测试案例_v1.0_20260524.md`
- `release-train/apps/server/src/modules/smart-onboard/service.ts`
- `release-train/apps/server/src/modules/smart-onboard/routes.ts`
- `release-train/apps/web/src/services/smart-onboard.ts`
- `release-train/apps/web/src/components/smart-onboard/SmartOnboardSuggestion.tsx`
- `release-train/packages/shared/src/types/smart-onboard.ts`

## Output
- `docs/project-engineering/RT-AI智能纳版能力设计与可解释性_v1.0_20260528.md`
