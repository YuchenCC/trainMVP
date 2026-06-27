# Task 1: 需求池管理 - 分层测试策略

**版本号**: v1.0  
**日期**: 2026-06-26  
**状态**: 待审核  
**来源文档**: 
- [RT-T1-需求池管理-测试案例_v1.0_20260528.md](./RT-T1-需求池管理-测试案例_v1.0_20260528.md)
- `apps/server/src/modules/requirements/service.ts`

---

## 一、测试策略总览

### 分层叠加原则

每个测试案例采用**三层叠加覆盖**策略：

| 层级 | 工具 | 覆盖范围 | 目的 |
|------|------|---------|------|
| **L1 单元测试** | Vitest | service.ts 中的纯函数、校验逻辑、算法 | 基础保障，确保核心逻辑正确性，增量覆盖率 ≥80% |
| **L2 接口自动化** | Vitest + Supertest | API 请求/响应、状态流转、权限控制、审计日志 | 验证端到端业务流程，覆盖 124 个测试案例中的核心场景 |
| **L3 Playwright** | Playwright | 关键用户旅程、UI 交互、页面跳转 | 串联核心流程，验证端到端用户体验 |

### 覆盖率目标

```
增量覆盖率 ≥ 80%（service.ts 新增代码）
API 自动化覆盖率 ≥ 90%（核心业务流程）
Playwright 覆盖 2-3 条核心用户旅程
```

---

## 二、L1 单元测试覆盖计划

### 2.1 service.ts 纯函数清单

| 函数名 | 行号 | 复杂度 | 覆盖方式 | 优先级 |
|--------|------|--------|---------|--------|
| `sanitizeDescription` | 63-65 | 低 | 白盒测试：XSS过滤、标签保留、协议过滤 | P0 |
| `generateReqCode` | 79-126 | 中 | 白盒测试：编号格式、递增逻辑、并发重试、异常处理 | P0 |
| `hasCircularDependency` | 140-174 | 中 | 白盒测试：自依赖、直接循环、间接循环、无循环 | P0 |
| `findApproverForStep` | 787-801 | 低 | 白盒测试：PMGR查找、全局回退、终审返回null | P1 |
| `buildRequirementDetail` | 186-304 | 中 | 集成测试：依赖列表组装、日志格式化、紧急变更处理 | P1 |

### 2.2 单元测试用例设计

#### TC-SVC-001 ~ TC-SVC-003: sanitizeDescription

| 用例 | 输入 | 预期结果 |
|------|------|---------|
| TC-SVC-001 | `<p>安全内容</p>` | 保留 `<p>` 标签 |
| TC-SVC-002 | `<script>alert(1)</script>` | 过滤 script 标签，保留内容 |
| TC-SVC-003 | `<a href="javascript:alert(1)">click</a>` | 过滤危险协议，移除 href |

#### TC-SVC-004 ~ TC-SVC-007: generateReqCode

| 用例 | 场景 | 预期结果 |
|------|------|---------|
| TC-SVC-004 | 首次生成 | `REQ-2026-0001` |
| TC-SVC-005 | 已有编号 `REQ-2026-0005` | `REQ-2026-0006` |
| TC-SVC-006 | 编号冲突（重试成功） | 重试后生成新编号 |
| TC-SVC-007 | 重试耗尽 | 抛出 `requirementCodeConflict` 错误 |

#### TC-SVC-008 ~ TC-SVC-011: hasCircularDependency

| 用例 | 场景 | 预期结果 |
|------|------|---------|
| TC-SVC-008 | 自依赖（A→A） | `true` |
| TC-SVC-009 | 直接循环（A→B→A） | `true` |
| TC-SVC-010 | 间接循环（A→B→C→A） | `true` |
| TC-SVC-011 | 无循环（A→B→C） | `false` |

#### TC-SVC-012 ~ TC-SVC-014: findApproverForStep

| 用例 | 场景 | 预期结果 |
|------|------|---------|
| TC-SVC-012 | Step=2，SystemMember 有 PMGR | 返回 systemMember 的 userId |
| TC-SVC-013 | Step=2，SystemMember 无 PMGR | 返回全局 PROJECT_MGR 的 id |
| TC-SVC-014 | Step=3（终审） | 返回 `null` |

### 2.3 状态机校验逻辑（需单测覆盖）

```typescript
// service.ts 中的状态校验逻辑
// 覆盖以下分支：
1. createRequirement: 过滤后描述为空/超长（行 331-338）
2. updateRequirement: 非草稿状态不可编辑（行 513-515）
3. updateRequirement: BA 只能编辑自己的需求（行 518-524）
4. updateRequirement: 乐观锁冲突（行 527-529）
5. cancelRequirement: 已取消/已投产不可取消（行 965-972）
6. cancelRequirement: 权限校验（行 975-981）
7. emergencyChange: 仅封板状态可变更（行 710-712）
8. approveEmergencyChange: 审批人校验（行 816-818）
```

---

## 三、L2 接口自动化测试覆盖计划

### 3.1 API 接口清单

| API 路径 | 方法 | 覆盖用户故事 | 测试场景数 |
|----------|------|-------------|-----------|
| `/api/requirements` | POST | US1.1 | 5 |
| `/api/requirements` | GET | US1.3 | 6 |
| `/api/requirements/:id` | GET | US1.4 | 3 |
| `/api/requirements/:id` | PUT | US1.2 | 5 |
| `/api/requirements/:id` | DELETE | US1.9 | 4 |
| `/api/requirements/:id/review` | POST | US1.5 | 4 |
| `/api/requirements/:id/review/pass` | POST | US1.6 | 4 |
| `/api/requirements/:id/review/reject` | POST | US1.7 | 4 |
| `/api/requirements/:id/emergency` | POST | US1.12 | 4 |
| `/api/requirements/:id/emergency/approve` | POST | US1.12 | 3 |
| `/api/requirements/:id/emergency/reject` | POST | US1.12 | 3 |
| `/api/requirements/:id/dependencies` | POST | US1.13 | 4 |

### 3.2 测试案例 → API 映射表

#### US1.1 需求录入

| 测试案例 | API | 关键断言 |
|---------|-----|---------|
| TC1.1.1 正常录入需求 | `POST /api/requirements` | 状态 DRAFT、编号生成、审计日志 |
| TC1.1.2 标题为空校验 | `POST /api/requirements` | 400 错误 |
| TC1.1.5 工作量点数范围校验-过小 | `POST /api/requirements` | 400 错误 |
| TC1.1.6 工作量点数范围校验-过大 | `POST /api/requirements` | 400 错误 |
| TC1.1.7 XSS攻击防护 | `POST /api/requirements` | 描述被过滤 |
| TC1.1.8 归属系统筛选 | `GET /api/systems` | 返回参与火车的系统 |
| TC1.1.9 业务归属人筛选 | `GET /api/users?systemId=xxx&role=BA` | 返回系统 BA 用户 |
| TC1.1.10 非授权角色隐藏按钮 | `GET /api/requirements` | 403 错误 |
| TC1.1.11 PM角色录入需求 | `POST /api/requirements` | 创建成功 |
| TC1.1.12 需求编号生成规则 | `POST /api/requirements` | 编号递增 |

#### US1.2 需求编辑

| 测试案例 | API | 关键断言 |
|---------|-----|---------|
| TC1.2.1 正常编辑草稿需求 | `PUT /api/requirements/:id` | 更新成功、version+1 |
| TC1.2.2 非草稿状态不可编辑 | `PUT /api/requirements/:id` | 400 错误 |
| TC1.2.3 非授权角色不可编辑 | `PUT /api/requirements/:id` | 403 错误 |
| TC1.2.6 乐观锁冲突处理 | `PUT /api/requirements/:id` | 409 错误 |
| TC1.2.7 编辑审计日志记录 | `PUT /api/requirements/:id` | StatusLog 记录 |
| TC1.2.8 编辑表单字段校验 | `PUT /api/requirements/:id` | 400 错误 |

#### US1.3 需求列表查询与筛选

| 测试案例 | API | 关键断言 |
|---------|-----|---------|
| TC1.3.1 默认显示全部系统需求 | `GET /api/requirements` | 返回所有需求 |
| TC1.3.2 按系统筛选 | `GET /api/requirements?systemId=xxx` | 过滤正确 |
| TC1.3.3 按状态筛选 | `GET /api/requirements?status=DRAFT` | 过滤正确 |
| TC1.3.4 关键字搜索 | `GET /api/requirements?keyword=xxx` | 搜索正确 |
| TC1.3.5 分页功能 | `GET /api/requirements?page=1&pageSize=20` | 分页正确 |
| TC1.3.6 排序功能 | `GET /api/requirements?sortBy=priority&sortOrder=asc` | 排序正确 |

#### US1.4 需求详情查看

| 测试案例 | API | 关键断言 |
|---------|-----|---------|
| TC1.4.1 详情页信息完整展示 | `GET /api/requirements/:id` | 包含所有字段 |
| TC1.4.4 依赖需求展示 | `GET /api/requirements/:id` | dependencies 数组 |
| TC1.4.5 操作历史时间线 | `GET /api/requirements/:id` | statusLogs 数组 |

#### US1.5 发起评审

| 测试案例 | API | 关键断言 |
|---------|-----|---------|
| TC1.5.1 正常发起评审 | `POST /api/requirements/:id/review` | 状态变为 REVIEWING |
| TC1.5.2 非草稿状态不显示按钮 | `POST /api/requirements/:id/review` | 400 错误 |
| TC1.5.3 非BA角色不显示按钮 | `POST /api/requirements/:id/review` | 403 错误 |
| TC1.5.4 必填字段不完整提示 | `POST /api/requirements/:id/review` | 400 错误 |
| TC1.5.6 审计日志记录 | `POST /api/requirements/:id/review` | StatusLog 记录 |
| TC1.5.7 批量发起评审 | `POST /api/requirements/batch/review` | 批量更新 |

#### US1.6 评审通过

| 测试案例 | API | 关键断言 |
|---------|-----|---------|
| TC1.6.1 PM正常评审通过 | `POST /api/requirements/:id/review/pass` | 状态变为 REVIEWED |
| TC1.6.2 非PM角色不可评审 | `POST /api/requirements/:id/review/pass` | 403 错误 |
| TC1.6.3 非待评审状态不可评审 | `POST /api/requirements/:id/review/pass` | 400 错误 |
| TC1.6.4 评审通过后状态变更 | `POST /api/requirements/:id/review/pass` | 状态流转正确 |
| TC1.6.5 评审通过审计日志 | `POST /api/requirements/:id/review/pass` | StatusLog 记录 |

#### US1.7 评审拒绝

| 测试案例 | API | 关键断言 |
|---------|-----|---------|
| TC1.7.1 PM正常评审拒绝 | `POST /api/requirements/:id/review/reject` | 状态变为 REJECTED |
| TC1.7.2 拒绝原因必填校验 | `POST /api/requirements/:id/review/reject` | 400 错误 |
| TC1.7.3 非PM角色不可拒绝 | `POST /api/requirements/:id/review/reject` | 403 错误 |
| TC1.7.5 拒绝后状态变更 | `POST /api/requirements/:id/review/reject` | 状态流转正确 |
| TC1.7.6 拒绝后可重新编辑 | `PUT /api/requirements/:id` | 编辑成功 |

#### US1.9 取消需求

| 测试案例 | API | 关键断言 |
|---------|-----|---------|
| TC1.9.1 BA取消草稿需求 | `DELETE /api/requirements/:id` | 状态变为 CANCELLED |
| TC1.9.3 已投产需求不可取消 | `DELETE /api/requirements/:id` | 400 错误 |
| TC1.9.4 非BA角色不可取消 | `DELETE /api/requirements/:id` | 403 错误 |
| TC1.9.5 取消审计日志 | `DELETE /api/requirements/:id` | StatusLog 记录 |
| TC1.9.7 批量取消需求 | `DELETE /api/requirements/batch` | 批量更新 |

#### US1.10 子状态变更

| 测试案例 | API | 关键断言 |
|---------|-----|---------|
| TC1.10.1 开发中→测试中 | `PUT /api/requirements/:id/substatus` | subStatus 变更 |
| TC1.10.5 非技术经理不可变更 | `PUT /api/requirements/:id/substatus` | 403 错误 |
| TC1.10.6 非法子状态变更 | `PUT /api/requirements/:id/substatus` | 400 错误 |

#### US1.12 紧急变更

| 测试案例 | API | 关键断言 |
|---------|-----|---------|
| TC1.12.1 正常创建紧急变更 | `POST /api/requirements/:id/emergency` | EmergencyChange 创建 |
| TC1.12.3 非PM不可创建紧急变更 | `POST /api/requirements/:id/emergency` | 403 错误 |
| TC1.12.5 紧急变更审批通过 | `POST /api/requirements/:id/emergency/approve` | 状态退回 DRAFT |
| TC1.12.6 紧急变更审批拒绝 | `POST /api/requirements/:id/emergency/reject` | 状态不变 |

#### US1.13 依赖关系管理

| 测试案例 | API | 关键断言 |
|---------|-----|---------|
| TC1.13.1 添加依赖需求 | `POST /api/requirements/:id/dependencies` | 依赖关系创建 |
| TC1.13.2 删除依赖需求 | `DELETE /api/requirements/:id/dependencies/:depId` | 依赖关系删除 |
| TC1.13.3 循环依赖校验 | `POST /api/requirements/:id/dependencies` | 400 错误 |
| TC1.13.5 非BA不可管理依赖 | `POST /api/requirements/:id/dependencies` | 403 错误 |

---

## 四、L3 Playwright 端到端测试覆盖计划

### 4.1 核心用户旅程

#### Journey 1: BA 录入需求 → 发起评审 → PM 审批通过

```
BA 登录 → 进入需求池 → 点击"新增需求" → 填写表单 → 提交 → 进入详情页
→ 点击"发起评审" → PM 登录 → 进入需求列表 → 点击"评审通过"
→ 验证状态流转：DRAFT → REVIEWING → REVIEWED
```

**覆盖测试案例**:
- TC1.1.1、TC1.5.1、TC1.6.1、TC1.3.13、TC1.4.1

#### Journey 2: BA 录入需求 → 发起评审 → PM 拒绝 → BA 重新编辑 → 再次发起评审

```
BA 登录 → 新增需求 → 发起评审 → PM 登录 → 点击"评审拒绝"（填写原因）
→ BA 登录 → 进入详情页 → 点击"重新编辑" → 修改内容 → 保存
→ 点击"发起评审" → 验证状态流转：DRAFT → REVIEWING → REJECTED → DRAFT → REVIEWING
```

**覆盖测试案例**:
- TC1.1.1、TC1.5.1、TC1.7.1、TC1.8.1、TC1.8.5、TC1.3.9

#### Journey 3: 紧急变更完整流程

```
PM 登录 → 找到封板状态需求 → 点击"紧急变更" → 填写原因和紧急程度
→ 测试经理登录 → 审批通过 → 项目经理登录 → 审批通过
→ 验证需求退回草稿状态
```

**覆盖测试案例**:
- TC1.12.1、TC1.12.5、TC1.4.1

### 4.2 Playwright 测试要点

| 要点 | 说明 |
|------|------|
| 登录状态保持 | 使用 `storageState` 持久化登录 |
| 角色切换 | 创建多个测试用户（BA/PM/TEST_MGR/PROJECT_MGR） |
| 数据隔离 | 每个测试用例使用唯一标识的测试数据 |
| 等待策略 | 使用 `waitForSelector` 等待异步加载 |
| 截图验证 | 关键步骤截图用于回归测试 |

---

## 五、覆盖率实现路径

### 5.1 单测覆盖率达标策略

```
步骤 1: 编写纯函数单元测试（sanitizeDescription、generateReqCode、hasCircularDependency、findApproverForStep）
        → 预期覆盖 40%

步骤 2: 编写状态校验逻辑测试（createRequirement、updateRequirement、cancelRequirement、emergencyChange）
        → 预期覆盖 30%

步骤 3: 编写 buildRequirementDetail 集成测试
        → 预期覆盖 10%

步骤 4: 运行 vitest --coverage，分析未覆盖分支，补充测试
        → 目标：增量覆盖率 ≥ 80%
```

### 5.2 API 自动化测试优先级

```
P0: 需求 CRUD + 状态流转核心路径（40 个测试场景）
P1: 权限控制 + 审计日志（30 个测试场景）
P2: 批量操作 + 边缘场景（20 个测试场景）
```

### 5.3 Playwright 测试优先级

```
P0: Journey 1（BA录入→评审→PM审批通过）
P1: Journey 2（评审拒绝→重新编辑→再次发起评审）
P2: Journey 3（紧急变更完整流程）
```

---

## 六、测试文件组织

```
apps/server/src/__tests__/
├── t1-us1-service-unit.test.ts      # L1 单元测试（纯函数）
├── t1-us1-requirement-entry.test.ts # L2 API 自动化（需求录入）
├── t1-us1.2-requirement-edit.test.ts # L2 API 自动化（需求编辑）
├── t1-us1.3-requirement-list.test.ts # L2 API 自动化（列表查询）
├── t1-us1.5-requirement-review.test.ts # L2 API 自动化（评审流程）
├── t1-us1.9-requirement-cancel.test.ts # L2 API 自动化（取消需求）
├── t1-us1.12-emergency-change.test.ts # L2 API 自动化（紧急变更）

apps/web/tests/
├── e2e/
│   ├── journey-1-create-review-pass.spec.ts  # L3 Journey 1
│   ├── journey-2-review-reject-reedit.spec.ts  # L3 Journey 2
│   └── journey-3-emergency-change.spec.ts  # L3 Journey 3
```

---

## 七、测试执行策略

### 7.1 本地开发

```bash
# 运行单测（watch 模式）
pnpm test:watch

# 运行 API 自动化测试
pnpm test -- --run t1-us1*.test.ts

# 运行覆盖率报告
pnpm test -- --coverage
```

### 7.2 CI/CD 流水线

```yaml
stages:
  - unit-test          # 单元测试 + 覆盖率检查（≥80%）
  - api-test           # API 自动化测试
  - e2e-test           # Playwright 端到端测试
```

### 7.3 测试数据管理

| 策略 | 说明 |
|------|------|
| 测试前清理 | `beforeAll` 中删除之前的测试数据 |
| 测试后清理 | `afterAll` 中删除当前测试数据 |
| 唯一标识 | 使用 `Date.now()` 生成唯一用户名/系统名 |
| 事务回滚 | API 测试中使用 Prisma 事务，测试结束后回滚 |

---

## 八、风险与应对

| 风险 | 应对措施 |
|------|---------|
| 单测覆盖率不达标 | 优先覆盖高复杂度函数，使用 `vitest --coverage` 分析未覆盖分支 |
| API 测试不稳定 | 使用重试机制，确保测试数据隔离 |
| Playwright 测试慢 | 只覆盖核心流程，并行执行多个浏览器 |
| 测试数据污染 | 测试前后清理，使用独立测试数据库 |

---

## 九、版本记录

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| v1.0 | 2026-06-26 | 初始版本，定义分层测试策略 |