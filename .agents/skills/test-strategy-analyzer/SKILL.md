---
name: "test-strategy-analyzer"
description: "Analyzes test cases and determines testing methods (unit/API/Playwright). Invoke when user wants to design test strategy, map test cases to testing layers, or generate test coverage plans."
---

# Test Strategy Analyzer

测试策略分析器 - 分析测试案例并确定测试方式，输出分层测试策略文档。

## 功能概述

将测试案例映射到三层测试策略：
- **L1 单元测试**：service.ts 中的纯函数、校验逻辑、算法
- **L2 接口自动化**：API 请求/响应、状态流转、权限控制
- **L3 Playwright**：UI 交互、页面跳转、用户体验

## 触发条件

用户要求执行以下操作时调用此 skill：
- 分析测试案例确定测试方式
- 设计分层测试策略
- 生成测试案例 × 测试方式对照表
- 制定测试覆盖率目标
- 规划测试实现优先级

## 调用流程

**重要：分析前必须先确认以下信息，输出清单让用户审核后再执行分析**

### Step 0: 需求澄清（多轮询问）

如果信息不明确，通过多轮询问确认：

```
询问 1: "请确认需求文档"
       - 读取对应的 PRD 或用户故事文档
       - 用于理解业务背景和功能范围
       - 如果未提供，列出目录下匹配的 PRD/用户故事文档供选择

询问 2: "请指定代码分析范围"
       - 可指定文件：service.ts、index.ts、特定函数
       - 可指定分支提交：git commit hash、branch name、commit range
       - 可指定功能模块：如 "紧急变更功能"、"需求录入功能"
       - 如果不确定，列出该 Task 下所有 service.ts 文件

询问 3: "请提供测试案例文档路径"
       - 如果用户提供路径，直接读取
       - 如果用户模糊描述，列出目录下匹配的 .md 文件供选择
       - **如果用户未提供测试案例**：
         - 基于需求文档 + 代码分析生成测试案例 MD
         - 输出到确认清单供用户审核
         - 文件名：RT-{TaskName}-测试案例_{版本}_{日期}.md
```

### Step 1: 输出确认清单

分析前输出以下清单，一次性确认：

```markdown
## 待确认信息清单

### 1. 测试案例文档
| 项目 | 内容 |
|------|------|
| 文档路径 | RT-T1-需求池管理-测试案例_v1.0.md |
| 案例总数 | 124 |
| 用户故事 | US1.1~US1.17 |
| **来源** | 用户提供 / **代码分析生成** |

### 2. 代码分析范围
| 类型 | 文件/提交 | 说明 |
|------|----------|------|
| Service | requirements/service.ts | 需求 CRUD 逻辑 |
| Routes | requirements/index.ts | API 路由定义 |
| 提交范围 | HEAD~10 | 最近 10 次提交 |

### 3. 需求文档
| 文档 | 路径 |
|------|------|
| PRD | RT-T1-需求池管理-PRD_v1.0.md |
| 用户故事 | RT-T1-需求池管理-用户故事_v1.0.md |

### 4. 分析目标
- 增量覆盖率目标：80%
- 核心用户旅程：3 条
- 输出文档：**2~3 份**（根据是否有测试案例调整）

请确认以上信息，确认后开始分析。
```

### Step 2: 确认后分析

用户确认后，执行分析：
1. 读取测试案例文档（如果有）
2. 读取代码文件（支持 git 提交范围）
3. 分析并输出结果

**输出文档数量**：
- 有测试案例 → 输出 2 份（分层测试策略 + 测试方式对照表）
- 无测试案例 → 输出 3 份（测试案例 + 分层测试策略 + 测试方式对照表）

## 调用方式

调用时必须指定代码范围，格式：

```
"分析 T1 需求池管理的测试策略，代码范围：service.ts"
"分析 T4 变更率的测试策略，代码范围：service.ts、index.ts"
"分析紧急变更功能的测试案例，代码：apps/server/src/modules/requirements/service.ts"
"分析最近提交的测试策略，代码范围：HEAD~5"
```

**代码范围参数**（调用时必须提供）：

| 参数 | 说明 | 示例 |
|------|------|------|
| `模块名` | Task 编号或功能模块 | `T1-需求池`、`T4-变更率`、`紧急变更` |
| `文件路径` | 需要分析的代码文件 | `service.ts`、`index.ts`、`routes/` |
| `提交范围` | Git 提交（分支/哈希/范围） | `HEAD~5`、`feature/xxx`、`abc123..def456` |
| `函数列表` | 需要单测的具体函数 | `sanitizeDescription`、`generateReqCode` |

### Git 提交范围支持

代码范围支持以下 Git 语法：

```
HEAD~10          # 最近 10 次提交
feature/t1       # 指定分支所有提交
abc123..def456   # commit A 到 commit B 之间的所有提交
--since="1 week ago"  # 一周内的所有提交
```

## 前置准备

### 1. 测试案例文档（必读）

读取用户提供的 `.md` 文件，解析所有测试案例（编号、描述、预期结果）。

### 2. 代码文件（根据代码范围读取）

**L1 单测必读文件**：
```
apps/server/src/modules/{module}/service.ts
```
- 识别纯函数（无外部依赖的独立函数）
- 分析函数内部逻辑（输入输出、分支条件、异常处理）
- 确定单测覆盖点

**L2 API自动化参考文件**：
```
apps/server/src/modules/{module}/index.ts          # API 路由
apps/server/src/routes/v1/{module}.ts              # 路由注册
```

**L3 Playwright参考文件**（可选）：
```
apps/web/src/pages/{module}/*.tsx                  # 前端页面
```

### 3. 单测覆盖点识别模板

读取 service.ts 后，识别以下类型函数并规划单测：

```typescript
// ========== 类型1：工具函数（直接单测）==========
function sanitizeDescription(html: string): string { ... }
// TC-SVC-001: 保留合法标签
// TC-SVC-002: 过滤危险标签
// TC-SVC-003: 过滤危险协议

function generateReqCode(tx: Prisma.TransactionClient): Promise<string> { ... }
// TC-SVC-004: 首次生成编号
// TC-SVC-005: 编号递增
// TC-SVC-006: 冲突重试
// TC-SVC-007: 重试耗尽

function hasCircularDependency(a: string, b: string, tx: any): Promise<boolean> { ... }
// TC-SVC-008: 自依赖检测
// TC-SVC-009: 直接循环检测
// TC-SVC-010: 间接循环检测
// TC-SVC-011: 无循环放行

// ========== 类型2：状态校验（单测覆盖分支）==========
// 读取代码后，识别 if/throw 分支，每个分支对应一个 TC
if (status !== 'DRAFT') { throw errors.notDraft(); }
// TC: 非草稿状态不可编辑

if (existing.baId !== operatorId) { throw errors.permissionDenied(); }
// TC: BA只能编辑自己的需求

// ========== 类型3：业务逻辑（API测试覆盖）==========
export async function createRequirement(...) { ... }  // API 测试
export async function updateRequirement(...) { ... }   // API 测试
```

## 分析原则

### 测试方式判断规则

| 测试场景 | 推荐方式 | 判断依据 |
|---------|---------|---------|
| 表单校验逻辑 | **L1 单测** | 纯函数逻辑，无外部依赖 |
| 算法实现（如编号生成、循环检测） | **L1 单测** | 独立函数，可白盒测试 |
| 状态机校验 | **L1+L2 叠加** | 单测覆盖校验逻辑 + API 覆盖流转 |
| API 请求/响应 | **L2 API自动化** | 验证后端接口正确性 |
| 状态流转（草稿→评审→通过） | **L2 API自动化** | 端到端业务流程 |
| 权限控制（403/401） | **L2 API自动化** | 验证后端权限校验 |
| 审计日志写入 | **L2 API自动化** | 验证数据库记录 |
| UI 按钮可见性 | **L3 Playwright** | 需渲染后验证 |
| 页面布局/样式 | **L3 Playwright** | 需浏览器渲染 |
| 页面跳转/路由 | **L3 Playwright** | 需端到端验证 |
| 视觉效果（Tag颜色） | **L3 Playwright** | 需截图验证 |
| 核心用户旅程 | **L2+L3 叠加** | API 验证逻辑 + Playwright 验证体验 |

### 分层叠加策略

每个测试案例可多层叠加覆盖：

```
L1 单测（基础保障）
    ↓
L2 API自动化（业务流程）
    ↓
L3 Playwright（用户体验）
```

## 输出产物

### 1. 测试案例 × 测试方式对照表

```markdown
| 案例 | 测试方式 | 工具 | 覆盖逻辑 |
|------|---------|------|---------|
| TC1.1.1 正常录入 | L2 API自动化 | Vitest + Supertest | 创建成功、状态验证 |
| TC1.1.7 XSS防护 | L1 单测 | Vitest | sanitizeDescription |
| TC1.1.10 按钮隐藏 | L3 Playwright | Playwright | UI权限验证 |
```

### 2. 统计概览

```markdown
| 测试方式 | 数量 | 占比 |
|---------|------|------|
| L1 单测 | XX | XX% |
| L2 API自动化 | XX | XX% |
| L3 Playwright | XX | XX% |
| 叠加覆盖 | XX | XX% |
```

### 3. 测试覆盖率目标

```markdown
- 增量覆盖率 ≥ 80%（service.ts 新增代码）
- API 自动化覆盖率 ≥ 90%（核心业务流程）
- Playwright 覆盖 N 条核心用户旅程
```

### 4. 优先级规划

```markdown
P0（优先实现）:
├── L1 单测：核心纯函数
├── L2 API：CRUD + 状态流转
└── L3 Playwright：Journey 1

P1（其次实现）:
├── L1 单测：状态机校验
├── L2 API：权限 + 审计
└── L3 Playwright：Journey 2

P2（最后实现）:
├── 边界场景
└── 批量操作
```

## 实现步骤

### Step 1: 需求澄清

通过多轮询问确认：
1. 测试案例文档路径
2. 代码分析范围（文件或 Git 提交）
3. 需求文档（PRD/用户故事）

### Step 2: 输出确认清单

输出待确认信息清单，等待用户审核。

### Step 3: 确认后读取文件

用户确认后，读取：
1. 测试案例文档
2. 代码文件（支持 Git 提交范围）
3. 需求文档

### Step 4: 分析并输出

1. 分析每个测试案例确定测试方式
2. 生成测试案例 × 测试方式对照表
3. 生成完整的分层测试策略文档

## 输出文件名规范

**有测试案例（输出 2 份）**：
```
RT-{TaskName}-分层测试策略_{版本}_{日期}.md
RT-{TaskName}-测试案例测试方式对照表_{版本}_{日期}.md
```

**无测试案例（输出 3 份）**：
```
RT-{TaskName}-测试案例_{版本}_{日期}.md                  # 基于代码分析生成
RT-{TaskName}-分层测试策略_{版本}_{日期}.md
RT-{TaskName}-测试案例测试方式对照表_{版本}_{日期}.md
```

## 示例

### 输入
```
"分析 T1 需求池管理的测试策略，代码范围：service.ts"
```

### Step 1: 需求澄清
```
发现未提供测试案例文档，列出以下选项供选择：
- 03-需求与设计/Task1-需求池管理/测试案例/RT-T1-需求池管理-测试案例_v1.0_20260528.md
```

### Step 2: 确认清单
```markdown
## 待确认信息清单

### 1. 测试案例文档
| 项目 | 内容 |
|------|------|
| 文档路径 | RT-T1-需求池管理-测试案例_v1.0.md |
| 案例总数 | 124 |

### 2. 代码分析范围
| 类型 | 文件 |
|------|------|
| Service | requirements/service.ts |

### 3. 需求文档
请确认是否需要读取 PRD 和用户故事文档？

请确认以上信息，确认后开始分析。
```

### Step 3: 确认后分析
用户确认后，分析并输出策略文档。

## 注意事项

1. **先确认后分析**：必须先输出确认清单，用户确认后再执行分析
2. **多轮询问**：信息不明确时，通过多轮询问澄清
3. **Git 提交范围**：支持 `HEAD~N`、分支名、commit range 等语法
4. **不直接写代码**：只输出策略文档和分析结果
5. **遵循分层原则**：单测是基础，API自动化覆盖业务流程，Playwright串核心旅程
