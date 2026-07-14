---
name: test-report-generator
description: 聚合 L1 单测门禁结论、L2 API、L3 UI 和 M 人工验证的真实执行证据，生成自测报告并给出通过、部分覆盖或阻塞结论。支持结合测试策略文档生成分层报告。
tags: [测试, 报告, 覆盖率, Playwright, 自测]
author: RT-Agent
version: 1.3
date: 2026-06-30
---

## 配置读取（必须步骤）

1. 检查 `config/project-config.yaml` 是否存在
2. 如果存在，读取配置并使用其中的路径、命令、模式等
3. 如果不存在，使用默认值，并提示用户：
   > "未找到项目配置文件 config/project-config.yaml，请先创建或确认配置文件位置。当前使用默认配置。"

### 使用的配置项

| 配置项 | 用途 |
|---|---|
| `paths.backend.api_tests` | 后端API测试文件路径列表 |
| `paths.frontend.ui_tests` | 前端UI测试文件路径列表 |
| `paths.frontend.test_results` | Playwright测试结果目录 |
| `paths.governance.test_strategy` | 测试策略报告目录 |
| `paths.governance.unit_test_governance` | 单测治理报告目录 |
| `paths.governance.test_report` | 自测报告输出目录 |
| `paths.governance.evidence` | 人工验证证据目录 |
| `commands.backend_api_test` | 后端API测试执行命令 |
| `commands.frontend_ui_test` | 前端UI测试执行命令 |
| `report_naming.test_report` | 自测报告命名模板 |

## 触发方式

- "生成自测报告"
- "输出测试报告"
- "证明自测通过"
- "测试证据报告"

## 核心目标

生成一份可验证的自测报告，包含四类证据：
1. **执行痕迹** — 时间戳、耗时、环境信息（证明是跑出来的）
2. **覆盖率数据** — 增量覆盖率报告（证明代码被实际覆盖）
3. **Playwright截图** — 关键步骤自动截图（证明UI流程真实走通）
4. **测试结果明细** — 每个案例的执行结果（证明覆盖完整）

## 快速使用

测试命令从 `config/project-config.yaml` 的 `commands` 配置项读取；如果配置文件不存在，使用默认命令。

```bash
# 步骤1: 运行后端单测（命令来自配置：commands.backend_unit_test）
cd release-train/apps/server && pnpm vitest run

# 步骤2: 运行API测试（命令来自配置：commands.backend_api_test）
cd release-train/apps/server && pnpm vitest run src/__tests__

# 步骤3: 运行UI测试（命令来自配置：commands.frontend_ui_test）
cd release-train/apps/web && pnpm playwright test

# 步骤4: 生成自测报告（报告输出到配置的 paths.governance.test_report 目录）
```

## 调用流程

### Step 0: 输入确认（必须先确认再分析）

正式生成报告前，必须先检索并确认输入范围。未确认前，只允许做文件检索和候选清单输出，不要生成覆盖结论或报告文件。

**必须确认的输入**：

| 输入类型 | 来源 | 说明 |
|----------|------|------|
| 测试策略报告 | `{paths.governance.test_strategy}/ST-{scope}-测试策略_v{version}_{date}.md`（路径和命名从配置读取） | L1/L2/L3/M 策略来源 |
| 单测治理报告 | `{paths.governance.unit_test_governance}/ST-{scope}-单测治理_v{version}_{date}.md`（路径和命名从配置读取） | 必须是“最终版”，作为 L1 门禁结论来源 |
| 策略对照表附件 | `{paths.governance.test_strategy}/ST-{scope}-测试案例对照表_v{version}_{date}.md`（路径和命名从配置读取） | 测试案例编号、测试方式、覆盖逻辑 |
| 测试文件列表 | 自动检索或用户指定（路径从配置 `paths.backend.api_tests`、`paths.frontend.ui_tests` 读取） | L2 API 测试、L3 UI 测试文件路径 |
| 人工测试目录 | `{paths.governance.evidence}/{scope}/`（路径从配置读取）或用户指定 | M 人工验证证据目录 |

**确认清单模板**：

```markdown
请确认本次报告生成输入：

| 输入类型 | 检索结果 | 是否纳入 |
|----------|----------|----------|
| 测试策略报告 | {paths.governance.test_strategy}/ST-xxx-测试策略_v1.0_20260630.md（路径和命名从配置读取） | 待确认 |
| 单测治理报告 | {paths.governance.unit_test_governance}/ST-xxx-单测治理_v1.0_20260630.md（路径和命名从配置读取） | 待确认，必须为最终版 |
| 策略对照表附件 | {paths.governance.test_strategy}/ST-xxx-测试案例对照表_v1.0_20260630.md（路径和命名从配置读取） | 待确认 |
| L2 API 测试文件 | 从配置 `paths.backend.api_tests` 读取的路径列表 | 待确认 |
| L3 UI 测试文件 | 从配置 `paths.frontend.ui_tests` 读取的路径列表、playwright-report/ | 待确认 |
| 人工测试证据目录 | {paths.governance.evidence}/{scope}/（路径从配置读取） | 待确认/不适用 |

确认后我再开始分析并生成报告；如果某项不适用，请直接标注"不适用"。
```

**文件检索规则**：

优先从 `config/project-config.yaml` 读取路径配置；如果配置文件不存在或对应配置项缺失，使用默认路径。

| 类型 | 检索路径（从配置读取） | 默认路径 |
|------|---------------------|---------|
| 测试策略报告 | `paths.governance.test_strategy/ST-*-测试策略_v*.md` | `reports/test-strategy/ST-*-测试策略_v*.md` |
| 单测治理报告 | `paths.governance.unit_test_governance/ST-*-单测治理_v*.md` | `reports/unit-test-governance/ST-*-单测治理_v*.md` |
| 策略对照表 | `paths.governance.test_strategy/ST-*-测试案例对照表_v*.md` | `reports/test-strategy/ST-*-测试案例对照表_v*.md` |
| L2 API 测试 | `paths.backend.api_tests` 配置的路径列表 | `**/*.api.test.ts`、`**/api/**/*.test.ts`、`**/__tests__/api*.ts`、`**/*.api.spec.ts` |
| L3 UI 测试 | `paths.frontend.ui_tests` 配置的路径列表 | `playwright-report/index.html`、`test-results/**/*.png`、`**/*.e2e.test.ts`、`**/*.e2e.spec.ts` |
| M 人工证据 | `paths.governance.evidence/{scope}/**/summary.md` | `evidence/{scope}/**/summary.md`、`evidence/{scope}/**/*.png`、`evidence/{scope}/**/*.log` |

### Step 1: 收集测试数据

根据确认的输入范围收集数据，分层处理：

**L1 单元测试（读取最终版 unit-test-governance 报告）**：
- 从 `{paths.governance.unit_test_governance}/ST-{scope}-单测治理_v{version}_{date}.md`（路径和命名从配置读取）提取：
  - 单测门禁摘要（通过率、覆盖率）
  - L1 策略案例覆盖检查结论
  - 自测检查点 L1 覆盖现状
  - 需补充单测清单
  - 最终决策（通过/不通过/阻塞）

**L2/L3/M 测试（重新分析）**：
- 从 `{paths.governance.test_strategy}/ST-{scope}-测试策略_v{version}_{date}.md`（路径和命名从配置读取）提取：
  - L2/L3/M 策略和测试案例编号
- 检索最新 L2 API 测试文件（路径从配置 `paths.backend.api_tests` 读取），分析执行结果和覆盖状态
- 检索最新 L3 UI 测试文件（路径从配置 `paths.frontend.ui_tests` 读取）和 playwright-report，分析执行结果和截图证据
- 检索人工测试证据目录 `{paths.governance.evidence}/{scope}/`（路径从配置读取），读取 summary.md 和截图

**其他数据来源**：
```
1. Git 分支信息
   ├── 当前分支名
   ├── 当前Commit
   └── 相对于 main 的变更文件

2. 策略对照表附件
   └── {paths.governance.test_strategy}/ST-{scope}-测试案例对照表_v{version}_{date}.md（路径和命名从配置读取）
```

### Step 2: 生成报告

用户确认输入范围后，开始分析并生成报告。

**分析流程**：
1. 直接引用 unit-test-governance 报告的 L1 门禁结论
2. 读取 L2 API 的真实执行结果；只有取得执行结论才判定通过
3. 读取 L3 UI 的真实执行结果和截图/报告证据；文件存在不等于执行通过
4. 读取 M 人工验证摘要中的明确结论；只有存在通过结论才判定完成
5. 整合策略对照表，生成测试结果明细
6. 基于测试结果判定 L2/L3/M 检查点覆盖状态
7. 生成文件后执行输出结构自检；自检失败不得声称报告完成

**报告文件名规范**（统一格式 `ST-{scope}-{type}_v{version}_{date}.md`，路径和命名从配置读取）：
```
{paths.governance.test_report}/ST-{scope}-自测报告_v{version}_{date}.md
```

路径优先级：
1. 优先从 `config/project-config.yaml` 的 `paths.governance.test_report` 读取
2. 配置不存在时，使用默认路径：`reports/test-report`

命名优先级：
1. 优先从 `config/project-config.yaml` 的 `report_naming.test_report` 读取
2. 配置不存在时，使用默认命名：`ST-{scope}-自测报告_v1.0_{date}.md`

**报告内容结构**：

```markdown
# ST-{scope}-自测报告_v{version}_{date}.md

## 基本信息
| 项目 | 内容 |
|------|------|
| 报告编号 | ST-{日期}-001 |
| 生成时间 | {时间} |
| 执行环境 | Node.js / macOS |
| Git 分支/Commit | {分支}@{commit} |
| 测试人员 | 开发人员 |

## 测试策略概览
本次测试基于 **test-strategy-planner 主报告**，采用三层叠加覆盖策略：

| 层级 | 工具 | 覆盖范围 | 目标 |
|------|------|---------|------|
| **L1 单元测试** | Vitest | service.ts 纯函数、校验逻辑 | 增量覆盖率 >80%，通过率 100% |
| **L2 接口自动化** | Vitest + Supertest | API 契约、鉴权、参数、状态流转 | 按策略和真实执行结果判定，不设统一覆盖率门槛 |
| **L3 UI 自动化** | Playwright | 关键用户旅程、UI 交互 | 覆盖核心用户旅程 |
| **M 人工验证** | SIT 环境 + 截图 | 低频 UI、截图确认 | 保留可审计证据 |

### 覆盖率目标
| 指标 | 目标值 |
|------|-------|
| L1 增量覆盖率 | >80% |
| L1 单测通过率 | 100% |

## L1 单元测试门禁结论
（直接引用最终版 unit-test-governance 报告）

| 门禁项 | 当前值 | 达标要求 | 状态 |
|--------|--------|----------|------|
| 单测通过率 | xx% | 100% | ✅/⚠️ |
| 增量覆盖率 | xx% | >80% | ✅/⚠️ |
| 最终决策 | 通过/不通过/阻塞 | - | ✅/⚠️/⏸️ |

**需补充单测清单**（来自 unit-test-governance）：
| 优先级 | 文件 | 变更逻辑 | 建议用例名 |
|--------|------|----------|------------|

## L2 接口自动化覆盖分析
（检索最新 API 测试文件，分析执行结果）

| API 路径 | 测试文件 | 测试状态 | 覆盖逻辑 |
|----------|----------|----------|----------|

## L3 UI 自动化覆盖分析
（检索最新 Playwright 测试文件和报告）

| Journey | 测试文件 | 测试状态 | 截图证据 |
|---------|----------|----------|----------|

## M 人工验证证据汇总
（读取 `{paths.governance.evidence}/{scope}/` 目录，路径从配置读取）

| 验证项 | 证据文件 | 验证结果 |
|--------|----------|----------|

## 测试结果明细
（整合策略对照表 + 最新测试文件覆盖分析 + 人工验证证据）

| 测试案例编号 | 测试方式 | 测试文件 | 执行结果 | 覆盖状态 |
|--------------|----------|----------|----------|----------|

## 自测检查点覆盖摘要（双报告整合）
| 检查点 | 层级 | 优先级 | 覆盖状态 | 证据来源 |
|--------|------|--------|----------|----------|

（L1 检查点来自最终版 unit-test-governance；L2/L3/M 检查点必须基于真实执行结果判定）

## 执行概要
| 指标 | 值 | 状态 |
|------|-----|------|
| L1 总测试数 | xx | ✅/⚠️ |
| L1 通过数 | xx | ✅/⚠️ |
| L2 API 测试数 | xx | ✅/⚠️ |
| L3 UI 测试数 | xx | ✅/⚠️ |
| M 人工验证数 | xx | ✅/⚠️ |

## 结论
| 项目 | 状态 |
|------|------|
| L1 单测门禁 | ✅ 通过 / ⚠️ 未通过 / ⏸️ 阻塞 |
| L2 API 自动化 | ✅ 已覆盖 / ⚠️ 部分覆盖 / ❌ 缺失 |
| L3 UI 自动化 | ✅ 已覆盖 / ⚠️ 部分覆盖 / ❌ 缺失 |
| M 人工验证 | ✅ 已完成 / ⚠️ 部分完成 / ❌ 未执行 |
| 整体交付建议 | 可提测 / 有条件提测 / 不建议提测 |
```

## 数据提取规则

### 分支变更范围提取

通过 Git 命令提取：
```bash
git merge-base main HEAD          # 获取合并基准
git diff --name-only <base> HEAD  # 获取变更文件
```

### 测试策略解析

从测试策略报告 `{paths.governance.test_strategy}/ST-{scope}-测试策略_v{version}_{date}.md`（路径和命名从配置读取）中解析：
- 策略标题
- L1/L2/L3/M 策略和测试案例编号
- 策略要求；不自行添加未在策略中定义的覆盖率门槛

### 单测治理报告解析

从最终版单测治理报告 `{paths.governance.unit_test_governance}/ST-{scope}-单测治理_v{version}_{date}.md`（路径和命名从配置读取）中提取：
- 单测门禁摘要（通过率、覆盖率）
- L1 策略案例覆盖检查结论
- 自测检查点 L1 覆盖现状
- 需补充单测清单
- 最终决策（通过/不通过/阻塞）

### 自测检查点覆盖判定

L1 检查点直接引用最终版 unit-test-governance 报告；L2/L3/M 检查点必须基于实际执行结果、执行报告或人工验证明确结论判定。测试文件存在、Playwright 报告存在或 evidence 目录存在，都不能单独作为通过证据。

### Playwright 截图提取

从 `playwright-report/test-results/` 中提取：
- 关键步骤截图
- 失败测试的截图
- 视频录制文件路径

## 输出自检

报告写入后必须检查：

1. 文件存在、非空，并能按 UTF-8 读取。
2. 文件名包含 `ST-`、版本号和日期，且没有覆盖旧版本。
3. 必需章节和关键表头存在。
4. L2/L3/M 的“通过/已完成”必须有真实执行结果或人工明确结论；文件存在、报告文件存在或 evidence 目录存在不能单独判定通过。
5. 自检失败时标记“输出自检失败”，不得声称报告生成完成。

## 环境配置要求

### Playwright 配置

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    screenshot: 'only-on-failure', // 失败时截图
    video: 'retain-on-failure',    // 失败时录像
  },
  reporter: [
    ['list'],
    ['html', { open: 'never' }],   // 生成HTML报告
  ],
});
```

## 输出文件名规范

```
{paths.governance.test_report}/ST-{scope}-自测报告_v{version}_{date}.md
```

路径从配置 `paths.governance.test_report` 读取，默认 `reports/test-report`。

命名从配置 `report_naming.test_report` 读取，默认 `ST-{scope}-自测报告_v1.0_{date}.md`。

## 扩展能力

- 支持整合 test-strategy-planner 和最终版 unit-test-governance 报告
- L1 单测门禁直接引用最终版 unit-test-governance 结论
- L2/L3/M 测试基于最新测试文件和人工证据重新分析
- 支持基于分支变更范围计算增量覆盖率
- 支持生成 PDF 格式报告（需安装 puppeteer）
- 支持发送飞书/钉钉通知

## 报告发布与确认任务

先读取 `references/lark-document-source.md`。

只有报告完成输出自检后，才能询问用户是否通过飞书 MCP 发布。输出自检未完成时，不得创建飞书文档或任务。

询问模板：

```markdown
本次自测报告已生成并完成输出自检。

请确认是否通过飞书 MCP 执行以下操作：
- 创建飞书文档：是 / 否
- 创建"自测完成确认"审批任务：是 / 否
- 审批人：请提供姓名、邮箱或 open_id；随后通过飞书 MCP 查询并确认

默认发布文件：自测报告；如需同时发布其他相关文档（测试策略报告、单测治理报告），请一并确认。
```

执行规则：

1. 用户未明确确认前，不创建飞书文档、不创建审批任务、不向任何飞书用户发送内容。
2. 创建文档时，默认发布已完成自检的自测报告；附件只有在用户明确确认后才一并创建或关联。
3. 创建任务时，名称固定为"自测完成确认"，内容包含飞书文档链接、分析范围、各层级测试结论、主要风险、TODO 和确认要求。
4. 创建任务前，先让用户提供审批人的姓名、邮箱或 open_id；不得先枚举全部可访问用户作为审批人候选。
5. 通过飞书 MCP 的用户目录能力按用户提供的条件查询，展示匹配用户的姓名及可确认身份信息（邮箱或 open_id）。
6. 即使查询仅匹配一个用户，也必须取得最终确认；多个匹配结果时必须让用户明确选择。
7. 查不到用户、身份信息不足、用户无法确认，或 MCP 未暴露文档/用户查询/任务或审批能力时，停止发送并说明阻塞原因。
8. 执行前确认当前飞书 MCP 已获得文档、用户查询和任务/审批所需权限；权限不足时不得声称已创建。
9. 创建完成后，通过飞书 MCP 验证文档链接、任务或审批实例标识、审批人和状态；最终回复分别说明文档和任务的创建结果，失败时记录原因和可重试事项。

普通飞书任务与原生审批实例均可承载"自测完成确认"；优先使用当前会话实际暴露且已授权的能力，不得假设 MCP 已具备某个工具。

## 最终对话中的后续 skill 建议

后续 skill 建议只出现在最终对话，不写入报告或 TODO 表。建议必须依据当前项目实际存在的 `.agents/skills/*/SKILL.md` 动态生成。

执行步骤：

1. 扫描项目内 skill 的 `name`、`description` 和用途说明。
2. 按后续任务匹配能力：测试策略规划、单测治理、API/JMeter、前端测试、UI 自动化、人工验证等。
3. 只推荐真实存在的 skill；没有匹配项时说明"项目暂未提供对应 skill"，并给出缺失能力名称。
4. 多个候选时按与本次任务的匹配度排序，并说明原因和输入建议。
5. 不得因历史报告或旧流程出现过某个 skill 名称就默认推荐。

建议输出格式：

| 后续任务 | 推荐 skill | 是否存在 | 推荐原因 | 输入建议 |
|---|---|---|---|---|

## 最终回复约束

报告生成后，最终对话回复保持简短，只包含：

- 报告路径。
- 分析范围。
- 各层级测试结论（L1/L2/L3/M）。
- 整体交付建议（可提测/有条件提测/不建议提测）。
- 输出自检结果。
- 人工验证目录路径（如已创建）。
- 必要的下一步建议及动态 skill 路由。

---

*Version 1.3 | 2026-06-30*
