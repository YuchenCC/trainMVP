# US1.4 需求详情查看 - 详细设计

**版本号**: v1.0
**日期**: 2026-05-11
**设计状态**: 待审核
**来源**: [RT-T1-需求池管理-用户故事_v1.0_20260511.md](./RT-T1-需求池管理-用户故事_v1.0_20260511.md)
**PRD**: [RT-Task1-需求池管理-PRD.md](./RT-Task1-需求池管理-PRD.md) §2.4.2
**前置**: US1.1 需求录入（已有需求数据）、US1.3 列表查询（已有需求列表）

### 版本记录

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0 | 2026-05-11 | 初版：根据用户故事文档规划创建 |
| v1.1 | 2026-05-15 | Grill审核7项修正：错误码表对齐HTTP200规范、补充依赖风险映射规则、双重XSS过滤、操作历史限制100条、点数单位改"点"、移除proposedAt字段、新增sourceChannel展示 |

---

## 一、功能概述

| 项目 | 说明 |
|------|------|
| 用户故事编号 | US1.4 |
| 功能描述 | 查看需求的完整信息，包括基本信息、需求描述、依赖需求、操作历史 |
| 触发入口 | 需求列表页 → 点击需求标题 |
| 权限限制 | 任何登录用户（不同角色看到不同的操作按钮） |
| 前置依赖 | US1.1（已有需求数据）、US1.3（列表入口） |

---

## 二、页面布局

```
┌─────────────────────────────────────────────────────────────────┐
│ ← 返回列表                                                       │
├─────────────────────────────────────────────────────────────────┤
│ REQ-2026-0001 用户登录优化                            [草稿]      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ 基本信息                                          [编辑] [发起评审]│
│ ┌─────────────────┬─────────────────┐ ┌─────────────────┬─────┐│
│ │ 归属系统        │ 用户中心         │ │ 优先级         │ [P1]││
│ ├─────────────────┼─────────────────┤ ├─────────────────┼─────┤│
│ │ 业务归属人      │ 张三             │ │ 工作量点数      │ 5   ││
│ ├─────────────────┼─────────────────┤ ├─────────────────┼─────┤│
│ │ 产品经理        │ 李四             │ │ 创建时间        │2026 │
│ ├─────────────────┼─────────────────┤ ├─────────────────┼─────┤│
│ │ 创建人          │ 张三             │ │ 需求类型        │新功能││
│ ├─────────────────┼─────────────────┤ ├─────────────────┼─────┤│
│ │ 来源渠道        │ 业务提出         │ │                 │     │
│ └─────────────────┴─────────────────┘ └─────────────────┴─────┘│
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ 需求描述                                                         │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ 用户登录优化描述内容...                                      ││
│ │ 支持记住密码、第三方登录等功能                               ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ 依赖需求                              [+ 添加依赖]              │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ [✅ 已满足] REQ-2026-0005 支付接口升级 - 订单系统 - [已纳版]││
│ │ [⚠️ 未满足] REQ-2026-0003 用户数据同步 - 数据平台 - [已就绪] ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ 操作历史                                                         │
│ · 2026-05-08 14:30 张三 发起评审                               │
│ · 2026-05-08 10:00 张三 创建需求                               │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                           [编辑] [发起评审] [取消需求]           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 三、API 设计

### 3.1 接口定义

**GET /api/requirements/:id**

| 项目 | 说明 |
|------|------|
| 权限 | 任何登录用户 |
| 功能 | 获取需求详情，包含基本信息、依赖需求、操作历史 |

### 3.2 请求参数

```typescript
// 路径参数
interface GetRequirementParams {
  id: string; // 需求ID
}
```

### 3.3 响应体

```typescript
interface GetRequirementResponse {
  success: true;
  data: RequirementDetail;
}

interface RequirementDetail {
  // 基本信息
  id: string;
  reqCode: string;              // 需求编号
  title: string;                // 需求标题
  status: ReqStatus;            // 状态
  subStatus?: ReqSubStatus;     // 子状态
  priority: Priority;           // 优先级
  storyPoints: number;          // 工作量点数
  reqType?: ReqType;           // 需求类型
  sourceChannel?: SourceChannel; // 来源渠道

  // 关联信息
  system: {
    id: string;
    name: string;
  };
  ba: {
    id: string;
    name: string;
  };
  pm?: {
    id: string;
    name: string;
  };
  creator: {
    id: string;
    name: string;
  };

  // 时间信息
  createdAt: string;            // 创建时间 ISO8601
  updatedAt: string;            // 更新时间 ISO8601

  // 内容
  description: string;          // HTML 富文本（已XSS过滤）
  version: number;               // 乐观锁版本号

  // 依赖需求
  dependencies: DependencyInfo[];

  // 操作历史
  statusLogs: StatusLogInfo[];

  // 紧急变更申请（如果有）
  emergencyChange?: EmergencyChangeInfo;
}

interface DependencyInfo {
  id: string;
  reqCode: string;
  title: string;
  status: ReqStatus;
  riskLevel: 'warning' | 'high' | 'critical' | null;
  riskMessage: string;
}

interface StatusLogInfo {
  id: string;
  operatorName: string;
  operatorRole: string;
  operationType: OperationType;
  operationLabel: string;
  fromStatus?: ReqStatus;
  toStatus: ReqStatus;
  reason?: string;
  createdAt: string;
}

interface EmergencyChangeInfo {
  id: string;
  status: ApprovalStatus;
  reason: string;
  urgencyLevel: UrgencyLevel;
  approverName?: string;
  approvedAt?: string;
}
```

### 3.4 错误码

> **规范**：所有响应统一返回 HTTP 200，通过 `success: false` + `code` 区分错误类型。

| code | message | 说明 |
|------|---------|------|
| REQUIREMENT_NOT_FOUND | 需求不存在 | 需求ID无效 |
| UNAUTHORIZED | 未登录或登录已过期 | 未登录 |
| INTERNAL_ERROR | 服务器内部错误 | 服务端异常 |

---

## 四、业务规则

### BR1.4.1 详情页展示内容

```typescript
async function getRequirementDetail(id: string) {
  const requirement = await prisma.requirement.findUnique({
    where: { id },
    include: {
      system: true,
      ba: { select: { id: true, name: true } },
      pm: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
      dependencies: {
        include: {
          targetReq: {
            select: { id: true, reqCode: true, title: true, status: true },
          },
        },
      },
      statusLogs: {
        include: {
          operator: { select: { name: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100, // 最多返回最近 100 条操作历史
      },
      emergencyChange: true,
    },
  });

  // 计算依赖风险等级
  const dependencies = requirement.dependencies.map(dep => ({
    id: dep.targetReq.id,
    reqCode: dep.targetReq.reqCode,
    title: dep.targetReq.title,
    status: dep.targetReq.status,
    ...checkDependencyRisk(dep.targetReq.status),
  }));

  return {
    ...requirement,
    dependencies,
    statusLogs: requirement.statusLogs.map(log => ({
      ...log,
      operatorName: log.operator.name,
      operatorRole: log.operator.role,
      operationLabel: getOperationLabel(log.operationType),
    })),
  };
}
```

### BR1.4.2 基本信息网格布局

```typescript
// 2列4行布局
const INFO_FIELDS = [
  [
    { key: 'system', label: '归属系统', value: data.system.name },
    { key: 'priority', label: '优先级', value: renderPriorityTag(data.priority) },
  ],
  [
    { key: 'ba', label: '业务归属人', value: data.ba.name },
    { key: 'storyPoints', label: '工作量点数', value: `${data.storyPoints} 点` },
  ],
  [
    { key: 'pm', label: '产品经理', value: data.pm?.name || '-' },
    { key: 'createdAt', label: '创建时间', value: formatDate(data.createdAt) },
  ],
  [
    { key: 'creator', label: '创建人', value: data.creator.name },
    { key: 'reqType', label: '需求类型', value: getReqTypeLabel(data.reqType) },
  ],
  [
    { key: 'sourceChannel', label: '来源渠道', value: getSourceChannelLabel(data.sourceChannel) },
    { key: null, label: '', value: '' }, // 占位保持2列对齐
  ],
];
```

### BR1.4.3 富文本安全渲染（双重 XSS 过滤）

```typescript
// 双重 XSS 过滤：后端 sanitize-html + 前端 DOMPurify
// 后端存储时已做 sanitize-html 过滤，前端渲染前再做 DOMPurify 兜底
import DOMPurify from 'dompurify';

function DescriptionContent({ html }: { html: string }) {
  // DOMPurify 兜底过滤，防止后端过滤规则遗漏或数据被篡改
  const sanitizedHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4',
      'ul', 'ol', 'li', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'blockquote', 'pre', 'code', 'span', 'div',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });

  return (
    <div
      className="requirement-description"
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
```

### BR1.4.4 依赖需求展示

#### 依赖风险等级映射规则

```typescript
/**
 * 根据依赖需求的状态和火车归属，计算风险等级
 *
 * 映射规则：
 * ┌──────────────────────────┬───────────┬──────────────────────────────────┐
 * │ 依赖需求状态              │ riskLevel │ 含义                             │
 * ├──────────────────────────┼───────────┼──────────────────────────────────┤
 * │ 已投产（PRODUCED）        │ null      │ 已满足：依赖已上线                │
 * │ 已纳版 + 同版本火车       │ null      │ 已满足：将在同一版本交付           │
 * ├──────────────────────────┼───────────┼──────────────────────────────────┤
 * │ 已就绪（READY）           │ warning   │ 未满足：已就绪但未纳版             │
 * │ 已纳版 + 不同版本火车     │ warning   │ 未满足：纳版了但不在同版本          │
 * │ 已拒绝（REJECTED）        │ critical  │ 阻断：依赖被拒绝，无法满足          │
 * ├──────────────────────────┼───────────┼──────────────────────────────────┤
 * │ 草稿（DRAFT）             │ high      │ 未完成：依赖还在早期阶段           │
 * │ 待评审（PENDING_REVIEW）  │ high      │ 未完成：依赖还在评审中             │
 * │ 已取消（CANCELLED）       │ critical  │ 阻断：依赖已取消                  │
 * │ 已纳版-开发中             │ high      │ 未完成：依赖开发中                 │
 * │ 已纳版-SIT测试            │ high      │ 未完成：依赖测试中                 │
 * │ 已纳版-UAT测试            │ high      │ 未完成：依赖测试中                 │
 * │ 已纳版-封板（FROZEN）     │ warning   │ 未满足：已封板但未投产             │
 * └──────────────────────────┴───────────┴──────────────────────────────────┘
 */

function checkDependencyRisk(
  depStatus: ReqStatus,
  depSubStatus?: ReqSubStatus,
  depTrainId?: string | null,
  currentTrainId?: string | null,
  currentStatus?: ReqStatus
): { riskLevel: 'warning' | 'high' | 'critical' | null; riskMessage: string } {
  // 1. 已投产 → 已满足
  if (depStatus === 'PRODUCED') {
    return { riskLevel: null, riskMessage: '依赖已上线' };
  }

  // 2. 已取消 → 阻断
  if (depStatus === 'CANCELLED') {
    return { riskLevel: 'critical', riskMessage: '依赖需求已取消' };
  }

  // 3. 已拒绝 → 阻断
  if (depStatus === 'REJECTED') {
    return { riskLevel: 'critical', riskMessage: '依赖需求已被拒绝' };
  }

  // 4. 已纳版
  if (depStatus === 'ONBOARDED') {
    // 同版本火车 → 已满足
    if (depTrainId && depTrainId === currentTrainId) {
      return { riskLevel: null, riskMessage: '将在同一版本交付' };
    }
    // 不同版本火车 或 当前需求未纳版（trainId=null）
    if (depTrainId && depTrainId !== currentTrainId) {
      // 当前需求还在草稿/评审阶段 → high（自身都还没就绪）
      if (currentStatus && ['DRAFT', 'PENDING_REVIEW', 'REJECTED'].includes(currentStatus)) {
        return { riskLevel: 'high', riskMessage: '依赖开发/测试中' };
      }
      // 当前需求已就绪但未纳版 → warning（版本错配风险）
      return { riskLevel: 'warning', riskMessage: '依赖已纳入其他版本' };
    }
    // 封板 → 未满足（已封板但未投产）
    if (depSubStatus === 'FROZEN') {
      return { riskLevel: 'warning', riskMessage: '依赖已封板，等待投产' };
    }
    // 开发中/SIT/UAT → 未完成
    return { riskLevel: 'high', riskMessage: '依赖开发/测试中' };
  }

  // 5. 已就绪 → 未满足
  if (depStatus === 'READY') {
    return { riskLevel: 'warning', riskMessage: '依赖已就绪，等待纳版' };
  }

  // 6. 草稿/待评审 → 未完成
  return { riskLevel: 'high', riskMessage: '依赖需求尚未评审通过' };
}
```

#### 依赖卡片组件

```typescript
interface DependencyCardProps {
  dependencies: DependencyInfo[];
  canEdit: boolean;
  onAdd: () => void;
}

const RISK_CONFIG = {
  null: { icon: '✅', label: '已满足', color: 'green' },
  warning: { icon: '⚠️', label: '未满足', color: 'orange' },
  high: { icon: '⚠️', label: '未完成', color: 'orange' },
  critical: { icon: '🔴', label: '已取消', color: 'red' },
};

function DependencyCard({ dependencies, canEdit, onAdd }: DependencyCardProps) {
  return (
    <div className="dependency-section">
      <div className="section-header">
        <span>依赖需求</span>
        {canEdit && <Button onClick={onAdd}>+ 添加依赖</Button>}
      </div>
      <div className="dependency-list">
        {dependencies.map(dep => {
          const config = RISK_CONFIG[dep.riskLevel];
          return (
            <Card key={dep.id} className="dependency-item">
              <Space>
                <Tag color={config.color}>{config.icon} {config.label}</Tag>
                <Text strong>{dep.reqCode}</Text>
                <Text>{dep.title}</Text>
                <StatusTag status={dep.status} />
              </Space>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
```

### BR1.4.5 操作历史时间线

```typescript
const OPERATION_LABELS: Record<OperationType, string> = {
  CREATE: '创建需求',
  UPDATE: '编辑需求',
  SUBMIT_REVIEW: '发起评审',
  REVIEW_PASS: '评审通过',
  REVIEW_REJECT: '评审拒绝',
  RE_EDIT: '重新编辑',
  CANCEL: '取消需求',
  CHANGE_REQUIREMENT: '需求变更',
  EMERGENCY_CHANGE: '紧急变更申请',
  DEV_COMPLETE: '开发完成',
  SIT_PASS: 'SIT通过',
  UAT_PASS: 'UAT通过',
};

function OperationTimeline({ logs }: { logs: StatusLogInfo[] }) {
  return (
    <Timeline mode="left">
      {logs.map(log => (
        <Timeline.Item
          key={log.id}
          color="blue"
          label={formatDateTime(log.createdAt)}
        >
          <Card size="small">
            <Space>
              <Text strong>{log.operatorName}</Text>
              <Tag>{log.operatorRole}</Tag>
              <Text>{log.operationLabel}</Text>
            </Space>
            {log.reason && (
              <div className="log-reason">
                <Text type="secondary">原因：{log.reason}</Text>
              </div>
            )}
          </Card>
        </Timeline.Item>
      ))}
    </Timeline>
  );
}
```

### BR1.4.6 返回列表保留筛选条件

```typescript
function RequirementDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // 返回列表时，保留当前的筛选条件和分页
  const handleBack = () => {
    const params = new URLSearchParams(location.search);
    navigate(`/requirements?${params.toString()}`);
  };

  return (
    <div>
      <Button onClick={handleBack}>← 返回列表</Button>
      {/* ... */}
    </div>
  );
}

// 在列表页点击时，传递当前筛选条件
function RequirementTable({ data }: { data: any[] }) {
  const navigate = useNavigate();
  const { filters } = useRequirementList();

  const handleTitleClick = (record: any) => {
    // 将当前筛选条件编码到 URL 参数中
    const params = new URLSearchParams(filters);
    navigate(`/requirements/${record.id}?${params.toString()}`);
  };

  return (
    <Table
      columns={[
        {
          title: '需求标题',
          render: (_, record) => (
            <a onClick={() => handleTitleClick(record)}>{record.title}</a>
          ),
        },
      ]}
    />
  );
}
```

---

## 五、前端实现

### 5.1 详情页组件

```typescript
interface RequirementDetailPageProps {
  id: string;
}

function RequirementDetailPage({ id }: RequirementDetailPageProps) {
  const [data, setData] = useState<RequirementDetail>();
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchData = async () => {
    setLoading(true);
    const res = await api.get(`/api/requirements/${id}`);
    setData(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  if (loading) return <Spin />;
  if (!data) return <Empty description="需求不存在" />;

  return (
    <div className="requirement-detail-page">
      <PageHeader
        title={
          <Space>
            <span className="req-code">{data.reqCode}</span>
            <span className="req-title">{data.title}</span>
            <StatusTag status={data.status} subStatus={data.subStatus} />
          </Space>
        }
        onBack={handleBack}
      />

      <BasicInfoCard data={data} />
      <DescriptionCard html={data.description} />
      <DependencyCard
        dependencies={data.dependencies}
        canEdit={canEditDependencies(data)}
      />
      <OperationTimeline logs={data.statusLogs} />
      <ActionFooter
        requirement={data}
        currentUser={user}
        onRefresh={fetchData}
      />
    </div>
  );
}
```

### 5.2 基本信息卡片

```typescript
interface BasicInfoCardProps {
  data: RequirementDetail;
}

function BasicInfoCard({ data }: BasicInfoCardProps) {
  return (
    <Card title="基本信息">
      <Row gutter={24}>
        <Col span={12}>
          <Form.Item label="归属系统">{data.system.name}</Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="优先级">
            <PriorityTag priority={data.priority} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="业务归属人">{data.ba.name}</Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="工作量点数">{data.storyPoints} 点</Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="产品经理">{data.pm?.name || '-'}</Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="创建时间">{formatDateTime(data.createdAt)}</Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="创建人">{data.creator.name}</Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="需求类型">
            {data.reqType ? getReqTypeLabel(data.reqType) : '-'}
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="来源渠道">
            {data.sourceChannel ? getSourceChannelLabel(data.sourceChannel) : '-'}
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );
}
```

### 5.3 需求描述卡片（双重 XSS 过滤）

```typescript
import DOMPurify from 'dompurify';

interface DescriptionCardProps {
  html: string;
}

function DescriptionCard({ html }: DescriptionCardProps) {
  const sanitizedHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4',
      'ul', 'ol', 'li', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'blockquote', 'pre', 'code', 'span', 'div',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });

  return (
    <Card title="需求描述">
      <div
        className="requirement-description"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    </Card>
  );
}
```

### 5.4 底部操作按钮

复用 US1.3 的 `getActionButtons` 函数：

```typescript
interface ActionFooterProps {
  requirement: RequirementDetail;
  currentUser: User;
  onRefresh: () => void;
}

function ActionFooter({ requirement, currentUser, onRefresh }: ActionFooterProps) {
  const buttons = getActionButtons(
    {
      id: requirement.id,
      status: requirement.status,
      subStatus: requirement.subStatus,
    },
    currentUser
  );

  // 绑定操作回调
  const handleAction = async (action: string) => {
    switch (action) {
      case 'view':
        // 已是详情页，无需处理
        break;
      case 'edit':
        navigate(`/requirements/${requirement.id}/edit`);
        break;
      case 'submitReview':
        await submitReview(requirement.id);
        message.success('评审已提交');
        onRefresh();
        break;
      case 'cancel':
        // 打开取消弹窗
        openCancelModal(requirement.id);
        break;
      // ... 其他操作
    }
  };

  return (
    <div className="action-footer">
      <Space>
        {buttons.map(btn => (
          <Button
            key={btn.key}
            type={btn.type}
            onClick={() => handleAction(btn.key)}
          >
            {btn.label}
          </Button>
        ))}
      </Space>
    </div>
  );
}
```

---

## 六、测试案例

### 6.1 后端测试案例

| 编号 | 测试场景 | 输入 | 预期结果 |
|------|----------|------|----------|
| TC1.4.1 | 正常获取详情 | GET /api/requirements/:id | 200, 返回完整详情 |
| TC1.4.2 | 获取详情含依赖 | GET /api/requirements/:id（有依赖） | 200, dependencies 包含依赖列表 |
| TC1.4.3 | 获取详情含操作历史 | GET /api/requirements/:id（有历史） | 200, statusLogs 按时间倒序 |
| TC1.4.4 | 获取详情含紧急变更 | GET /api/requirements/:id（有变更申请） | 200, emergencyChange 包含申请详情 |
| TC1.4.5 | 依赖风险等级计算 | 获取含各类状态依赖的详情 | riskLevel 正确计算 |
| TC1.4.6 | 需求不存在 | GET /api/requirements/nonexistent | 200, success:false, code=REQUIREMENT_NOT_FOUND |
| TC1.4.7 | 未登录获取详情 | 未带 Token | 200, success:false, code=UNAUTHORIZED |

### 6.2 前端测试案例

| 编号 | 测试场景 | 操作 | 预期结果 |
|------|----------|------|----------|
| TC1.4.F1 | 正常进入详情 | 从列表点击需求标题 | 显示完整详情页 |
| TC1.4.F2 | 基本信息布局 | 查看基本信息区域 | 2列网格布局，字段对齐 |
| TC1.4.F3 | 富文本渲染 | 查看需求描述 | 加粗、列表等格式正确 |
| TC1.4.F4 | 依赖风险显示 | 查看依赖需求区域 | 满足(绿✅)、未满足(橙⚠️)、已取消(红🔴) |
| TC1.4.F5 | 操作历史时间线 | 查看操作历史区域 | 按时间倒序，最新在上 |
| TC1.4.F6 | 操作按钮匹配列表 | 查看底部操作按钮 | 与列表页操作按钮一致 |
| TC1.4.F7 | 返回列表保留筛选 | 修改筛选条件后进入详情，点击返回 | 回到列表，筛选条件保留 |
| TC1.4.F8 | 加载中状态 | 进入详情页时 | 显示 loading 状态 |
| TC1.4.F9 | 详情不存在 | 进入不存在的需求详情 | 显示"需求不存在"提示 |
| TC1.4.F10 | 状态标签颜色 | 查看状态标签 | 草稿(灰)、待评审(蓝)等颜色正确 |
| TC1.4.F11 | 子状态显示 | 查看已纳版需求详情 | 显示"已纳版-开发中"等子状态 |
| TC1.4.F12 | 无依赖时显示 | 查看无依赖的需求详情 | 依赖区域显示"暂无依赖" |

---

## 七、编码顺序

| 步骤 | 内容 | 依赖 |
|------|------|------|
| 1 | 后端：GET /api/requirements/:id 接口实现 | US1.1 |
| 2 | 后端：依赖风险等级计算逻辑 | 步骤1 |
| 3 | 后端：操作历史查询（含关联用户） | 步骤1 |
| 4 | 后端：紧急变更申请关联查询 | 步骤1 |
| 5 | 后端：单元测试（7条） | 步骤1-4 |
| 6 | 前端：需求详情页框架 | US1.3 前端 |
| 7 | 前端：基本信息卡片组件 | 步骤6 |
| 8 | 前端：需求描述卡片组件（富文本渲染） | 步骤6 |
| 9 | 前端：依赖需求卡片组件 | 步骤6 |
| 10 | 前端：操作历史时间线组件 | 步骤6 |
| 11 | 前端：操作按钮复用（US1.3） | 步骤6 |
| 12 | 前端：返回列表保留筛选条件 | 步骤6 |
| 13 | 前端：集成测试（12条） | 步骤6-12 |

---

## 八、验收条件

### 8.1 功能验收

- [ ] AC1.4.1: 从列表点击需求标题进入详情页，展示完整信息
- [ ] AC1.4.2: 基本信息以 2 列网格布局展示，字段名和值对齐
- [ ] AC1.4.3: 需求描述正确渲染富文本内容（加粗、列表等）
- [ ] AC1.4.4: 依赖需求区域展示依赖，分别显示状态和风险等级
- [ ] AC1.4.5: 操作历史以时间线样式展示，按时间倒序
- [ ] AC1.4.6: 底部操作按钮与列表页操作按钮一致
- [ ] AC1.4.7: 点击"← 返回列表"回到列表页，保留筛选条件

### 8.2 技术验收

- [ ] AC1.4.8: 依赖风险等级正确计算（已满足/未满足/已完成/已取消）
- [ ] AC1.4.9: 操作历史包含操作人姓名和角色
- [ ] AC1.4.10: 富文本安全渲染（不执行脚本）
- [ ] AC1.4.11: 乐观锁 version 字段正确返回
- [ ] AC1.4.12: 子状态正确显示（如"已纳版-开发中"）
- [ ] AC1.4.13: 紧急变更申请正确显示（状态、原因、审批人）
- [ ] AC1.4.14: 后端测试 7 条全部通过
- [ ] AC1.4.15: 前端测试 12 条全部通过

---

*文档编号：RT-T1-US1.4*
*创建时间：2026-05-11*
*审核状态：待审核*
