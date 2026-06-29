# US2.3 班次列表查询与火车切换 - 测试治理 Specs

## 1. 结论摘要
| 项目 | 内容 |
|---|---|
| 本次范围 | US2.3 班次列表查询与火车切换功能 |
| 是否可进入覆盖分析 | 是 |
| 阻塞项 | 无 |
| 后端单测门禁提醒 | 增量覆盖率 > 80%，通过率 100% |
| 前端单测口径 | 默认非硬门禁，权限按钮显隐逻辑可触发建议 |

## 2. 需求与用户故事
| 用户故事 | 标题 | 纳入范围 | 说明 |
|---|---|---|---|
| US2.3 | 班次列表查询与火车切换 | 是 | 进入班次列表页查看所有班次，通过顶部"所属火车"下拉框切换到某辆火车查看该火车下的班次 |

## 3. 仓库与版本
| 仓库类型 | 路径/仓库 | 分支 | commit/range | 代码范围 | 说明 |
|---|---|---|---|---|---|
| 后端 | `release-train/apps/server` | main | - | `trains/routes/schedule.ts`<br>`trains/services/train.service.ts` | NestJS + Prisma 后端服务 |
| 前端 | `release-train/apps/web` | main | - | `pages/trains/schedules/index.tsx`<br>`services/train.ts` | React + Tauri 前端应用 |
| 共享包 | `release-train/packages/shared` | main | - | - | 类型定义共享包 |

## 4. 文档与测试资产
| 类型 | 文件/路径 | 状态 | 说明 |
|---|---|---|---|
| 需求 | `03-需求与设计/Task2-版本火车管理/US详细设计/RT-T2-US2.3-版本火车列表-详细设计_v1.0_20260516.md` | 已确认 | US2.3 详细设计文档 v1.0 |
| 测试案例 | `03-需求与设计/Task2-版本火车管理/测试案例/RT-T2-US2.3-班次列表查询与火车切换-测试案例_v1.1_20260516.md` | 已确认 | 23 个测试案例，含后端接口 8 个、前端功能 12 个、差距验证 3 个 |
| 后端单元测试 | `release-train/apps/server/src/modules/trains/services/train.service.unit.test.ts` | 已确认 | 火车服务单元测试 |
| 后端API测试 | `release-train/apps/server/src/__tests__/t2-us2.3-schedule-api.test.ts` | 已确认 | US2.3 API 接口测试 |
| 前端E2E测试 | `release-train/apps/web/tests/e2e/t2-us2.3-schedules-list.test.ts` | 已确认 | US2.3 班次列表页端到端测试 |
| JMeter 报告 | 不适用 | 不适用 | 用户确认不需要补充 JMeter 脚本 |
| UI 自动化报告 | 缺失 | 待生成 | 前端 E2E 测试脚本已存在，需要执行生成独立报告 |

## 5. Analysis Units
| 分析单元 | 类型 | 范围 | 后续输出 |
|---|---|---|---|
| US2.3 | 用户故事 | 班次列表查询与火车切换全功能 | analysis-US2.3-班次列表查询与火车切换.md |

## 6. 人工验证意向
| 是否需要人工验证 | 范围 | 说明 |
|---|---|---|
| 是 | 差距验证项（TC2.3-GAP-01 所属火车列展示、TC2.3-GAP-02 按火车查询分页、TC2.3-GAP-03 前端权限按钮显隐） | 用户确认差距项暂不修复，需要通过人工验证确认当前差距状态 |

## 7. 待确认项
| 编号 | 问题 | 责任人 | 影响 |
|---|---|---|---|
| - | 无（已在生成前确认） | - | - |

**已确认信息：**
- Q1: JMeter API 测试脚本不需要补充（用户确认）
- Q2: 差距验证项暂不修复，需要纳入人工验证（用户确认）
- Q3: 存量测试策略报告重新生成（用户确认）

## 8. 可执行任务清单

| 顺序 | 任务 | 依赖 | 输入 | 输出 | Skill | 状态 |
|-----|------|------|------|------|-------|------|
| 1 | testgov-analyzer | 无 | specs.md | analysis-US2.3-班次列表查询与火车切换.md | testgov-analyzer | ✅ 已完成 |
| 2 | testgov-unit-gate | Task 1 完成 | specs.md + coverage report | unit-gate-US2.3-班次列表查询与火车切换.md | testgov-unit-gate | ✅ 已完成 |
| 3 | testgov-api-jmeter | Task 2 完成 | analysis.md + 后端API测试 | api-jmeter-US2.3-班次列表查询与火车切换.md | testgov-api-jmeter | ✅ 已完成 |
| 4 | testgov-ui-flow | Task 2 完成 | analysis.md + E2E脚本 | ui-flow-US2.3-班次列表查询与火车切换.md | testgov-ui-flow | ✅ 已完成 |
| 5 | testgov-manual-evidence | Task 3/4 完成 | 差距项列表 | manual-evidence-US2.3-班次列表查询与火车切换.md | testgov-manual-evidence | ✅ 已完成 |
| 6 | testgov-final-report | Task 5 完成 | 所有前置报告 | final-US2.3-班次列表查询与火车切换.md | testgov-final-report | ✅ 已完成 |

**任务说明：**

- **Task 1 (testgov-analyzer)**: 基于需求和测试案例生成覆盖分析报告，重新生成（不使用存量报告）
- **Task 2 (testgov-unit-gate)**: 检查后端增量单测覆盖率是否达到 >80% 门禁，分析代码范围 `trains/routes/schedule.ts`、`trains/services/train.service.ts`
- **Task 3 (testgov-api-jmeter)**: 基于 `t2-us2.3-schedule-api.test.ts` 分析 L2 API 接口测试覆盖情况（不补充 JMeter 脚本）
- **Task 4 (testgov-ui-flow)**: 基于 `t2-us2.3-schedules-list.test.ts` 分析 L3 UI 自动化测试覆盖情况，前端代码范围 `pages/trains/schedules/index.tsx`、`services/train.ts`
- **Task 5 (testgov-manual-evidence)**: 针对3个差距验证项（所属火车列展示、按火车查询分页、前端权限按钮显隐）创建人工验证证据包
- **Task 6 (testgov-final-report)**: 聚合所有证据，生成最终测试覆盖与风险报告

**执行建议：**

可按顺序逐个执行，或根据当前进度选择跳到特定任务。推荐完整执行 Task 1-6 以获得完整的测试治理报告。