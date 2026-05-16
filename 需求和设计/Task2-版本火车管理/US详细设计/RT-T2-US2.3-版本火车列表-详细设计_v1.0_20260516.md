# US2.3 版本火车列表查询与筛选 - 详细设计

**版本号**: v1.0  
**日期**: 2026-05-16  
**设计状态**: 待审核  
**来源**: [RT-T2-版本火车管理-用户故事_v1.1_20260516.md](./RT-T2-版本火车管理-用户故事_v1.1_20260516.md)  
**PRD**: [RT-Task2-版本火车管理-PRD.md](./RT-Task2-版本火车管理-PRD.md) §3.3

---

## 一、功能概述

版本火车列表查询与筛选功能允许用户查看所有版本火车，并按状态进行筛选。

---

## 二、业务规则

| 编号 | 规则 | 校验时机 |
|------|------|----------|
| BR2.3.1 | 列表默认按创建时间倒序显示所有版本火车 | 加载时 |
| BR2.3.2 | 筛选条件：状态（全部/计划中/进行中/已完成/已取消） | 筛选时 |
| BR2.3.3 | 分页：每页 20 条，最大 100 条，支持翻页 | 查询时 |
| BR2.3.4 | 列表字段：版本火车名称、状态、开始时间、结束时间、关键节点、操作 | 显示时 |
| BR2.3.5 | 操作按钮根据火车状态 + 当前用户角色动态显示 | 渲染时 |

---

## 三、API 详细设计

### 3.1 查询版本火车列表

```
GET /api/trains
```

**查询参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| status | string | 否 | 火车状态筛选：PLANNING/IN_PROGRESS/COMPLETED/CANCELLED |
| page | number | 否 | 页码，默认1，最小1 |
| pageSize | number | 否 | 每页条数，默认20，最大100 |

**Fastify Schema：**

```typescript
const listTrainsQuerySchema = {
  type: 'object',
  properties: {
    status: { 
      type: 'string', 
      enum: ['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] 
    },
    page: { type: 'integer', minimum: 1, default: 1 },
    pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
  },
};
```

**响应体：**

```typescript
/** 版本火车列表响应 */
interface TrainListResponse {
  list: TrainListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/** 版本火车列表项 */
interface TrainListItem {
  id: string;
  name: string;
  status: TrainStatus;
  description?: string;
  startDate?: string;     // 班次创建后才有值
  endDate?: string;       // 班次创建后才有值
  boardingDate?: string;  // 统一纳版日
  lockdownDate?: string;  // 统一封板日
  releaseDate?: string;   // 统一投产日
  systemCount: number;    // 搭载系统数量
  requirementCount: number; // 已纳版需求数量
  createdAt: string;
}
```

**Service 层逻辑：**

```
1. 权限校验：所有已登录用户
2. 构建查询条件：
   a. 如果指定了 status，添加 status = :status 条件
3. 查询火车列表，按 createdAt 降序
4. 统计每个火车的搭载系统数量和已纳版需求数量
5. 计算分页信息
6. 返回分页列表
```

---

## 四、数据库查询优化

### 4.1 列表查询 SQL

```sql
SELECT 
  t.id,
  t.name,
  t.status,
  t.description,
  t.start_date,
  t.end_date,
  t.boarding_date,
  t.lockdown_date,
  t.release_date,
  t.created_at,
  COUNT(DISTINCT ts.id) as system_count,
  COUNT(DISTINCT r.id) FILTER (WHERE r.status = 'ONBOARDED') as requirement_count
FROM trains t
LEFT JOIN train_systems ts ON t.id = ts.train_id
LEFT JOIN requirements r ON t.id = r.train_id
WHERE (:status IS NULL OR t.status = :status)
GROUP BY t.id, t.name, t.status, t.description, t.start_date, t.end_date, 
         t.boarding_date, t.lockdown_date, t.release_date, t.created_at
ORDER BY t.created_at DESC
LIMIT :pageSize OFFSET :offset;
```

---

## 五、前端详细设计

### 5.1 页面组件

**文件路径**: `apps/web/src/pages/trains/index.tsx`

```typescript
/** 版本火车列表页面组件 */
const TrainsPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<TrainListItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0 });
  const [filters, setFilters] = useState({ status: undefined as TrainStatus | undefined });
  
  // 加载列表数据
  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getTrainList({ ...filters, page: pagination.page, pageSize: pagination.pageSize });
      setList(res.list);
      setPagination(res.pagination);
    } finally {
      setLoading(false);
    }
  };
  
  // 渲染
  return (
    <div>
      {/* 筛选区域 */}
      <FilterSection filters={filters} onChange={setFilters} onSearch={loadData} />
      {/* 列表区域 */}
      <Table loading={loading} dataSource={list} />
      {/* 分页 */}
      <Pagination onChange={loadData} />
    </div>
  );
};
```

### 5.2 筛选组件

**布局：**

```
┌──────────────────────────────────────────────────────────────┐
│  状态：[全部 ▼]                    [查询]  [重置]           │
├──────────────────────────────────────────────────────────────┤
│  [+ 创建版本火车]  ← 仅 TRAIN_ADMIN / SUPER_ADMIN 可见     │
└──────────────────────────────────────────────────────────────┘
```

**状态选项：**

| 值 | 标签 |
|------|------|
| 全部 | 全部 |
| PLANNING | 计划中 |
| IN_PROGRESS | 进行中 |
| COMPLETED | 已完成 |
| CANCELLED | 已取消 |

### 5.3 列表表格

**列定义：**

| 列 | 字段 | 宽度 | 说明 |
|------|------|------|------|
| 火车名称 | name | 200px | 可点击跳转详情页 |
| 状态 | status | 100px | Tag 组件显示 |
| 开始时间 | startDate | 120px | 班次创建后显示 |
| 结束时间 | endDate | 120px | 班次创建后显示 |
| 统一投产日 | releaseDate | 120px | 班次创建后显示 |
| 搭载系统 | systemCount | 80px | 数字 |
| 已纳版需求 | requirementCount | 100px | 数字 |
| 操作 | - | 150px | 根据状态显示按钮 |

**状态 Tag 样式：**

| 状态 | 颜色 |
|------|------|
| PLANNING | 蓝色 |
| IN_PROGRESS | 绿色 |
| COMPLETED | 灰色 |
| CANCELLED | 红色 |

### 5.4 操作按钮矩阵

| 火车状态 | 火车管理员可见操作 | 其他角色可见操作 |
|----------|-------------------|-----------------|
| 计划中 | 编辑、查看、取消、创建班次 | 查看 |
| 进行中 | 查看、完成 | 查看 |
| 已完成 | 查看 | 查看 |
| 已取消 | 查看 | 查看 |

---

## 六、前端 Service 层

**文件路径**: `apps/web/src/services/train.ts`

```typescript
/** 查询版本火车列表 */
async function getTrainList(params: {
  status?: TrainStatus;
  page?: number;
  pageSize?: number;
}): Promise<TrainListResponse>;
```

---

## 七、测试案例

### 7.1 后端接口测试

| 编号 | 场景 | 前置条件 | 操作 | 预期结果 |
|------|------|----------|------|----------|
| T2.3.1 | 查询列表-默认 | 已登录 | GET /api/trains | 200，返回分页列表 |
| T2.3.2 | 查询列表-状态筛选 | 已登录 | GET /api/trains?status=PLANNING | 200，只返回计划中火车 |
| T2.3.3 | 查询列表-分页 | 已登录 | GET /api/trains?page=2&pageSize=10 | 200，返回第2页10条 |
| T2.3.4 | 查询列表-分页边界 | 已登录 | pageSize=200 | 400，最大100条 |

### 7.2 前端功能测试

| 编号 | 场景 | 操作 | 预期结果 |
|------|------|------|----------|
| T2.3.5 | 列表加载 | 进入火车列表页 | 显示火车列表 |
| T2.3.6 | 状态筛选 | 选择"计划中"点击查询 | 只显示计划中火车 |
| T2.3.7 | 重置筛选 | 点击重置 | 筛选条件恢复默认 |
| T2.3.8 | 翻页 | 点击下一页 | 加载下一页数据 |
| T2.3.9 | 跳转到详情 | 点击火车名称 | 跳转到详情页 |
| T2.3.10 | 操作按钮-计划中 | TRAIN_ADMIN 查看计划中火车 | 显示编辑、查看、取消、创建班次按钮 |
| T2.3.11 | 操作按钮-进行中 | TRAIN_ADMIN 查看进行中火车 | 显示查看、完成按钮 |
| T2.3.12 | 操作按钮-无权限 | BA 查看火车列表 | 只显示查看按钮 |

---

## 八、版本记录

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0 | 2026-05-16 | 初版设计 |

---

*文档编号：RT-T2-US2.3*  
*创建时间：2026-05-16*  
*版本：v1.0（待审核）*
