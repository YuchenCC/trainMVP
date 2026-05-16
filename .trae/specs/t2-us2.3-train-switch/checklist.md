# US2.3 班次列表与火车切换 — 验收清单

## 数据模型
- [ ] TrainSchedule 模型已创建（trainId, name, startDate, endDate, boardingDate, lockdownDate, releaseDate, status）
- [ ] TrainSystemSnapshot.trainId + scheduleDate 唯一索引
- [ ] Prisma migrate 执行成功
- [ ] shared 类型定义已更新

## 后端 API
- [ ] GET /api/trains：支持筛选用户相关系统的火车
- [ ] GET /api/trains/:trainId/schedules：返回班次列表
- [ ] 权限：任意登录用户可访问班次列表
- [ ] 班次列表按创建时间倒序排列

## 前端
- [ ] 页面顶部显示火车选择器（Select 组件）
- [ ] 默认选中第一辆火车（或用户上次访问的）
- [ ] 班次列表渲染：班次名称、时间、状态、关键节点等
- [ ] 点击班次跳转详情页
- [ ] 切换火车时刷新班次列表
