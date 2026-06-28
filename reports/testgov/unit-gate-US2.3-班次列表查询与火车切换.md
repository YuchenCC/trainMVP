# US2.3-班次列表查询与火车切换 后端单测门禁报告

## 1. 门禁结论
| 项目 | 结果 |
|---|---|
| 后端单测门禁 | 阻塞 |
| 增量覆盖率 | 无独立增量覆盖率报告 |
| 单测通过率 | 100%（16/16） |
| 是否满足提测门禁 | 否，缺少可判定的增量覆盖率证据 |
| 结论说明 | L1 service 单测已执行且全部通过，但当前 coverage 输出是全仓/文件覆盖率，不是本次 US2.3 变更的增量覆盖率报告；按 TestGov 门禁口径，不能用 L2/API、UI、人工验证或非增量覆盖率抵扣。 |

## 2. 执行证据
| 证据 | 路径/命令/报告 | 结果 |
|---|---|---|
| 单测命令 | `release-train/apps/server` 下执行：`vitest run src/modules/trains/services/train.service.unit.test.ts --coverage` | 通过：1 个测试文件，16 个测试全部通过 |
| 覆盖率报告 | 终端 coverage 输出 | 已读取，但不是独立增量覆盖率报告 |
| 已有单测文件 | `release-train/apps/server/src/modules/trains/services/train.service.unit.test.ts` | 已识别，覆盖 analyzer 传入的 L1 候选 service 逻辑 |
| JaCoCo 报告 | 不适用 | 当前工程为 Vitest/V8 coverage，不是 Java/JUnit5/JaCoCo |

## 3. 变更逻辑覆盖分类
| 变更点 | 关联代码 | 覆盖状态 | 单测文件 | 说明 |
|---|---|---|---|---|
| 全局班次列表默认分页、自定义分页、空列表、倒序、字段聚合 | `train.service.ts#listAllSchedules` | 已覆盖 | `train.service.unit.test.ts` | 单测文件包含默认分页、自定义分页、page=0、空结果、倒序、字段聚合等用例 |
| 指定火车班次列表、火车不存在、空班次 | `train.service.ts#listTrainSchedules` | 已覆盖 | `train.service.unit.test.ts` | 单测文件包含火车存在、火车不存在、无班次返回空列表 |
| 班次状态流转 | `train.service.ts#updateTrainScheduleStatus` | 已覆盖 | `train.service.unit.test.ts` | 单测文件包含合法流转、非法流转、RELEASED 不可变更、班次不存在 |
| 指定火车班次分页 | `train.service.ts#listTrainSchedules` | 缺失 | 无 | 当前代码不支持分页，本项是需求/设计差距，不应写成单测已覆盖 |
| routes 权限和接口契约 | `schedule.ts` | 排除 | 不计入 L1 | 属于 L2 API/JMeter 任务，不计入后端单测门禁 |

## 4. 缺失单测 TODO
| 优先级 | 代码/逻辑 | 必测分支 | 建议测试文件 | 原因 |
|---|---|---|---|---|
| P0 | 增量覆盖率报告 | 本次 US2.3 后端变更涉及的 service 逻辑增量覆盖率 > 80% | CI 或 coverage 工具输出的增量覆盖率报告 | 当前只有单测通过率和文件覆盖率，无法判定硬门禁通过 |
| P1 | 指定火车班次分页 | page/pageSize、total、totalPages、只返回指定火车班次 | `train.service.unit.test.ts` | 当前代码未实现分页；如果产品确认需要分页，必须先实现再补单测 |

## 5. 排除项与风险说明
| 项目 | 排除原因 | 风险 | 是否需其他证据 |
|---|---|---|---|
| `schedule.ts` route 权限和接口响应 | route 层更适合 L2 API/JMeter，不能计入 L1 单测门禁 | 若只看 service 单测，接口鉴权/认证缺口不可见 | 是，交给 `testgov-api-jmeter` |
| 前端角色按钮显隐 | 前端 UI/可隔离前端逻辑，不属于后端 L1 | 后端有权限兜底，但用户仍可能看到不可用管理按钮 | 是，交给 `testgov-ui-flow`，并建议前端 helper 单测 |
| UI 页面展示、弹窗、跳转 | 浏览器行为，不属于后端 L1 | 无 UI/人工证据时，管理层看不到页面实际验证结果 | 是，交给 L3/M |

## 6. 前端单测触发建议
| 前端逻辑 | 是否触发 | 建议 | 说明 |
|---|---|---|---|
| 角色按钮显隐 | 是 | 建议抽出 `canManageSchedule(role, status)` 或等价 helper 并补前端单测 | 属于权限显隐判断，当前代码只按状态显示按钮 |
| 状态到操作按钮集合 | 是 | 如重构为纯函数，补 PLANNING/IN_PROGRESS/LOCKED_DOWN/RELEASED 分支单测 | 当前状态按钮逻辑直接写在 render 内，后续可降低回归风险 |
| 指定火车切换后的分页状态 | 可选 | 若后端补分页，前端需补相应逻辑测试 | 当前选中火车时用返回列表长度设置分页总数 |
| 弹窗和普通展示字段 | 否 | 用 L3 或人工验证覆盖 | 不是默认前端单测硬门禁 |

## 7. 给最终报告的摘要
- 后端 L1 门禁：阻塞
- 单测执行：`train.service.unit.test.ts` 16/16 通过，单测通过率 100%
- 主要缺口：缺少本次 US2.3 后端变更的独立增量覆盖率报告，不能判定“增量覆盖率 > 80%”
- 风险接受要求：如要继续提测，需要研发负责人/测试负责人确认增量覆盖率报告补齐，或明确接受“单测门禁未完成”的风险；API/UI/人工验证不能抵扣该门禁