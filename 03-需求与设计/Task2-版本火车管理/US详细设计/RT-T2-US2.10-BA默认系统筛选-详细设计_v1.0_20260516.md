# US2.10 BA 默认系统筛选（Task 1 增强）- 详细设计

**版本号**: v1.0  
**日期**: 2026-05-16  
**设计状态**: 待审核  
**来源**: [RT-T2-版本火车管理-用户故事_v1.1_20260516.md](./RT-T2-版本火车管理-用户故事_v1.1_20260516.md)  
**PRD**: [RT-Task2-版本火车管理-PRD.md](./RT-Task2-版本火车管理-PRD.md) §四

---

## 一、功能概述

BA（业务分析）用户进入需求列表页时，系统默认显示其归属系统的需求，而非全部系统。

---

## 二、业务规则

| 编号 | 规则 | 校验时机 |
|------|------|----------|
| BR2.10.1 | 触发条件：当前用户角色为 BA，进入需求列表页 | 加载时 |
| BR2.10.2 | 查询该 BA 在版本火车搭载系统中作为业务归属人的系统列表 | 查询时 |
| BR2.10.3 | 取第一个系统 ID 作为 systemId 默认值 | 加载时 |
| BR2.10.4 | 前端系统下拉框默认选中该系统 | 渲染时 |
| BR2.10.5 | BA 可手动切换系统下拉框查看其他系统需求 | 操作时 |
| BR2.10.6 | 若无归属系统时，显示全部系统需求（回退到 MVP 行为） | 加载时 |

---

## 三、API 详细设计

### 3.1 获取 BA 的默认系统

```
GET /api/users/me/default-system
```

**说明**：获取当前用户（BA角色）的默认归属系统

**响应体：**

```typescript
interface DefaultSystemResponse {
  systemId: string | null;  // null 表示无归属系统，返回全部
  systemName: string | null;
  allSystemsAvailable: boolean;  // 是否显示全部系统
}
```

**Service 层逻辑：**

```
1. 获取当前用户
2. 校验用户角色为 BA
3. 查询 TrainSystem 表，查找该 BA 作为业务归属人的搭载系统
   SELECT DISTINCT ts.systemId, s.name
   FROM train_systems ts
   JOIN systems s ON ts.systemId = s.id
   JOIN trains t ON ts.trainId = t.id
   WHERE t.status IN ('PLANNING', 'IN_PROGRESS')
     AND ts.ba_user_id = :userId
   ORDER BY ts.created_at ASC
   LIMIT 1
4. 如果找到，返回第一个系统的 ID 和名称
5. 如果未找到，返回 allSystemsAvailable=true，表示显示全部
```

### 3.2 获取 BA 的归属系统列表

```
GET /api/users/me/systems
```

**说明**：获取当前用户（BA角色）所有归属的系统列表

**响应体：**

```typescript
interface BASystemsResponse {
  systems: {
    id: string;
    name: string;
  }[];
  hasSystem: boolean;  // 是否有归属系统
}
```

---

## 四、前端详细设计

### 4.1 需求列表页集成

**文件路径**: `apps/web/src/pages/requirements/index.tsx`

```typescript
/** 需求列表页面组件 */
const RequirementsPage: React.FC = () => {
  const { user } = useAuth();
  const isBA = user?.role === Role.BA;
  
  const [filters, setFilters] = useState<RequirementFilters>({
    systemId: undefined,
    status: undefined,
    keyword: '',
  });
  
  // 加载默认系统（仅 BA 角色）
  useEffect(() => {
    if (isBA) {
      loadDefaultSystem();
    }
  }, [isBA]);
  
  const loadDefaultSystem = async () => {
    const result = await getDefaultSystem();
    if (result.systemId) {
      setFilters(prev => ({ ...prev, systemId: result.systemId }));
    }
    // 如果无归属系统，systemId 保持 undefined，显示全部
  };
  
  // 渲染
  return (
    <div>
      {/* 筛选区域 */}
      <FilterSection 
        filters={filters}
        onChange={setFilters}
        onSearch={loadData}
        isBA={isBA}  // 传递 BA 标识，控制是否显示默认系统
      />
      {/* 列表区域 */}
      <Table loading={loading} dataSource={list} />
    </div>
  );
};
```

### 4.2 筛选组件增强

```typescript
interface FilterSectionProps {
  filters: RequirementFilters;
  onChange: (filters: RequirementFilters) => void;
  onSearch: () => void;
  isBA?: boolean;  // 新增：是否为 BA 角色
}

/** 筛选区域组件 */
const FilterSection: React.FC<FilterSectionProps> = ({
  filters,
  onChange,
  onSearch,
  isBA,
}) => {
  // BA 角色时，systemId 默认有值（非"全部"）
  const systemOptions = useSystemOptions(isBA);
  
  return (
    <div className="filter-section">
      {/* 系统筛选 - BA 角色显示其归属系统 */}
      <Select
        value={filters.systemId}
        onChange={(value) => onChange({ ...filters, systemId: value })}
        options={systemOptions}
        placeholder={isBA ? '选择归属系统' : '全部系统'}
        allowClear={!isBA}  // BA 角色不允许清空
      />
      
      {/* 其他筛选条件 */}
      <Select
        value={filters.status}
        onChange={(value) => onChange({ ...filters, status: value })}
        options={statusOptions}
      />
      
      <Input.Search
        value={filters.keyword}
        onChange={(e) => onChange({ ...filters, keyword: e.target.value })}
        placeholder="搜索需求编号或标题"
      />
      
      <Button onClick={onSearch}>查询</Button>
      <Button onClick={() => onChange({ systemId: undefined, status: undefined, keyword: '' })}>
        重置
      </Button>
    </div>
  );
};
```

### 4.3 行为说明

| 场景 | 行为 |
|------|------|
| BA 有归属系统 | 系统下拉框默认选中第一个归属系统，需求列表只显示该系统需求 |
| BA 无归属系统 | 系统下拉框默认选中"全部"，需求列表显示所有系统需求 |
| BA 手动切换系统 | 切换后，需求列表显示切换后的系统需求，不再受默认系统影响 |
| 非 BA 角色 | 系统下拉框默认选中"全部"，行为与 MVP 一致 |

---

## 五、前端 Service 层

**文件路径**: `apps/web/src/services/user.ts`

```typescript
/** 获取当前用户的默认归属系统 */
async function getDefaultSystem(): Promise<DefaultSystemResponse>;

/** 获取当前用户的归属系统列表 */
async function getMySystems(): Promise<BASystemsResponse>;
```

---

## 六、测试案例

### 6.1 后端接口测试

| 编号 | 场景 | 前置条件 | 操作 | 预期结果 |
|------|------|----------|------|----------|
| T2.10.1 | BA有归属系统 | BA用户有归属系统 | GET default-system | 返回第一个归属系统 |
| T2.10.2 | BA无归属系统 | BA用户无归属系统 | GET default-system | allSystemsAvailable=true |
| T2.10.3 | 非BA角色 | PM用户 | GET default-system | 返回 allSystemsAvailable=true |

### 6.2 前端功能测试

| 编号 | 场景 | 操作 | 预期结果 |
|------|------|------|----------|
| T2.10.4 | BA登录-有归属系统 | BA用户进入需求列表页 | 默认选中第一个归属系统 |
| T2.10.5 | BA登录-无归属系统 | 无归属系统的BA进入列表页 | 默认选中"全部" |
| T2.10.6 | BA切换系统 | BA手动切换系统 | 列表显示切换后的系统需求 |
| T2.10.7 | PM登录 | PM用户进入需求列表页 | 默认选中"全部" |

---

## 七、版本记录

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0 | 2026-05-16 | 初版设计 |

---

*文档编号：RT-T2-US2.10*  
*创建时间：2026-05-16*  
*版本：v1.0（待审核）*
