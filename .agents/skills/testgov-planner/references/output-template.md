# testgov-planner 输出模板

输出文件：`reports/testgov/specs-{scope}.md`

```markdown
# {scope} 测试治理 Specs

## 1. 结论摘要
| 项目 | 内容 |
|---|---|
| 本次范围 |  |
| 是否可进入覆盖分析 | 是/否 |
| 阻塞项 | 无/列出 |
| 后端单测门禁提醒 | 增量覆盖率 > 80%，通过率 100% |
| 前端单测口径 | 默认非硬门禁，仅复杂可隔离逻辑触发建议 |

## 2. 需求与用户故事
| 用户故事 | 标题 | 纳入范围 | 说明 |
|---|---|---|---|
| USx.x |  | 是/否 |  |

## 3. 仓库与版本
| 仓库类型 | 路径/仓库 | 分支 | commit/range | 说明 |
|---|---|---|---|---|
| 后端 |  |  |  |  |
| 前端 |  |  |  |  |
| 测试资产 |  |  |  | 可选 |
| 文档 |  |  |  | 可选 |

## 4. 文档与测试资产
| 类型 | 文件/路径 | 状态 | 说明 |
|---|---|---|---|
| 需求 |  | 已确认/缺失/待确认 |  |
| 详细设计 |  | 已确认/缺失/待确认 |  |
| 测试案例 |  | 已确认/缺失/待确认 |  |
| 单测报告 |  | 已确认/缺失/待确认 |  |
| JMeter 报告 |  | 已确认/缺失/待确认 |  |
| UI 自动化报告 |  | 已确认/缺失/待确认 |  |

## 5. Analysis Units
| 分析单元 | 类型 | 范围 | 后续输出 |
|---|---|---|---|
| USx.x | 用户故事 |  | analysis-USx.x.md |

## 6. 人工验证意向
| 是否需要人工验证 | 范围 | 说明 |
|---|---|---|
| 是/否/待确认 |  |  |

## 7. 待确认项
| 编号 | 问题 | 责任人 | 影响 |
|---|---|---|---|
| Q1 |  |  |  |

## 8. 可执行任务清单

| 顺序 | 任务 | 依赖 | 输入 | 输出 | Skill | 状态 |
|-----|------|------|------|------|-------|------|
| 1 | testgov-analyzer | 无 | specs.md | analysis-{scope}.md | testgov-analyzer | 待执行 |
| 2 | testgov-unit-gate | Task 1 完成 | specs.md + coverage report | unit-gate-{scope}.md | testgov-unit-gate | 待执行 |
| 3 | testgov-api-jmeter | Task 2 完成 | analysis.md + JMeter脚本 | api-jmeter-{scope}.md | testgov-api-jmeter | 待执行 |
| 4 | testgov-ui-flow | Task 2 完成 | analysis.md + E2E脚本 | ui-flow-{scope}.md | testgov-ui-flow | 待执行 |
| 5 | testgov-manual-evidence | Task 3/4 完成 | 差距项列表 | manual-evidence-{scope}.md | testgov-manual-evidence | 待执行 |
| 6 | testgov-final-report | Task 5 完成 | 所有前置报告 | final-{scope}.md | testgov-final-report | 待执行 |

**任务说明：**

- **Task 1 (testgov-analyzer)**: 基于需求和测试案例生成覆盖分析报告
- **Task 2 (testgov-unit-gate)**: 检查后端增量单测覆盖率是否达到 >80% 门禁
- **Task 3 (testgov-api-jmeter)**: 分析 L2 API 接口测试覆盖情况（如 JMeter 脚本已补充）
- **Task 4 (testgov-ui-flow)**: 分析 L3 UI 自动化测试覆盖情况
- **Task 5 (testgov-manual-evidence)**: 针对差距验证项创建人工验证证据包
- **Task 6 (testgov-final-report)**: 聚合所有证据，生成最终测试覆盖与风险报告
```