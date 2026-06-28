# 测试治理 Skills 整合建议

## 背景

当前项目已有这些测试相关 skills：

- `test-strategy-analyzer`
- `automating-api-testing`
- `test-report-generator`
- `webapp-testing`
- `pentesting-claude-skill`

它们已经覆盖测试策略、API 自动化、测试报告、Web 页面测试和安全测试，但目前更偏示例项目和 Node/Vitest/Playwright 场景。

你的真实研发场景是：

- 前后端分离，前端和后端是两个独立项目。
- 后端使用 Java。
- 后端单测使用 JUnit5。
- 接口自动化测试使用 JMeter。
- 前端使用 React 或 Vue3。
- 项目经理和测试经理需要看到本次需求和代码变更的测试覆盖情况。

因此建议将现有 skills 重组为一套研发测试治理流水线，用来规范研发完成测试，并生成管理层可读的测试覆盖报告。

## 设计原则

1. Skill 不绑定单一项目。Skill 保留流程、规则和报告结构，项目路径、模块名、接口清单、测试命令由实际项目提供。
2. 前后端职责分离。后端单测、接口自动化、前端测试、报告生成拆成不同 skill。
3. 主流程统一，技术细节下沉。主 `SKILL.md` 写流程和判断规则，Java、JMeter、React、Vue3 细节放入 `references/`。
4. 报告面向管理者。报告要回答需求覆盖、代码覆盖、未覆盖风险、是否建议提测或上线。
5. 单测门禁口径独立。`增量覆盖率 > 80%` 和 `通过率 100%` 只适用于单测，不允许用 API、集成、E2E、JMeter、Postman、Playwright 等测试结果替代。

## 建议重组后的 6 个核心 Skill

### 1. `test-strategy-planner`

由现有 `test-strategy-analyzer` 改造而来。

职责：

- 读取需求文档、用户故事、接口清单、代码变更范围。
- 识别本次需求的测试范围。
- 将测试点映射到 L1、L2、L3。
- 输出测试策略和测试方式对照表。

推荐分层：

| 层级 | 名称 | 主要工具 | 覆盖重点 |
|---|---|---|---|
| L1 | 单元测试 | JUnit5 / 前端测试框架 | 业务规则、状态机、校验逻辑、边界条件 |
| L2 | 接口自动化 | JMeter | API 请求响应、权限、参数校验、状态流转、数据库副作用 |
| L3 | 用户旅程测试 | Playwright 或团队现有 E2E 工具 | 前后端联动、核心页面流程、关键用户路径 |

保留现有能力：分层测试思想、测试方式对照表、覆盖率目标、优先级规划。

需要调整：删除对 `service.ts`、Vitest、Supertest 的强绑定，改为支持 Java/JUnit5/JMeter/React/Vue3 的通用规则，并将详细技术栈说明下沉到 references。

### 2. `unit-test-governance`

建议新增，并作为所有前后端单测的统一门禁。

职责：

- 只评估单测，不评估 API、集成、E2E 或 JMeter 测试。
- 判断本次变更哪些逻辑必须补单测，哪些可以排除。
- 搜索工程中已有单测文件，能跑则优先跑最小相关单测。
- 检查单测通过率是否为 100%。
- 检查单测增量覆盖率是否大于 80%。
- 输出缺失单测 TODO 和未覆盖风险。

硬门禁：

```text
单测增量覆盖率 > 80%
单测通过率 = 100%
```

明确不计入单测门禁：

- API 测试。
- 集成测试。
- E2E 测试。
- JMeter / Postman / Newman / Playwright / Cypress 测试。

这些测试可以进入最终测试覆盖报告，但不能替代单测门禁。

### 3. `backend-java-junit-testing`

建议新增。

职责：

- 指导 Java 后端研发补充 JUnit5 单元测试。
- 判断哪些代码必须写单测。
- 规范测试命名、测试数据、Mock 策略、断言要求。
- 支持结合 JaCoCo 生成覆盖率证据。

重点覆盖：

| 类型 | 是否必须覆盖 | 说明 |
|---|---|---|
| 核心业务规则 | 必须 | 状态流转、金额计算、编号生成等 |
| 参数校验 | 必须 | 正常值、空值、非法值、边界值 |
| 异常分支 | 必须 | 业务异常、权限异常、状态异常 |
| 纯工具方法 | 必须 | 输入输出明确，适合单测 |
| 简单 getter/setter | 可不覆盖 | 无业务价值 |
| 第三方 SDK 调用 | 视情况 | 重点 Mock 边界和失败场景 |

建议结构：

```text
backend-java-junit-testing/
  SKILL.md
  references/
    junit5.md
    mockito.md
    spring-boot-test.md
    jacoco.md
    test-data.md
```

### 4. `backend-api-jmeter-testing`

由现有 `automating-api-testing` 改造而来。

职责：

- 规范 JMeter 接口自动化脚本。
- 根据接口清单或 OpenAPI 文档生成接口测试覆盖计划。
- 校验 JMeter 脚本是否覆盖鉴权、参数、异常、状态流转和断言。
- 产出 JMeter 执行结果，供最终报告聚合。

保留现有能力：API 端点识别、成功场景、异常场景、鉴权场景、404、幂等性测试思想、Endpoint coverage matrix。

需要调整：主工具从 Supertest/Postman/REST-assured 收敛到 JMeter，GraphQL 内容作为可选 reference，不放主流程，输出物调整为 `.jmx`、`.jtl`、HTML report、接口覆盖矩阵。

JMeter 脚本最低要求：

| 检查项 | 要求 |
|---|---|
| 线程组 | 按业务场景拆分 |
| 测试数据 | 使用 CSV 或前置脚本管理 |
| 鉴权 | 登录、token 提取、token 传递必须明确 |
| 断言 | 包含状态码、业务码、关键字段断言 |
| 关联 | 上游返回 ID 必须传给下游接口 |
| 清理 | 创建类接口应有清理或隔离策略 |
| 报告 | 必须输出 `.jtl` 和 HTML report |

### 5. `frontend-web-testing`

由现有 `webapp-testing` 改造而来。

职责：

- 规范 React/Vue3 前端测试。
- 覆盖页面状态、组件交互、权限展示、表单校验、接口异常提示。
- 指导核心用户旅程 E2E 测试。

保留现有能力：Playwright 页面交互经验、先侦察页面再执行动作的模式、截图、浏览器日志、动态页面等待策略。

需要调整：从“浏览器自动化工具箱”升级为“前端测试治理 skill”，React 和 Vue3 分别放到 references，强调页面状态覆盖和核心旅程覆盖，不追求所有页面全 E2E。

前端测试重点：

| 类型 | 是否必须覆盖 | 说明 |
|---|---|---|
| 表单校验 | 必须 | 必填、格式、长度、边界值 |
| 权限展示 | 必须 | 按钮、菜单、操作入口显示/隐藏 |
| 接口状态 | 必须 | loading、empty、error、success |
| 核心交互 | 必须 | 搜索、筛选、分页、排序、提交 |
| 核心用户旅程 | 必须 | 涉及前后端联动的主流程 |
| 纯视觉样式 | 视情况 | 可通过截图或人工验收 |

### 6. `test-coverage-report`

由现有 `test-report-generator` 改造而来。

职责：

- 聚合需求、代码变更、单测门禁结果、JUnit5、JaCoCo、JMeter、前端测试、E2E 结果。
- 生成项目经理和测试经理可读的测试覆盖报告。
- 明确未覆盖项和风险。
- 输出是否建议提测、合并或上线。

保留现有能力：Git 分支信息采集、变更文件识别、覆盖率数据提取、测试策略文档解析、分层报告结构。

需要调整：从 Vitest/Playwright 改为多来源数据聚合，增加 JUnit5 XML、JaCoCo、JMeter JTL/HTML report 支持，报告从“自测报告”升级为“测试覆盖报告”。

报告建议命名：

```text
RT-{需求名}-测试覆盖报告_{日期}.md
```

报告必须包含两张核心矩阵。

需求覆盖矩阵：

| 需求点 | 后端代码 | 后端单测 | JMeter 接口用例 | 前端页面/组件 | E2E 旅程 | 覆盖结论 | 风险 |
|---|---|---|---|---|---|---|---|

代码覆盖矩阵：

| 项目 | 变更文件 | 影响功能 | 对应测试 | 执行结果 | 是否覆盖 | 未覆盖原因 | 风险等级 |
|---|---|---|---|---|---|---|---|

## 不建议放入日常主流程的 Skill

`pentesting-claude-skill` 更适合安全专项，而不是每个需求日常测试的默认步骤。

适用场景：上线前安全审查、高风险模块安全测试、认证授权支付敏感数据模块专项、OWASP Top 10 检查。

建议重命名为：

```text
security-testing-specialist
```

## 推荐落地顺序

### 第一阶段：最小闭环

优先完成：

1. `test-strategy-planner`
2. `unit-test-governance`
3. `backend-java-junit-testing`
4. `test-coverage-report`

目标：能基于需求和后端代码变更生成测试策略，指导 Java 后端研发补 JUnit5 单测，并生成面向项目经理/测试经理的测试覆盖报告。

### 第二阶段：接口自动化

完善 `backend-api-jmeter-testing`，规范 JMeter 脚本结构，聚合 JMeter 执行结果，将接口覆盖情况纳入最终报告。

### 第三阶段：前端测试

完善 `frontend-web-testing`，支持 React/Vue3 页面测试规范，将前端页面状态和核心用户旅程纳入最终报告。

### 第四阶段：安全专项

保留并重命名 `pentesting-claude-skill -> security-testing-specialist`，用于高风险模块或上线前安全专项。

## 建议目录结构

```text
.agents/skills/
  test-strategy-planner/
    SKILL.md
    references/
      layered-testing.md
      requirement-code-test-matrix.md

  unit-test-governance/
    SKILL.md
    references/
      coverage-rules.md
      risk-classification.md
      output-template.md

  backend-java-junit-testing/
    SKILL.md
    references/
      junit5.md
      mockito.md
      spring-boot-test.md
      jacoco.md
      test-data.md

  backend-api-jmeter-testing/
    SKILL.md
    references/
      jmeter-script-standard.md
      jmeter-assertions.md
      jmeter-auth-correlation.md
      jmeter-report-format.md

  frontend-web-testing/
    SKILL.md
    references/
      react.md
      vue3.md
      e2e-core-journeys.md
      frontend-test-matrix.md

  test-coverage-report/
    SKILL.md
    scripts/
      collect-junit-jacoco.py
      collect-jmeter-report.py
      collect-frontend-test.py
      generate-test-coverage-report.py
    references/
      manager-report-template.md
      coverage-calculation-rules.md

  security-testing-specialist/
    SKILL.md
    references/
      owasp-top10.md
      security-report-template.md
```

## 推荐研发使用流程

1. 开发前使用 `test-strategy-planner`，输出测试策略、测试方式对照表、覆盖目标。
2. 单测设计和门禁检查使用 `unit-test-governance`，只检查单测增量覆盖率和单测通过率。
3. 后端开发中使用 `backend-java-junit-testing`，输出 JUnit5 单测建议、必测函数或分支清单。
4. 接口自动化阶段使用 `backend-api-jmeter-testing`，输出 JMeter 测试场景、接口覆盖矩阵、执行报告。
5. 前端开发中使用 `frontend-web-testing`，输出页面状态、组件交互、核心用户旅程测试清单。
6. 提测或合并前使用 `test-coverage-report`，输出需求覆盖矩阵、代码覆盖矩阵、未覆盖风险和提测建议。

## 报告结论建议分级

| 结论 | 含义 | 建议 |
|---|---|---|
| 可提测 | 核心需求和关键代码均有测试覆盖，未覆盖风险低 | 可进入测试阶段 |
| 有条件提测 | 存在少量未覆盖项，但风险可接受 | 标记风险并补充人工验证 |
| 不建议提测 | 核心需求或高风险代码缺少测试覆盖 | 补齐测试后再提测 |
| 可上线 | 自动化和人工验证均通过，遗留风险可接受 | 可进入发布流程 |
| 不建议上线 | 存在高风险未覆盖项或关键测试失败 | 阻断上线 |

## 当前仓库优先处理事项

### 1. 修复中文编码问题

当前部分 `SKILL.md` 和 `SKILLS-GUIDE.md` 中中文显示为乱码，会影响人员阅读、AI 理解、skill 触发和执行质量。建议统一修复为 UTF-8。

### 2. 删除或下沉过长说明

部分 skill 内容较长，建议把详细示例下沉到 `references/`，主 `SKILL.md` 保持精简。

### 3. 统一命名

| 当前名称 | 建议名称 |
|---|---|
| `test-strategy-analyzer` | `test-strategy-planner` |
| `automating-api-testing` | `backend-api-jmeter-testing` |
| `webapp-testing` | `frontend-web-testing` |
| `test-report-generator` | `test-coverage-report` |
| `pentesting-claude-skill` | `security-testing-specialist` |

## 最小可执行版本

如果只做一个最小版本，建议先实现：

```text
test-strategy-planner
unit-test-governance
backend-java-junit-testing
test-coverage-report
```

这三个 skill 能形成最小闭环：

```text
需求和代码变更
  -> 测试策略
  -> 单测门禁检查
  -> 后端单测规范
  -> 覆盖报告
  -> 提测判断
```

后续再逐步补齐：

```text
JMeter 接口自动化
React/Vue3 前端测试
安全专项测试
```

---

## 补充：`test-strategy-planner` 细化建议

### 定位

`test-strategy-planner` 是测试治理流水线的入口 skill。它不负责执行单测、不负责计算覆盖率、不负责生成最终提测报告，而是负责把“需求 + 代码变更”拆成清晰的测试范围和测试分层策略。

它的输出应作为后续 skill 的输入：

```text
需求 / 用户故事 / 代码变更
  -> test-strategy-planner 输出测试策略
  -> unit-test-governance 检查单测门禁
  -> backend-java-junit-testing 指导后端单测实现
  -> backend-api-jmeter-testing 规划接口自动化
  -> frontend-web-testing 规划前端页面和用户旅程测试
  -> test-coverage-report 汇总成管理层报告
```

### 不建议沿用旧 `test-strategy-analyzer` 的点

当前旧 skill 更像示例项目分析器，存在三个问题：

| 问题 | 影响 | 调整建议 |
|---|---|---|
| 中文内容乱码 | 人读和 AI 理解都会受影响 | 重写为 UTF-8 中文文档 |
| 绑定 `service.ts / Vitest / Supertest / Playwright` | 不适合真实前后端分离、Java/JUnit5/JMeter 场景 | 改成技术中立的分层策略，技术细节放 references |
| 输出偏测试用例分类 | 不能很好衔接后续单测门禁和最终报告 | 输出需求覆盖矩阵、代码影响矩阵、后续 skill 调用建议 |

### 应该读取的输入

| 输入 | 是否必需 | 说明 |
|---|---|---|
| 需求文档 / 用户故事 | 必需 | 用来识别业务范围和验收点 |
| 代码变更范围 | 必需 | commit、commit range、分支、文件列表均可 |
| 接口清单 / OpenAPI / Controller | 可选但推荐 | 用来规划 JMeter 接口自动化 |
| 前端页面或路由清单 | 可选 | 用来规划 React/Vue 页面测试和 E2E |
| 现有测试文件 | 可选 | 用来识别已有覆盖，不做门禁结论 |

### 必须输出 Markdown 文件

`test-strategy-planner` 的结果也应该输出为 Markdown 文件，文件名按范围生成：

```text
reports/test-strategy/commit-{short-sha}-test-strategy.md
reports/test-strategy/branch-{branch-name}-test-strategy.md
reports/test-strategy/requirement-{requirement-id-or-name}-test-strategy.md
```

文件内容必须是中文。

### 建议输出结构

#### 1. 策略摘要

| 项目 | 结果 |
|---|---|
| 变更范围 | commit / branch / requirement |
| 涉及需求 | 需求编号或名称 |
| 涉及后端模块 | 模块列表 |
| 涉及前端模块 | 页面/组件列表 |
| 推荐测试层级 | L1 / L2 / L3 |
| 是否需要单测门禁 | 是 / 否 |
| 是否需要接口自动化 | 是 / 否 |
| 是否需要前端/E2E | 是 / 否 |
| 建议后续 skill | skill 列表 |

#### 2. 需求覆盖规划矩阵

| 需求点 | 后端影响 | 前端影响 | L1 单测建议 | L2 JMeter 建议 | L3 前端/E2E 建议 | 优先级 | 风险 |
|---|---|---|---|---|---|---|---|

#### 3. 代码影响测试矩阵

| 变更文件 | 变更逻辑 | 影响功能 | 推荐测试层级 | 必须覆盖原因 | 后续 skill |
|---|---|---|---|---|---|

#### 4. 分层测试策略

| 层级 | 是否需要 | 覆盖重点 | 推荐工具 | 交付物 |
|---|---|---|---|---|
| L1 单元测试 | 是 / 否 | 业务规则、算法、分支、异常 | JUnit5 / Jest / Vitest | 单测文件、覆盖率报告 |
| L2 接口自动化 | 是 / 否 | 鉴权、参数、状态流转、数据副作用 | JMeter | `.jmx`、`.jtl`、HTML report |
| L3 前端/E2E | 是 / 否 | 页面状态、权限展示、核心用户旅程 | React/Vue 测试框架、Playwright | 前端测试、E2E 报告 |

#### 5. 后续执行建议

| 顺序 | Skill | 输入 | 预期输出 |
|---|---|---|---|
| 1 | `unit-test-governance` | 代码变更范围 | 单测门禁报告 |
| 2 | `backend-java-junit-testing` | 后端 must-cover 清单 | JUnit5 单测建议或实现 |
| 3 | `backend-api-jmeter-testing` | API 覆盖清单 | JMeter 场景和执行报告 |
| 4 | `frontend-web-testing` | 前端页面/旅程清单 | 前端测试计划 |
| 5 | `test-coverage-report` | 各层测试结果 | 管理层测试覆盖报告 |

### 和 `unit-test-governance` 的边界

`test-strategy-planner` 只判断“哪些地方应该测、应该在哪一层测”。

它不能替代 `unit-test-governance` 的结论：

| 能做 | 不能做 |
|---|---|
| 判断某段代码是否需要单测 | 判定单测门禁通过 |
| 规划 JUnit5 / JMeter / 前端测试范围 | 用 API 或 E2E 结果抵扣单测覆盖率 |
| 输出后续 skill 调用建议 | 生成最终提测报告 |
| 标记风险和优先级 | 宣称增量覆盖率达标 |

### 最小可执行版本建议

第一版 `test-strategy-planner` 可以先只实现这些能力：

1. 读取需求文档或用户故事。
2. 读取 commit / branch / 文件列表。
3. 输出需求覆盖规划矩阵。
4. 输出代码影响测试矩阵。
5. 标记哪些逻辑需要交给 `unit-test-governance`。
6. 生成中文 Markdown 策略文件。

这样就能和已经完成的 `unit-test-governance` 形成闭环。
