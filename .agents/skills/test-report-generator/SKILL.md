---
name: test-report-generator
description: 从 vitest coverage 报告和 playwright 测试报告中自动提取数据，生成自测报告，证明真实执行并通过。支持结合测试策略文档生成分层报告，支持基于分支变更范围计算增量覆盖率。
tags: [测试, 报告, 覆盖率, Playwright, 自测]
author: RT-Agent
version: 1.2
date: 2026-06-27
---

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

```bash
# 步骤1: 在 server 目录下运行测试并生成覆盖率
cd release-train/apps/server
pnpm test -- --coverage

# 步骤2: 使用脚本生成报告（基础版）
python3 ../../../.agents/skills/test-report-generator/gen-report.py

# 步骤2: 使用脚本生成报告（结合测试策略）
python3 ../../../.agents/skills/test-report-generator/gen-report.py "../../../03-需求与设计/Task1-需求池管理/测试案例/RT-T1-需求池管理-分层测试策略_v1.0_20260626.md"

# 步骤3: 查看报告
cat 自测报告.md
```

## 调用流程

### Step 0: 输入确认（必须先确认再分析）

正式生成报告前，必须先检索并确认输入范围。未确认前，只允许做文件检索和候选清单输出，不要生成覆盖结论或报告文件。

**必须确认的输入**：

| 输入类型 | 来源 | 说明 |
|----------|------|------|
| 测试策略报告 | `reports/test-strategy/requirement-{scope}-测试策略与覆盖分析.md` | L2/L3/M 策略来源 |
| 单测治理报告 | `reports/unit-test-governance/requirement-{scope}-unit-test-governance.md` | L1 门禁结论来源（直接引用） |
| 策略对照表附件 | `reports/test-strategy/appendix-{scope}-测试案例测试方式对照表.md` | 测试案例编号、测试方式、覆盖逻辑 |
| 测试文件列表 | 自动检索或用户指定 | L2 API 测试、L3 UI 测试文件路径 |
| 人工测试目录 | `evidence/{scope}/` 或用户指定 | M 人工验证证据目录 |

**确认清单模板**：

```markdown
请确认本次报告生成输入：

| 输入类型 | 检索结果 | 是否纳入 |
|----------|----------|----------|
| 测试策略报告 | reports/test-strategy/requirement-xxx-测试策略与覆盖分析.md | 待确认 |
| 单测治理报告 | reports/unit-test-governance/requirement-xxx-unit-test-governance.md | 待确认 |
| 策略对照表附件 | reports/test-strategy/appendix-xxx-测试案例测试方式对照表.md | 待确认 |
| L2 API 测试文件 | xx.api.test.ts、xx.api.spec.ts | 待确认 |
| L3 UI 测试文件 | playwright-report/、xx.e2e.test.ts | 待确认 |
| 人工测试证据目录 | evidence/{scope}/ | 待确认/不适用 |

确认后我再开始分析并生成报告；如果某项不适用，请直接标注"不适用"。
```

**文件检索规则**：

| 类型 | 检索路径 |
|------|----------|
| 测试策略报告 | `reports/test-strategy/requirement-*-测试策略与覆盖分析.md` |
| 单测治理报告 | `reports/unit-test-governance/requirement-*-unit-test-governance.md` |
| 策略对照表 | `reports/test-strategy/appendix-*-测试案例测试方式对照表.md` |
| L2 API 测试 | `**/*.api.test.ts`、`**/api/**/*.test.ts`、`**/__tests__/api*.ts`、`**/*.api.spec.ts` |
| L3 UI 测试 | `playwright-report/index.html`、`test-results/**/*.png`、`**/*.e2e.test.ts`、`**/*.e2e.spec.ts` |
| M 人工证据 | `evidence/{scope}/**/summary.md`、`evidence/{scope}/**/*.png`、`evidence/{scope}/**/*.log` |

### Step 1: 收集测试数据

根据确认的输入范围收集数据，分层处理：

**L1 单元测试（直接引用 unit-test-governance 报告）**：
- 从 `reports/unit-test-governance/requirement-{scope}-unit-test-governance.md` 提取：
  - 单测门禁摘要（通过率、覆盖率）
  - L1 策略案例覆盖检查结论
  - 自测检查点 L1 覆盖现状
  - 需补充单测清单
  - 最终决策（通过/不通过/阻塞）

**L2/L3/M 测试（重新分析）**：
- 从 `reports/test-strategy/requirement-{scope}-测试策略与覆盖分析.md` 提取：
  - L2/L3/M 策略和测试案例编号
- 检索最新 L2 API 测试文件，分析执行结果和覆盖状态
- 检索最新 L3 UI 测试文件和 playwright-report，分析执行结果和截图证据
- 检索人工测试证据目录 `evidence/{scope}/`，读取 summary.md 和截图

**其他数据来源**：
```
1. Git 分支信息
   ├── 当前分支名
   ├── 当前Commit
   └── 相对于 main 的变更文件

2. 策略对照表附件
   └── reports/test-strategy/appendix-{scope}-测试案例测试方式对照表.md
```

### Step 2: 生成报告

用户确认输入范围后，开始分析并生成报告。

**分析流程**：
1. 直接引用 unit-test-governance 报告的 L1 门禁结论
2. 检索并分析 L2 API 测试文件执行结果
3. 检索并分析 L3 UI 测试文件和 playwright 报告
4. 检索并汇总 M 人工验证证据
5. 整合策略对照表，生成测试结果明细
6. 基于测试结果判定 L2/L3/M 检查点覆盖状态

**报告文件名规范**：
```
reports/test-report/RT-{scope}-自测报告_{版本}_{日期}.md
```

**报告内容结构**：

```markdown
# RT-{scope}-自测报告_{版本}_{日期}.md

## 基本信息
| 项目 | 内容 |
|------|------|
| 报告编号 | RT-TEST-{日期}-001 |
| 生成时间 | {时间} |
| 执行环境 | Node.js / macOS |
| Git 分支/Commit | {分支}@{commit} |
| 测试人员 | 开发人员 |

## 测试策略概览
本次测试基于 **test-strategy-planner 主报告**，采用三层叠加覆盖策略：

| 层级 | 工具 | 覆盖范围 | 目标 |
|------|------|---------|------|
| **L1 单元测试** | Vitest | service.ts 纯函数、校验逻辑 | 增量覆盖率 >80%，通过率 100% |
| **L2 接口自动化** | Vitest + Supertest | API 契约、鉴权、参数、状态流转 | API 自动化覆盖率 ≥90% |
| **L3 UI 自动化** | Playwright | 关键用户旅程、UI 交互 | 覆盖核心用户旅程 |
| **M 人工验证** | SIT 环境 + 截图 | 低频 UI、截图确认 | 保留可审计证据 |

### 覆盖率目标
| 指标 | 目标值 |
|------|-------|
| L1 增量覆盖率 | >80% |
| L1 单测通过率 | 100% |

## L1 单元测试门禁结论
（直接引用 unit-test-governance 报告）

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
（读取 evidence/{scope}/ 目录）

| 验证项 | 证据文件 | 验证结果 |
|--------|----------|----------|

## 测试结果明细
（整合策略对照表 + 最新测试文件覆盖分析 + 人工验证证据）

| 测试案例编号 | 测试方式 | 测试文件 | 执行结果 | 覆盖状态 |
|--------------|----------|----------|----------|----------|

## 自测检查点覆盖摘要（双报告整合）
| 检查点 | 层级 | 优先级 | 覆盖状态 | 证据来源 |
|--------|------|--------|----------|----------|

（L1 检查点来自 unit-test-governance；L2/L3/M 检查点基于上述测试分析结果判定）

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

从测试策略报告 `reports/test-strategy/requirement-{scope}-测试策略与覆盖分析.md` 中解析：
- 策略标题
- L1/L2/L3/M 策略和测试案例编号
- 覆盖率目标

### 单测治理报告解析

从单测治理报告 `reports/unit-test-governance/requirement-{scope}-unit-test-governance.md` 中提取：
- 单测门禁摘要（通过率、覆盖率）
- L1 策略案例覆盖检查结论
- 自测检查点 L1 覆盖现状
- 需补充单测清单
- 最终决策（通过/不通过/阻塞）

### 自测检查点覆盖判定

L1 检查点直接引用 unit-test-governance 报告；L2/L3/M 检查点基于测试文件分析结果判定覆盖状态。不重新分析代码，只基于上游报告和执行证据汇总。

### Playwright 截图提取

从 `playwright-report/test-results/` 中提取：
- 关键步骤截图
- 失败测试的截图
- 视频录制文件路径

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
reports/test-report/RT-{scope}-自测报告_{版本}_{日期}.md
```

## 扩展能力

- 支持整合 test-strategy-planner 和 unit-test-governance 报告
- L1 单测门禁直接引用 unit-test-governance 结论
- L2/L3/M 测试基于最新测试文件和人工证据重新分析
- 支持基于分支变更范围计算增量覆盖率
- 支持生成 PDF 格式报告（需安装 puppeteer）
- 支持发送飞书/钉钉通知

---

*Version 1.3 | 2026-06-30*
