# 已纳版变更治理

Status: ready-for-agent
Type: AFK

## What to build

实现已纳版变更治理。已纳版需求发生实质字段变更时，必须通过显式变更操作处理，系统解除火车关联、释放容量、回退为未就绪，并记录关键字段变更摘要。

## Acceptance criteria

- [ ] 已纳版需求不能通过普通编辑静默修改实质字段。
- [ ] 显式已纳版变更要求填写变更原因。
- [ ] 变更后需求状态回退为未就绪，并解除当前版本火车关联。
- [ ] 变更释放团队容量并生成包含关键字段差异的操作审计。
- [ ] 未就绪需求必须重新评审通过后才能再次纳版。

## Blocked by

- 11-manual-inclusion-end-to-end.md

## Comments

