# US2.3-班次列表查询与火车切换 测试覆盖分析

## 1. 结论摘要
| 项目 | 结论 |
|---|---|
| 需求覆盖状态 | 部分覆盖 |
| 后端 L1 单测候选 | 有：`listAllSchedules`、`listTrainSchedules`、`updateTrainScheduleStatus` |
| L2 API 覆盖缺口 | 有：未提供 JMeter 脚本/报告；已有 Vitest API 测试文件可作为接口自动化证据候选，需交给 `testgov-api-jmeter` 判定 |
| L3 UI 覆盖缺口 | 有：未发现 US2.3 专用 UI 自动化报告或脚本输入 |
| 人工验证候选 | 有：前端页面展示、火车切换、详情跳转、弹窗、状态按钮、角色按钮显隐 |
| 主要风险 | 前端未按角色隐藏管理按钮为 P0；按火车查询不支持后端分页、全局列表未展示所属火车列为 P1；JMeter/UI 自动化证据缺失 |

## 2. 分析范围与证据来源
| 证据 | 路径/来源 | 状态 |
|---|---|---|
| specs | `reports/testgov/specs-US2.3-班次列表查询与火车切换.md` | 已读取 |
| 需求/设计 | `RT-T2-版本火车管理-用户故事_v2.0_20260516.md`、`RT-T2-US2.3-版本火车列表-详细设计_v1.0_20260516.md` | 已读取 |
| 测试案例 | `RT-T2-US2.3-班次列表查询与火车切换-测试案例_v1.1_20260516.md` | 已读取 |
| 后端代码 | `schedule.ts`、`train.service.ts` | 已读取指定方法和路由 |
| 前端代码 | `pages/trains/schedules/index.tsx`、`services/train.ts` | 已读取页面主流程和服务封装 |
| 后端测试资产 | `train.service.unit.test.ts`、`t2-us2.3-schedule-api.test.ts` | 已发现，执行和门禁由下游判定 |
| UI/JMeter 执行报告 | 未提供 | 缺失 |

## 3. 需求覆盖摘要
| 需求/用户故事 | 测试案例 | 覆盖状态 | 说明 |
|---|---|---|---|
| 进入 `/schedules` 默认展示班次列表 | TC2.3-FE-01、TC2.3-API-01 | 部分覆盖 | 代码有页面入口和全局列表接口；缺少 UI 自动化/人工证据证明页面实际展示 |
| 顶部火车下拉和切换班次列表 | TC2.3-FE-02~04、TC2.3-API-04 | 部分覆盖 | 前端调用 `/trains` 和 `/trains/:trainId/schedules`；缺少 L3/UI 或人工证据 |
| 全局班次分页、倒序 | TC2.3-API-02~03 | 部分覆盖 | 后端 `GET /api/schedules` schema 和 service 支持分页倒序；需 unit-gate/api-jmeter 判定测试证据 |
| 按火车查询班次 | TC2.3-API-04~05 | 部分覆盖 | 后端返回指定火车全部班次，火车不存在会抛错；指定火车分页为已知差距 |
| 班次字段展示 | TC2.3-FE-05、TC2.3-GAP-01 | 部分覆盖 | 前端展示多数字段，但未展示“所属火车”列；后端返回 `trainName` |
| 点击班次进入详情页 | TC2.3-FE-06 | 部分覆盖 | 前端 `onRow` 跳转到详情路由；缺少 UI 执行证据 |
| 新增/编辑班次入口 | TC2.3-FE-07~09、TC2.3-API-07 | 部分覆盖 | 前端未选火车时提示；后端创建/更新有权限控制；缺少 UI 执行证据 |
| 状态操作 | TC2.3-FE-10~12、TC2.3-API-08 | 部分覆盖 | 前端按状态显示开始/封板/投产/取消/编辑；后端状态流转有 service 逻辑和权限路由；缺少 UI 执行证据 |
| 角色权限按钮显隐 | TC2.3-GAP-03 | 缺失 | 后端有权限兜底，前端未见角色判断控制按钮显隐 |
| 用户相关火车过滤、默认选中相关火车 | 不纳入 | 不适用 | 用户已确认本轮先不做 |

## 4. 分层测试方案
| 测试点 | 推荐层级 | 原因 | 当前证据 | 缺口 |
|---|---|---|---|---|
| `listAllSchedules` 分页、倒序、字段聚合 | L1 + L2 | service 可隔离，接口契约也需验证 | 代码：`train.service.ts:874-934`；测试文件：`train.service.unit.test.ts`、`t2-us2.3-schedule-api.test.ts` | 需 `testgov-unit-gate` 执行/确认单测门禁，`testgov-api-jmeter` 确认接口证据 |
| `listTrainSchedules` 指定火车查询、火车不存在、字段聚合 | L1 + L2 | service 可隔离，接口契约需验证 | 代码：`train.service.ts:826-872`；测试文件存在 | 指定火车分页缺失；需后续确认是否作为 P1 修复 |
| `updateTrainScheduleStatus` 状态机、需求状态联动 | L1 + L2 | 状态流转和事务副作用必须单测/API 覆盖 | 代码：`train.service.ts:1136-1198`；测试文件存在 | UI 状态按钮展示仍需 L3/M 覆盖 |
| `/api/schedules` 全局列表 | L2 | 登录、分页 schema、返回契约 | 代码：`schedule.ts:93-109`；API 测试文件存在 | JMeter 报告缺失 |
| `/api/trains/:trainId/schedules` 指定火车列表 | L2 | 登录、参数、返回契约 | 代码：`schedule.ts:218-235`；API 测试文件存在 | 不支持分页；JMeter 报告缺失 |
| `/schedules` 页面加载、火车切换、清空、分页 | L3/M | 真实浏览器行为和页面状态 | 代码：`index.tsx:98-140`、`index.tsx:487-545` | UI 自动化报告缺失；可用人工证据补低风险展示 |
| 表格字段、行点击详情 | L3/M | DOM 展示和路由跳转 | 代码：`index.tsx:288-388`、`index.tsx:525-534` | 缺少所属火车列；缺 UI/人工证据 |
| 新增/编辑弹窗 | L3/M | 表单弹窗、日期字段、交互 | 代码：`index.tsx:551-683` | 缺 UI/人工证据 |
| 前端角色按钮显隐 | L3 + 前端单测建议 | 权限显隐是可隔离前端逻辑，同时也需要浏览器验证 | 当前代码操作列只按状态显示，未见角色判断 | P0 缺口：建议抽出 helper 后补前端单测，并补 L3/人工证据 |

## 5. 代码影响测试矩阵
| 代码影响点 | 关联需求 | 推荐测试方式 | 当前证据 | TODO |
|---|---|---|---|---|
| `schedule.ts` `/api/schedules` | 全局班次列表、分页、倒序 | L2 API/JMeter | 路由 schema 支持 `page/pageSize`，调用 `listAllSchedules` | 交给 `testgov-api-jmeter` 判定 API 自动化证据；JMeter 缺失需标记 |
| `schedule.ts` `/api/trains/:trainId/schedules` | 按火车查询班次 | L2 API/JMeter | 路由只接收 `trainId`，未定义分页 query schema | P1：如需求要求分页，需补 query schema、service 分页和测试 |
| `schedule.ts` 写操作权限路由 | 新增/编辑/取消/状态变更权限 | L2 API/JMeter | 写操作使用 `rbacMiddleware(Operation.MANAGE_TRAIN)` | 继续用 API 测试验证非管理员失败 |
| `train.service.ts#listAllSchedules` | 全局列表、分页、倒序、字段聚合 | L1 + L2 | service 计算 `skip/take`、`orderBy createdAt desc`、聚合容量和需求数 | 交给 `testgov-unit-gate` 判定单测门禁 |
| `train.service.ts#listTrainSchedules` | 指定火车列表 | L1 + L2 | 查询火车存在性，返回全部班次，聚合字段 | P1：分页缺失；补实现后新增单测/API 测试 |
| `train.service.ts#updateTrainScheduleStatus` | 状态操作 | L1 + L2 | 状态机、事务更新需求状态 | 交给 `testgov-unit-gate` 判定状态流转单测 |
| `index.tsx#loadTrainList/loadScheduleList` | 页面加载、火车下拉、切换/清空 | L3/M | 调用 `/trains`、`/schedules`、`/trains/:id/schedules`，切换时前端设置分页总数 | 缺 UI 自动化/人工证据；指定火车分页只做前端总数 |
| `index.tsx#scheduleColumns` | 字段展示、状态按钮 | L3/M + 前端单测建议 | 表格列未包含 `trainName`；操作按钮只按状态显示 | P0/P1 前端缺口：角色显隐、所属火车列 |
| `index.tsx#onRow` | 详情跳转 | L3/M | 行点击跳转 `/trains/:trainId/schedules/:scheduleId` | 缺 UI 自动化/人工证据 |
| `services/train.ts` | 前端 API 封装 | 待确认 | 有部分班次方法，但当前页面直接使用 `api` | 当前 US2.3 主流程不依赖该封装，标记低优先级 |

## 6. 需传给 unit-gate 的后端单测项
| 代码/逻辑 | 建议单测原因 | 必测分支 | 备注 |
|---|---|---|---|
| `listAllSchedules` | 分页、倒序、字段聚合是列表核心逻辑 | 默认分页、自定义分页、非法/边界分页、空列表、倒序、容量/需求数字段聚合 | 已发现相关单测文件，需执行或引用最新执行证据 |
| `listTrainSchedules` | 指定火车查询、火车不存在是核心分支 | 火车存在返回列表、火车不存在抛错、空班次 | 已发现相关单测文件；分页缺失不应写成已覆盖 |
| `updateTrainScheduleStatus` | 状态流转和需求状态副作用风险高 | PLANNING->IN_PROGRESS、IN_PROGRESS->LOCKED_DOWN、LOCKED_DOWN->RELEASED、非法流转、RELEASED 不可变更、班次不存在 | 已发现相关单测文件，需执行或引用最新执行证据 |

## 7. 前端单测触发建议
| 前端逻辑 | 是否触发 | 原因 | 建议 |
|---|---|---|---|
| 角色按钮显隐 | 是 | 权限显隐属于可隔离复杂前端逻辑，当前代码未见角色判断 | 建议抽出 `canManageSchedule(role, status)` 或同类 helper，补前端单测；同时保留 L3/人工验证 |
| 按状态显示操作按钮 | 是 | 状态到按钮集合有明确分支，适合 helper 化 | 如重构为纯函数，补 PLANNING/IN_PROGRESS/LOCKED_DOWN/RELEASED 分支单测 |
| 火车切换时分页状态 | 可选 | 当前逻辑在选中火车时用列表长度模拟分页，若后端补分页需前端同步 | 后端分页改造时补前端逻辑单测或组件测试 |
| 日期字段格式化展示 | 否 | 当前只是展示格式化，风险较低 | 通过 L3/人工验证覆盖即可 |
| 弹窗打开与字段展示 | 否 | 主要是 UI 行为 | 走 L3 或人工验证 |

## 8. API/JMeter 任务
| 接口/场景 | 覆盖状态 | 建议 |
|---|---|---|
| `GET /api/schedules` 全局列表 | 部分覆盖 | 已有 API 测试文件候选；缺 JMeter 报告，交给 `testgov-api-jmeter` 判定 |
| `GET /api/schedules?page=&pageSize=` 分页 | 部分覆盖 | 验证 schema、分页返回和边界参数；JMeter 缺失 |
| `GET /api/trains/:trainId/schedules` 指定火车列表 | 部分覆盖 | 验证只返回指定火车；同时记录分页缺口 |
| `GET /api/trains/not-exist/schedules` | 部分覆盖 | 验证火车不存在错误 |
| 未登录查询列表 | 部分覆盖 | 验证认证失败 |
| 非管理员创建班次 | 部分覆盖 | 验证后端权限兜底 |
| 非管理员状态变更 | 部分覆盖 | 验证后端权限兜底 |

## 9. UI 自动化与人工验证任务
| 场景 | 建议方式 | 原因 | 证据要求 |
|---|---|---|---|
| `/schedules` 默认加载、火车下拉、切换、清空 | L3 优先；低风险展示可 M | P0 主路径，涉及真实页面和接口联动 | Playwright 报告或 SIT 截图 + Network 证据 |
| 表格字段展示和所属火车列差距 | M 或 L3 | 展示类，截图可说明；所属火车列为差距项 | 表格截图，标注是否有“所属火车”列 |
| 点击行进入详情页 | L3 | 路由跳转是核心用户路径 | UI 自动化或截图记录跳转前后 URL |
| 未选择火车点击新增班次 | L3/M | 关键提示行为 | 截图或自动化断言“请先选择所属火车” |
| 新增/编辑弹窗 | M | 表单展示和字段确认，自动化收益一般 | 截图记录字段 |
| 状态按钮显示 | L3/M | 状态相关按钮展示影响操作入口 | 不同状态截图或 UI 自动化断言 |
| 角色按钮显隐 | L3 + 前端单测建议 | 高风险权限体验问题 | 多角色截图或 UI 自动化；建议补 helper 单测 |

## 10. 风险与 TODO
| 优先级 | TODO | 责任人 | 下游 skill |
|---|---|---|---|
| P0 | 检查/补齐前端操作按钮按角色隐藏逻辑 | 前端开发 | `testgov-ui-flow`，必要时前端单测 |
| P0 | 对 `/schedules` 主路径补 UI 自动化或人工验证证据 | 前端开发 / 测试人员 | `testgov-ui-flow` / `testgov-manual-evidence` |
| P0 | 对后端 L1 候选项执行单测门禁检查 | 后端开发 | `testgov-unit-gate` |
| P0 | 对 US2.3 API 自动化证据做独立判定，标记 JMeter 是否缺失 | 后端开发 / API 自动化测试人员 | `testgov-api-jmeter` |
| P1 | 补充“所属火车”列或确认不展示 | 产品 / 前端开发 | `testgov-ui-flow` / manual evidence |
| P1 | 明确指定火车班次是否需要后端分页；若需要，补实现和测试 | 产品 / 后端开发 | `testgov-unit-gate` + `testgov-api-jmeter` |
| P2 | 若页面继续直接使用 `api` 而不是 `trainService`，确认是否需要统一封装 | 前端开发 | 代码治理，不阻塞本轮测试 |