# 接口契约设计

Status: ready-for-human
Type: HITL

## What to build

设计 MVP 所需接口契约，覆盖需求查询与命令、版本火车查询与命令、纳版命令、AI建议、日历查询和配置管理。命令接口需要返回业务结果、状态变化、风险提示和审计追踪信息。

## Acceptance criteria

- [ ] 输出接口清单、请求结构、响应结构和关键错误码。
- [ ] 命令接口统一表达状态变化、风险提示和审计追踪 ID。
- [ ] 查询接口返回页面需要的聚合视图，避免前端拼装复杂业务规则。
- [ ] 覆盖权限拒绝、非法状态流转、循环依赖、容量风险等错误场景。

## Blocked by

- 01-domain-model-and-state-machine-design.md
- 02-database-model-design.md

## Comments

