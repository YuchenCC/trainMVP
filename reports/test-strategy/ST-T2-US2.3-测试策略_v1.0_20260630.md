# T2-US2.3 班次列表查询与火车切换 - 测试策略与覆盖分析报告

## 1. 分析范围

| 项目 | 内容 |
|---|---|
| 分析范围 | T2-US2.3 班次列表查询与火车切换 |
| 测试案例来源 | `03-需求与设计/Task2-版本火车管理/测试案例/RT-T2-US2.3-班次列表查询与火车切换-测试案例_v1.1_20260516.md` |
| 需求/设计来源 | `03-需求与设计/Task2-版本火车管理/US详细设计/RT-T2-US2.3-版本火车列表-详细设计_v1.0_20260516.md` |
| 代码范围 | 后端 `release-train/apps/server/src/modules/trains/routes/schedule.ts`、`release-train/apps/server/src/modules/trains/services/train.service.ts`；前端 `release-train/apps/web/src/pages/trains/schedules/index.tsx` |
| planner 执行人 | 研发负责人 |
| 输入清单完整性 | 完整 |
| 口径差异 | 无 |
| 存量报告处理 | 不复用，重新生成 |

## 2. 分层测试方案

| 层级 | 结论 | 覆盖重点 | 后续执行 |
|---|---|---|---|
| L1 后端单测 | 本次后端增量代码需满足增量覆盖率 > 80%、通过率 100%；L2/API、L3/UI、M/人工验证不能抵扣该门禁 | 业务规则、状态流转、参数校验、异常分支、分页计算、字段聚合 | 按项目已有 skill 动态推荐 |
| L1 前端单测建议 | 仅条件触发建议，不是默认硬门禁 | 表单校验、权限显隐、分页排序筛选、状态管理 | 按项目已有 skill 动态推荐 |
| L2 API/JMeter | 8 个 API 测试案例已全部覆盖 | 接口契约、鉴权、入参校验、关键状态变化、错误码、幂等 | 按项目已有 skill 动态推荐 |
| L3 UI 自动化 | 12 个前端测试案例，需补充部分 E2E 测试 | P0/P1 用户流程、关键页面跳转、核心按钮、跨页面联动 | 按项目已有 skill 动态推荐 |
| M 人工验证 | 3 个差距验证案例需人工确认 | 低频 UI 展示、截图确认、SIT 环境验证 | 按项目已有 skill 动态推荐 |

## 3. 测试策略详细分析

### 3.1 L1 后端单测

**覆盖重点**：

| 覆盖重点 | 策略建议 | 现有覆盖 | 缺口 | 检查结论 |
|---|---|---|---|---|
| 全局班次列表分页计算 | 测试边界参数（page=0、负数、超大 pageSize） | `train.service.unit.test.ts` 已覆盖 | 无 | 已覆盖 |
| 全局班次列表排序 | 测试按 createdAt 倒序 | `train.service.unit.test.ts` 已覆盖 | 无 | 已覆盖 |
| 全局班次列表字段聚合 | 测试 totalCapacity、usedCapacity、systemCount、requirementCount | `train.service.unit.test.ts` 已覆盖 | 无 | 已覆盖 |
| 指定火车班次查询 | 测试火车存在/不存在、空列表 | `train.service.unit.test.ts` 已覆盖 | 无 | 已覆盖 |
| 班次状态流转 | 测试 PLANNING→IN_PROGRESS、IN_PROGRESS→LOCKED_DOWN、LOCKED_DOWN→RELEASED 及非法流转 | `train.service.unit.test.ts` 已覆盖 | 无 | 已覆盖 |
| 班次状态变更事务副作用 | 测试 LOCKED_DOWN 时需求 FROZEN、RELEASED 时需求 RELEASED | `train.service.unit.test.ts` 已覆盖 | 无 | 已覆盖 |
| 班次状态变更幂等性 | 测试相同幂等键只执行一次 | `train.service.unit.test.ts` 已覆盖 | 无 | 已覆盖 |
| 班次创建 | 测试参数校验、日期计算、快照创建 | 无 | `createTrainSchedule` 函数未覆盖 | 未覆盖 |
| 班次更新 | 测试乐观锁、日期更新、自定义关键日期 | 无 | `updateTrainSchedule` 函数未覆盖 | 未覆盖 |
| 班次取消 | 测试事务回滚、需求状态恢复 | 无 | `cancelTrainSchedule` 函数未覆盖 | 未覆盖 |
| 关键日期预览 | 测试日期校验、计算逻辑 | 无 | `previewKeyDates` 函数未覆盖 | 未覆盖 |

**L1 单测门禁候选覆盖**：
- 当前已有单测覆盖 `listAllSchedules`、`listTrainSchedules`、`updateTrainScheduleStatus` 三个核心函数
- 未覆盖的核心函数：`createTrainSchedule`、`updateTrainSchedule`、`cancelTrainSchedule`、`previewKeyDates`、`getTrainScheduleById`
- 需补充约 10-15 个单测案例以满足增量覆盖率 > 80%

### 3.2 L1 前端单测建议

| 覆盖重点 | 策略建议 | 现有覆盖 | 缺口 |
|---|---|---|---|
| 分页逻辑 | 建议抽取 `paginationUtils.ts` 进行单测 | 无 | 未覆盖 |
| 状态按钮显隐逻辑 | 建议抽取 `scheduleStatusButtons.tsx` 进行单测 | 无 | 未覆盖 |
| 表单校验 | 建议测试新增/编辑表单的日期校验 | 无 | 未覆盖 |

### 3.3 L2 API/JMeter

**已覆盖案例**：

| 测试案例 | 覆盖逻辑 | 证据 | 状态 |
|---|---|---|---|
| TC2.3-API-01 查询全局班次列表 | `GET /api/schedules` 返回结构和字段 | `t2-us2.3-schedule-api.test.ts` | 已覆盖 |
| TC2.3-API-02 全局班次列表分页 | 自定义分页参数、边界参数 | `t2-us2.3-schedule-api.test.ts` | 已覆盖 |
| TC2.3-API-03 全局班次按创建时间倒序 | createdAt 倒序排序 | `t2-us2.3-schedule-api.test.ts` | 已覆盖 |
| TC2.3-API-04 查询指定火车班次列表 | `GET /api/trains/:trainId/schedules` | `t2-us2.3-schedule-api.test.ts` | 已覆盖 |
| TC2.3-API-05 查询不存在火车的班次列表 | 火车不存在错误处理 | `t2-us2.3-schedule-api.test.ts` | 已覆盖 |
| TC2.3-API-06 未登录不可查询班次列表 | 认证拦截 | `t2-us2.3-schedule-api.test.ts` | 已覆盖 |
| TC2.3-API-07 非火车管理员不可创建班次 | RBAC 权限控制 | `t2-us2.3-schedule-api.test.ts` | 已覆盖 |
| TC2.3-API-08 非火车管理员不可变更班次状态 | RBAC 权限控制 | `t2-us2.3-schedule-api.test.ts` | 已覆盖 |

### 3.4 L3 UI 自动化

**待覆盖案例**：

| 测试案例 | 覆盖逻辑 | 证据 | 状态 |
|---|---|---|---|
| TC2.3-FE-01 进入班次列表页默认加载全局班次 | 页面标题、下拉框、表格、分页器 | `t2-us2.3-schedules-list.test.ts` | 待确认 |
| TC2.3-FE-02 火车下拉加载 | 下拉框展示火车列表 | `t2-us2.3-schedules-list.test.ts` | 待确认 |
| TC2.3-FE-03 切换所属火车刷新班次列表 | 表格刷新、只显示选中火车班次 | `t2-us2.3-schedules-list.test.ts` | 待确认 |
| TC2.3-FE-04 清空所属火车恢复全局列表 | 表格刷新、分页恢复 | `t2-us2.3-schedules-list.test.ts` | 待确认 |
| TC2.3-FE-05 班次列表字段展示 | 表格列字段验证 | `t2-us2.3-schedules-list.test.ts` | 待确认 |
| TC2.3-FE-06 点击班次行进入详情页 | 页面跳转 | `t2-us2.3-schedules-list.test.ts` | 待确认 |
| TC2.3-FE-07 未选择火车时不可新增班次 | 提示信息 | `t2-us2.3-schedules-list.test.ts` | 待确认 |
| TC2.3-FE-08 选择火车后可以打开新增班次弹窗 | 弹窗展示 | `t2-us2.3-schedules-list.test.ts` | 待确认 |
| TC2.3-FE-09 编辑班次弹窗 | 弹窗展示 | `t2-us2.3-schedules-list.test.ts` | 待确认 |
| TC2.3-FE-10 计划中班次显示开始操作 | 按钮显隐 | `t2-us2.3-schedules-list.test.ts` | 待确认 |
| TC2.3-FE-11 进行中班次显示封板操作 | 按钮显隐 | `t2-us2.3-schedules-list.test.ts` | 待确认 |
| TC2.3-FE-12 封板班次显示投产操作 | 按钮显隐 | `t2-us2.3-schedules-list.test.ts` | 待确认 |

### 3.5 M 人工验证

| 测试案例 | 覆盖逻辑 | 优先级 |
|---|---|---|
| TC2.3-GAP-01 班次列表未展示所属火车列 | 验证后端返回 trainName，前端是否展示 | P1 |
| TC2.3-GAP-02 按火车查询班次不支持后端分页 | 验证 `GET /api/trains/:trainId/schedules` 是否支持分页参数 | P1 |
| TC2.3-GAP-03 前端操作按钮未按角色隐藏 | 验证非火车管理员登录后按钮显隐 | P0 |

## 4. 变更逻辑覆盖分类

| 文件 | 变更逻辑 | 分类 | 证据 | 推荐测试层级 |
|---|---|---|---|---|
| `train.service.ts` - `listAllSchedules` | 分页计算、边界处理、排序、字段聚合 | 单测已覆盖 | `train.service.unit.test.ts` | L1 |
| `train.service.ts` - `listTrainSchedules` | 火车校验、班次查询、字段聚合 | 单测已覆盖 | `train.service.unit.test.ts` | L1 |
| `train.service.ts` - `updateTrainScheduleStatus` | 状态流转、事务副作用、幂等性 | 单测已覆盖 | `train.service.unit.test.ts` | L1 |
| `train.service.ts` - `createTrainSchedule` | 参数校验、日期计算、快照创建 | 需要单测覆盖 | 无 | L1 |
| `train.service.ts` - `updateTrainSchedule` | 乐观锁、日期更新、自定义关键日期 | 需要单测覆盖 | 无 | L1 |
| `train.service.ts` - `cancelTrainSchedule` | 事务回滚、需求状态恢复 | 需要单测覆盖 | 无 | L1 |
| `train.service.ts` - `previewKeyDates` | 日期校验、计算逻辑 | 需要单测覆盖 | 无 | L1 |
| `schedule.ts` - 路由层 | 认证、权限、参数校验 | API 测试已覆盖 | `t2-us2.3-schedule-api.test.ts` | L2 |
| `schedules/index.tsx` - 页面逻辑 | 分页、火车切换、状态按钮 | 需要 UI 测试 | `t2-us2.3-schedules-list.test.ts` | L3 |

## 5. TODO 清单

### 5.1 L1 单测 TODO

| 优先级 | 内容 | 建议完成时间 |
|---|---|---|
| P0 | 补充 `createTrainSchedule` 单测（参数校验、日期计算、快照创建） | 提测前 |
| P0 | 补充 `updateTrainSchedule` 单测（乐观锁、日期更新、自定义关键日期） | 提测前 |
| P0 | 补充 `cancelTrainSchedule` 单测（事务回滚、需求状态恢复） | 提测前 |
| P1 | 补充 `previewKeyDates` 单测（日期校验、计算逻辑） | 提测前 |
| P1 | 补充 `getTrainScheduleById` 单测（班次详情查询） | 提测前 |

### 5.2 L2 API TODO

| 优先级 | 内容 | 建议完成时间 |
|---|---|---|
| 无 | 8 个 API 测试案例已全部覆盖 | - |

### 5.3 L3 UI TODO

| 优先级 | 内容 | 建议完成时间 |
|---|---|---|
| P0 | 确认 `t2-us2.3-schedules-list.test.ts` 是否覆盖全部 12 个前端测试案例 | 提测前 |
| P0 | 补充缺失的前端 E2E 测试案例 | 提测前 |

### 5.4 M 人工验证 TODO

| 优先级 | 内容 | 建议完成时间 |
|---|---|---|
| P0 | TC2.3-GAP-03 验证非火车管理员按钮显隐 | SIT 阶段 |
| P1 | TC2.3-GAP-01 验证所属火车列展示 | SIT 阶段 |
| P1 | TC2.3-GAP-02 验证按火车查询分页 | SIT 阶段 |

## 6. 风险与建议

| 风险 | 影响 | 建议 |
|---|---|---|
| L1 单测覆盖率不足 | 后端核心逻辑（创建、更新、取消班次）未被单测覆盖，可能存在潜在 bug | 提测前补充 10-15 个单测案例 |
| 前端按钮未按角色隐藏 | 非管理员用户可能看到管理操作按钮，影响用户体验和安全性 | 前端实现按钮权限控制，后端已做拦截 |
| 按火车查询班次无分页 | 火车班次较多时前端加载缓慢 | 后端增加分页支持 |
| 班次列表未展示所属火车 | 用户无法直观区分不同火车的班次 | 前端增加火车名称列 |

## 7. 后续 Skill 路由

| 后续任务 | 推荐 skill | 是否存在 | 推荐原因 | 输入建议 |
|---|---|---|---|---|
| 单测门禁/增量覆盖率 | unit-test-governance | 是 | 检查 L1 单测门禁、增量覆盖率 | 本策略报告 |
| API/JMeter 覆盖 | automating-api-testing | 是 | L2 API 测试已覆盖，可验证执行结果 | 本策略报告 |
| UI 自动化或人工验证 | webapp-testing | 是 | 验证 L3 E2E 测试执行结果 | 本策略报告 |
| 最终覆盖报告 | test-report-generator | 是 | 聚合各层测试结果生成最终报告 | 本策略报告 + 单测治理报告 + API 测试报告 + UI 测试报告 |

---

*文档编号：ST-T2-US2.3-测试策略*  
*版本：v1.0*  
*日期：2026-06-30*