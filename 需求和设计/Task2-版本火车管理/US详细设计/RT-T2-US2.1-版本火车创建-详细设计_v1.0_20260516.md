# US2.1 版本火车创建（含搭载系统配置）- 详细设计

**版本号**: v1.0  
**日期**: 2026-05-16  
**设计状态**: 待审核  
**来源**: [RT-T2-版本火车管理-用户故事_v1.1_20260516.md](./RT-T2-版本火车管理-用户故事_v1.1_20260516.md)  
**PRD**: [RT-Task2-版本火车管理-PRD.md](./RT-Task2-版本火车管理-PRD.md) §3.4.1, §3.4.2

---

## 一、前置：Schema 对齐

### 1.1 现有 Schema 分析

现有 Prisma Schema（Task 0）与用户故事需求存在以下差异：

| 差异项 | 现有 Schema | 用户故事需求 | 变更类型 |
|--------|------------|-------------|----------|
| Train 模型 | 包含 startDate/endDate 等时间字段 | 创建时不需要时间，班次创建时再设置 | 字段用途调整 |
| TrainSystem 模型 | 无成员配置字段 | 需配置 BA、PM、TECH_MGR、TEST_MGR、开发团队 | 新增字段 |
| 版本火车名称 | name 字段存在 | 无变更 | 无需修改 |
| 描述 | description 字段存在 | 无变更 | 无需修改 |
| 版本状态 | TrainStatus 枚举存在 | 无变更 | 无需修改 |
| 乐观锁 | 无 version 字段 | 需增加 version 字段用于并发控制 | 新增字段 |
| 系统冲突校验 | 无校验逻辑 | 一个系统同一时间只能参与一个版本火车 | 新增校验逻辑 |

### 1.2 Schema 变更说明

> **设计决策**：班次创建（开始/结束时间）从火车创建中拆分出来，作为独立功能（US2.2）。火车创建时只设置名称和搭载系统，班次时间在后续阶段设置。

**Train 模型变更要点**：
- startDate/endDate 字段改为可选（创建时为空，US2.2 时填充）
- 新增 version 字段用于乐观锁
- 新增 boardingDate/lockdownDate/releaseDate 字段（US2.2 自动计算）

**TrainSystem 模型变更要点**：
- 新增团队成员配置字段：baUserId、pmUserId、techMgrUserId、testMgrUserId、devTeamUserIds

---

## 二、US2.1 功能边界

### 2.1 本次设计范围

| 功能 | 说明 | 状态 |
|------|------|------|
| 创建版本火车 | 设置名称、描述、配置搭载系统及团队成员和容量 | ✅ 本次 |
| 系统冲突校验 | 一个系统同一时间只能参与一个版本火车 | ✅ 本次 |
| 乐观锁 | version 字段用于并发控制 | ✅ 本次 |
| 添加搭载系统 | 火车创建后，可动态添加搭载系统 | ✅ 本次 |
| 移除搭载系统 | 火车创建后，可动态移除无纳版需求的系统 | ✅ 本次 |
| 调整容量 | 支持调整本期可用点数 | ✅ 本次 |

### 2.2 本次不做

| 功能 | 说明 | 原因 |
|------|------|------|
| 火车班次创建 | 设置开始/结束时间、计算关键节点 | US2.2 |
| 纳版搭载 | 将需求纳版到版本火车 | US2.5 |
| 从火车移除 | 移除已纳版需求 | US2.6 |
| 确认投产 | 确认需求投产 | US2.7 |
| 回滚 | 回滚已投产需求 | US2.8 |
| 完成版本火车 | 关闭版本火车 | US2.9 |

---

## 三、数据层详细设计

### 3.1 系统冲突校验逻辑

```typescript
/**
 * 校验系统是否可添加到火车
 * 
 * 业务规则：一个系统同一时间只能参与一个版本火车
 * 冲突判定：如果系统已在【进行中】或【计划中】火车中出现，则不允许添加到新火车
 * 
 * @param systemId - 待添加的系统ID
 * @param prisma - Prisma客户端
 * @returns 可用返回 null；不可用返回冲突火车信息
 */
async function checkSystemConflict(
  systemId: string,
  prisma: PrismaClient,
): Promise<{ conflict: boolean; train?: { id: string; name: string; status: TrainStatus } }> {
  // 查询该系统参与的所有火车
  const trainSystems = await prisma.trainSystem.findMany({
    where: { systemId },
    include: {
      train: {
        select: { id: true, name: true, status: true },
      },
    },
  });

  // 检查是否有【计划中】或【进行中】的火车
  const conflictTrain = trainSystems.find(
    (ts) => ts.train.status === TrainStatus.PLANNING || ts.train.status === TrainStatus.IN_PROGRESS,
  );

  if (conflictTrain) {
    return {
      conflict: true,
      train: conflictTrain.train,
    };
  }

  return { conflict: false };
}
```

### 3.2 乐观锁更新

```typescript
/**
 * 乐观锁更新版本火车
 * 
 * 使用 Prisma 的 updateMany 实现乐观锁：
 * - WHERE 条件包含 id 和 version，确保只有版本号匹配时才更新
 * - 更新成功后 version 自增 1
 * - 更新失败时区分"火车不存在"和"版本冲突"两种情况
 * 
 * @param id - 火车ID
 * @param version - 客户端持有的版本号
 * @param data - 要更新的字段数据
 * @returns 更新后的火车完整数据
 * @throws AppError 404 - 火车不存在
 * @throws AppError 409 - 乐观锁冲突
 */
async function updateTrainWithOptimisticLock(
  id: string,
  version: number,
  data: Prisma.TrainUpdateInput,
) {
  const result = await prisma.train.updateMany({
    where: { id, version },
    data: { ...data, version: { increment: 1 } },
  });

  if (result.count === 0) {
    const existing = await prisma.train.findUnique({ where: { id } });

    if (!existing) {
      throw errors.notFound('版本火车');
    }

    if (existing.version !== version) {
      throw errors.conflict('版本火车已被其他人修改，请刷新后重试');
    }

    throw errors.notFound('版本火车');
  }

  return prisma.train.findUnique({ where: { id } });
}
```

---

## 四、API 详细设计

### 4.1 创建版本火车

```
POST /api/trains
```

**请求体：**

```typescript
/** 创建版本火车请求参数 */
interface CreateTrainRequest {
  name: string;                                      // 必填，火车名称，2-100字符
  description?: string;                              // 可选，火车描述，最多2000字符
  systems: {
    systemId: string;                               // 必填，系统ID
    capacityPoints: number;                         // 必填，本期可用点数，1-500
    baUserId?: string;                              // 可选，业务BA用户ID
    pmUserId?: string;                              // 可选，产品经理用户ID
    techMgrUserId?: string;                         // 可选，技术经理用户ID
    testMgrUserId?: string;                         // 可选，测试负责人用户ID
    devTeamUserIds?: string[];                      // 可选，开发团队用户ID列表
  }[];
}
```

**Fastify Schema：**

```typescript
const createTrainBodySchema = {
  type: 'object',
  required: ['name', 'systems'],
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 100 },
    description: { type: 'string', maxLength: 2000 },
    systems: {
      type: 'array',
      items: {
        type: 'object',
        required: ['systemId', 'capacityPoints'],
        properties: {
          systemId: { type: 'string', minLength: 1 },
          capacityPoints: { type: 'integer', minimum: 1, maximum: 500 },
          baUserId: { type: 'string' },
          pmUserId: { type: 'string' },
          techMgrUserId: { type: 'string' },
          testMgrUserId: { type: 'string' },
          devTeamUserIds: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
};
```

**Service 层逻辑：**

```
1. 权限校验：当前用户角色 ∈ {TRAIN_ADMIN, SUPER_ADMIN}
2. 校验火车名称长度 2-100 字符
3. 校验至少添加一个搭载系统
4. 循环校验每个系统：
   a. 校验系统存在性
   b. 校验系统未参与【计划中】或【进行中】的火车（系统冲突校验）
   c. 校验容量点数 1-500
5. 事务内：
   a. 创建 Train 记录（status=PLANNING, startDate/endDate=null）
   b. 批量创建 TrainSystem 记录
6. 返回完整火车详情（含搭载系统）
```

**错误码：**

| 场景 | HTTP状态码 | code | message |
|------|-----------|------|---------|
| 未登录 | 401 | UNAUTHORIZED | 未登录或登录已过期 |
| 无权限 | 403 | FORBIDDEN | 无权限执行此操作 |
| 火车名称为空 | 400 | BAD_REQUEST | 火车名称不能为空 |
| 火车名称过长 | 400 | BAD_REQUEST | 火车名称长度不能超过100字符 |
| 系统不存在 | 400 | BAD_REQUEST | 系统不存在：{systemId} |
| 系统冲突 | 400 | BAD_REQUEST | 系统[{systemName}]已在火车[{trainName}]中，无法重复添加 |
| 容量点数超范围 | 400 | BAD_REQUEST | 容量点数必须为1-500的正整数 |

### 4.2 查询版本火车列表

```
GET /api/trains
```

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 火车状态筛选：PLANNING/IN_PROGRESS/COMPLETED/CANCELLED |
| page | number | 否 | 页码，默认1 |
| pageSize | number | 否 | 每页条数，默认20 |

**响应体：**

```typescript
/** 版本火车列表响应 */
interface TrainListResponse {
  list: TrainItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/** 版本火车列表项 */
interface TrainItem {
  id: string;
  name: string;
  status: TrainStatus;
  description?: string;
  startDate?: string;
  endDate?: string;
  systemCount: number;
  requirementCount: number;
  createdAt: string;
}
```

### 4.3 查询版本火车详情

```
GET /api/trains/:id
```

**响应体：**

```typescript
/** 版本火车详情响应 */
interface TrainDetail {
  id: string;
  name: string;
  status: TrainStatus;
  description?: string;
  version: number;
  startDate?: string;
  endDate?: string;
  boardingDate?: string;
  lockdownDate?: string;
  releaseDate?: string;
  createdBy: { id: string; displayName: string };
  createdAt: string;
  updatedAt: string;
  systems: TrainSystemDetail[];
}

/** 搭载系统详情 */
interface TrainSystemDetail {
  id: string;
  system: { id: string; name: string };
  capacityPoints: number;
  usedPoints: number;
  remainingPoints: number;
  usageRate: number;
  baUser?: { id: string; displayName: string };
  pmUser?: { id: string; displayName: string };
  techMgrUser?: { id: string; displayName: string };
  testMgrUser?: { id: string; displayName: string };
  devTeamUsers?: { id: string; displayName: string }[];
}
```

### 4.4 更新版本火车基本信息

```
PATCH /api/trains/:id
```

**请求体：**

```typescript
interface UpdateTrainRequest {
  version: number;
  name?: string;
  description?: string;
}
```

### 4.5 取消版本火车

```
POST /api/trains/:id/cancel
```

**前置条件**：火车状态为【计划中】且无已纳版需求

### 4.6 添加搭载系统

```
POST /api/trains/:id/systems
```

**请求体：**

```typescript
interface AddTrainSystemRequest {
  systemId: string;
  capacityPoints: number;
  baUserId?: string;
  pmUserId?: string;
  techMgrUserId?: string;
  testMgrUserId?: string;
  devTeamUserIds?: string[];
}
```

### 4.7 移除搭载系统

```
DELETE /api/trains/:id/systems/:systemId
```

**前置条件**：该系统下无已纳版需求（usedPoints === 0）

### 4.8 更新搭载系统配置

```
PATCH /api/trains/:id/systems/:systemId
```

### 4.9 获取可选系统列表

```
GET /api/systems/available?trainId={trainId}
```

---

## 五、前端详细设计

### 5.1 路由配置

```typescript
<Route path="/trains/new" element={<TrainCreatePage />} />
<Route path="/trains/:id" element={<TrainDetailPage />} />
<Route path="/trains/:id/edit" element={<TrainEditPage />} />
```

### 5.2 页面组件

| 组件 | 文件路径 | 职责 |
|------|----------|------|
| TrainCreatePage | `apps/web/src/pages/trains/create.tsx` | 火车创建页面 |
| TrainDetailPage | `apps/web/src/pages/trains/[id].tsx` | 火车详情页面 |
| TrainEditPage | `apps/web/src/pages/trains/edit.tsx` | 火车编辑页面 |
| TrainForm | `apps/web/src/components/trains/TrainForm.tsx` | 火车表单组件 |
| TrainSystemList | `apps/web/src/components/trains/TrainSystemList.tsx` | 搭载系统列表组件 |

### 5.3 前端 Service 层

**文件路径**: `apps/web/src/services/train.ts`

```typescript
async function createTrain(data: CreateTrainRequest): Promise<TrainDetail>;
async function getTrainList(params: TrainListParams): Promise<TrainListResponse>;
async function getTrainDetail(id: string): Promise<TrainDetail>;
async function updateTrain(id: string, data: UpdateTrainRequest): Promise<TrainDetail>;
async function cancelTrain(id: string): Promise<void>;
async function addTrainSystem(trainId: string, data: AddTrainSystemRequest): Promise<TrainSystemDetail>;
async function removeTrainSystem(trainId: string, systemId: string): Promise<void>;
async function updateTrainSystem(trainId: string, systemId: string, data: UpdateTrainSystemRequest): Promise<TrainSystemDetail>;
async function getAvailableSystems(trainId?: string): Promise<SystemOption[]>;
```

---

## 六、后端模块结构

### 6.1 文件组织

```
apps/server/src/modules/trains/
├── index.ts                    # 注册所有火车相关路由
├── routes/
│   ├── create.ts               # POST   /api/trains
│   ├── list.ts                # GET    /api/trains
│   ├── get.ts                 # GET    /api/trains/:id
│   ├── update.ts              # PATCH  /api/trains/:id
│   ├── cancel.ts              # POST   /api/trains/:id/cancel
│   └── systems.ts             # 搭载系统路由
├── services/
│   └── train.service.ts       # 业务逻辑
└── utils/
    └── capacity.ts             # 容量计算工具
```

---

## 七、测试案例

### 7.1 后端接口测试

| 编号 | 场景 | 前置条件 | 操作 | 预期结果 |
|------|------|----------|------|----------|
| T2.1.1 | 创建火车-正常 | TRAIN_ADMIN用户登录 | POST /api/trains | 201，status=PLANNING |
| T2.1.2 | 创建火车-无权限 | BA用户登录 | POST /api/trains | 403 |
| T2.1.3 | 创建火车-名称为空 | TRAIN_ADMIN用户登录 | name为空 | 400 |
| T2.1.4 | 创建火车-系统冲突 | 系统已在其他火车中 | 添加该系统 | 400 |
| T2.1.5 | 创建火车-容量超范围 | TRAIN_ADMIN用户登录 | capacityPoints=600 | 400 |
| T2.1.6 | 查询火车列表-正常 | 已登录 | GET /api/trains | 200 |
| T2.1.7 | 查询火车列表-状态筛选 | 已登录 | status=PLANNING | 200 |
| T2.1.8 | 查询火车详情-正常 | 已登录 | GET /api/trains/{id} | 200 |
| T2.1.9 | 添加搭载系统-正常 | TRAIN_ADMIN，火车计划中 | POST /api/trains/{id}/systems | 201 |
| T2.1.10 | 添加搭载系统-火车非计划中 | TRAIN_ADMIN，火车进行中 | POST /api/trains/{id}/systems | 400 |
| T2.1.11 | 移除搭载系统-有纳版需求 | TRAIN_ADMIN，火车计划中 | DELETE | 400 |
| T2.1.12 | 取消火车-正常 | TRAIN_ADMIN，火车计划中无需求 | POST /api/trains/{id}/cancel | 200 |
| T2.1.13 | 取消火车-有纳版需求 | TRAIN_ADMIN，火车有已纳版需求 | POST /api/trains/{id}/cancel | 400 |

### 7.2 前端功能测试

| 编号 | 场景 | 操作 | 预期结果 |
|------|------|------|----------|
| T2.1.14 | 创建火车页面 | 进入 /trains/new | 显示火车创建表单 |
| T2.1.15 | 添加搭载系统-冲突 | 选择已在其他火车的系统 | 显示冲突提示 |
| T2.1.16 | 火车详情页-标签页切换 | 点击"搭载系统"标签 | 显示系统列表和容量 |
| T2.1.17 | 容量使用率-红色预警 | 容量使用率≥90% | 进度条显示红色 |

---

## 八、版本记录

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0 | 2026-05-16 | 初版设计 |

---

*文档编号：RT-T2-US2.1*  
*创建时间：2026-05-16*  
*版本：v1.0（待审核）*
