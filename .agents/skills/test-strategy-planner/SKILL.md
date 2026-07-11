---
name: test-strategy-planner
description: Plan Chinese case-first layered test strategy and coverage analysis from confirmed local or Feishu/Lark MCP test cases, requirements, logic code, test assets, commits, branches, or file lists. Use when developers, test managers, or project managers need L1/L2/L3/M strategy, code-driven self-checkpoint review, supplemental test-case planning, test-asset coverage evidence, TODOs, manual SIT guidance, or report generation.
---

# 测试策略规划

## 用途与边界

本 skill 以已确认的测试案例为主线，结合逻辑代码和共享自测检查点，产出分层测试策略、补充案例建议和覆盖分析。它不运行测试、不编写 JUnit5/JMeter/Playwright 脚本、不判定单测门禁最终通过，也不生成最终管理层测试覆盖总报告。

| 负责 | 不负责 |
|---|---|
| 确认来源和分析范围 | 运行单测、接口测试、E2E 或人工验证 |
| 制定 L1/L2/L3/M 分层策略 | 用 L2/L3/M 抵扣后端 L1 门禁 |
| 白盒审查共享检查点并建议补充案例 | 将补充案例伪装成用户原始测试案例 |
| 分析已有测试资产的实际层级和覆盖结果 | 替代 `unit-test-governance` 或 `test-report-generator` |
| 生成策略主报告与逐案例附件 | 在报告中写入后续 skill 建议 |

固定关系：

```text
既有案例推荐层级 = 测试案例语义 + 需求/设计 + 逻辑代码
检查点涉及性 = 检查点原文 + 逻辑代码白盒证据
补充案例建议 = 涉及检查点 - 已有测试案例覆盖
覆盖结论 = 推荐测试层级/补充案例建议 + 测试代码证据
commit/branch = 变更影响和增量风险信息，不是测试案例覆盖边界
```

## 模块顺序

必须按 A -> B -> C -> D -> E -> F 执行。不能以测试资产、提交范围或旧报告跳过测试案例策略和检查点白盒审查。

1. **模块 A：读取与范围确认**
2. **模块 B：测试案例分层策略**
3. **模块 C：自测检查点白盒审查与案例补充**
4. **模块 D：测试资产覆盖分析**
5. **模块 E：报告生成与输出自检**
6. **模块 F：最终对话、飞书发布与确认任务**

## 模块 A：读取与范围确认

先读取 `references/source-reading.md`。

- 正式分析前必须输出分析前输入确认清单，并等待用户明确确认；模块 A 只读取候选元数据和范围信息，不读取正文做分析。
- 测试案例是必需输入；未确认测试案例来源时，不进入大范围代码分析，也不生成正式报告。
- 用户要求查找飞书文件、提供飞书链接或文件夹名称时，先按 `references/lark-document-source.md` 通过飞书 MCP 搜索；未经允许不得改搜本地。
- 存量报告是否复用、需求/设计来源、逻辑代码范围、测试代码范围、提交范围和口径差异均在本模块确认。

模块 A 的输出是已确认输入范围，或测试案例缺失提醒。未完成不得进入模块 B。

## 模块 B：测试案例分层策略

先读取 `references/case-layering-strategy.md`，并按需读取 `references/layered-testing.md`、`references/small-model-reading.md` 和 `references/manual-evidence.md`。

- 只使用已确认测试案例、需求/设计和逻辑代码制定既有案例推荐层级；不得以测试代码、工具、测试数量或提交范围决定策略。
- 先从案例提取锚点，再读取相关逻辑代码验证实现边界。代码发现的问题只能作为补充风险，不能反推既有测试案例覆盖结论。
- 人工验证仅在用户确认启用后纳入，并创建 evidence 指引。

模块 B 的输出是逐案例推荐层级、分层理由、逻辑代码映射、补充风险和优先级，作为工作状态交给模块 C。未完成不得进入模块 C，也不得生成正式报告。

## 模块 C：自测检查点白盒审查与案例补充

先读取 `references/self-checkpoint-review.md` 和 `references/self-test-checkpoints.md`。

- 必须完整遍历共享检查点的全部叶子项，保留原始类别路径、检查点文字、优先级和测试层次。
- 用逻辑代码白盒证据判定“涉及/不涉及/待确认”；已有测试资产不得决定涉及性。
- 对涉及/待确认检查点核对既有测试案例；未覆盖或部分覆盖时生成补充案例建议，不伪造正式案例编号。
- 主报告仅展示涉及/待确认项，但附件或工作状态必须保留完整遍历记录。

模块 C 的输出是检查点原文映射、代码判定、案例覆盖判断、补充案例建议和 TODO，作为工作状态交给模块 D。未完成不得进入模块 D。

## 模块 D：测试资产覆盖分析

先读取 `references/test-asset-coverage.md`。

- 必须实际查找和读取已有单测、集成/API/JMeter、Playwright/Cypress 及必要测试辅助资产。
- 先识别资产的实际层级和断言，再映射既有案例与模块 C 的涉及检查点；工具只能辅助判断，不能单独决定层级。
- 分别记录既有案例的推荐层级、已有资产实际层级、证据、覆盖结论和 TODO；已有资产与推荐层级不一致时，不得自动判为已覆盖。
- 为模块 C 的涉及/待确认检查点补充测试资产证据，但不得改写其原文、涉及判定、案例覆盖判断或补充案例建议。

模块 D 的输出是覆盖证据、覆盖结论、缺口和检查点证据状态，补充到工作状态。未完成不得进入模块 E。

## 模块 E：报告生成与输出自检

先读取 `references/report-output.md` 和 `references/output-template.md`。

- 读取完成的工作状态后，有已确认测试案例时生成一主一附中文 Markdown；没有测试案例时只输出缺失提醒，不生成正式报告。
- 主报告汇总审核所需的策略、涉及检查点原文、补充案例建议、覆盖和风险；附件保留逐案例、逻辑代码、测试代码和检查点完整遍历明细。
- 生成后必须反读文件并核对路径、编码、章节、表格、原文检查点、完整遍历统计、案例策略先后关系及 evidence 目录；自检失败不得声称完成。

模块 E 的输出是完成自检的报告、附件及按需创建的人工验证 evidence。

## 模块 F：最终对话、飞书发布与确认任务

先读取 `references/lark-document-source.md`。

- 后续 skill 仅在最终对话中，按当前项目实际存在的 skill 动态推荐；不得写入报告、附件或 TODO。
- 输出自检完成后，才询问是否创建飞书文档和“自测策略确认”任务。
- 创建确认任务前，用户先提供审批人的姓名、邮箱或 open_id；再通过飞书 MCP 查询并展示匹配身份，用户最终确认后才创建。
- 飞书 MCP 能力或权限不足时，说明阻塞原因；不得声称已创建或已发送。

最终回复保持简短：报告路径、范围、口径差异、高层覆盖结论、检查点补充案例结论、输出自检结果、人工验证路径（如有）和必要的下一步建议。

## Reference 索引

| 模块 | 必读 reference | 支撑 reference |
|---|---|---|
| A | `source-reading.md` | `lark-document-source.md`、`small-model-reading.md` |
| B | `case-layering-strategy.md` | `layered-testing.md`、`manual-evidence.md`、`small-model-reading.md` |
| C | `self-checkpoint-review.md` | `self-test-checkpoints.md`、`case-layering-strategy.md` |
| D | `test-asset-coverage.md` | `small-model-reading.md`、`self-checkpoint-review.md` |
| E | `report-output.md` | `output-template.md`、`manual-evidence.md`、`analysis-state.md` |
| F | `lark-document-source.md` | `report-output.md` |

跨模块工作状态与上下文续跑规则读取 `references/analysis-state.md`。B -> C -> D -> E 的状态模型始终执行；只有上下文压力、大范围、多案例组、阶段性审查或跨会话续跑时才创建工作状态文件。上下文压力不能跳过模块 B/C/D 直接进入模块 E。
