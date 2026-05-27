# 数据模型与API集成设计

**版本号**: v1.0  
**日期**: 2026-05-28  
**对应 Issue**: ISSUE-006  
**技术基线**: Prisma schema + Fastify routes + 前端 services

---

## 一、文档目标

本文档说明系统的数据模型、核心关系、API 分组和前后端集成方式。它面向后续维护者和 AI 接手机制，帮助快速判断某个业务能力对应的数据表、接口和前端调用位置。

## 二、数据模型总览

```text
用户与系统:
User
System
SystemMember

需求池:
Requirement
RequirementDependency
StatusLog
EmergencyChange

版本火车:
Train
TrainSystem
TrainSchedule
TrainSystemSnapshot
TrainScheduleKeyDate
```

## 三、核心模型说明

### 3.1 用户与系统

| Model | 作用 | 关键约束 |
|-------|------|----------|
| User | 演示用户和角色载体 | `username`、`email` 唯一；API 响应不返回 `password` |
| System | 业务系统主数据 | `name` 唯一 |
| SystemMember | 用户在系统中的职责 | `systemId + userId + role` 唯一 |

MVP 中用户和系统由 seed 数据预置，不提供完整组织架构和用户管理后台。

### 3.2 需求池

| Model | 作用 | 关键字段 |
|-------|------|----------|
| Requirement | 需求主体 | `reqCode`、`title`、`status`、`subStatus`、`storyPoints`、`scheduleId` |
| RequirementDependency | 前置依赖 | `dependantId`、`dependencyId` |
| StatusLog | 状态和操作审计 | `operationType`、`fromStatus`、`toStatus`、`reason` |
| EmergencyChange | 封板后紧急变更审批 | `urgency`、`status`、`approvalStep`、`approverId` |

需求编号使用 `REQ-{年份}-{4位序号}` 格式。需求状态和子状态由 shared 枚举统一定义。

### 3.3 版本火车与班次

| Model | 作用 | 关键字段 |
|-------|------|----------|
| Train | 版本火车容器 | `name`、`description`、`version` |
| TrainSystem | 火车级系统配置 | `systemId`、`capacityPoints`、人员字段 |
| TrainSchedule | 班次 | `status`、`startDate`、`boardingDate`、`sitDate`、`uatDate`、`lockdownDate`、`releaseDate` |
| TrainSystemSnapshot | 班次容量快照 | `trainScheduleId`、`systemId`、`capacityPoints`、`usedPoints` |
| TrainScheduleKeyDate | 自定义关键日期 | `name`、`date` |

关键设计点：班次创建时复制火车系统配置到 `TrainSystemSnapshot`。后续调整火车级容量不影响已创建班次的历史容量快照。

## 四、关键索引与唯一约束

| 约束 | 业务含义 |
|------|----------|
| `Requirement.reqCode` unique | 需求编号全局唯一 |
| `RequirementDependency(dependantId, dependencyId)` unique | 同一依赖关系不重复 |
| `Requirement(status, subStatus)` index | 支持看板和筛选 |
| `Requirement(systemId)` index | 支持按系统筛选 |
| `Requirement(scheduleId)` index | 支持按班次查询纳版需求 |
| `TrainSystem(trainId, systemId)` unique | 同一火车同一系统只配置一次 |
| `TrainSystem(systemId)` unique | 当前实现中同一系统只能在一个火车中 |
| `TrainSystemSnapshot(trainScheduleId, systemId)` unique | 同一班次同一系统只有一份容量快照 |
| `StatusLog(requirementId, createdAt desc)` index | 支持需求操作时间线 |

## 五、API响应约定

成功响应：

```json
{
  "success": true,
  "data": {}
}
```

分页响应：

```json
{
  "success": true,
  "data": {
    "list": [],
    "total": 0,
    "page": 1,
    "pageSize": 20
  }
}
```

业务错误响应：

```json
{
  "success": false,
  "message": "无权限执行此操作",
  "code": "PERMISSION_DENIED"
}
```

## 六、API分组

### 6.1 认证

| API | 说明 | 前端调用 |
|-----|------|----------|
| `POST /api/auth/login` | 用户登录 | `stores/auth.ts` |
| `GET /api/auth/me` | 获取当前用户 | `stores/auth.ts` |
| `POST /api/auth/seed` | 开发环境创建用户 | 开发调试 |

### 6.2 系统

| API | 说明 | 前端调用 |
|-----|------|----------|
| `GET /api/systems` | 系统列表 | `services/system.ts` |
| `GET /api/systems/:id/users` | 系统成员 | `services/system.ts` |

### 6.3 需求

| API | 说明 | 前端调用 |
|-----|------|----------|
| `GET /api/requirements` | 需求列表分页筛选 | `requirementService.list` |
| `POST /api/requirements` | 创建需求 | `requirementService.create` |
| `GET /api/requirements/:id` | 需求详情 | `requirementService.getById` |
| `PATCH /api/requirements/:id` | 编辑需求 | `requirementService.update` |
| `POST /api/requirements/:id/submit-review` | 发起评审 | `requirementService.submitReview` |
| `POST /api/requirements/:id/review-pass` | 评审通过 | `requirementService.reviewPass` |
| `POST /api/requirements/:id/review-reject` | 评审拒绝 | `requirementService.reviewReject` |
| `POST /api/requirements/:id/re-edit` | 重新编辑 | `requirementService.reEdit` |
| `POST /api/requirements/:id/cancel` | 取消需求 | `requirementService.cancel` |
| `POST /api/requirements/:id/change` | 需求变更 | `requirementService.change` |
| `POST /api/requirements/:id/change-sub-status` | 子状态变更 | `requirementService.changeSubStatus` |
| `POST /api/requirements/:id/emergency-change` | 紧急变更 | `requirementService.emergencyChange` |

### 6.4 火车与班次

| API | 说明 | 前端调用 |
|-----|------|----------|
| `GET /api/trains` | 火车列表 | `trainService.listTrains` |
| `POST /api/trains` | 创建火车 | `trainService.createTrain` |
| `GET /api/trains/:id` | 火车详情 | `trainService.getTrain` |
| `PATCH /api/trains/:id` | 更新火车 | `trainService.updateTrain` |
| `POST /api/trains/:id/cancel` | 取消火车 | `trainService.cancelTrain` |
| `POST /api/trains/:trainId/schedules` | 创建班次 | `trainService.createSchedule` |
| `GET /api/trains/:trainId/schedules` | 班次列表 | `trainService.listSchedules` |
| `GET /api/trains/:trainId/schedules/:scheduleId` | 班次详情 | 页面直接调用 api |
| `PUT/PATCH /api/trains/:trainId/schedules/:scheduleId` | 更新班次 | 页面直接调用 api |
| `POST /api/trains/:trainId/schedules/:scheduleId/status` | 班次状态变更 | 班次列表页 |

### 6.5 纳版操作

| API | 说明 |
|-----|------|
| `GET /api/trains/schedules/:scheduleId/ready-requirements` | 查询班次可纳版需求 |
| `GET /api/trains/schedules/:scheduleId/onboarded-requirements` | 查询已纳版需求 |
| `POST /api/trains/schedules/:scheduleId/onboard/precheck` | 纳版预检查 |
| `POST /api/trains/schedules/:scheduleId/onboard` | 确认纳版 |
| `POST /api/trains/schedules/:scheduleId/requirements/:requirementId/remove` | 从班次移除 |
| `POST /api/trains/schedules/:scheduleId/requirements/:requirementId/release` | 确认投产 |
| `POST /api/trains/schedules/:scheduleId/requirements/:requirementId/rollback` | 回滚 |

### 6.6 智能纳版

| API | 说明 | 前端调用 |
|-----|------|----------|
| `POST /api/smart-onboard/suggest` | 生成智能纳版建议 | `smartOnboardService.suggest` |
| `POST /api/smart-onboard/confirm` | 确认并执行纳版 | `smartOnboardService.confirm` |

### 6.7 仪表盘聚合

| API | 说明 |
|-----|------|
| `GET /api/stats/requirements` | 需求统计 |
| `GET /api/requirements/my-todos` | 用户待办 |
| `GET /api/emergency-changes` | 紧急变更列表 |
| `GET /api/schedules/progress` | 班次进度 |

## 七、权限与鉴权

所有非公开 API 都应通过 `fastify.authenticate` 校验 JWT。涉及业务操作的 API 还应使用 `rbacMiddleware(Operation.xxx)` 校验角色权限。

| 操作类型 | 权限枚举 |
|----------|----------|
| 创建需求 | `Operation.CREATE_REQ` |
| 编辑需求 | `Operation.EDIT_REQ` |
| 评审需求 | `Operation.REVIEW_REQ` |
| 管理火车/班次 | `Operation.MANAGE_TRAIN` |
| 回滚 | `Operation.ROLLBACK_TRAIN` |
| 完成火车/班次 | `Operation.COMPLETE_TRAIN` |

前端按钮隐藏只用于体验，不能作为安全边界。

## 八、前后端集成原则

1. 页面不直接拼接后端域名，统一使用 `services/api.ts`。
2. 通用业务 API 封装在 `services/requirement.ts`、`services/train.ts`、`services/system.ts`、`services/smart-onboard.ts`。
3. 跨端 DTO 和枚举必须从 `@release-train/shared` 引入。
4. 列表接口使用分页，避免一次性返回无限数据。
5. 关键业务操作由后端 service 事务化处理并写入审计日志。

## 九、版本记录

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v1.0 | 2026-05-28 | 初始版本，整理数据模型和 API 集成设计 |
