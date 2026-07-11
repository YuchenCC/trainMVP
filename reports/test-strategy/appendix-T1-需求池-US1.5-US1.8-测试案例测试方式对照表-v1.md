# T1-需求池-US1.5-US1.8 测试案例测试方式对照表

## 1. 统计概览

| 测试方式 | 数量 | 说明 |
|---|---:|---|
| L2 API 集成测试 | 15 | t1-us1-requirement-entry.test.ts 中已实现的 US1.5/US1.8 用例 |
| L1 后端单测 | 0 | 当前无针对 submitReview/reEdit 的独立单测 |
| 缺失 | 1 | 乐观锁冲突场景 |
| 部分覆盖 | 4 | 必填字段校验、审计日志字段验证 |
| 不涉及 | 2 | 批量发起评审 (TC1.5.7/1.5.8) 不在本次 commit 范围 |

## 2. 对照表

### US1.5 发起评审

| 案例 | 测试方式 | 工具 | 覆盖逻辑 | 当前状态 | TODO |
|---|---|---|---|---|---|
| TC1.5.1 BA归属人正常发起评审 | L2 | vitest + supertest | 正常状态流转 DRAFT→PENDING_REVIEW | 已覆盖 | — |
| TC1.5.2 火车管理员发起评审 | L2 | vitest + supertest | 权限矩阵：TRAIN_ADMIN 可发起 | 已覆盖 | — |
| TC1.5.3 超级管理员发起评审 | L2 | vitest + supertest | 权限矩阵：SUPER_ADMIN 可发起 | 已覆盖 | — |
| TC1.5.4 PM不能发起评审 | L2 | vitest + supertest | 权限拒绝：PM 无 SUBMIT_REVIEW 权限 | 已覆盖 | — |
| TC1.5.5 技术经理不能发起评审 | L2 | vitest + supertest | 权限拒绝：TECH_MGR 无 SUBMIT_REVIEW 权限 | 已覆盖 | — |
| TC1.5.6 非归属人BA不能发起评审 | L2 | vitest + supertest | 权限拒绝：非归属 BA 被拦截 | 已覆盖 | — |
| TC1.5.7 批量发起评审 | — | — | 不在本次 commit 范围 | 不涉及 | 后续 batch API 开发时规划 |
| TC1.5.8 批量发起评审含非草稿 | — | — | 不在本次 commit 范围 | 不涉及 | 后续 batch API 开发时规划 |
| TC1.5.9 非草稿状态发起评审 | L2 | vitest + supertest | 状态校验：非 DRAFT 返回 REQUIREMENT_NOT_DRAFT | 已覆盖 | — |
| TC1.5.10 发起评审后不可编辑 | L2 | vitest + supertest | 状态变更后 EDIT 权限校验 | 已覆盖 (隐含) | — |
| TC1.5.11 未登录发起评审 | L2 | vitest + supertest | 鉴权：无 Token 返回 UNAUTHORIZED | 已覆盖 | — |
| TC1.5.x 必填字段不完整 | L1+L2 | vitest | service 层必填字段校验 + schema 校验 | 部分覆盖 | 补充 service 层单测 |
| TC1.5.x 乐观锁冲突 | L1 | vitest | 并发场景下 version 不匹配 | 缺失 | 补充乐观锁冲突单测 |
| TC1.5.x 审计日志记录 | L1+L2 | vitest | StatusLog 字段完整性 | 部分覆盖 | 单测验证各字段 |

### US1.8 重新编辑

| 案例 | 测试方式 | 工具 | 覆盖逻辑 | 当前状态 | TODO |
|---|---|---|---|---|---|
| TC1.8.1 BA正常重新编辑 | L2 | vitest + supertest | 正常状态流转 REJECTED→DRAFT | 已覆盖 | — |
| TC1.8.2 PM正常重新编辑 | L2 | vitest + supertest | 权限矩阵：PM 可重新编辑 | 已覆盖 | — |
| TC1.8.3 PROJECT_MGR不能重新编辑 | L2 | vitest + supertest | 权限拒绝：PROJECT_MGR 无 RE_EDIT 权限 | 已覆盖 | — |
| TC1.8.4 TECH_MGR不能重新编辑 | L2 | vitest + supertest | 权限拒绝：TECH_MGR 无 RE_EDIT 权限 | 已覆盖 | — |
| TC1.8.5 TEST_MGR不能重新编辑 | L2 | vitest + supertest | 权限拒绝：TEST_MGR 无 RE_EDIT 权限 | 已覆盖 | — |
| TC1.8.6 TRAIN_ADMIN不能重新编辑 | L2 | vitest + supertest | 权限拒绝：TRAIN_ADMIN 无 RE_EDIT 权限 | 已覆盖 | — |
| TC1.8.7 SUPER_ADMIN不能重新编辑 | L2 | vitest + supertest | 权限拒绝：SUPER_ADMIN 被显式拦截 | 已覆盖 | — |
| TC1.8.8 草稿状态不能重新编辑 | L2 | vitest + supertest | 状态校验：非 REJECTED 返回 REQUIREMENT_NOT_REJECTED | 已覆盖 | — |
| TC1.8.9 待评审状态不能重新编辑 | L2 | vitest + supertest | 状态校验：非 REJECTED 返回 REQUIREMENT_NOT_REJECTED | 已覆盖 | — |
| TC1.8.x 乐观锁冲突 | L1 | vitest | 并发场景下 version 不匹配 | 缺失 | 补充乐观锁冲突单测 |
| TC1.8.x 审计日志记录 | L1+L2 | vitest | StatusLog 字段完整性 | 部分覆盖 | 单测验证各字段 |

## 3. 建议新建或复用的测试文件

| 类型 | 文件建议 | 覆盖案例 |
|---|---|---|
| L1 单测 (service) | `release-train/apps/server/src/modules/requirements/service.test.ts` | submitReview 乐观锁、必填字段校验、状态机流转 |
| L1 单测 (service) | 同上 | reEdit 乐观锁、权限校验、状态校验 |
| L2 API 测试 | 复用 `t1-us1-requirement-entry.test.ts` | 继续补充异常边界场景 |

## 4. 代码与现有测试资产索引

| 文件/模块 | 影响逻辑 | 关联案例 | 已有测试资产 | 覆盖缺口 | 后续处理 |
|---|---|---|---|---|---|
| requirements/index.ts | 路由注册、参数 schema、RBAC 中间件 | US1.5/US1.8 所有案例 | t1-us1...test.ts | schema 边界组合未全覆盖 | 补充非法参数 API 测试 |
| requirements/service.ts submitReview | 状态校验、权限校验、必填字段、乐观锁、审计日志 | TC1.5.1~1.5.11 | t1-us1...test.ts | 乐观锁冲突、必填字段边界无单测 | 补充 service 单测 |
| requirements/service.ts reEdit | 状态校验、权限校验、乐观锁、审计日志 | TC1.8.1~1.8.9 | t1-us1...test.ts | 乐观锁冲突无单测 | 补充 service 单测 |
| constants/index.ts PERMISSION_MATRIX | 权限矩阵定义 | 所有权限相关案例 | 间接通过集成测试覆盖 | 无独立单测 | 如需可补充 hasPermission 单测 |

## 5. 已确认的人工验证替代 UI 场景

本轮未启用人工验证。如需启用：

| 场景 | 已确认的替代方式 | 替代原因 | 证据要求 | evidence/summary.md 路径 |
|---|---|---|---|---|
| 审计日志时间线展示 | 人工抽查 | UI 展示类，低回归风险 | SIT 截图、操作历史字段核对 | evidence/T1-需求池-US1.5-US1.8/summary.md |
