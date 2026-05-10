# 数据库模型设计

Status: ready-for-human
Type: HITL

## What to build

基于领域模型设计数据库模型，覆盖需求、需求依赖、版本火车、搭载系统、纳版关系、操作日志、AI建议运行记录和全局配置，并保留 PRD 中声明的关系与约束。

## Acceptance criteria

- [ ] 输出核心实体、字段、主外键和唯一约束。
- [ ] 明确循环依赖校验和火车周期重叠校验的数据支撑方式。
- [ ] 明确容量采用实时计算或快照保存的策略。
- [ ] 明确操作日志不可被业务用户修改或删除的约束。

## Blocked by

- 01-domain-model-and-state-machine-design.md

## Comments

