# T2-US2.3 班次列表查询与火车切换 - 测试策略

**版本**: v2.0  
**日期**: 2026-06-28  
**状态**: 精简版

---

## 1. 分析范围

| 项目 | 内容 |
|------|------|
| US | US2.3 班次列表查询与火车切换 |
| 测试案例来源 | RT-T2-US2.3-测试案例_v1.1_20260516.md（23 个案例） |
| 代码范围 | train.service.ts、schedule.ts、schedules/index.tsx、key-dates.ts |
| 现有测试 | t2-us2.2x-schedule-ext.test.ts（部分可复用） |
| 口径差异 | 设计文档标题为"版本火车列表"，实际功能为"班次列表"，已按代码校准 |

---

## 2. 分层测试方案

| 层级 | 覆盖重点 | 工具 | 新建文件 |
|------|---------|------|----------|
| L1 单测 | calculateKeyDates 纯函数、分页计算、状态机校验、字段聚合 | Vitest | train.service.test.ts、key-dates.test.ts |
| L2 API | 认证、权限、分页、异常、状态流转、数据库副作用 | 集成测试 | t2-us2.3-schedule-api.test.ts |
| L3 E2E | 页面加载、火车切换、表格展示、跳转、状态按钮 | Playwright | t2-us2.3-schedule-e2e.test.ts |
| M 人工验证 | 字段展示、弹窗交互、差距验证（低风险 UI） | SIT + 截图 | evidence/T2-US2.3/ |

---

## 3. 覆盖现状

| 类型 | 案例数 | 已覆盖 | 缺失 | 主要缺口 |
|------|------|------|------|----------|
| 后端 API | 8 | 1 | 7 | 全局查询、分页、权限、异常 |
| 前端 UI | 12 | 0 | 12 | 页面加载、火车切换、状态按钮 |
| 差距验证 | 3 | 0 | 3 | 所属火车列、分页一致性、角色按钮 |
| **合计** | **23** | **1** | **22** | L1/L2/L3 均需新建 |

> 可复用：TC2.3-API-08 可复用 t2-us2.2x-schedule-ext.test.ts 状态流转逻辑，需补充权限断言。

---

## 4. 需求-案例覆盖矩阵

| 需求点 | 测试案例 | 层级 | 当前状态 | 待补内容 | 优先级 |
|-------|---------|------|---------|---------|-------|
| BR2.3.1 默认展示班次列表 | TC2.3-FE-01 | L3 | 缺失 | 页面加载、表格渲染、分页器显示 | P0 |
| BR2.3.2 火车下拉选择器 | TC2.3-FE-02 | L3 | 缺失 | 下拉加载、选项展示 | P0 |
| BR2.3.3 切换火车刷新列表 | TC2.3-API-04、TC2.3-FE-03 | L2+L3 | 缺失 | API 返回过滤结果、前端列表刷新 | P0 |
| BR2.3.4 按创建时间倒序 | TC2.3-API-03 | L1+L2 | 缺失 | orderBy 逻辑、API 响应排序验证 | P0 |
| BR2.3.5 全局班次分页 | TC2.3-API-01、TC2.3-API-02 | L1+L2 | 缺失 | 分页计算、参数边界、API 响应 | P0 |
| BR2.3.6 按火车查询班次 | TC2.3-API-04、TC2.3-API-05 | L2 | 缺失 | API 查询、不存在火车异常 | P0 |
| BR2.3.7 字段展示 | TC2.3-FE-05 | M | 缺失 | 表格列渲染、字段格式化 | P0 |
| BR2.3.8 详情页跳转 | TC2.3-FE-06 | L3 | 缺失 | 行点击跳转、路由参数传递 | P0 |
| BR2.3.9 状态按钮显示 | TC2.3-FE-10~12 | L1+L3 | 缺失 | 状态按钮映射逻辑、UI 显隐 | P0 |
| BR2.3.10 角色按钮控制 | TC2.3-GAP-03 | M | 缺失 | 前端按钮按角色显隐 | P0 |
| 未登录不可查询 | TC2.3-API-06 | L2 | 缺失 | 认证中间件验证 | P0 |
| 非管理员不可创建 | TC2.3-API-07 | L2 | 缺失 | 权限中间件验证 | P0 |
| 非管理员不可变更状态 | TC2.3-API-08 | L2 | 部分覆盖 | 复用现有测试，补充权限断言 | P0 |
| 新增班次前置校验 | TC2.3-FE-07、TC2.3-FE-08 | L3 | 缺失 | 未选火车提示、选火车后弹窗 | P0 |
| 差距：所属火车列未展示 | TC2.3-GAP-01 | M | 缺失 | 确认当前实现状态 | P1 |
| 差距：按火车查询不分页 | TC2.3-GAP-02 | L2 | 缺失 | API 分页参数验证 | P1 |

---

## 5. 代码影响测试矩阵

| 文件/模块 | 影响逻辑 | 影响案例 | 层级 | 必须覆盖原因 | 交由 |
|----------|---------|---------|------|-------------|------|
| train.service.ts - listAllSchedules | 全局班次查询、分页、排序、字段聚合 | TC2.3-API-01/02/03 | L1+L2 | 分页计算、排序逻辑、字段聚合为核心业务逻辑 | unit-test-governance |
| train.service.ts - listTrainSchedules | 指定火车班次查询、字段聚合 | TC2.3-API-04/05 | L1+L2 | 火车存在校验、字段聚合 | unit-test-governance |
| train.service.ts - updateTrainScheduleStatus | 班次状态变更、状态机验证 | TC2.3-API-08 | L1+L2 | 状态流转规则、权限控制 | unit-test-governance |
| schedule.ts | 路由注册、中间件、参数校验 | 全部 API 案例 | L2 | HTTP 契约、认证、权限、参数校验 | automating-api-testing |
| key-dates.ts - calculateKeyDates | 关键日期计算 | 班次创建相关 | L1 | 纯函数，日期算法复杂，边界情况多 | unit-test-governance |
| schedules/index.tsx | 页面渲染、火车切换、表格、弹窗、按钮 | 全部 FE 案例 | L3 | 用户交互主路径、按钮权限矩阵 | webapp-testing |

---

## 6. 现有测试资产判断

| 现有测试文件 | 可复用覆盖 | 不足 |
|-------------|-----------|------|
| t2-us2.2x-schedule-ext.test.ts | 状态流转测试逻辑可复用 | 未覆盖班次列表查询、分页、权限校验 |
| t2-us2.2-train-schedule-create.test.ts | 班次创建基础逻辑可复用 | 未覆盖班次列表查询 |

---

## 7. TODO 清单与后续执行

| 优先级 | TODO | 交由 |
|-------|------|------|
| P0 | L1 单测：calculateKeyDates（日期边界、周期计算） | unit-test-governance |
| P0 | L1 单测：listAllSchedules（分页计算、字段聚合） | unit-test-governance |
| P0 | L1 单测：listTrainSchedules（火车存在校验） | unit-test-governance |
| P0 | L2 API：认证 + 权限 + 分页 + 异常（8 个案例） | automating-api-testing |
| P0 | L3 E2E：页面加载 + 火车切换 + 状态按钮（10 个案例） | webapp-testing |
| P1 | L1 单测：updateTrainScheduleStatus（状态机校验） | unit-test-governance |
| P1 | M 人工验证：字段展示 + 弹窗 + 差距项 | 用户确认后创建 evidence |

### 7.1 后续 Skill 调用链

| 步骤 | Skill | 输入 | 输出 |
|------|-------|------|------|
| 1 | unit-test-governance | train.service.ts、key-dates.ts | L1 单测文件 |
| 2 | automating-api-testing | schedule.ts、API 案例 | L2 API 测试文件 |
| 3 | webapp-testing | schedules/index.tsx、FE 案例 | L3 E2E 测试文件 |
| 4 | test-report-generator | vitest 覆盖率、playwright 报告 | 测试报告 |

> 执行顺序：先 L1 单测（验证核心逻辑）→ 再 L2 API（验证接口契约）→ 最后 L3 E2E（验证用户交互）

---

## 8. 人工验证方案

| UI 场景 | 替代原因 | evidence 目录 | 必须证据 | 风险 |
|--------|---------|--------------|---------|------|
| TC2.3-FE-05 字段展示 | 低风险展示类，自动化成本高 | evidence/T2-US2.3/TC2.3-FE-05/ | 页面截图、SIT 版本、验证人 | 低 |
| TC2.3-FE-09 编辑弹窗 | 低风险弹窗交互 | evidence/T2-US2.3/TC2.3-FE-09/ | 页面截图、表单字段验证 | 低 |
| TC2.3-GAP-01 所属火车列 | 差距验证 | evidence/T2-US2.3/TC2.3-GAP-01/ | 页面截图、确认当前状态 | 低 |
| TC2.3-GAP-02 分页一致性 | 差距验证 | evidence/T2-US2.3/TC2.3-GAP-02/ | API 响应截图 | 低 |
| TC2.3-GAP-03 角色按钮 | 权限显隐，需多角色验证 | evidence/T2-US2.3/TC2.3-GAP-03/ | 多角色页面截图 | 中高 |

> 需先询问用户是否创建人工验证证据目录。

---

## 9. 风险提醒

| 风险 | 影响 | 建议 |
|------|------|------|
| 后端 API 未覆盖 | 接口契约、权限风险 | 优先执行 L2 API 自动化 |
| 前端按钮权限未隐藏 | 用户体验风险 | 后端已兜底，建议尽快修复前端 |
| 按火车查询不分页 | 性能风险 | 建议补充分页参数 |
| calculateKeyDates 未单测 | 日期边界错误风险 | 必须优先覆盖 L1 单测 |