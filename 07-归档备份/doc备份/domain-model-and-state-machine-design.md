# 领域模型与状态机详细设计

文档状态：Issue 01 交付稿  
适用范围：版本火车需求管理系统 MVP  
基线来源：`CONTEXT.md`、`doc/prd-v1.2.md`

## 1. 设计目标

本文档把 PRD v1.2 中的领域决策收束为后续编码可直接遵循的详细设计，重点明确：

- 核心领域对象之间的关系。
- 需求状态机与版本火车状态机的事件、前置状态、目标状态、规则和副作用。
- 哪些业务规则必须硬阻断，哪些规则只形成软风险提示。
- 操作审计事件类型和关键摘要字段。
- 后续 TDD 实现时应使用的公共接口边界。

MVP 中，状态机必须作为后端领域层的统一业务能力。API、页面和 AI 排期建议确认入口都只能通过统一领域服务触发状态变化，不能在调用方自行拼装状态、容量或审计副作用。

## 2. 核心领域模型

### 2.1 需求 Requirement

需求是版本火车管理的最小业务单元。需求保存自身业务属性、当前状态、归属系统、当前版本火车关联和前置依赖关系。

关键状态：

- `draft`：草稿。
- `inReview`：待评审。
- `notReady`：未就绪。
- `ready`：已就绪。
- `rejected`：已拒绝。
- `included`：已纳版。
- `released`：已投产。
- `cancelled`：已取消。

关键约束：

- 只有 `ready` 需求可以纳版。
- `included` 需求的实质字段不能普通编辑，必须走已纳版变更。
- `released` 需求不能取消，只能回滚。
- `cancelled` 是终态，不允许继续流转。
- 一个需求同一时间最多关联一个未完成版本火车。

### 2.2 版本火车 ReleaseTrain

版本火车是固定周期的发布计划容器，包含起止日期、关键节点、搭载系统、纳版范围和火车状态。

关键状态：

- `planned`：计划中。
- `running`：进行中。
- `completed`：已完成。
- `cancelled`：已取消。

关键约束：

- 创建后默认 `planned`。
- 到达开始日期或首次纳版后可进入 `running`。
- 完成版本火车是管理员手动确认，不自动完成。
- 完成要求当前日期不早于统一投产节点，且本车不存在仍处于 `included` 的需求。
- 已取消火车不参与系统周期重叠判断；已完成火车仍参与历史占用判断。

### 2.3 系统 System 与搭载系统 TrainSystem

`System` 是 MVP 内置静态字典，只提供系统编码和名称。

`TrainSystem` 是某个系统在一趟版本火车中的参与配置，保存本车角色和团队容量。

关键约束：

- 团队容量属于 `TrainSystem`，不是全局系统主数据。
- 同一系统不能同时参与两个周期闭区间重叠且未取消的版本火车。
- 容量不足不是纳版硬阻断，但必须形成风险提示和审计记录。

### 2.4 纳版关系 TrainRequirement

纳版关系维护需求与版本火车之间的当前交付范围关系。

关键字段：

- `requirementId`
- `releaseTrainId`
- `includedAt`
- `includedBy`
- `forceIncluded`
- `riskConfirmations`

关键约束：

- 纳版关系只由 `includeInTrain` 创建。
- 移除、已纳版变更、取消已纳版需求、投产后回滚都必须解除当前纳版关系或确保不再占用原火车容量。
- `released` 状态表示需求已经投产，不应继续以 `included` 需求参与“完成版本火车”的阻断判断。

### 2.5 团队容量 Capacity

容量以搭载系统为维度计算。

推荐后续实现采用实时计算作为主口径：

- `availablePoints`：本期可用点数，来自 `TrainSystem`。
- `allocatedPoints`：本车当前已纳版需求的点数合计。
- `remainingPoints`：`availablePoints - allocatedPoints`。
- `usageRate`：`allocatedPoints / availablePoints`。

容量副作用：

- 纳版占用容量。
- 移除释放容量。
- 已纳版变更释放容量。
- 取消已纳版需求释放容量。
- 投产不释放容量，只改变需求状态。
- 回滚不恢复原火车纳版关系。

### 2.6 依赖风险 DependencyRisk

依赖关系用于识别纳版风险，不自动决定纳版结果。

软风险等级：

- `warning`：前置依赖未纳入当前版本火车，但仍可能通过人工确认纳版。
- `high`：前置依赖所属系统未参车，存在跨系统协同风险。
- `critical`：前置依赖已取消，风险最高，但 MVP 仍允许火车管理员强制纳版。

硬阻断：

- 自依赖。
- 直接或间接循环依赖。
- 依赖需求不存在。

循环依赖必须在保存依赖关系时阻断，不属于可强制确认的依赖风险。

### 2.7 操作审计 OperationLog

操作审计保存结构化摘要，不做完整对象快照回放。

所有关键业务命令必须生成审计事件草稿，由应用层持久化。审计日志业务用户不可修改或删除。

## 3. 未来领域服务接口

后续 TDD 实现优先以纯领域服务作为公共接口。

```ts
type CommandResult = {
  ok: boolean;
  previousStatus?: string;
  nextStatus?: string;
  hardErrors: DomainError[];
  riskWarnings: RiskWarning[];
  sideEffects: DomainSideEffect[];
  auditEvent?: AuditEventDraft;
};

function executeRequirementCommand(
  command: RequirementCommand,
  context: RequirementCommandContext,
): CommandResult;

function executeTrainCommand(
  command: TrainCommand,
  context: TrainCommandContext,
): CommandResult;
```

接口规则：

- `hardErrors` 非空时，`ok` 必须为 `false`，不得产生状态变化和业务副作用。
- `riskWarnings` 不阻止命令成功，但需要用户确认的风险必须写入审计摘要。
- `sideEffects` 描述领域副作用，例如关联火车、释放容量、记录投产时间。
- `auditEvent` 是待持久化审计事件草稿，包含对象、操作、操作者、原因、状态变化和风险确认。

## 4. 需求状态机

### 4.1 需求事件总表

| 事件 | 允许前置状态 | 目标状态 | 硬阻断规则 | 软风险提示 | 领域副作用 | 审计事件 |
|---|---|---|---|---|---|---|
| `submitReview` | `draft`, `notReady` | `inReview` | 必填字段不完整；操作者无权限；当前状态不允许 | 无 | 记录提交人和提交时间 | `requirement.review_submitted` |
| `approveReview` | `inReview` | `ready` | 操作者无评审权限；当前状态不允许 | 无 | 记录评审人、评审时间和意见 | `requirement.review_approved` |
| `rejectReview` | `inReview` | `rejected` | 拒绝原因为空；原因超过 500 字；操作者无权限；当前状态不允许 | 无 | 记录拒绝人、拒绝时间和原因 | `requirement.review_rejected` |
| `reopenRejected` | `rejected` | `draft` | 操作者无权限；当前状态不允许 | 无 | 允许继续编辑 | `requirement.reopened` |
| `editReadyRequirement` | `ready` | `draft` | 操作者无权限；当前状态不允许 | 无 | 清除已就绪结论，要求重新评审 | `requirement.ready_edited` |
| `includeInTrain` | `ready` | `included` | 需求不是已就绪；需求已关联未完成火车；火车已完成或已取消；需求归属系统未搭载；操作者无权限 | 容量达到或超过阈值；容量超限；依赖未满足；依赖系统未参车；依赖已取消 | 创建纳版关系；占用容量；必要时把火车置为进行中 | `requirement.included` |
| `removeFromTrain` | `included` | `ready` | 移除原因为空；操作者无权限；当前状态不允许；纳版关系不存在 | 无 | 解除火车关联；释放容量 | `requirement.removed_from_train` |
| `changeIncludedRequirement` | `included` | `notReady` | 变更原因为空；无关键字段变更摘要；操作者无权限；当前状态不允许 | 无 | 解除火车关联；释放容量；保存关键字段前后摘要 | `requirement.included_changed` |
| `releaseToProduction` | `included` | `released` | 操作者无权限；当前状态不允许；纳版关系不存在 | 当前日期早于统一投产节点时提示提前投产风险 | 记录投产时间和操作人；需求不再阻断完成版本火车 | `requirement.released` |
| `rollbackProduction` | `released` | `ready` | 回滚原因为空；原因超过 500 字；操作者无权限；当前状态不允许 | 无 | 记录回滚事实；不恢复原火车纳版关系 | `requirement.rolled_back` |
| `cancelRequirement` | `draft`, `inReview`, `notReady`, `ready`, `rejected`, `included` | `cancelled` | 取消原因为空；原因超过 500 字；已投产需求取消；已取消需求再次取消；操作者无权限 | 取消已纳版需求时提示会退出当前火车 | 已纳版时解除火车关联并释放容量 | `requirement.cancelled` |

### 4.2 纳版 includeInTrain

纳版表示火车管理员确认某个已就绪需求进入版本火车交付范围，并开始占用对应系统容量。

允许条件：

- 需求状态为 `ready`。
- 需求归属系统已经作为 `TrainSystem` 搭载到目标版本火车。
- 目标版本火车不是 `completed` 或 `cancelled`。
- 需求当前没有关联其他未完成版本火车。
- 操作者具备火车管理员权限。

硬阻断：

- 任何非法状态纳版。
- 目标火车不存在、已完成或已取消。
- 需求归属系统未参车。
- 需求已经纳入另一趟未完成火车。
- 操作者无权限。

软风险：

- 纳版后容量使用率达到或超过 90%。
- 纳版后容量超限。
- 前置依赖未满足。
- 前置依赖所属系统未参车。
- 前置依赖已取消。

副作用：

- 创建 `TrainRequirement`。
- 设置需求状态为 `included`。
- 关联需求当前版本火车。
- 将需求点数计入对应 `TrainSystem` 已分配容量。
- 如火车仍为 `planned`，可转为 `running`。
- 生成包含容量和依赖风险确认的审计事件。

### 4.3 移除 removeFromTrain

移除表示火车管理员将已纳版需求从当前版本火车范围移出，需求回到已就绪。

允许条件：

- 需求状态为 `included`。
- 存在当前纳版关系。
- 移除原因必填。
- 操作者具备火车管理员权限。

副作用：

- 删除或关闭当前 `TrainRequirement`。
- 需求状态变为 `ready`。
- 清除需求当前版本火车关联。
- 释放对应系统容量。
- 审计移除原因、前后状态和容量变化。

### 4.4 已纳版变更 changeIncludedRequirement

已纳版变更是显式操作，不等同于普通编辑。

触发字段：

- 需求标题或描述发生影响范围的修改。
- 优先级变化。
- 工作量点数变化。
- 归属系统变化。
- 依赖需求新增、删除或变更。
- 业务归属人或产品经理变化。
- 火车管理员认定影响范围、容量或投产风险的其他字段。

允许条件：

- 需求状态为 `included`。
- 操作者是业务归属人 BA、产品经理或火车管理员。
- 变更原因必填。
- 必须提供关键字段变更前后摘要。

副作用：

- 需求状态变为 `notReady`。
- 解除当前版本火车纳版关系。
- 释放容量。
- 保存关键字段前后摘要。
- 需求必须重新发起评审，通过后才能再次纳版。

### 4.5 投产 releaseToProduction

投产是需求级状态变化；统一投产只是批量入口。

允许条件：

- 需求状态为 `included`。
- 操作者具备火车管理员权限。
- 存在当前纳版关系。

副作用：

- 需求状态变为 `released`。
- 记录投产时间和操作人。
- 投产事实进入审计。
- 该需求不再作为 `included` 需求阻断完成版本火车。

### 4.6 回滚 rollbackProduction

回滚表示已投产需求因上线结果需要撤回，回到已就绪等待重新规划。

允许条件：

- 需求状态为 `released`。
- 操作者具备火车管理员权限。
- 回滚原因必填。

副作用：

- 需求状态变为 `ready`。
- 不恢复原版本火车纳版关系。
- 不新增长期“已回滚”状态。
- 回滚事实通过审计事件保留。

### 4.7 取消 cancelRequirement

取消需求只适用于投产前需求。

允许条件：

- 需求状态为 `draft`、`inReview`、`notReady`、`ready`、`rejected` 或 `included`。
- 操作者是业务归属人 BA 或火车管理员。
- 取消原因必填。

硬阻断：

- `released` 需求取消。
- `cancelled` 需求继续流转。
- 取消原因为空或超过 500 字。
- 操作者无权限。

副作用：

- 需求状态变为 `cancelled`。
- 已纳版需求取消时解除火车关联并释放容量。
- 审计取消原因、前后状态和容量变化。

## 5. 版本火车状态机

### 5.1 火车事件总表

| 事件 | 允许前置状态 | 目标状态 | 硬阻断规则 | 软风险提示 | 领域副作用 | 审计事件 |
|---|---|---|---|---|---|---|
| `startTrain` | `planned` | `running` | 当前状态不允许；操作者无权限 | 当前日期早于开始日期时提示提前开始 | 记录开始时间；允许纳版管理进入运行态 | `train.started` |
| `completeTrain` | `planned`, `running` | `completed` | 当前日期早于统一投产节点；仍存在 `included` 需求；火车已取消；操作者无权限 | 存在已取消或已回滚历史需求时仅作摘要提示 | 关闭火车生命周期；保留历史周期占用 | `train.completed` |
| `cancelTrain` | `planned`, `running` | `cancelled` | 取消原因为空；操作者无权限；火车已完成 | 仍有已纳版需求时提示会批量移出 | 取消火车；移出本车未投产纳版需求并释放容量 | `train.cancelled` |

### 5.2 完成版本火车 completeTrain

完成版本火车是火车级操作，不等于需求投产。

允许条件：

- 火车状态为 `planned` 或 `running`。
- 当前日期不早于统一投产节点。
- 本车不存在仍处于 `included` 状态的需求。
- 操作者具备火车管理员权限。

硬阻断：

- 当前日期早于统一投产节点。
- 仍有已纳版未投产需求。
- 火车已取消。
- 操作者无权限。

副作用：

- 火车状态变为 `completed`。
- 记录完成时间和操作人。
- 已完成火车仍参与后续周期重叠判断。
- 生成完成审计事件，摘要本车需求投产、回滚、取消和移除情况。

## 6. 硬阻断与软风险口径

### 6.1 硬阻断

硬阻断表示命令必须失败，不允许通过风险确认绕过。

- 非法状态流转。
- 操作者无权限。
- 必填原因或意见缺失。
- 需求必填业务字段不完整。
- 工作量点数不在 1-100 正整数范围。
- 目标版本火车不存在、已完成或已取消。
- 需求归属系统未搭载到目标火车。
- 需求已关联另一趟未完成版本火车。
- 已投产需求取消。
- 已取消需求继续流转。
- 依赖需求不存在。
- 自依赖或循环依赖。
- 完成版本火车时当前日期早于统一投产节点。
- 完成版本火车时仍存在 `included` 需求。

### 6.2 软风险提示

软风险表示命令可以成功，但必须提示操作者并进入审计摘要。需要强制确认的软风险必须记录确认说明。

- 纳版后容量使用率达到或超过 90%。
- 纳版后容量超限。
- 依赖需求未纳入当前版本火车。
- 依赖需求所属系统未参车。
- 依赖需求已取消。
- 当前日期早于统一投产节点时提前投产。
- 取消火车时仍存在已纳版需求。

## 7. 操作审计设计

### 7.1 审计事件类型

需求事件：

- `requirement.created`
- `requirement.updated`
- `requirement.review_submitted`
- `requirement.review_approved`
- `requirement.review_rejected`
- `requirement.reopened`
- `requirement.ready_edited`
- `requirement.included`
- `requirement.removed_from_train`
- `requirement.included_changed`
- `requirement.released`
- `requirement.rolled_back`
- `requirement.cancelled`
- `requirement.dependency_updated`

版本火车事件：

- `train.created`
- `train.system_configured`
- `train.capacity_configured`
- `train.key_milestones_updated`
- `train.started`
- `train.completed`
- `train.cancelled`

AI 和纳版建议事件：

- `ai_schedule.generated`
- `ai_schedule.confirmed`
- `ai_schedule.partially_confirmed`

### 7.2 审计关键字段

所有审计事件必须包含：

- `eventType`：事件类型。
- `objectType`：`requirement`、`releaseTrain`、`trainSystem`、`aiScheduleRun` 等。
- `objectId`：业务对象 ID。
- `operatorId`：操作者。
- `operatedAt`：操作时间。
- `reasonOrComment`：原因、意见或确认说明。
- `previousStatus`：前置状态，若适用。
- `nextStatus`：目标状态，若适用。
- `summary`：面向复盘的短摘要。

按场景追加字段：

- 状态流转：前后状态、命令名称、拒绝或失败原因。
- 纳版：火车 ID、系统编码、需求点数、容量变化、风险确认。
- 移除：火车 ID、释放点数、移除原因。
- 已纳版变更：关键字段变更前后摘要、释放点数、变更原因。
- 投产：投产时间、火车 ID、操作人。
- 回滚：回滚原因、原投产时间、是否保留原火车关联。MVP 固定为不保留。
- 取消：取消原因、是否释放容量。
- 完成版本火车：统一投产节点、本车需求状态统计、完成操作人。
- AI 建议：输入摘要、建议纳入 ID、建议延期 ID、依赖风险、容量预估、人工确认结果。

### 7.3 字段变更摘要

字段变更摘要只保存关键字段前后值，不保存完整对象快照。

推荐结构：

```ts
type FieldChangeSummary = {
  field: string;
  before: string | number | string[] | null;
  after: string | number | string[] | null;
};
```

已纳版变更必须至少记录本次发生变化的实质字段。若归属系统或工作量点数变化，还必须记录对应容量释放摘要。

## 8. TDD 实施顺序

测试只通过领域服务公共接口断言行为，不测试内部状态表或私有函数。

推荐红绿循环：

1. `includeInTrain` tracer bullet：已就绪需求纳版后变为已纳版、关联火车、占用容量、产生审计事件。
2. 非已就绪需求纳版失败，并返回非法状态硬阻断。
3. 容量达到 90% 或超限时纳版仍成功，但返回风险并写入审计。
4. 依赖未满足、依赖系统未参车、依赖已取消时纳版仍成功，但风险等级不同。
5. `removeFromTrain` 解除纳版关系、需求回到已就绪、释放容量。
6. `changeIncludedRequirement` 回退未就绪、释放容量、记录字段变更摘要。
7. `releaseToProduction` 将已纳版需求投产，并使其不再阻断火车完成。
8. `rollbackProduction` 将已投产需求回到已就绪，不恢复原火车关系。
9. `cancelRequirement` 覆盖普通取消、已纳版取消释放容量、已投产取消硬阻断。
10. `completeTrain` 覆盖满足条件完成、早于统一投产节点失败、仍有已纳版需求失败。

每个测试命名应表达业务行为，例如：

- `includes_ready_requirement_in_train_and_records_capacity_audit`
- `rejects_include_when_requirement_is_not_ready`
- `warns_but_allows_include_when_capacity_is_exceeded`
- `changes_included_requirement_back_to_not_ready_and_releases_capacity`

## 9. 验收映射

| Issue 验收标准 | 本文档覆盖位置 |
|---|---|
| 明确需求状态机事件、前置状态、目标状态和副作用 | 第 4 章 |
| 覆盖纳版、移除、已纳版变更、投产、回滚、取消需求、完成版本火车等核心行为 | 第 4 章、第 5 章 |
| 标明哪些规则是硬阻断，哪些是软风险提示 | 第 6 章 |
| 定义操作审计事件类型和关键摘要字段 | 第 7 章 |

## 10. 明确不在本 issue 范围内

- 不实现代码骨架。
- 不创建数据库迁移。
- 不设计 UI 页面细节。
- 不引入真实 AI 模型接口。
- 不改变 PRD v1.2 和 `CONTEXT.md` 已确认的领域边界。
