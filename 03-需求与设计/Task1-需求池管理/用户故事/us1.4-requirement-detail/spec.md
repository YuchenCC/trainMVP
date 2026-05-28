# US1.4 需求详情查看 Spec

## Why
当前详情页缺少操作历史时间线、依赖风险等级展示、底部操作按钮、返回列表链接等功能。需要补齐 US1.4 用户故事中定义的全部验收条件。

## What Changes
- 后端：GET /api/requirements/:id 响应新增 statusLogs 字段（操作审计日志）
- 后端：DependencyItem 响应新增 riskLevel 字段（依赖风险分级）
- 后端：新增 GET /api/requirements/:id/status-logs 独立接口（操作历史分页查询）
- 前端：详情页新增操作历史时间线（Timeline 组件，按时间倒序）
- 前端：依赖列表新增风险等级 Tag 展示
- 前端：底部新增操作按钮区域（与 US1.3 操作按钮矩阵一致）
- 前端：页面标题区新增"← 返回列表"链接
- 前端：子状态展示（已纳版时显示"已纳版-开发中"等形式）
- 类型：shared 包新增 StatusLogItem 类型，DependencyItem 新增 riskLevel 字段
- **BREAKING**: RequirementDetail 接口新增 statusLogs 字段

## Impact
- Affected specs: US1.4 需求详情查看、US1.16 操作审计日志
- Affected code:
  - `packages/shared/src/types/requirement.ts` — 新增 StatusLogItem、DependencyItem 扩展
  - `apps/server/src/modules/requirements/service.ts` — buildRequirementDetail 扩展
  - `apps/server/src/modules/requirements/index.ts` — 新增 status-logs 路由
  - `apps/web/src/pages/requirements/detail.tsx` — 页面重构

## ADDED Requirements

### Requirement: 需求详情接口返回操作历史
系统 SHALL 在 GET /api/requirements/:id 响应中包含 statusLogs 数组，记录该需求的所有状态变更操作。

#### Scenario: 获取含操作历史的需求详情
- **WHEN** 用户请求 GET /api/requirements/:id
- **THEN** 响应 data.statusLogs 为数组，每项包含：操作时间、操作人姓名、操作类型、变更前状态、变更后状态、原因/备注
- **AND** statusLogs 按时间倒序排列

#### Scenario: 需求无操作历史
- **WHEN** 新创建的需求没有任何状态变更
- **THEN** statusLogs 为空数组 []

### Requirement: 依赖风险分级展示
系统 SHALL 在需求详情的依赖列表中展示每条依赖的风险等级。

#### Scenario: 依赖状态风险分级
- **WHEN** 查看需求详情
- **THEN** 每条依赖根据其 status 显示风险等级：
  - 已纳版/已投产 → 无风险（绿色 ✅）
  - 已就绪 → warning（橙色 ⚠️）
  - 草稿/待评审/已拒绝 → high（红色 🔴）
  - 已取消 → critical（红色 🔴 加粗）

### Requirement: 详情页操作按钮
系统 SHALL 在需求详情页底部展示操作按钮区域，按钮可见性与 US1.3 操作按钮矩阵一致。

#### Scenario: 草稿状态-BA角色
- **WHEN** BA 查看草稿状态需求详情
- **THEN** 底部显示"编辑"、"发起评审"、"取消"按钮

#### Scenario: 已投产状态
- **WHEN** 任何角色查看已投产状态需求详情
- **THEN** 底部无操作按钮

### Requirement: 返回列表链接
系统 SHALL 在详情页顶部提供"← 返回列表"链接。

#### Scenario: 点击返回列表
- **WHEN** 用户点击"← 返回列表"
- **THEN** 跳转到 /requirements，保留之前的筛选条件（通过 URL query 参数传递）

### Requirement: 操作历史时间线
系统 SHALL 以 Timeline 时间线组件展示需求的操作历史。

#### Scenario: 时间线展示
- **WHEN** 查看需求详情
- **THEN** 操作历史区域以 Ant Design Timeline 组件渲染
- **AND** 每条记录显示：操作时间（格式化为 YYYY-MM-DD HH:mm）、操作人姓名、操作类型中文标签、原因/备注（如有）
- **AND** 按时间倒序排列，最新的在最上面

## MODIFIED Requirements

### Requirement: RequirementDetail 类型扩展
RequirementDetail 接口新增 statusLogs 字段，DependencyItem 接口新增 riskLevel 字段。

```typescript
// 新增类型
interface StatusLogItem {
  id: string;
  operatorName: string;      // 操作人姓名
  operationType: OperationType; // 操作类型
  fromStatus?: ReqStatus;    // 变更前状态
  toStatus: ReqStatus;       // 变更后状态
  fromSubStatus?: ReqSubStatus;
  toSubStatus?: ReqSubStatus;
  reason?: string;           // 原因/备注
  createdAt: string;         // 操作时间 ISO 8601
}

// 扩展类型
interface DependencyItem {
  // ... 原有字段
  riskLevel: 'warning' | 'high' | 'critical' | null; // 新增
}
```