# US1.3 需求列表查询与筛选 - 详细设计

**版本号**: v1.1
**日期**: 2026-05-15
**设计状态**: 已冻结（grill 确认）
**来源**: [RT-T1-需求池管理-用户故事_v1.2_20260515.md](./RT-T1-需求池管理-用户故事_v1.2_20260515.md)
**PRD**: [RT-Task1-需求池管理-PRD.md](./RT-Task1-需求池管理-PRD.md) §2.4.1
**前置**: US1.1 需求录入（已有需求数据）

### 版本记录

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0 | 2026-05-11 | 初版：根据用户故事文档规划创建 |
| v1.1 | 2026-05-15 | grill 确认：status 改多选、移除创建人筛选、分页维持 20/100、加 subStatus、加重置/查询按钮、操作按钮矩阵全部放入、"查看"用行点击代替、排序用表头点击、系统下拉复用 /api/systems、BA 默认系统延后 T2 |

---

## 一、功能概述

| 项目 | 说明 |
|------|------|
| 用户故事编号 | US1.3 |
| 功能描述 | 按系统、状态、创建人等条件筛选需求列表 |
| 触发入口 | 顶部导航"需求池"菜单 / 系统首页快捷入口 |
| 权限限制 | 任何登录用户（不同角色看到不同的操作按钮） |
| 前置依赖 | US1.1（已有需求数据） |

---

## 二、页面布局

```
┌─────────────────────────────────────────────────────────────────┐
│ 需求池管理                                          [+ 新增需求] │
├─────────────────────────────────────────────────────────────────┤
│ 筛选区：                                                         │
│ [系统▼] [状态▼(多选)] [关键字搜索________] [查询] [重置]          │
├─────────────────────────────────────────────────────────────────┤
│ 表格区：                                                         │
│ 需求编号  需求标题    状态/子状态  优先级  工作量  系统  创建人  创建时间  操作 │
│ REQ-001  用户登录优化 [草稿][P1]  3点  用户中心  张三  05-08  [编辑][发起评审][取消]│
│ REQ-002  支付功能重构 [待评审][P0] 5点  支付系统  李四  05-07  [评审通过][评审拒绝]│
│ ...                                                             │
├─────────────────────────────────────────────────────────────────┤
│ 分页：共 25 条  [1] 2 3 ... 10 [>]  每页 20 条                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 三、筛选区设计

### 3.1 筛选字段

| 字段 | 类型 | 必填 | 默认值 | 选项/说明 |
|------|------|------|--------|-----------|
| systemId | 下拉选择 | 否 | 全部 | 系统列表（复用 GET /api/systems），所有角色默认查看全部系统（BA 默认系统延后 T2） |
| status | 下拉多选 | 否 | 全部 | 草稿、待评审、已就绪、已拒绝、已纳版、已投产、已取消 |
| keyword | 文本输入 | 否 | 空 | 按需求标题/编号模糊匹配 |

### 3.2 筛选交互

- 点击"查询"按钮触发筛选，表格刷新
- 点击"重置"清空所有筛选条件，恢复默认值
- 关键字搜索支持回车键触发查询
- 筛选条件变更时重置到第一页

---

## 四、API 设计

### 4.1 接口定义

**GET /api/requirements**

| 项目 | 说明 |
|------|------|
| 权限 | 任何登录用户 |
| 功能 | 分页查询需求列表，支持筛选和排序 |

### 4.2 请求参数

```typescript
interface ListRequirementsRequest {
  systemId?: string;        // 归属系统ID（可选，默认全部）
  status?: ReqStatus[];     // 状态数组，支持多选（可选，默认全部）
  keyword?: string;         // 关键字搜索（可选，按标题/编号模糊匹配）
  sortBy?: 'createdAt' | 'priority' | 'storyPoints'; // 排序字段（可选，默认createdAt）
  sortOrder?: 'asc' | 'desc'; // 排序方向（可选，默认desc）
  page?: number;            // 页码（可选，默认1）
  pageSize?: number;        // 每页条数（可选，默认20，最大100）
}
```

### 4.3 响应体

```typescript
interface ListRequirementsResponse {
  success: true;
  data: {
    list: RequirementListItem[];
    total: number;
    page: number;
    pageSize: number;
  };
}

interface RequirementListItem {
  id: string;
  reqCode: string;          // 需求编号 REQ-XXXX
  title: string;            // 需求标题
  status: ReqStatus;        // 状态
  subStatus?: ReqSubStatus; // 子状态（已纳版时）
  priority: Priority;       // 优先级
  storyPoints: number;      // 工作量点数
  system: {
    id: string;
    name: string;
  };
  ba: {
    id: string;
    displayName: string;
  };
  creator: {
    id: string;
    displayName: string;
  };
  createdAt: string;        // 创建时间 ISO8601
  updatedAt: string;        // 更新时间 ISO8601
}
```

### 4.4 错误码

| HTTP状态码 | 错误码 | 说明 |
|-----------|--------|------|
| 401 | UNAUTHORIZED | 未登录或 Token 过期 |
| 500 | INTERNAL_ERROR | 服务端错误 |

---

## 五、业务规则

### BR1.3.1 默认系统筛选

```typescript
// MVP 阶段：所有角色默认查看全部系统（不传 systemId）
// T2 阶段：BA 角色默认显示第一个归属系统的需求
defaultSystemId = undefined;
```

### BR1.3.2 创建人下拉框数据

```typescript
// MVP 阶段暂不实现创建人筛选，延后到后续版本
```

### BR1.3.3 关键字搜索逻辑

```typescript
// 按需求编号或标题模糊匹配
if (keyword) {
  where.OR = [
    { reqCode: { contains: keyword, mode: 'insensitive' } },
    { title: { contains: keyword, mode: 'insensitive' } },
  ];
}
```

### BR1.3.4 分页逻辑

```typescript
const skip = (page - 1) * pageSize;
const take = Math.min(pageSize, 100); // 最大100条

const [list, total] = await Promise.all([
  prisma.requirement.findMany({ where, skip, take, orderBy }),
  prisma.requirement.count({ where }),
]);
```

### BR1.3.5 排序逻辑

```typescript
// 默认按创建时间倒序
let orderBy: any = { createdAt: 'desc' };

if (sortBy === 'priority') {
  // P0=0, P1=1, P2=2, P3=3，按数字排序
  orderBy = { priority: sortOrder };
} else if (sortBy === 'storyPoints') {
  orderBy = { storyPoints: sortOrder };
} else if (sortBy === 'createdAt') {
  orderBy = { createdAt: sortOrder };
}
```

### BR1.3.6 排序 UI 交互

```typescript
// 使用 Ant Design Table 的 sorter 属性，表头点击排序
// 支持排序的列：创建时间（默认倒序）、优先级、工作量点数
```

---

## 六、操作按钮矩阵实现

### 6.1 按钮显示逻辑

> **注意**："查看"操作由点击行跳转详情页代替，不在操作按钮列中显示。

```typescript
interface ActionButton {
  key: string;
  label: string;
  type: 'primary' | 'default' | 'danger';
  visible: boolean;
  onClick: () => void;
}

function getActionButtons(
  requirement: RequirementListItem,
  currentUser: User
): ActionButton[] {
  const buttons: ActionButton[] = [];
  const { status, subStatus } = requirement;

  // 草稿状态
  if (status === 'DRAFT') {
    if ([Role.BA, Role.PM, Role.PROJECT_MGR].includes(currentUser.role)) {
      buttons.push({ key: 'edit', label: '编辑', type: 'primary', visible: true });
    }
    if ([Role.BA, Role.TRAIN_ADMIN, Role.SUPER_ADMIN].includes(currentUser.role)) {
      buttons.push({ key: 'submitReview', label: '发起评审', type: 'primary', visible: true });
      buttons.push({ key: 'cancel', label: '取消', type: 'danger', visible: true });
    }
  }

  // 待评审状态
  if (status === 'PENDING_REVIEW') {
    if ([Role.PM, Role.PROJECT_MGR, Role.TECH_MGR, Role.TRAIN_ADMIN, Role.SUPER_ADMIN].includes(currentUser.role)) {
      buttons.push({ key: 'reviewPass', label: '评审通过', type: 'primary', visible: true });
      buttons.push({ key: 'reviewReject', label: '评审拒绝', type: 'danger', visible: true });
    }
    if ([Role.BA, Role.TRAIN_ADMIN, Role.SUPER_ADMIN].includes(currentUser.role)) {
      buttons.push({ key: 'cancel', label: '取消', type: 'danger', visible: true });
    }
  }

  // 已就绪状态
  if (status === 'READY') {
    if ([Role.BA, Role.TRAIN_ADMIN, Role.SUPER_ADMIN].includes(currentUser.role)) {
      buttons.push({ key: 'change', label: '需求变更', type: 'default', visible: true });
      buttons.push({ key: 'cancel', label: '取消', type: 'danger', visible: true });
    }
  }

  // 已拒绝状态
  if (status === 'REJECTED') {
    if ([Role.BA, Role.PM, Role.TRAIN_ADMIN, Role.SUPER_ADMIN].includes(currentUser.role)) {
      buttons.push({ key: 'reEdit', label: '重新编辑', type: 'primary', visible: true });
    }
    if ([Role.BA, Role.TRAIN_ADMIN, Role.SUPER_ADMIN].includes(currentUser.role)) {
      buttons.push({ key: 'cancel', label: '取消', type: 'danger', visible: true });
    }
  }

  // 已纳版状态（带子状态）
  if (status === 'ONBOARDED') {
    // 开发中
    if (subStatus === 'DEV_IN_PROGRESS') {
      if (currentUser.role === Role.TECH_MGR) {
        buttons.push({ key: 'devComplete', label: '开发完成', type: 'primary', visible: true });
      }
    }

    // SIT测试
    if (subStatus === 'SIT_TESTING') {
      if (currentUser.role === Role.TEST_MGR) {
        buttons.push({ key: 'sitPass', label: 'SIT通过', type: 'primary', visible: true });
      }
    }

    // UAT测试
    if (subStatus === 'UAT_TESTING') {
      if (currentUser.role === Role.BA) {
        buttons.push({ key: 'uatPass', label: 'UAT通过', type: 'primary', visible: true });
      }
    }

    // 封板
    if (subStatus === 'FROZEN') {
      if ([Role.BA, Role.TRAIN_ADMIN, Role.SUPER_ADMIN].includes(currentUser.role)) {
        buttons.push({ key: 'emergencyChange', label: '紧急变更', type: 'danger', visible: true });
      }
    }

    // 通用按钮
    if ([Role.BA, Role.TRAIN_ADMIN, Role.SUPER_ADMIN].includes(currentUser.role)) {
      if (subStatus !== 'FROZEN') {
        buttons.push({ key: 'change', label: '需求变更', type: 'default', visible: true });
      }
      buttons.push({ key: 'cancel', label: '取消', type: 'danger', visible: true });
    }
  }

  // 已投产/已取消状态：无操作按钮（点击行查看详情）

  return buttons;
}
```

---

## 七、前端实现

### 7.1 列表页组件

```typescript
interface RequirementListPageProps {
  // 无 props，内部获取当前用户和路由参数
}

function RequirementListPage() {
  const [filters, setFilters] = useState<ListRequirementsRequest>({
    page: 1,
    pageSize: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [data, setData] = useState<ListRequirementsResponse['data']>();
  const [loading, setLoading] = useState(false);

  // 手动触发查询
  const fetchData = async () => {
    setLoading(true);
    const res = await api.get('/api/requirements', { params: filters });
    setData(res.data);
    setLoading(false);
  };

  // 初始加载
  useEffect(() => {
    fetchData();
  }, []);

  // 筛选变更时重置到第一页（不自动查询，等用户点"查询"）
  const handleFilterChange = (newFilters: Partial<ListRequirementsRequest>) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }));
  };

  // 点击查询
  const handleSearch = () => {
    fetchData();
  };

  // 点击重置
  const handleReset = () => {
    setFilters({
      page: 1,
      pageSize: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    // 重置后自动查询
  };

  return (
    <div>
      <FilterBar
        filters={filters}
        onChange={handleFilterChange}
        onSearch={handleSearch}
        onReset={handleReset}
      />
      <RequirementTable
        data={data?.list}
        loading={loading}
        sortBy={filters.sortBy}
        sortOrder={filters.sortOrder}
        onSortChange={(sortBy, sortOrder) => {
          setFilters(prev => ({ ...prev, sortBy, sortOrder, page: 1 }));
          // 排序变更后自动查询
        }}
      />
      <Pagination
        current={data?.page}
        pageSize={data?.pageSize}
        total={data?.total}
        onChange={(page, pageSize) => {
          setFilters(prev => ({ ...prev, page, pageSize }));
          // 分页变更后自动查询
        }}
      />
    </div>
  );
}
```

### 7.2 筛选栏组件

```typescript
interface FilterBarProps {
  filters: ListRequirementsRequest;
  onChange: (filters: Partial<ListRequirementsRequest>) => void;
  onSearch: () => void;
  onReset: () => void;
}

function FilterBar({ filters, onChange, onSearch, onReset }: FilterBarProps) {
  const [systems, setSystems] = useState<System[]>();

  // 加载系统列表（复用 GET /api/systems）
  useEffect(() => {
    getAllSystems().then(setSystems);
  }, []);

  return (
    <div className="filter-bar">
      <Select
        placeholder="归属系统"
        value={filters.systemId}
        onChange={(v) => onChange({ systemId: v })}
        options={systems?.map(s => ({ label: s.name, value: s.id }))}
      />
      <Select
        placeholder="状态"
        mode="multiple"
        value={filters.status}
        onChange={(v) => onChange({ status: v })}
        options={STATUS_OPTIONS}
      />
      <Select
        placeholder="创建人"
        value={filters.creatorId}
        onChange={(v) => onChange({ creatorId: v })}
        options={creators?.map(c => ({ label: c.name, value: c.id }))}
      />
      <Input
        placeholder="关键字搜索（标题/编号）"
        value={filters.keyword}
        onChange={(e) => onChange({ keyword: e.target.value })}
        onPressEnter={() => onChange({})}
      />
      <Button onClick={() => onChange({ systemId: undefined, status: undefined, creatorId: undefined, keyword: undefined })}>
        重置
      </Button>
      <Button type="primary" onClick={() => onChange({})}>
        查询
      </Button>
    </div>
  );
}
```

### 7.3 表格组件

```typescript
interface RequirementTableProps {
  data?: RequirementListItem[];
  loading: boolean;
  onRefresh: () => void;
}

function RequirementTable({ data, loading, onRefresh }: RequirementTableProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const columns: ColumnsType<RequirementListItem> = [
    {
      title: '需求编号',
      dataIndex: 'reqCode',
      width: 120,
    },
    {
      title: '需求标题',
      dataIndex: 'title',
      render: (text, record) => (
        <a onClick={() => navigate(`/requirements/${record.id}`)}>{text}</a>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status, record) => (
        <StatusTag status={status} subStatus={record.subStatus} />
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      width: 80,
      render: (priority) => <PriorityTag priority={priority} />,
    },
    {
      title: '创建人',
      dataIndex: ['creator', 'name'],
      width: 100,
    },
    {
      title: '提出时间',
      dataIndex: 'proposedAt',
      width: 150,
      render: (date) => formatDate(date),
    },
    {
      title: '操作',
      width: 200,
      render: (_, record) => {
        const buttons = getActionButtons(record, user);
        return (
          <Space>
            {buttons.map(btn => (
              <Button
                key={btn.key}
                type={btn.type}
                size="small"
                onClick={btn.onClick}
              >
                {btn.label}
              </Button>
            ))}
          </Space>
        );
      },
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      loading={loading}
      rowKey="id"
      pagination={false}
    />
  );
}
```

### 7.4 状态标签组件

```typescript
interface StatusTagProps {
  status: ReqStatus;
  subStatus?: ReqSubStatus;
}

const STATUS_COLORS: Record<ReqStatus, string> = {
  DRAFT: 'default',           // 灰
  PENDING_REVIEW: 'blue',     // 蓝
  READY: 'green',             // 绿
  REJECTED: 'red',            // 红
  ONBOARDED: 'blue',          // 蓝
  RELEASED: 'green',          // 绿
  CANCELLED: 'default',       // 灰
};

const STATUS_LABELS: Record<ReqStatus, string> = {
  DRAFT: '草稿',
  PENDING_REVIEW: '待评审',
  READY: '已就绪',
  REJECTED: '已拒绝',
  ONBOARDED: '已纳版',
  RELEASED: '已投产',
  CANCELLED: '已取消',
};

const SUB_STATUS_LABELS: Record<ReqSubStatus, string> = {
  DEV_IN_PROGRESS: '开发中',
  SIT_TESTING: 'SIT测试',
  UAT_TESTING: 'UAT测试',
  FROZEN: '封板',
};

function StatusTag({ status, subStatus }: StatusTagProps) {
  const label = subStatus
    ? `${STATUS_LABELS[status]}-${SUB_STATUS_LABELS[subStatus]}`
    : STATUS_LABELS[status];

  return <Tag color={STATUS_COLORS[status]}>{label}</Tag>;
}
```

### 7.5 优先级标签组件

```typescript
interface PriorityTagProps {
  priority: Priority;
}

const PRIORITY_COLORS: Record<Priority, string> = {
  P0: 'red',
  P1: 'orange',
  P2: 'blue',
  P3: 'default',
};

function PriorityTag({ priority }: PriorityTagProps) {
  return <Tag color={PRIORITY_COLORS[priority]}>{priority}</Tag>;
}
```

---

## 八、测试案例

### 8.1 后端测试案例

| 编号 | 测试场景 | 输入 | 预期结果 |
|------|----------|------|----------|
| TC1.3.1 | 默认分页 | GET /api/requirements | 200, 返回第一页，默认 pageSize=20 |
| TC1.3.2 | 指定分页 | GET /api/requirements?page=2&pageSize=5 | 200, 返回第2页5条 |
| TC1.3.3 | 按系统筛选 | GET /api/requirements?systemId=xxx | 200, 只返回该系统需求 |
| TC1.3.4 | 按状态筛选（单选） | GET /api/requirements?status=DRAFT | 200, 只返回草稿需求 |
| TC1.3.5 | 按状态筛选（多选） | GET /api/requirements?status=DRAFT&status=PENDING_REVIEW | 200, 返回草稿+待评审 |
| TC1.3.6 | 关键字搜索 | GET /api/requirements?keyword=登录 | 200, 返回标题/编号包含"登录"的需求 |
| TC1.3.7 | 分页查询 | GET /api/requirements?page=2&pageSize=10 | 200, 返回第2页数据 |
| TC1.3.8 | 排序-创建时间 | GET /api/requirements?sortBy=createdAt&sortOrder=desc | 200, 按创建时间倒序 |
| TC1.3.9 | 排序-优先级 | GET /api/requirements?sortBy=priority&sortOrder=asc | 200, 按优先级升序 |
| TC1.3.10 | 排序-工作量 | GET /api/requirements?sortBy=storyPoints&sortOrder=desc | 200, 按工作量点数降序 |
| TC1.3.11 | 组合筛选 | GET /api/requirements?systemId=xxx&status=DRAFT&keyword=登录 | 200, 满足所有条件 |
| TC1.3.12 | 最大分页 | GET /api/requirements?pageSize=200 | 200, 实际返回100条（最大限制） |
| TC1.3.13 | 空结果 | 筛选条件无匹配数据 | 200, list为空数组 |

### 8.2 前端测试案例

| 编号 | 测试场景 | 操作 | 预期结果 |
|------|----------|------|----------|
| TC1.3.F1 | 列表加载 | 进入需求列表页 | 显示筛选区和表格，默认显示数据 |
| TC1.3.F2 | 系统筛选 | 切换系统下拉框，点击查询 | 表格刷新为对应系统数据 |
| TC1.3.F3 | 状态多选 | 选择"草稿"+"待评审"，点击查询 | 表格显示两种状态需求 |
| TC1.3.F4 | 关键字搜索 | 输入"登录"点击查询 | 表格显示标题/编号包含"登录"的需求 |
| TC1.3.F5 | 重置筛选 | 点击"重置"按钮 | 所有筛选条件清空，表格恢复默认数据 |
| TC1.3.F6 | 分页切换 | 点击第2页 | 表格显示第2页数据 |
| TC1.3.F7 | 排序切换 | 点击优先级表头 | 表格按优先级排序 |
| TC1.3.F8 | 跳转详情 | 点击需求行 | 跳转到需求详情页 |
| TC1.3.F9 | 草稿操作按钮 | BA查看草稿需求 | 显示"编辑""发起评审""取消"按钮 |
| TC1.3.F10 | 待评审操作按钮 | PM查看待评审需求 | 显示"评审通过""评审拒绝"按钮 |
| TC1.3.F11 | 已投产操作按钮 | 任何角色查看已投产需求 | 无操作按钮（点击行查看详情） |
| TC1.3.F12 | 状态Tag颜色 | 查看列表 | 草稿(灰)、待评审(蓝)、已就绪(绿)等颜色正确 |
| TC1.3.F13 | 优先级Tag颜色 | 查看列表 | P0(红)、P1(橙)、P2(蓝)、P3(灰)颜色正确 |

---

## 九、编码顺序

| 步骤 | 内容 | 依赖 |
|------|------|------|
| 1 | Schema 确认（Requirement 表已有所有字段） | US1.1 |
| 2 | 后端：GET /api/requirements 接口实现 | 步骤1 |
| 3 | 后端：筛选逻辑（系统、状态、创建人、关键字） | 步骤2 |
| 4 | 后端：分页和排序逻辑 | 步骤2 |
| 5 | 后端：单元测试（13条） | 步骤2-4 |
| 6 | 前端：需求列表页框架 | US1.1 前端 |
| 7 | 前端：筛选栏组件 | 步骤6 |
| 8 | 前端：表格组件（含操作按钮矩阵） | 步骤6 |
| 9 | 前端：状态标签和优先级标签组件 | 步骤8 |
| 10 | 前端：分页组件 | 步骤6 |
| 11 | 前端：集成测试（13条） | 步骤6-10 |

---

## 十、验收条件

### 10.1 功能验收

- [ ] AC1.3.1: 进入需求列表页，默认显示全部系统下所有需求
- [ ] AC1.3.2: 切换系统筛选，点击查询，列表刷新为对应系统的需求
- [ ] AC1.3.3: 选择状态"草稿"，点击查询，列表只显示草稿状态的需求
- [ ] AC1.3.4: 列表按创建时间倒序排列
- [ ] AC1.3.5: 超过 20 条时分页显示，可翻页
- [ ] AC1.3.6: 草稿状态需求，BA 角色看到"编辑""发起评审""取消"按钮
- [ ] AC1.3.7: 待评审状态需求，PM 角色看到"评审通过""评审拒绝"按钮
- [ ] AC1.3.8: 已纳版-封板状态需求，BA 角色看到"紧急变更""取消"按钮
- [ ] AC1.3.9: 已投产状态需求，所有角色无操作按钮（点击行查看详情）
- [ ] AC1.3.10: 技术经理角色在已纳版-开发中状态看到"开发完成"按钮
- [ ] AC1.3.11: 测试经理角色在已纳版-SIT测试状态看到"SIT通过"按钮
- [ ] AC1.3.12: 点击需求行跳转到详情页
- [ ] AC1.3.13: 状态 Tag 和优先级 Tag 颜色正确

### 10.2 技术验收

- [ ] AC1.3.14: 关键字搜索支持按标题/编号模糊匹配
- [ ] AC1.3.15: 支持按创建时间、优先级、工作量点数排序（表头点击）
- [ ] AC1.3.16: 系统下拉数据源复用 GET /api/systems
- [ ] AC1.3.17: 状态筛选支持多选
- [ ] AC1.3.18: 后端测试 13 条全部通过
- [ ] AC1.3.19: 前端测试 13 条全部通过

---

*文档编号：RT-T1-US1.3*
*创建时间：2026-05-11*
*审核状态：待审核*
