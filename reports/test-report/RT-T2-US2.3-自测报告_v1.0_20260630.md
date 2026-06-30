# RT-T2-US2.3-自测报告_v1.0_20260630.md

## 基本信息
| 项目 | 内容 |
|------|------|
| 报告编号 | RT-TEST-20260630-001 |
| 生成时间 | 2026-06-30 12:35:00 |
| 执行环境 | Node.js v22.22.2 / macOS |
| Git 分支/Commit | feature/t2-us2.3@待确认 |
| 测试人员 | 开发人员 |

---

## 测试策略概览

本次测试基于 **T2-US2.3 班次列表查询与火车切换 测试策略与覆盖分析报告**，采用三层叠加覆盖策略：

| 层级 | 工具 | 覆盖范围 | 目标 |
|------|------|---------|------|
| **L1 单元测试** | Vitest | service.ts 纯函数、校验逻辑 | 增量覆盖率 >80%，通过率 100% |
| **L2 接口自动化** | Vitest + Fastify inject | API 契约、鉴权、参数、状态流转 | API 自动化覆盖率 ≥90% |
| **L3 UI 自动化** | Playwright | 关键用户旅程、UI 交互 | 覆盖核心用户旅程 |
| **M 人工验证** | SIT 环境 + 截图 | 低频 UI、截图确认 | 保留可审计证据 |

### 覆盖率目标
| 指标 | 目标值 |
|------|-------|
| L1 增量覆盖率 | >80% |
| L1 单测通过率 | 100% |

---

## L1 单元测试门禁结论
（直接引用 unit-test-governance 报告）

| 门禁项 | 当前值 | 达标要求 | 状态 |
|--------|--------|----------|------|
| 单测通过率 | 100% | 100% | ✅ 通过 |
| 增量覆盖率 | ~98% | >80% | ✅ 通过 |
| 最终决策 | ✅ 通过 | - | ✅ |

**需补充单测清单**：无（所有 P0/P1 级检查点均已覆盖）

**门禁详情来源**：[requirement-T2-US2.3-unit-test-governance.md](../unit-test-governance/requirement-T2-US2.3-unit-test-governance.md)

---

## L2 接口自动化覆盖分析
（检索并执行 API 测试文件）

| API 路径 | 测试文件 | 测试状态 | 覆盖逻辑 |
|----------|----------|----------|----------|
| `GET /api/schedules` | `t2-us2.3-schedule-api.test.ts` | ✅ 已覆盖 | 全局班次列表、分页、排序 |
| `GET /api/schedules?page=1&pageSize=20` | `t2-us2.3-schedule-api.test.ts` | ✅ 已覆盖 | 默认分页参数 |
| `GET /api/schedules?page=0` | `t2-us2.3-schedule-api.test.ts` | ✅ 已覆盖 | 边界参数校验 |
| `GET /api/schedules?pageSize=100` | `t2-us2.3-schedule-api.test.ts` | ✅ 已覆盖 | 最大分页限制 |
| `GET /api/trains/:trainId/schedules` | `t2-us2.3-schedule-api.test.ts` | ✅ 已覆盖 | 指定火车班次列表 |
| `GET /api/trains/:trainId/schedules` (不存在) | `t2-us2.3-schedule-api.test.ts` | ✅ 已覆盖 | 火车不存在错误处理 |
| 未认证请求 | `t2-us2.3-schedule-api.test.ts` | ✅ 已覆盖 | 未登录权限校验 |
| 非管理员创建班次 | `t2-us2.3-schedule-api.test.ts` | ✅ 已覆盖 | 垂直越权校验 |
| 非管理员变更状态 | `t2-us2.3-schedule-api.test.ts` | ✅ 已覆盖 | 状态变更权限校验 |

**执行概要**：
| 指标 | 值 | 状态 |
|------|-----|------|
| L2 API 测试数 | 14 | ✅ 全部通过 |
| L2 API 通过数 | 14 | ✅ |
| L2 API 失败数 | 0 | ✅ |

---

## L3 UI 自动化覆盖分析
（检索并执行 Playwright 测试文件）

| Journey | 测试文件 | 测试状态 | 截图证据 |
|---------|----------|----------|----------|
| TC2.3-FE-01: 进入班次列表页默认加载全局班次 | `t2-us2.3-schedules-list.test.ts` | ❌ 失败 | test-results/t2-us2.3-schedules-list-TC2-3-FE-01-*/test-failed-1.png |
| TC2.3-FE-02: 火车下拉加载选项 | `t2-us2.3-schedules-list.test.ts` | ✅ 通过 | - |
| TC2.3-FE-03: 切换所属火车刷新班次列表 | `t2-us2.3-schedules-list.test.ts` | ✅ 通过 | - |
| TC2.3-FE-04: 清空所属火车恢复全局列表 | `t2-us2.3-schedules-list.test.ts` | ✅ 通过 | - |
| TC2.3-FE-06: 点击班次行进入详情页 | `t2-us2.3-schedules-list.test.ts` | ✅ 通过 | - |
| TC2.3-FE-07: 未选择火车时点击新增班次提示警告 | `t2-us2.3-schedules-list.test.ts` | ❌ 失败 | test-results/t2-us2.3-schedules-list-TC2-3-FE-07-*/test-failed-1.png |
| TC2.3-FE-08: 选择火车后点击新增班次打开弹窗 | `t2-us2.3-schedules-list.test.ts` | ❌ 失败 | test-results/t2-us2.3-schedules-list-TC2-3-FE-08-*/test-failed-1.png |
| TC2.3-FE-10: 计划中班次显示"开始"按钮 | `t2-us2.3-schedules-list.test.ts` | ✅ 通过 | - |
| TC2.3-FE-11: 进行中班次显示"封板"按钮 | `t2-us2.3-schedules-list.test.ts` | ❌ 失败 | test-results/t2-us2.3-schedules-list-TC2-3-FE-11-*/test-failed-1.png |
| TC2.3-FE-12: 封板班次显示"投产"按钮 | `t2-us2.3-schedules-list.test.ts` | ❌ 失败 | test-results/t2-us2.3-schedules-list-TC2-3-FE-12-*/test-failed-1.png |
| TC2.3-FE-14: 投产班次不显示状态变更按钮 | `t2-us2.3-schedules-list.test.ts` | ✅ 通过 | - |
| TC2.3-FE-15: BA 用户看不到新增班次按钮或点击提示无权限 | `t2-us2.3-schedules-list.test.ts` | ❌ 失败（权限缺口） | test-results/t2-us2.3-schedules-list-TC2-3-FE-15-*/test-failed-1.png |
| TC2.3-FE-16: 点击刷新按钮刷新班次列表 | `t2-us2.3-schedules-list.test.ts` | ❌ 失败 | test-results/t2-us2.3-schedules-list-TC2-3-FE-16-*/test-failed-1.png |

**执行概要**：
| 指标 | 值 | 状态 |
|------|-----|------|
| L3 UI 测试数 | 13 | ⚠️ 部分通过 |
| L3 UI 通过数 | 6 | ⚠️ |
| L3 UI 失败数 | 7 | ❌ |

**失败原因分析**：
| 失败测试 | 原因 | 优先级 |
|----------|------|--------|
| TC2.3-FE-01 | 等待表格元素超时（页面加载问题） | P0 |
| TC2.3-FE-07/08 | 等待弹窗标题超时（新增班次弹窗问题） | P0 |
| TC2.3-FE-11/12 | 等待按钮超时（测试数据状态不匹配） | P1 |
| TC2.3-FE-15 | BA 用户能看到新增按钮（前端权限显隐缺失） | **P0 高风险** |
| TC2.3-FE-16 | 等待表格超时（刷新后页面加载问题） | P1 |

---

## M 人工验证证据汇总
（读取 evidence/US2.3-班次列表查询与火车切换/ 目录）

| 验证项 | 证据文件 | 验证结果 |
|--------|----------|----------|
| TC2.3-GAP-01 所属火车列展示 | summary.md | ⏸️ 待验证 |
| TC2.3-GAP-02 按火车查询分页 | summary.md | ⏸️ 待验证 |
| TC2.3-GAP-03 前端权限按钮显隐 | summary.md | ⏸️ 待验证 |

**人工验证状态**：⏸️ 待验证（summary.md 显示所有验证项均为"待验证"状态）

---

## 测试结果明细
（整合策略对照表 + 最新测试文件覆盖分析 + 人工验证证据）

| 测试案例编号 | 测试方式 | 测试文件 | 执行结果 | 覆盖状态 |
|--------------|----------|----------|----------|----------|
| TC2.3-API-01 | L2 API | t2-us2.3-schedule-api.test.ts | ✅ 通过 | 已覆盖 |
| TC2.3-API-02 | L2 API | t2-us2.3-schedule-api.test.ts | ✅ 通过 | 已覆盖 |
| TC2.3-API-03 | L2 API | t2-us2.3-schedule-api.test.ts | ✅ 通过 | 已覆盖 |
| TC2.3-API-04 | L2 API | t2-us2.3-schedule-api.test.ts | ✅ 通过 | 已覆盖 |
| TC2.3-API-05 | L2 API | t2-us2.3-schedule-api.test.ts | ✅ 通过 | 已覆盖 |
| TC2.3-API-06 | L2 API | t2-us2.3-schedule-api.test.ts | ✅ 通过 | 已覆盖 |
| TC2.3-API-07 | L2 API | t2-us2.3-schedule-api.test.ts | ✅ 通过 | 已覆盖 |
| TC2.3-API-08 | L2 API | t2-us2.3-schedule-api.test.ts | ✅ 通过 | 已覆盖 |
| TC2.3-FE-01 | L3 UI | t2-us2.3-schedules-list.test.ts | ❌ 失败 | 部分覆盖 |
| TC2.3-FE-02 | L3 UI | t2-us2.3-schedules-list.test.ts | ✅ 通过 | 已覆盖 |
| TC2.3-FE-03 | L3 UI | t2-us2.3-schedules-list.test.ts | ✅ 通过 | 已覆盖 |
| TC2.3-FE-04 | L3 UI | t2-us2.3-schedules-list.test.ts | ✅ 通过 | 已覆盖 |
| TC2.3-FE-05 | L3 UI | 缺失 | ❌ 未执行 | 缺失 |
| TC2.3-FE-06 | L3 UI | t2-us2.3-schedules-list.test.ts | ✅ 通过 | 已覆盖 |
| TC2.3-FE-07 | L3 UI | t2-us2.3-schedules-list.test.ts | ❌ 失败 | 部分覆盖 |
| TC2.3-FE-08 | L3 UI | t2-us2.3-schedules-list.test.ts | ❌ 失败 | 部分覆盖 |
| TC2.3-FE-09 | L3 UI | 缺失 | ❌ 未执行 | 缺失 |
| TC2.3-FE-10 | L3 UI | t2-us2.3-schedules-list.test.ts | ✅ 通过 | 已覆盖 |
| TC2.3-FE-11 | L3 UI | t2-us2.3-schedules-list.test.ts | ❌ 失败 | 部分覆盖 |
| TC2.3-FE-12 | L3 UI | t2-us2.3-schedules-list.test.ts | ❌ 失败 | 部分覆盖 |
| TC2.3-FE-14 | L3 UI | t2-us2.3-schedules-list.test.ts | ✅ 通过 | 已覆盖 |
| TC2.3-FE-15 | L3 UI | t2-us2.3-schedules-list.test.ts | ❌ 失败（权限缺口） | 缺失 |
| TC2.3-FE-16 | L3 UI | t2-us2.3-schedules-list.test.ts | ❌ 失败 | 部分覆盖 |
| TC2.3-GAP-01 | M 人工 | evidence/US2.3-* | ⏸️ 待验证 | 待验证 |
| TC2.3-GAP-02 | M 人工 | evidence/US2.3-* | ⏸️ 待验证 | 待验证 |
| TC2.3-GAP-03 | M 人工 | evidence/US2.3-* | ⏸️ 待验证 | 待验证 |

---

## 自测检查点覆盖摘要（双报告整合）

| 检查点 | 层级 | 优先级 | 覆盖状态 | 证据来源 |
|--------|------|--------|----------|----------|
| 提交/确认按钮添加 loading，防止重复点击 | L3 | P0 | ⚠️ 部分覆盖 | L3 测试未验证 loading |
| 查询语句含分页、且索引生效的执行计划自测用例 | L1 | P0 | ✅ 已覆盖 | train.service.unit.test.ts |
| 重要参数校验（涉及是否能命中索引的字段） | L1 | P0 | ✅ 已覆盖 | train.service.unit.test.ts 分页边界值测试 |
| 数据不一致：部分提交或回滚不彻底 | L1 | P0 | ✅ 已覆盖 | train.service.unit.test.ts 事务回滚测试 |
| 验证所有执行状态、审批状态、交易状态的流转是否符合业务规则 | L1 | P0 | ✅ 已覆盖 | train.service.unit.test.ts 状态机测试 |
| 确保无效状态跳转被拦截 | L1 | P0 | ✅ 已覆盖 | train.service.unit.test.ts 非法流转测试 |
| 记账交易是否正确记录事务处理的中间状态 | L1 | P0 | ✅ 已覆盖 | train.service.unit.test.ts 事务副作用测试 |
| 异常场景模拟测试：验证是否触发回滚或补偿操作 | L1 | P0 | ✅ 已覆盖 | train.service.unit.test.ts 异常回滚测试 |
| 重复请求测试：验证系统是否仅处理第一次请求 | L1 | P0 | ✅ 已覆盖 | train.service.unit.test.ts 幂等性测试 |
| 开关类功能按预期效果生效的用例 | L1 | P0 | ✅ 已覆盖 | train.service.unit.test.ts 状态流转测试 |
| 参数设计边界值自测用例 | L1 | P0 | ✅ 已覆盖 | train.service.unit.test.ts 分页边界值测试 |
| 分页参数是否设置合理最大值 | L1 | P0 | ✅ 已覆盖 | train.service.unit.test.ts pageSize 最大值限制 |
| API 认证与权限控制 | L2 | P0 | ✅ 已覆盖 | t2-us2.3-schedule-api.test.ts |
| 水平越权风险 | L2 | P0 | ⚠️ 未覆盖 | 需补充水平越权测试 |
| 前端角色按钮显隐 | L3 | P0 | ❌ 缺失 | TC2.3-FE-15 失败（BA能看到管理按钮） |
| 敏感操作二次确认 | L3 | P0 | ⚠️ 部分覆盖 | Modal.confirm 已实现但 L3 未验证 |

---

## 执行概要

| 指标 | 值 | 状态 |
|------|-----|------|
| L1 总测试数 | 25 | ✅ |
| L1 通过数 | 25 | ✅ |
| L1 覆盖率 | ~98% | ✅ |
| L2 API 测试数 | 14 | ✅ |
| L2 API 通过数 | 14 | ✅ |
| L3 UI 测试数 | 13 | ⚠️ |
| L3 UI 通过数 | 6 | ⚠️ |
| L3 UI 失败数 | 7 | ❌ |
| M 人工验证数 | 3 | ⏸️ 待验证 |

---

## 结论

| 项目 | 状态 |
|------|------|
| L1 单测门禁 | ✅ 通过 |
| L2 API 自动化 | ✅ 已覆盖 |
| L3 UI 自动化 | ⚠️ 部分覆盖（7个失败） |
| M 人工验证 | ⏸️ 待验证 |
| **整体交付建议** | **⚠️ 有条件提测** |

---

### 风险与建议

| 风险 | 影响 | 优先级 | 建议 |
|------|------|--------|------|
| 前端权限按钮显隐缺失（TC2.3-FE-15） | BA 用户能看到管理按钮，存在越权操作风险 | **P0 高风险** | 实现前端角色显隐逻辑或明确后端兜底 |
| L3 UI 测试失败（7个） | UI 交互验证不完整 | P1 | 固化测试数据，修复测试超时问题 |
| 水平越权测试缺失 | 用户可能越权查看非自己管理的班次 | P0 | 补充水平越权测试用例 |
| M 人工验证待执行 | GAP-01/02/03 未验证 | P1 | 执行人工验证并补充截图证据 |
| 幂等性服务内存实现 | 生产环境需替换为 Redis | P2 | 后续迁移到 Redis |

---

**后续行动清单**：
1. ✅ L1 单测门禁已通过，无需补充单测
2. ❌ P0：修复前端权限按钮显隐（TC2.3-FE-15）
3. ❌ P1：固化 L3 测试数据，修复 UI 测试失败
4. ❌ P0：补充水平越权测试用例
5. ⏸️ P1：执行 M 人工验证，补充截图证据

---

*报告生成时间：2026-06-30 12:35:00*
*基于 test-strategy-planner + unit-test-governance + L2/L3 测试执行结果整合*