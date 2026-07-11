# US2.3 班次列表查询与火车切换 - 人工验证证据 Summary

## 1. 验证结论
| 项目 | 内容 |
|---|---|
| 验证范围 | TC2.3-GAP-01 所属火车列展示、TC2.3-GAP-02 按火车查询分页、TC2.3-GAP-03 前端权限按钮显隐 |
| 环境 | 待确认（SIT/UAT/本地） |
| 验证账号/角色 | TRAIN_ADMIN（火车管理员）、BA（普通用户） |
| 结论 | 待验证 |
| 风险 | 前端权限按钮未按角色隐藏（安全风险）、按火车查询未分页（性能风险）、班次列表未展示所属火车列（体验风险） |

## 2. 人工验证步骤
| 步骤 | 操作 | 结果 | 证据 |
|---|---|---|---|
| 1 | 使用 TRAIN_ADMIN 角色登录系统，进入班次列表页（/schedules） | 待验证 | screenshots/train-admin-schedule-list.png |
| 2 | 确认班次列表表格是否展示"所属火车"列 | 待验证 | screenshots/schedule-table-columns.png |
| 3 | 使用 TRAIN_ADMIN 角色选择某辆火车，查询该火车下的班次，确认接口响应是否包含分页信息 | 待验证 | screenshots/train-schedule-with-pagination.png, api/train-schedule-response.json |
| 4 | 使用 BA 角色登录系统，进入班次列表页，确认是否能看到"新增班次"按钮和状态变更按钮（开始/封板/投产） | 待验证 | screenshots/ba-user-schedule-list.png |

## 3. 测试案例结果
| 案例 | 场景 | 结果 | 证据 |
|---|---|---|---|
| TC2.3-GAP-01 | 所属火车列展示 | 待验证 | screenshots/schedule-table-columns.png |
| TC2.3-GAP-02 | 按火车查询分页 | 待验证 | screenshots/train-schedule-with-pagination.png, api/train-schedule-response.json |
| TC2.3-GAP-03 | 前端权限按钮显隐 | 待验证 | screenshots/train-admin-schedule-list.png, screenshots/ba-user-schedule-list.png |

## 4. 证据索引
| 类型 | 文件 | 说明 |
|---|---|---|
| 截图 | screenshots/train-admin-schedule-list.png | TRAIN_ADMIN 角色班次列表页截图 |
| 截图 | screenshots/schedule-table-columns.png | 班次列表表格列展示截图 |
| 截图 | screenshots/train-schedule-with-pagination.png | 按火车查询班次截图 |
| 截图 | screenshots/ba-user-schedule-list.png | BA 角色班次列表页截图 |
| API/Network | api/train-schedule-response.json | GET /api/trains/:trainId/schedules 接口响应 |
| 日志 | logs/ | 可选，如遇问题提供 |
| DB 截图 | db/ | 不适用 |

## 5. 残余风险
| 风险 | 影响 | 责任人 | 是否接受 |
|---|---|---|---|
| 前端权限按钮未按角色隐藏 | 非管理员用户可能看到管理按钮，存在越权操作风险 | 前端开发 | 待确认 |
| 按火车查询未分页 | 大数据量时可能导致性能问题 | 后端开发 | 待确认 |
| 班次列表未展示所属火车列 | 影响全局班次识别，用户体验下降 | 前端开发 | 待确认 |