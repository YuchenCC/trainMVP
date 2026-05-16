# US2.4 版本火车详情查看 - 详细设计

**版本号**: v1.0  
**日期**: 2026-05-16  
**设计状态**: 待审核  
**来源**: [RT-T2-版本火车管理-用户故事_v1.1_20260516.md](./RT-T2-版本火车管理-用户故事_v1.1_20260516.md)  
**PRD**: [RT-Task2-版本火车管理-PRD.md](./RT-Task2-版本火车管理-PRD.md) §3.5.1

---

## 一、功能概述

版本火车详情页展示版本火车的完整信息，包含基本信息、搭载系统、纳版管理、关键节点等多个标签页。

---

## 二、业务规则

| 编号 | 规则 | 校验时机 |
|------|------|----------|
| BR2.4.1 | 详情页分为多个标签页：基本信息、搭载系统、纳版管理、关键节点 | 加载时 |
| BR2.4.2 | 「基本信息」标签页显示：名称、状态、时间、关键节点、描述、操作历史 | 加载时 |
| BR2.4.3 | 「搭载系统」标签页显示：各系统的成员配置、容量信息 | 加载时 |
| BR2.4.4 | 「纳版管理」标签页显示：团队容量概览、已纳版需求列表、待纳版需求列表 | 加载时 |
| BR2.4.5 | 「关键节点」标签页显示：各节点时间、状态、说明 | 加载时 |
| BR2.4.6 | 「← 返回列表」链接回到版本火车列表页 | 点击时 |

---

## 三、API 详细设计

### 3.1 查询版本火车详情

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
  
  // 时间相关（班次创建后才有值）
  startDate?: string;
  endDate?: string;
  boardingDate?: string;
  lockdownDate?: string;
  releaseDate?: string;
  
  // 创建信息
  createdBy: { id: string; displayName: string };
  createdAt: string;
  updatedAt: string;
  
  // 搭载系统列表
  systems: TrainSystemDetail[];
  
  // 纳版统计
  onboardedRequirements: RequirementListItem[];
  readyRequirements: RequirementListItem[];
}

/** 搭载系统详情 */
interface TrainSystemDetail {
  id: string;
  system: { id: string; name: string };
  capacityPoints: number;
  usedPoints: number;
  remainingPoints: number;
  usageRate: number;
  usageRateLevel: 'normal' | 'warning' | 'danger';  // 正常/警告/危险
  
  // 团队成员
  baUser?: { id: string; displayName: string };
  pmUser?: { id: string; displayName: string };
  techMgrUser?: { id: string; displayName: string };
  testMgrUser?: { id: string; displayName: string };
  devTeamUsers?: { id: string; displayName: string }[];
}

/** 需求列表项 */
interface RequirementListItem {
  id: string;
  reqCode: string;
  title: string;
  system: { id: string; name: string };
  priority: Priority;
  storyPoints: number;
  status: ReqStatus;
  subStatus?: ReqSubStatus;
}
```

### 3.2 容量使用率等级计算

```typescript
/**
 * 计算容量使用率等级
 * 
 * @param usedPoints - 已用点数
 * @param capacityPoints - 总容量点数
 * @returns 使用率等级
 */
function calculateUsageRateLevel(usedPoints: number, capacityPoints: number): 'normal' | 'warning' | 'danger' {
  if (capacityPoints === 0) return 'normal';
  
  const rate = usedPoints / capacityPoints;
  
  if (rate >= 0.9) return 'danger';    // ≥90% 危险
  if (rate >= 0.7) return 'warning';   // ≥70% 警告
  return 'normal';                      // <70% 正常
}
```

---

## 四、前端详细设计

### 4.1 页面结构

**文件路径**: `apps/web/src/pages/trains/[id].tsx`

```typescript
/** 版本火车详情页面组件 */
const TrainDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [train, setTrain] = useState<TrainDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'systems' | 'onboard' | 'keydates'>('info');
  
  // 加载火车详情
  useEffect(() => {
    if (id) {
      loadTrainDetail(id);
    }
  }, [id]);
  
  const loadTrainDetail = async (trainId: string) => {
    setLoading(true);
    try {
      const data = await getTrainDetail(trainId);
      setTrain(data);
    } finally {
      setLoading(false);
    }
  };
  
  // 渲染
  if (loading) return <Spin />;
  if (!train) return <Empty description="火车不存在" />;
  
  return (
    <div>
      <PageHeader 
        title={train.name} 
        subTitle={<StatusTag status={train.status} />}
        onBack={() => history.back()}
      />
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      <ActionButtons train={train} onRefresh={() => loadTrainDetail(id!)} />
    </div>
  );
};
```

### 4.2 标签页配置

```typescript
const tabItems = [
  { key: 'info', label: '基本信息', children: <BasicInfoTab train={train} /> },
  { key: 'systems', label: '搭载系统', children: <TrainSystemsTab train={train} /> },
  { key: 'onboard', label: '纳版管理', children: <OnboardTab train={train} /> },
  { key: 'keydates', label: '关键节点', children: <KeyDatesTab train={train} /> },
];
```

### 4.3 基本信息标签页

**布局：**

```
┌──────────────────────────────────────────────────────────────┐
│  基本信息                                                     │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  火车名称    2026年Q2第1车                            │   │
│  │  火车状态    [进行中]                                 │   │
│  │  开始时间    2026-05-05                              │   │
│  │  结束时间    2026-05-30                              │   │
│  │  统一投产日  2026-05-30                              │   │
│  │  创建人      张三                                      │   │
│  │  创建时间    2026-05-15                              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  火车描述                                                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  2026年第二季度第一期版本火车...                      │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  操作历史                                                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  2026-05-15 10:00  张三  创建火车                    │   │
│  │  2026-05-15 10:30  张三  创建班次                    │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### 4.4 搭载系统标签页

**布局：**

```
┌──────────────────────────────────────────────────────────────┐
│  搭载系统                                        [+ 添加系统]│
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  用户中心                              容量使用率 80% │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  已分配 32点 / 可用 40点   ████████████████░░░░░  │   │
│  │                                                      │   │
│  │  BA: 张三    PM: 李四                               │   │
│  │  技术经理: 王五  测试负责人: 赵六                     │   │
│  │  开发团队: 用户A、用户B、用户C                        │   │
│  │                                        [编辑] [移除] │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  订单系统                              容量使用率 83% │   │
│  │  ██████████████████████████████████████████ ⚠️    │   │
│  │  已分配 25点 / 可用 30点  ⚠️容量已满预警             │   │
│  │  ...                                                 │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### 4.5 纳版管理标签页

**布局：**

```
┌──────────────────────────────────────────────────────────────┐
│  纳版管理                                                     │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  团队容量概览                                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  系统        可用容量  已分配  剩余    使用率         │   │
│  │  用户中心     40点     32点    8点     ████████░░ 80%│   │
│  │  订单系统     30点     25点    5点     ████████░░ 83%│   │
│  │  支付系统     28点     28点    0点     ██████████ 100%│   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  已纳版需求 (共 12 条，总点数: 85)      [🤖 AI排期建议]    │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  REQ-001  用户登录优化   用户中心  P1  5点  [移除]  │   │
│  │  REQ-003  订单导出功能   订单系统  P2  8点  [回滚]  │   │
│  │  ...                                                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  待纳版需求 (已就绪，共 8 条)                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ □ REQ-002  支付功能重构   支付系统  P0  8点         │   │
│  │ □ REQ-006  订单列表筛选   订单系统  P2  5点         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│                    [确认纳版(已选0)]  [批量确认投产]         │
└──────────────────────────────────────────────────────────────┘
```

### 4.6 关键节点标签页

**布局：**

```
┌──────────────────────────────────────────────────────────────┐
│  关键节点                                                     │
│  ─────────────────────────────────────────────────────────   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │   │
│  │  [开始]   [统一纳版]  [统一封板]           [统一投产] │   │
│  │  5/5       5/16        5/23              5/30        │   │
│  │  周一      周五         周五               周五       │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  节点详情                                                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  ✓ 统一纳版日（5/16 周五）                           │   │
│  │    状态：已到达                                      │   │
│  │    说明：已在此节点前完成需求纳版                     │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  ⏳ 统一封板日（5/23 周五）                          │   │
│  │    状态：未到达                                      │   │
│  │    说明：UAT测试完成，之后严格控制需求变更            │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  ⏳ 统一投产日（5/30 周五）                           │   │
│  │    状态：未到达                                      │   │
│  │    说明：版本火车正式发布上线                         │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### 4.7 操作按钮

```typescript
/** 操作按钮组件 */
const ActionButtons: React.FC<{ train: TrainDetail; onRefresh: () => void }> = ({ train, onRefresh }) => {
  const { hasPermission } = useAuth();
  const isAdmin = hasPermission(Permission.MANAGE_TRAIN);
  
  const buttons = [];
  
  if (train.status === TrainStatus.PLANNING && isAdmin) {
    buttons.push(<Button key="edit" onClick={() => navigate(`/trains/${train.id}/edit`)}>编辑</Button>);
    buttons.push(<Button key="cancel" onClick={handleCancel}>取消</Button>);
    buttons.push(<Button key="schedule" type="primary" onClick={() => setShowScheduleModal(true)}>创建班次</Button>);
  }
  
  if (train.status === TrainStatus.IN_PROGRESS && isAdmin) {
    buttons.push(<Button key="complete" type="primary" onClick={handleComplete}>完成</Button>);
  }
  
  return <Space>{buttons}</Space>;
};
```

---

## 五、前端 Service 层

**文件路径**: `apps/web/src/services/train.ts`

```typescript
/** 查询版本火车详情 */
async function getTrainDetail(id: string): Promise<TrainDetail>;
```

---

## 六、测试案例

### 6.1 后端接口测试

| 编号 | 场景 | 前置条件 | 操作 | 预期结果 |
|------|------|----------|------|----------|
| T2.4.1 | 查询详情-正常 | 已登录 | GET /api/trains/{id} | 200，返回完整详情 |
| T2.4.2 | 查询详情-火车不存在 | 火车ID不存在 | GET /api/trains/{id} | 404 |

### 6.2 前端功能测试

| 编号 | 场景 | 操作 | 预期结果 |
|------|------|------|----------|
| T2.4.3 | 标签页切换 | 点击"搭载系统"标签 | 显示搭载系统列表 |
| T2.4.4 | 容量预警-红色 | 某系统使用率≥90% | 进度条显示红色 |
| T2.4.5 | 返回列表 | 点击"← 返回列表" | 跳转到列表页 |
| T2.4.6 | 操作按钮-计划中 | 查看计划中火车 | 显示编辑、取消、创建班次按钮 |
| T2.4.7 | 操作按钮-进行中 | 查看进行中火车 | 显示完成按钮 |

---

## 七、版本记录

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0 | 2026-05-16 | 初版设计 |

---

*文档编号：RT-T2-US2.4*  
*创建时间：2026-05-16*  
*版本：v1.0（待审核）*
