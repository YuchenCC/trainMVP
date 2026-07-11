# T2-US2.3 班次列表查询与火车切换 - 单测治理报告

> 基于 `reports/test-strategy/ST-T2-US2.3-测试策略_v1.0_20260630.md` 分析

## 1. 单测门禁摘要

| 项目 | 结果 |
|---|---|
| 变更范围 | T2-US2.3 班次列表查询与火车切换 |
| 已检查变更文件数 | 1 |
| 必须覆盖项 | 8 |
| 排除项 | 0 |
| 已执行单测数 | 25 |
| 通过数 | 25 |
| 失败数 | 0 |
| 单测通过率 | 100% |
| 增量覆盖率 | 20% |
| 覆盖率门禁 | 不通过 |
| 最终结论 | 不通过 |

后端 L1 是默认硬门禁，必须单独展示，且不能被 L2/L3/人工验证抵扣。

## 2. 已有测试证据

| 测试文件 | 测试层级 | 匹配信号 | 覆盖内容 | 是否计入单测门禁 |
|---|---|---|---|---|
| `train.service.unit.test.ts` | L1 | `listAllSchedules`、`listTrainSchedules`、`updateTrainScheduleStatus` | 分页计算、排序聚合、火车校验、状态机流转、分页边界值、事务副作用、事务回滚、幂等性 | 是 |
| `t2-us2.3-schedule-api.test.ts` | L2 | API 路由 | 接口契约、鉴权、参数校验 | 否 |
| `t2-us2.3-schedules-list.test.ts` | L3 | 前端页面 | UI 交互流程 | 否 |

## 3. L1 策略案例覆盖检查

从 `reports/test-strategy/ST-T2-US2.3-测试策略_v1.0_20260630.md` 的「3.1 L1 后端单测」章节提取。

| 覆盖重点 | 策略建议 | 现有覆盖 | 缺口 | 检查结论 |
|---|---|---|---|---|
| 全局班次列表分页计算 | 测试边界参数（page=0、负数、超大 pageSize） | ✅ 默认参数、自定义参数、空结果集、page=0/pageSize=0 容错、负数容错、最大值截断 | 无 | 已覆盖 |
| 全局班次列表排序 | 测试按 createdAt 倒序 | ✅ `createdAt` 倒序、容量聚合 | 无 | 已覆盖 |
| 全局班次列表字段聚合 | 测试 totalCapacity、usedCapacity、systemCount、requirementCount | ✅ `createdAt` 倒序、容量聚合 | 无 | 已覆盖 |
| 指定火车班次查询 | 测试火车存在/不存在、空列表 | ✅ 火车存在/不存在、空列表、只返回该火车班次显式断言 | 无 | 已覆盖 |
| 班次状态流转 | 测试 PLANNING→IN_PROGRESS、IN_PROGRESS→LOCKED_DOWN、LOCKED_DOWN→RELEASED 及非法流转 | ✅ 6 种合法/非法流转、LOCKED_DOWN/RELEASED 需求状态同步 | 无 | 已覆盖 |
| 班次状态变更事务副作用 | 测试 LOCKED_DOWN 时需求 FROZEN、RELEASED 时需求 RELEASED | ✅ 6 种合法/非法流转、LOCKED_DOWN/RELEASED 需求状态同步 | 无 | 已覆盖 |
| 班次状态变更幂等性 | 测试相同幂等键只执行一次 | ✅ 已实现幂等机制，相同幂等键只执行一次，不同幂等键可执行多次 | 无 | 已覆盖 |
| 班次创建 | 测试参数校验、日期计算、快照创建 | ❌ 无 | `createTrainSchedule` 函数未覆盖 | 未覆盖 |
| 班次更新 | 测试乐观锁、日期更新、自定义关键日期 | ❌ 无 | `updateTrainSchedule` 函数未覆盖 | 未覆盖 |
| 班次取消 | 测试事务回滚、需求状态恢复 | ❌ 无 | `cancelTrainSchedule` 函数未覆盖 | 未覆盖 |
| 关键日期预览 | 测试日期校验、计算逻辑 | ❌ 无 | `previewKeyDates` 函数未覆盖 | 未覆盖 |

## 4. 变更逻辑覆盖分类

| 文件 | 变更逻辑 | 分类 | 证据 | 推荐测试层级 |
|---|---|---|---|---|
| `train.service.ts:874-934` | `listAllSchedules` 分页计算、排序、字段聚合 | 单测已覆盖 | 10 个单测用例覆盖核心逻辑 | L1 |
| `train.service.ts:826-872` | `listTrainSchedules` 火车校验、数据映射 | 单测已覆盖 | 3 个单测用例覆盖核心逻辑 | L1 |
| `train.service.ts` | `updateTrainScheduleStatus` 状态机流转 | 单测已覆盖 | 12 个单测用例覆盖状态流转、事务和幂等性 | L1 |
| `train.service.ts:1998-2089` | `createTrainSchedule` 创建班次 | 缺少单测 | 函数未覆盖 | L1 |
| `train.service.ts:2090-2150` | `updateTrainSchedule` 更新班次 | 缺少单测 | 函数未覆盖 | L1 |
| `train.service.ts:2151-2200` | `cancelTrainSchedule` 取消班次 | 缺少单测 | 函数未覆盖 | L1 |
| `train.service.ts:2201-2250` | `previewKeyDates` 关键日期预览 | 缺少单测 | 函数未覆盖 | L1 |
| `train.service.ts:2251-2280` | `getTrainScheduleById` 获取班次详情 | 缺少单测 | 函数未覆盖 | L1 |

## 5. 自测检查点 L1 覆盖现状

| 检查点 | 优先级 | 现有单测是否已覆盖 | 覆盖证据 |
|---|---|---|---|
| 查询语句含分页、且索引生效的执行计划自测用例，分页逻辑正常 | P0 | 是 | `listAllSchedules` 分页测试 |
| 重要参数校验（涉及是否能命中索引的字段、模糊查询未转译特殊字符等），避免一次性加载过多数据 | P0 | 是 | 分页边界值、负数容错、最大值限制测试 |
| 数据不一致：部分提交或回滚不彻底；幻读/不可重复读；异步任务导致 | P0 | 是 | 事务回滚测试 |
| 验证所有执行状态、审批状态、交易状态的流转是否符合业务规则 | P0 | 是 | `updateTrainScheduleStatus` 状态机测试 |
| 确保无效状态跳转被拦截 | P0 | 是 | 非法状态流转测试 |
| 记账交易是否正确记录事务处理的中间状态，并根据关联事务的状态进行提交确认或回滚 | P0 | 是 | 事务副作用测试（需求状态同步） |
| 异常场景模拟测试：验证是否触发回滚或补偿操作 | P0 | 是 | 事务失败回滚测试 |
| 重复请求测试：验证系统是否仅处理第一次请求 | P0 | 是 | 幂等性测试（相同幂等键只执行一次） |
| 开关类功能按预期效果生效的用例 | P0 | 是 | 状态机流转已覆盖 |
| 参数设计边界值自测用例 | P0 | 是 | 分页边界值测试（pageSize=0、负数、超大值） |
| 分页参数是否设置合理最大值，避免不合理的深度分页或单页数据过多 | P0 | 是 | pageSize 最大值限制（100）测试 |

## 6. 需补充单测清单

列出所有需要补充的单测，按优先级排序。

**清单来源规则**：需补充单测清单必须是以下三个章节未覆盖项的合集（去重合并）：

1. **第3节 L1 策略案例覆盖检查**：检查结论为「部分覆盖」或「未覆盖」的项
2. **第4节 变更逻辑覆盖分类**：分类为「缺少单测」或「断言较弱」的项
3. **第5节 自测检查点 L1 覆盖现状**：现有单测是否已覆盖为「否」或「部分」的项

| 优先级 | 文件 | 检查点/变更逻辑 | 建议测试用例名 | 推荐测试层级 |
|---|---|---|---|---|
| P0 | `train.service.ts` | `createTrainSchedule` - 参数校验 | shouldRejectWhenNameIsEmpty | L1 |
| P0 | `train.service.ts` | `createTrainSchedule` - 参数校验 | shouldRejectWhenTrainNotExists | L1 |
| P0 | `train.service.ts` | `createTrainSchedule` - 日期计算 | shouldCalculateSealDate | L1 |
| P0 | `train.service.ts` | `createTrainSchedule` - 日期计算 | shouldCalculateReleaseDate | L1 |
| P0 | `train.service.ts` | `createTrainSchedule` - 快照创建 | shouldCreateInitialSnapshot | L1 |
| P0 | `train.service.ts` | `updateTrainSchedule` - 乐观锁 | shouldRejectWhenVersionMismatch | L1 |
| P0 | `train.service.ts` | `updateTrainSchedule` - 日期更新 | shouldUpdateStartDate | L1 |
| P0 | `train.service.ts` | `updateTrainSchedule` - 日期更新 | shouldUpdateEndDate | L1 |
| P0 | `train.service.ts` | `cancelTrainSchedule` - 事务回滚 | shouldRollbackWhenCancelFails | L1 |
| P0 | `train.service.ts` | `cancelTrainSchedule` - 需求状态恢复 | shouldRestoreRequirementStatus | L1 |
| P0 | `train.service.ts` | `cancelTrainSchedule` - 已投产班次不可取消 | shouldRejectWhenScheduleIsReleased | L1 |
| P1 | `train.service.ts` | `previewKeyDates` - 日期计算 | shouldCalculateStandard25DaysCycle | L1 |
| P1 | `train.service.ts` | `previewKeyDates` - 日期计算 | shouldCalculateCustomCycle | L1 |
| P1 | `train.service.ts` | `getTrainScheduleById` - 查询 | shouldReturnScheduleWhenExists | L1 |
| P1 | `train.service.ts` | `getTrainScheduleById` - 查询 | shouldReturnNullWhenNotExists | L1 |

## 7. 未覆盖或排除风险

| 文件 | 变更逻辑 | 分类 | 原因 | 风险 | 处理要求 |
|---|---|---|---|---|---|
| 无 | - | - | - | - | - |

无未覆盖或排除风险。

## 8. 单测执行证据

| 证据项 | 内容 |
|---|---|
| 执行命令 | `cd release-train/apps/server && npx vitest run src/modules/trains/services/train.service.unit.test.ts --coverage` |
| 执行单测文件数 | 1 |
| 单测通过数 | 25 |
| 单测失败数 | 0 |
| 覆盖率来源 | vitest coverage-v8 |
| `train.service.ts` 语句覆盖率 | 20% |
| `train.service.ts` 分支覆盖率 | 97.05% |
| `train.service.ts` 函数覆盖率 | 13.88% |
| 增量覆盖率计算方式 | 根据变更代码范围实际执行结果，20% |

## 9. 最终决策

决策：不通过

原因：

1. 增量覆盖率 20% < 80% 硬门禁要求
2. 单测通过率 100% 符合要求
3. 已覆盖函数：3/8（37.5%）
4. 未覆盖核心函数：`createTrainSchedule`、`updateTrainSchedule`、`cancelTrainSchedule`、`previewKeyDates`、`getTrainScheduleById`

必须处理项：

1. 补充 `createTrainSchedule` 单测（5 个案例）
2. 补充 `updateTrainSchedule` 单测（3 个案例）
3. 补充 `cancelTrainSchedule` 单测（3 个案例）
4. 补充 `previewKeyDates` 单测（2 个案例）
5. 补充 `getTrainScheduleById` 单测（2 个案例）
6. 重新运行单元测试验证覆盖率 ≥ 80%

## 下游报告提示

| 报告字段 | 值 |
|---|---|
| 单测门禁 | 不通过 |
| 是否可纳入项目经理/测试经理最终报告 | 是 |
| 是否包含 API/集成/E2E 旁证 | 否 |
| 建议交付结论 | 不建议提测 |

---

*文档编号：ST-T2-US2.3-单测治理*  
*版本：v1.0*  
*日期：2026-06-30*