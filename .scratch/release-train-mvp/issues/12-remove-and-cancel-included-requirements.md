# 移除与取消已纳版需求

Status: ready-for-agent
Type: AFK

## What to build

实现已纳版需求从版本火车移除和取消能力。移除后需求回到已就绪并释放容量；取消已纳版需求时自动从火车移除、释放容量并进入已取消状态。

## Acceptance criteria

- [ ] 已纳版需求可从火车移除，移除原因必填。
- [ ] 移除后解除火车关联并释放容量。
- [ ] 已纳版需求取消时自动释放容量并生成审计日志。
- [ ] 已投产需求不可取消，必须返回明确拒绝原因。

## Blocked by

- 11-manual-inclusion-end-to-end.md

## Comments

