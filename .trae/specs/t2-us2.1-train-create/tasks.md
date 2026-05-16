# Tasks

## 1. Schema 变更

- [x] Task 1.1: 修改 Train 模型 - 新增 version 字段，时间字段改为可选
- [x] Task 1.2: 修改 TrainSystem 模型 - 新增团队成员配置字段和容量字段
- [x] Task 1.3: 生成数据库迁移脚本

## 2. 后端 API 开发

- [ ] Task 2.1: 创建火车模块基础结构 - 创建目录和 index.ts
- [ ] Task 2.2: 实现创建版本火车 API - POST /api/trains
- [ ] Task 2.3: 实现查询版本火车列表 API - GET /api/trains
- [ ] Task 2.4: 实现查询版本火车详情 API - GET /api/trains/:id
- [ ] Task 2.5: 实现更新版本火车 API - PATCH /api/trains/:id
- [ ] Task 2.6: 实现取消版本火车 API - POST /api/trains/:id/cancel
- [ ] Task 2.7: 实现添加搭载系统 API - POST /api/trains/:id/systems
- [ ] Task 2.8: 实现移除搭载系统 API - DELETE /api/trains/:id/systems/:systemId
- [ ] Task 2.9: 实现更新搭载系统 API - PATCH /api/trains/:id/systems/:systemId
- [ ] Task 2.10: 实现获取可选系统列表 API - GET /api/systems/available

## 3. 前端开发

- [ ] Task 3.1: 创建火车 Service 层 - apps/web/src/services/train.ts
- [ ] Task 3.2: 创建火车创建页面 - apps/web/src/pages/trains/create.tsx
- [ ] Task 3.3: 创建火车表单组件 - apps/web/src/components/trains/TrainForm.tsx
- [ ] Task 3.4: 创建火车详情页面 - apps/web/src/pages/trains/[id].tsx
- [ ] Task 3.5: 创建火车编辑页面 - apps/web/src/pages/trains/edit.tsx
- [ ] Task 3.6: 创建搭载系统列表组件 - apps/web/src/components/trains/TrainSystemList.tsx
- [ ] Task 3.7: 配置路由 - 添加 /trains/new, /trains/:id, /trains/:id/edit 路由

## 4. 类型定义

- [ ] Task 4.1: 更新 shared 包类型定义 - 添加新的 DTO 类型
- [ ] Task 4.2: 更新前端 props 和 state 类型

## 5. 测试

- [ ] Task 5.1: 后端接口测试 - 13 个测试用例
- [ ] Task 5.2: 前端功能测试 - 4 个测试用例

# Task Dependencies

```
Schema 变更 (1.1-1.3) ✅
    ↓
后端 API 开发 (2.1-2.10)
    ↓
类型定义更新 (4.1-4.2)
    ↓
前端开发 (3.1-3.7)
    ↓
测试 (5.1-5.2)
```

## 并行执行建议

1. Schema 变更、后端 API、前端可以并行开发（Schema 先行）
2. 后端 API 完成后，前端 Service 层可以开始
3. 前端组件开发可以并行进行
