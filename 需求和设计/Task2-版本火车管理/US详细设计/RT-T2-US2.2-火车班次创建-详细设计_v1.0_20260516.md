# US2.2 火车班次创建 - 详细设计

**版本号**: v1.0  
**日期**: 2026-05-16  
**设计状态**: 待审核  
**来源**: [RT-T2-版本火车管理-用户故事_v1.1_20260516.md](./RT-T2-版本火车管理-用户故事_v1.1_20260516.md)  
**PRD**: [RT-Task2-版本火车管理-PRD.md](./RT-Task2-版本火车管理-PRD.md) §3.4.3

---

## 一、功能概述

火车班次创建是为已创建的版本火车设置具体的时间周期和关键节点。

### 1.1 与 US2.1 的关系

- US2.1：创建版本火车，设置名称、描述、搭载系统（状态：计划中）
- **US2.2**：创建火车班次，设置开始/结束时间，系统自动计算关键节点（状态：进行中）

---

## 二、业务规则

| 编号 | 规则 | 校验时机 |
|------|------|----------|
| BR2.2.1 | 前置条件：版本火车状态必须为「计划中」 | 操作时 |
| BR2.2.2 | 开始时间必填 | 提交时 |
| BR2.2.3 | 结束时间必填，且必须晚于开始时间 | 提交时 |
| BR2.2.4 | 系统自动计算关键节点时间（统一纳版、统一封板、统一投产） | 创建时 |
| BR2.2.5 | 班次创建后，版本火车状态变更为「进行中」 | 变更时 |
| BR2.2.6 | 班次时间创建后，关键节点时间支持调整 | 操作时 |

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

## 四、API 详细设计

### 4.1 创建火车班次

```
POST /api/trains/:id/schedule
```

**请求体：**

```typescript
/** 创建火车班次请求参数 */
interface CreateTrainScheduleRequest {
  startDate: string;  // 必填，开始日期，格式 YYYY-MM-DD
  endDate: string;    // 必填，结束日期，格式 YYYY-MM-DD
}
```

**Fastify Schema：**

```typescript
const createScheduleBodySchema = {
  type: 'object',
  required: ['startDate', 'endDate'],
  properties: {
    startDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },  // YYYY-MM-DD 格式
    endDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
  },
};
```

**Service 层逻辑：**

```
1. 权限校验：TRAIN_ADMIN / SUPER_ADMIN
2. 校验火车存在
3. 校验火车状态为 PLANNING（计划中）
4. 校验开始时间不为空
5. 校验结束时间不为空
6. 校验结束时间晚于开始时间
7. 调用 calculateKeyDates() 计算关键节点
8. 事务内更新火车：
   a. 设置 startDate、endDate
   b. 设置 boardingDate、lockdownDate、releaseDate
   c. 变更状态为 IN_PROGRESS
9. 返回更新后的火车详情
```

**错误码：**

| 场景 | HTTP状态码 | code | message |
|------|-----------|------|---------|
| 火车不存在 | 404 | NOT_FOUND | 版本火车不存在 |
| 火车状态非计划中 | 400 | BAD_REQUEST | 只有计划中的火车才能创建班次 |
| 开始时间为空 | 400 | BAD_REQUEST | 开始时间不能为空 |
| 结束时间为空 | 400 | BAD_REQUEST | 结束时间不能为空 |
| 结束时间不晚于开始时间 | 400 | BAD_REQUEST | 结束时间必须晚于开始时间 |

### 4.2 更新火车班次

```
PATCH /api/trains/:id/schedule
```

**请求体：**

```typescript
interface UpdateTrainScheduleRequest {
  startDate?: string;   // 可选，开始日期
  endDate?: string;    // 可选，结束日期
  boardingDate?: string;  // 可选，统一纳版日
  lockdownDate?: string; // 可选，统一封板日
  releaseDate?: string;  // 可选，统一投产日
}
```

**说明**：支持部分更新，开始/结束时间变更时会自动重新计算关键节点；也可手动调整关键节点时间。

**Service 层逻辑：**

```
1. 权限校验：TRAIN_ADMIN / SUPER_ADMIN
2. 校验火车存在且状态为 IN_PROGRESS（进行中）
3. 如果变更了 startDate 或 endDate：
   a. 校验新的时间关系
   b. 重新计算 boardingDate、lockdownDate、releaseDate
4. 如果手动指定了关键节点，覆盖自动计算的值
5. 更新火车时间字段
6. 返回更新后的火车详情
```

### 4.3 获取关键节点信息

```
GET /api/trains/:id/key-dates
```

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

## 五、前端详细设计

### 5.1 创建班次按钮

**位置**：版本火车详情页，基本信息标签页

**显示条件**：火车状态为「计划中」时显示「创建班次」按钮

```typescript
{/* 火车详情页操作按钮区域 */}
{status === TrainStatus.PLANNING && (
  <Button type="primary" onClick={() => setShowScheduleModal(true)}>
    创建班次
  </Button>
)}
```

### 5.2 创建班次弹窗

**文件路径**: `apps/web/src/components/trains/ScheduleModal.tsx`

```typescript
interface ScheduleModalProps {
  visible: boolean;
  train: TrainDetail;
  onClose: () => void;
  onSuccess: () => void;
}
```

**弹窗布局：**

```
┌─────────────────────────────────────────────────────────┐
│  创建班次                                        [×]  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  开始时间 *                                               │
│  [____年__月__日 ▼]                                     │
│                                                          │
│  结束时间 *                                               │
│  [____年__月__日 ▼]                                     │
│                                                          │
│  ─────────────────────────────────────────────────────  │
│  关键节点预览（创建后生效）                                │
│  ┌────────────────────────────────────────────────────┐ │
│  │  统一纳版日：___年___月___日（周五）              │ │
│  │  统一封板日：___年___月___日（周五）              │ │
│  │  统一投产日：___年___月___日                      │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  💡 提示：结束时间建议选周五，便于关键节点计算            │
│                                                          │
├─────────────────────────────────────────────────────────┤
│                                    [取消]  [确认创建]    │
└─────────────────────────────────────────────────────────┘
```

### 5.3 关键节点预览组件

**功能**：选择开始/结束时间后，实时预览计算出的关键节点日期

```typescript
/** 关键节点预览组件 */
const KeyDatesPreview: React.FC<{ startDate: Date; endDate: Date }> = ({ startDate, endDate }) => {
  const [dates, setDates] = useState<KeyDatesResponse | null>(null);
  
  useEffect(() => {
    if (startDate && endDate && endDate > startDate) {
      // 调用 calculateKeyDates 计算
      const calculated = calculateKeyDates(startDate, endDate);
      setDates(calculated);
    }
  }, [startDate, endDate]);
  
  if (!dates) return null;
  
  return (
    <div className="key-dates-preview">
      <div>统一纳版日：{format(dates.boardingDate, 'yyyy年MM月dd日')}（周五）</div>
      <div>统一封板日：{format(dates.lockdownDate, 'yyyy年MM月dd日')}（周五）</div>
      <div>统一投产日：{format(dates.releaseDate, 'yyyy年MM月dd日')}</div>
    </div>
  );
};
```

---

## 六、前端 Service 层

**文件路径**: `apps/web/src/services/train.ts`（扩展）

```typescript
/** 创建火车班次API调用 */
async function createTrainSchedule(
  trainId: string,
  data: CreateTrainScheduleRequest
): Promise<TrainDetail>;

/** 更新火车班次API调用 */
async function updateTrainSchedule(
  trainId: string,
  data: UpdateTrainScheduleRequest
): Promise<TrainDetail>;

/** 获取关键节点信息API调用 */
async function getKeyDates(trainId: string): Promise<KeyDatesResponse>;
```

---

## 七、测试案例

### 7.1 后端接口测试

| 编号 | 场景 | 前置条件 | 操作 | 预期结果 |
|------|------|----------|------|----------|
| T2.2.1 | 创建班次-正常 | 火车状态为计划中 | POST /api/trains/{id}/schedule | 200，状态变为进行中 |
| T2.2.2 | 创建班次-火车不存在 | 火车ID不存在 | POST /api/trains/{id}/schedule | 404 |
| T2.2.3 | 创建班次-火车非计划中 | 火车状态为进行中 | POST /api/trains/{id}/schedule | 400 |
| T2.2.4 | 创建班次-结束时间早于开始 | 火车状态为计划中 | 结束时间 < 开始时间 | 400 |
| T2.2.5 | 更新班次-正常 | 火车状态为进行中 | PATCH /api/trains/{id}/schedule | 200 |
| T2.2.6 | 获取关键节点 | 火车有班次 | GET /api/trains/{id}/key-dates | 200 |

### 7.2 前端功能测试

| 编号 | 场景 | 操作 | 预期结果 |
|------|------|------|----------|
| T2.2.7 | 创建班次按钮-计划中 | 火车状态为计划中 | 显示「创建班次」按钮 |
| T2.2.8 | 创建班次按钮-进行中 | 火车状态为进行中 | 不显示「创建班次」按钮 |
| T2.2.9 | 关键节点预览 | 选择开始和结束时间 | 实时显示计算出的关键节点 |
| T2.2.10 | 时间校验 | 结束时间早于开始时间 | 显示错误提示 |

---

## 八、版本记录

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0 | 2026-05-16 | 初版设计 |

---

*文档编号：RT-T2-US2.2*  
*创建时间：2026-05-16*  
*版本：v1.0（待审核）*
