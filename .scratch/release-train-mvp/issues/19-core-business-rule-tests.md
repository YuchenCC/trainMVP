# 核心业务规则自动化测试

Status: ready-for-agent
Type: AFK

## What to build

补齐核心业务规则自动化测试，优先覆盖外部可观察行为，包括状态机、容量、依赖风险、纳版、权限、AI建议和操作审计。

## Acceptance criteria

- [ ] 覆盖合法和非法需求状态流转。
- [ ] 覆盖纳版占用、移除释放、取消释放、变更回退释放。
- [ ] 覆盖依赖已满足、未满足、已取消、未参车、自依赖和循环依赖。
- [ ] 覆盖不同角色在不同状态下的允许和拒绝结果。
- [ ] 覆盖 AI规则引擎不改变状态且 AI解释不改变规则结果。
- [ ] 覆盖关键操作均生成结构化审计日志。

## Blocked by

- 07-requirement-pool-basic-lifecycle.md
- 08-requirement-dependency-management.md
- 11-manual-inclusion-end-to-end.md
- 13-included-requirement-change-governance.md
- 14-production-release-and-rollback.md
- 16-ai-scheduling-rule-engine.md

## Comments

