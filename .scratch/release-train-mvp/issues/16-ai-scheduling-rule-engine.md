# AI排期规则引擎

Status: ready-for-agent
Type: AFK

## What to build

实现 AI排期建议中的确定性规则引擎。规则引擎负责候选范围过滤、优先级排序、容量计算、依赖风险识别、建议纳入、建议延期和容量预估，采用可装则装策略。

## Acceptance criteria

- [ ] 只将符合候选条件的已就绪需求纳入排期计算。
- [ ] 按优先级、工作量点数和规则定义生成稳定排序。
- [ ] 同系统候选需求采用可装则装策略。
- [ ] 输出 recommendedRequirementIds、deferredRequirementIds、dependencyRisks、capacityForecast 和 reasons。
- [ ] 规则引擎不触发任何状态变化。

## Blocked by

- 08-requirement-dependency-management.md
- 10-release-train-detail-and-capacity-snapshot.md
- 11-manual-inclusion-end-to-end.md

## Comments

