# TestGov 新旧能力映射说明

## 说明

这份文档只用于迁移和理解，不作为新 TestGov skills 的执行规则。

新系列统一使用 `testgov-*`，旧能力已经拆进新的职责边界里。后续正式使用时，以新 skill 为准。

## 总体映射

| 旧能力来源 | 旧能力 | 新 TestGov 承接 |
|---|---|---|
| `test-strategy-planner` | 提测前确认需求、用户故事、设计、测试案例、代码范围 | `testgov-planner` |
| `test-strategy-planner` | 生成测试策略主报告 | `testgov-analyzer` + `testgov-final-report` |
| `test-strategy-planner` | L1/L2/L3/M 分层测试建议 | `testgov-analyzer` |
| `test-strategy-planner` | 需求、测试案例、代码影响矩阵 | `testgov-analyzer` |
| `test-strategy-planner` | 测试案例与测试方式对照表 | `testgov-analyzer` appendix |
| `test-strategy-planner` | 人工验证方案、summary 模板、证据目录建议 | `testgov-manual-evidence` |
| `unit-test-governance` | 单测扫描、已有单测识别、单测执行 | `testgov-unit-gate` |
| `unit-test-governance` | 后端增量覆盖率和通过率门禁 | `testgov-unit-gate` |
| `unit-test-governance` | 缺失单测 TODO、未覆盖风险说明 | `testgov-unit-gate` |
| `test-report-generator` | 汇总测试执行结果、覆盖率、截图、失败项 | `testgov-final-report` |
| `test-report-generator` | 面向项目经理/测试经理的最终结论 | `testgov-final-report` |

## 新系列职责拆分

| 新 Skill | 承接能力 | 不做什么 |
|---|---|---|
| `testgov-planner` | 提测前输入清单、范围确认、前后端仓库和分支信息、用户故事拆分、生成 specs | 不做覆盖判断，不运行测试，不写最终报告 |
| `testgov-analyzer` | 需求/案例/代码影响覆盖分析、L1/L2/L3/M 分层建议、缺口和 TODO | 不运行测试，不判定单测门禁 |
| `testgov-unit-gate` | 后端单测硬门禁、已有单测识别、JaCoCo 证据、缺失单测 TODO、前端单测触发建议 | 不让 API/UI/人工验证抵扣后端单测门禁 |
| `testgov-api-jmeter` | L2 API/JMeter 覆盖和执行证据 | 不替代后端单测 |
| `testgov-ui-flow` | L3 UI 自动化覆盖、慢速 UI 自动化取舍、人工替代建议 | 不做低价值全页面自动化铺满 |
| `testgov-manual-evidence` | SIT 人工验证 evidence、summary.md、截图/API/日志/条件性 DB 证据 | 不默认要求数据库连接信息，不抵扣单测门禁 |
| `testgov-final-report` | 聚合 specs、analysis、unit gate、API、UI、manual evidence，输出最终覆盖与风险报告 | 不重新计算覆盖率，不编造上游结果 |

## 关键口径变化

| 主题 | 新口径 |
|---|---|
| 后端单测 | 默认硬门禁：增量覆盖率 > 80%，通过率 100% |
| 前端单测 | 默认不是硬门禁；仅在复杂可隔离逻辑时触发建议 |
| API/JMeter | 属于 L2 证据，不能抵扣后端单测门禁 |
| UI 自动化 | 属于 L3 证据，只覆盖核心高价值路径；低价值场景可人工替代 |
| 人工验证 | 用户确认后才创建 evidence；默认轻量 summary，不默认 DB |
| 多仓库 | 前端、后端、测试资产、文档可以分仓库，planner 统一记录路径和分支 |
| 大需求 | 默认拆到用户故事，不建议按整个 Task 一次分析 |

## 推荐迁移路径

1. 新需求提测时，直接从 `testgov-planner` 开始。
2. 已有旧报告时，可以把旧报告作为输入证据给新系列引用。
3. 后端单测门禁统一交给 `testgov-unit-gate` 输出。
4. API、UI、人工验证分别交给对应新 skill。
5. 最终只由 `testgov-final-report` 汇总管理层报告。

## 文件命名对照

| 场景 | 新输出文件 |
|---|---|
| 提测范围 specs | `reports/testgov/specs-{scope}.md` |
| 覆盖分析主报告 | `reports/testgov/analysis-{scope}.md` |
| 测试案例分层附件 | `reports/testgov/appendix-{scope}-case-layer-map.md` |
| 后端单测门禁 | `reports/testgov/unit-gate-{scope}.md` |
| API/JMeter 覆盖 | `reports/testgov/api-jmeter-{scope}.md` |
| UI 自动化覆盖 | `reports/testgov/ui-flow-{scope}.md` |
| 人工验证报告 | `reports/testgov/manual-evidence-{scope}.md` |
| 人工验证证据 | `evidence/{scope}/summary.md` |
| 最终报告 | `reports/testgov/final-{scope}.md` |