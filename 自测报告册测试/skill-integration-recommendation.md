# 测试治理 Skills 整合建议

skill的执行顺序是test-strategy-planner->unit-test-governance->补充l2\l3\m测试->test-report-generator。

## 目标

这套测试治理 skills 用于研发提测前和测试准入阶段，把本次需求、代码变更、测试案例、单测门禁、接口自动化、UI 自动化、人工验证证据和最终管理报告串起来。

目标不是让一个 skill 做完所有事情，而是让每一步职责清晰、输入清晰、输出固定，方便研发人员、测试人员、测试经理和项目经理协作。

***

## 真实项目约束

- 前后端通常是两个独立源码仓库。
- 后端以 Java 为主，单测使用 JUnit5，覆盖率使用 JaCoCo。
- 接口自动化以 JMeter 为主，可以在独立测试资产仓库。
- 前端使用 React 或 Vue3。
- 后端单测硬门禁：增量覆盖率 > 80%，通过率 100%。
- L2 API、L3 UI、人工验证、集成测试、前端测试都不能抵扣后端单测门禁。
- 前端默认没有单测硬门禁；只有可隔离复杂逻辑才触发前端单测建议。
- UI 自动化不放弃，但只覆盖 P0/P1 主路径、高风险权限显隐、核心跳转和关键表单提交。
- 低风险 UI 展示、文案、截图类验收可以用 SIT 人工验证替代，但必须留 evidence。
- **Vitest Coverage Report 不作为独立输入**，覆盖率数据由 `unit-test-governance` 报告直接提供。

***

## 推荐流水线（已验证）

```text
test-strategy-planner
  -> unit-test-governance
  -> 补充 L2/L3/M 测试（前后端研发人员自己补充测试）
  -> test-report-generator
```

**执行顺序是硬约束，不可跳步。**

### 各步骤说明

| 步骤 | Skill/动作                | 职责                                    | 产出                      |
| -- | ----------------------- | ------------------------------------- | ----------------------- |
| 1  | `test-strategy-planner` | 基于需求和代码变更做 L1/L2/L3/M 分层测试策略分析        | 测试策略报告、测试案例测试方式对照表      |
| 2  | `unit-test-governance`  | 后端 L1 单测硬门禁检查                         | 单测治理报告（覆盖率、通过率、需补充单测清单） |
| 3  | **人工补充测试**              | 前后端研发人员根据策略报告补充 L2 API、L3 UI、M 人工验证测试 | API/UI测试执行结果、人工验证证据     |
| 4  | `test-report-generator` | 聚合 L1 门禁结论 + L2/L3/M 测试执行结果，生成自测报告    | 自测报告                    |

***

## 测试治理 Skills（实际使用）

| Skill                   | 定位                                  | 默认执行人         | 审核人           | 输出                                                                                         |
| ----------------------- | ----------------------------------- | ------------- | ------------- | ------------------------------------------------------------------------------------------ |
| `test-strategy-planner` | 基于需求和代码变更做 L1/L2/L3/M 分层测试策略分析      | 研发人员 / 测试人员   | 测试负责人 + 研发负责人 | `reports/test-strategy/requirement-{scope}-测试策略与覆盖分析.md`、`appendix-{scope}-测试案例测试方式对照表.md` |
| `unit-test-governance`  | 后端 L1 单测硬门禁；检查自测检查点 L1 覆盖；输出需补充单测清单 | 后端开发          | 研发负责人 + 测试负责人 | `reports/unit-test-governance/requirement-{scope}-unit-test-governance.md`                 |
| `test-report-generator` | 聚合 L1 门禁结论 + L2/L3/M 测试执行结果，生成自测报告  | 研发负责人 / 测试负责人 | 测试负责人 / 测试经理  | `reports/test-report/RT-{scope}-自测报告_v{版本}_{日期}.md`                                        |

### 各 Skill 输入输出规范

#### 1. test-strategy-planner

**输入**：

- 需求文档、设计文档、测试案例文档
- 代码变更范围（分支/commit/指定文件）
- 自测检查点（可选）

**输出**：

- `reports/test-strategy/requirement-{scope}-测试策略与覆盖分析.md` — 分层测试策略报告
- `reports/test-strategy/appendix-{scope}-测试案例测试方式对照表.md` — 测试案例编号、测试方式、覆盖逻辑对照表

**关键规则**：

- 代码范围可以是 feature 分支和主分支的差异、指定 commit、指定代码文件
- 不允许全量代码分析
- 输入需要用户确认，未提供的需要提问
- 输出中重点提取 L1 策略的案例，检查是否覆盖
- 后端单测门禁规则：增量覆盖率 > 80%，通过率 100%
- 不复用旧报告时，需重新分析

#### 2. unit-test-governance

**输入**：

- `test-strategy-planner` 的输出报告（`requirement-{scope}-测试策略与覆盖分析.md`）
- 代码范围和测试文件（需用户确认）

**输出**：

- `reports/unit-test-governance/requirement-{scope}-unit-test-governance.md` — 单测治理报告

**关键规则**：

- 代码范围和测试文件要让用户先确认后再分析
- 输出包含：单测门禁摘要、自测检查点 L1 覆盖现状、需补充单测清单、最终决策
- 需补充单测清单 = 测试策略报告中的 L1 缺口 + 代码变更中未覆盖的逻辑 + 自测检查点未覆盖项
- 后端增量覆盖率 > 80%、通过率 100% 为硬门禁
- 只有三个状态：✅ 通过 / ⚠️ 有条件通过 / ❌ 不通过

#### 3. test-report-generator

**输入**（必须先确认再分析）：

- 测试策略报告：`reports/test-strategy/requirement-{scope}-测试策略与覆盖分析.md`
- 单测治理报告：`reports/unit-test-governance/requirement-{scope}-unit-test-governance.md`
- 策略对照表附件：`reports/test-strategy/appendix-{scope}-测试案例测试方式对照表.md`
- L2 API 测试文件（自动检索或用户指定）
- L3 UI 测试文件（自动检索或用户指定）
- 人工测试证据目录：`evidence/{scope}/`（自动检索或用户指定）

**输出**：

- `reports/test-report/RT-{scope}-自测报告_v{版本}_{日期}.md`

**关键规则**：

- L1 单元测试结论直接引用 `unit-test-governance` 报告
- L2/L3/M 测试重新分析，基于最新测试执行结果
- "自测检查点覆盖摘要"放在"测试结果明细"之后
- L2/L3/M 检查点根据测试分析结果判定覆盖状态

***

## 谁来执行

| Skill/动作                | 执行人           | 原因                                             |
| ----------------------- | ------------- | ---------------------------------------------- |
| `test-strategy-planner` | 研发负责人 / 测试人员  | 需要结合需求、代码和测试资产做策略分析                            |
| `unit-test-governance`  | 后端研发人员        | 需要确认代码变更范围和单测覆盖                                |
| **补充 L2/L3/M 测试**       | 前后端研发人员       | 后端开发补充 L2 API 测试，前端开发补充 L3 UI 测试，测试人员执行 M 人工验证 |
| `test-report-generator` | 研发负责人 / 测试负责人 | 需要汇总所有测试证据                                     |

### 输入清单填写分工

| 输入清单                                 | 填写人           |
| ------------------------------------ | ------------- |
| 需求范围、用户故事、纳入/不纳入内容                   | 产品 / 项目经理     |
| 后端仓库、分支、commit、影响模块/API、单测和覆盖率报告     | 后端开发          |
| 前端仓库、分支、commit、影响页面/路由、UI 自动化或前端测试结果 | 前端开发          |
| 测试案例、测试环境、测试账号、人工验证口径                | 测试人员          |
| 既有报告清单和缺项责任人                         | 研发负责人 / 提测负责人 |

***

## 项目配置文件

由于每个项目技术栈和目录结构不同，所有需要检索的文件路径应提取到公共配置文件中，各 skill 统一读取配置，避免硬编码。

### 配置文件位置

```text
工作区/
  config/
    project-config.yaml          # 项目配置文件（各 skill 统一读取）
```

### 配置文件结构

```yaml
project:
  name: 版本火车需求管理系统
  scope: T2-US2.3

tech_stack:
  backend: nodejs-typescript
  frontend: react-vite
  unit_test: vitest
  api_test: vitest-fastify
  ui_test: playwright
  database: postgresql

paths:
  # 后端源码路径
  backend:
    root: release-train/apps/server
    src: release-train/apps/server/src
    unit_tests:
      - release-train/apps/server/src/modules/**/*.unit.test.ts
    api_tests:
      - release-train/apps/server/src/__tests__/*.api.test.ts
      - release-train/apps/server/src/__tests__/*-test.ts
    coverage_report: release-train/apps/server/coverage

  # 前端源码路径
  frontend:
    root: release-train/apps/web
    src: release-train/apps/web/src
    ui_tests:
      - release-train/apps/web/tests/e2e/*.test.ts
    test_results: release-train/apps/web/test-results
    unit_tests:
      - release-train/apps/web/src/**/*.test.ts

  # 测试治理产物路径
  governance:
    reports: reports
    evidence: evidence
    test_strategy: reports/test-strategy
    unit_test_governance: reports/unit-test-governance
    test_report: reports/test-report

  # 需求文档路径
  docs:
    requirements: 03-需求与设计
    test_cases: 03-需求与设计/Task2-版本火车管理/测试案例

commands:
  # 测试执行命令
  backend_unit_test: cd release-train/apps/server && npx vitest run
  backend_api_test: cd release-train/apps/server && npx vitest run src/__tests__
  frontend_ui_test: cd release-train/apps/web && npx playwright test
  frontend_dev: cd release-train/apps/web && pnpm dev
  backend_dev: cd release-train/apps/server && pnpm dev

patterns:
  # 文件检索模式（支持 glob）
  unit_test_files: "**/*.unit.test.ts"
  api_test_files: "**/*.api.test.ts"
  ui_test_files: "**/tests/e2e/*.test.ts"
  test_case_files: "**/*测试案例*.md"
  design_docs: "**/*详细设计*.md"

report_naming:
  # 报告文件名模板
  test_strategy: "requirement-{scope}-测试策略与覆盖分析.md"
  test_strategy_appendix: "appendix-{scope}-测试案例测试方式对照表.md"
  unit_test_governance: "requirement-{scope}-unit-test-governance.md"
  test_report: "RT-{scope}-自测报告_v{version}_{date}.md"
```

### 配置项说明

| 配置项                        | 说明                  | 示例                                             |
| -------------------------- | ------------------- | ---------------------------------------------- |
| `tech_stack.backend`       | 后端技术栈               | `nodejs-typescript`、`java-springboot`、`go-gin` |
| `tech_stack.unit_test`     | 单元测试框架              | `vitest`、`jest`、`junit5`、`go-test`             |
| `paths.backend.unit_tests` | L1 单元测试文件路径列表（支持多个） | `["**/*.unit.test.ts"]`                        |
| `paths.backend.api_tests`  | L2 API 测试文件路径列表     | `["**/__tests__/*.api.test.ts"]`               |
| `paths.frontend.ui_tests`  | L3 UI 测试文件路径列表      | `["**/tests/e2e/*.test.ts"]`                   |
| `paths.governance.*`       | 测试治理报告输出目录          | `reports/test-strategy`                        |
| `commands.*`               | 测试执行命令（供 skill 调用）  | `cd apps/server && npx vitest run`             |
| `patterns.*`               | 文件检索 glob 模式        | `**/*.unit.test.ts`                            |
| `report_naming.*`          | 报告文件名模板             | `requirement-{scope}-测试策略与覆盖分析.md`             |

### 各 Skill 配置使用规范

| Skill                   | 使用的配置项                                                                                | 用途                      |
| ----------------------- | ------------------------------------------------------------------------------------- | ----------------------- |
| `test-strategy-planner` | `paths.docs`、`patterns.test_case_files`、`patterns.design_docs`                        | 检索需求文档和测试案例             |
| `unit-test-governance`  | `paths.backend.unit_tests`、`commands.backend_unit_test`                               | 定位单测文件、执行单测             |
| `test-report-generator` | `paths.backend.api_tests`、`paths.frontend.ui_tests`、`paths.governance.*`、`commands.*` | 检索 L2/L3 测试文件、执行测试、输出报告 |

### 多技术栈配置示例

**Java Spring Boot 项目**：

```yaml
tech_stack:
  backend: java-springboot
  unit_test: junit5
  api_test: jmeter
  database: mysql

paths:
  backend:
    root: backend
    src: backend/src/main/java
    unit_tests:
      - backend/src/test/java/**/*Test.java
    coverage_report: backend/target/jacoco-report
```

**Go 项目**：

```yaml
tech_stack:
  backend: go-gin
  unit_test: go-test
  api_test: httptest

paths:
  backend:
    root: backend
    src: backend
    unit_tests:
      - backend/**/*_test.go
```

***

## 多仓库目录建议

治理工作区可以和源码仓库并行，不要把所有测试治理产物塞进前端或后端仓库。多仓库场景下，测试治理工作区作为独立空间，通过配置文件引用各源码仓库。

### 多仓库目录结构

```text
test-governance-workspace/
  .agents/
    skills/                     # 测试治理 skills（共享）
  config/
    project-config.yaml          # 项目配置文件（引用各仓库路径）
  reports/
    test-strategy/              # test-strategy-planner 输出
      requirement-{scope}-测试策略与覆盖分析.md
      appendix-{scope}-测试案例测试方式对照表.md
    unit-test-governance/       # unit-test-governance 输出
      requirement-{scope}-unit-test-governance.md
    test-report/                # test-report-generator 输出
      RT-{scope}-自测报告_v{版本}_{日期}.md
  evidence/                     # SIT 人工验证证据（集中管理）
    {scope}/
      summary.md
      screenshots/
      api/
      logs/
  repos/                        # 源码仓库引用（只读扫描）
    backend/                    # 后端源码仓库
    frontend/                   # 前端源码仓库
    test-assets/                # JMeter、跨系统 Playwright、测试数据模板，可选
    docs/                       # 需求、设计、测试案例，可选
```

### 多仓库配置示例

```yaml
paths:
  # 多仓库路径配置
  repos:
    backend:
      root: repos/backend
      src: repos/backend/src
      unit_tests:
        - repos/backend/src/**/*.unit.test.ts
      api_tests:
        - repos/backend/src/__tests__/*.api.test.ts
      coverage_report: repos/backend/coverage

    frontend:
      root: repos/frontend
      src: repos/frontend/src
      ui_tests:
        - repos/frontend/tests/e2e/*.test.ts
      test_results: repos/frontend/test-results

    test_assets:
      root: repos/test-assets
      jmeter: repos/test-assets/jmeter
      playwright: repos/test-assets/playwright
      data: repos/test-assets/data

    docs:
      root: repos/docs
      requirements: repos/docs/requirements
      test_cases: repos/docs/test-cases
      design: repos/docs/design

commands:
  backend_unit_test: cd repos/backend && npx vitest run
  backend_api_test: cd repos/backend && npx vitest run src/__tests__
  frontend_ui_test: cd repos/frontend && npx playwright test
```

### 源码仓库内部建议

| 类型               | 建议位置         | 说明                  |
| ---------------- | ------------ | ------------------- |
| 后端单元测试           | 后端源码仓库       | 和业务代码强耦合，参与后端 CI    |
| 前端组件/逻辑单测        | 前端源码仓库       | 仅在复杂可隔离逻辑触发时建议      |
| 单前端应用 Playwright | 前端源码仓库优先     | 主要验证当前前端应用核心旅程      |
| 跨系统 Playwright   | 独立测试资产仓库优先   | 跨多个前端、后端或外部系统       |
| JMeter 接口自动化     | 独立测试资产仓库优先   | 便于维护环境变量、测试数据和跨服务链路 |
| SIT/UAT 人工证据     | 治理工作区或测试资产仓库 | 保存截图、日志、接口证据，不污染源码  |
| 测试治理报告           | 治理工作区        | 面向项目和测试管理           |

***

## 目录结构建议

```text
工作区/
  .agents/
    skills/                     # 测试治理 skills
  reports/
    test-strategy/              # test-strategy-planner 输出
      requirement-{scope}-测试策略与覆盖分析.md
      appendix-{scope}-测试案例测试方式对照表.md
    unit-test-governance/       # unit-test-governance 输出
      requirement-{scope}-unit-test-governance.md
    test-report/                # test-report-generator 输出
      RT-{scope}-自测报告_v{版本}_{日期}.md
  evidence/                     # SIT 人工验证证据
    {scope}/
      summary.md
      screenshots/
      api/
      logs/
  release-train/                # 源码仓库（示例）
    apps/
      server/                   # 后端源码
        src/
          __tests__/            # L2 API 测试
          modules/trains/services/
            *.unit.test.ts      # L1 单元测试
      web/                      # 前端源码
        tests/
          e2e/                  # L3 UI 自动化测试
        test-results/           # Playwright 测试结果
```

***

## 分析粒度

默认按用户故事拆分。一个 Task 经常有几千行代码和多个验收点，不应直接作为一个分析单元。

拆分顺序：

1. Task / 大需求 -> 用户故事
2. 用户故事仍过大 -> 验收点或测试案例组
3. 后端范围 -> API 组、service/module、变更方法组
4. 前端范围 -> 页面路由、用户流程、组件组
5. 超大文件 -> diff、变更方法/组件、附近上下文

建议阈值：

| 输入类型                | 处理建议            |
| ------------------- | --------------- |
| 单个分析单元相关代码文件 > 20 个 | 暂停并拆分           |
| 单个代码文件 <= 800 行     | 可按需整文件读取        |
| 单个代码文件 800-1200 行   | 先读结构和 diff      |
| 单个代码文件 > 1200 行     | 只读变更方法/组件和附近上下文 |
| 需求或测试案例文档 > 2000 行  | 按用户故事、验收点或案例组拆分 |

***

## 分层策略

| 层级             | 适用内容                                               | 工具                      | 产物                            |
| -------------- | -------------------------------------------------- | ----------------------- | ----------------------------- |
| **L1 后端单测**    | 业务规则、状态流转、参数校验、异常分支、幂等性、事务处理、分页/排序/聚合、service 分支   | Vitest                  | `unit-test-governance` 报告     |
| **L1 前端单测建议**  | 表单校验、权限显隐、分页排序筛选、金额/日期计算、hook/composable、工具函数、状态管理 | Vitest                  | 写入 unit-gate 建议，不作为默认硬门禁      |
| **L2 API 自动化** | 接口契约、鉴权、入参校验、关键状态变化、错误码、幂等、分页、排序                   | Vitest + Fastify inject | API 测试文件执行结果                  |
| **L3 UI 自动化**  | P0/P1 用户流程、关键页面跳转、核心按钮、跨页面联动、权限按钮显隐                | Playwright              | Playwright 测试结果 + 截图          |
| **M 人工验证**     | 低频 UI 展示、SIT 截图、日志证据、需人工判断的业务状态、GAP 项              | SIT 环境 + 截图             | `evidence/{scope}/summary.md` |

***

## 后端单测门禁（硬约束）

```text
后端增量单测覆盖率 > 80%
后端单测通过率 = 100%
```

**规则**：

- 必须单独展示，且不能被 L2/L3/人工验证抵扣
- 如果没有覆盖率报告或单测执行结果，只能写"阻塞/待补"，不能写通过
- 只有三个状态：✅ 通过 / ⚠️ 有条件通过 / ❌ 不通过
- 需补充单测清单 = 测试策略报告中的 L1 缺口 + 代码变更中未覆盖的逻辑 + 自测检查点未覆盖项

***

## 前端单测口径

前端不默认要求单测覆盖率门禁。建议只在这些情况补前端单测：

- 表单校验、字段格式化
- 权限显隐、按钮状态
- 分页、排序、筛选
- 金额、日期、数量计算
- React hook、工具函数、状态管理

纯展示、简单表格、普通弹窗、文案展示，优先走 L3 UI 或人工验证。

***

## 自测检查点

自测检查点用于补充测试案例的覆盖缺口，按优先级分类：

| 优先级 | 含义            | 覆盖率要求      |
| --- | ------------- | ---------- |
| P0  | 核心功能、安全、数据一致性 | 必须 100% 覆盖 |
| P1  | 重要功能、边界条件     | 建议覆盖       |
| P2  | 一般功能、次要场景     | 可选择性覆盖     |

常见检查点类别：

- **交互类**：按钮 loading、重复提交、二次确认
- **管理类**：权限显隐、角色按钮、状态流转
- **事务类**：事务回滚、中间状态、补偿操作
- **数据类**：分页边界、参数校验、索引命中
- **安全类**：幂等性、越权防护、认证校验
- **性能类**：最大记录数限制、超时处理

***

## 人工验证证据

只有用户确认要人工验证时，才创建轻量证据包：

```text
evidence/{scope}/
  summary.md
  screenshots/
  api/
  logs/
```

**规则**：

- 默认不创建 `db/`，也不要求数据库地址或账号密码
- 只有资金、支付、退款、结算、库存、容量、关键状态、审计合规、异步最终一致性等场景，才要求人工补充脱敏 DB 前后截图
- 人工步骤应控制在 3 到 5 步：操作、截图、保存接口/网络证据、保存日志、必要时保存 DB 脱敏截图

**证据创建时机**：在 `test-strategy-planner` 识别出 GAP 项或低风险展示类场景后，由测试人员在 SIT 环境执行验证时创建。

***

## 人工审核节点

| 节点          | 是否必须审核  | 主责人                | 审核内容                              |
| ----------- | ------- | ------------------ | --------------------------------- |
| 输入清单完整性     | 必须      | 研发负责人 / 提测负责人      | 需求范围、前后端代码范围、测试案例、既有报告是否齐全        |
| 测试策略确认      | 必须      | 研发负责人 / 测试人员       | L1/L2/L3/M 策略是否合理，覆盖是否充分          |
| 后端 L1 单测门禁  | 必须      | 后端开发 / 后端负责人       | 覆盖率是否 > 80%，通过率是否 100%，未覆盖风险是否可接受 |
| L2 API 覆盖结论 | 建议必须    | 后端开发 / API 自动化测试人员 | 接口契约、鉴权、参数、状态流转、失败项               |
| L3 UI 自动化取舍 | 必须      | 前端开发 / UI 自动化测试人员  | 哪些主路径必须自动化，哪些允许人工验证               |
| 人工验证证据      | 用户启用时必须 | 研发人员 / 测试人员        | summary、截图、日志、接口证据是否完整            |
| 最终自测报告      | 必须      | 测试经理               | 是否可提测/上线，风险接受人是否明确                |

***

## 最终报告口径

`test-report-generator` 只聚合上游证据，不重新计算、不编造结果。

最终报告必须让项目经理或测试经理看出：

- 本次需求和用户故事覆盖到了哪里
- 代码变更对应的 L1/L2/L3/M 证据在哪里
- 后端单测门禁是否通过
- API/UI/人工验证是否覆盖关键路径
- 自测检查点覆盖状态（双报告整合）
- 未覆盖风险是什么，谁接受
- 最终建议是可提测、有条件提测、不建议提测、可上线或不建议上线

***

## 报告文件命名规范

| 报告类型                      | 文件名模式                                                                      | 示例                                              |
| ------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------- |
| test-strategy-planner 主报告 | `reports/test-strategy/requirement-{scope}-测试策略与覆盖分析.md`                   | `requirement-T2-US2.3-班次列表查询与火车切换-测试策略与覆盖分析.md` |
| test-strategy-planner 对照表 | `reports/test-strategy/appendix-{scope}-测试案例测试方式对照表.md`                    | `appendix-T2-US2.3-班次列表查询与火车切换-测试案例测试方式对照表.md`  |
| unit-test-governance      | `reports/unit-test-governance/requirement-{scope}-unit-test-governance.md` | `requirement-T2-US2.3-unit-test-governance.md`  |
| test-report-generator     | `reports/test-report/RT-{scope}-自测报告_v{版本}_{日期}.md`                        | `RT-T2-US2.3-自测报告_v1.0_20260630.md`             |

***

## 版本记录

| 版本   | 日期         | 变更内容                                                                                         |
| ---- | ---------- | -------------------------------------------------------------------------------------------- |
| v1.0 | 2026-05-XX | 初始版本                                                                                         |
| v1.1 | 2026-06-30 | 基于实际验证流程更新：明确 4 步流水线、移除 testgov 系列 skill、移除 Vitest Coverage Report、补充各 skill 输入输出规范、新增报告命名规范 |
| v1.2 | 2026-06-30 | 新增项目配置文件章节（project-config.yaml）、新增多仓库目录建议章节、补充人工验证证据创建时机说明                                   |
| v1.3 | 2026-06-30 | 更新推荐流水线：明确步骤3"补充 L2/L3/M 测试"由前后端研发人员自己完成；新增各步骤说明表格；更新"谁来执行"表格                                |

