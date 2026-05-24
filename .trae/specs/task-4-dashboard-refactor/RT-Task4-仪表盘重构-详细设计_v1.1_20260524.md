# 仪表盘重构 详细设计

**版本号**: v1.1  
**日期**: 2026-05-24  
**状态**: 待审核  
**任务编号**: Task-4  
**参考文档**: [RT-Task4-仪表盘重构-PRD_v2.2](./RT-Task4-仪表盘重构-PRD_v2.2_20260524.md)

---

## 一、文档信息

| 项目 | 内容 |
|------|------|
| 产品名称 | 版本火车需求管理系统 |
| 版本号 | MVP v1.1 |
| 文档目的 | 仪表盘重构详细设计 |
| 对应任务 | Task-4 仪表盘重构 |

---

## 二、文件结构

```
apps/web/src/
├── pages/dashboard/
│   ├── index.tsx          # 统一仪表盘入口（重构）
│   ├── ba.tsx             # BA仪表盘（待删除）
│   └── pm.tsx            # PM仪表盘（待删除）
├── components/dashboard/
│   ├── KeyDatesCountdown.tsx    # 关键时间倒计时（新增）
│   ├── TodoList.tsx             # 待办事项列表（重构）
│   ├── StatusStatCards.tsx      # 统计卡片（保留，跳转逻辑调整）
│   └── SystemSelector.tsx       # 系统选择器（已有）
└── hooks/
    └── useDashboardData.ts     # 数据加载Hook（重构）
```

---

## 三、接口设计

### 3.1 GET /api/requirements/my-todos

**描述**：获取当前用户的待办事项

**请求头**：
```
Authorization: Bearer {token}
```

**响应体**：
```typescript
interface MyTodosResponse {
  // BA 待办
  pendingReviewRejected?: RequirementListItem[];    // 审核拒绝待重新编辑
  myEmergencyChanges?: EmergencyChangeWithStatus[]; // 我发起的紧急变更
  
  // PM/TECH_MGR/PROJECT_MGR/TRAIN_ADMIN 待办
  pendingReviewList?: RequirementListItem[];         // 待评审需求
  
  // PROJECT_MGR/TEST_MGR/TRAIN_ADMIN 待办
  emergencyPendingApproval?: EmergencyChangeItem[];   // 紧急变更待审批
}

// 紧急变更（含状态）
interface EmergencyChangeWithStatus extends EmergencyChangeItem {
  isMyRequest: boolean;       // 是否是我发起的变更
}
```

### 3.2 GET /api/requirements/stats

**描述**：获取需求统计数据

**请求参数**：
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| systemId | string | 否 | 系统ID筛选 |

**响应体**：
```typescript
interface RequirementStatsResponse {
  byStatus: Record<ReqStatus, number>;
  byPriority: Record<Priority, number>;
  total: number;
  activeCount: number;
}
```

### 3.3 GET /api/schedules/progress

**描述**：获取班次进度

**请求参数**：
| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| systemId | string | 否 | 系统ID筛选 |

**响应体**：
```typescript
interface ScheduleProgressItem[] {
  id: string;
  trainName: string;
  version: number;
  status: TrainScheduleStatus;
  currentPhase: string;
  progress: number;
  capacityUsed: number;
  capacityTotal: number;
  startDate: string;
  boardingDate?: string;
  sitDate?: string;
  uatDate?: string;
  lockdownDate?: string;
  releaseDate?: string;
  requirements: {
    total: number;
    completed: number;
  };
}
```

---

## 四、页面设计

### 4.1 统一仪表盘入口（index.tsx）

**功能**：根据用户角色分发不同的待办数据

```typescript
// ========== 统一仪表盘入口 ==========
const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const { stats, todos, schedules, loading } = useDashboardData();
  const [selectedSystemId, setSelectedSystemId] = useState<string>('');
  
  // 角色判断
  const role = user?.role;
  
  // 根据角色获取待办列表
  const getTodoSections = () => {
    switch (role) {
      case 'BA':
        return [
          { key: 'rejected', title: '需求审核拒绝', data: todos.pendingReviewRejected },
          { key: 'emergency', title: '紧急变更进度', data: todos.myEmergencyChanges }
        ];
      case 'PM':
      case 'TECH_MGR':
        return [
          { key: 'pending', title: '待评审需求', data: todos.pendingReviewList }
        ];
      case 'PROJECT_MGR':
      case 'TRAIN_ADMIN':
        return [
          { key: 'pending', title: '待评审需求', data: todos.pendingReviewList },
          { key: 'emergency', title: '紧急变更待审批', data: todos.emergencyPendingApproval }
        ];
      case 'TEST_MGR':
        return [
          { key: 'emergency', title: '紧急变更待审批', data: todos.emergencyPendingApproval }
        ];
      default:
        return [];
    }
  };
  
  return (
    <div className="dashboard-page">
      {/* 标题栏 + 系统筛选器 */}
      <Header>
        <Title level={2}>仪表盘</Title>
        <SystemSelector value={selectedSystemId} onChange={setSelectedSystemId} />
      </Header>
      
      {/* 统计卡片 */}
      <StatusStatCards stats={stats} systemId={selectedSystemId} />
      
      {/* 关键时间倒计时 */}
      <KeyDatesCountdown schedules={schedules} />
      
      {/* 待办事项列表 */}
      <TodoList sections={getTodoSections()} />
    </div>
  );
};
```

### 4.2 关键时间倒计时组件

**功能**：展示未来30天内的关键节点

```typescript
// ========== 关键时间倒计时 ==========
interface KeyDatesCountdownProps {
  schedules: ScheduleProgressItem[];
}

interface KeyDateItem {
  type: 'boarding' | 'sit' | 'uat' | 'lockdown' | 'release';
  label: string;
  date: Date;
  daysLeft: number;
  scheduleName: string;
  color: string;
  icon: string;
}

const KeyDatesCountdown: React.FC<KeyDatesCountdownProps> = ({ schedules }) => {
  // 1. 收集所有班次的关键日期
  // 2. 过滤未来30天内的日期
  // 3. 按剩余天数升序排列
  // 4. 渲染展示
  
  const getKeyDates = (): KeyDateItem[] => {
    const now = new Date();
    const thirtyDaysLater = addDays(now, 30);
    const items: KeyDateItem[] = [];
    
    schedules.forEach(schedule => {
      const scheduleInfo = `${schedule.trainName} - v${schedule.version}`;
      
      // 纳版截止
      if (schedule.boardingDate) {
        const date = new Date(schedule.boardingDate);
        if (date >= now && date <= thirtyDaysLater) {
          items.push({
            type: 'boarding',
            label: '纳版截止',
            date,
            daysLeft: differenceInDays(date, now),
            scheduleName: scheduleInfo,
            color: '#faad14',
            icon: '🔔'
          });
        }
      }
      
      // SIT开始
      if (schedule.sitDate) {
        const date = new Date(schedule.sitDate);
        if (date >= now && date <= thirtyDaysLater) {
          items.push({
            type: 'sit',
            label: 'SIT开始',
            date,
            daysLeft: differenceInDays(date, now),
            scheduleName: scheduleInfo,
            color: '#1890ff',
            icon: '🧪'
          });
        }
      }
      
      // UAT开始
      if (schedule.uatDate) {
        const date = new Date(schedule.uatDate);
        if (date >= now && date <= thirtyDaysLater) {
          items.push({
            type: 'uat',
            label: 'UAT开始',
            date,
            daysLeft: differenceInDays(date, now),
            scheduleName: scheduleInfo,
            color: '#722ed1',
            icon: '✅'
          });
        }
      }
      
      // 封板
      if (schedule.lockdownDate) {
        const date = new Date(schedule.lockdownDate);
        if (date >= now && date <= thirtyDaysLater) {
          items.push({
            type: 'lockdown',
            label: '封板',
            date,
            daysLeft: differenceInDays(date, now),
            scheduleName: scheduleInfo,
            color: '#f5222d',
            icon: '🔒'
          });
        }
      }
      
      // 投产
      if (schedule.releaseDate) {
        const date = new Date(schedule.releaseDate);
        if (date >= now && date <= thirtyDaysLater) {
          items.push({
            type: 'release',
            label: '投产',
            date,
            daysLeft: differenceInDays(date, now),
            scheduleName: scheduleInfo,
            color: '#52c41a',
            icon: '🚀'
          });
        }
      }
    });
    
    // 按剩余天数升序排列
    return items.sort((a, b) => a.daysLeft - b.daysLeft);
  };
  
  // 渲染
  const keyDates = getKeyDates();
  
  return (
    <Card title="关键时间倒计时">
      {keyDates.length > 0 ? (
        <List
          dataSource={keyDates}
          renderItem={(item) => (
            <List.Item>
              <Space>
                <Tag color={item.color}>{item.icon} {item.label}</Tag>
                <Text type="secondary">{item.scheduleName}</Text>
                <Text strong style={{ color: item.color }}>
                  还剩 {item.daysLeft} 天
                </Text>
                <Text type="secondary">
                  {item.date.toLocaleDateString()}
                </Text>
              </Space>
            </List.Item>
          )}
        />
      ) : (
        <Empty description="未来30天内无关键节点" />
      )}
    </Card>
  );
};
```

---

## 五、数据模型

### 5.1 类型定义

```typescript
// packages/shared/src/types/dashboard.ts

// 需求统计响应
export interface RequirementStatsResponse {
  byStatus: Record<string, number>;    // 按状态分组统计
  byPriority: Record<string, number>;  // 按优先级分组统计
  total: number;                        // 总数
  activeCount: number;                  // 活跃数（排除已取消/已投产）
}

// 用户待办响应
export interface MyTodosResponse {
  // BA 待办
  pendingReviewRejected?: RequirementListItem[];
  myEmergencyChanges?: EmergencyChangeWithStatus[];
  
  // 通用待办
  pendingReviewList?: RequirementListItem[];
  emergencyPendingApproval?: EmergencyChangeItem[];
}

// 紧急变更（含状态）
export interface EmergencyChangeWithStatus extends EmergencyChangeItem {
  isMyRequest: boolean;
  rejectionReason?: string;
}

// 班次进度项
export interface ScheduleProgressItem {
  id: string;
  trainName: string;
  version: number;
  status: TrainScheduleStatus;
  currentPhase: string;
  progress: number;
  capacityUsed: number;
  capacityTotal: number;
  startDate: string;
  boardingDate?: string;
  sitDate?: string;
  uatDate?: string;
  lockdownDate?: string;
  releaseDate?: string;
  requirements: {
    total: number;
    completed: number;
  };
}
```

---

## 六、待办查询逻辑

### 6.1 getMyTodos 函数

```typescript
// apps/server/src/modules/requirements/service.ts

export async function getMyTodos(user: {
  id: string;
  role: Role;
  systemIds: string[];
}): Promise<MyTodosResponse> {
  switch (user.role) {
    case Role.BA: {
      // 需求审核拒绝（需重新编辑）
      const pendingReviewRejected = await prisma.requirement.findMany({
        where: { 
          status: ReqStatus.REJECTED, 
          systemId: { in: user.systemIds } 
        },
        include: { system: { select: { id: true, name: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      });
      
      // 我发起的紧急变更（含状态）
      const myEmergencyChanges = await prisma.emergencyChange.findMany({
        where: { 
          requirement: { systemId: { in: user.systemIds } },
          creatorId: user.id
        },
        include: { 
          requirement: { 
            select: { reqCode: true, title: true, system: true } 
          } 
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }).then(list => list.map(item => ({
        id: item.id,
        requirementId: item.requirementId,
        reqCode: item.requirement.reqCode,
        title: item.requirement.title,
        system: item.requirement.system,
        urgency: item.urgency,
        status: item.status,
        rejectionReason: item.rejectReason,
        isMyRequest: true,
        createdAt: item.createdAt.toISOString(),
      })));
      
      return { pendingReviewRejected, myEmergencyChanges };
    }
    
    case Role.PM:
    case Role.TECH_MGR: {
      // 待评审需求
      const pendingReviewList = await prisma.requirement.findMany({
        where: { status: ReqStatus.PENDING_REVIEW },
        include: { system: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return { pendingReviewList };
    }
    
    case Role.PROJECT_MGR:
    case Role.TRAIN_ADMIN: {
      // 待评审需求
      const pendingReviewList = await prisma.requirement.findMany({
        where: { status: ReqStatus.PENDING_REVIEW },
        include: { system: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      
      // 紧急变更待审批
      const emergencyPendingApproval = await prisma.emergencyChange.findMany({
        where: { status: ApprovalStatus.PENDING },
        include: { 
          requirement: { 
            select: { reqCode: true, title: true, system: true } 
          } 
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      
      return { pendingReviewList, emergencyPendingApproval };
    }
    
    case Role.TEST_MGR: {
      // 紧急变更待审批
      const emergencyPendingApproval = await prisma.emergencyChange.findMany({
        where: { status: ApprovalStatus.PENDING },
        include: { 
          requirement: { 
            select: { reqCode: true, title: true, system: true } 
          } 
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return { emergencyPendingApproval };
    }
    
    default:
      return {};
  }
}
```

---

## 七、测试用例

### 7.1 页面访问测试

| 用例编号 | 描述 | 预期结果 |
|----------|------|----------|
| TC-01 | 未登录访问 /dashboard | 重定向到登录页 |
| TC-02 | BA 登录访问 /dashboard | 显示 BA 待办（审核拒绝+紧急变更进度） |
| TC-03 | PM 登录访问 /dashboard | 显示 PM 待办（待评审需求） |
| TC-04 | PROJECT_MGR 登录访问 /dashboard | 显示待评审+紧急变更待审批 |

### 7.2 统计卡片测试

| 用例编号 | 描述 | 预期结果 |
|----------|------|----------|
| TC-05 | 点击"草稿"卡片 | 跳转至 /requirements?status=DRAFT |
| TC-06 | 点击"已就绪"卡片 | 跳转至 /requirements?status=READY |
| TC-07 | 切换系统后统计数据变化 | 统计数据按选中系统过滤 |

### 7.3 关键时间倒计时测试

| 用例编号 | 描述 | 预期结果 |
|----------|------|----------|
| TC-08 | 未来30天内有关键节点 | 显示节点卡片 |
| TC-09 | 未来30天内无关键节点 | 显示"未来30天内无关键节点" |
| TC-10 | 节点已过期 | 不显示已过期节点 |

### 7.4 待办事项测试

| 用例编号 | 描述 | 预期结果 |
|----------|------|----------|
| TC-11 | BA 点击审核拒绝项"查看详情" | 跳转至需求详情页 |
| TC-12 | PROJECT_MGR 点击"通过"按钮 | 紧急变更审批通过 |
| TC-13 | PROJECT_MGR 点击"拒绝"按钮 | 显示驳回原因输入框 |
| TC-14 | BA 查看紧急变更进度 | 显示"审批拒绝"/"已通过"状态 |

---

## 八、文件改动清单

### 8.1 新增文件

| 文件路径 | 描述 |
|----------|------|
| `apps/web/src/components/dashboard/KeyDatesCountdown.tsx` | 关键时间倒计时组件 |
| `apps/web/src/hooks/useDashboardData.ts` | 数据加载Hook |
| `.trae/specs/task-4-dashboard-refactor/RT-Task4-仪表盘重构-PRD_v2.2.md` | PRD文档 |
| `.trae/specs/task-4-dashboard-refactor/RT-Task4-仪表盘重构-详细设计_v1.1.md` | 详细设计文档 |

### 8.2 修改文件

| 文件路径 | 修改内容 |
|----------|----------|
| `apps/web/src/pages/dashboard/index.tsx` | 重构为统一仪表盘入口 |
| `apps/web/src/pages/dashboard/ba.tsx` | 删除（合并到index） |
| `apps/web/src/pages/dashboard/pm.tsx` | 删除（合并到index） |
| `apps/web/src/components/dashboard/StatusStatCards.tsx` | 添加systemId参数，更新跳转URL |
| `apps/web/src/components/dashboard/TodoList.tsx` | 重构为按sections渲染 |
| `apps/web/src/services/requirement.ts` | 更新类型定义 |
| `apps/server/src/modules/requirements/service.ts` | 重构getMyTodos函数 |
| `packages/shared/src/types/dashboard.ts` | 更新类型定义 |

### 8.3 删除文件

| 文件路径 | 原因 |
|----------|------|
| `apps/web/src/pages/dashboard/ba.tsx` | 功能合并到index.tsx |
| `apps/web/src/pages/dashboard/pm.tsx` | 功能合并到index.tsx |

---

## 九、版本记录

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v1.1 | 2026-05-24 | 重构为统一仪表盘，按角色分发数据；新增关键时间倒计时组件 |
| v1.0 | 2026-05-22 | 初始版本，基于角色分离的仪表盘设计 |

---

*本文档为 [RT-Task4-仪表盘重构-PRD_v2.2](./RT-Task4-仪表盘重构-PRD_v2.2_20260524.md) 的详细实现设计*
