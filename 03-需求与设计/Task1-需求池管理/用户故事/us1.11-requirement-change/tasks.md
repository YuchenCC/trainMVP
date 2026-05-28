# Tasks

## US1.11 需求变更（普通变更）

- [x] Task 1: 创建需求变更 API `POST /api/requirements/:id/change`
  - [x] SubTask 1.1: 定义 API 路由和请求参数（changeReason 必填，最多500字）
  - [x] SubTask 1.2: 实现权限校验（BA/TRAIN_ADMIN/SUPER_ADMIN）
  - [x] SubTask 1.3: 实现前置条件校验（状态为已就绪或已纳版非封板）
  - [x] SubTask 1.4: 实现状态变更逻辑（状态改为草稿）
  - [x] SubTask 1.5: 实现已纳版需求变更时清除 trainId
  - [x] SubTask 1.6: 实现火车容量释放逻辑
  - [x] SubTask 1.7: 实现审计日志记录（CHANGE_REQUIREMENT）
  - [x] SubTask 1.8: 实现单元测试（15条）

- [x] Task 2: 创建需求变更前端组件
  - [x] SubTask 2.1: 创建需求变更按钮组件（根据状态和角色显示）
  - [x] SubTask 2.2: 创建需求变更弹窗组件（包含变更原因输入框，必填）
  - [x] SubTask 2.3: 实现 API 调用和错误处理
  - [x] SubTask 2.4: 实现成功后刷新详情页
  - [x] SubTask 2.5: 集成测试（8条）

# Task Dependencies
- Task 2 依赖 Task 1（API 需要先实现）
