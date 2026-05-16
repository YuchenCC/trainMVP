# US2.5 纳版搭载（含依赖校验、容量校验）- 详细设计

**版本号**: v1.0  
**日期**: 2026-05-16  
**设计状态**: 待审核  
**来源**: [RT-T2-版本火车管理-用户故事_v1.1_20260516.md](./RT-T2-版本火车管理-用户故事_v1.1_20260516.md)  
**PRD**: [RT-Task2-版本火车管理-PRD.md](./RT-Task2-版本火车管理-PRD.md) §3.4.5

---

## 一、功能概述

纳版搭载是将已就绪的需求纳入版本火车的核心功能，包含依赖校验和容量校验。

---

## 二、业务规则

| 编号 | 规则 | 校验时机 |
|------|------|----------|
| BR2.5.1 | 前置条件：需求状态为「已就绪」 | 操作时 |
| BR2.5.2 | 需求归属系统必须在版本火车的搭载系统列表中 | 校验时 |
| BR2.5.3 | 需求工作量点数必须已填写 | 校验时 |
| BR2.5.4 | **依赖校验**：检查依赖需求状态，按风险等级分级提示 | 校验时 |
| BR2.5.5 | 依赖风险等级：已纳版/已投产→无风险；已就绪未纳版→warning；草稿/待评审/已拒绝→high；已取消→critical | 计算时 |
| BR2.5.6 | 存在依赖风险时允许强制纳版，但需填写确认说明 | 提交时 |
| BR2.5.7 | **容量校验**：纳版后扣减对应系统的可用容量 | 提交时 |
| BR2.5.8 | 若系统容量不足（剩余可用点数 < 需求点数），弹窗预警但允许强制纳版 | 提交时 |
| BR2.5.9 | 纳版成功后，需求状态变更为「已纳版」，关联版本火车 | 变更时 |
| BR2.5.10 | 纳版成功后，记录操作历史 | 变更时 |
| BR2.5.11 | 使用 Prisma 事务保证数据一致性 | 执行时 |

---

## 三、依赖风险校验

### 3.1 依赖风险等级定义

| 风险等级 | 依赖状态 | 提示内容 | 是否允许纳版 | 确认说明 |
|----------|----------|----------|-------------|----------|
| 无风险 | 已纳版 / 已投产 | 依赖已满足 | 是，无需确认 | 无需 |
| warning | 已就绪（未纳版） | 依赖需求已就绪但未纳入本车，纳版后可能影响开发进度 | 是，需确认 | 可选 |
| high | 草稿 / 待评审 / 已拒绝 | 依赖需求状态为[XX]，纳版后可能阻塞开发 | 是，需填写 | 必填 |
| critical | 已取消 | 依赖需求已取消，请重新评估需求依赖 | 是，需填写 | 必填 |

### 3.2 依赖校验代码

```typescript
/**
 * 校验需求依赖风险
 * 
 * @param requirementId - 待纳版的需求ID
 * @param trainId - 目标火车ID
 * @param prisma - Prisma客户端
 * @returns 依赖风险校验结果
 */
async function checkDependencyRisk(
  requirementId: string,
  trainId: string,
  prisma: PrismaClient,
): Promise<DependencyRiskResult> {
  // 查询该需求的所有前置依赖
  const dependencies = await prisma.requirementDependency.findMany({
    where: { dependantId: requirementId },
    include: {
      dependency: {
        select: {
          id: true,
          reqCode: true,
          title: true,
          status: true,
          trainId: true,
        },
      },
    },
  });

  if (dependencies.length === 0) {
    return { hasRisk: false, risks: [] };
  }

  const risks: DependencyRisk[] = [];

  for (const dep of dependencies) {
    const { dependency } = dep;
    const riskLevel = getRiskLevel(dependency.status, dependency.trainId, trainId);
    
    risks.push({
      dependencyId: dependency.id,
      reqCode: dependency.reqCode,
      title: dependency.title,
      dependencyStatus: dependency.status,
      riskLevel,
      message: getRiskMessage(riskLevel, dependency.reqCode, dependency.status),
    });
  }

  // 判断是否有风险（warning及以上）
  const hasRisk = risks.some(r => r.riskLevel !== 'none');

  return { hasRisk, risks };
}

/**
 * 获取依赖风险等级
 */
function getRiskLevel(
  status: ReqStatus,
  dependencyTrainId: string | null,
  targetTrainId: string,
): 'none' | 'warning' | 'high' | 'critical' {
  // 已投产或已纳版到本火车：无风险
  if (status === ReqStatus.RELEASED) return 'none';
  if (status === ReqStatus.ONBOARDED && dependencyTrainId === targetTrainId) return 'none';
  
  // 已取消：critical
  if (status === ReqStatus.CANCELLED) return 'critical';
  
  // 草稿/待评审/已拒绝：high
  if (status === ReqStatus.DRAFT) return 'high';
  if (status === ReqStatus.PENDING_REVIEW) return 'high';
  if (status === ReqStatus.REJECTED) return 'high';
  
  // 已就绪（未纳版）：warning
  if (status === ReqStatus.READY) return 'warning';
  
  return 'warning';
}

/**
 * 获取风险提示消息
 */
function getRiskMessage(riskLevel: string, reqCode: string, status: string): string {
  switch (riskLevel) {
    case 'none':
      return `依赖 ${reqCode} 已满足`;
    case 'warning':
      return `依赖 ${reqCode} 已就绪但未纳入本车，纳版后可能影响开发进度`;
    case 'high':
      return `依赖 ${reqCode} 状态为[${status}]，纳版后可能阻塞开发`;
    case 'critical':
      return `依赖 ${reqCode} 已取消，请重新评估需求依赖`;
    default:
      return `依赖 ${reqCode} 状态异常`;
  }
}
```

---

## 四、容量校验

### 4.1 容量计算逻辑

```typescript
/**
 * 校验并计算纳版后的容量影响
 * 
 * @param trainId - 火车ID
 * @param requirementSystemId - 需求所属系统ID
 * @param storyPoints - 需求工作量点数
 * @param prisma - Prisma客户端
 * @returns 容量校验结果
 */
async function checkCapacityImpact(
  trainId: string,
  requirementSystemId: string,
  storyPoints: number,
  prisma: PrismaClient,
): Promise<CapacityCheckResult> {
  // 查询火车的搭载系统配置
  const trainSystem = await prisma.trainSystem.findUnique({
    where: {
      trainId_systemId: { trainId, systemId: requirementSystemId },
    },
  });

  if (!trainSystem) {
    return {
      valid: false,
      error: 'SYSTEM_NOT_CONFIGURED',
      message: '需求归属系统未配置到本火车',
    };
  }

  const remainingPoints = trainSystem.capacityPoints - trainSystem.usedPoints;
  const afterOnboard = remainingPoints - storyPoints;
  const hasCapacity = afterOnboard >= 0;

  return {
    valid: true,  // 容量不足也允许纳版，只是 warning
    hasCapacity,
    systemName: trainSystem.system.name,
    capacityPoints: trainSystem.capacityPoints,
    usedPoints: trainSystem.usedPoints,
    remainingPoints,
    afterOnboard,
    storyPoints,
  };
}
```

### 4.2 容量影响计算示例

| 场景 | 当前已用 | 总容量 | 剩余 | 纳版点数 | 纳版后剩余 | 状态 |
|------|----------|--------|------|----------|-----------|------|
| 容量充足 | 25 | 30 | 5 | 3 | 2 | 正常 |
| 容量不足 | 28 | 30 | 2 | 5 | -3 | ⚠️ 预警 |

---

## 五、API 详细设计

### 5.1 预检纳版（校验）

```
POST /api/trains/:id/onboard/precheck
```

**说明**：在正式纳版前，先校验依赖风险和容量影响，返回校验结果供前端展示。

**请求体：**

```typescript
interface PrecheckOnboardRequest {
  requirementIds: string[];  // 待纳版的需求ID列表
}
```

**响应体：**

```typescript
interface PrecheckOnboardResponse {
  valid: boolean;
  results: {
    requirementId: string;
    reqCode: string;
    title: string;
    system: { id: string; name: string };
    storyPoints: number;
    systemConfigured: boolean;     // 系统是否已配置到火车
    dependencyCheck: {
      hasRisk: boolean;
      risks: DependencyRisk[];
    };
    capacityCheck: {
      hasCapacity: boolean;
      systemName: string;
      remainingPoints: number;
      afterOnboard: number;
    };
  }[];
  summary: {
    totalCount: number;
    canOnboardCount: number;
    hasDependencyRiskCount: number;
    hasCapacityWarningCount: number;
  };
}
```

### 5.2 纳版搭载

```
POST /api/trains/:id/onboard
```

**请求体：**

```typescript
interface OnboardRequest {
  requirementIds: string[];
  confirmedRisks?: {
    requirementId: string;
    riskLevel: 'warning' | 'high' | 'critical';
    confirmedNote?: string;  // high/critical 必填
  }[];
}
```

**Service 层逻辑：**

```
1. 权限校验：TRAIN_ADMIN / SUPER_ADMIN
2. 校验火车存在且状态为 IN_PROGRESS
3. 循环处理每个需求：
   a. 校验需求存在且状态为 READY
   b. 校验需求归属系统已配置到火车
   c. 校验依赖风险（如果存在 high/critical 风险，检查已确认）
   d. 记录容量扣减
4. Prisma 事务：
   a. 批量更新需求状态为 ONBOARDED，设置 trainId
   b. 批量更新 TrainSystem.usedPoints
   c. 批量创建 StatusLog 记录（operationType=ONBOARD）
5. 返回纳版结果
```

**错误码：**

| 场景 | HTTP状态码 | code | message |
|------|-----------|------|---------|
| 火车不存在 | 404 | NOT_FOUND | 版本火车不存在 |
| 火车状态非进行中 | 400 | BAD_REQUEST | 只能向进行中的火车纳版 |
| 需求不存在 | 400 | BAD_REQUEST | 需求不存在：{id} |
| 需求状态非已就绪 | 400 | BAD_REQUEST | 只有已就绪状态的需求可纳版 |
| 系统未配置 | 400 | BAD_REQUEST | 需求归属系统[XX]未配置到本火车 |
| 依赖风险未确认 | 400 | BAD_REQUEST | 存在未确认的依赖风险 |

### 5.3 获取待纳版需求列表

```
GET /api/trains/:id/ready-requirements
```

**说明**：获取可纳版到该火车的已就绪需求列表

**响应体：**

```typescript
interface ReadyRequirementsResponse {
  list: {
    id: string;
    reqCode: string;
    title: string;
    system: { id: string; name: string };
    priority: Priority;
    storyPoints: number;
    ba: { id: string; displayName: string };
    createdAt: string;
  }[];
}
```

---

## 六、前端详细设计

### 6.1 纳版确认弹窗

**文件路径**: `apps/web/src/components/trains/OnboardModal.tsx`

```typescript
interface OnboardModalProps {
  visible: boolean;
  trainId: string;
  selectedRequirements: RequirementListItem[];
  onClose: () => void;
  onSuccess: () => void;
}
```

**弹窗布局：**

```
┌──────────────────────────────────────────────────────────────┐
│  确认纳版                                              [×]  │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  已选择 3 个需求待纳版:                                      │
│                                                               │
│  • REQ-002 支付功能重构    支付系统  P0  8点               │
│  • REQ-006 订单列表筛选    订单系统  P2  5点               │
│  • REQ-009 消息通知优化    用户中心  P2  4点  ⚠️            │
│                                                               │
│  ────────────────────────────────────────────────────────  │
│                                                               │
│  容量影响:                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  订单系统: 25/30 → 30/30  ✅ 容量充足            │   │
│  │  用户中心: 32/40 → 36/40  ✅ 容量充足            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ⚠️ 依赖风险:                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  REQ-009 依赖 REQ-205(用户数据同步) 状态为[已就绪]  │   │
│  │  → 依赖需求未纳入本车，纳版后可能影响开发进度         │   │
│  │                                                        │   │
│  │  确认说明（选填）:                                     │   │
│  │  [________________________________]                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  是否继续纳版？                                               │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│                                    [取消]  [确认纳版]        │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 高风险依赖确认

当存在 high 或 critical 级别风险时：

```
┌──────────────────────────────────────────────────────────────┐
│  ⚠️ 高风险依赖:                                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  REQ-009 依赖 REQ-300(权限模块) 状态为[草稿]        │   │
│  │  → 依赖需求状态为[草稿]，纳版后可能阻塞开发           │   │
│  │                                                        │   │
│  │  确认说明 *（必填）:                                   │   │
│  │  [________________________________]                   │   │
│  │  ⚠️ 高风险依赖必须填写确认说明                        │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### 6.3 前端 Service 层

```typescript
/** 预检纳版 */
async function precheckOnboard(
  trainId: string,
  requirementIds: string[]
): Promise<PrecheckOnboardResponse>;

/** 纳版搭载 */
async function onboardRequirements(
  trainId: string,
  data: OnboardRequest
): Promise<OnboardResponse>;

/** 获取待纳版需求列表 */
async function getReadyRequirements(trainId: string): Promise<ReadyRequirementsResponse>;
```

---

## 七、测试案例

### 7.1 后端接口测试

| 编号 | 场景 | 前置条件 | 操作 | 预期结果 |
|------|------|----------|------|----------|
| T2.5.1 | 预检-正常 | 火车进行中 | POST precheck | 200，返回校验结果 |
| T2.5.2 | 预检-需求状态错误 | 需求非已就绪 | POST precheck | 返回状态错误提示 |
| T2.5.3 | 纳版-正常 | 无风险 | POST onboard | 200，状态变为已纳版 |
| T2.5.4 | 纳版-高风险未确认 | 有 high 风险 | POST onboard | 400，需确认风险 |
| T2.5.5 | 纳版-高风险已确认 | 有 high 风险已填说明 | POST onboard | 200，成功纳版 |
| T2.5.6 | 纳版-容量不足 | 剩余容量不足 | POST onboard | 200，成功纳版（带警告） |
| T2.5.7 | 获取待纳版需求 | 火车进行中 | GET ready-requirements | 200，返回已就绪需求 |

### 7.2 前端功能测试

| 编号 | 场景 | 操作 | 预期结果 |
|------|------|------|----------|
| T2.5.8 | 纳版弹窗-显示待纳版需求 | 选择需求点击纳版 | 显示已选需求列表 |
| T2.5.9 | 纳版弹窗-容量预警 | 容量不足时 | 显示 ⚠️ 容量预警 |
| T2.5.10 | 纳版弹窗-依赖风险提示 | 存在依赖风险 | 显示风险等级和提示 |
| T2.5.11 | 纳版弹窗-高风险确认 | high 风险 | 必填确认说明字段 |
| T2.5.12 | 纳版成功 | 点击确认纳版 | 需求状态变更，弹窗关闭 |

---

## 八、版本记录

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0 | 2026-05-16 | 初版设计 |

---

*文档编号：RT-T2-US2.5*  
*创建时间：2026-05-16*  
*版本：v1.0（待审核）*
