# US2.2 火车班次创建 — 验收清单

## 数据模型
- [x] TrainSystemSnapshot 模型已创建（trainId、systemId、scheduleDate、capacityPoints、usedPoints、团队成员配置）
- [x] Prisma migration 已执行
- [ ] shared 包类型定义已更新

## 班次创建 API
- [x] POST /api/trains/:trainId/schedules 接口存在
- [x] 火车不存在返回 404
- [x] 火车状态非 PLANNING 返回业务错误
- [x] 开始时间必填校验
- [x] 结束时间必填校验
- [x] 结束时间早于开始时间返回业务错误
- [ ] 班次名称为空时自动生成「{火车名}第{序号}班」

## 关键节点计算
- [x] 统一纳版日 = 周期过半前的最后一个周五
- [x] 统一封板日 = 投产前一周的周五
- [x] 统一投产日 = 结束时间
- [x] 关键节点日期正确保存到数据库

## 容量快照
- [x] 班次创建时为每个搭载系统创建容量快照
- [x] 快照包含 capacityPoints、usedPoints、团队成员配置
- [ ] 后续调整火车容量不影响班次快照

## 火车状态变更
- [x] 班次创建后火车状态从 PLANNING 变为 IN_PROGRESS
- [x] 火车开始/结束日期已更新
- [x] 火车版本号自增

## 班次编辑 API
- [x] PATCH /api/trains/:trainId/schedules 接口存在
- [x] 乐观锁校验（版本号验证）
- [x] 编辑时间时重新计算关键节点
- [x] 支持手动覆盖关键节点日期

## 班次查询 API
- [x] GET /api/trains/:trainId/schedules 接口存在
- [x] 返回班次信息和容量快照列表
- [x] 返回剩余容量计算

## 权限控制
- [x] 只有 TRAIN_ADMIN 可创建/编辑班次
- [x] 其他角色返回 403 权限错误

## 测试结果
- [x] 12 个 TDD 测试全部通过
