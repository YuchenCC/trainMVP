# Skills 说明文档

> 版本火车需求管理系统 MVP 项目可用的 AI Skills 速查手册
> 更新时间：2026-05-12

---

## 一、Skills 总览

| 分类 | Skill | 触发方式 | 一句话描述 |
|------|-------|---------|-----------|
| 🔍 诊断 | **diagnose** | "diagnose this" / "debug this" / 报告 Bug | 严格诊断循环：复现→最小化→假设→插桩→修复→回归 |
| 🧪 测试 | **tdd** | "TDD" / "red-green-refactor" / "test first" | 红绿重构循环的测试驱动开发 |
| 🎨 前端 | **frontend-design** | 构建 Web 组件/页面/布局 | 高质量前端界面，避免通用 AI 美学 |
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
| 🔧 Git | **git-commit** | "/commit" / "commit changes" | 智能 diff 分析 + conventional commit + 交互式提交 |
| 🔧 Git | **gh-cli** | GitHub 操作相关 | GitHub CLI 全面参考：仓库、Issue、PR、Actions |
| 🎨 设计 | **figma** | Figma URL / node ID / 设计转代码 | 从 Figma 获取设计上下文，转成生产代码 |
| 💬 沟通 | **caveman** | "caveman mode" / "less tokens" / "be brief" | 极简沟通模式，省约 75% token |
| 🗄️ 数据库 | **redis-development** | Redis 相关任务 | Redis 性能优化、数据结构、向量搜索最佳实践 |
| 🌐 测试 | **webapp-testing** | 测试本地 Web 应用 | Playwright 交互测试、截图、浏览器日志 |
| 🛠️ 元技能 | **skill-creator** | 创建新 Skill | 创建新 Skill 的必须工具 |
| 🛠️ 元技能 | **write-a-skill** | "write a skill" / "build a skill" | 编写新 Skill 的结构和资源 |

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

### 🔧 git-commit — 智能提交

**触发**：说 "/commit" / "commit changes"

**行为**：
1. 自动检测变更类型和范围
2. 从 diff 生成 conventional commit 消息
3. 交互式提交，可覆盖类型/范围/描述
4. 智能文件暂存，逻辑分组

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
"grill me T1的设计方案"     → 激活 grill-me
"tdd 这个功能"              → 激活 tdd
"/commit"                   → 激活 git-commit
"diagnose this"             → 激活 diagnose
"caveman mode"              → 激活 caveman
```

---

## 五、Skill 文件结构

每个 Skill 位于 `.agents/skills/<skill-name>/` 目录下：

```
.agents/skills/
├── caveman/
│   └── SKILL.md              # Skill 主文件（必需）
├── diagnose/
│   ├── SKILL.md
│   └── scripts/              # 辅助脚本
├── grill-with-docs/
│   ├── SKILL.md
│   ├── ADR-FORMAT.md         # 附带资源
│   └── CONTEXT-FORMAT.md
├── tdd/
│   ├── SKILL.md
│   ├── tests.md              # 子主题文档
│   ├── mocking.md
│   ├── interface-design.md
│   ├── deep-modules.md
│   └── refactoring.md
└── ...
```

**SKILL.md** 是每个 Skill 的入口文件，定义了触发条件、行为和指令。

---

*来源：mattpocock/skills + 项目实践*
*生成时间：2026-05-12*
