# US2.3 班次列表查询与火车切换 测试案例测试方式对照表

## 1. 统计概览

| 测试方式 | 数量 | 说明 |
|---|---:|---|
| L1 单元测试 | 6 | 覆盖服务层列表聚合、分页、排序、状态流转、关键日期纯函数 |
| L2 API 自动化 | 8 | 覆盖 TC2.3-API-01~08，已有测试文件 |
| L3 UI 自动化 | 4 | 建议只覆盖 P0 主路径和角色按钮显隐 |
| M 人工验证 | 8 | 可替代低风险 UI 展示、弹窗和截图类验收 |
| 差距验证 | 3 | 所属火车列、指定火车分页、角色按钮显隐 |

## 2. 对照表

| 案例 | 测试方式 | 工具 | 覆盖逻辑 | 当前状态 | TODO |
|---|---|---|---|---|---|
| TC2.3-API-01 查询全局班次列表 | L1 + L2 | Vitest service + API | 返回 `list/pagination`、字段含 `trainName` | 已覆盖 | 保持 |
| TC2.3-API-02 全局班次列表分页 | L1 + L2 | Vitest service + API | 默认/自定义分页、边界参数 | 已覆盖 | 统一错误响应口径 |
| TC2.3-API-03 全局班次按创建时间倒序 | L1 + L2 | Vitest service + API | `orderBy createdAt desc` | 已覆盖 | 保持 |
| TC2.3-API-04 查询指定火车班次列表 | L1 + L2 | Vitest service + API | 只返回指定 `trainId` 班次 | 已覆盖 | 若补分页需新增断言 |
| TC2.3-API-05 查询不存在火车 | L1 + L2 | Vitest service + API | 火车不存在抛错/返回失败 | 已覆盖 | 保持 |
| TC2.3-API-06 未登录不可查询 | L2 | API | 认证失败 | 已覆盖 | 确认 HTTP 状态码口径 |
| TC2.3-API-07 非管理员不可创建 | L2 | API | `MANAGE_TRAIN` 权限拦截 | 已覆盖 | 保持 |
| TC2.3-API-08 非管理员不可变更状态 | L1 + L2 | API + service | 权限拦截、管理员状态变更成功 | 已覆盖 | 保持 |
| TC2.3-FE-01 默认加载全局班次 | L3 或 M | Playwright/人工 | 页面标题、下拉、表格、分页 | 部分覆盖 | 补 UI 自动化或 evidence |
| TC2.3-FE-02 火车下拉加载 | L3 或 M | Playwright/人工 | `GET /trains` 后显示选项 | 部分覆盖 | 补截图/自动化 |
| TC2.3-FE-03 切换火车刷新列表 | L3 | Playwright | 选择火车后只显示该火车班次 | 部分覆盖 | 建议自动化 |
| TC2.3-FE-04 清空火车恢复全局列表 | L3 或 M | Playwright/人工 | 清空后调用全局列表并恢复分页 | 部分覆盖 | 补验证 |
| TC2.3-FE-05 班次列表字段展示 | M | 人工截图 | 当前字段展示 | 部分覆盖 | 所属火车列仍缺 |
| TC2.3-FE-06 点击班次行进入详情页 | L3 | Playwright | 路由跳转详情页 | 部分覆盖 | 建议自动化 |
| TC2.3-FE-07 未选火车不可新增 | L3 或 M | Playwright/人工 | 提示“请先选择所属火车” | 部分覆盖 | 补验证 |
| TC2.3-FE-08 选择火车后打开新增弹窗 | M | 人工截图 | 新增弹窗字段 | 部分覆盖 | 补 evidence |
| TC2.3-FE-09 编辑班次弹窗 | M | 人工截图 | 编辑弹窗字段和关键日期 | 部分覆盖 | 补 evidence |
| TC2.3-FE-10 计划中显示开始操作 | L3 或 M | Playwright/人工 | 状态按钮展示 | 部分覆盖 | 需叠加角色校验 |
| TC2.3-FE-11 进行中显示封板操作 | L3 或 M | Playwright/人工 | 状态按钮展示 | 部分覆盖 | 需叠加角色校验 |
| TC2.3-FE-12 封板显示投产操作 | L3 或 M | Playwright/人工 | 状态按钮展示 | 部分覆盖 | 需叠加角色校验 |
| TC2.3-GAP-01 所属火车列 | L3/M | 前端验证 | 后端有 `trainName`，前端未展示列 | 缺失 | 增加列后验证 |
| TC2.3-GAP-02 指定火车分页 | L1 + L2 | service + API | 当前无分页参数/返回 | 缺失 | 后端实现分页后补测 |
| TC2.3-GAP-03 角色按钮显隐 | L3 + L2 | Playwright/API | 后端拦截，前端未隐藏 | 部分覆盖 | P0 修 UI 并测 |

## 3. 建议新建或复用的测试文件

| 类型 | 文件建议 | 覆盖案例 |
|---|---|---|
| 复用 L2 API | `release-train/apps/server/src/__tests__/t2-us2.3-schedule-api.test.ts` | API-01~08 |
| 复用 L1 service | `release-train/apps/server/src/modules/trains/services/train.service.unit.test.ts` | API-01~05、API-08、GAP-02 后续 |
| 复用 L1 utils | `release-train/apps/server/src/modules/trains/utils/key-dates.unit.test.ts` | FE-05/09 相关关键日期 |
| 新建 L3 UI | `release-train/apps/web/tests/e2e/t2-us2.3-schedules.spec.ts` | FE-01/03/06/07、GAP-03 |
| 人工验证 evidence | `evidence/US2.3-班次列表查询与火车切换/summary.md` | FE-02/04/05/08/09/10~12 |

## 4. 不建议放进单测的内容

| 内容 | 原因 |
|---|---|
| 页面是否真的渲染“班次列表”标题 | 需要浏览器/DOM，适合 L3 或人工验证 |
| 下拉框展开视觉效果 | UI 交互，不适合 service 单测 |
| 点击行跳转路由 | 需要路由和浏览器环境，适合 L3 |
| 弹窗打开、按钮文案、截图类字段展示 | 低风险 UI，可用 L3 或人工验证 |
| 非管理员是否“看到”按钮 | 前端渲染行为，不能只靠后端单测 |

## 5. 单测可以考虑的点

| 单测点 | 前提 |
|---|---|
| `listAllSchedules` 默认分页、自定义分页、空列表、排序、字段聚合 | 已有，可复用 |
| `listTrainSchedules` 火车存在/不存在、字段聚合、空列表 | 已有，可复用 |
| 指定火车分页参数、`skip/take`、`pagination` 返回 | 需要先实现 GAP-02 |
| `updateTrainScheduleStatus` 合法/非法状态流转 | 已有，可复用 |
| 关键日期 `calculateKeyDates` 和日期工具函数 | 已有，可复用 |
| 前端按钮显隐逻辑 | 如从组件中抽出 `canManageSchedule(role, status)` 之类 helper，才能优先单测 |

## 6. 可人工验证替代的 UI 场景

| 场景 | 替代原因 | 是否需要创建轻量 evidence | summary.md 填写要求 |
|---|---|---|---|
| 火车下拉加载、清空筛选 | 低风险展示与筛选行为 | 是，用户确认后创建 | 记录账号、SIT 地址、截图、筛选前后数据 |
| 列表字段展示 | 截图即可说明展示情况 | 是 | 标明是否包含“所属火车”列 |
| 新增/编辑弹窗 | 弹窗字段展示，自动化收益一般 | 是 | 截图 + 操作路径 |
| 状态按钮展示 | 可人工验证，但角色显隐风险较高 | 是 | 分状态截图；角色显隐需多角色截图 |
| 详情跳转 | 建议自动化，人工可作为补充 | 可选 | 截图跳转前后 URL 和页面标题 |