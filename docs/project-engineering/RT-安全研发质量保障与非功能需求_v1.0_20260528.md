# 安全研发、质量保障与非功能需求

**版本号**: v1.0  
**日期**: 2026-05-28  
**对应 Issue**: ISSUE-008  
**竞赛定位**: 安全研发与非功能性需求加分材料

---

## 一、文档目标

本文档整合项目安全规范、编码规范、测试资产和非功能需求，说明版本火车需求管理系统不仅实现业务功能，也具备可维护、可审计、可验证和可安全演进的工程基础。

## 二、安全研发总览

| 安全域 | 当前设计 |
|--------|----------|
| 身份认证 | JWT 登录认证，payload 仅包含非敏感字段 |
| 密码安全 | bcrypt 哈希存储 |
| 权限控制 | shared 权限矩阵 + 后端 RBAC 中间件 |
| 输入校验 | Fastify schema 校验请求体、路径参数和查询参数 |
| 数据访问 | Prisma ORM 参数化查询 |
| 敏感信息 | API 响应剔除 password、ssoId；日志 redact token/password |
| 错误处理 | 统一错误工厂和错误码 |
| 审计 | 需求状态变化写入 `StatusLog` |
| CORS | 白名单配置，不使用任意通配 |

## 三、认证与权限

### 3.1 JWT认证

登录成功后服务端签发 JWT。JWT payload 只包含：

- `sub`：用户 ID。
- `username`：用户名。
- `role`：角色。

不包含密码、SSO 标识、系统权限明细等敏感或易变字段。

### 3.2 RBAC权限矩阵

权限统一定义在 `packages/shared/src/constants/index.ts`，前后端共享。前端通过 `hasPermission` 控制按钮显示，后端通过 `rbacMiddleware` 做真正安全校验。

关键原则：

1. 前端隐藏按钮不代表安全。
2. 所有状态变更类 API 必须有服务端权限校验。
3. 超级管理员可兜底，但仍需记录审计。

## 四、OWASP Top 10 对照

| 风险 | 项目措施 |
|------|----------|
| 注入攻击 | 使用 Prisma ORM，禁止拼接 SQL |
| 身份认证失效 | bcrypt、JWT、登录输入清理、限流 |
| 敏感数据泄露 | SafeUser 不返回 password/ssoId；日志脱敏 |
| 越权访问 | RBAC 中间件和 service 业务校验 |
| 安全配置错误 | CORS 白名单、生产 HTTPS 重定向、Swagger 可按环境控制 |
| XSS | 后端 sanitize-html，前端 React 默认转义 |
| 不安全反序列化 | API 使用 JSON，不使用 eval |
| 使用脆弱组件 | pnpm lockfile，建议定期 pnpm audit |
| 日志监控不足 | correlationId、应用日志、错误日志、状态日志 |

## 五、输入校验与错误处理

后端路由普遍使用 Fastify schema：

- 创建/编辑需求校验标题、描述、优先级、点数、依赖数组。
- 班次创建校验开始/结束日期。
- 纳版和批量操作校验 requirementIds。
- 取消、移除、回滚等原因字段限制长度。

错误处理遵循统一响应：

```json
{
  "success": false,
  "message": "请求参数错误",
  "code": "BAD_REQUEST"
}
```

业务错误和技术错误通过 shared 错误码注册表区分，便于前端统一处理。

## 六、审计与可追溯性

需求状态变化通过 `StatusLog` 记录：

| 字段 | 说明 |
|------|------|
| `operationType` | 操作类型 |
| `fromStatus` / `toStatus` | 主状态变化 |
| `fromSubStatus` / `toSubStatus` | 子状态变化 |
| `reason` | 操作原因 |
| `operatorId` | 操作人 |
| `createdAt` | 操作时间 |

紧急变更通过 `EmergencyChange` 记录审批状态、审批人、审批时间和拒绝原因。

## 七、测试资产

### 7.1 后端测试

| 测试文件 | 覆盖内容 |
|----------|----------|
| `t0-framework.test.ts` | 基础框架 |
| `t0-security.test.ts` | 安全和鉴权 |
| `t1-us1-requirement-entry.test.ts` | 需求录入 |
| `t1-us1.4-requirement-detail-risklevel.test.ts` | 需求详情和风险等级 |
| `t1-us1.11-requirement-change.test.ts` | 需求变更 |
| `t2-us2.1-train-crud.test.ts` | 火车 CRUD |
| `t2-us2.2-train-schedule-create.test.ts` | 班次创建 |
| `t2-us2.2x-schedule-ext.test.ts` | 关键日期扩展 |

### 7.2 前端测试

| 测试文件 | 覆盖内容 |
|----------|----------|
| `t1-us1.3-requirement-list.test.tsx` | 需求列表查询、筛选和交互 |

### 7.3 智能纳版测试设计

Task3 测试案例覆盖：

- 容量充足、刚好、不足、为 0。
- 优先级排序。
- 同优先级点数排序。
- 简单依赖、链式依赖、取消依赖、循环依赖。
- 空列表、非 READY 状态。
- 前后端集成和 E2E 场景。

## 八、当前质量缺口

| 缺口 | 影响 | 建议 |
|------|------|------|
| 当前环境 pnpm/docker 未直接可用 | 无法立即完整跑构建和容器验证 | 在运行手册记录环境修复步骤 |
| 仪表盘专项测试不足 | Task4 回归风险较高 | 补充 dashboard hook 和组件测试 |
| 智能纳版自动化测试不足 | AI/规则链路回归不稳定 | 将 Task3 测试案例转为 Vitest |
| 资源归属校验需持续审查 | 可能出现水平越权 | 对详情和操作 API 增加资源级权限测试 |
| 文档与代码版本存在历史漂移 | 后续 AI 接手误判 | 以工程文档包更新统一基线 |

## 九、非功能需求

| 类型 | 要求 | 当前支撑 |
|------|------|----------|
| 性能 | 首屏加载 <= 3 秒，列表查询 <= 2 秒 | 分页查询、聚合 API |
| 安全 | 鉴权、RBAC、输入校验、日志脱敏 | Fastify + JWT + shared 权限矩阵 |
| 兼容性 | Chrome、Firefox、Edge 主流版本 | React + Ant Design |
| 可维护性 | 分层架构、shared 类型、模块化 service | pnpm monorepo |
| 可观测性 | 请求日志、错误日志、correlationId | common/logger |
| 可审计性 | 状态日志、紧急变更记录 | StatusLog、EmergencyChange |
| 可演示性 | seed 数据、测试账号、Swagger | seed.ts、测试账号文档 |

## 十、竞赛加分点表达

本项目可从以下角度展示工程质量：

1. **安全研发**：服务端权限、输入校验、日志脱敏和审计完整。
2. **非功能性需求**：性能、兼容性、可维护性和可观测性有明确设计。
3. **AI可信边界**：智能纳版中 AI 只解释，不直接执行业务状态变更。
4. **质量闭环**：PRD、设计、测试、代码、handoff 和工程文档互相映射。

## 十一、版本记录

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v1.0 | 2026-05-28 | 初始版本，整合安全研发、测试质量和非功能需求 |
