# US2.2 火车班次创建与管理 - 详细设计

**版本号**: v1.1  
**日期**: 2026-05-17  
**设计状态**: 已实现  
**来源**: [RT-T2-版本火车管理-用户故事_v2.0_20260516.md](./RT-T2-版本火车管理-用户故事_v2.0_20260516.md)  
**PRD**: [RT-Task2-版本火车管理-PRD.md](./RT-Task2-版本火车管理-PRD.md) §3.4.3

---

## 一、功能概述

火车班次创建是为已创建的版本火车设置具体的时间周期和关键节点，支持班次列表管理、自定义关键日期。

### 1.1 功能模块

- **班次列表**：在版本火车列表页展示班次列表，支持点击查看详情
- **创建班次**：在列表页直接通过模态框创建班次，无需跳转详情页
- **编辑班次**：在列表页或详情页编辑班次，支持自定义关键日期
- **班次详情**：展示班次完整信息，包含日历视图和自定义关键日期

---

## 二、业务规则

| 编号 | 规则 | 校验时机 |
|------|------|----------|
| BR2.2.1 | 班次名称可选，不填则自动生成 | 提交时 |
| BR2.2.2 | 开始时间必填 | 提交时 |
| BR2.2.3 | 结束时间必填，且必须晚于开始时间 | 提交时 |
| BR2.2.4 | 系统自动计算关键节点时间（统一纳版、统一封板、统一投产） | 创建/更新时 |
| BR2.2.5 | 支持手动修改关键节点时间 | 操作时 |
| BR2.2.6 | 支持添加自定义关键日期，需输入名称和日期 | 操作时 |

---

## 三、关键节点时间计算

### 3.1 计算规则

| 节点 | 计算方式 |
|------|----------|
| **统一纳版日** | 周期过半前的最后一个周五 |
| **统一封板日** | 投产前一周的周五（即结束时间前 7 天的周五） |
| **统一投产日** | 结束时间（火车管理员指定） |

### 3.2 计算逻辑代码

```typescript
/**
 * 计算关键节点时间
 * 
 * 根据开始时间和结束时间，自动计算三个关键节点：
 * - 统一纳版日：周期过半前的最后一个周五
 * - 统一封板日：投产前一周的周五
 * - 统一投产日：结束时间
 * 
 * @param startDate - 火车开始日期
 * @param endDate - 火车结束日期
 * @returns 包含三个关键节点时间的对象
 */
function calculateKeyDates(startDate: Date, endDate: Date): {
  boardingDate: Date;  // 统一纳版日
  lockdownDate: Date;  // 统一封板日
  releaseDate: Date;   // 统一投产日
} {
  // 统一投产日 = 结束时间
  const releaseDate = new Date(endDate);
  
  // 统一封板日 = 投产前一周的周五
  const lockdownDate = getPreviousFriday(subtractDays(releaseDate, 7));
  
  // 统一纳版日 = 周期过半前的最后一个周五
  const totalDays = differenceInDays(endDate, startDate) + 1;
  const halfDays = Math.floor(totalDays / 2);
  const boardingDate = getPreviousFriday(subtractDays(startDate, 1 + halfDays));
  
  return { boardingDate, lockdownDate, releaseDate };
}

/**
 * 获取指定日期之前的最后一个周五
 * @param date - 参考日期
 * @returns 最近的周五（不晚于参考日期）
 */
function getPreviousFriday(date: Date): Date {
  const result = new Date(date);
  const dayOfWeek = result.getDay(); // 0=周日, 6=周六
  
  // 计算到周五的天数差
  // 周五=5，如果dayOfWeek<=5，则目标周五在同周；否则在上周
  const daysToFriday = dayOfWeek <= 5 ? dayOfWeek - 5 : dayOfWeek - 5 - 7;
  
  result.setDate(result.getDate() + daysToFriday);
  return result;
}

/**
 * 日期减法
 * @param date - 日期
 * @param days - 减去的天数
 * @returns 减去后的日期
 */
function subtractDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}
```

### 3.3 计算示例

| 实际周期 | 开始日期 | 结束日期 | 统一纳版日 | 统一封板日 | 统一投产日 |
|---------|----------|----------|------------|------------|------------|
| 2周（14天）| 周一 5/5 | 周五 5/16 | 周五 5/9 | 周五 5/9 | 周五 5/16 |
| 3周（21天）| 周一 5/5 | 周五 5/23 | 周五 5/16 | 周五 5/16 | 周五 5/23 |
| 4周（28天）| 周一 5/5 | 周五 5/30 | 周五 5/16 | 周五 5/23 | 周五 5/30 |
| 5周（35天）| 周一 5/5 | 周五 6/6 | 周五 5/23 | 周五 5/30 | 周五 6/6 |
| 6周（42天）| 周一 5/5 | 周五 6/13 | 周五 5/23 | 周五 6/6 | 周五 6/13 |

---

## 四、数据模型

### 4.1 TrainScheduleKeyDate 模型

```prisma
model TrainScheduleKeyDate {
  id             String       @id @default(cuid())
  trainScheduleId String
  name           String
  date           DateTime?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  trainSchedule  TrainSchedule @relation(fields: [trainScheduleId], references: [id], onDelete: Cascade)

  @@index([trainScheduleId])
}
```

### 4.2 TrainSchedule 模型（更新）

```prisma
model TrainSchedule {
  id             String             @id @default(cuid())
  trainId        String
  name           String
  startDate      DateTime?
  endDate        DateTime?
  boardingDate   DateTime?
  lockdownDate   DateTime?
  releaseDate    DateTime?
  version        Int               @default(1)
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt
  train          Train             @relation(fields: [trainId], references: [id], onDelete: Cascade)
  keyDates       TrainScheduleKeyDate[]
  snapshots      CapacitySnapshot[]

  @@index([trainId])
}
```

---

## 五、API 详细设计

### 5.1 创建火车班次

```
POST /api/trains/:trainId/schedules
```

**请求体：**

```typescript
/** 创建火车班次请求参数 */
interface CreateTrainScheduleRequest {
  name?: string;                              // 可选，班次名称，不填则自动生成
  startDate: string;                          // 必填，开始日期，格式 YYYY-MM-DD
  endDate: string;                            // 必填，结束日期，格式 YYYY-MM-DD
  boardingDate?: string;                      // 可选，统一纳版日
  lockdownDate?: string;                      // 可选，统一封板日
  releaseDate?: string;                       // 可选，统一投产日
  customKeyDates?: Array<{ name: string; date?: string | null }>; // 可选，自定义关键日期
}
```

**Service 层逻辑：**

```
1. 权限校验：TRAIN_ADMIN / SUPER_ADMIN
2. 校验火车存在
3. 校验开始时间不为空
4. 校验结束时间不为空
5. 校验结束时间晚于开始时间
6. 如果未提供关键节点，调用 calculateKeyDates() 计算
7. 生成班次名称（如果未提供）
8. 事务内创建班次和自定义关键日期
9. 返回创建的班次详情
```

**错误码：**

| 场景 | HTTP状态码 | code | message |
|------|-----------|------|---------|
| 火车不存在 | 404 | NOT_FOUND | 版本火车不存在 |
| 开始时间为空 | 400 | BAD_REQUEST | 开始时间不能为空 |
| 结束时间为空 | 400 | BAD_REQUEST | 结束时间不能为空 |
| 结束时间不晚于开始时间 | 400 | BAD_REQUEST | 结束时间必须晚于开始时间 |

### 5.2 更新火车班次

```
PUT /api/trains/:trainId/schedules/:scheduleId
```

**请求体：**

```typescript
interface UpdateTrainScheduleRequest {
  name?: string;                              // 可选，班次名称
  startDate?: string;                         // 可选，开始日期
  endDate?: string;                           // 可选，结束日期
  boardingDate?: string;                      // 可选，统一纳版日
  lockdownDate?: string;                      // 可选，统一封板日
  releaseDate?: string;                       // 可选，统一投产日
  customKeyDates?: Array<{ name: string; date?: string | null }>; // 可选，自定义关键日期
  version: number;                            // 必填，乐观锁版本号
}
```

**说明**：支持部分更新，开始/结束时间变更时会自动重新计算关键节点；也可手动调整关键节点时间和自定义关键日期。

**Service 层逻辑：**

```
1. 权限校验：TRAIN_ADMIN / SUPER_ADMIN
2. 校验班次存在
3. 校验版本号匹配（乐观锁）
4. 如果变更了 startDate 或 endDate 且未提供关键节点：
   a. 校验新的时间关系
   b. 重新计算 boardingDate、lockdownDate、releaseDate
5. 如果手动指定了关键节点，覆盖自动计算的值
6. 更新自定义关键日期（删除旧的，创建新的）
7. 版本号+1
8. 返回更新后的班次详情
```

### 5.3 获取班次详情

```
GET /api/trains/:trainId/schedules/:scheduleId
```

**响应体：**

```typescript
interface TrainScheduleDetailResponse {
  id: string;
  trainId: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  boardingDate: string | null;
  lockdownDate: string | null;
  releaseDate: string | null;
  customKeyDates: Array<{ id?: string; name: string; date: string | null }>;
  version: number;
  createdAt: string;
  train: { id: string; name: string };
  snapshots: Array<{
    id: string;
    system: { id: string; name: string };
    capacityPoints: number;
    usedPoints: number;
  }>;
}
```

### 5.4 获取关键节点信息

```
GET /api/trains/key-dates
```

**请求参数：**
- startDate: string (必填)
- endDate: string (必填)

**响应体：**

```typescript
interface KeyDatesResponse {
  startDate: string;
  endDate: string;
  boardingDate: string;
  lockdownDate: string;
  releaseDate: string;
  daysCount: number;  // 周期天数
}
```

---

## 六、前端详细设计

### 6.1 班次列表

**文件路径**: `apps/web/src/pages/trains/index.tsx`

**功能**：
- 显示班次列表
- 点击班次名称跳转到详情页
- 点击「创建班次」按钮打开创建模态框
- 点击「编辑」按钮打开编辑模态框

### 6.2 创建/编辑班次模态框

**文件路径**: `apps/web/src/pages/trains/index.tsx`（集成在列表页）

**弹窗布局：**

```
┌─────────────────────────────────────────────────────────┐
│  创建班次/编辑班次                              [×]  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  班次名称（自动生成）                                     │
│  [________________________________________________]     │
│                                                          │
│  开始时间 *                                               │
│  [____年__月__日 ▼]                                     │
│                                                          │
│  结束时间 *                                               │
│  [____年__月__日 ▼]                                     │
│                                                          │
│  [√] 手动设置关键日期                                    │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  统一纳版日：[____年__月__日 ▼]                  │ │
│  │  统一封板日：[____年__月__日 ▼]                  │ │
│  │  统一投产日：[____年__月__日 ▼]                  │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  [未勾选手动时显示]                                        │
│  [预览并生成关键日期] 按钮                                 │
│  ┌────────────────────────────────────────────────────┐ │
│  │  ⏱️ 系统自动计算的关键节点：                      │ │
│  │  📅 纳版：5月16日                                   │ │
│  │  🔒 封板：5月23日                                   │ │
│  │  🚀 投产：5月30日                                   │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ─────────────────────────────────────────────────────  │
│  自定义关键日期                                    [+添加]│
│  ┌────────────────────────────────────────────────────┐ │
│  │  [节点名称]  [选择日期]  [删除]                   │ │
│  │  [节点名称]  [选择日期]  [删除]                   │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                    [取消]  [保存]        │
└─────────────────────────────────────────────────────────┘
```

### 6.3 班次详情页

**文件路径**: `apps/web/src/pages/trains/schedule-detail.tsx`

**功能**：
- 显示班次基本信息
- 显示容量概览
- 显示搭载系统
- 显示关键节点（包含自定义关键日期）
- 显示日历视图（标记所有关键日期）
- 编辑班次功能

**日历视图**：标记所有关键日期（标准关键节点+自定义关键日期）

---

## 七、前端 Service 层

**文件路径**: `apps/web/src/services/train.ts`（扩展）

```typescript
/** 创建火车班次API调用 */
async function createTrainSchedule(
  trainId: string,
  data: CreateTrainScheduleRequest
): Promise<TrainScheduleDetailResponse>;

/** 更新火车班次API调用 */
async function updateTrainSchedule(
  trainId: string,
  scheduleId: string,
  data: UpdateTrainScheduleRequest
): Promise<TrainScheduleDetailResponse>;

/** 获取班次详情API调用 */
async function getTrainSchedule(
  trainId: string,
  scheduleId: string
): Promise<TrainScheduleDetailResponse>;

/** 获取关键节点信息API调用 */
async function getKeyDates(
  startDate: string,
  endDate: string
): Promise<KeyDatesResponse>;
```

---

## 八、测试案例

### 8.1 后端接口测试

| 编号 | 场景 | 前置条件 | 操作 | 预期结果 |
|------|------|----------|------|----------|
| T2.2.1 | 创建班次-正常 | 火车存在 | POST /api/trains/{id}/schedules | 200，班次创建成功 |
| T2.2.2 | 创建班次-自动生成名称 | 不填写班次名称 | POST /api/trains/{id}/schedules | 200，名称自动生成 |
| T2.2.3 | 创建班次-火车不存在 | 火车ID不存在 | POST /api/trains/{id}/schedules | 404 |
| T2.2.4 | 创建班次-结束时间早于开始 | 结束时间 < 开始时间 | POST /api/trains/{id}/schedules | 400 |
| T2.2.5 | 创建班次-带自定义关键日期 | 提供customKeyDates | POST /api/trains/{id}/schedules | 200，自定义关键日期保存成功 |
| T2.2.6 | 更新班次-正常 | 班次存在 | PUT /api/trains/{id}/schedules/{scheduleId} | 200 |
| T2.2.7 | 更新班次-版本号不匹配 | 提供错误版本号 | PUT /api/trains/{id}/schedules/{scheduleId} | 409 |
| T2.2.8 | 获取关键节点 | 提供startDate和endDate | GET /api/trains/key-dates | 200 |

### 8.2 前端功能测试

| 编号 | 场景 | 操作 | 预期结果 |
|------|------|------|----------|
| T2.2.9 | 创建班次-不填名称 | 班次名称留空 | 自动生成名称 |
| T2.2.10 | 关键节点预览 | 选择开始和结束时间 | 实时显示计算出的关键节点 |
| T2.2.11 | 添加自定义关键日期 | 点击「添加」按钮 | 显示输入框 |
| T2.2.12 | 删除自定义关键日期 | 点击「删除」按钮 | 该自定义日期被删除 |
| T2.2.13 | 班次列表点击 | 点击班次名称 | 跳转到班次详情页 |
| T2.2.14 | 日历视图显示 | 打开班次详情页 | 日历上标记所有关键日期 |
| T2.2.15 | 时间校验 | 结束时间早于开始时间 | 显示错误提示 |

---

## 九、版本记录

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0 | 2026-05-16 | 初版设计 |
| v1.1 | 2026-05-17 | 更新为实际实现：支持班次名称自动生成、自定义关键日期、列表页直接创建/编辑、班次详情页等 |

---

*文档编号：RT-T2-US2.2*  
*创建时间：2026-05-16*  
*版本：v1.1（已实现）*
