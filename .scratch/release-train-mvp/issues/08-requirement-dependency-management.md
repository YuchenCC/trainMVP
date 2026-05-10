# 需求依赖管理与循环依赖阻断

Status: ready-for-agent
Type: AFK

## What to build

实现需求前置依赖管理，支持一个需求关联多个已存在需求作为前置依赖，允许跨系统依赖，但保存时必须阻断自依赖和直接或间接循环依赖。

## Acceptance criteria

- [ ] 支持在需求创建或编辑时维护多个前置依赖。
- [ ] 阻断自依赖并返回明确错误原因。
- [ ] 阻断循环依赖并提示循环链路。
- [ ] 依赖状态可在需求详情中查看，并可被纳版和 AI建议复用。

## Blocked by

- 07-requirement-pool-basic-lifecycle.md

## Comments

