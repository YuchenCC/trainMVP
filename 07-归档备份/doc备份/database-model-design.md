# 数据库模型设计

文档状态：Issue 02 交付稿  
适用范围：版本火车需求管理系统 MVP  
基线来源：`CONTEXT.md`、`doc/prd-v1.2.md`、`doc/domain-model-and-state-machine-design.md`

## 1. 设计目标

本文档把领域模型与状态机设计落到数据库模型层，明确核心实体、字段、主外键、唯一约束、关键校验的数据支撑方式，以及容量和审计日志的存储策略。

MVP 数据库设计遵循以下原则：

- 领域状态只通过领域服务变更，数据库约束负责兜住身份、关系和不可变边界。
- 容量以纳版关系实时计算为主，不保存可被业务流程直接修改的容量计数。
- 操作审计采用追加写模型，业务用户不可修改或删除。
- 循环依赖和火车周期重叠需要应用层领域服务校验，数据库提供必要索引和基础约束。

## 2. 命名与通用字段

建议表名使用 snake_case，主键统一使用字符串 ID 或 UUID。若后续技术栈已有 ID 规范，以项目统一规范为准，但关系约束保持不变。

通用字段：

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | uuid/string | 主键 |
| `created_at` | datetime | 创建时间 |
| `created_by` | uuid/string | 创建人，引用演示用户 |
| `updated_at` | datetime | 更新时间 |
| `updated_by` | uuid/string | 更新人，引用演示用户 |

软删除策略：

- 业务核心表 MVP 不默认软删除。
- 需求取消、火车取消用业务状态表达。
- 审计日志不可软删除。

枚举建议：

- 需求状态：`draft`、`in_review`、`not_ready`、`ready`、`rejected`、`included`、`released`、`cancelled`。
- 版本火车状态：`planned`、`running`、`completed`、`cancelled`。
- 优先级：`P0`、`P1`、`P2`、`P3`。
- 需求类型：`feature`、`improvement`、`bugfix`。
- 风险等级：`warning`、`high`、`critical`。

## 3. 核心实体

### 3.1 demo_users

MVP 使用内置演示用户和角色切换器，不做企业用户管理。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | uuid/string | PK | 用户 ID |
| `display_name` | varchar(100) | not null | 展示名 |
| `email` | varchar(200) | unique, nullable | 演示邮箱 |
| `is_active` | boolean | not null, default true | 是否启用 |

### 3.2 demo_user_roles

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | uuid/string | PK | 角色绑定 ID |
| `user_id` | uuid/string | FK -> `demo_users.id`, not null | 用户 |
| `role_code` | varchar(50) | not null | 角色编码 |

约束：

- Unique：`(user_id, role_code)`。
- `role_code` 限定为 `business_ba`、`product_manager`、`project_manager`、`train_creator`、`train_admin`、`super_admin`、`dev_team`。

### 3.3 systems

系统是 MVP 内置静态字典，仅保存系统编码和名称。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `code` | varchar(50) | PK | 系统编码 |
| `name` | varchar(100) | not null | 系统名称 |
| `is_active` | boolean | not null, default true | 是否启用 |

### 3.4 requirements

需求是需求池和版本火车纳版的最小业务单元。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | uuid/string | PK | 需求 ID |
| `requirement_no` | varchar(50) | unique, not null | 需求编号，如 `REQ-001` |
| `title` | varchar(200) | not null | 需求标题 |
| `description` | text | not null | 需求描述 |
| `system_code` | varchar(50) | FK -> `systems.code`, not null | 归属系统 |
| `requirement_type` | varchar(50) | not null | 需求类型 |
| `source_channel` | varchar(50) | nullable | 来源渠道 |
| `priority` | varchar(10) | not null | 优先级 |
| `story_points` | integer | not null, check 1-100 | 工作量点数 |
| `business_owner_id` | uuid/string | FK -> `demo_users.id`, not null | 业务归属人 |
| `product_manager_id` | uuid/string | FK -> `demo_users.id`, not null | 产品经理 |
| `creator_id` | uuid/string | FK -> `demo_users.id`, not null | 创建人 |
| `submitted_at` | datetime | nullable | 发起评审时间 |
| `reviewed_at` | datetime | nullable | 最近评审时间 |
| `reviewed_by` | uuid/string | FK -> `demo_users.id`, nullable | 最近评审人 |
| `status` | varchar(30) | not null | 当前状态 |
| `current_train_id` | uuid/string | FK -> `release_trains.id`, nullable | 当前关联版本火车 |
| `released_at` | datetime | nullable | 投产时间 |
| `cancelled_at` | datetime | nullable | 取消时间 |
| `created_at` | datetime | not null | 创建时间 |
| `created_by` | uuid/string | FK -> `demo_users.id`, not null | 创建人 |
| `updated_at` | datetime | not null | 更新时间 |
| `updated_by` | uuid/string | FK -> `demo_users.id`, not null | 更新人 |

约束：

- Check：`story_points between 1 and 100`。
- Check：`status in (...)`。
- Index：`(status)`、`(system_code, status)`、`(current_train_id)`、`(priority, status)`。
- `current_train_id` 只保存当前纳版关系的快捷引用；权威关系仍以 `train_requirements` 为准。

说明：

- “已取消”和“已投产”通过状态表达，不删除需求。
- 已就绪需求修改实质字段后回到草稿，由领域服务执行，不靠数据库触发器隐式修改。

### 3.5 requirement_dependencies

维护需求到前置需求的多对多关系。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | uuid/string | PK | 依赖关系 ID |
| `requirement_id` | uuid/string | FK -> `requirements.id`, not null | 当前需求 |
| `depends_on_requirement_id` | uuid/string | FK -> `requirements.id`, not null | 前置依赖需求 |
| `created_at` | datetime | not null | 创建时间 |
| `created_by` | uuid/string | FK -> `demo_users.id`, not null | 创建人 |

约束：

- Unique：`(requirement_id, depends_on_requirement_id)`。
- Check：`requirement_id <> depends_on_requirement_id`，阻断自依赖。
- Index：`(requirement_id)`、`(depends_on_requirement_id)`。

循环依赖：

- 数据库负责阻断自依赖和重复边。
- 直接或间接循环依赖由领域服务在保存依赖关系前用图遍历校验。
- 校验查询从 `requirement_dependencies` 取边集，以新增边 `A -> B` 为起点检查是否已存在从 `B` 回到 `A` 的路径。
- 若数据库支持递归 CTE，可在事务内使用递归查询辅助校验；若不支持，由应用层在事务内读取相关边后校验。

### 3.6 release_trains

版本火车是固定周期发布计划容器。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | uuid/string | PK | 版本火车 ID |
| `name` | varchar(200) | not null | 版本火车名称 |
| `description` | text | nullable | 描述 |
| `start_date` | date | not null | 开始日期 |
| `end_date` | date | not null | 结束日期 |
| `cycle_weeks` | integer | not null, check in 2/3/4 | 版本周期 |
| `scope_freeze_at` | datetime | not null | 统一纳版节点 |
| `code_freeze_at` | datetime | not null | 统一封板节点 |
| `production_at` | datetime | not null | 统一投产节点 |
| `status` | varchar(30) | not null | 火车状态 |
| `completed_at` | datetime | nullable | 完成时间 |
| `cancelled_at` | datetime | nullable | 取消时间 |
| `created_at` | datetime | not null | 创建时间 |
| `created_by` | uuid/string | FK -> `demo_users.id`, not null | 创建人 |
| `updated_at` | datetime | not null | 更新时间 |
| `updated_by` | uuid/string | FK -> `demo_users.id`, not null | 更新人 |

约束：

- Check：`end_date >= start_date`。
- Check：`cycle_weeks in (2, 3, 4)`。
- Check：`status in ('planned', 'running', 'completed', 'cancelled')`。
- Index：`(status)`、`(start_date, end_date)`、`(production_at)`。

### 3.7 train_systems

搭载系统保存某系统在某趟版本火车中的参与配置和团队容量。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | uuid/string | PK | 搭载系统 ID |
| `release_train_id` | uuid/string | FK -> `release_trains.id`, not null | 版本火车 |
| `system_code` | varchar(50) | FK -> `systems.code`, not null | 系统编码 |
| `business_ba_id` | uuid/string | FK -> `demo_users.id`, not null | 本车业务 BA |
| `product_manager_id` | uuid/string | FK -> `demo_users.id`, not null | 本车产品经理 |
| `project_manager_id` | uuid/string | FK -> `demo_users.id`, nullable | 本车项目经理 |
| `tech_manager_id` | uuid/string | FK -> `demo_users.id`, not null | 本车技术经理 |
| `test_owner_id` | uuid/string | FK -> `demo_users.id`, not null | 本车测试负责人 |
| `available_points` | integer | not null, check >= 0 | 本期可用点数 |
| `created_at` | datetime | not null | 创建时间 |
| `created_by` | uuid/string | FK -> `demo_users.id`, not null | 创建人 |
| `updated_at` | datetime | not null | 更新时间 |
| `updated_by` | uuid/string | FK -> `demo_users.id`, not null | 更新人 |

约束：

- Unique：`(release_train_id, system_code)`。
- Check：`available_points >= 0`。
- Index：`(system_code)`、`(release_train_id)`。

火车周期重叠校验：

- 数据库通过 `release_trains(start_date, end_date, status)` 和 `train_systems(system_code, release_train_id)` 提供查询支撑。
- 领域服务在新增或修改 `train_systems` 前校验同一 `system_code` 是否已存在周期闭区间重叠的未取消火车。
- 重叠条件：`existing.start_date <= candidate.end_date and candidate.start_date <= existing.end_date`。
- `cancelled` 火车不参与冲突判断；`completed` 火车仍参与。
- 该规则涉及跨表和状态过滤，MVP 不依赖普通唯一约束表达；若后续数据库支持 exclusion constraint，可作为增强。

### 3.8 train_system_members

开发团队是多人集合，单独建表。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | uuid/string | PK | 成员关系 ID |
| `train_system_id` | uuid/string | FK -> `train_systems.id`, not null | 搭载系统 |
| `user_id` | uuid/string | FK -> `demo_users.id`, not null | 开发团队成员 |
| `member_role` | varchar(50) | not null, default `developer` | 成员角色 |

约束：

- Unique：`(train_system_id, user_id, member_role)`。
- Index：`(user_id)`。

### 3.9 train_requirements

维护需求与版本火车的纳版关系。当前有效纳版关系由 `removed_at is null` 且需求状态仍处于当前交付相关状态判断。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | uuid/string | PK | 纳版关系 ID |
| `release_train_id` | uuid/string | FK -> `release_trains.id`, not null | 版本火车 |
| `requirement_id` | uuid/string | FK -> `requirements.id`, not null | 需求 |
| `train_system_id` | uuid/string | FK -> `train_systems.id`, not null | 对应搭载系统 |
| `included_at` | datetime | not null | 纳版时间 |
| `included_by` | uuid/string | FK -> `demo_users.id`, not null | 纳版人 |
| `included_points` | integer | not null, check 1-100 | 纳版时点数 |
| `force_included` | boolean | not null, default false | 是否存在强制确认风险 |
| `risk_confirmations` | json/text | nullable | 风险确认摘要 |
| `removed_at` | datetime | nullable | 移除或退出火车时间 |
| `removed_by` | uuid/string | FK -> `demo_users.id`, nullable | 移除人 |
| `remove_reason` | varchar(500) | nullable | 移除、变更、取消导致退出的原因 |
| `exit_type` | varchar(50) | nullable | `removed`、`changed`、`cancelled`、`rolled_back` |

约束：

- Check：`included_points between 1 and 100`。
- Check：`exit_type is null or exit_type in ('removed', 'changed', 'cancelled', 'rolled_back')`。
- Index：`(release_train_id)`、`(requirement_id)`、`(train_system_id)`、`(removed_at)`。
- 推荐部分唯一约束：同一需求最多一条当前有效纳版关系，即 `unique(requirement_id) where removed_at is null`。若数据库不支持部分唯一索引，由领域服务在事务内加锁校验。

说明：

- `included_points` 保存纳版时点数，用于审计和历史复盘。
- 当前容量实时计算时，只统计 `removed_at is null` 且需求状态为 `included` 的纳版关系。
- 投产后是否设置 `removed_at` 由实现选择；MVP 推荐不设置，保留原纳版关系，但容量计算和完成火车阻断只统计 `requirements.status = 'included'`。若实现选择投产时关闭关系，必须保留投产审计足以复盘。

### 3.10 operation_logs

操作审计保存关键业务操作的结构化摘要。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | uuid/string | PK | 审计日志 ID |
| `event_type` | varchar(100) | not null | 事件类型 |
| `object_type` | varchar(50) | not null | 对象类型 |
| `object_id` | uuid/string | not null | 对象 ID |
| `operator_id` | uuid/string | FK -> `demo_users.id`, not null | 操作者 |
| `operated_at` | datetime | not null | 操作时间 |
| `reason_or_comment` | varchar(500) | nullable | 原因、意见或确认说明 |
| `previous_status` | varchar(50) | nullable | 前置状态 |
| `next_status` | varchar(50) | nullable | 目标状态 |
| `summary` | varchar(1000) | not null | 结构化摘要的人类可读版本 |
| `field_changes` | json/text | nullable | 关键字段变更摘要 |
| `risk_confirmations` | json/text | nullable | 风险确认摘要 |
| `capacity_change` | json/text | nullable | 容量变化摘要 |
| `metadata` | json/text | nullable | 其他结构化上下文 |

约束：

- Index：`(object_type, object_id, operated_at)`。
- Index：`(event_type, operated_at)`。
- Index：`(operator_id, operated_at)`。
- 不提供 `updated_at`、`updated_by` 和软删除字段。

不可变策略：

- 应用层不暴露更新或删除审计日志的业务接口。
- 数据访问层只提供追加写和查询方法。
- 数据库账号权限建议拆分：业务运行账号允许 `insert/select`，不授予 `update/delete` 给审计表；若部署环境无法拆分账号，则用仓储层和集成测试保证。
- 若数据库支持触发器，可增加 `before update/delete` 阻断触发器作为增强，但 MVP 不强依赖触发器。

### 3.11 ai_schedule_runs

记录一次 AI 排期建议运行的输入摘要、规则结果、AI 总结和人工确认结果。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | uuid/string | PK | AI 建议运行 ID |
| `release_train_id` | uuid/string | FK -> `release_trains.id`, not null | 目标版本火车 |
| `generated_by` | uuid/string | FK -> `demo_users.id`, not null | 生成人 |
| `generated_at` | datetime | not null | 生成时间 |
| `input_summary` | json/text | not null | 脱敏结构化输入摘要 |
| `recommended_requirement_ids` | json/text | not null | 建议纳入需求 ID |
| `deferred_requirement_ids` | json/text | not null | 建议延期需求 ID |
| `dependency_risks` | json/text | nullable | 依赖风险清单 |
| `capacity_forecast` | json/text | not null | 容量预估快照 |
| `reasons` | json/text | nullable | 每个建议项的原因 |
| `ai_summary` | text | nullable | AI 可读总结 |
| `status` | varchar(30) | not null | `generated`、`partially_confirmed`、`confirmed` |
| `confirmed_by` | uuid/string | FK -> `demo_users.id`, nullable | 确认人 |
| `confirmed_at` | datetime | nullable | 确认时间 |
| `confirmed_requirement_ids` | json/text | nullable | 实际确认纳版需求 ID |

约束：

- Check：`status in ('generated', 'partially_confirmed', 'confirmed')`。
- Index：`(release_train_id, generated_at)`。
- Index：`(generated_by, generated_at)`。

说明：

- AI 建议结果由确定性规则引擎决定，AI 只生成解释和总结。
- `capacity_forecast` 是建议运行时快照，用于复盘，不作为当前容量权威来源。

### 3.12 global_configs

保存 MVP 全局配置，优先支持版本周期。

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| `id` | uuid/string | PK | 配置 ID |
| `config_key` | varchar(100) | unique, not null | 配置键 |
| `config_value` | varchar(500) | not null | 配置值 |
| `value_type` | varchar(30) | not null | `string`、`number`、`boolean`、`json` |
| `description` | varchar(500) | nullable | 配置说明 |
| `updated_at` | datetime | not null | 更新时间 |
| `updated_by` | uuid/string | FK -> `demo_users.id`, not null | 更新人 |

约束：

- Unique：`config_key`。
- Check：`value_type in ('string', 'number', 'boolean', 'json')`。

## 4. 容量策略

MVP 容量采用“实时计算为主，建议运行保存快照”的策略。

权威实时口径：

- `available_points` 来自 `train_systems.available_points`。
- `allocated_points` 实时汇总当前有效纳版需求点数。
- 当前有效纳版需求建议定义为：`train_requirements.removed_at is null` 且关联 `requirements.status = 'included'`。
- `remaining_points = available_points - allocated_points`。
- `usage_rate = allocated_points / available_points`。当 `available_points = 0` 时，若有已分配点数则视为超限风险。

历史复盘口径：

- 纳版时在 `train_requirements.included_points` 保存当时点数。
- AI 建议运行在 `ai_schedule_runs.capacity_forecast` 保存建议时容量快照。
- 操作审计在 `operation_logs.capacity_change` 保存命令造成的容量变化摘要。

不采用独立 `capacity_snapshots` 作为当前容量来源，避免与纳版关系产生双写不一致。若后续需要报表复盘，可新增只追加的历史快照表，但不能替代实时权威口径。

## 5. 关键校验的数据支撑

### 5.1 循环依赖校验

保存 `requirement_dependencies` 前执行：

1. 校验 `requirement_id` 和 `depends_on_requirement_id` 均存在。
2. 用 check 或应用层校验阻断自依赖。
3. 在同一事务内读取依赖边，检查新增边是否形成从前置依赖回到当前需求的路径。
4. 若存在路径，拒绝保存并返回硬阻断错误。
5. 校验通过后插入依赖边，并写入 `operation_logs` 的 `requirement.dependency_updated`。

推荐测试行为：

- 可以保存跨系统非循环依赖。
- 拒绝自依赖。
- 拒绝直接循环依赖。
- 拒绝间接循环依赖。

### 5.2 火车周期重叠校验

新增或修改 `train_systems` 前执行：

1. 读取候选火车的 `start_date`、`end_date`、`status`。
2. 若候选火车为 `cancelled`，不需要参与冲突校验。
3. 查询同一 `system_code` 下，其他非 `cancelled` 火车的起止日期。
4. 若满足闭区间重叠：`existing.start_date <= candidate.end_date and candidate.start_date <= existing.end_date`，拒绝保存。
5. `completed` 火车仍参与冲突判断。

推荐测试行为：

- 同一系统两个周期有交集时拒绝。
- 同一系统首尾同日相接时拒绝，因为闭区间有交集。
- 同一系统仅与已取消火车重叠时允许。
- 不同系统同周期允许搭载。

### 5.3 当前纳版关系唯一性

同一需求同一时间最多关联一个未完成版本火车。

数据支撑：

- 优先使用 `unique(requirement_id) where removed_at is null`。
- 如果目标数据库不支持部分唯一索引，领域服务在纳版事务中对该需求当前纳版关系加锁查询。
- `requirements.current_train_id` 作为查询快捷字段，不能绕过 `train_requirements` 的唯一性校验。

## 6. TDD 实施顺序

数据库层测试仍应围绕公开仓储或领域服务行为，不直接测试私有 SQL 拼接。

推荐红绿循环：

1. Tracer bullet：通过领域服务纳版一个已就绪需求后，能查询到 `train_requirements` 当前关系，并实时计算出对应系统已分配点数。
2. 保存自依赖失败，不插入 `requirement_dependencies`。
3. 保存间接循环依赖失败，并返回循环依赖硬阻断。
4. 同一系统搭载到周期重叠的未取消火车失败。
5. 同一系统与已取消火车周期重叠时允许搭载。
6. 移除或已纳版变更后，当前容量实时计算释放点数。
7. 生成 AI 建议时保存 `capacity_forecast` 快照，但后续纳版变化不修改该历史快照。
8. 操作审计只能追加写；业务仓储不提供更新或删除审计日志的方法。

## 7. 验收映射

| Issue 验收标准 | 本文档覆盖位置 |
|---|---|
| 输出核心实体、字段、主外键和唯一约束 | 第 3 章 |
| 明确循环依赖校验和火车周期重叠校验的数据支撑方式 | 第 3.5、3.7、5.1、5.2 节 |
| 明确容量采用实时计算或快照保存的策略 | 第 4 章 |
| 明确操作日志不可被业务用户修改或删除的约束 | 第 3.10 节 |

## 8. 不在本 issue 范围内

- 不创建数据库迁移文件。
- 不选择具体数据库产品。
- 不实现 ORM schema。
- 不设计 BI 报表或完整历史版本回放。
- 不扩大到企业 SSO、组织架构或真实权限授权系统。
