# US2.3 班次列表查询与火车切换 - 人工验证报告

## 1. 已创建证据目录
- `evidence/US2.3-班次列表查询与火车切换/summary.md`
- `evidence/US2.3-班次列表查询与火车切换/screenshots/`
- `evidence/US2.3-班次列表查询与火车切换/api/`
- `evidence/US2.3-班次列表查询与火车切换/logs/`

## 2. 需要人工补充的证据
| 证据 | 放置目录 | 说明 |
|---|---|---|
| TRAIN_ADMIN 角色班次列表页截图 | screenshots/train-admin-schedule-list.png | 确认管理员可见的按钮和表格列 |
| 班次列表表格列展示截图 | screenshots/schedule-table-columns.png | 确认是否包含"所属火车"列 |
| 按火车查询班次截图 | screenshots/train-schedule-with-pagination.png | 确认查询结果和分页信息 |
| BA 角色班次列表页截图 | screenshots/ba-user-schedule-list.png | 确认普通用户可见的按钮和表格列 |
| GET /api/trains/:trainId/schedules 接口响应 | api/train-schedule-response.json | 确认响应结构是否包含 pagination |

## 3. 人工验证步骤指引（3-5步）
1. 使用 **TRAIN_ADMIN** 角色登录系统，进入班次列表页（/schedules），截图保存到 `screenshots/train-admin-schedule-list.png`
2. 确认班次列表表格列，截图保存到 `screenshots/schedule-table-columns.png`
3. 选择某辆火车，查询班次，截图保存到 `screenshots/train-schedule-with-pagination.png`，并保存 API 响应到 `api/train-schedule-response.json`
4. 使用 **BA** 角色登录系统，进入班次列表页，截图保存到 `screenshots/ba-user-schedule-list.png`
5. 填写 `summary.md` 中的验证结论和残余风险接受状态

## 4. 给最终报告的摘要
- 人工验证结论：待验证（3个差距项需要人工确认）
- 证据完整性：证据目录已创建，等待人工补充截图和 API 响应
- 主要风险：前端权限按钮未按角色隐藏（P0）、按火车查询未分页（P1）、班次列表未展示所属火车列（P1）