# US2.3-班次列表查询与火车切换 测试治理 Specs

## 1. 结论摘要
| 项目 | 内容 |
|---|---|
| 本次范围 | Task2 版本火车管理：US2.3 班次列表查询与火车切换 |
| 是否可进入覆盖分析 | 是 |
| 阻塞项 | 无。分支、commit、JMeter 报告、UI 自动化报告信息缺失，作为待确认项记录，不阻塞本轮基于源码和文档的覆盖分析 |
| 后端单测门禁提醒 | 增量覆盖率 > 80%，通过率 100% |
| 前端单测口径 | 默认非硬门禁，仅复杂可隔离逻辑触发建议 |

## 2. 需求与用户故事
| 用户故事 | 标题 | 纳入范围 | 说明 |
|---|---|---|---|
| US2.3 | 班次列表查询与火车切换 | 是 | 以 `/schedules` 班次列表页为入口，覆盖全局班次列表、所属火车切换、分页、字段展示、详情跳转、新增/编辑入口、状态操作、权限按钮显隐差距 |
| 用户相关火车过滤 | 用户相关火车过滤 | 否 | 用户已确认本轮先不做 |
| 默认选中相关火车 | 默认选中相关火车 | 否 | 用户已确认本轮先不做 |

## 3. 仓库与版本
| 仓库类型 | 路径/仓库 | 分支 | commit/range | 说明 |
|---|---|---|---|---|
| 后端 | `release-train/apps/server` | 待确认 | 待确认 | 本轮指定代码范围：`src/modules/trains/routes/schedule.ts`、`src/modules/trains/services/train.service.ts` |
| 前端 | `release-train/apps/web` | 待确认 | 待确认 | 本轮指定代码范围：`src/pages/trains/schedules/index.tsx`、`src/services/train.ts` |
| 测试资产 | `release-train/apps/server/src/__tests__`、`release-train/apps/server/src/modules/trains/services` | 待确认 | 待确认 | 已发现后端 API 测试和 service 单测；JMeter 报告待确认 |
| 文档 | `03-需求与设计/Task2-版本火车管理` | 待确认 | 文档版本见文件名 | 用户故事、详细设计、测试案例均已定位 |

## 4. 文档与测试资产
| 类型 | 文件/路径 | 状态 | 说明 |
|---|---|---|---|
| 需求 | `03-需求与设计/Task2-版本火车管理/RT-T2-版本火车管理-用户故事_v2.0_20260516.md` | 已确认 | 仅取 US2.3 相关内容；用户相关火车过滤、默认选中相关火车不纳入本轮 |
| 详细设计 | `03-需求与设计/Task2-版本火车管理/US详细设计/RT-T2-US2.3-版本火车列表-详细设计_v1.0_20260516.md` | 已确认 | 设计状态为按现有代码校准，入口为 `/schedules` |
| 测试案例 | `03-需求与设计/Task2-版本火车管理/测试案例/RT-T2-US2.3-班次列表查询与火车切换-测试案例_v1.1_20260516.md` | 已确认 | 包含 8 个 API 案例、12 个前端案例、3 个差距验证案例 |
| 单测文件 | `release-train/apps/server/src/modules/trains/services/train.service.unit.test.ts` | 已确认 | 覆盖 `listAllSchedules`、`listTrainSchedules`、`updateTrainScheduleStatus` |
| API 测试文件 | `release-train/apps/server/src/__tests__/t2-us2.3-schedule-api.test.ts` | 已确认 | 覆盖 US2.3 API 案例；是否作为 JMeter 等价证据由后续 api-jmeter 判断 |
| JMeter 报告 | 待确认 | 缺失 | 未在本轮输入中提供 JMeter 脚本或执行报告 |
| UI 自动化报告 | 待确认 | 缺失 | 未在本轮输入中提供 Playwright/Cypress 脚本或执行报告 |
| 人工验证证据 | `evidence/US2.3-班次列表查询与火车切换/summary.md` | 已存在，待更新 | 已有轻量 summary，但本轮是否启用人工验证需在 manual-evidence 步骤确认 |

## 5. Analysis Units
| 分析单元 | 类型 | 范围 | 后续输出 |
|---|---|---|---|
| US2.3-班次列表查询与火车切换 | 用户故事 | 全局班次列表、所属火车切换、分页、字段展示、详情跳转、新增/编辑入口、状态操作、权限按钮显隐差距 | `analysis-US2.3-班次列表查询与火车切换.md` |

## 6. 人工验证意向
| 是否需要人工验证 | 范围 | 说明 |
|---|---|---|
| 待确认 | 前端 UI 展示、页面跳转、弹窗、状态按钮、角色按钮显隐 | 之前存在人工 evidence summary；本轮重新执行到 manual-evidence 时需要用户确认是否启用或复用 |

## 7. 待确认项
| 编号 | 问题 | 责任人 | 影响 |
|---|---|---|---|
| Q1 | 后端仓库本次分析分支、commit/range 未提供 | 研发负责人 / 后端开发 | final-report 中只能写待确认，不能写完整版本追溯 |
| Q2 | 前端仓库本次分析分支、commit/range 未提供 | 研发负责人 / 前端开发 | final-report 中只能写待确认，不能写完整版本追溯 |
| Q3 | 是否存在 JMeter 脚本或执行报告未提供 | 测试人员 / API 自动化负责人 | api-jmeter 只能基于已有 API 测试文件和源码判断覆盖，不得编造 JMeter 结果 |
| Q4 | 是否存在 UI 自动化脚本或执行报告未提供 | 前端开发 / UI 自动化负责人 | ui-flow 只能输出缺失或人工替代建议，不得写已执行 |
| Q5 | 本轮是否启用人工验证 | 测试人员 / 测试负责人 | manual-evidence 需要用户确认后才能创建或更新证据包 |

## 8. 后续执行建议
1. testgov-analyzer：读取本 specs，重新分析需求、详细设计、测试案例和指定前后端代码范围。
2. testgov-unit-gate：仅基于 analyzer 传入的 L1 后端单测候选，检查已有单测和覆盖证据。
3. testgov-api-jmeter：检查 L2 API/JMeter 覆盖；如果无 JMeter，只能标记 JMeter 缺失并引用可用 API 自动化证据。
4. testgov-ui-flow / testgov-manual-evidence：检查 L3 UI 自动化；如用户确认人工验证，再处理 evidence summary。
5. testgov-final-report：只聚合上游结果，不重新计算、不编造结论。