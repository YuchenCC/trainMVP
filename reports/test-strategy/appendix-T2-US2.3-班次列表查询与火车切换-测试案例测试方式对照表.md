# T2-US2.3 班次列表查询与火车切换 测试案例测试方式对照表

## 1. 统计概览

| 测试方式 | 数量 | 说明 |
|---|---:|---|
| L1 后端单测支撑 | 3 组 | 非测试案例原始层级，但覆盖 service 核心逻辑，且单测治理报告可复用 |
| L1 前端单测建议 | 1 组 | 角色显隐/分页状态如实现，应抽出 helper 或 hook |
| L2 API 自动化 | 8 | API-01~08 |
| L3 UI 自动化 | 12 | FE-01~12 |
| 差距验证 | 3 | GAP-01~03 |
| 人工验证 | 0 | 本轮未启用 evidence 包 |

## 2. 对照表

| 案例 | 测试方式 | 工具 | 覆盖逻辑 | 当前状态 | TODO |
|---|---|---|---|---|---|
| TC2.3-API-01 | L2 API + L1 支撑 | Vitest/Fastify inject；Vitest service unit | `GET /api/schedules` 返回 `list`、`pagination`、班次字段 | 部分覆盖 | API 测试已断言基本字段；补容量、需求数、关键日期等完整字段断言 |
| TC2.3-API-02 | L2 API + L1 支撑 | Vitest/Fastify inject；Vitest service unit | 全局分页 `page/pageSize`、`skip/take` | 已覆盖 | 统一 page=0 错误响应口径 |
| TC2.3-API-03 | L2 API + L1 支撑 | Vitest/Fastify inject；Vitest service unit | `createdAt` 倒序 | 已覆盖 | 保留 |
| TC2.3-API-04 | L2 API + L1 支撑 | Vitest/Fastify inject；Vitest service unit | 指定火车只返回该 `trainId` 的班次 | 部分覆盖 | 当前断言每条 `trainId` 等于目标火车；建议补“不包含火车 B”显式断言 |
| TC2.3-API-05 | L2 API + L1 支撑 | Vitest/Fastify inject；Vitest service unit | 不存在火车返回业务错误 | 已覆盖 | 补明确错误码和 message |
| TC2.3-API-06 | L2 API | Vitest/Fastify inject | 未登录不可查询全局/指定火车班次 | 已覆盖 | 与测试案例中的未认证错误口径统一 |
| TC2.3-API-07 | L2 API | Vitest/Fastify inject | 非火车管理员不可创建班次 | 已覆盖 | 与测试案例中的无权限错误口径统一 |
| TC2.3-API-08 | L2 API + L1 支撑 | Vitest/Fastify inject；Vitest service unit | 非管理员不可变更状态；管理员可变更；service 状态机合法/非法流转 | 部分覆盖 | API 层补 `IN_PROGRESS -> LOCKED_DOWN`、`LOCKED_DOWN -> RELEASED` 成功链路 |
| TC2.3-FE-01 | L3 UI | Playwright | `/schedules` 页面标题、所属火车下拉、表格 | 部分覆盖 | 补分页器和数据/空态断言 |
| TC2.3-FE-02 | L3 UI | Playwright | 所属火车下拉加载选项 | 已覆盖 | 保留 |
| TC2.3-FE-03 | L3 UI | Playwright | 选择火车后刷新列表 | 部分覆盖 | 现有用例只选择选项，补“只显示该火车班次”或请求路径断言 |
| TC2.3-FE-04 | L3 UI | Playwright | 清空火车筛选恢复全局列表 | 部分覆盖 | 补清空后请求 `/api/schedules`、分页总数恢复断言 |
| TC2.3-FE-05 | L3 UI | Playwright | 表格列展示：班次名称、状态、日期、系统数、已纳版、创建时间、操作 | 缺失 | 新增列标题和值断言；同步处理“所属火车”列差距 |
| TC2.3-FE-06 | L3 UI | Playwright | 点击行跳转详情页 | 部分覆盖 | 现有用例在无数据时走空态；应固化数据后强制断言跳转 |
| TC2.3-FE-07 | L3 UI | Playwright | 未选择火车点击新增提示“请先选择所属火车” | 已覆盖 | 保留 |
| TC2.3-FE-08 | L3 UI | Playwright | 选择火车后打开新增班次弹窗 | 部分覆盖 | 当前只断言弹窗标题；补班次名称、开始日期、结束日期字段 |
| TC2.3-FE-09 | L3 UI | Playwright | 点击编辑打开编辑弹窗并回填字段 | 缺失 | 新增 Playwright 用例 |
| TC2.3-FE-10 | L3 UI + L1 支撑 | Playwright；service unit | `PLANNING` 显示开始、取消、编辑；状态机支持 `PLANNING -> IN_PROGRESS` | 部分覆盖 | 固化计划中班次数据 |
| TC2.3-FE-11 | L3 UI + L1 支撑 | Playwright；service unit | `IN_PROGRESS` 显示封板、取消、编辑；状态机支持 `IN_PROGRESS -> LOCKED_DOWN` | 部分覆盖 | 固化进行中班次数据 |
| TC2.3-FE-12 | L3 UI + L1 支撑 | Playwright；service unit | `LOCKED_DOWN` 显示投产、取消、编辑；状态机支持 `LOCKED_DOWN -> RELEASED` | 部分覆盖 | 固化封板班次数据 |
| TC2.3-GAP-01 | L3 UI/M | Playwright 或人工截图 | 全局列表展示“所属火车”列 | 缺失 | 前端当前未展示；先确认是否实现，之后补 FE-05 断言 |
| TC2.3-GAP-02 | L2 API + L3 UI | Vitest/Fastify inject；Playwright | 指定火车查询支持分页并返回 `pagination` | 缺失 | 当前接口不处理分页；如纳入实现，补接口和 UI 分页用例 |
| TC2.3-GAP-03 | L1 前端建议 + L3 UI | Vitest/Jest helper；Playwright | 非火车管理员隐藏编辑、取消、开始、封板、投产等管理按钮 | 部分覆盖 | 有 BA Playwright 用例，但当前页面无角色判断；需先修复实现 |

## 3. 建议新建或复用的测试文件

| 类型 | 文件建议 | 覆盖案例 |
|---|---|---|
| L1 后端单测复用 | `release-train/apps/server/src/modules/trains/services/train.service.unit.test.ts` | API-01~05、API-08 的 service 逻辑 |
| L2 API 自动化复用/补强 | `release-train/apps/server/src/__tests__/t2-us2.3-schedule-api.test.ts` | API-01~08 |
| L3 UI 自动化复用/补强 | `release-train/apps/web/tests/e2e/t2-us2.3-schedules-list.test.ts` | FE-01~12、GAP-03 |
| L1 前端单测建议 | 抽出 `schedulePermissions`、`schedulePagination` 等 helper 后新增 `*.test.ts` | GAP-03、火车切换分页状态 |

## 4. 不建议放进单测的内容

| 内容 | 原因 |
|---|---|
| Ant Design Select 展开、Modal 可见性、页面跳转 | 浏览器渲染和用户交互行为，优先 L3 |
| Fastify 认证/RBAC 中间件真实链路 | 需要经过 HTTP 请求链，优先 L2 |
| 所属火车列的视觉截图确认 | 可人工补证据，但不能替代自动化断言 |

## 5. 单测可以考虑的点

| 单测点 | 前提 |
|---|---|
| `listAllSchedules` 分页、排序、聚合字段 | 已有 service 单测，可继续维护 |
| `listTrainSchedules` 火车存在校验、字段聚合 | 已有 service 单测，可补排序断言 |
| `updateTrainScheduleStatus` 合法/非法流转 | 已有 service 单测，可补日期副作用断言 |
| 前端角色按钮显隐 helper | 先从 `SchedulesPage` 抽出纯函数或 hook |
| 选择火车/清空火车后的分页状态归一化 | 先从组件状态逻辑抽出可测试函数 |

## 6. 可人工验证替代的 UI 场景

| 场景 | 替代原因 | 是否需要创建轻量 evidence | summary.md 填写要求 |
|---|---|---|---|
| 所属火车列展示截图 | 低频视觉确认 | 本轮未启用 | 如后续启用，记录环境、用户、截图、接口 `trainName` 响应 |
| 指定火车分页体验 | 可截图和 Network 证明 | 本轮未启用 | 如后续启用，记录请求 URL、响应体、分页器截图 |
| 非管理员按钮显隐 | P0 权限体验风险高，不建议只人工替代 | 本轮未启用 | 如后续启用，必须附 BA 登录截图、操作列截图和后端无权限响应 |