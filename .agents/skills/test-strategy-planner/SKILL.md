---
name: test-strategy-planner
description: Plan layered test strategy and test-case coverage analysis from requirements, user stories, existing test case documents, code changes, commits, branches, or file lists. Use when developers, test managers, or project managers need Chinese Markdown outputs including a main test strategy report, requirement coverage matrix, existing test case coverage analysis, test case to L1/L2/L3 method mapping, unit-test coverage gate planning, TODO list, manual SIT evidence guidance, or routing guidance for unit-test-governance, backend Java JUnit5 testing, JMeter API testing, frontend React/Vue testing, and final test coverage reporting.
---

# 测试策略规划

## 用途

把需求、用户故事、测试案例文档、代码范围和现有测试资产整理成可执行的分层测试策略。

本 skill 只负责策略规划和覆盖分析，不执行测试，不判断单测门禁是否通过，不编写 JUnit5/JMeter/Playwright 脚本，不生成最终管理层测试覆盖总报告。

## 工作边界

| 负责 | 不负责 |
|---|---|
| 识别需求范围、代码影响和测试范围 | 运行单测、接口测试、E2E 测试 |
| 读取已有测试案例文档并做覆盖分析 | 用 API/E2E/人工验证结果抵扣单测覆盖率 |
| 将测试点拆到 L1/L2/L3/人工验证 | 判断增量覆盖率门禁最终是否通过 |
| 输出主报告、测试案例覆盖分析、测试方式对照表 | 直接生成 JUnit5、JMeter、Playwright 代码 |
| 给出后续 skill 路由和输入建议 | 替代 `unit-test-governance` 或 `test-coverage-report` |

## 必读输入优先级

1. 测试案例文档：如果用户提供或目录中存在，必须先读。
2. 需求/PRD/用户故事/详细设计：用于确认业务口径。
3. 代码范围：service、route/controller、frontend page/component/service、shared types。
4. 现有测试文件：只能作为已有覆盖证据，不能替代测试案例覆盖分析。

如果测试案例文档和用户口头描述不一致，必须在报告中明确写出“口径差异”。例如用户说“版本火车列表/详情”，但测试案例写的是“班次列表/详情”，应先按测试案例编号分析，并提示需要统一命名。

## 找不到测试案例文档时必须询问

如果用户没有直接给出测试案例文档路径，并且在常见目录未找到匹配文件，不要立刻生成报告。必须先询问用户测试案例文档在哪里。

询问格式：

```markdown
我还没有找到本次范围对应的测试案例文档。请告诉我测试案例文档在哪里。

我已检查：
- {已检查目录1}
- {已检查目录2}

候选文件：
- {候选文件1}
- {候选文件2}

如果这次确实没有测试案例文档，请明确回复“没有测试案例”，我再按需求和代码生成策略报告。
```

常见搜索位置：

- `03-需求与设计/**/测试案例/*.md`
- `03-需求与设计/**/测试用例/*.md`
- `docs/**/测试案例*.md`
- `docs/**/test-case*.md`
- 当前 task/requirement 目录下的 `测试案例`、`测试用例`、`cases`、`test-cases` 子目录。

只有用户明确确认“没有测试案例文档”后，才允许进入无测试案例模式。

## 测试优先级和门禁口径

默认优先级必须是：

1. L1 单元测试优先：满足单测门禁，默认要求增量覆盖率 > 80%，通过率 100%。
2. L2 API 自动化其次：验证接口契约、鉴权、权限、参数、状态流转和数据库副作用。
3. L3 UI 自动化最后：只覆盖少量 P0 主路径和高回归风险交互。
4. 人工验证可替代低风险 UI 自动化，但必须保留可审计证据。

规则：

- L2/API、L3/UI、人工验证不能抵扣 L1 单测覆盖率。
- 如果需求天然偏接口或页面，也必须先识别可单测的增量逻辑，包括分页计算、字段聚合、映射、状态判断、权限按钮矩阵、异常分支和纯函数。
- 对于前端页面，如果核心逻辑都写在组件内，应在策略中建议抽出 `*.logic.ts` 或 composable/helper，以便单测覆盖。
- UI 自动化成本高时，可以用人工验证替代低风险 UI 场景，但必须输出人工验证证据清单。读取 `references/manual-evidence.md` 获取 SIT 人工验证证据采集规则。
- 当策略中存在可由人工验证替代的 UI 场景时，必须先询问用户是否启用人工验证证据包。用户明确回复“要/需要/可以/启用/走人工验证”后，自动创建 `evidence/{scope}/{case-id}/` 目录和 `summary.md` 指引；用户未确认前不要创建证据目录。

## 分层模型

| 层级 | 名称 | 常见工具 | 覆盖重点 |
|---|---|---|---|
| L1 | 单元测试 | JUnit5、Jest、Vitest、React/Vue 单测工具 | 业务规则、算法、校验、分支、异常、格式化、纯函数；必须服务增量覆盖率门禁 |
| L2 | 接口自动化 | JMeter 或团队现有 API 工具 | HTTP 契约、鉴权、参数校验、状态流转、数据库副作用 |
| L3 | 前端 / E2E | React/Vue 测试工具、Playwright、Cypress | 少量 P0 页面主路径、按钮权限、跳转、表单交互、核心用户旅程 |
| M | 人工验证 | SIT 环境、截图、日志、数据库查询、HAR、验证记录 | 低风险 UI 展示、文案、复杂环境链路、自动化成本过高的场景 |

读取 `references/layered-testing.md` 获取更细的分层判断规则。需要人工验证证据时读取 `references/manual-evidence.md`。

## 工作流程

1. 确认分析范围：commit、branch、requirement、task、用户故事或文件列表。
2. 查找并读取测试案例文档。
3. 如果未找到测试案例文档，先询问用户在哪里；用户确认没有后才继续。
4. 读取需求、PRD、用户故事或详细设计，确认业务口径。
5. 读取相关代码和现有测试文件。
6. 以测试案例编号或需求点为主线做覆盖分析。
7. 先规划 L1 单测门禁覆盖，再规划 L2 API，最后规划 L3 UI 自动化或人工验证。
8. 如果存在人工验证候选场景，询问用户是否启用人工验证证据包；用户确认后立即创建证据目录和 `summary.md` 模板。
9. 为每个测试点标注 L1/L2/L3/M、当前覆盖状态、缺口和优先级。
10. 输出后续 skill 路由：`unit-test-governance`、`backend-java-junit-testing`、`backend-api-jmeter-testing`、`frontend-web-testing`、`test-coverage-report`。
11. 生成中文 Markdown 文件。
12. 对话回复只给路径、范围、关键结论、人工验证目录路径（如已创建）和下一步建议。

## 有测试案例文档时的输出规则

默认生成“一主两附”：

```text
reports/test-strategy/requirement-{scope}-测试策略与覆盖分析.md
reports/test-strategy/appendix-{scope}-测试案例测试方式对照表.md
reports/test-strategy/archive-{scope}-初版策略报告.md   # 仅当已有旧版策略报告需要保留时生成
```

主报告面向项目经理、测试经理和研发负责人，必须聚合策略和结论，不要堆过多执行明细。

附件面向研发和测试执行人员，必须按测试案例编号展开。

如果此前已经生成过未考虑测试案例的旧策略报告，应该：

- 新建主报告整合策略和覆盖分析。
- 将旧报告改名为 `archive-...` 或在主报告中说明旧报告仅作历史参考。
- 避免保留多个平级正式报告造成混淆。

## 无测试案例文档时的输出规则

只有在用户明确确认“没有测试案例文档”后，才允许进入本模式。

生成一个主策略报告：

```text
reports/test-strategy/commit-{short-sha}-test-strategy.md
reports/test-strategy/branch-{branch-name}-test-strategy.md
reports/test-strategy/requirement-{scope}-test-strategy.md
```

报告中必须明确写出：已询问测试案例文档位置，用户确认没有测试案例文档，因此本报告只基于需求和代码规划。

## 文件命名规则

- `{scope}` 来自 commit、branch、requirement、task 或用户故事名称。
- 将 `/`、`\`、空格替换为 `-`。
- 中文可以保留。
- 报告内容必须是中文。
- Markdown/Skill 文件使用 UTF-8 无 BOM。

## 主报告必须包含

1. 分析范围和口径说明。
2. 已有测试案例覆盖结论；无测试案例时写明用户确认没有。
3. 单元测试门禁策略：增量覆盖率 > 80%，通过率 100%，说明 L2/L3/M 不能抵扣。
4. 需求/测试案例覆盖矩阵。
5. 代码影响测试矩阵。
6. L1/L2/L3/M 分层策略，排序必须体现 L1 优先、L2 其次、L3/M 最后。
7. P0/P1 TODO 清单。
8. 现有测试资产可复用判断。
9. 后续 skill 执行建议。
10. UI 自动化替代和人工验证证据方案；若用户已确认人工验证，写明已创建的 evidence 目录。
11. 风险和前置条件。

## 测试案例对照表必须包含

| 案例 | 测试方式 | 工具 | 覆盖逻辑 | 当前状态 | TODO |
|---|---|---|---|---|---|

当前状态使用：`已覆盖`、`部分覆盖`、`缺失`、`不适用`。

## 覆盖判断规则

- 测试案例是主线；不要只按代码函数输出策略。
- API 被调用过不等于测试案例已覆盖，必须有对应断言。
- UI 展示、按钮可见性、页面跳转、标签页切换、返回列表必须归到 L3 或人工验证，不能用 L2 抵扣。
- 数据库副作用、接口响应字段、鉴权、错误码归到 L2。
- 单测优先覆盖可隔离规则、纯函数、状态判断、参数边界、映射和计算逻辑；策略必须说明如何满足增量覆盖率 > 80% 和通过率 100%。
- 现有测试若覆盖行为但文件名/编号不匹配，应标为“部分覆盖，可复用但需映射或重命名”。
- 不要直接给出单测门禁通过/不通过，只能写“需交给 `unit-test-governance` 判断”。
- UI 自动化可被人工验证替代时，必须说明替代边界：P0 主路径和高回归风险权限显隐优先自动化；低风险展示、文案、截图类验收可人工验证，但必须保留证据。

## 后续 skill 分流

| 场景 | 推荐后续 skill |
|---|---|
| 需要判断哪些代码必须补单测、运行现有单测、计算增量覆盖率 | `unit-test-governance` |
| 后端 Java 单测需要设计或实现 | `backend-java-junit-testing` |
| 需要接口自动化或 JMeter 场景覆盖 | `backend-api-jmeter-testing` |
| 需要前端页面、组件或用户旅程测试 | `frontend-web-testing` |
| UI 自动化成本高，需要 SIT 人工验证证据设计 | `test-strategy-planner` + `test-coverage-report` |
| 已有各层测试结果，需要生成管理层报告 | `test-coverage-report` |

## 回复约束

生成报告后，对话回复保持简短：

- 报告路径。
- 分析范围。
- 是否发现口径差异。
- 单测门禁策略结论。
- 已覆盖/部分覆盖/缺失的高层结论。
- 下一步建议。