# Tasks

- [ ] Task 1: 数据模型调整
  - [ ] 新增 TrainSchedule 模型（班次实体）
  - [ ] 调整 TrainSystemSnapshot 关联班次
  - [ ] Prisma migrate
  - [ ] shared 类型更新

- [ ] Task 2: 后端 API
  - [ ] GET /api/trains（支持按用户系统筛选）
  - [ ] GET /api/trains/:trainId/schedules（班次列表）

- [ ] Task 3: 前端
  - [ ] 重构 trains/index.tsx：顶部火车选择器 + 班次列表
  - [ ] 火车切换交互
  - [ ] 班次列表渲染

# Task Dependencies

- Task 2 依赖 Task 1
- Task 3 依赖 Task 2
