---
name: unit-test-governance
description: Enforce unit-test governance for frontend or backend changed code. Use when a developer needs to decide what changed logic requires unit tests, what can be excluded, whether incremental coverage is at least 80%, whether unit-test pass rate is 100%, or how to document uncovered unit-test risk before code review, merge, test handoff, or release.
---

# 单测治理

## 用途

使用这个 skill 作为前端和后端代码变更的统一单测门禁。它适用于 Java、JavaScript、TypeScript、React、Vue3 等技术栈。

这个 skill 不教授具体测试框架语法，例如 JUnit5、Vitest、Jest、Vue Test Utils。具体实现细节应交给框架专项 skill 或项目已有规范。

## 硬性门禁

单测治理只有同时满足下面两个条件才算通过：

1. 本次变更范围内的可执行代码，增量单测覆盖率必须大于 80%。
2. 单测通过率必须等于 100%。

这两个门禁只适用于单元测试。不要使用 API、集成、E2E、JMeter、Postman、Playwright、Cypress 或其他非单测结果来满足单测增量覆盖率或通过率。

如果任一门禁不满足，单测治理结果必须标记为不通过，并列出需要补救的动作。

除非用户明确要求，否则不要使用全项目覆盖率作为主要门禁。优先使用变更代码覆盖率或需求范围覆盖率。

## 适用范围

只评估当前变更范围，除非用户明确指定其他范围。范围可以是：

- 一个需求或任务。
- 一个分支。
- 一个 commit range。
- 一个 pull request diff。
- 用户提供的文件列表。
- 一个模块或包。

如果范围不明确，从本地 Git 变更或最近提交中推断，并说明假设。

## 工作流程

1. 识别变更中的可执行代码。
2. 在判断缺少覆盖前，先搜索工程中已有单测文件。
3. 根据路径、模块名、函数名、类名、接口路由、功能名和测试标题，把变更代码映射到相关测试。
4. 如果存在相关单测且环境可执行，优先运行最小相关测试命令。
5. 如果存在覆盖率命令，运行或请求最小相关的增量覆盖率命令。
6. 读取 eferences/self-test-checkpoints.md，只筛选自测检查点快照中适合 L1 单测治理的内容。
6. 将变更逻辑分类为：必须覆盖、可排除、单测已覆盖、或需要非单测覆盖。
7. 检查单测执行结果和通过率。
8. 检查增量覆盖率结果。
9. 输出单测门禁摘要、已有测试证据、覆盖分类、TODO、未覆盖风险。
10. 给出最终结论：通过、不通过或阻塞。

## 已有测试发现规则

输出 TODO 前，必须先搜索仓库中可能相关的测试文件。

常见单测位置和命名包括：

- Java 单测：`src/test/java/**/*Test.java`、`src/test/kotlin/**/*Test.kt`
- 前端单测/组件测试：`src/**/*.test.*`、`src/**/*.spec.*`
- 单测目录：`**/__tests__/**/*`、`test/**/*`、`tests/**/*`

但要排除明显属于 API、集成、E2E、压测、契约测试的文件。例如：

- 通过 HTTP endpoint 做端到端调用的 API 测试。
- JMeter、Postman、Newman、REST-assured API 套件。
- Playwright、Cypress、Selenium 等浏览器 E2E 套件。
- 文件名或路径包含 `e2e`、`api`、`integration`、`contract`、`jmeter`、`load` 的测试。

匹配信号包括：

| 信号 | 示例 |
|---|---|
| 相同模块路径 | `requirements/service.ts` -> `requirements*.test.ts` |
| 相同功能名 | `requirement`、`reqCode`、需求编号 |
| 相同函数或类名 | `generateReqCode`、`RequirementService` |
| 相同接口或用户故事 | `POST /api/requirements`、`US1.1` |
| 相同单元级缺陷症状 | 数字排序、重试分支、冲突处理 |
| 相同行为变化 | 格式化、校验、权限、状态流转 |

如果相关单测存在，必须先作为证据报告，再列缺失项。不要把 API 或 E2E 测试计入单测门禁。

## 测试执行规则

如果相关单测文件存在，并且环境允许，必须运行最小安全相关测试命令。

优先级：

1. 单个测试文件。
2. 过滤后的测试名或测试 pattern。
3. 包或模块测试命令。
4. 全量测试命令，只有在无法定位更小命令或用户要求时使用。

示例：

```text
Java/Maven: mvn -Dtest=RequirementServiceTest test
Java/Gradle: ./gradlew test --tests '*RequirementServiceTest'
Node/Vitest: pnpm vitest run src/modules/requirements/service.test.ts
Node/Jest: npm test -- requirements.test.ts
```

如果无法执行测试，要说明原因，并仍然产出代码扫描 TODO 清单。

不要把“存在测试文件”当成通过证据。优先使用实际执行结果。如果未运行测试，证据只能标记为静态检查。

## 必须覆盖的变更逻辑

凡是会影响行为、决策或结果的变更，都需要单测覆盖。

如需结合项目自测检查点，读取 eferences/self-test-checkpoints.md；该文件已复制检查点全文，但只能纳入适合单测治理的 L1 检查点。

| 类型 | 示例 |
|---|---|
| 业务规则 | 提交、审批、拒绝、取消、分配、资格计算 |
| 条件分支 | `if/else`、`switch`、三元表达式、策略选择 |
| 参数校验 | 必填、长度、格式、枚举、范围、空值 |
| 状态流转 | 草稿到待评审、待评审到通过、启用到禁用 |
| 权限判断 | 角色、归属人、功能入口可见性 |
| 计算逻辑 | 金额、折扣、数量、分数、百分比、优先级权重 |
| 日期时间逻辑 | 过期、截止时间、跨天、超时、生效日期 |
| 数据转换 | DTO 到实体、响应组装、枚举映射、字段派生 |
| 错误处理 | 不存在、非法状态、权限不足、外部失败 |
| 边界值 | 0、1、最小值、最大值、空列表、单条、多条 |
| 去重/排序/分页 | 重复处理、排序顺序、分页边界、总数 |
| 幂等 | 重复提交、重复取消、重复审批、重复请求 |
| 重试/降级 | 重试成功、重试耗尽、fallback、timeout |
| 缓存行为 | 命中、未命中、刷新、过期、失效 |
| 前端表单逻辑 | 必填、错误提示、提交禁用 |
| 前端权限 | 按钮、菜单、入口显示或隐藏 |
| 前端请求状态 | loading、empty、error、success |
| 前端交互 | 搜索、筛选、分页、排序、弹窗确认、提交 |

判断原则：只要变更会改变业务输出、页面行为、数据状态、权限、校验或错误处理，就需要单测覆盖。

## 可以排除的变更

当变更没有有意义的可执行逻辑时，可以排除单测覆盖。

| 类型 | 原因 |
|---|---|
| 简单 DTO/VO/type/interface | 只有结构，没有行为 |
| 简单 getter/setter | 无业务逻辑 |
| 常量 | 无计算或分支 |
| 纯样式 | CSS、静态 class、纯视觉变化 |
| 框架样板代码 | 启动、注册、无分支 wiring |
| 配置 | 无可测行为分支 |
| 纯静态展示组件 | 无条件、状态、事件、权限、请求行为 |
| 生成代码 | OpenAPI、ORM、protobuf 等工具生成 |
| 第三方库内部 | 测项目使用方式，不测库内部 |

每个排除项都必须写明原因。如果排除会带来业务或发布风险，要记录到未覆盖风险表。

## 需要非单测覆盖的情况

有些变更更适合 API、集成或 E2E 测试，而不是单测。

当主要风险是下面这些情况时，标记为需要非单测覆盖：

- 跨服务或跨系统集成。
- 无法有意义隔离的数据库事务行为。
- HTTP 契约兼容性。
- 浏览器渲染和路由导航。
- 前后端完整用户旅程。
- 性能、并发或负载行为。

不要忽略这些风险。单测结果中可以标记为不适合单测，但必须记录需要 API、集成或 E2E 覆盖。

## Mock 规则

使用 Mock 隔离被测单元和外部依赖。

常见需要 Mock 的依赖：

- 数据库访问。
- HTTP client。
- 消息队列。
- 文件系统。
- 时间和随机数。
- 第三方 SDK。
- 浏览器 API 或前端依赖的后端 API。

不要 Mock 正在被测试的逻辑。如果一个测试大部分都在断言 Mock 行为，要标记为弱覆盖。

## 命名规则

测试名应描述行为和预期结果。

推荐：

- `shouldRejectApprovalWhenStatusIsDraft`
- `shouldReturnErrorWhenRequiredFieldMissing`
- `shouldHideApproveButtonForUnauthorizedUser`
- `shouldCalculateDiscountForBoundaryAmount`

避免：

- `testMethod1`
- `testService`
- `handleClick works`
- `should call mock`

## 覆盖率计算规则

使用项目原生覆盖率工具，但解释口径必须一致。

覆盖率来源或公式不清楚时，读取 `references/coverage-rules.md`。

最低要求：

```text
增量单测覆盖率 > 80%
单测通过率 = 100%
```

增量覆盖率优先使用可执行变更行或变更函数。生成文件和已批准的无逻辑文件可以从分母中排除。

如果无法产生覆盖率数据，不要声称门禁通过。应标记为不通过或阻塞，除非用户明确接受手工风险说明。

## 代码扫描模式

当没有单测执行结果或覆盖率报告时，不要只停在“阻塞”。仍然要分析变更代码并输出单测 TODO。

代码扫描模式要求：

1. 搜索仓库中的相关测试文件。
2. 如果相关单测存在且可运行，运行最小相关命令并纳入结果。
3. 只有当通过率或增量覆盖率仍然缺失时，最终结论才标记为阻塞。
4. 找出必须覆盖的可执行变更逻辑。
5. 区分单测已覆盖、缺失覆盖和弱覆盖。
6. 输出按优先级排序的 TODO。
7. 区分单测 TODO 和 API/集成/E2E TODO。
8. 说明还缺哪些证据才能给出最终门禁结论。

TODO 表：

| 优先级 | 文件 | 变更逻辑 | 为什么需要单测 | 建议测试用例 | 推荐测试层级 |
|---|---|---|---|---|---|

优先级规则：

- `P0`：高风险业务逻辑、状态流转、权限、数据损坏、唯一性、冲突、重试、幂等、事务行为。
- `P1`：校验、转换、边界值、排序、分页、格式化、用户可见分支。
- `P2`：低风险分支强化、防御性检查、可选清晰度测试。

如果某个行为不适合单测，仍然写入 TODO，但推荐测试层级标记为 API、Integration 或 E2E。

## 必须输出的内容

始终按下面顺序输出。Markdown 报告文件必须使用中文章节和中文表头。即使结果通过，也不要压缩成一段话。

### 1. 单测门禁摘要

| 项目 | 结果 |
|---|---|
| 变更范围 | 分支、commit、文件或需求 |
| 已检查变更文件数 | N |
| 必须覆盖项 | N |
| 排除项 | N |
| 已执行单测数 | N |
| 通过数 | N |
| 失败数 | N |
| 单测通过率 | 100% / 非 100% |
| 增量覆盖率 | xx% |
| 覆盖率门禁 | 通过 / 不通过 |
| 最终结论 | 通过 / 不通过 / 阻塞 |

### 2. 已有测试证据

先列相关单测。API、集成、E2E、JMeter、Playwright、Cypress 或其他非单测只能作为非门禁证据。

| 测试文件 | 测试层级 | 匹配信号 | 覆盖内容 | 是否计入单测门禁 |
|---|---|---|---|---|

`是否计入单测门禁` 只能写：

- `是`：单测证据，可计入单测通过率和增量覆盖率。
- `否`：API、集成、E2E、JMeter、Playwright、Cypress、手工或其他非单测证据。

### 3. 变更逻辑覆盖分类

每个必须覆盖的变更逻辑都要分类。通过、不通过、阻塞都必须输出这张表。

| 文件 | 变更逻辑 | 分类 | 证据 | 推荐测试层级 |
|---|---|---|---|---|

分类只能使用：

- `单测已覆盖`
- `排除：无逻辑`
- `需要 API/集成/E2E 覆盖`
- `缺少单测`
- `断言较弱`

### 4. 未覆盖或排除风险

始终包含这一节。如果没有风险，写一行 `无`。

| 文件 | 变更逻辑 | 分类 | 原因 | 风险 | 处理要求 |
|---|---|---|---|---|---|

### 5. 单测执行证据

包含实际执行的最小相关命令、测试数量、通过/失败数量、覆盖率来源。如果覆盖率是根据变更行计算的，而不是工具全文件摘要，要明确说明。

### 6. 最终决策

最终决策只能是：`通过`、`不通过`、`阻塞`。

同时输出给 `test-coverage-report` 使用的下游提示：

| 报告字段 | 值 |
|---|---|
| 单测门禁 | 通过 / 不通过 / 阻塞 |
| 是否可纳入项目经理/测试经理最终报告 | 是 / 否 |
| 是否包含 API/集成/E2E 旁证 | 是 / 否 |
| 建议交付结论 | 可提测 / 有条件提测 / 不建议提测 |

这里不要生成完整需求覆盖矩阵，除非用户明确要求最终测试覆盖报告。完整矩阵属于 `test-coverage-report`。

## Markdown 报告文件

只要有文件系统写入权限，就必须把单测治理结果写入 Markdown 文件。

推荐路径：

```text
reports/unit-test-governance/commit-{short-sha}-unit-test-governance.md
```

命名规则：

- commit 范围：`commit-{short-sha}-unit-test-governance.md`，其中 `{short-sha}` 是 commit 前 7 位。
- branch 范围：`branch-{branch-name}-unit-test-governance.md`，将 `/` 和空格替换为 `-`。
- requirement 或 task 范围：`requirement-{requirement-id-or-name}-unit-test-governance.md`，将 `/` 和空格替换为 `-`。

如果仓库没有 `reports/unit-test-governance/` 目录，创建它。

Markdown 文件必须使用中文，并包含上面六个必需输出章节和下游报告提示。

最终对话回复只需要链接报告文件，并摘要说明最终决策、单测通过率和增量覆盖率。

如果无法写入文件，要明确说明原因，并在对话中提供完整中文 Markdown 内容。

## 最终决策规则

| 决策 | 含义 |
|---|---|
| 通过 | 增量覆盖率大于 80%，单测通过率 100%，未覆盖风险可接受或不属于单测范围 |
| 不通过 | 覆盖率低于或等于 80%，通过率不是 100%，必须单测缺失，或存在高风险未覆盖逻辑 |
| 阻塞 | 缺少必要覆盖率或测试结果数据，且无法推断 |

不通过时，列出最小补救动作。

## 参考资料

按需读取：

- `references/coverage-rules.md`：增量覆盖率解释。
- `references/risk-classification.md`：未覆盖风险分级。
- `references/output-template.md`：中文报告模板。