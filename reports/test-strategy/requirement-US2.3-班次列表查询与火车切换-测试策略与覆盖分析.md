# US2.3 班次列表查询与火车切换 - 测试策略与覆盖分析

**版本号**: v2.0  
**日期**: 2026-06-28  
**状态**: 基于测试案例文档和代码分析生成  

---

## 一、分析范围与口径说明

| 项目 | 内容 |
|------|------|
| 分析范围 | Task2 版本火车管理：US2.3 班次列表查询与火车切换 |
| 测试案例来源 | `03-需求与设计/Task2-版本火车管理/测试案例/RT-T2-US2.3-班次列表查询与火车切换-测试案例_v1.1_20260516.md` |
| 需求/设计来源 | 用户故事 v2.0、US2.3 详细设计 v1.1 |
| 代码范围 | 后端 `trains/routes/schedule.ts`、`trains/services/train.service.ts`；前端 `pages/trains/schedules/index.tsx`、`services/train.ts` |
| 口径差异 | 用户故事 v2.0 原始要求包含"用户相关火车过滤、默认选中相关火车"，本轮已确认暂不纳入；当前以 `/schedules` 班次列表页为入口 |

---

## 二、已有测试案例覆盖结论

测试案例文档共定义 **23** 个测试案例：

| 类型 | 数量 | 说明 |
|------|------|------|
| 后端接口测试 | 8 | 覆盖全局列表、按火车列表、分页、权限、异常 |
| 前端功能测试 | 12 | 覆盖页面加载、火车切换、表格字段、跳转、弹窗和状态按钮 |
| 差距验证测试 | 3 | 用于暴露当前代码与需求不一致的点 |

**结论**: 测试案例覆盖完整，已涵盖 US2.3 的核心业务场景。

---

## 三、单元测试门禁策略

### 3.1 门禁要求

| 指标 | 目标 | 说明 |
|------|------|------|
| 增量覆盖率 | ≥80% | 本次新增/修改代码的语句覆盖率 |
| 通过率 | 100% | 所有单元测试必须通过 |
| 抵扣规则 | L2/L3/M 不能抵扣 L1 | 接口测试、UI 测试、人工验证不能替代单元测试 |

### 3.2 L1 可单测识别

| 代码位置 | 可单测逻辑 | 类型 |
|----------|-----------|------|
| `train.service.ts` | `listAllSchedules` 分页计算（`skip = (page-1) * pageSize`） | 计算逻辑 |
| `train.service.ts` | `listAllSchedules` 排序逻辑（`orderBy: { createdAt: 'desc' }`） | 排序规则 |
| `train.service.ts` | `listTrainSchedules` 火车存在校验 | 校验逻辑 |
| `train.service.ts` | `updateTrainScheduleStatus` 状态机转换校验 | 状态判断 |
| `train.service.ts` | 班次列表字段聚合（`totalCapacity`、`usedCapacity`、`systemCount`） | 映射计算 |
| `key-dates.ts` | `calculateKeyDates` 日期计算 | 纯函数 |

### 3.3 单测覆盖策略

优先覆盖：
1. **纯函数**：`calculateKeyDates` - 关键日期自动计算逻辑
2. **计算逻辑**：分页参数转换、字段聚合计算
3. **状态判断**：状态机转换规则（PLANNING→IN_PROGRESS→LOCKED_DOWN→RELEASED）
4. **异常分支**：火车不存在、状态转换非法等

---

## 四、需求/测试案例覆盖矩阵

| 需求点 | 业务规则 | 测试案例 | 层级 |
|--------|----------|----------|------|
| 全局班次列表 | BR2.3.1 进入班次列表页默认展示 | TC2.3-API-01、TC2.3-FE-01 | L2/L3 |
| 火车下拉选择器 | BR2.3.2 顶部显示火车下拉 | TC2.3-FE-02 | L3 |
| 按火车切换班次 | BR2.3.3 选择火车后刷新列表 | TC2.3-API-04、TC2.3-FE-03 | L2/L3 |
| 班次排序 | BR2.3.4 按创建时间倒序 | TC2.3-API-03 | L2 |
| 全局班次分页 | BR2.3.5 全局班次列表分页 | TC2.3-API-02、TC2.3-FE-01 | L2/L3 |
| 指定火车班次 | BR2.3.6 按火车查询班次 | TC2.3-API-04、TC2.3-FE-03 | L2/L3 |
| 字段展示 | BR2.3.7 班次列表字段展示 | TC2.3-FE-05 | L3 |
| 详情跳转 | BR2.3.8 点击班次进入详情 | TC2.3-FE-06 | L3 |
| 状态操作按钮 | BR2.3.9 操作按钮按状态显示 | TC2.3-FE-10/11/12 | L3 |
| 角色权限控制 | BR2.3.10 操作按钮按角色控制 | TC2.3-API-07/08 | L2 |

---

## 五、代码影响测试矩阵

| 代码文件 | 核心函数/组件 | 测试层级 | 覆盖重点 |
|----------|--------------|----------|----------|
| `train.service.ts` | `listAllSchedules` | L1/L2 | 分页计算、排序、字段聚合 |
| `train.service.ts` | `listTrainSchedules` | L1/L2 | 火车校验、字段聚合 |
| `train.service.ts` | `updateTrainScheduleStatus` | L1/L2 | 状态机校验、事务逻辑 |
| `train.service.ts` | `createTrainSchedule` | L1/L2 | 参数校验、日期计算 |
| `train.service.ts` | `cancelTrainSchedule` | L1/L2 | 取消逻辑、需求状态回滚 |
| `key-dates.ts` | `calculateKeyDates` | L1 | 日期计算纯函数 |
| `schedule.ts` | `/api/schedules` GET | L2 | 认证、分页参数校验 |
| `schedule.ts` | `/api/trains/:trainId/schedules` GET | L2 | 认证、参数校验 |
| `schedule.ts` | `/api/trains/:trainId/schedules` POST | L2 | 权限校验、参数校验 |
| `schedule.ts` | `/api/trains/:trainId/schedules/:scheduleId/status` POST | L2 | 权限校验、状态校验 |
| `schedules/index.tsx` | SchedulesPage | L3 | 页面渲染、火车切换、表格交互 |
| `schedules/index.tsx` | handleTrainChange | L3 | 火车切换逻辑 |
| `schedules/index.tsx` | loadScheduleList | L3 | 列表加载逻辑 |

---

## 六、分层测试策略

### 6.1 L1 单元测试策略

**优先级**: ★★★★★（最高）

**覆盖范围**:

| 测试点 | 目标函数 | 测试方式 | 优先级 |
|--------|----------|----------|--------|
| 关键日期计算 | `calculateKeyDates(startDate, endDate)` | 输入不同日期范围验证输出 | P0 |
| 分页参数计算 | `listAllSchedules({ page, pageSize })` | 验证 skip/take 计算 | P0 |
| 状态机校验 | `updateTrainScheduleStatus(scheduleId, status)` | 验证合法/非法状态转换 | P0 |
| 字段聚合计算 | `listAllSchedules`/`listTrainSchedules` | 验证 capacity/requirement 统计 | P1 |
| 参数校验 | `createTrainSchedule` | 验证日期格式、必填字段 | P1 |

**增量覆盖率保证**: 重点覆盖 `key-dates.ts` 和 `train.service.ts` 中可隔离的业务逻辑，确保增量覆盖率 ≥80%。

### 6.2 L2 API 自动化测试策略

**优先级**: ★★★★☆（其次）

**覆盖范围**:

| 接口 | 测试案例 | 覆盖重点 | 优先级 |
|------|----------|----------|--------|
| GET `/api/schedules` | TC2.3-API-01 | 全局列表查询、字段完整性 | P0 |
| GET `/api/schedules` | TC2.3-API-02 | 分页参数验证 | P0 |
| GET `/api/schedules` | TC2.3-API-03 | 排序验证 | P0 |
| GET `/api/trains/:trainId/schedules` | TC2.3-API-04 | 指定火车列表 | P0 |
| GET `/api/trains/:trainId/schedules` | TC2.3-API-05 | 异常处理（火车不存在） | P0 |
| POST `/api/trains/:trainId/schedules` | TC2.3-API-07 | 创建权限校验 | P0 |
| POST `/api/trains/:trainId/schedules/:scheduleId/status` | TC2.3-API-08 | 状态变更权限校验 | P0 |
| GET `/api/schedules` | TC2.3-API-06 | 认证校验 | P0 |

### 6.3 L3 UI 自动化测试策略

**优先级**: ★★★☆☆（最后）

**核心用户旅程**:

| Journey | 测试案例 | 覆盖重点 | 优先级 |
|---------|----------|----------|--------|
| 班次列表查询与火车切换 | TC2.3-FE-01/02/03/04 | 页面加载、下拉选择、切换刷新、清空恢复 | P0 |
| 班次详情跳转 | TC2.3-FE-06 | 表格行点击跳转 | P0 |
| 新增班次流程 | TC2.3-FE-07/08 | 前置条件校验、弹窗打开 | P0 |
| 状态操作按钮 | TC2.3-FE-10/11/12 | 按状态显示对应按钮 | P0 |
| 表格字段展示 | TC2.3-FE-05 | 列字段渲染 | P1 |
| 编辑班次弹窗 | TC2.3-FE-09 | 编辑功能 | P1 |

### 6.4 M 人工验证策略

**适用场景**:

| 差距项 | 描述 | 替代方式 | 优先级 |
|--------|------|----------|--------|
| GAP-01 | 班次列表未展示"所属火车"列 | 人工验证表格列展示 | P2 |
| GAP-02 | 按火车查询班次不支持后端分页 | 人工验证分页行为 | P2 |
| GAP-03 | 前端操作按钮未按角色隐藏 | 人工验证按钮显隐 | P1 |

---

## 七、P0/P1 TODO 清单

### P0（必须完成）

| 序号 | 任务 | 负责 | 依赖 |
|------|------|------|------|
| 1 | L1 单元测试：`calculateKeyDates` 日期计算 | 后端研发 | 无 |
| 2 | L1 单元测试：分页参数计算 | 后端研发 | 无 |
| 3 | L1 单元测试：状态机转换校验 | 后端研发 | 无 |
| 4 | L2 API 自动化：全局班次列表查询（TC2.3-API-01） | 测试工程师 | 后端服务启动 |
| 5 | L2 API 自动化：分页验证（TC2.3-API-02） | 测试工程师 | API-01 |
| 6 | L2 API 自动化：指定火车班次列表（TC2.3-API-04） | 测试工程师 | 后端服务启动 |
| 7 | L2 API 自动化：认证/权限校验（TC2.3-API-06/07/08） | 测试工程师 | 后端服务启动 |
| 8 | L3 UI 自动化：班次列表查询与火车切换（TC2.3-FE-01/02/03/04） | 测试工程师 | 前后端服务启动 |
| 9 | L3 UI 自动化：班次详情跳转（TC2.3-FE-06） | 测试工程师 | FE-01 |
| 10 | L3 UI 自动化：状态操作按钮（TC2.3-FE-10/11/12） | 测试工程师 | FE-01 |

### P1（建议完成）

| 序号 | 任务 | 负责 | 依赖 |
|------|------|------|------|
| 11 | L1 单元测试：字段聚合计算 | 后端研发 | 无 |
| 12 | L2 API 自动化：排序验证（TC2.3-API-03） | 测试工程师 | API-01 |
| 13 | L2 API 自动化：异常处理（TC2.3-API-05） | 测试工程师 | API-04 |
| 14 | L3 UI 自动化：表格字段展示（TC2.3-FE-05） | 测试工程师 | FE-01 |
| 15 | L3 UI 自动化：编辑班次弹窗（TC2.3-FE-09） | 测试工程师 | FE-01 |

---

## 八、现有测试资产可复用判断

| 资产类型 | 路径 | 可复用性 | 说明 |
|----------|------|----------|------|
| 后端单元测试 | `apps/server/src/modules/trains/__tests__/` | 待创建 | 暂无现有单元测试 |
| API 测试 | `apps/server/src/modules/trains/__tests__/` | 待创建 | 暂无现有 API 测试 |
| E2E 测试 | `apps/web/tests/e2e/t2-us2.3-schedules-list.test.ts` | 已创建 | 已覆盖 10/13 个 FE 测试点 |
| 测试数据 | `/api/auth/seed` | 可用 | 已有测试用户创建接口 |

---

## 九、后续 Skill 执行建议

```
Step 1: unit-test-governance
  └── 输入：本策略报告 + 代码范围
  └── 目标：识别需补单测的增量逻辑，执行单测门禁检查

Step 2: automating-api-testing
  └── 输入：本策略报告中 L2 测试案例列表
  └── 目标：生成 API 自动化测试用例

Step 3: webapp-testing / Playwright
  └── 输入：本策略报告中 L3 测试案例列表
  └── 目标：完成剩余 3 个 FE 测试点的自动化

Step 4: test-report-generator
  └── 输入：各层测试结果
  └── 目标：生成最终测试覆盖报告
```

### 推荐 Skill 调用链

```
test-strategy-planner → unit-test-governance → automating-api-testing → webapp-testing → test-report-generator
```

---

## 十、风险和前置条件

### 10.1 风险

| 风险 | 描述 | 缓解措施 |
|------|------|----------|
| 单测覆盖率不足 | Service 层大量逻辑依赖 Prisma，难以隔离 | 优先覆盖可抽取的纯函数和计算逻辑 |
| API 测试环境不稳定 | 数据库状态依赖 | 使用 seed 接口初始化测试数据 |
| UI 测试选择器脆弱 | 页面结构变化导致测试失败 | 使用稳定的自定义类名定位 |
| 并发测试冲突 | 多测试同时创建用户/班次 | 在 seed 接口中处理唯一约束冲突 |

### 10.2 前置条件

| 条件 | 说明 |
|------|------|
| Node.js ≥ 18 | 后端服务运行环境 |
| pnpm ≥ 8 | 包管理工具 |
| Docker | 数据库容器化部署 |
| 测试用户存在 | 通过 `/api/auth/seed` 创建 |
| 至少 2 辆火车 | 用于火车切换测试 |
| 至少 3 个班次（不同状态） | 用于状态操作测试 |

---

*文档编号：RT-T2-US2.3-TS*  
*版本：v2.0（基于测试案例文档分析）*