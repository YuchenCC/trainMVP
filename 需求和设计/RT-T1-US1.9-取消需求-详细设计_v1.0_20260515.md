# US1.9 取消需求 - 详细设计

**版本号**: v1.1
**日期**: 2026-05-15
**设计状态**: 待审核
**来源**: [RT-T1-需求池管理-用户故事_v1.0_20260511.md](./RT-T1-需求池管理-用户故事_v1.0_20260511.md)
**PRD**: [RT-Task1-需求池管理-PRD.md](./RT-Task1-需求池管理-PRD.md) §2.9
**前置依赖**: US1.1（需求录入）

### 版本记录

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0 | 2026-05-15 | 初版：根据用户故事文档规划创建 |
| v1.1 | 2026-05-15 | grill 评审后修正：移除 PROJECT_MGR 取消权限；依赖警告不阻断操作；增加容量返还逻辑 |

---

## 一、功能概述

| 项目 | 说明 |
|------|------|
| 用户故事编号 | US1.9 |
| 功能描述 | BA 或火车管理员取消一个需求，需求进入已取消终态 |
| 触发入口 | 需求列表页 → 操作按钮 / 需求详情页 → 底部操作按钮 |
| 权限限制 | 业务归属人（BA）、火车管理员、超级管理员（PM/PROJECT_MGR 不能取消） |
| 前置条件 | 需求状态不为"已取消"且不为"已投产" |
| 后置效果 | 状态变更为"已取消"（终态），已纳版时清除 trainId 并返还容量 |

### 特殊规则

- 取消原因为必填，最多 500 字
- 已纳版的需求取消时，自动从版本火车移除（清除 trainId）
- 已纳版取消时，根据版本火车已进行时间百分比返还容量
- 检查是否有其他需求依赖此需求，如有则提示警告（不阻断）
- 已投产的需求不能取消（终态，只能回滚）

---

## 二、API 设计

### 2.1 接口定义

**POST /api/requirements/:id/cancel**

| 项目 | 说明 |
|------|------|
| 功能 | 取消需求，需求进入已取消终态 |
| 权限 | BA（归属人）、TRAIN_ADMIN、SUPER_ADMIN |

### 2.2 请求参数

```typescript
// 路径参数
interface CancelRequirementParams {
  id: string; // 需求ID
}

// 请求体
interface CancelRequirementBody {
  reason: string; // 取消原因，必填，最多 500 字
}
```

### 2.3 响应体

```typescript
interface CancelRequirementResponse {
  success: true;
  data: {
    id: string;
    reqCode: string;
    status: 'CANCELLED';
    trainId: string | null; // 已纳版取消时会被清除
    updatedAt: string;
    statusLog: StatusLogInfo;
    capacityReleased: number; // 释放的容量点数（已纳版取消时）
    dependentWarnings?: {
      count: number;
      codes: string[];
    };
  };
}
```

### 2.4 错误码

> **规范**：所有响应统一返回 HTTP 200，通过 `success: false` + `code` 区分错误类型。

| code | message | 说明 |
|------|---------|------|
| BAD_REQUEST | 取消原因不能为空 | 取消原因为空 |
| BAD_REQUEST | 取消原因最多 500 字 | 取消原因超长 |
| REQUIREMENT_ALREADY_CANCELLED | 需求已取消 | 需求已取消 |
| REQUIREMENT_ALREADY_PRODUCED | 已投产需求不能取消，请使用回滚功能 | 已投产不能取消 |
| REQUIREMENT_PERMISSION_DENIED | 无取消需求的权限 | 无取消权限 |
| REQUIREMENT_NOT_FOUND | 需求不存在 | 需求不存在 |
| REQUIREMENT_VERSION_CONFLICT | 需求已被其他人修改，请刷新后重试 | 乐观锁冲突 |
| UNAUTHORIZED | 未登录或登录已过期 | 未登录 |

---

## 三、业务规则

### BR1.9.1 前置条件校验

```typescript
async function cancelRequirement(id: string, user: User, reason: string) {
  // 1. 校验需求存在
  const requirement = await prisma.requirement.findUnique({
    where: { id },
    select: { status: true, version: true, baId: true, trainId: true, storyPoint: true },
  });

  if (!requirement) {
    throw errors.requirementNotFound('需求不存在');
  }

  // 2. 校验状态：不能是已取消或已投产
  if (requirement.status === 'CANCELLED') {
    throw errors.requirementAlreadyCancelled('需求已取消');
  }

  if (requirement.status === 'PRODUCED') {
    throw errors.requirementAlreadyProduced('已投产需求不能取消，请使用回滚功能');
  }

  // 3. 校验权限：BA（归属人）、火车管理员、超级管理员
  const isBA = user.role === Role.BA && user.id === requirement.baId;
  const isTrainAdmin = user.role === Role.TRAIN_ADMIN;
  const isSuperAdmin = user.role === Role.SUPER_ADMIN;

  if (!isBA && !isTrainAdmin && !isSuperAdmin) {
    throw errors.requirementPermissionDenied('您没有取消需求的权限');
  }

  // 4. 校验取消原因
  if (!reason || reason.trim().length === 0) {
    throw errors.badRequest('取消原因不能为空');
  }

  if (reason.length > 500) {
    throw errors.badRequest('取消原因最多 500 字');
  }

  // 5. 检查依赖关系
  const dependentWarnings = await checkDependentRequirements(id);

  // 6. 执行取消
  return performCancel(id, user, reason.trim(), requirement);
}

async function checkDependentRequirements(id: string) {
  const dependents = await prisma.requirementDependency.findMany({
    where: { targetReqId: id },
    include: {
      sourceReq: {
        select: { id: true, reqCode: true, title: true, status: true },
      },
    },
  });

  if (dependents.length === 0) {
    return undefined;
  }

  return {
    count: dependents.length,
    codes: dependents.map(d => d.sourceReq.reqCode),
  };
}
```

### BR1.9.2 容量返还计算

```typescript
async function calculateCapacityRelease(
  requirement: Requirement,
  trainId: string | null
): Promise<number> {
  // 非已纳版需求，无容量需要释放
  if (!trainId) {
    return 0;
  }

  // 获取版本火车信息
  const train = await prisma.releaseTrain.findUnique({
    where: { id: trainId },
    select: {
      startDate: true,
      endDate: true,
      status: true,
    },
  });

  if (!train) {
    return 0;
  }

  // 计算版本已进行百分比
  const now = new Date();
  const startDate = new Date(train.startDate);
  const endDate = new Date(train.endDate);

  // 版本未开始，返还全部容量
  if (now <= startDate) {
    return requirement.storyPoint;
  }

  // 版本已结束，按剩余时间比例返还
  if (now >= endDate) {
    return 0;
  }

  // 计算已进行百分比
  const totalDuration = endDate.getTime() - startDate.getTime();
  const elapsed = now.getTime() - startDate.getTime();
  const progressPercent = elapsed / totalDuration;

  // 返还容量 = 需求点数 × (1 - 已进行百分比)
  const capacityRelease = Math.floor(requirement.storyPoint * (1 - progressPercent));

  return Math.max(0, capacityRelease);
}
```

### BR1.9.3 执行取消

```typescript
async function performCancel(
  id: string,
  user: User,
  reason: string,
  requirement: Requirement & { trainId: string | null }
) {
  return prisma.$transaction(async (tx) => {
    // 1. 获取当前需求（含乐观锁版本）
    const currentRequirement = await tx.requirement.findUnique({
      where: { id },
      select: { version: true, reqCode: true },
    });

    // 2. 计算容量返还
    const capacityRelease = await calculateCapacityRelease(requirement, requirement.trainId);

    // 3. 构建更新数据
    const updateData: any = {
      status: 'CANCELLED',
      version: { increment: 1 },
    };

    // 如果已纳版（trainId 不为空），清除火车关联
    if (requirement.trainId) {
      updateData.trainId = null;
    }

    // 4. 更新状态
    const updated = await tx.requirement.update({
      where: { id, version: currentRequirement!.version },
      data: updateData,
    });

    // 5. 释放容量（更新 TrainSystem 的已分配点数）
    if (requirement.trainId && capacityRelease > 0) {
      const trainSystem = await tx.trainSystem.findFirst({
        where: {
          trainId: requirement.trainId,
          systemCode: requirement.systemCode,
        },
      });

      if (trainSystem) {
        // 保护：确保 allocatedPoint 不会变为负数
        const newAllocatedPoint = Math.max(0, trainSystem.allocatedPoint - capacityRelease);
        await tx.trainSystem.update({
          where: { id: trainSystem.id },
          data: { allocatedPoint: newAllocatedPoint },
        });
      }
      // 如果 TrainSystem 不存在，静默忽略并记录日志
    }

    // 6. 记录审计日志
    await tx.statusLog.create({
      data: {
        requirementId: id,
        operatorId: user.id,
        operationType: 'CANCEL',
        fromStatus: requirement.status,
        toStatus: 'CANCELLED',
        reason: reason,
      },
    });

    return {
      ...updated,
      capacityReleased,
    };
  });
}
```

### BR1.9.4 通知规则

根据用户故事澄清（#15）：已纳版需求取消后，通知需求相关人员：
- 通知方式：列表页 badge 提示 + 操作历史记录
- 飞书/邮件/待办：后续版本实现

```typescript
// 通知逻辑（后续版本实现）
async function sendCancelNotification(requirementId: string, cancellerId: string) {
  // TODO: 实现通知逻辑
  // 1. 列表页 badge（前端轮询或 WebSocket）
  // 2. 操作历史记录（已实现）
  // 3. 飞书/邮件/待办（后续版本）
}
```

---

## 四、前端实现

### 4.1 操作按钮显示逻辑

```typescript
// 取消按钮显示条件：
// 1. 当前用户角色为 BA（归属人）或 TRAIN_ADMIN 或 SUPER_ADMIN
// 2. 需求状态不为"已取消"且不为"已投产"
function canShowCancelButton(user: User, requirement: RequirementDetail): boolean {
  if (requirement.status === 'CANCELLED' || requirement.status === 'PRODUCED') {
    return false;
  }

  const isBA = user.role === Role.BA;
  const isTrainAdmin = user.role === Role.TRAIN_ADMIN;
  const isSuperAdmin = user.role === Role.SUPER_ADMIN;

  return isBA || isTrainAdmin || isSuperAdmin;
}
```

### 4.2 操作按钮矩阵（各状态）

| 状态 | BA | PM | PROJECT_MGR | TECH_MGR | TEST_MGR | TRAIN_ADMIN | SUPER_ADMIN |
|------|:--:|:--:|:-----------:|:--------:|:--------:|:-----------:|:-----------:|
| 草稿 | ✓ | - | - | - | - | ✓ | ✓ |
| 待评审 | ✓ | - | - | - | - | ✓ | ✓ |
| 已就绪 | ✓ | - | - | - | - | ✓ | ✓ |
| 已拒绝 | ✓ | - | - | - | - | ✓ | ✓ |
| 已纳版 | ✓ | - | - | - | - | ✓ | ✓ |
| 已投产 | - | - | - | - | - | - | - |
| 已取消 | - | - | - | - | - | - | - |

### 4.3 取消需求弹窗

```typescript
function CancelModal({ visible, requirement, onCancel, onSuccess }: Props) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const isValid = reason.trim().length > 0 && reason.length <= 500;

  const handleOk = async () => {
    if (!isValid) {
      if (reason.length === 0) {
        setError('请填写取消原因');
      } else if (reason.length > 500) {
        setError('取消原因最多 500 字');
      }
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      const result = await handleCancel(requirement.id, reason);

      // 如果有依赖警告，显示给用户
      if (result.dependentWarnings) {
        message.warning(
          `有 ${result.dependentWarnings.count} 个需求依赖此需求，已取消的需求将无法满足依赖`
        );
      }

      onSuccess();
    } catch (e) {
      // 错误由 handleCancel 处理
    } finally {
      setLoading(false);
    }
  };

  const handleReasonChange = (value: string) => {
    setReason(value);
    if (error) setError(undefined);
  };

  return (
    <Modal
      title="取消需求"
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>取消</Button>,
        <Button
          key="submit"
          type="primary"
          danger
          loading={loading}
          disabled={!isValid}
          onClick={handleOk}
        >
          确认取消
        </Button>,
      ]}
    >
      <div className="cancel-content">
        <Alert
          type="warning"
          message={
            <span>
              确认取消需求 <Text strong>{requirement.reqCode} {requirement.title}</Text>
            </span>
          }
        />

        {requirement.trainId && (
          <Alert
            type="info"
            message="此需求已纳入版本火车，取消后将从此版本火车移除"
            style={{ marginTop: 12 }}
          />
        )}

        <Form.Item
          label="取消原因"
          required
          validateStatus={error ? 'error' : undefined}
          help={error}
          style={{ marginTop: 16 }}
        >
          <Input.TextArea
            rows={4}
            value={reason}
            onChange={(e) => handleReasonChange(e.target.value)}
            maxLength={500}
            placeholder="请填写取消原因"
            showCount
          />
        </Form.Item>
      </div>
    </Modal>
  );
}
```

### 4.4 取消成功处理

```typescript
async function handleCancel(id: string, reason: string) {
  try {
    const res = await api.post(`/api/requirements/${id}/cancel`, { reason });
    message.success('需求已取消');
    onRefresh();
    updateRequirementInList(id, { status: 'CANCELLED' });
    return res.data;
  } catch (error: any) {
    if (error.code === 'BAD_REQUEST') {
      if (error.message.includes('为空')) {
        message.error('请填写取消原因');
      } else if (error.message.includes('500')) {
        message.error('取消原因最多 500 字');
      }
    } else if (error.code === 'REQUIREMENT_ALREADY_CANCELLED') {
      message.warning('需求已取消');
      onRefresh();
    } else if (error.code === 'REQUIREMENT_ALREADY_PRODUCED') {
      message.warning('已投产需求不能取消，请使用回滚功能');
    } else if (error.code === 'REQUIREMENT_PERMISSION_DENIED') {
      message.error('您没有取消需求的权限');
    } else {
      message.error('取消需求操作失败');
    }
    throw error;
  }
}
```

---

## 五、页面交互

### 5.1 取消需求交互流程

```
┌─────────────────────────────────────────────────────────────────┐
│ 需求详情页 - 已纳版状态                                              │
│                                                                  │
│ 需求编号：REQ-UC-2026-0001                                        │
│ 需求标题：用户登录优化                                              │
│ 状态：[已纳版-开发中]                                              │
│ 归属火车：V1.2.0                                                   │
│                                                                  │
│ 底部操作栏：                                                       │
│ [需求变更] [取消]                                                  │
│                                                                  │
│ 点击"取消"                                                         │
│         │                                                         │
│         ▼                                                         │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ 取消需求                                                          ││
│ │                                                                  ││
│ │ 确认取消需求 REQ-UC-2026-0001 用户登录优化？                         ││
│ │                                                                  ││
│ │ ⚠️ 此需求已纳入版本火车，取消后将从此版本火车移除                      ││
│ │                                                                  ││
│ │ 取消原因（必填）：                                                ││
│ │ ┌─────────────────────────────────────────────────────────────┐││
│ │ │ 请填写取消原因                                                │││
│ │ └─────────────────────────────────────────────────────────────┘││
│ │                                                        0/500   ││
│ │                                                                  ││
│ │                                    [取消]  [确认取消]              ││
│ └─────────────────────────────────────────────────────────────────┘│
│         │                                                         │
│         ▼                                                         │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ ⚠️ 有 2 个需求依赖此需求，已取消的需求将无法满足依赖                      ││
│ │                                                                  ││
│ │ 依赖此需求的需求：                                                 ││
│ │ · REQ-2026-0003 订单页优化                                       ││
│ │ · REQ-2026-0005 支付流程改造                                     ││
│ │                                                                  ││
│ │                              [确认取消] [返回]                       ││
│ └─────────────────────────────────────────────────────────────────┘│
│         │                                                         │
│         ▼                                                         │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ ✅ 需求已取消                                                     ││
│ │                                                                  ││
│ │ 已释放容量：5 点（版本已进行 50%）                                   ││
│ │                                                                  ││
│ │                                          [查看详情] [返回列表]      ││
│ └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 容量返还说明

| 场景 | 已进行百分比 | 返还容量 |
|------|------------|---------|
| 版本未开始 | 0% | 100% |
| 版本过半 | 50% | 50% |
| 版本接近结束 | 90% | 10% |
| 版本已结束 | 100% | 0% |

---

## 六、测试案例

### 6.1 后端测试案例

| 编号 | 测试场景 | 输入 | 预期结果 |
|------|----------|------|----------|
| TC1.9.1 | BA正常取消草稿需求 | 草稿需求，BA用户（归属人），取消原因 | 200，状态变为CANCELLED |
| TC1.9.2 | TRAIN_ADMIN取消待评审需求 | 待评审需求，TA用户，取消原因 | 200，状态变为CANCELLED |
| TC1.9.3 | SUPER_ADMIN取消已就绪需求 | 已就绪需求，SA用户，取消原因 | 200，状态变为CANCELLED |
| TC1.9.4 | PM不能取消需求 | 任意状态，PM用户 | 403，无取消权限 |
| TC1.9.5 | PROJECT_MGR不能取消需求 | 任意状态，PMGR用户 | 403，无取消权限 |
| TC1.9.6 | TECH_MGR不能取消需求 | 任意状态，TMGR用户 | 403，无取消权限 |
| TC1.9.7 | 非归属人BA不能取消 | 非归属人的BA用户 | 403，无取消权限 |
| TC1.9.8 | 取消原因为空 | reason = "" | 400，取消原因不能为空 |
| TC1.9.9 | 取消原因超长 | reason 超过 500 字 | 400，取消原因最多 500 字 |
| TC1.9.10 | 已取消状态 | 已取消需求调用 | 400，需求已取消 |
| TC1.9.11 | 已投产状态 | 已投产需求调用 | 400，已投产需求不能取消 |
| TC1.9.12 | 已纳版取消清除trainId | 已纳版需求（有trainId）取消 | trainId被清除 |
| TC1.9.13 | 版本未开始返还全部容量 | 取消已纳版需求，版本未开始 | 返还100%容量 |
| TC1.9.14 | 版本过半返还50%容量 | 取消已纳版需求，版本已进行50% | 返还50%容量 |
| TC1.9.15 | 依赖警告返回 | 取消有依赖的需求 | 返回dependentWarnings |
| TC1.9.16 | 需求不存在 | 不存在的ID | 404，需求不存在 |
| TC1.9.17 | 未登录 | 未带Token | 401，未登录 |
| TC1.9.18 | 并发冲突 | 乐观锁版本不匹配 | 409，数据已被修改 |
| TC1.9.19 | 审计日志记录 | 取消成功 | statusLog记录CANCEL和原因 |

### 6.2 前端测试案例

| 编号 | 测试场景 | 操作 | 预期结果 |
|------|----------|------|----------|
| TC1.9.F1 | 草稿需求显示取消按钮 | 以BA身份查看草稿需求 | 显示"取消"按钮 |
| TC1.9.F2 | PM不显示取消按钮 | 以PM身份查看任意需求 | 不显示"取消"按钮 |
| TC1.9.F3 | PROJECT_MGR不显示取消按钮 | 以PMGR身份查看任意需求 | 不显示"取消"按钮 |
| TC1.9.F4 | 已投产不显示取消按钮 | 查看已投产需求 | 不显示"取消"按钮 |
| TC1.9.F5 | 点击取消 | 点击按钮 | 弹出取消弹窗 |
| TC1.9.F6 | 取消原因为空时确认 | 不填原因点击确认 | 提示"请填写取消原因" |
| TC1.9.F7 | 填写取消原因后确认 | 填写原因后点击确认 | 成功，状态变为已取消 |
| TC1.9.F8 | 已纳版取消显示火车提示 | 取消已纳版需求 | 显示"取消后将从此版本火车移除" |
| TC1.9.F9 | 依赖警告显示 | 取消有依赖的需求 | 显示依赖警告 |
| TC1.9.F10 | 取消成功显示释放容量 | 取消已纳版需求 | 显示已释放容量点数 |
| TC1.9.F11 | 操作历史显示取消原因 | 取消后查看详情 | 操作历史显示取消原因 |
| TC1.9.F12 | 列表页同步刷新 | 取消后返回列表 | 需求状态变为已取消 |

---

## 七、编码顺序

| 步骤 | 内容 | 依赖 | 说明 |
|------|------|------|------|
| 1 | 后端：POST /api/requirements/:id/cancel 接口 | US1.1（数据模型） | 基础API实现 |
| 2 | 后端：权限校验（BA归属人/TA/SA，排除PM/PMGR/TMGR） | 步骤1 | 复用校验 |
| 3 | 后端：取消原因校验（非空、≤500字） | 步骤1 | 复用US1.7拒绝原因 |
| 4 | 后端：检查依赖需求（返回警告） | 步骤1 | 查询依赖关系 |
| 5 | 后端：容量返还计算逻辑 | 步骤1 | 根据版本已进行百分比计算 |
| 6 | 后端：已纳版取消清除trainId + 释放容量 | 步骤5 | 火车移除逻辑 |
| 7 | 后端：状态变更事务 | 步骤1 | 复用审计日志 |
| 8 | 后端：单元测试（19条） | 步骤1-7 | TC1.9.1~TC1.9.19 |
| 9 | 前端：取消弹窗组件 | US1.7前端 | CancelModal |
| 10 | 前端：handleCancel 函数 | 步骤9 | 调用API + 警告处理 |
| 11 | 前端：已纳版火车提示 | 步骤9 | Alert提示 |
| 12 | 前端：依赖警告显示 | 步骤10 | 警告提示 |
| 13 | 前端：集成测试（12条） | 步骤9-12 | TC1.9.F1~TC1.9.F12 |

---

## 八、验收条件

### 8.1 功能验收

- [ ] AC1.9.1: 草稿/待评审/已就绪/已拒绝/已纳版状态需求，BA/TA/SA 角色看到"取消"按钮
- [ ] AC1.9.2: PM 角色看不到"取消"按钮
- [ ] AC1.9.3: PROJECT_MGR/TECH_MGR 角色看不到"取消"按钮
- [ ] AC1.9.4: 已投产状态需求不显示"取消"按钮
- [ ] AC1.9.5: 点击"取消"弹出弹窗，取消原因为必填
- [ ] AC1.9.6: 取消原因为空时提交，提示"请填写取消原因"
- [ ] AC1.9.7: 已纳版需求取消时，显示"取消后将从此版本火车移除"提示
- [ ] AC1.9.8: 有依赖的需求取消时，显示依赖警告（不阻断）
- [ ] AC1.9.9: 取消成功显示已释放容量点数
- [ ] AC1.9.10: 确认后状态变为"已取消"，操作按钮全部消失
- [ ] AC1.9.11: 操作历史记录取消原因

### 8.2 技术验收

- [ ] AC1.9.12: 后端校验取消原因非空且 ≤500 字
- [ ] AC1.9.13: 已纳版取消时清除 trainId
- [ ] AC1.9.14: 根据版本已进行百分比计算并释放容量
- [ ] AC1.9.15: 依赖警告返回但不阻断操作
- [ ] AC1.9.16: 状态变更和审计日志在同一事务中
- [ ] AC1.9.17: 使用乐观锁防止并发冲突
- [ ] AC1.9.18: 后端测试 19 条全部通过
- [ ] AC1.9.19: 前端测试 12 条全部通过

---

## 九、与其他用户故事的交互

### 9.1 取消 vs 变更

| 对比项 | 取消 | 需求变更 |
|--------|------|----------|
| 状态 | 终态 | 非终态（退回草稿） |
| 权限 | BA/TA/SA | BA/TA/SA |
| 原因 | 必填 | 必填 |
| 火车移除 | ✓ | ✓（已纳版时） |
| 容量返还 | ✓（按已进行百分比） | ✗ |
| 后续 | 不可逆 | 可重新评审 |

### 9.2 状态与可取消性

```
可取消状态：草稿 → 待评审 → 已就绪 → 已拒绝 → 已纳版（任意子状态）
不可取消：   已投产（终态）、已取消（终态）
```

### 9.3 容量返还规则

| 版本已进行 | 返还比例 | 示例（10点需求） |
|-----------|---------|----------------|
| 0% | 100% | 返还 10 点 |
| 25% | 75% | 返还 7.5 点（取整） |
| 50% | 50% | 返还 5 点 |
| 75% | 25% | 返还 2.5 点（取整） |
| 100% | 0% | 返还 0 点 |

### 9.4 通知规则

| 场景 | 通知内容 | 实现方式 |
|------|----------|----------|
| 已纳版需求取消 | 通知相关人员 | Badge + 操作历史（待定：飞书/邮件） |

### 9.5 权限矩阵总览

| 操作 | BA | PM | PROJECT_MGR | TECH_MGR | TEST_MGR | TRAIN_ADMIN | SUPER_ADMIN |
|------|:--:|:--:|:-----------:|:--------:|:--------:|:-----------:|:-----------:|
| 发起评审 | ✓ | - | - | - | - | ✓ | ✓ |
| 评审通过 | - | - | **✓** | - | - | - | - |
| 评审拒绝 | - | - | **✓** | - | - | - | - |
| 重新编辑 | ✓ | ✓ | - | - | - | - | - |
| 取消 | ✓ | - | - | - | - | ✓ | ✓ |

---

*文档编号：RT-T1-US1.9*
*创建时间：2026-05-15*
*更新时间：2026-05-15*
*版本：v1.1（grill 评审后修正）*
*审核状态：待审核*
