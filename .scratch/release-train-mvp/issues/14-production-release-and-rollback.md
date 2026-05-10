# 投产、批量投产与回滚

Status: ready-for-agent
Type: AFK

## What to build

实现需求级投产、版本火车统一投产入口和已投产需求回滚能力。回滚后需求回到已就绪，不保留原版本火车关联，回滚事实通过操作审计表达。

## Acceptance criteria

- [ ] 已纳版需求可单独确认投产。
- [ ] 版本火车支持对本车已纳版需求批量投产。
- [ ] 已投产需求可回滚到已就绪，回滚原因必填。
- [ ] 回滚后不自动恢复原版本火车关联。
- [ ] 投产和回滚均生成操作审计。

## Blocked by

- 11-manual-inclusion-end-to-end.md

## Comments

