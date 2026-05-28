# Tasks

- [x] Task 1: 数据模型设计
  - [x] SubTask 1.1: 设计 TrainSystemSnapshot 模型（班次容量快照）
  - [x] SubTask 1.2: 创建 Prisma migration（已执行 db push）
  - [x] SubTask 1.3: 更新 shared 包类型定义

- [x] Task 2: TDD - 班次创建服务层测试
  - [x] SubTask 2.1: RED - 编写班次创建基础测试（成功创建、参数校验）
  - [x] SubTask 2.2: GREEN - 实现 createTrainSchedule 函数
  - [x] SubTask 2.3: RED - 编写关键节点计算测试
  - [x] SubTask 2.4: GREEN - 验证关键节点计算逻辑正确
  - [x] SubTask 2.5: RED - 编写容量快照创建测试
  - [x] SubTask 2.6: GREEN - 实现容量快照创建逻辑

- [x] Task 3: 班次创建路由
  - [x] SubTask 3.1: 创建 POST /api/trains/:trainId/schedules 路由
  - [x] SubTask 3.2: 添加 RBAC 权限校验（TRAIN_ADMIN）

- [x] Task 4: 班次编辑功能
  - [x] SubTask 4.1: TDD - 班次编辑测试
  - [x] SubTask 4.2: 实现 updateTrainSchedule 函数（已有）
  - [x] SubTask 4.3: 创建 PATCH /api/trains/:trainId/schedules 路由

- [x] Task 5: 获取班次信息
  - [x] SubTask 5.1: 实现 GET /api/trains/:trainId/schedules 接口
  - [x] SubTask 5.2: 返回班次信息和容量快照

- [x] Task 6: 验证与集成测试
  - [x] SubTask 6.1: 运行所有测试确保通过（12/12 通过）
  - [ ] SubTask 6.2: 验证清单检查

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 2
- Task 4 depends on Task 2
- Task 5 depends on Task 1
- Task 6 depends on Tasks 3, 4, 5

# Test Results Summary
- Total tests: 12
- Passed: 12
- Failed: 0

## Test Coverage
- [x] 创建班次成功 - 火车状态变为 IN_PROGRESS
- [x] 创建班次成功 - 关键节点日期自动计算
- [x] 创建班次成功 - 容量快照已创建
- [x] 火车不存在 - 返回 404
- [x] 火车状态非 PLANNING - 返回业务错误
- [x] 结束时间早于开始时间 - 返回业务错误
- [x] 结束时间等于开始时间 - 返回业务错误
- [x] 不填写班次名称 - 自动生成名称格式
- [x] 填写班次名称 - 使用指定名称
- [x] 编辑班次时间 - 关键节点自动重新计算
- [x] 编辑班次 - 乐观锁校验
- [x] 获取班次信息 - 返回班次详情和容量快照
