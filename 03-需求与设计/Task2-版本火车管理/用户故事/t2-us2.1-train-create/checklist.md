# Checklist

## Schema 变更

- [x] Train 模型新增 version 字段（Int，默认1）
- [x] Train 模型时间字段改为可选（startDate?, endDate?, boardingDate?, lockdownDate?, releaseDate?）
- [x] TrainSystem 模型新增团队成员字段（baUserId, pmUserId, techMgrUserId, testMgrUserId, devTeamUserIds）
- [x] TrainSystem 模型新增容量字段（capacityPoints, usedPoints）
- [x] 数据库迁移脚本生成成功

## 后端 API

- [x] POST /api/trains 实现创建版本火车接口
- [x] GET /api/trains 实现查询列表接口，支持分页和状态筛选
- [x] GET /api/trains/:id 实现查询详情接口
- [x] PATCH /api/trains/:id 实现更新接口，包含乐观锁校验
- [x] POST /api/trains/:id/cancel 实现取消接口
- [x] POST /api/trains/:id/systems 实现添加搭载系统接口
- [x] DELETE /api/trains/:id/systems/:systemId 实现移除搭载系统接口
- [x] PATCH /api/trains/:id/systems/:systemId 实现更新系统配置接口
- [x] GET /api/systems/available 实现获取可选系统接口

## 业务逻辑

- [x] 系统冲突校验：一个系统同一时间只能参与一个版本火车
- [x] 乐观锁实现：updateMany + version 字段控制并发
- [x] 权限校验：火车管理员/超级管理员可操作

## 前端页面

- [x] /trains/new 火车创建页面
- [x] /trains/:id 火车详情页面
- [x] /trains/:id/edit 火车编辑页面

## 前端组件

- [x] TrainForm 火车表单组件
- [x] TrainSystemList 搭载系统列表组件
- [x] TrainCreatePage 火车创建页面组件
- [x] TrainDetailPage 火车详情页面组件
- [x] TrainEditPage 火车编辑页面组件

## 前端 Service

- [x] createTrain 创建火车 API 调用
- [x] getTrainList 查询列表 API 调用
- [x] getTrainDetail 查询详情 API 调用
- [x] updateTrain 更新火车 API 调用
- [x] cancelTrain 取消火车 API 调用
- [x] addTrainSystem 添加系统 API 调用
- [x] removeTrainSystem 移除系统 API 调用
- [x] updateTrainSystem 更新系统 API 调用
- [x] getAvailableSystems 获取可选系统 API 调用

## 类型定义

- [x] shared 包新增 CreateTrainRequest 类型
- [x] shared 包新增 TrainListResponse 类型
- [x] shared 包新增 TrainDetail 类型
- [x] shared 包新增 TrainSystemDetail 类型
- [x] shared 包新增相关 DTO 类型

## 测试验证

- [ ] 创建火车-正常流程测试通过
- [ ] 创建火车-系统冲突测试通过
- [ ] 创建火车-无权限测试通过
- [ ] 查询列表-分页筛选测试通过
- [ ] 查询详情-包含搭载系统测试通过
- [ ] 更新-版本冲突测试通过
- [ ] 取消-有纳版需求测试通过
- [ ] 添加系统-容量超范围测试通过
- [ ] 移除系统-有已纳版需求测试通过

## 界面展示

- [x] 火车创建表单字段验证正常
- [x] 搭载系统添加/移除功能正常
- [x] 容量使用率计算正确
- [x] 容量使用率 ≥90% 显示红色预警
