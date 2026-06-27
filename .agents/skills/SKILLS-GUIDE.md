# Skills 说明文档

> 版本火车需求管理系统 MVP 项目可用的 AI Skills 速查手册
> 更新时间：2026-06-09

---

## 一、Skills 总览

| 分类 | Skill | 触发方式 | 一句话描述 |
|------|-------|---------|-----------|
| 🔍 诊断 | **diagnose** | "diagnose this" / "debug this" / 报告 Bug | 严格诊断循环：复现→最小化→假设→插桩→修复→回归 |
| 🧪 测试 | **tdd** | "TDD" / "red-green-refactor" / "test first" | 红绿重构循环的测试驱动开发 |
| 🧪 测试 | **test-strategy-analyzer** | "分析测试策略" / "测试案例×测试方式" | 分析测试案例确定测试方式，输出分层策略文档 |
| 🧪 测试 | **test-report-generator** | "生成自测报告" / "输出测试报告" | 从 vitest/playwright 提取数据，生成可验证的自测报告 |
| 🧪 测试 | **webapp-testing** | 测试本地 Web 应用 | Playwright 前端功能验证、截图、浏览器日志 |
| 🔌 测试 | **automating-api-testing** | "/api-test-automation" / API 接口测试 | 从 OpenAPI 规范自动生成 REST/GraphQL 接口测试 |
| 🔒 测试 | **pentesting-claude-skill** | 安全扫描 / 渗透测试 | AI 驱动渗透测试：SAST 分析、OWASP Top 10、报告生成 |
| � 前端 | **frontend-design** | 构建 Web 组件/页面/布局 | 高质量前端界面，避免通用 AI 美学 |
| 🎨 前端 | **web-artifacts-builder** | 复杂多组件 artifact | React + Tailwind + shadcn/ui 多组件构建 |
| 📱 移动端 | **vercel-react-native-skills** | React Native / Expo 任务 | RN 性能优化、动画、原生模块最佳实践 |
| 🏗️ 架构 | **improve-codebase-architecture** | "improve architecture" / "refactor" | 发现深层重构机会，提升可测试性和可导航性 |
| 🏗️ 架构 | **vercel-composition-patterns** | 复合组件 / render props / context | React 组合模式，解决 boolean prop 泛滥 |
| 🔥 施压 | **grill-me** | "grill me" / "stress test my plan" | 无情追问计划/设计，直到达成共识 |
| 🔥 施压 | **grill-with-docs** | 结合项目文档施压 | 对照 CONTEXT.md 和 ADR 对设计施压测试 |
| 📋 需求 | **to-prd** | "create PRD" / "to PRD" | 把对话上下文转成 PRD 发布到 Issue Tracker |
| 📋 需求 | **to-issues** | "create issues" / "break into issues" | 把计划/PRD 拆成可独立认领的 Issue（垂直切片） |
| 📋 需求 | **triage** | "triage" / "create issue" / "manage issues" | Issue 分拣状态机，管理 Bug/Feature 工作流 |
| 🚀 原型 | **prototype** | "prototype this" / "try designs" | 快速原型：业务逻辑走终端，UI 走多方案切换 |
| 🔧 Git | **git-commit** | "commit" / "commit changes" | Conventional commit 生成器，支持类型/范围/描述 |
| 🔧 Git | **git-push-notice** | "commit and push" / `/push-notice 人名` | Git 提交推送群通知 + 按人名发飞书私信通知 |
| 🔧 Git | **gh-cli** | GitHub 操作相关 | GitHub CLI 全面参考：仓库、Issue、PR、Actions |
| 🎨 设计 | **figma** | Figma URL / node ID / 设计转代码 | 从 Figma 获取设计上下文，转成生产代码 |
| 💬 沟通 | **caveman** | "caveman mode" / "less tokens" / "be brief" | 极简沟通模式，省约 75% token |
| 💬 沟通 | **handoff** | "handoff" / "handover" | 压缩对话上下文生成交接文档 |
| 🗄️ 数据库 | **redis-development** | Redis 相关任务 | Redis 性能优化、数据结构、向量搜索最佳实践 |
| 🛠️ 元技能 | **skill-creator** | 创建新 Skill | 创建新 Skill 的必须工具 |
| 🛠️ 元技能 | **write-a-skill** | "write a skill" / "build a skill" | 编写新 Skill 的结构和资源 |
| 🛠️ 元技能 | **setup-matt-pocock-skills** | 初始化项目 Skills | Matt Pocock Skills 项目初始化配置 |

---

## 二、本项目推荐使用场景

### 当前阶段：T0 安全加固完成 → T1 需求录入开发

| 阶段 | 推荐 Skill | 用途 |
|------|-----------|------|
| T1 设计审核 | `grill-with-docs` | 对照 PRD 和 ADR 对 T1 设计施压 |
| T1 编码 | `tdd` | 红绿重构循环开发需求录入功能 |
| T1 前端 | `frontend-design` | 需求录入表单、列表页面的高质量 UI |
| 提交代码 | `git-commit` | 智能 conventional commit |
| 拆分任务 | `to-issues` | 把 T1 PRD 拆成可独立认领的 Issue |
| Bug 排查 | `diagnose` | 严格诊断循环定位问题 |
| 架构优化 | `improve-codebase-architecture` | 发现代码深层重构机会 |

---

## 三、Skill 详细说明

### 🔍 diagnose — 诊断循环

**触发**：报告 Bug、说 "diagnose this" / "debug this"

**流程**：
1. **Reproduce** — 稳定复现问题
2. **Minimise** — 最小化复现条件
3. **Hypothesise** — 形成假设
4. **Instrument** — 插桩验证
5. **Fix** — 修复
6. **Regression-test** — 回归测试

**适用场景**：任何 Bug、性能回归、异常行为排查

---

### 🧪 tdd — 测试驱动开发

**触发**：说 "TDD" / "red-green-refactor" / "test first"

**流程**：
1. 🔴 **Red** — 先写失败测试
2. 🟢 **Green** — 最小代码让测试通过
3. 🔵 **Refactor** — 重构，测试保持绿色

**附带资源**：
- `tests.md` — 测试编写指南
- `mocking.md` — Mock 策略
- `interface-design.md` — 接口设计
- `deep-modules.md` — 深层模块设计
- `refactoring.md` — 重构技巧

---

### 🔥 grill-me — 设计施压

**触发**：说 "grill me" / "stress test my plan"

**行为**：像资深技术专家一样无情追问你的计划，每个决策分支都要解释清楚，直到达成共识或发现致命缺陷。

---

### 🔥 grill-with-docs — 结合文档施压

**触发**：结合项目文档对设计施压

**与 grill-me 的区别**：会读取项目的 `CONTEXT.md` 和 `docs/adr/` 目录下的 ADR（架构决策记录），用已有的领域语言和决策来挑战你的设计。

**附带资源**：
- `CONTEXT-FORMAT.md` — 上下文文档格式
- `ADR-FORMAT.md` — ADR 格式

---

### 📋 to-issues — PRD 转 Issue

**触发**：说 "create issues" / "break into issues"

**行为**：把计划/PRD/Spec 拆成可独立认领的 Issue，使用垂直切片（tracer bullet）方式，每个 Issue 都是一个端到端的功能切片。

---

### 📋 to-prd — 生成 PRD

**触发**：说 "create PRD" / "to PRD"

**行为**：把当前对话上下文转成 PRD 文档，发布到项目的 Issue Tracker。

---

### 📋 triage — Issue 分拣

**触发**：说 "triage" / "create issue" / "manage issues"

**行为**：通过状态机驱动的分拣流程管理 Issue，支持 Bug/Feature 分类、优先级评估、Agent 分配。

**附带资源**：
- `AGENT-BRIEF.md` — Agent 简报格式
- `OUT-OF-SCOPE.md` — 范围外处理

---

### 🚀 prototype — 快速原型

**触发**：说 "prototype this" / "try designs" / "let me play with it"

**行为**：
- 状态/业务逻辑问题 → 可运行的终端应用
- UI 问题 → 多个截然不同的 UI 方案，可切换

**附带资源**：
- `LOGIC.md` — 逻辑原型指南
- `UI.md` — UI 原型指南

---

### 🏗️ improve-codebase-architecture — 架构优化

**触发**：说 "improve architecture" / "refactor" / "consolidate modules"

**行为**：基于 `CONTEXT.md` 的领域语言和 `docs/adr/` 的决策记录，发现代码库深层重构机会。

**附带资源**：
- `DEEPENING.md` — 深化策略
- `INTERFACE-DESIGN.md` — 接口设计
- `LANGUAGE.md` — 领域语言

---

### 🔧 git-commit — Conventional Commit

**触发**：说 "commit" / "commit changes"

**行为**：
1. 分析 git status 和 git diff
2. 根据变更文件识别 scope
3. 根据变更类型选择 commit type（feat/fix/docs/refactor 等）
4. 生成符合 Conventional Commits 格式的 message
5. 请求用户确认后再执行 commit

**支持的类型**：
- `feat` - 新功能
- `fix` - Bug 修复
- `docs` - 文档变更
- `style` - 格式变更
- `refactor` - 重构
- `test` - 测试
- `perf` - 性能优化
- `build` - 构建系统
- `ci` - CI 配置
- `chore` - 维护工作

---

### 🔧 git-push-notice — 提交推送群通知 + 私信通知

**触发**：
- `commit and push` / `提交并推送` — 提交代码并推送，发飞书群通知
- `/push-notice 铁胆` — 搜索联系人"铁胆"并发送私信通知
- `/push-notice 铁胆 张三` — 给多个人发私信通知

**行为**：
1. **群通知模式**：分析 git 变更 → 生成 commit message → 确认 → commit + push → 发飞书群卡片通知
2. **私信模式**：解析人名 → `lark-cli contact +search-user` 搜索 → `lark-cli im +messages-send --user-id` 发私信

---

### 🎨 frontend-design — 高质量前端

**触发**：构建 Web 组件/页面/布局/样式

**行为**：生成有辨识度的、生产级前端代码，避免通用 AI 美学（千篇一律的渐变、圆角、阴影）。

---

### 🎨 web-artifacts-builder — 多组件 Artifact

**触发**：复杂多组件 artifact（需要状态管理、路由、shadcn/ui）

**附带脚本**：
- `init-artifact.sh` — 初始化 artifact 项目
- `bundle-artifact.sh` — 打包 artifact
- `shadcn-components.tar.gz` — shadcn/ui 组件包

---

### 💬 caveman — 极简模式

**触发**：说 "caveman mode" / "less tokens" / "be brief"

**行为**：省约 75% token，去掉冠词、填充词、客套话，只保留核心技术信息。

---

### 🗄️ redis-development — Redis 开发

**触发**：Redis 相关任务（数据结构、性能优化、向量搜索、语义缓存）

---

### 🌐 webapp-testing — Web 应用测试

**触发**：测试本地 Web 应用

**行为**：使用 Playwright 进行前端功能验证、UI 行为调试、浏览器截图、查看浏览器日志。

**附带资源**：
- `examples/` — 控制台日志捕获、元素发现、静态 HTML 自动化示例
- `scripts/with_server.py` — 服务器生命周期管理（自动启动/停止开发服务器）

**文件结构**：
```
webapp-testing/
├── examples/
│   ├── console_logging.py
│   ├── element_discovery.py
│   └── static_html_automation.py
├── scripts/
│   └── with_server.py
├── LICENSE.txt
└── SKILL.md
```

---

### 🧪 test-strategy-analyzer — 测试策略分析

**触发**：说 "分析测试策略" / "测试案例×测试方式" / 设计分层测试策略

**调用格式**（必须指定代码范围）：
```
"分析 T1 需求池管理的测试策略，代码范围：service.ts"
"分析最近提交的测试策略，代码范围：HEAD~5"
```

**调用流程**：
1. **Step 0: 需求澄清**：多轮询问确认测试案例文档、代码范围、需求文档
2. **Step 1: 输出确认清单**：分析前输出清单，用户审核后再执行
3. **Step 2: 确认后分析**：读取文件并分析

**代码范围参数**：
- `模块名`：Task 编号或功能模块（如 `T1-需求池`、`紧急变更`）
- `文件路径`：需要分析的代码文件（如 `service.ts`、`index.ts`）
- `提交范围`：Git 提交（`HEAD~5`、`feature/xxx`、`abc123..def456`）
- `函数列表`：需要单测的具体函数（如 `sanitizeDescription`）

**分层原则**：
- **L1 单测**：必须先读代码，分析函数内部逻辑
- **L2 API自动化**：需要读 API 路由确认路径和方法
- **L3 Playwright**：基于业务理解串用户旅程

**覆盖率目标**：
- 增量覆盖率 ≥ 80%（service.ts 新增代码）
- API 自动化覆盖率 ≥ 90%（核心业务流程）
- Playwright 覆盖 N 条核心用户旅程

**输出产物**：
- 有测试案例 → 2 份：分层测试策略 + 测试方式对照表
- 无测试案例 → 3 份：测试案例（基于代码分析生成）+ 分层测试策略 + 测试方式对照表

**文件名规范**：
- `RT-{TaskName}-测试案例_{版本}_{日期}.md`（无测试案例时生成）
- `RT-{TaskName}-分层测试策略_{版本}_{日期}.md`
- `RT-{TaskName}-测试案例测试方式对照表_{版本}_{日期}.md`

---

### 🔌 automating-api-testing — API 接口测试自动化

**来源**：jeremylongshore/claude-code-plugins-plus-skills

**触发**：`/api-test-automation:automating-api-testing`

**行为**：从 OpenAPI 规范自动生成 REST/GraphQL 接口测试，包括请求生成、响应验证、schema 合规、认证流程、错误处理和幂等性测试。

**多语言支持**：
- **Node.js** — Supertest
- **Python** — pytest + httpx
- **Java** — REST-assured

**支持格式**：
- OpenAPI/Swagger 规范
- Postman/Newman 集合
- Pact 消费者驱动契约测试

**附带资源**：
- `assets/` — examples（OpenAPI YAML、GraphQL Schema、测试套件模板）
- `scripts/generate_test_suite.py` — 自动生成测试套件脚本

---

### 🔒 pentesting-claude-skill — 渗透测试

**来源**：PyPI pentesting-claude-skill v1.0.0

**触发**：安全扫描 / 渗透测试 / 代码安全审查

**行为**：AI 驱动的渗透测试自动化，使用 Claude 的语义代码理解能力，超越简单模式匹配，识别复杂漏洞。

**核心功能**：
- 🔍 **语义 SAST 分析** — 深度代码安全扫描
- 🎯 **OWASP Top 10 全覆盖** — 访问控制、注入、加密缺陷等
- 🚀 **CI/CD 集成** — GitHub Actions 工作流
- 📊 **报告生成** — HTML/PDF/JSON 专业报告
- 🔗 **攻击链检测** — 多步骤利用路径识别
- ✅ **误报过滤** — 上下文感知降噪

**使用方式**：
```bash
# SAST 分析
python3 -m handlers.sast_analyzer --scope full_codebase

# 生成报告
python3 -m handlers.report_generator --format html
```

**文件结构**：
```
pentesting-claude-skill/
├── handlers/                    # 核心 Python 模块
│   ├── sast_analyzer.py         # 静态分析引擎
│   ├── report_generator.py      # 报告生成
│   ├── finding_aggregator.py    # 发现去重聚合
│   ├── payload_generator.py     # 攻击载荷创建
│   └── dynamic_executor.py      # 动态测试
├── instructions/                # Claude 分析指令
│   ├── security-review.md
│   ├── dynamic-testing.md
│   ├── attack-vectors.md
│   ├── reporting.md
│   └── orchestration.md
├── resources/                   # 配置和模板
│   ├── attack_vectors.json
│   ├── severity_matrix.json
│   ├── false_positive_filters.txt
│   └── report_templates/
└── tests/                       # 测试套件
```

---

### 💬 handoff — 交接文档

**触发**：说 "handoff" / "handover" / "transfer to another agent"

**行为**：将当前对话上下文压缩为交接文档，供其他 AI Agent 接管。包含项目状态、决策记录、剩余工作等信息。

**附带资源**：
- `handoff.sh` — 交接脚本

---

### 🎨 figma — Figma 设计转代码

**触发**：Figma URL / node ID / 设计转代码

**行为**：从 Figma MCP 服务器获取设计上下文、截图、变量、资产，转成生产代码。

---

### 🏗️ vercel-composition-patterns — React 组合模式

**触发**：复合组件 / render props / context provider / boolean prop 泛滥

**行为**：React 可扩展组合模式，包含 React 19 API 变更。

---

### 📱 vercel-react-native-skills — React Native

**触发**：React Native / Expo / 移动端性能 / 原生 API

---

### 🔧 gh-cli — GitHub CLI

**触发**：GitHub 操作（仓库、Issue、PR、Actions、Projects、Releases 等）

**行为**：提供 `gh` CLI 的全面参考。

---

### 🛠️ skill-creator / write-a-skill — 创建新 Skill

**触发**：创建/编写/构建新 Skill

**行为**：`skill-creator` 是创建 Skill 的必须工具；`write-a-skill` 提供结构和资源指导。

---

## 四、使用方式

在对话中直接说出 Skill 名称或触发词即可，例如：

```
"grill me T1的设计方案"              → 激活 grill-me
"tdd 这个功能"                       → 激活 tdd
"commit"                             → 激活 git-commit
"commit and push"                    → 激活 git-push-notice（群通知）
"/push-notice 铁胆"                  → 激活 git-push-notice（私信通知）
"diagnose this"                      → 激活 diagnose
"caveman mode"                       → 激活 caveman
"handoff"                            → 激活 handoff
"测试这个页面"                       → 激活 webapp-testing
"/api-test-automation: 测试登录接口"  → 激活 automating-api-testing
"扫描代码安全漏洞"                   → 激活 pentesting-claude-skill
```

---

## 五、Skill 文件结构

每个 Skill 位于 `.agents/skills/<skill-name>/` 目录下：

```
.agents/skills/
├── automating-api-testing/      # API 接口测试自动化
│   ├── SKILL.md
│   ├── assets/                  # 示例文件（OpenAPI、GraphQL、测试模板）
│   ├── scripts/
│   └── references/
├── caveman/
│   └── SKILL.md
├── diagnose/
│   ├── SKILL.md
│   └── scripts/
├── git-commit/
│   └── SKILL.md
├── git-push-notice/
│   └── SKILL.md
├── grill-with-docs/
│   ├── SKILL.md
│   ├── ADR-FORMAT.md
│   └── CONTEXT-FORMAT.md
├── handoff/
│   ├── SKILL.md
│   └── handoff.sh
├── pentesting-claude-skill/     # 渗透测试
│   ├── SKILL.md (setup.py)
│   ├── handlers/                # SAST 分析、报告生成等
│   ├── instructions/            # 安全审查指令
│   ├── resources/               # 漏洞库、评分矩阵
│   └── tests/
├── tdd/
│   ├── SKILL.md
│   ├── tests.md
│   ├── mocking.md
│   ├── interface-design.md
│   ├── deep-modules.md
│   └── refactoring.md
├── webapp-testing/              # Web 应用测试
│   ├── SKILL.md
│   ├── examples/                # Playwright 示例脚本
│   └── scripts/
└── ...
```

**SKILL.md** 是每个 Skill 的入口文件，定义了触发条件、行为和指令。

---

*来源：mattpocock/skills + 项目实践*
*生成时间：2026-05-12*
