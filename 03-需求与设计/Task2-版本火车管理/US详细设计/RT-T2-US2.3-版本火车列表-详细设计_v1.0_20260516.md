# US2.3 班次列表查询与火车切换 - 详细设计

**版本号**: v1.1  
**日期**: 2026-05-16  
**设计状态**: 按现有代码校准  
**来源**: [RT-T2-版本火车管理-用户故事_v2.0_20260516.md](../RT-T2-版本火车管理-用户故事_v2.0_20260516.md)  
**代码口径**: 以当前 `release-train` 工程实现为准  
**说明**: 原 v1.0 详细设计描述的是“版本火车列表查询与筛选”，与 v2.0 用户故事 US2.3 不一致。本版按现有代码改为“班次列表查询与火车切换”。

---

## 一、功能概述

US2.3 当前实现为班次列表查询与火车切换能力。用户进入班次列表页后，可以查看所有班次，也可以通过顶部“所属火车”下拉框切换到某一辆火车，只查看该火车下的班次。

当前代码中，“版本火车”模块拆成两个页面：

| 页面 | 路由 | 代码文件 | 说明 |
|------|------|----------|------|
| 火车列表页 | `/trains` | `apps/web/src/pages/trains/index.tsx` | 展示版本火车列表，并提供进入班次列表的按钮 |
| 班次列表页 | `/schedules` | `apps/web/src/pages/trains/schedules/index.tsx` | 展示班次列表，支持按火车切换 |
| 班次详情页 | `/trains/:trainId/schedules/:scheduleId` | `apps/web/src/pages/trains/schedule-detail.tsx` | 展示单个班次详情 |

---

## 二、业务规则

| 编号 | 规则 | 当前实现情况 | 代码位置 |
|------|------|--------------|----------|
| BR2.3.1 | 进入班次列表页，默认展示班次列表 | 已实现。进入 `/schedules` 时默认查询全局班次列表 | `apps/web/src/pages/trains/schedules/index.tsx` |
| BR2.3.2 | 顶部显示火车下拉选择器，用于切换不同火车 | 已实现。“所属火车”下拉来自 `GET /api/trains` | `apps/web/src/pages/trains/schedules/index.tsx` |
| BR2.3.3 | 选择火车后刷新班次列表 | 已实现。选择火车后调用 `GET /api/trains/:trainId/schedules` | `apps/web/src/pages/trains/schedules/index.tsx` |
| BR2.3.4 | 班次列表按创建时间倒序展示 | 已实现。后端 `orderBy: { createdAt: 'desc' }` | `apps/server/src/modules/trains/services/train.service.ts` |
| BR2.3.5 | 全局班次列表分页，每页默认 20 条 | 已实现。`GET /api/schedules?page=&pageSize=` | `apps/server/src/modules/trains/routes/schedule.ts` |
| BR2.3.6 | 按火车查询班次列表 | 已实现，但当前不分页，返回该火车全部班次 | `apps/server/src/modules/trains/routes/schedule.ts` |
| BR2.3.7 | 班次列表展示班次名称、状态、时间、关键日期、容量和需求数 | 部分实现。当前展示班次名称、状态、开始/结束日期、纳版截止、统一投产日、搭载系统数、已纳版数、创建时间 | `apps/web/src/pages/trains/schedules/index.tsx` |
| BR2.3.8 | 点击班次进入班次详情页 | 已实现。表格行点击跳转详情页 | `apps/web/src/pages/trains/schedules/index.tsx` |
| BR2.3.9 | 操作按钮根据班次状态显示 | 已实现状态维度：计划中可开始，进行中可封板，封板后可投产，未投产可取消，均可编辑 | `apps/web/src/pages/trains/schedules/index.tsx` |
| BR2.3.10 | 操作按钮根据角色控制 | 部分实现。后端写接口有权限控制，前端班次列表按钮未按角色显隐 | `apps/server/src/modules/trains/routes/schedule.ts` |

---

## 三、API 详细设计

### 3.1 查询火车列表

```
GET /api/trains
```

**用途**: 为班次列表页顶部“所属火车”下拉框提供选项，同时也用于火车列表页。

**查询参数**:

| 参数 | 类型 | 必填 | 当前代码说明 |
|------|------|------|--------------|
| page | number | 否 | 默认 1 |
| pageSize | number | 否 | 默认 20，后端 schema 当前最大 1000 |
| status | string | 否 | schema 保留，但当前 service 未实际使用该筛选条件 |

**响应体**:

```typescript
interface TrainListResponseData {
  list: TrainListItemResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface TrainListItemResponse {
  id: string;
  name: string;
  description?: string;
  systemCount: number;
  scheduleCount: number;
  totalCapacity: number;
  createdAt: string;
}
```

**当前服务逻辑**:

1. 读取 `page`、`pageSize`，计算分页偏移。
2. 查询 `train`，按 `createdAt` 倒序排列。
3. 关联统计搭载系统数、班次数、总容量。
4. 返回火车列表和分页信息。

**代码位置**:

- `apps/server/src/modules/trains/routes/list.ts`
- `apps/server/src/modules/trains/services/train.service.ts#listTrains`
- `apps/web/src/services/train.ts#list`

---

### 3.2 查询全局班次列表

```
GET /api/schedules
```

**用途**: 进入班次列表页且未选择具体火车时，展示全部班次。

**查询参数**:

| 参数 | 类型 | 必填 | 当前代码说明 |
|------|------|------|--------------|
| page | number | 否 | 默认 1，最小 1 |
| pageSize | number | 否 | 默认 20，最大 100 |

**响应体**:

```typescript
interface ScheduleListResponse {
  list: ScheduleItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface ScheduleItem {
  id: string;
  trainId: string;
  trainName: string;
  name: string;
  status: TrainScheduleStatus;
  startDate?: string;
  endDate?: string;
  boardingDate?: string;
  lockdownDate?: string;
  releaseDate?: string;
  systemCount: number;
  totalCapacity: number;
  usedCapacity: number;
  requirementCount: number;
  createdAt: string;
  version: number;
}
```

**当前服务逻辑**:

1. 读取分页参数。
2. 查询全部班次，按 `createdAt` 倒序排列。
3. 关联火车名称、容量快照、已纳版需求数。
4. 返回班次列表和分页信息。

**代码位置**:

- `apps/server/src/modules/trains/routes/schedule.ts`
- `apps/server/src/modules/trains/services/train.service.ts#listAllSchedules`
- `apps/web/src/pages/trains/schedules/index.tsx#loadScheduleList`

---

### 3.3 查询指定火车的班次列表

```
GET /api/trains/:trainId/schedules
```

**用途**: 用户在班次列表页选择某辆火车后，只展示该火车下的班次。

**路径参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| trainId | string | 是 | 火车 ID |

**响应体**:

```typescript
interface TrainScheduleListResponse {
  list: ScheduleItem[];
}
```

**当前服务逻辑**:

1. 校验火车是否存在。
2. 查询该火车下所有班次，按 `createdAt` 倒序排列。
3. 统计每个班次的容量、已使用容量和需求数。
4. 返回班次列表。

**当前限制**:

- 该接口当前没有分页参数。
- 前端选择具体火车后，会把分页总数设置为当前返回列表长度。

**代码位置**:

- `apps/server/src/modules/trains/routes/schedule.ts`
- `apps/server/src/modules/trains/services/train.service.ts#listTrainSchedules`
- `apps/web/src/pages/trains/schedules/index.tsx#handleTrainChange`

---

### 3.4 班次状态变更

```
POST /api/trains/:trainId/schedules/:scheduleId/status
```

**用途**: 在班次列表页根据当前班次状态执行开始、封板、投产等操作。

**请求体**:

```typescript
interface UpdateScheduleStatusRequest {
  status: 'PLANNING' | 'IN_PROGRESS' | 'LOCKED_DOWN' | 'RELEASED';
}
```

**前端操作映射**:

| 当前状态 | 页面按钮 | 目标状态 |
|----------|----------|----------|
| PLANNING | 开始 | IN_PROGRESS |
| IN_PROGRESS | 封板 | LOCKED_DOWN |
| LOCKED_DOWN | 投产 | RELEASED |

**权限**:

后端通过 `rbacMiddleware(Operation.MANAGE_TRAIN)` 控制，只有具备火车管理权限的用户可以变更状态。

---

### 3.5 取消班次

```
DELETE /api/trains/:trainId/schedules/:scheduleId
```

**用途**: 在班次未投产前取消班次。

**当前前端规则**:

- `status !== 'RELEASED'` 时显示“取消”按钮。
- 点击后弹窗确认。

**权限**:

后端通过 `rbacMiddleware(Operation.MANAGE_TRAIN)` 控制。

---

## 四、前端详细设计

### 4.1 页面入口

当前路由配置：

```typescript
<Route index element={<Navigate to="/trains" replace />} />
<Route path="/schedules" element={<SchedulesPage />} />
<Route path="/trains" element={<TrainsPage />} />
<Route path="/trains/:trainId/schedules/:scheduleId" element={<ScheduleDetailPage />} />
```

当前实现中，默认入口仍跳转到 `/trains` 火车列表页；班次列表页通过 `/schedules` 访问，或从火车列表页点击“班次列表”按钮进入。

### 4.2 班次列表页布局

**页面标题**: 班次列表  
**页面说明**: 查看和维护版本火车的班次、关键日期和当前状态。

页面结构：

```
┌──────────────────────────────────────────────────────────────┐
│ 班次列表                                  [刷新] [火车列表] │
│ 查看和维护版本火车的班次、关键日期和当前状态。               │
├──────────────────────────────────────────────────────────────┤
│ 所属火车：[全部火车 ▼]                  [新增班次]           │
├──────────────────────────────────────────────────────────────┤
│ 班次名称 | 状态 | 开始日期 | 结束日期 | 纳版截止 | 投产日 ... │
├──────────────────────────────────────────────────────────────┤
│ 分页器：共 N 条                                               │
└──────────────────────────────────────────────────────────────┘
```

### 4.3 火车下拉选择器

| 项 | 当前实现 |
|----|----------|
| 数据来源 | `GET /api/trains?page=1&pageSize=1000` |
| 默认值 | 未选择，表示全部火车 |
| 支持清空 | 支持 |
| 切换行为 | 有值时查指定火车班次；清空时查全局班次 |
| 新增班次前置 | 必须先选择所属火车 |

### 4.4 班次列表表格

| 列 | 字段 | 当前展示 |
|----|------|----------|
| 班次名称 | name | 是 |
| 状态 | status | 是，使用 `StatusTag` |
| 开始日期 | startDate | 是 |
| 结束日期 | endDate | 是 |
| 纳版截止 | boardingDate | 是 |
| 统一投产日 | releaseDate | 是 |
| 搭载系统 | systemCount | 是 |
| 已纳版 | requirementCount | 是 |
| 创建时间 | createdAt | 是 |
| 操作 | action | 是 |

**说明**: 后端返回了 `trainName`，但当前表格未单独展示“所属火车”列。若产品要求严格对齐 v2.0 AC2.3.3，建议在表格中补充“所属火车”列。

### 4.5 表格交互

| 操作 | 当前实现 |
|------|----------|
| 点击行 | 跳转到 `/trains/:trainId/schedules/:scheduleId` |
| 刷新 | 重新加载当前筛选下的班次列表 |
| 火车列表 | 跳转回 `/trains` |
| 新增班次 | 必须先选择火车，打开新增班次弹窗 |
| 编辑班次 | 打开编辑班次弹窗 |
| 开始/封板/投产 | 调用状态变更接口 |
| 取消班次 | 调用删除班次接口 |

### 4.6 新增班次弹窗

| 字段 | 必填 | 当前说明 |
|------|------|----------|
| 班次名称 | 否 | 不填时后端按火车名称自动生成 |
| 开始日期 | 是 | DatePicker |
| 结束日期 | 是 | DatePicker |

提交接口：

```
POST /api/trains/:trainId/schedules
```

### 4.7 编辑班次弹窗

当前支持编辑：

- 班次名称
- 开始日期
- 结束日期
- 纳版截止日期
- 封板日期
- 统一投产日
- 自定义关键日期

提交接口：

```
PUT /api/trains/:trainId/schedules/:scheduleId
```

---

## 五、后端详细设计

### 5.1 路由清单

| 方法 | 路径 | 用途 | 权限 |
|------|------|------|------|
| GET | `/api/schedules` | 查询全局班次列表 | 登录用户 |
| GET | `/api/trains/:trainId/schedules` | 查询指定火车班次列表 | 登录用户 |
| GET | `/api/trains/:trainId/schedules/:scheduleId` | 查询班次详情 | 登录用户 |
| POST | `/api/trains/:trainId/schedules` | 创建班次 | 火车管理权限 |
| PUT/PATCH | `/api/trains/:trainId/schedules/:scheduleId` | 更新班次 | 火车管理权限 |
| DELETE | `/api/trains/:trainId/schedules/:scheduleId` | 取消班次 | 火车管理权限 |
| POST | `/api/trains/:trainId/schedules/:scheduleId/status` | 更新班次状态 | 火车管理权限 |
| POST | `/api/trains/schedules/preview` | 预览关键日期 | 火车管理权限 |

### 5.2 班次列表查询逻辑

**全局班次列表**:

```typescript
prisma.trainSchedule.findMany({
  skip,
  take: pageSize,
  orderBy: { createdAt: 'desc' },
  include: {
    train: { select: { id: true, name: true } },
    snapshots: { select: { id: true, capacityPoints: true, usedPoints: true } },
    requirements: { select: { id: true } },
  },
});
```

**指定火车班次列表**:

```typescript
prisma.trainSchedule.findMany({
  where: { trainId },
  orderBy: { createdAt: 'desc' },
  include: {
    snapshots: { select: { id: true, capacityPoints: true, usedPoints: true } },
    requirements: { select: { id: true } },
  },
});
```

### 5.3 返回字段计算

| 字段 | 计算方式 |
|------|----------|
| `systemCount` | `snapshots.length` |
| `totalCapacity` | 容量快照 `capacityPoints` 求和 |
| `usedCapacity` | 容量快照 `usedPoints` 求和 |
| `requirementCount` | 关联需求数量 |
| 日期字段 | ISO 日期截取 `YYYY-MM-DD` |

---

## 六、与用户故事 v2.0 的差距说明

当前代码已经实现了班次列表和火车切换的主流程。按本轮确认范围，“用户相关火车过滤”和“默认选中相关火车”暂不纳入本轮差距；当前仅保留以下差距：

| 差距项 | 用户故事/页面体验要求 | 当前代码 | 建议 |
|--------|----------------------|----------|------|
| 所属火车字段 | 班次列表包含所属火车，便于在全局班次列表中识别来源火车 | 后端返回 `trainName`，前端表格未展示 | 增加“所属火车”列 |
| 分页一致性 | 超过 20 条支持翻页 | 全局班次分页；指定火车班次不分页 | `GET /api/trains/:trainId/schedules` 增加分页参数和 `pagination` 返回 |
| 前端权限按钮 | 操作按钮根据班次状态 + 当前用户角色动态显示 | 后端有权限控制，前端未按角色隐藏编辑、取消、开始、封板、投产等按钮 | 前端根据角色控制操作按钮显隐，后端权限继续兜底 |

---
## 七、测试案例建议

### 7.1 后端接口测试

| 编号 | 场景 | 前置条件 | 操作 | 预期结果 |
|------|------|----------|------|----------|
| T2.3.1 | 查询全局班次列表 | 已登录 | `GET /api/schedules` | 返回分页班次列表，按创建时间倒序 |
| T2.3.2 | 查询全局班次分页 | 已登录且超过 20 条班次 | `GET /api/schedules?page=2&pageSize=20` | 返回第 2 页数据和分页信息 |
| T2.3.3 | 查询指定火车班次 | 已登录，火车存在 | `GET /api/trains/:trainId/schedules` | 只返回该火车班次 |
| T2.3.4 | 查询不存在火车班次 | 已登录，火车不存在 | `GET /api/trains/not-exist/schedules` | 返回火车不存在错误 |
| T2.3.5 | 创建班次权限 | 非火车管理员 | `POST /api/trains/:trainId/schedules` | 返回无权限 |
| T2.3.6 | 状态变更权限 | 非火车管理员 | `POST /api/trains/:trainId/schedules/:scheduleId/status` | 返回无权限 |

### 7.2 前端功能测试

| 编号 | 场景 | 操作 | 预期结果 |
|------|------|------|----------|
| T2.3.7 | 班次列表加载 | 进入 `/schedules` | 显示班次列表和分页器 |
| T2.3.8 | 火车下拉加载 | 进入 `/schedules` | 所属火车下拉显示火车列表 |
| T2.3.9 | 切换火车 | 选择某辆火车 | 列表刷新为该火车下的班次 |
| T2.3.10 | 清空火车筛选 | 清空所属火车 | 列表恢复为全局班次列表 |
| T2.3.11 | 进入班次详情 | 点击表格行 | 跳转到班次详情页 |
| T2.3.12 | 未选火车新增班次 | 未选择火车点击新增班次 | 提示“请先选择所属火车” |
| T2.3.13 | 状态按钮显示 | 查看不同状态班次 | 按状态显示开始/封板/投产/取消等按钮 |

---

## 八、版本记录

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0 | 2026-05-16 | 初版，描述版本火车列表查询与筛选 |
| v1.1 | 2026-05-16 | 按当前代码和 v2.0 用户故事校准为班次列表查询与火车切换 |

---

*文档编号：RT-T2-US2.3*  
*创建时间：2026-05-16*  
*版本：v1.1（按代码校准）*