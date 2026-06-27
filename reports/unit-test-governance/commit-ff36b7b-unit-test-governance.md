# 单测治理报告

## 1. 单测门禁摘要

| 项目 | 结果 |
|---|---|
| 变更范围 | 提交 `ff36b7bca59ecbe37cad7c49797cc2f025195da8` |
| 已检查变更文件数 | 1 |
| 必须覆盖项 | 8 |
| 排除项 | 0 |
| 已执行单测数 | 8 |
| 通过数 | 8 |
| 失败数 | 0 |
| 单测通过率 | 100% |
| 增量覆盖率 | 98.51% |
| 覆盖率门禁 | 通过 |
| 最终结论 | 通过 |

## 2. 已有测试证据

| 测试文件 | 测试层级 | 匹配信号 | 覆盖内容 | 是否计入单测门禁 |
|---|---|---|---|---|
| `release-train/apps/server/src/modules/requirements/service.test.ts` | 单元测试 | `generateReqCode`、`createRequirement`、`reqCode`、`P2002` | 数字最大序号、编号格式、唯一性检查、内部重试、重试耗尽、外层事务重试、非 reqCode 冲突不重试、依赖创建路径 | 是 |
| `release-train/apps/server/src/__tests__/t1-us1-requirement-entry.test.ts` | API / 集成测试 | `POST /api/requirements`、`reqCode` | 通过 HTTP 接口创建需求，并断言编号格式 | 否 |
| `release-train/apps/server/src/__tests__/t1-requirements-api-automation.test.ts` | API / 集成测试 | `POST /api/requirements`、`reqCode` | 通过 HTTP 接口创建需求，并断言编号格式 | 否 |
| `release-train/apps/server/src/__tests__/api-requirement-query.test.ts` | API / 集成测试 | 查询响应包含 `reqCode` | 查询接口返回需求编号字段 | 否 |

## 3. 变更逻辑覆盖分类

| 文件 | 变更逻辑 | 分类 | 证据 | 推荐测试层级 |
|---|---|---|---|---|
| `release-train/apps/server/src/modules/requirements/service.ts` | 当年份下没有历史编号时生成 `REQ-2026-0001` | 单测已覆盖 | `generates 0001 when there is no existing requirement code for the year` | 单元测试 |
| `release-train/apps/server/src/modules/requirements/service.ts` | 使用数字最大序号，避免字符串排序错误 | 单测已覆盖 | `uses numeric max sequence instead of string ordering` 覆盖 `0999`、`1000`、`0009` -> `1001` | 单元测试 |
| `release-train/apps/server/src/modules/requirements/service.ts` | 历史编号乱序时仍生成正确的 4 位编号 | 单测已覆盖 | `handles unordered existing codes and keeps the four-digit format` 覆盖 `0002`、`0010`、`0009` -> `0011` | 单元测试 |
| `release-train/apps/server/src/modules/requirements/service.ts` | 通过 `findUnique` 检查生成编号唯一性 | 单测已覆盖 | 无历史编号测试断言了生成编号的唯一性查询 | 单元测试 |
| `release-train/apps/server/src/modules/requirements/service.ts` | 生成编号已存在时继续重试 | 单测已覆盖 | `retries when the generated code already exists and then returns the next available code` | 单元测试 |
| `release-train/apps/server/src/modules/requirements/service.ts` | 重试耗尽后抛出 `REQUIREMENT_CODE_CONFLICT` | 单测已覆盖 | `throws a requirement code conflict after retry exhaustion` | 单元测试 |
| `release-train/apps/server/src/modules/requirements/service.ts` | `createRequirement` 遇到 `P2002 reqCode` 后重试事务 | 单测已覆盖 | `retries the transaction after a reqCode unique conflict and then creates the requirement` | 单元测试 |
| `release-train/apps/server/src/modules/requirements/service.ts` | 非 `reqCode` 唯一冲突不应重试 | 单测已覆盖 | `does not retry non-reqCode unique conflicts` | 单元测试 |
| `release-train/apps/server/src/modules/requirements/service.ts` | 重构后的事务路径仍能创建依赖关系 | 单测已覆盖 | `creates dependency records inside the retried transaction path` | 单元测试 |

## 4. 未覆盖或排除风险

| 文件 | 变更逻辑 | 分类 | 原因 | 风险 | 处理要求 |
|---|---|---|---|---|---|
| `release-train/apps/server/src/modules/requirements/service.ts` | 依赖创建循环检测异常分支 | 缺少单测 | 增量覆盖率计算显示第 419 行未覆盖 | 低。本提交核心风险是需求编号排序和编号冲突处理，该分支不是本次修复主路径 | 可选后续补充：增加 dependencyIds 形成循环依赖时应抛错的单测 |

## 5. 单测执行证据

| 证据项 | 内容 |
|---|---|
| 执行命令 | `vitest run src/modules/requirements/service.test.ts --coverage --coverage.include=src/modules/requirements/service.ts` |
| 执行单测文件数 | 1 |
| 单测通过数 | 8 |
| 单测失败数 | 0 |
| 覆盖率来源 | Vitest v8 coverage JSON：`release-train/apps/server/coverage/coverage-final.json` |
| 增量覆盖率计算方式 | 基于提交 `ff36b7bca59ecbe37cad7c49797cc2f025195da8` 的可执行变更行计算，排除注释、空行和仅包含括号的行 |
| 变更行数 | 97 |
| 可执行变更行数 | 67 |
| 已覆盖可执行变更行数 | 66 |
| 未覆盖可执行变更行数 | 1（`service.ts:419`） |
| 增量覆盖率 | 98.51% |

## 6. 最终决策

决策：通过

原因：相关单测文件执行通过，8 个测试全部通过，单测通过率为 100%；本次提交可执行变更行的增量单测覆盖率为 98.51%，高于 80% 门禁。

必须处理项：无。

建议处理项：可后续补充“依赖创建时形成循环依赖应抛错”的单测，用于进一步覆盖依赖异常分支。

## 下游报告提示

| 报告字段 | 值 |
|---|---|
| 单测门禁 | 通过 |
| 是否可纳入项目经理/测试经理最终报告 | 是 |
| 是否包含 API/集成/E2E 旁证 | 是，已列为非门禁证据 |
| 建议交付结论 | 可提测 |