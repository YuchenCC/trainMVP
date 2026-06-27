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

### Step 0: 需求澄清（多轮询问）

如果信息不明确，通过多轮询问确认：

```
询问 1: "请确认测试策略文档路径"
       - 如果用户提供路径，直接读取
       - 如果用户模糊描述，列出目录下匹配的 *测试策略*.md 文件供选择

询问 2: "请确认测试案例文档路径"
       - 如果用户提供路径，直接读取
       - 如果用户模糊描述，列出目录下匹配的 .md 文件供选择

询问 3: "请指定代码分析范围"
       - 可指定文件：service.ts、index.ts、特定函数
       - 如果不确定，列出该 Task 下所有 service.ts 文件
```

### Step 1: 收集测试数据

自动查找以下数据来源：

```
1. Vitest Coverage Report
   ├── coverage/.tmp/coverage-*.json （覆盖率数据）
   ├── coverage/coverage-final.json （覆盖率数据）
   └── coverage/index.html          （HTML报告）

2. Vitest Test Results
   └── 运行 vitest --coverage 的命令输出

3. Playwright Report（如果存在）
   ├── playwright-report/index.html （HTML报告）
   ├── test-results/**/*.png         （截图）
   └── test-results/**/*.webm        （视频）

4. Git 分支信息
   ├── 当前分支名
   ├── 当前Commit
   └── 相对于 main 的变更文件

5. 测试策略文档
   └── RT-T*-分层测试策略_*.md

6. 测试案例文档
   └── RT-T*-测试案例_*.md
```

### Step 2: 输出确认清单

分析前输出以下清单，一次性确认：

```markdown
## 待确认信息清单

### 1. 测试策略文档
| 项目 | 内容 |
|------|------|
| 文档路径 | RT-T1-需求池管理-分层测试策略_v1.0.md |

### 2. 测试案例文档
| 项目 | 内容 |
|------|------|
| 文档路径 | RT-T1-需求池管理-测试案例_v1.0.md |
| 案例总数 | 124 |

### 3. 代码分析范围
| 类型 | 文件 | 说明 |
|------|------|------|
| Service | requirements/service.ts | 需求 CRUD 逻辑 |

### 4. 数据来源
| 数据类型 | 路径 | 状态 |
|----------|------|------|
| Coverage JSON | coverage/coverage-final.json | ✅ 存在 |
| Coverage HTML | coverage/index.html | ✅ 存在 |
| Playwright Report | playwright-report/index.html | ⚠️ 未找到 |

请确认以上信息，确认后生成报告。
```

### Step 3: 生成报告

用户确认后，生成以下报告文件：

**报告文件名规范**：
```
RT-{TaskName}-自测报告_{版本}_{日期}.md
```

**报告内容结构**：

```markdown
# 版本火车 - 自测报告

## 基本信息
| 项目 | 内容 |
|------|------|
| 报告编号 | RT-TEST-20260626-001 |
| 生成时间 | 2026-06-26 15:30:00 |
| 执行环境 | Node.js v22.22.2 / macOS |
| Git 分支/Commit | feature/task1@abc123 |
| 测试人员 | 当前用户 |

## 测试策略概览
本次测试基于 **Task 1: 需求池管理 - 分层测试策略**，采用三层叠加覆盖策略：

| 层级 | 工具 | 覆盖范围 |
|------|------|---------|
| L1 单元测试 | Vitest | service.ts 纯函数、校验逻辑 |
| L2 接口自动化 | Vitest + Supertest | API 请求/响应、状态流转 |
| L3 Playwright | Playwright | 关键用户旅程、UI 交互 |

### 覆盖率目标
| 指标 | 目标值 |
|------|-------|
| 增量覆盖率 | ≥80% |

## 分支变更范围
当前分支 `feature/task1` 相对于 `main`（merge-base: abc1234）的变更文件：

### modules/requirements
- service.ts
- index.ts

### 变更文件覆盖率（增量覆盖率）
| 指标 | 值 | 目标 | 状态 |
|------|-----|------|------|
| 语句覆盖率 | 85.3% | ≥80% | ✅ |

## 测试范围
本次测试覆盖以下模块：

### common
- 文件数: 9

### modules
- 文件数: 24

## L1 单元测试覆盖情况

### 策略要求覆盖的函数
| 函数名 | 行号 | 复杂度 | 优先级 | 覆盖状态 |
|--------|------|--------|--------|---------|
| `sanitizeDescription` | 63-65 | 低 | P0 | ✅ |

## 执行概要
| 指标 | 值 | 状态 |
|------|-----|------|
| 总测试数 | 156 | ✅ |
| 通过数 | 156 | ✅ |
| 失败数 | 0 | ✅ |
| 通过率 | 100% | ✅ |

## 覆盖率报告
### 总体覆盖率
| 指标 | 值 | 目标 | 状态 |
|------|-----|------|------|
| 语句覆盖率 | 85.3% | ≥80% | ✅ |
| 分支覆盖率 | 78.2% | ≥70% | ✅ |
| 函数覆盖率 | 92.1% | ≥85% | ✅ |

### 模块覆盖率明细
| 文件 | 语句% | 分支% | 函数% |
|------|-------|-------|-------|
| service.ts | 88.5% | 82.3% | 95.0% |

## 测试结果明细
### US1.1 需求录入
| 案例 | 测试方式 | 结果 |
|------|---------|------|
| TC1.1.1 | L2 API自动化 | ✅ 通过 |

## 失败测试说明
| 序号 | 测试模块 | 失败数量 | 原因 |
|------|---------|---------|------|

## 结论
✅ 自测通过，覆盖率达标，可提交代码审查。
```

## 数据提取规则

### 覆盖率数据提取

从 `coverage/.tmp/coverage-*.json` 或 `coverage/coverage-final.json` 中提取：
- 总体覆盖率（statements, branches, functions）
- 指定文件的覆盖率明细
- 未覆盖的行号

### 测试结果提取

从 vitest 命令输出中提取：
- 通过/失败数量
- 每个测试的耗时
- 失败测试的错误信息

### 分支变更范围提取

通过 Git 命令提取：
```bash
git merge-base main HEAD          # 获取合并基准
git diff --name-only <base> HEAD  # 获取变更文件
```

### 测试策略解析

从分层测试策略文档中解析：
- 策略标题
- L1 单元测试覆盖的函数清单
- L2 接口自动化覆盖的 API 清单
- 覆盖率目标

### Playwright 截图提取

从 `playwright-report/test-results/` 中提取：
- 关键步骤截图
- 失败测试的截图
- 视频录制文件路径

## 环境配置要求

### Vitest 配置

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'clover'],
      reportsDirectory: 'coverage',
    },
  },
});
```

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
RT-{TaskName}-自测报告_{版本}_{日期}.md
```

## 扩展能力

- 支持结合测试策略文档生成分层报告
- 支持基于分支变更范围计算增量覆盖率
- 支持指定多个模块的测试报告
- 支持对比两次测试的覆盖率变化
- 支持生成 PDF 格式报告（需安装 puppeteer）
- 支持发送飞书/钉钉通知

---

*Version 1.2 | 2026-06-27*
