# 基础数据、演示用户与权限骨架

Status: ready-for-agent
Type: AFK

## What to build

实现 MVP 基础数据骨架，包括演示用户、角色切换、系统静态字典、全局版本周期配置和 RBAC 权限判断能力，为后续需求池和版本火车操作提供统一权限入口。

## Acceptance criteria

- [ ] 系统提供内置演示用户和角色数据。
- [ ] 系统提供内置系统字典，不包含系统管理页面。
- [ ] 支持切换当前演示用户。
- [ ] 权限模块能对关键操作返回允许、拒绝和拒绝原因。

## Blocked by

- 01-domain-model-and-state-machine-design.md
- 02-database-model-design.md
- 03-api-contract-design.md

## Comments

