# T2-US2.3 班次列表查询与火车切换 测试策略与覆盖分析报告

## 1. 分析范围

| 项目 | 内容 |
|---|---|
| 分析范围 | Task2 版本火车管理：US2.3 班次列表查询与火车切换 |
| 分析前确认 | 用户已确认按本范围分析；单测治理报告可复用，其他存量报告不复用 |
| 测试案例来源 | `03-需求与设计/Task2-版本火车管理/测试案例/RT-T2-US2.3-班次列表查询与火车切换-测试案例_v1.1_20260516.md` |
| 需求/设计来源 | `03-需求与设计/Task2-版本火车管理/用户故事/t2-us2.3-train-switch/spec.md`；`03-需求与设计/Task2-版本火车管理/US详细设计/RT-T2-US2.3-版本火车列表-详细设计_v1.0_20260516.md` |
| 代码范围 | 后端 `release-train/apps/server/src/modules/trains/routes/schedule.ts`、`release-train/apps/server/src/modules/trains/services/train.service.ts`；前端 `release-train/apps/web/src/pages/trains/schedules/index.tsx`、`release-train/apps/web/src/services/train.ts` |
| 测试资产范围 | `t2-us2.3-schedule-api.test.ts`、`train.service.unit.test.ts`、`t2-us2.3-schedules-list.test.ts`、`requirement-T2-US2.3-unit-test-governance.md` |
| planner 执行人 | 技术 owner |
| 输入清单完整性 | 完整 |
| 口径差异 | 用户故事 v2.0 原始要求包含“用户相关火车过滤、默认选中相关火车”；本轮确认暂不纳入。当前以 `/schedules` 班次列表页为入口，而不是 `/trains` 火车列表页 |
| 存量报告处理 | 复用单测治理报告；旧测试策略、旧对照表、上轮未确认草稿均不复用结论 |

## 2. 测试案例到代码索引

| 测试案例 | 锚点 | 候选代码 | 相关性 | 是否已读 | 下一步 |
|---|---|---|---|---|---|
| API-01~03 | `GET /api/schedules`、分页、`createdAt` 倒序、返回字段 | `routes/schedule.ts`、`train.service.ts#listAllSchedules`、`t2-us2.3-schedule-api.test.ts`、`train.service.unit.test.ts` | 强相关 | 是 | 保留 L1 + L2 覆盖，补强字段断言 |
| API-04~05 | `GET /api/trains/:trainId/schedules`、火车存在校验 | `routes/schedule.ts`、`train.service.ts#listTrainSchedules`、API 测试、service 单测 | 强相关 | 是 | 保留覆盖，补“不包含其他火车”显式断言 |
| API-06~08 | 未登录、创建权限、状态变更权限 | `routes/schedule.ts` 认证/RBAC、API 测试 | 强相关 | 是 | 统一错误响应口径：当前测试按 200 + `success=false` |
| FE-01~04 | `/schedules`、火车下拉、切换、清空 | `schedules/index.tsx`、Playwright 用例 | 强相关 | 是 | 补列表内容、分页总数、请求路径断言 |
| FE-05~09 | 表格字段、详情跳转、新增/编辑弹窗 | `schedules/index.tsx`、Playwright 用例 | 强相关 | 是 | 补字段展示和编辑弹窗用例 |
| FE-10~12 | 状态按钮：开始、封板、投产、取消、编辑 | `schedules/index.tsx`、`updateTrainScheduleStatus`、Playwright 用例 | 强相关 | 是 | 固化测试数据，避免环境漂移 |
| GAP-01~03 | 所属火车列、指定火车分页、角色按钮显隐 | 前端表格列、后端指定火车列表、Playwright BA 用例 | 强相关 | 是 | GAP-03 为 P0 风险，先修复实现或冻结口径 |

## 3. 分层测试方案

| 层级 | 结论 | 覆盖重点 | 后续执行 |
|---|---|---|---|
| L1 后端单测 | 用户确认复用单测治理报告。该报告显示后端单测 44/44 通过，`train.service.ts` 分支覆盖率 95.45%，覆盖率门禁结论为通过。本 planner 不重新判定门禁，只引用其结论作为输入 | `listAllSchedules` 分页/排序/聚合、`listTrainSchedules` 火车校验/聚合、`updateTrainScheduleStatus` 状态机 | 后续如代码变更，重新交给 `unit-test-governance` |
| L1 前端单测建议 | 当前核心前端逻辑集中在组件内。若补角色显隐或分页状态归一化，建议抽出 helper/hook 后补单测 | 角色按钮显隐、火车切换后分页状态、表格操作按钮矩阵 | `unit-test-governance` 给出前端单测触发建议 |
| L2 API/JMeter | 8 个 API 案例已有 Vitest/Fastify inject 测试文件覆盖；但错误响应口径与“HTTP 401/403”描述存在差异 | 认证、权限、分页、排序、字段契约、错误 trainId | `automating-api-testing` 补强接口契约和错误码口径 |
| L3 UI 自动化 | 已有 Playwright 覆盖页面加载、下拉、切换、清空、详情跳转、新增入口、状态按钮；但多个用例断言偏弱或依赖环境数据 | `/schedules` 主流程、火车切换、分页、弹窗、状态按钮、角色显隐 | `webapp-testing` 补强 FE-03/04/05/09/GAP-03 |
| M 人工验证 | 本轮未启用人工 evidence 包；不创建 evidence 目录 | 仅可作为低频 UI 截图补充，不抵扣 L1/L2/L3 | 如需启用，需用户再次确认 |

## 4. 覆盖现状

| 范围 | 案例数 | 已覆盖 | 部分覆盖 | 缺失 | 可复用测试资产 | 主要缺口 |
|---|---:|---:|---:|---:|---|---|
| 后端 API | 8 | 8 | 0 | 0 | `release-train/apps/server/src/__tests__/t2-us2.3-schedule-api.test.ts` | 错误响应按 200 + `success=false` 断言，需要与文档口径统一 |
| 后端 L1 支撑逻辑 | 3 组 | 3 | 0 | 0 | `train.service.unit.test.ts`；单测治理报告 | planner 不重新判定门禁，复用治理报告结论 |
| 前端功能 | 12 | 5 | 5 | 2 | `release-train/apps/web/tests/e2e/t2-us2.3-schedules-list.test.ts` | FE-03/04 只操作少断言；FE-05/09 缺失；FE-08 未断言字段 |
| 差距验证 | 3 | 0 | 1 | 2 | Playwright 中有 BA 权限用例线索 | 所属火车列、指定火车分页、前端角色按钮显隐仍需处理 |

## 5. 需求/案例覆盖矩阵

| 需求点/案例组 | 测试案例 | 推荐层级 | 当前覆盖判断 | 待补内容 | 优先级 |
|---|---|---|---|---|---|
| 全局班次列表与分页 | API-01、API-02、API-03、FE-01 | L1 + L2 + L3 | API 和 service 已覆盖；FE-01 只断言标题、下拉、表格 | FE-01 补分页器、分页总数、至少一条数据或空态断言 | P0 |
| 指定火车班次列表 | API-04、API-05、FE-02、FE-03 | L1 + L2 + L3 | API/service 已覆盖；FE-03 只完成选择动作，缺“只显示火车 A”断言 | 补选中火车后的表格内容或请求路径断言 | P0 |
| 清空火车筛选 | FE-04 | L3 | 部分覆盖，已执行清空动作但未断言恢复全局列表/分页总数 | 补 `GET /api/schedules` 请求和分页总数恢复断言 | P1 |
| 字段展示与所属火车列 | FE-05、GAP-01 | L3/M | 缺失。前端列包含班次名称、状态、开始/结束日期、纳版截止、投产日、搭载系统、已纳版、创建时间、操作；没有“所属火车”列 | 决定是否实现“所属火车”列；补列标题和值断言 | P1 |
| 详情跳转 | FE-06 | L3 | 部分覆盖。用例有数据时断言 URL，无数据时仅断言空态 | 固化班次测试数据，避免跳转断言被空态绕开 | P0 |
| 新增班次入口 | FE-07、FE-08 | L3 | FE-07 已覆盖；FE-08 仅断言弹窗标题 | FE-08 补班次名称、开始日期、结束日期字段断言 | P0 |
| 编辑班次入口 | FE-09 | L3 | 缺失 | 新增编辑按钮、弹窗标题、字段回填、关键日期/自定义关键日期断言 | P1 |
| 状态按钮显示 | FE-10、FE-11、FE-12 | L1 + L2 + L3 | service 状态机已覆盖；Playwright 有按钮可见性断言，但依赖环境已有对应状态数据 | 固化 PLANNING/IN_PROGRESS/LOCKED_DOWN 测试数据 | P0 |
| 后端认证与权限 | API-06、API-07、API-08 | L2 | 已覆盖未登录、非管理员创建、非管理员状态变更 | 统一是否应返回 HTTP 401/403，或保持 200 + `success=false` | P0 |
| 指定火车分页一致性 | GAP-02 | L2 + L3 | 缺失，当前代码明确不支持 | 若纳入实现，补接口分页参数、`pagination` 返回和前端分页回归 | P1 |
| 前端角色按钮显隐 | GAP-03 | L1 前端建议 + L3 | 高风险缺口。当前页面代码没有角色判断；现有 BA Playwright 用例预期“新增按钮不可见”，与实现冲突 | 先实现角色显隐或更新确认口径，再补 helper 单测和 UI 用例 | P0 |

## 6. 代码影响测试矩阵

| 文件/模块 | 影响逻辑 | 影响案例 | 推荐层级 | 必须覆盖原因 | 后续 skill |
|---|---|---|---|---|---|
| `release-train/apps/server/src/modules/trains/routes/schedule.ts` | `/api/schedules`、`/api/trains/:trainId/schedules`、创建/取消/状态变更路由、认证和 RBAC | API-01~08 | L2 | 接口契约、认证、权限和 schema 需要经过 HTTP 链路验证 | `automating-api-testing` |
| `release-train/apps/server/src/modules/trains/services/train.service.ts` | 分页计算、倒序排序、字段聚合、火车存在校验、状态机、事务副作用 | API-01~05、API-08、FE-10~12 | L1 + L2 | 业务规则可隔离，单测治理报告已覆盖核心函数 | `unit-test-governance` |
| `release-train/apps/web/src/pages/trains/schedules/index.tsx` | 页面加载、火车下拉、切换/清空、分页状态、列定义、详情跳转、新增/编辑弹窗、状态按钮 | FE-01~12、GAP-01~03 | L3 + L1 前端建议 | 用户可见行为和角色显隐风险集中在页面组件 | `webapp-testing` |
| `release-train/apps/web/src/services/train.ts` | 版本火车服务封装；本页面当前主要直接使用 `api`，该文件为相关 API 资产 | 间接影响 | 走查 + 后续统一封装时补测 | 如果后续把页面调用迁移到 `trainService`，需回归路径和响应类型 | `unit-test-governance` |

## 7. 现有测试资产判断

| 现有测试文件/报告 | 可复用覆盖 | 不足 | 处理建议 |
|---|---|---|---|
| `release-train/apps/server/src/__tests__/t2-us2.3-schedule-api.test.ts` | API-01~08 基本覆盖；包含列表、分页、排序、指定火车、认证和权限 | 错误响应口径按 200 + `success=false`；API-01 字段断言未覆盖容量/需求数全字段；API-08 管理员成功路径只覆盖 `PLANNING -> IN_PROGRESS` | 保留并补强字段/状态链断言；同步文档错误码口径 |
| `release-train/apps/server/src/modules/trains/services/train.service.unit.test.ts` | 覆盖 `listAllSchedules`、`listTrainSchedules`、`updateTrainScheduleStatus` | 不覆盖 API 契约和前端行为；不应抵扣 L2/L3 | 作为 L1 支撑证据，门禁结论复用单测治理报告 |
| `release-train/apps/web/tests/e2e/t2-us2.3-schedules-list.test.ts` | 覆盖 FE-01~04、FE-06~08、FE-10~12，并有额外刷新和 BA 权限用例 | FE-03/04 缺业务断言；FE-05/09 缺失；FE-15 与当前页面代码冲突，可能失败 | 补强断言并先处理 GAP-03 |
| `reports/unit-test-governance/requirement-T2-US2.3-unit-test-governance.md` | 用户确认可复用；报告显示单测通过率 100%，覆盖率门禁通过 | 本 planner 不运行测试、不重新判定门禁 | 纳入主报告作为 L1 证据输入 |
| 旧测试策略/旧对照表/上轮草稿 | 不复用 | 用户明确其他存量报告不复用 | 不引用其结论 |

## 8. TODO 清单与后续执行

| 优先级 | TODO | 推荐 skill | 输入 | 预期输出 |
|---|---|---|---|---|
| P0 | 处理 GAP-03：非火车管理员前端管理按钮显隐。当前页面无角色判断，BA Playwright 用例与实现冲突 | `unit-test-governance` + `webapp-testing` | `schedules/index.tsx`、角色权限模型、现有 Playwright 用例 | 前端 helper 单测建议、UI 自动化证据 |
| P0 | 统一 API 错误响应口径：文档写未认证/无权限错误，测试按 200 + `success=false` | `automating-api-testing` | `schedule.ts`、API 测试、统一错误处理中间件 | API 契约补充或文档修订 |
| P0 | 补强 FE-03/FE-04：火车切换和清空筛选必须有列表内容/请求路径/分页总数断言 | `webapp-testing` | `t2-us2.3-schedules-list.test.ts`、测试数据准备脚本 | 稳定 UI 回归用例 |
| P0 | 固化 FE-06/FE-10~12 所需班次状态测试数据 | `webapp-testing` | Playwright 测试数据、后端 seed API | 不再依赖环境已有数据 |
| P1 | 补 FE-05 表格字段断言，并确认是否实现“所属火车”列 | `webapp-testing` | 表格列定义、GAP-01 需求 | 字段覆盖证据或差距闭环 |
| P1 | 补 FE-09 编辑班次弹窗用例 | `webapp-testing` | 页面代码、测试数据 | 编辑入口覆盖证据 |
| P1 | 如决定修复 GAP-02，补指定火车分页接口和前端分页回归 | `automating-api-testing` + `webapp-testing` | `listTrainSchedules`、路由、页面分页逻辑 | L2 + L3 分页覆盖 |
| P2 | 聚合真实执行结果生成最终自测报告 | `test-report-generator` | 本报告、单测治理报告、API/Playwright 执行结果 | 最终测试证据报告 |

## 9. 后续 skill 动态推荐

| 后续任务 | 推荐 skill | 是否存在 | 推荐原因 | 输入建议 |
|---|---|---|---|---|
| 单测门禁/增量覆盖率 | `unit-test-governance` | 是 | 项目已有统一单测门禁 skill，适合重新判定后端增量覆盖和前端单测触发建议 | 本报告、变更文件、coverage 报告 |
| API/JMeter 覆盖 | `automating-api-testing` | 是 | 项目已有 API 自动化 skill，适合校准接口契约、认证、权限和错误响应 | `schedule.ts`、API 测试文件、错误响应规范 |
| UI 自动化或人工验证 | `webapp-testing` | 是 | 项目已有 Playwright 测试 skill，适合补强 `/schedules` 页面断言 | 页面代码、现有 e2e 文件、测试数据 |
| 最终覆盖报告 | `test-report-generator` | 是 | 项目已有测试报告生成 skill，可汇总 vitest coverage 与 Playwright 报告 | 本报告、单测治理报告、测试执行输出 |

## 10. 人工验证方案

| UI 场景 | 替代方式 | 是否询问用户 | evidence/summary.md 路径 | 必须证据 | 风险 |
|---|---|---|---|---|---|
| 所属火车列是否展示 | 可人工截图补充 | 未启用 | 未创建 | `/schedules` 全局列表截图、接口返回 `trainName` 证据 | 不能替代 L3 自动化 |
| 指定火车分页体验 | 可人工截图和 Network 响应补充 | 未启用 | 未创建 | 选择火车后的分页器截图、请求 URL、响应体 | 不能替代 L2 契约 |
| 非管理员按钮显隐 | 不建议只靠人工，优先自动化 | 未启用 | 未创建 | BA 登录截图、操作列截图、后端无权限响应 | P0 权限体验风险 |

## 11. 风险提醒

| 风险 | 影响 | 建议 |
|---|---|---|
| 前端角色按钮显隐缺口与现有 BA 用例冲突 | 测试可能失败；非管理员会看到管理操作，依赖后端兜底 | P0 修复前端角色显隐，或明确本轮冻结为后端兜底 |
| 指定火车列表不分页 | 火车下班次多时页面一次加载全部，和全局列表体验不一致 | P1 评估是否纳入实现，纳入则补 L2/L3 |
| UI 用例断言偏弱 | 可能“操作执行了但业务结果没验证” | 补请求、列表内容、分页、字段断言 |
| 错误响应口径未统一 | 文档/测试/实现对 HTTP 状态码理解不一致 | 统一为 HTTP 401/403 或项目规范的 200 + `success=false` |