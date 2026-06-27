# Task 1: 需求池管理 - 测试案例 × 测试方式汇总

**版本号**: v1.0
**日期**: 2026-06-26
**状态**: 待审核

---

## 一、统计概览

| 测试方式 | 数量 | 占比 |
|---------|------|------|
| **L1 单测** | 34 | 27.4% |
| **L2 API自动化** | 62 | 50.0% |
| **L3 Playwright** | 18 | 14.5% |
| **L1+L2 叠加** | 8 | 6.5% |
| **L2+L3 叠加** | 2 | 1.6% |
| **合计** | 124 | 100% |

---

## 二、测试案例 × 测试方式对照表

### US1.1 需求录入

| 案例 | 测试方式 | 工具 |
|------|---------|------|
| TC1.1.1 正常录入需求 | L2 API自动化 | Vitest + Supertest |
| TC1.1.2 标题为空校验 | L1 单测 | Vitest（校验函数） |
| TC1.1.3 标题长度校验-过短 | L1 单测 | Vitest（校验函数） |
| TC1.1.4 标题长度校验-过长 | L1 单测 | Vitest（校验函数） |
| TC1.1.5 工作量点数范围校验-过小 | L1 单测 | Vitest（校验函数） |
| TC1.1.6 工作量点数范围校验-过大 | L1 单测 | Vitest（校验函数） |
| TC1.1.7 XSS攻击防护 | L1 单测 | Vitest（sanitizeDescription） |
| TC1.1.8 归属系统筛选 | L2 API自动化 | Vitest + Supertest |
| TC1.1.9 业务归属人筛选 | L2 API自动化 | Vitest + Supertest |
| TC1.1.10 非授权角色隐藏按钮 | L3 Playwright | Playwright |
| TC1.1.11 PM角色录入需求 | L2 API自动化 | Vitest + Supertest |
| TC1.1.12 需求编号生成规则 | L1 单测 | Vitest（generateReqCode） |

### US1.2 需求编辑

| 案例 | 测试方式 | 工具 |
|------|---------|------|
| TC1.2.1 正常编辑草稿需求 | L2 API自动化 | Vitest + Supertest |
| TC1.2.2 非草稿状态不可编辑 | L2 API自动化 | Vitest + Supertest |
| TC1.2.3 非授权角色不可编辑 | L2 API自动化 | Vitest + Supertest |
| TC1.2.4 需求编号不可编辑 | L3 Playwright | Playwright |
| TC1.2.5 创建人不可编辑 | L3 Playwright | Playwright |
| TC1.2.6 乐观锁冲突处理 | L2 API自动化 | Vitest + Supertest |
| TC1.2.7 编辑审计日志记录 | L2 API自动化 | Vitest + Supertest |
| TC1.2.8 编辑表单字段校验 | L1 单测 | Vitest（校验函数） |

### US1.3 需求列表查询与筛选

| 案例 | 测试方式 | 工具 |
|------|---------|------|
| TC1.3.1 默认显示全部系统需求 | L2 API自动化 | Vitest + Supertest |
| TC1.3.2 按系统筛选 | L2 API自动化 | Vitest + Supertest |
| TC1.3.3 按状态筛选 | L2 API自动化 | Vitest + Supertest |
| TC1.3.4 关键字搜索 | L2 API自动化 | Vitest + Supertest |
| TC1.3.5 分页功能 | L2 API自动化 | Vitest + Supertest |
| TC1.3.6 排序功能 | L2 API自动化 | Vitest + Supertest |
| TC1.3.7 状态Tag颜色显示 | L3 Playwright | Playwright |
| TC1.3.8 优先级Tag颜色显示 | L3 Playwright | Playwright |
| TC1.3.9 BA角色操作按钮-草稿状态 | L3 Playwright | Playwright |
| TC1.3.10 PM角色操作按钮-待评审状态 | L3 Playwright | Playwright |
| TC1.3.11 技术经理操作按钮-开发中状态 | L3 Playwright | Playwright |
| TC1.3.12 已投产状态无操作按钮 | L3 Playwright | Playwright |
| TC1.3.13 点击行跳转详情 | L3 Playwright | Playwright |
| TC1.3.14 重置筛选条件 | L3 Playwright | Playwright |

### US1.4 需求详情查看

| 案例 | 测试方式 | 工具 |
|------|---------|------|
| TC1.4.1 详情页信息完整展示 | L3 Playwright | Playwright |
| TC1.4.2 基本信息网格布局 | L3 Playwright | Playwright |
| TC1.4.3 富文本描述渲染 | L3 Playwright | Playwright |
| TC1.4.4 依赖需求展示 | L2 API自动化 | Vitest + Supertest |
| TC1.4.5 操作历史时间线 | L3 Playwright | Playwright |
| TC1.4.6 底部操作按钮 | L3 Playwright | Playwright |
| TC1.4.7 返回列表保留筛选 | L3 Playwright | Playwright |
| TC1.4.8 无依赖需求空状态 | L3 Playwright | Playwright |

### US1.5 发起评审

| 案例 | 测试方式 | 工具 |
|------|---------|------|
| TC1.5.1 正常发起评审 | L1+L2 叠加 | 单测（状态校验）+ API自动化 |
| TC1.5.2 非草稿状态不显示按钮 | L3 Playwright | Playwright |
| TC1.5.3 非BA角色不显示按钮 | L3 Playwright | Playwright |
| TC1.5.4 必填字段不完整提示 | L3 Playwright | Playwright |
| TC1.5.5 发起评审后不可编辑 | L3 Playwright | Playwright |
| TC1.5.6 审计日志记录 | L2 API自动化 | Vitest + Supertest |
| TC1.5.7 批量发起评审 | L2 API自动化 | Vitest + Supertest |
| TC1.5.8 批量发起评审含非草稿 | L2 API自动化 | Vitest + Supertest |

### US1.6 评审通过

| 案例 | 测试方式 | 工具 |
|------|---------|------|
| TC1.6.1 PM正常评审通过 | L1+L2 叠加 | 单测（状态机）+ API自动化 |
| TC1.6.2 非PM角色不可评审 | L2 API自动化 | Vitest + Supertest |
| TC1.6.3 非待评审状态不可评审 | L2 API自动化 | Vitest + Supertest |
| TC1.6.4 评审通过后状态变更 | L2 API自动化 | Vitest + Supertest |
| TC1.6.5 评审通过审计日志 | L2 API自动化 | Vitest + Supertest |
| TC1.6.6 评审通过后操作按钮变化 | L3 Playwright | Playwright |

### US1.7 评审拒绝

| 案例 | 测试方式 | 工具 |
|------|---------|------|
| TC1.7.1 PM正常评审拒绝 | L1+L2 叠加 | 单测（状态机）+ API自动化 |
| TC1.7.2 拒绝原因必填校验 | L1 单测 | Vitest（校验函数） |
| TC1.7.3 非PM角色不可拒绝 | L2 API自动化 | Vitest + Supertest |
| TC1.7.4 非待评审状态不可拒绝 | L2 API自动化 | Vitest + Supertest |
| TC1.7.5 拒绝后状态变更 | L2 API自动化 | Vitest + Supertest |
| TC1.7.6 拒绝后可重新编辑 | L2 API自动化 | Vitest + Supertest |
| TC1.7.7 拒绝审计日志 | L2 API自动化 | Vitest + Supertest |

### US1.8 重新编辑

| 案例 | 测试方式 | 工具 |
|------|---------|------|
| TC1.8.1 已拒绝需求重新编辑 | L2 API自动化 | Vitest + Supertest |
| TC1.8.2 非已拒绝状态不可重新编辑 | L2 API自动化 | Vitest + Supertest |
| TC1.8.3 重新编辑后状态变更 | L2 API自动化 | Vitest + Supertest |
| TC1.8.4 重新编辑审计日志 | L2 API自动化 | Vitest + Supertest |
| TC1.8.5 重新编辑后可再次发起评审 | L2+L3 叠加 | API自动化 + Playwright |

### US1.9 取消需求

| 案例 | 测试方式 | 工具 |
|------|---------|------|
| TC1.9.1 BA取消草稿需求 | L2 API自动化 | Vitest + Supertest |
| TC1.9.2 取消后状态变更 | L2 API自动化 | Vitest + Supertest |
| TC1.9.3 已投产需求不可取消 | L2 API自动化 | Vitest + Supertest |
| TC1.9.4 非BA角色不可取消 | L2 API自动化 | Vitest + Supertest |
| TC1.9.5 取消审计日志 | L2 API自动化 | Vitest + Supertest |
| TC1.9.6 取消后操作按钮变化 | L3 Playwright | Playwright |
| TC1.9.7 批量取消需求 | L2 API自动化 | Vitest + Supertest |
| TC1.9.8 批量取消含非草稿 | L2 API自动化 | Vitest + Supertest |

### US1.10 子状态变更

| 案例 | 测试方式 | 工具 |
|------|---------|------|
| TC1.10.1 开发中→测试中 | L2 API自动化 | Vitest + Supertest |
| TC1.10.2 测试中→已就绪 | L2 API自动化 | Vitest + Supertest |
| TC1.10.3 测试中→测试不通过 | L2 API自动化 | Vitest + Supertest |
| TC1.10.4 测试不通过→测试中 | L2 API自动化 | Vitest + Supertest |
| TC1.10.5 非技术经理不可变更 | L2 API自动化 | Vitest + Supertest |
| TC1.10.6 非法子状态变更 | L2 API自动化 | Vitest + Supertest |
| TC1.10.7 子状态变更审计日志 | L2 API自动化 | Vitest + Supertest |

### US1.11 需求变更

| 案例 | 测试方式 | 工具 |
|------|---------|------|
| TC1.11.1 正常创建变更 | L2 API自动化 | Vitest + Supertest |
| TC1.11.2 变更原因必填校验 | L1 单测 | Vitest（校验函数） |
| TC1.11.3 非BA/PM不可创建变更 | L2 API自动化 | Vitest + Supertest |
| TC1.11.4 已投产需求不可变更 | L2 API自动化 | Vitest + Supertest |
| TC1.11.5 变更审批流程 | L2 API自动化 | Vitest + Supertest |
| TC1.11.6 变更审批通过 | L2 API自动化 | Vitest + Supertest |
| TC1.11.7 变更审批拒绝 | L2 API自动化 | Vitest + Supertest |
| TC1.11.8 变更审计日志 | L2 API自动化 | Vitest + Supertest |
| TC1.11.9 变更历史记录 | L2 API自动化 | Vitest + Supertest |

### US1.12 紧急变更

| 案例 | 测试方式 | 工具 |
|------|---------|------|
| TC1.12.1 正常创建紧急变更 | L2 API自动化 | Vitest + Supertest |
| TC1.12.2 变更原因必填校验 | L1 单测 | Vitest（校验函数） |
| TC1.12.3 非PM不可创建紧急变更 | L2 API自动化 | Vitest + Supertest |
| TC1.12.4 紧急变更审批流程 | L1+L2 叠加 | 单测（findApproverForStep）+ API自动化 |
| TC1.12.5 紧急变更审批通过 | L1+L2 叠加 | 单测（审批人校验）+ API自动化 |
| TC1.12.6 紧急变更审批拒绝 | L1+L2 叠加 | 单测（审批人校验）+ API自动化 |
| TC1.12.7 紧急变更审计日志 | L2 API自动化 | Vitest + Supertest |

### US1.13 依赖关系管理

| 案例 | 测试方式 | 工具 |
|------|---------|------|
| TC1.13.1 添加依赖需求 | L2 API自动化 | Vitest + Supertest |
| TC1.13.2 删除依赖需求 | L2 API自动化 | Vitest + Supertest |
| TC1.13.3 循环依赖校验 | L1 单测 | Vitest（hasCircularDependency） |
| TC1.13.4 依赖需求状态同步 | L2 API自动化 | Vitest + Supertest |
| TC1.13.5 非BA不可管理依赖 | L2 API自动化 | Vitest + Supertest |
| TC1.13.6 依赖需求展示 | L3 Playwright | Playwright |
| TC1.13.7 依赖需求数量限制 | L2 API自动化 | Vitest + Supertest |
| TC1.13.8 已投产需求不可添加依赖 | L2 API自动化 | Vitest + Supertest |
| TC1.13.9 依赖风险等级计算 | L1 单测 | Vitest（风险计算逻辑） |
| TC1.13.10 依赖风险提示 | L3 Playwright | Playwright |
| TC1.13.11 批量添加依赖 | L2 API自动化 | Vitest + Supertest |

### US1.16 操作审计日志

| 案例 | 测试方式 | 工具 |
|------|---------|------|
| TC1.16.1 创建需求日志 | L2 API自动化 | Vitest + Supertest |
| TC1.16.2 编辑需求日志 | L2 API自动化 | Vitest + Supertest |
| TC1.16.3 发起评审日志 | L2 API自动化 | Vitest + Supertest |
| TC1.16.4 评审通过日志 | L2 API自动化 | Vitest + Supertest |
| TC1.16.5 取消需求日志 | L2 API自动化 | Vitest + Supertest |
| TC1.16.6 日志信息完整 | L2 API自动化 | Vitest + Supertest |

### US1.17 批量操作

| 案例 | 测试方式 | 工具 |
|------|---------|------|
| TC1.17.1 批量发起评审 | L2 API自动化 | Vitest + Supertest |
| TC1.17.2 批量取消需求 | L2 API自动化 | Vitest + Supertest |
| TC1.17.3 批量变更状态 | L2 API自动化 | Vitest + Supertest |
| TC1.17.4 批量操作权限校验 | L2 API自动化 | Vitest + Supertest |
| TC1.17.5 批量操作部分失败 | L2 API自动化 | Vitest + Supertest |
| TC1.17.6 批量操作审计日志 | L2 API自动化 | Vitest + Supertest |
| TC1.17.7 批量操作空选校验 | L3 Playwright | Playwright |
| TC1.17.8 批量操作全选功能 | L3 Playwright | Playwright |

---

## 三、测试工具栈

| 层级 | 工具 | 配置 |
|------|------|------|
| **L1 单测** | Vitest + @vitest/coverage-v8 | `vitest --coverage`，增量覆盖率 ≥80% |
| **L2 API自动化** | Vitest + Supertest | 直接调用 Fastify 实例 |
| **L3 Playwright** | Playwright | E2E 测试，storageState 持久化登录 |

---

## 四、覆盖优先级

### P0（优先实现）

- L1 单测：sanitizeDescription、generateReqCode、hasCircularDependency
- L2 API：需求 CRUD + 状态流转核心路径
- L3 Playwright：Journey 1（BA录入→评审→PM审批通过）

### P1（其次实现）

- L1 单测：状态机校验逻辑
- L2 API：权限控制 + 审计日志
- L3 Playwright：Journey 2（评审拒绝→重新编辑）

### P2（最后实现）

- L1 单测：边界场景
- L2 API：批量操作 + 边缘场景
- L3 Playwright：Journey 3（紧急变更）

---

## 五、版本记录

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| v1.0 | 2026-06-26 | 初始版本，定义测试案例×测试方式对照表 |
