# US2.3 班次列表查询与火车切换 测试策略与覆盖分析报告

## 1. 分析范围

| 项目 | 内容 |
|---|---|
| 分析范围 | Task2 版本火车管理：US2.3 班次列表查询与火车切换 |
| 测试案例来源 | `03-需求与设计/Task2-版本火车管理/测试案例/RT-T2-US2.3-班次列表查询与火车切换-测试案例_v1.1_20260516.md` |
| 需求/设计来源 | 用户故事 v2.0、US2.3 详细设计 v1.1 |
| 代码范围 | 后端 `trains/routes/schedule.ts`、`trains/services/train.service.ts`；前端 `pages/trains/schedules/index.tsx`、`services/train.ts` |
| 口径差异 | 用户故事 v2.0 原始要求包含“用户相关火车过滤、默认选中相关火车”，本轮已确认暂不纳入；当前以 `/schedules` 班次列表页为入口 |

## 2. 分层测试方案

| 层级 | 结论 | 覆盖重点 | 后续执行 |
|---|---|---|---|
| L1 单元测试 | 已有 `unit-test-governance` 报告判定通过：44 个单测全部通过，单测通过率 100%，覆盖率门禁通过 | `listAllSchedules`、`listTrainSchedules` 字段聚合与分页；`updateTrainScheduleStatus` 状态机；`calculateKeyDates` 日期计算 | `unit-test-governance` |
| L2 API 自动化 | 8 个 API 案例已有专用测试文件覆盖，主路径较完整 | 全局班次列表、分页、排序、指定火车列表、未登录、非管理员创建/状态变更 | 已覆盖，后续补差距项 API |
| L3 UI 自动化 | 尚未看到 US2.3 专用前端自动化；建议只覆盖 P0 主路径和权限显隐高风险点 | `/schedules` 加载、火车切换、详情跳转、未选火车新增提示、角色按钮显隐 | `frontend-web-testing` |
| M 人工验证 | 可替代低风险 UI 展示类场景；不要替代 L1 门禁和 L2 关键契约 | 字段展示、弹窗打开、状态按钮展示、SIT 截图和日志取证 | 已启用，使用 `evidence/US2.3-班次列表查询与火车切换/summary.md` |

## 3. 覆盖现状

| 范围 | 案例数 | 已覆盖 | 部分覆盖 | 缺失 | 可复用测试资产 | 主要缺口 |
|---|---:|---:|---:|---:|---|---|
| 后端接口测试 | 8 | 8 | 0 | 0 | `t2-us2.3-schedule-api.test.ts` | 指定火车分页本身是产品/代码差距，当前测试应保留为 GAP |
| 前端功能测试 | 12 | 0 | 8 | 4 | 代码实现可人工验证，未看到 US2.3 专用前端自动化 | 缺少 L3 或人工验证证据；权限显隐未实现 |
| 差距验证测试 | 3 | 0 | 1 | 2 | 后端返回 `trainName`、现有 API/L1 测试可支撑定位 | 所属火车列、指定火车分页、前端角色按钮显隐 |
| L1 单测 | - | 部分覆盖 | - | - | `train.service.unit.test.ts`、`key-dates.unit.test.ts` | 已有 `reports/unit-test-governance/requirement-T2-US2.3-unit-test-governance.md`，结论为通过 |

## 4. 需求-案例覆盖矩阵

| 需求点/案例组 | 测试案例 | 推荐层级 | 当前覆盖判断 | 待补内容 | 优先级 |
|---|---|---|---|---|---|
| 全局班次列表查询、分页、倒序 | TC2.3-API-01~03 | L1 + L2 | 已覆盖 | 保持 L1 聚合/分页单测和 L2 API 用例同步 | P0 |
| 指定火车班次列表 | TC2.3-API-04~05 | L1 + L2 | 已覆盖 | 如实现后端分页，新增分页参数和 `pagination` 断言 | P0 |
| 登录与权限控制 | TC2.3-API-06~08 | L2 | 已覆盖 | 统一确认错误响应是 HTTP 401/403 还是 200 + `success=false` | P0 |
| `/schedules` 默认加载与火车下拉 | TC2.3-FE-01~04 | L3 或 M | 部分覆盖 | 补 UI 自动化或 SIT 人工验证 evidence | P0/P1 |
| 列表字段展示与详情跳转 | TC2.3-FE-05~06 | L3 或 M | 部分覆盖 | 补“所属火车”列后，再验证字段完整性 | P0 |
| 新增/编辑弹窗 | TC2.3-FE-07~09 | L3 或 M | 部分覆盖 | 补未选火车提示、新增弹窗、编辑弹窗验证 | P0/P1 |
| 状态操作按钮 | TC2.3-FE-10~12 | L3 + L2 | 部分覆盖 | 后端状态流转已有 L1/L2；前端按钮展示需补验证 | P0 |
| 所属火车列差距 | TC2.3-GAP-01 | L3/M | 缺失 | 前端表格增加“所属火车”列并验证 | P1 |
| 指定火车分页差距 | TC2.3-GAP-02 | L1 + L2 | 缺失 | `GET /api/trains/:trainId/schedules` 增加分页参数和返回结构 | P1 |
| 角色按钮显隐差距 | TC2.3-GAP-03 | L3 + L2 | 部分覆盖 | 后端已有权限兜底；前端需按角色隐藏管理类按钮 | P0 |

## 5. 代码影响测试矩阵

| 文件/模块 | 影响逻辑 | 影响案例 | 推荐层级 | 必须覆盖原因 | 后续 skill |
|---|---|---|---|---|---|
| `trains/routes/schedule.ts` | `/api/schedules`、`/api/trains/:trainId/schedules`、创建/更新/删除/状态接口鉴权 | API-01~08、GAP-02 | L2 | 接口契约和权限是 US2.3 后端主保障 | `backend-api-jmeter-testing` 或现有 Vitest API |
| `trains/services/train.service.ts#listAllSchedules` | 全局分页、倒序、字段聚合、`trainName` 返回 | API-01~03、FE-05、GAP-01 | L1 + L2 | 这是单测可隔离逻辑，且服务单测已覆盖主要分支 | `unit-test-governance` |
| `trains/services/train.service.ts#listTrainSchedules` | 指定火车查询、火车不存在、字段聚合；当前无分页 | API-04~05、GAP-02 | L1 + L2 | 差距项需要从服务函数开始补分页能力 | `unit-test-governance` |
| `trains/services/train.service.ts#updateTrainScheduleStatus` | PLANNING/IN_PROGRESS/LOCKED_DOWN/RELEASED 状态流转 | API-08、FE-10~12 | L1 + L2 | 状态机容易回归，已有单测覆盖合法/非法流转 | `unit-test-governance` |
| `utils/key-dates.ts` | 关键日期计算 | FE-05、FE-09 | L1 | 纯函数，必须优先单测，已有边界日期覆盖 | `unit-test-governance` |
| `pages/trains/schedules/index.tsx` | 页面加载、火车切换、分页状态、表格列、按钮显隐、弹窗 | FE-01~12、GAP-01、GAP-03 | L3/M | 用户可见行为集中在此；当前无角色显隐判断 | `frontend-web-testing` 或人工验证 |
| `services/train.ts` | 前端 API 封装 | FE-01~12 | L1/组件测试可选 | 当前页面多处直接用 `api`，服务封装对 US2.3 不是主路径 | 低优先级 |

## 6. 现有测试资产判断

| 现有测试文件 | 可复用覆盖 | 不足 | 处理建议 |
|---|---|---|---|
| `release-train/apps/server/src/__tests__/t2-us2.3-schedule-api.test.ts` | 覆盖 API-01~08，包括分页、排序、认证、权限 | 错误响应状态码与文档口径存在差异，测试按 `success=false` 写 | 保留；若团队决定改 HTTP 状态码，再同步调整测试 |
| `release-train/apps/server/src/modules/trains/services/train.service.unit.test.ts` | 覆盖 `listAllSchedules`、`listTrainSchedules`、状态流转 | 未覆盖指定火车分页，因为代码尚未实现 | 保留；补 GAP-02 时同步加单测 |
| `release-train/apps/server/src/modules/trains/utils/key-dates.unit.test.ts` | 覆盖关键日期纯函数和边界日期 | 与 US2.3 只间接相关 | 作为 L1 门禁资产复用 |
| `reports/unit-test-governance/requirement-T2-US2.3-unit-test-governance.md` | 单测治理结论：44 个单测全部通过，单测通过率 100%，覆盖率门禁通过 | Planner 不重复计算覆盖率 | 后续管理层报告直接引用 |
| 前端 US2.3 专用测试 | 未发现 | FE-01~12 缺自动化或人工 evidence | 优先选择 P0 少量 L3，低风险展示可人工验证 |

## 7. TODO 清单与后续执行

| 优先级 | TODO | 后续 Skill | 输入 | 预期输出 |
|---|---|---|---|---|
| P0 | 引用既有单测治理报告，纳入后续管理层测试报告 | `test-coverage-report` | `reports/unit-test-governance/requirement-T2-US2.3-unit-test-governance.md` | 单测门禁已通过：44/44 通过，覆盖率门禁通过 |
| P0 | 补前端角色按钮显隐：非火车管理员隐藏编辑、取消、开始、封板、投产 | `frontend-web-testing` | `pages/trains/schedules/index.tsx` | UI 测试或人工验证证据 |
| P0 | 补 `/schedules` P0 主路径验证：默认加载、火车切换、详情跳转、未选火车新增提示 | `frontend-web-testing` 或人工验证 | 测试案例 FE-01/03/06/07 | 少量 UI 自动化或 `summary.md` |
| P1 | 增加班次列表“所属火车”列 | 前端实现后再测 | GAP-01 | 字段展示验证 |
| P1 | 指定火车班次列表增加后端分页 | 后端实现 + L1/L2 测试 | GAP-02 | API 和服务单测新增分页断言 |
| P1 | 统一错误响应口径 | 研发/测试共同确认 | API-06~08 | 文档与测试预期一致 |

## 8. 人工验证方案

| UI 场景 | 替代方式 | 是否询问用户 | evidence/summary.md 路径 | 必须证据 | 风险 |
|---|---|---|---|---|---|
| `/schedules` 默认加载、火车下拉、清空筛选 | 可人工验证替代 L3 | 已启用 | `evidence/US2.3-班次列表查询与火车切换/summary.md` | SIT 版本、账号角色、截图 | 低 |
| 列表字段展示、详情跳转、新增/编辑弹窗 | 可人工验证替代 L3 | 已启用 | 同上 | 截图、必要时 Network/HAR | 中 |
| 角色按钮显隐 | 建议优先自动化；人工替代时需多角色截图 | 已启用 | 同上 | 火车管理员与 BA/普通用户截图对比，必要时后端日志 | 中高 |
| 状态操作按钮 | API 已覆盖后端，UI 展示可人工验证 | 已启用 | 同上 | 不同状态班次截图 | 中 |

## 9. 风险提醒

| 风险 | 影响 | 建议 |
|---|---|---|
| 单测门禁结论来源需明确 | Planner 不重复判定门禁，直接引用既有 `unit-test-governance` 报告 | 后续总报告引用 `reports/unit-test-governance/requirement-T2-US2.3-unit-test-governance.md` |
| 前端缺少 US2.3 专用测试或 evidence | PM/测试经理看不到页面行为是否验过 | 至少补 P0 L3 或启用轻量人工验证 `summary.md` |
| 指定火车分页未实现 | 火车下班次数量大时页面一次性加载，和分页要求不一致 | P1 补后端分页与前端分页联动 |
| 前端按钮未按角色隐藏 | 非管理员看到管理按钮，虽然后端会拦截，但体验和验收不一致 | P0 修前端显隐，保留后端权限兜底 |
| 错误响应口径不一致 | 文档写“未认证/无权限错误”，测试实际按 200 + `success=false` | 统一接口错误规范后同步测试案例 |