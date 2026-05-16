# Task 2 版本火车管理实现计划

## 一、项目调研结论

### 1.1 现有代码基础
- **数据库模型**：Prisma schema 已包含 `Train` 和 `TrainSystem` 模型，基础结构完整
- **类型定义**：`@release-train/shared` 包已包含基础的 `Train`、`TrainSystem` 类型和 `TrainStatus` 枚举
- **权限矩阵**：RBAC 权限矩阵已包含火车相关权限（`CREATE_TRAIN`、`MANAGE_TRAIN`、`ROLLBACK_TRAIN`、`COMPLETE_TRAIN`）
- **代码架构**：项目采用清晰的分层架构（路由层 → 服务层 → 数据库层），有完整的错误处理、RBAC 中间件和前后端类型共享

### 1.2 需求范围
根据 PRD，Task 2 需要实现以下核心功能：
1. 版本火车创建与管理（**调整**：火车管理员自由选择开始/结束时间，不再限制固定周期）
2. 搭载系统与团队容量管理
3. 关键节点管控（统一纳版、统一封板、统一投产根据实际周期自动计算）
4. 纳版搭载（含依赖校验、容量校验）
5. 从火车移除
6. 确认投产
7. 回滚
8. 完成版本火车
9. 前端页面（火车列表、火车详情）
10. Task 1 增强：BA 默认系统筛选

### 1.3 需求调整记录
| 调整日期 | 调整内容 | 调整原因 |
|---------|---------|---------|
| 2026-05-15 | 版本火车开始时间和结束时间由火车管理员自由选择，不再限制固定周期 | 更灵活的业务需求 |

---

## 二、实现计划

### 阶段 1：Shared 包类型与错误码扩展
1. 扩展 `packages/shared/src/types/train.ts` 类型定义
   - 补充火车详情响应类型（包含搭载系统、容量信息）
   - 补充创建火车、纳版、移除、投产、回滚的请求/响应类型
   - 补充依赖风险类型
2. 扩展 `packages/shared/src/constants/error-codes.ts` 错误码
   - 添加火车模块相关业务错误码
3. 扩展 `server/src/common/errors/index.ts` 错误工厂方法

### 阶段 2：后端 Service 层实现
1. 创建 `server/src/modules/trains/service.ts` 火车服务层
   - 创建火车
   - 查询火车列表、详情
   - 更新火车信息
   - 纳版搭载（含依赖校验、容量扣减）
   - 从火车移除（含容量释放）
   - 确认投产
   - 回滚
   - 完成火车
   - 辅助函数：计算关键节点时间、校验依赖关系

### 阶段 3：后端路由层实现
1. 创建 `server/src/modules/trains/index.ts` 路由层
   - 注册所有火车相关接口
   - 配置 RBAC 权限验证
2. 更新 `server/src/app.ts` 注册火车路由

### 阶段 4：需求模块增强（Task 1 扩展）
1. 更新 `server/src/modules/requirements/service.ts` 需求服务
   - 增强需求列表查询：支持 BA 默认系统筛选
2. 更新 `server/src/modules/requirements/index.ts` 需求路由

### 阶段 5：前端 Service 层实现
1. 创建 `web/src/services/train.ts` 火车 API 服务
   - 封装所有火车相关接口调用
2. 更新 `web/src/services/requirement.ts` 需求服务
   - 增强需求列表查询，支持 BA 默认系统筛选

### 阶段 6：前端页面实现
1. 更新 `web/src/pages/trains/index.tsx` 火车列表页
2. 创建 `web/src/pages/trains/[id].tsx` 火车详情页（纳版管理、搭载系统、基本信息）
3. 创建火车操作弹窗组件（纳版确认、移除原因、投产确认、回滚原因等）

### 阶段 7：测试
1. 编写后端单元测试 `server/src/__tests__/t2-version-train.test.ts`
2. 编写前端测试
3. 手动测试完整流程

---

## 三、核心文件修改清单

| 文件路径 | 操作类型 | 说明 |
|---------|---------|-----|
| `packages/shared/src/types/train.ts` | 修改 | 扩展火车相关类型 |
| `packages/shared/src/constants/error-codes.ts` | 修改 | 添加火车模块错误码 |
| `release-train/apps/server/src/common/errors/index.ts` | 修改 | 添加火车模块错误工厂方法 |
| `release-train/apps/server/src/modules/trains/service.ts` | 新建 | 火车模块服务层 |
| `release-train/apps/server/src/modules/trains/index.ts` | 新建 | 火车模块路由层 |
| `release-train/apps/server/src/app.ts` | 修改 | 注册火车路由 |
| `release-train/apps/server/src/modules/requirements/service.ts` | 修改 | 增强需求列表查询（BA 默认系统筛选） |
| `release-train/apps/web/src/services/train.ts` | 新建 | 火车 API 服务 |
| `release-train/apps/web/src/services/requirement.ts` | 修改 | 增强需求列表服务 |
| `release-train/apps/web/src/pages/trains/index.tsx` | 修改 | 火车列表页 |
| `release-train/apps/web/src/pages/trains/[id].tsx` | 新建 | 火车详情页 |
| `release-train/apps/web/src/pages/requirements/index.tsx` | 修改 | 需求列表页（BA 默认系统筛选） |
| `release-train/apps/server/src/__tests__/t2-version-train.test.ts` | 新建 | Task 2 单元测试 |

---

## 四、关键业务逻辑设计

### 4.1 火车创建字段设计（调整后）
| 字段 | 说明 |
|------|------|
| 版本火车名称 | 必填，如"2026年Q2第1车" |
| 开始时间 | 必填，火车管理员自由选择（建议选周一） |
| 结束时间 | 必填，火车管理员自由选择（建议选周五） |
| 描述 | 可选，版本火车背景和目标说明 |
| 状态 | 系统自动：计划中/进行中/已完成/已取消 |

### 4.2 关键节点时间计算（调整后）
由于火车管理员自由选择开始/结束时间，关键节点根据实际周期长度自动计算：

**节点定义**：
- **统一纳版日**：周期过半前的最后一个周五
- **统一封板日**：投产前一周的周五
- **统一投产日**：结束时间（火车管理员指定）

**计算规则**：
- 计算实际天数 = 结束时间 - 开始时间 + 1
- 根据实际周期长度动态计算节点位置
- 确保节点日期为周五（封板和投产通常在周五）

**示例**：
| 实际周期 | 统一纳版 | 统一封板 | 统一投产 |
|---------|----------|----------|----------|
| 2周（14天）| 第1周周五 | 第2周周五-7天 | 结束时间 |
| 3周（21天）| 第2周周五 | 第3周周五-7天 | 结束时间 |
| 4周（28天）| 第2周周五 | 第4周周五-7天 | 结束时间 |
| 5周（35天）| 第3周周五 | 第5周周五-7天 | 结束时间 |
| 6周（42天）| 第3周周五 | 第6周周五-7天 | 结束时间 |

### 4.3 依赖风险校验
- 依赖已纳版/已投产：无风险
- 依赖已就绪但未纳版：warning 级别
- 依赖草稿/待评审/已拒绝：high 级别
- 依赖已取消：critical 级别

### 4.4 容量管理
- 纳版时扣减对应系统可用容量
- 移除时释放对应系统容量
- 容量不足时弹窗警告但允许强制纳版

### 4.5 纳版/移除/投产/回滚
- 均使用 Prisma 事务保证数据一致性
- 每次操作都记录状态变更日志
- 检查前置条件和权限

---

## 五、风险与注意事项

1. **依赖关系查询优化**：依赖校验需要查询多个需求状态，注意 N+1 查询问题
2. **并发控制**：纳版操作需要考虑并发情况下的容量扣减一致性
3. **日期处理**：确保关键节点时间计算的正确性，特别是跨月/跨年的情况
4. **状态一致性**：火车状态、需求状态、容量信息的一致性维护
