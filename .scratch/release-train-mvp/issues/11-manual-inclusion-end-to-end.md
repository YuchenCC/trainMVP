# 手动纳版闭环

Status: ready-for-agent
Type: AFK

## What to build

实现手动纳版端到端能力。火车管理员可以从已就绪需求中选择候选需求纳入版本火车，系统执行容量校验、依赖风险识别、状态流转、容量占用和操作审计。

## Acceptance criteria

- [ ] 只有已就绪需求可以纳版。
- [ ] 纳版后需求进入已纳版状态并关联当前版本火车。
- [ ] 纳版占用需求归属系统在该版本火车中的团队容量。
- [ ] 容量不足、依赖未满足、依赖已取消、依赖系统未参车均提示风险。
- [ ] 强制纳版必须填写风险确认说明并生成审计日志。

## Blocked by

- 07-requirement-pool-basic-lifecycle.md
- 08-requirement-dependency-management.md
- 10-release-train-detail-and-capacity-snapshot.md

## Comments

