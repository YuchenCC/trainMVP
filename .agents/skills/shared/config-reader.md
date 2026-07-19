# 公共配置读取模块

## 用途

供所有测试治理 skills 统一读取项目配置文件，避免路径、命令、模式等硬编码。

## 配置文件位置

```text
config/project-config.yaml
```

## 读取流程

1. 首先检查 `config/project-config.yaml` 是否存在
2. 如果存在，读取并解析 YAML 内容
3. 如果不存在，使用默认值，并提示用户创建配置文件

## 配置结构

```yaml
project:
  name: 项目名称
  scope: 当前分析范围

tech_stack:
  backend: nodejs-typescript | java-springboot | go-gin
  frontend: react-vite | vue3
  unit_test: vitest | jest | junit5 | go-test
  api_test: vitest-fastify | jmeter
  ui_test: playwright | cypress
  database: postgresql | mysql | sqlite

paths:
  backend:
    root: 后端根目录
    src: 后端源码目录
    unit_tests: 单元测试文件路径列表
    api_tests: API测试文件路径列表
    coverage_report: 覆盖率报告目录

  frontend:
    root: 前端根目录
    src: 前端源码目录
    ui_tests: UI测试文件路径列表
    test_results: 测试结果目录
    unit_tests: 前端单元测试文件路径列表

  governance:
    reports: 报告根目录
    evidence: 人工验证证据目录
    test_strategy: 测试策略报告目录
    unit_test_governance: 单测治理报告目录
    test_report: 自测报告目录

  docs:
    requirements: 需求文档目录
    test_cases: 测试案例目录

commands:
  backend_unit_test: 后端单测执行命令
  backend_api_test: 后端API测试执行命令
  frontend_ui_test: 前端UI测试执行命令
  frontend_dev: 前端开发服务启动命令
  backend_dev: 后端开发服务启动命令

patterns:
  unit_test_files: 单元测试文件检索模式
  api_test_files: API测试文件检索模式
  ui_test_files: UI测试文件检索模式
  test_case_files: 测试案例文件检索模式
  design_docs: 设计文档检索模式

report_naming:
  test_strategy: 测试策略报告命名模板
  test_strategy_appendix: 测试案例对照表命名模板
  unit_test_governance: 单测治理报告命名模板
  test_report: 自测报告命名模板
```

## 使用方式

### 在 Skill 中引用

每个 Skill 在开始分析前，应先读取配置文件：

```markdown
## 配置读取（必须步骤）

1. 检查 `config/project-config.yaml` 是否存在
2. 如果存在，读取配置并使用其中的路径、命令、模式等
3. 如果不存在，使用默认值，并提示用户：
   > "未找到项目配置文件 config/project-config.yaml，请先创建或确认配置文件位置。当前使用默认配置。"

### 配置项使用示例

| Skill | 使用的配置项 | 用途 |
|---|---|---|
| test-strategy-planner | `paths.docs`、`patterns.test_case_files`、`patterns.design_docs` | 检索需求文档和测试案例 |
| unit-test-governance | `paths.backend.unit_tests`、`commands.backend_unit_test` | 定位单测文件、执行单测 |
| test-report-generator | `paths.backend.api_tests`、`paths.frontend.ui_tests`、`paths.governance.*`、`commands.*` | 检索 L2/L3 测试文件、执行测试、输出报告 |
```

## 默认配置

当配置文件不存在时，使用以下默认值：

```yaml
paths:
  docs:
    requirements: 03-需求与设计
    test_cases: 03-需求与设计/**/测试案例

  governance:
    reports: reports
    evidence: evidence
    test_strategy: reports/test-strategy
    unit_test_governance: reports/unit-test-governance
    test_report: reports/test-report

patterns:
  test_case_files: "**/*测试案例*.md"
  design_docs: "**/*详细设计*.md"
```
