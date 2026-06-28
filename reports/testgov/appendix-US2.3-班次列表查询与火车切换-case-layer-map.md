# US2.3-班次列表查询与火车切换 测试案例测试方式对照表

| 案例 | 需求 | 后端影响 | 前端影响 | 推荐层级 | 当前证据 | 缺口 | 下游 skill |
|---|---|---|---|---|---|---|---|
| TC2.3-API-01 | 查询全局班次列表 | `/api/schedules`、`listAllSchedules` | 列表数据来源 | L1 + L2 | 后端路由/service/测试文件存在 | 需执行单测/API 证据；JMeter 缺失 | unit-gate、api-jmeter |
| TC2.3-API-02 | 全局班次列表分页 | `/api/schedules?page=&pageSize=`、`listAllSchedules` | 分页器数据来源 | L1 + L2 | schema 和 service 有分页逻辑，测试文件存在 | 需执行/确认覆盖率和 API 结果 | unit-gate、api-jmeter |
| TC2.3-API-03 | 全局班次按创建时间倒序 | `orderBy createdAt desc` | 表格排序结果 | L1 + L2 | service 有倒序查询，测试文件存在 | 需执行/确认 | unit-gate、api-jmeter |
| TC2.3-API-04 | 查询指定火车班次列表 | `/api/trains/:trainId/schedules`、`listTrainSchedules` | 选择所属火车后刷新列表 | L1 + L2 + L3 | route/service/前端调用存在 | 指定火车不分页；UI 证据缺失 | unit-gate、api-jmeter、ui-flow |
| TC2.3-API-05 | 查询不存在火车 | `listTrainSchedules` 火车存在性校验 | 错误提示可选 | L1 + L2 | service 有 train findUnique 和错误分支，测试文件存在 | 需执行/确认 | unit-gate、api-jmeter |
| TC2.3-API-06 | 未登录不可查询 | route authenticate | 前端登录态跳转不在本范围 | L2 | route 使用 `fastify.authenticate` | JMeter 缺失；API 测试待执行 | api-jmeter |
| TC2.3-API-07 | 非管理员不可创建班次 | POST 创建路由 RBAC | 新增按钮体验 | L2 + L3 | route 使用 `rbacMiddleware(Operation.MANAGE_TRAIN)` | 前端按钮显隐需补 | api-jmeter、ui-flow |
| TC2.3-API-08 | 非管理员不可变更状态 | status 路由 RBAC、`updateTrainScheduleStatus` | 状态按钮体验 | L1 + L2 + L3 | route RBAC 和 service 状态机存在 | 前端按钮显隐需补 | unit-gate、api-jmeter、ui-flow |
| TC2.3-FE-01 | 进入 `/schedules` 默认加载全局班次 | `/api/schedules` | 页面加载、表格、分页器 | L3/M | 前端代码调用全局列表 | UI 自动化/人工截图缺失 | ui-flow、manual-evidence |
| TC2.3-FE-02 | 火车下拉加载 | `/api/trains` | Select 选项 | L3/M | 前端 `loadTrainList` 存在 | UI 自动化/人工截图缺失 | ui-flow、manual-evidence |
| TC2.3-FE-03 | 切换所属火车刷新班次列表 | `/api/trains/:id/schedules` | `selectedTrainId` 切换 | L3 + L2 | 前端切换调用存在 | UI 自动化缺失；指定火车分页缺口 | ui-flow、api-jmeter |
| TC2.3-FE-04 | 清空所属火车恢复全局列表 | `/api/schedules` | allowClear + pagination | L3/M | 前端 allowClear 和列表加载逻辑存在 | UI/人工证据缺失 | ui-flow、manual-evidence |
| TC2.3-FE-05 | 班次列表字段展示 | 后端返回列表字段 | 表格列 | L3/M | 表格展示多数列 | “所属火车”列缺失；截图证据缺失 | ui-flow、manual-evidence |
| TC2.3-FE-06 | 点击班次行进入详情页 | 无新增后端 | `onRow` 路由跳转 | L3 | 前端跳转代码存在 | UI 自动化/截图证据缺失 | ui-flow |
| TC2.3-FE-07 | 未选择火车不可新增 | 无新增后端 | 按钮提示 | L3/M | 前端 `message.warning` 存在 | UI/人工证据缺失 | ui-flow、manual-evidence |
| TC2.3-FE-08 | 选择火车后打开新增弹窗 | POST 创建接口 | 新增弹窗 | L3/M | 前端弹窗代码存在 | UI/人工证据缺失 | ui-flow、manual-evidence |
| TC2.3-FE-09 | 编辑班次弹窗 | PATCH/PUT 更新接口 | 编辑弹窗、日期字段 | L3/M | 前端弹窗代码存在 | UI/人工证据缺失 | ui-flow、manual-evidence |
| TC2.3-FE-10 | 计划中显示开始操作 | status 接口 | PLANNING 操作按钮 | L3 + L2 | 前端按状态显示，后端状态机存在 | 角色显隐缺失，UI 证据缺失 | ui-flow、api-jmeter |
| TC2.3-FE-11 | 进行中显示封板操作 | status 接口 | IN_PROGRESS 操作按钮 | L3 + L2 | 前端按状态显示，后端状态机存在 | 角色显隐缺失，UI 证据缺失 | ui-flow、api-jmeter |
| TC2.3-FE-12 | 封板显示投产操作 | status 接口 | LOCKED_DOWN 操作按钮 | L3 + L2 | 前端按状态显示，后端状态机存在 | 角色显隐缺失，UI 证据缺失 | ui-flow、api-jmeter |
| TC2.3-GAP-01 | 班次列表未展示所属火车列 | 后端已返回 `trainName` | 表格未展示列 | M/L3 | 代码证据显示表格列无 `trainName` | P1 缺口待修复或确认不做 | ui-flow、manual-evidence |
| TC2.3-GAP-02 | 按火车查询不支持后端分页 | `listTrainSchedules` 无 query 分页 | 前端选中火车时用返回长度模拟分页 | L1 + L2 | 代码证据明确无分页参数和 pagination 返回 | P1 缺口待产品/后端确认 | unit-gate、api-jmeter |
| TC2.3-GAP-03 | 前端操作按钮未按角色隐藏 | 后端 RBAC 兜底 | 操作列无角色判断 | L3 + 前端单测建议 | 代码证据明确只按状态显示按钮 | P0 缺口；建议抽 helper 补前端单测和 UI 验证 | ui-flow、manual-evidence |