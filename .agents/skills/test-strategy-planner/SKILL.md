---
name: test-strategy-planner
description: Plan Chinese case-first layered test strategy and execution preparation from confirmed local or Feishu/Lark MCP test cases, requirements, logic code, commits, branches, or file lists. Use when developers, test managers, or project managers need L1/L2/L3/M strategy, code-driven self-checkpoint review, supplemental test-case planning, TODOs, manual SIT guidance, or report generation.
---

# 测试策略规划

## 用途与边界

本 skill 以已确认的测试案例为主线，结合逻辑代码和共享自测检查点，产出分层测试策略、补充案例建议和 TODO。它不运行测试、不编写 JUnit5/JMeter/Playwright 脚本、不判定单测门禁最终通过，也不生成最终管理层测试覆盖总报告。

| 负责 | 不负责 |
|---|---|
| 确认来源和分析范围 | 运行单测、接口测试、E2E 或人工验证 |
| 制定 L1/L2/L3/M 分层策略 | 用 L2/L3/M 抵扣后端 L1 门禁 |
| 白盒审查共享检查点并建议补充案例 | 将补充案例伪装成用户原始测试案例 |
| 生成策略主报告与逐案例附件 | 在报告中写入后续 skill 建议 |

固定关系：

```text
既有案例推荐层级 = 测试案例语义 + 需求/设计 + 逻辑代码
检查点涉及性 = 检查点原文 + 逻辑代码白盒证据
补充案例建议 = 涉及检查点 - 已有测试案例覆盖
commit/branch = 变更影响和增量风险信息，不是测试案例覆盖边界
```

## 配置读取（必须步骤）

1. 检查 `config/project-config.yaml` 是否存在
2. 如果存在，读取配置并使用其中的路径、命令、模式等
3. 如果不存在，使用默认值，并提示用户：
   > "未找到项目配置文件 config/project-config.yaml，请先创建或确认配置文件位置。当前使用默认配置。"

### 使用的配置项

| 配置项 | 用途 |
|---|---|
| `paths.governance.test_strategy` | 测试策略报告输出目录 |
| `paths.governance.evidence` | 人工验证证据目录 |
| `paths.governance.reports` | 分析工作状态文件目录 |
| `paths.docs.test_cases` | 测试案例文档路径列表 |
| `paths.docs.requirements` | 需求/设计文档路径列表 |
| `paths.backend.src` | 后端逻辑代码根目录 |
| `paths.frontend.src` | 前端逻辑代码根目录 |
| `paths.backend.unit_tests` | 后端单测文件路径列表 |
| `paths.backend.api_tests` | 后端API测试文件路径列表 |
| `paths.frontend.ui_tests` | 前端UI测试文件路径列表 |
| `report_naming.test_strategy` | 测试策略报告命名模板 |
| `report_naming.test_strategy_appendix` | 测试案例对照表命名模板 |

## 模块顺序

默认按 A -> B -> C -> D -> E 执行。不能以提交范围或旧报告跳过测试案例策略和检查点白盒审查；本 skill 不核对既有测试资产。

1. **模块 A：读取与范围确认**
2. **模块 B：测试案例分层策略**
3. **模块 C：自测检查点白盒审查与案例补充**
4. **模块 D：报告生成与输出自检**
5. **模块 E：最终对话、飞书发布与确认任务**

## 模块 A：读取与范围确认

先读取 `references/source-reading.md`。

- 正式分析前必须输出分析前输入确认清单，并等待用户明确确认；模块 A 只读取候选元数据和范围信息，不读取正文做分析。
- 测试案例是必需输入；未确认测试案例来源时，不进入大范围代码分析，也不生成正式报告。
- 用户要求查找飞书文件、提供飞书链接或文件夹名称时，先按 `references/lark-document-source.md` 通过飞书 MCP 搜索；未经允许不得改搜本地。
- 存量报告是否复用、需求/设计来源、逻辑代码范围、提交范围和口径差异均在本模块确认。
- 模块 A 确认完成后立即创建最小工作状态检查点；后续 B/C 每个模块完成后更新一次，支持模型中断后从最近完整模块继续。

模块 A 的输出是已确认输入范围，或测试案例缺失提醒。未完成不得进入模块 B。

## 模块 B：测试案例分层策略

先读取 `references/case-layering-strategy.md`，并按需读取 `references/layered-testing.md`、`references/small-model-reading.md`；只有用户确认纳入人工验证后，才读取 `references/manual-evidence.md`。

- 只使用已确认测试案例、需求/设计和逻辑代码制定既有案例推荐层级；不得以提交范围决定策略。
- 先从案例提取锚点，再读取相关逻辑代码验证实现边界。代码发现的问题只能作为补充风险，不能反推既有测试案例覆盖结论。
- 后端纳入范围的可执行代码强制要求 `L1 后端单测`；案例涉及后端接口时，L2 只能叠加，不能替代 L1。前端 L1 单测按逻辑复杂度和案例目标条件触发，不是默认硬门禁。
- 模块 B 完成案例分层后，只要识别到页面交互、按钮、跳转、展示或其他可能由人工验证承担的 UI/M 场景，必须询问用户是否纳入人工验证；不能因为暂时推荐 L3 就自行跳过。用户未确认时只记录“人工验证待确认”，不读取人工证据规则、不创建 evidence，也不把 M 写成已纳入策略。
- 模块 B 完成后立即按正式报告目标路径写入并锁定策略字段：`推荐测试层级`、`分层理由`。逻辑代码锚点仅保留在内部工作状态中。后续模块只能补充其他字段，不得静默修改这些策略字段。

模块 B 的输出是已写入报告策略部分的逐案例推荐层级、分层理由、补充风险和优先级，以及仅供后续审查使用的内部逻辑代码锚点，作为工作状态交给模块 C。未完成不得进入模块 C。

## 模块 C：自测检查点白盒审查与案例补充

先读取 `references/self-checkpoint-review.md` 和 `references/self-test-checkpoints.md`。

- 必须完整遍历共享检查点的全部叶子项，保留原始类别路径、检查点文字、优先级和测试层次；“完整遍历”不等于对每个叶子项重复进行独立深度推理。
- 先执行 C0 预筛：将模块 B 的逻辑代码事实整理为行为清单、范围排除清单和证据编号，再一次性解析全部叶子项，按类别/关键词路由为“候选深审”或“批量不涉及”。
- 每个叶子项仍必须有涉及判定和理由；批量不涉及项可复用同一个范围排除证据编号，不得省略记录或概括为未审查。
- 只对候选深审项逐项读取相关代码、判定“涉及/待确认”、核对既有测试案例。
- 候选项先按校验、权限、状态/版本、事务/审计、接口契约、UI 等风险簇归并；同一缺口只核对一次案例并生成一条补充案例建议，多个检查点引用同一建议编号。
- 主报告仅展示涉及/待确认项，但附件或工作状态必须保留完整遍历记录。
- `self-test-checkpoints.md` 只完整读取一次；后续模块复用 C 已形成的遍历记录，不重复遍历原文。
- 大范围时按风险簇分批完成候选深审并更新工作状态；每批完成后立即追加对应映射和补充建议，不等 E 结束。
- 生成待补充案例列表后，必须询问用户是否回写正式测试案例文档；未确认前只保留建议编号，不分配正式案例编号，也不修改本地或飞书测试案例原文。
- planner 不运行单测、不计算覆盖率、不判定单测门禁通过或不通过；增量覆盖率和通过率由 `unit-test-governance` 计算，最终自测报告由 `test-report-generator` 汇总。

模块 C 的输出是检查点原文映射、代码判定、案例覆盖判断、补充案例建议和 TODO，作为工作状态交给模块 D。未完成不得进入模块 D。

## 模块 D：报告生成与输出自检

先读取 `references/report-output.md` 和 `references/output-template.md`。

- 读取完成的工作状态后，有已确认测试案例时生成一主一附中文 Markdown；没有测试案例时只输出缺失提醒，不生成正式报告。
- B/C 阶段完成后直接增量更新既定目标文件；D 不重新执行前序分析。
- 主报告汇总审核所需的策略、涉及检查点原文、补充案例建议、TODO 和风险；附件保留逐案例对照、人工验证场景和检查点完整遍历附录。
- E 只反读生成文件的文件名、大小、编码、标题、章节标题、关键表头和关键统计，不重新加载完整源文档；自检失败不得声称完成。

模块 D 的输出是完成自检的报告、附件及按需创建的人工验证 evidence。

## 模块 E：最终对话、飞书发布与确认任务

先读取 `references/lark-document-source.md`。

- 后续 skill 仅在最终对话中，按当前项目实际存在的 skill 动态推荐；不得写入报告、附件或 TODO。
- 输出自检完成后，才询问是否创建飞书文档和“自测策略确认”任务。
- 创建确认任务前，用户先提供审批人的姓名、邮箱或 open_id；再通过飞书 MCP 查询并展示匹配身份，用户最终确认后才创建。
- 飞书 MCP 能力或权限不足时，说明阻塞原因；不得声称已创建或已发送。

最终回复保持简短：报告路径、范围、口径差异、分层策略结论、检查点补充案例结论、输出自检结果、人工验证路径（如有）和必要的下一步建议。

## Reference 索引

| 模块 | 必读 reference | 支撑 reference |
|---|---|---|
| A | `source-reading.md` | `lark-document-source.md`、`small-model-reading.md` |
| B | `case-layering-strategy.md` | `layered-testing.md`、`manual-evidence.md`、`small-model-reading.md` |
| C | `self-checkpoint-review.md` | `self-test-checkpoints.md`、`case-layering-strategy.md` |
| D | `report-output.md` | `output-template.md`、`manual-evidence.md`、`analysis-state.md` |
| E | `lark-document-source.md` | `report-output.md` |

跨模块工作状态与上下文续跑规则读取 `references/analysis-state.md`。B -> C -> D 的状态模型始终执行。只有上下文压力、大范围、多案例组、阶段性审查或跨会话续跑时才创建工作状态文件。上下文压力不能跳过模块 B/C 直接进入模块 D。
