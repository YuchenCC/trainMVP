# US2.3 班次列表查询与火车切换 - 测试案例测试方式对照表

| 案例 | 需求 | 后端影响 | 前端影响 | 推荐层级 | 当前证据 | 缺口 | 下游 skill |
|---|---|---|---|---|---|---|---|
| TC2.3-API-01 查询全局班次列表 | BR2.3.1 | `train.service.ts#listAllSchedules` | `schedules/index.tsx#loadScheduleList` | L2 | 已有 API 测试 | 无 | - |
| TC2.3-API-02 全局班次列表分页 | BR2.3.5 | `train.service.ts#listAllSchedules` | `schedules/index.tsx#loadScheduleList` | L2 | 已有 API 测试 | 无 | - |
| TC2.3-API-03 全局班次按创建时间倒序 | BR2.3.4 | `train.service.ts#listAllSchedules` | - | L2 | 已有 API 测试 | 无 | - |
| TC2.3-API-04 查询指定火车班次列表 | BR2.3.3 | `train.service.ts#listTrainSchedules` | `schedules/index.tsx#handleTrainChange` | L2 | 已有 API 测试 | 无分页 | testgov-manual-evidence |
| TC2.3-API-05 查询不存在火车的班次列表 | BR2.3.3 | `train.service.ts#listTrainSchedules` | `schedules/index.tsx#handleTrainChange` | L2 | 已有 API 测试 | 无 | - |
| TC2.3-API-06 未登录不可查询班次列表 | BR2.3.1 | `schedule.ts` 路由鉴权 | - | L2 | 已有 API 测试 | 无 | - |
| TC2.3-API-07 非火车管理员不可创建班次 | BR2.3.10 | `schedule.ts` 路由权限 | - | L2 | 已有 API 测试 | 无 | - |
| TC2.3-API-08 非火车管理员不可变更班次状态 | BR2.3.10 | `schedule.ts` 路由权限 | - | L2 | 已有 API 测试 | 无 | - |
| TC2.3-FE-01 进入班次列表页默认加载全局班次 | BR2.3.1 | - | `schedules/index.tsx` | L3 | 已有 E2E 测试 | 无 | - |
| TC2.3-FE-02 火车下拉加载 | BR2.3.2 | `train.service.ts#listTrains` | `schedules/index.tsx#loadTrainList` | L3 | 已有 E2E 测试 | 无 | - |
| TC2.3-FE-03 切换所属火车刷新班次列表 | BR2.3.3 | `train.service.ts#listTrainSchedules` | `schedules/index.tsx#handleTrainChange` | L3 | 已有 E2E 测试 | 无 | - |
| TC2.3-FE-04 清空所属火车恢复全局列表 | BR2.3.1 | `train.service.ts#listAllSchedules` | `schedules/index.tsx#handleTrainChange` | L3 | 已有 E2E 测试 | 无 | - |
| TC2.3-FE-05 班次列表字段展示 | BR2.3.7 | - | `schedules/index.tsx#scheduleColumns` | L3 | 已有 E2E 测试 | 缺所属火车列 | testgov-manual-evidence |
| TC2.3-FE-06 点击班次行进入详情页 | BR2.3.8 | - | `schedules/index.tsx#onRow` | L3 | 已有 E2E 测试 | 无 | - |
| TC2.3-FE-07 未选择火车时不可新增班次 | BR2.3.10 | - | `schedules/index.tsx#handleCreateSchedule` | L3 | 已有 E2E 测试 | 无 | - |
| TC2.3-FE-08 选择火车后可以打开新增班次弹窗 | BR2.3.10 | `train.service.ts#createTrainSchedule` | `schedules/index.tsx#handleCreateSchedule` | L3 | 已有 E2E 测试 | 无 | - |
| TC2.3-FE-09 编辑班次弹窗 | BR2.3.10 | `train.service.ts#updateTrainSchedule` | `schedules/index.tsx#handleEditSchedule` | L3 | 已有 E2E 测试 | 无 | - |
| TC2.3-FE-10 计划中班次显示开始操作 | BR2.3.9 | `train.service.ts#updateTrainScheduleStatus` | `schedules/index.tsx#scheduleColumns` | L3 | 已有 E2E 测试 | 无 | - |
| TC2.3-FE-11 进行中班次显示封板操作 | BR2.3.9 | `train.service.ts#updateTrainScheduleStatus` | `schedules/index.tsx#scheduleColumns` | L3 | 已有 E2E 测试 | 无 | - |
| TC2.3-FE-12 封板班次显示投产操作 | BR2.3.9 | `train.service.ts#updateTrainScheduleStatus` | `schedules/index.tsx#scheduleColumns` | L3 | 已有 E2E 测试 | 无 | - |
| TC2.3-GAP-01 班次列表未展示所属火车列 | BR2.3.7 | - | `schedules/index.tsx#scheduleColumns` | M | 缺失 | 前端未展示 | testgov-manual-evidence |
| TC2.3-GAP-02 按火车查询班次不支持后端分页 | BR2.3.6 | `train.service.ts#listTrainSchedules` | `schedules/index.tsx#handleTrainChange` | M | 缺失 | 后端未实现分页 | testgov-manual-evidence |
| TC2.3-GAP-03 前端操作按钮未按角色隐藏 | BR2.3.10 | - | `schedules/index.tsx#scheduleColumns` | M | 缺失 | 前端未按角色控制 | testgov-manual-evidence |