# US1.7 评审拒绝 - 详细设计

**版本号**: v1.1
**日期**: 2026-05-15
**设计状态**: 待审核
**来源**: [RT-T1-需求池管理-用户故事_v1.0_20260511.md](./RT-T1-需求池管理-用户故事_v1.0_20260511.md)
**PRD**: [RT-Task1-需求池管理-PRD.md](./RT-Task1-需求池管理-PRD.md) §2.7
**前置依赖**: US1.5（发起评审）

### 版本记录

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0 | 2026-05-15 | 初版：根据用户故事文档规划创建 |
| v1.1 | 2026-05-15 | grill 评审后修正：权限与 US1.6 保持一致，仅 PROJECT_MGR |

---

## 一、功能概述

| 项目 | 说明 |
|------|------|
| 用户故事编号 | US1.7 |
| 功能描述 | 项目经理拒绝需求评审，需求进入已拒绝状态 |
| 触发入口 | 需求列表页 → 操作按钮 / 需求详情页 → 底部操作按钮 |
| 权限限制 | 仅项目经理（PROJECT_MGR）可评审拒绝 |
| 前置条件 | 需求状态必须为"待评审" |
| 后置效果 | 状态变更为"已拒绝"，需求可重新编辑 |
| 特殊规则 | 拒绝原因必填，最多 500 字 |

---

## 二、API 设计

### 2.1 接口定义

**POST /api/requirements/:id/review-reject**

| 项目 | 说明 |
|------|------|
| 功能 | 评审拒绝，需求进入已拒绝状态 |
| 权限 | 仅 PROJECT_MGR |

### 2.2 请求参数

```typescript
// 路径参数
interface ReviewRejectParams {
  id: string; // 需求ID
}

// 请求体
interface ReviewRejectBody {
  reason: string; // 拒绝原因，必填，最多 500 字
}
```

### 2.3 响应体

```typescript
interface ReviewRejectResponse {
  success: true;
  data: {
    id: string;
    reqCode: string;
    status: 'REJECTED';
    updatedAt: string;
    statusLog: StatusLogInfo;
  };
}
```

### 2.4 错误码

> **规范**：所有响应统一返回 HTTP 200，通过 `success: false` + `code` 区分错误类型。

| code | message | 说明 |
|------|---------|------|
| REQUIREMENT_NOT_PENDING_REVIEW | 仅待评审状态可评审拒绝 | 状态校验失败 |
| BAD_REQUEST | 拒绝原因不能为空 | 拒绝原因为空 |
| BAD_REQUEST | 拒绝原因最多 500 字 | 拒绝原因超长 |
| REQUIREMENT_PERMISSION_DENIED | 无评审拒绝权限 | 仅 PROJECT_MGR 可操作 |
| REQUIREMENT_NOT_FOUND | 需求不存在 | 需求不存在 |
| REQUIREMENT_VERSION_CONFLICT | 需求已被其他人修改，请刷新后重试 | 乐观锁冲突 |
| UNAUTHORIZED | 未登录或登录已过期 | 未登录 |

---

## 三、业务规则

### BR1.7.1 前置条件校验

```typescript
async function reviewReject(id: string, user: User, reason: string) {
  // 1. 校验需求存在且状态为待评审
  const requirement = await prisma.requirement.findUnique({
    where: { id },
    select: { status: true, version: true },
  });

  if (!requirement) {
    throw new NotFoundError('需求不存在');
  }

  if (requirement.status !== 'PENDING_REVIEW') {
    throw errors.requirementNotPendingReview('仅待评审状态可评审拒绝');
  }

  // 2. 校验权限：仅 PROJECT_MGR 可评审拒绝
  if (user.role !== Role.PROJECT_MGR) {
    throw errors.requirementPermissionDenied('您没有评审拒绝的权限');
  }

  // 3. 校验拒绝原因
  if (!reason || reason.trim().length === 0) {
    throw errors.badRequest('拒绝原因不能为空');
  }

  if (reason.length > 500) {
    throw errors.badRequest('拒绝原因最多 500 字');
  }

  // 4. 执行评审拒绝
  return changeStatusToRejected(id, user, reason.trim());
}
```

### BR1.7.2 状态变更与审计日志

```typescript
async function changeStatusToRejected(id: string, user: User, reason: string) {
  return prisma.$transaction(async (tx) => {
    // 1. 获取当前需求（含乐观锁版本）
    const requirement = await tx.requirement.findUnique({
      where: { id },
      select: { version: true, reqCode: true },
    });

    // 2. 更新状态为已拒绝
    const updated = await tx.requirement.update({
      where: { id, version: requirement!.version },
      data: {
        status: 'REJECTED',
        version: { increment: 1 },
      },
    });

    // 3. 记录审计日志（拒绝原因必填）
    await tx.statusLog.create({
      data: {
        requirementId: id,
        operatorId: user.id,
        operationType: 'REVIEW_REJECT',
        fromStatus: 'PENDING_REVIEW',
        toStatus: 'REJECTED',
        reason: reason, // 拒绝原因记录到审计日志
      },
    });

    return updated;
  });
}
```

### BR1.7.3 前端评审拒绝流程

```typescript
async function handleReviewReject(id: string, reason: string) {
  try {
    const res = await api.post(`/api/requirements/${id}/review-reject`, { reason });
    message.success('评审已拒绝');
    onRefresh();
    updateRequirementInList(id, { status: 'REJECTED' });
    return res.data;
  } catch (error: any) {
    if (error.code === 'BAD_REQUEST') {
      message.error(`无法评审拒绝：${error.message}`);
    } else if (error.code === 'REQUIREMENT_NOT_PENDING_REVIEW') {
      message.error('需求已不在待评审状态');
      onRefresh();
    } else if (error.code === 'REQUIREMENT_PERMISSION_DENIED') {
      message.error('您没有评审拒绝的权限');
    } else {
      message.error('评审拒绝操作失败');
    }
    throw error;
  }
}
```

---

## 四、前端实现

### 4.1 操作按钮显示逻辑（待评审状态）

```typescript
// 评审拒绝按钮显示条件：
// 1. 当前用户角色为 PROJECT_MGR
// 2. 需求状态为待评审（PENDING_REVIEW）
function canShowReviewRejectButton(user: User, requirement: RequirementDetail): boolean {
  return (
    user.role === Role.PROJECT_MGR &&
    requirement.status === 'PENDING_REVIEW'
  );
}
```

### 4.2 操作按钮矩阵（待评审状态）

| 角色 | 可用按钮 | 说明 |
|------|----------|------|
| BA | 取消 | 仅取消权限 |
| PM | - | 无评审权限 |
| PROJECT_MGR | 评审通过、评审拒绝 | 唯一可评审角色 |
| TECH_MGR | - | 无评审权限 |
| TEST_MGR | - | 无评审权限 |
| TRAIN_ADMIN | - | 无评审权限 |
| SUPER_ADMIN | - | 无评审权限 |

### 4.3 评审拒绝弹窗

```typescript
function ReviewRejectModal({ visible, requirement, onCancel, onSuccess }: Props) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const reasonLength = reason.length;
  const isValid = reason.trim().length > 0 && reason.length <= 500;

  const handleOk = async () => {
    if (!isValid) {
      if (reason.length === 0) {
        setError('请填写拒绝原因');
      } else if (reason.length > 500) {
        setError('拒绝原因最多 500 字');
      }
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      await handleReviewReject(requirement.id, reason);
      onSuccess();
    } catch (e) {
      // 错误由 handleReviewReject 处理
    } finally {
      setLoading(false);
    }
  };

  // 输入时清除错误提示
  const handleReasonChange = (value: string) => {
    setReason(value);
    if (error) setError(undefined);
  };

  return (
    <Modal
      title="评审拒绝"
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
          确认拒绝
        </Button>,
      ]}
    >
      <div className="review-reject-content">
        <Alert
          type="warning"
          message={
            <span>
              确认拒绝需求 <Text strong>{requirement.reqCode} {requirement.title}</Text>
            </span>
          }
        />
        <Form.Item
          label="拒绝原因"
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
            placeholder="请填写拒绝原因，以便 BA 了解需要修改的内容"
            showCount
          />
        </Form.Item>
      </div>
    </Modal>
  );
}
```

---

## 五、页面交互

### 5.1 评审拒绝交互流程

```
┌─────────────────────────────────────────────────────────────────┐
│ 需求详情页 - 待评审状态                                              │
│                                                                  │
│ 需求编号：REQ-UC-2026-0001                                        │
│ 需求标题：用户登录优化                                              │
│ 状态：[待评审]                                                    │
│                                                                  │
│ 底部操作栏（PROJECT_MGR可见）：                                    │
│ [评审通过] [评审拒绝] [取消]                                        │
│                                                                  │
│ 点击"评审拒绝"                                                     │
│         │                                                         │
│         ▼                                                         │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ 评审拒绝                                                          ││
│ │                                                                  ││
│ │ 确认拒绝需求 REQ-UC-2026-0001 用户登录优化？                       ││
│ │                                                                  ││
│ │ 拒绝原因（必填）：                                                ││
│ │ ┌─────────────────────────────────────────────────────────────┐││
│ │ │ 请填写拒绝原因，以便 BA 了解需要修改的内容                        │││
│ │ └─────────────────────────────────────────────────────────────┘││
│ │                                                        0/500   ││
│ │                                                                  ││
│ │                                    [取消]  [确认拒绝]              ││
│ └─────────────────────────────────────────────────────────────────┘│
│         │                                                         │
│         ▼                                                         │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ ⚠️ 请填写拒绝原因                                                  ││
│ │                                                                  ││
│ │ 拒绝原因（必填）：                                                ││
│ │ ┌─────────────────────────────────────────────────────────────┐││
│ │ │ ×                                                         │││
│ │ └─────────────────────────────────────────────────────────────┘││
│ │ 请填写拒绝原因                                                    ││
│ │                                                        0/500   ││
│ │                                    [取消]  [确认拒绝]              ││
│ └─────────────────────────────────────────────────────────────────┘│
│         │                                                         │
│         │ (填写原因后)                                              │
│         ▼                                                         │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ ✅ 评审已拒绝                                                     ││
│ │                                                                  ││
│ │ 需求已进入"已拒绝"状态，BA 可重新编辑后再次发起评审                    ││
│ │                                                                  ││
│ │ 拒绝原因：                                                        ││
│ │ "需求描述不够详细，需要补充具体的交互流程和验收标准"                    ││
│ │                                                                  ││
│ │                                    [查看详情] [重新编辑] [返回列表]   ││
│ └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 六、测试案例

### 6.1 后端测试案例

| 编号 | 测试场景 | 输入 | 预期结果 |
|------|----------|------|----------|
| TC1.7.1 | PROJECT_MGR正常评审拒绝 | 待评审需求，PROJECT_MGR，拒绝原因"内容不完整" | 200，状态变为REJECTED |
| TC1.7.2 | BA不能评审拒绝 | 待评审需求，BA用户调用 | 403，无评审拒绝权限 |
| TC1.7.3 | PM不能评审拒绝 | 待评审需求，PM用户调用 | 403，无评审拒绝权限 |
| TC1.7.4 | TECH_MGR不能评审拒绝 | 待评审需求，TECH_MGR用户调用 | 403，无评审拒绝权限 |
| TC1.7.5 | TEST_MGR不能评审拒绝 | 待评审需求，TEST_MGR用户调用 | 403，无评审拒绝权限 |
| TC1.7.6 | 拒绝原因为空 | reason = "" | 400，拒绝原因不能为空 |
| TC1.7.7 | 拒绝原因为空白 | reason = "   " | 400，拒绝原因不能为空 |
| TC1.7.8 | 拒绝原因超长 | reason 超过 500 字 | 400，拒绝原因最多 500 字 |
| TC1.7.9 | 拒绝原因正好500字 | reason = 500 字 | 200，成功 |
| TC1.7.10 | 非待评审状态 | 草稿需求调用 | 400，需求已不在待评审状态 |
| TC1.7.11 | 需求不存在 | 不存在的ID | 404，需求不存在 |
| TC1.7.12 | 未登录 | 未带Token | 401，未登录 |
| TC1.7.13 | 并发冲突 | 乐观锁版本不匹配 | 409，数据已被修改 |
| TC1.7.14 | 审计日志记录 | 评审拒绝成功 | statusLog记录REVIEW_REJECT |
| TC1.7.15 | 拒绝原因记录 | 评审拒绝带reason | 审计日志 reason 字段包含拒绝原因 |

### 6.2 前端测试案例

| 编号 | 测试场景 | 操作 | 预期结果 |
|------|----------|------|----------|
| TC1.7.F1 | PROJECT_MGR看到评审拒绝按钮 | 以PROJECT_MGR身份查看待评审需求 | 显示"评审拒绝"按钮 |
| TC1.7.F2 | BA看不到评审拒绝按钮 | 以BA身份查看待评审需求 | 不显示"评审拒绝"按钮 |
| TC1.7.F3 | PM看不到评审拒绝按钮 | 以PM身份查看待评审需求 | 不显示"评审拒绝"按钮 |
| TC1.7.F4 | 点击评审拒绝 | 点击按钮 | 弹出拒绝弹窗 |
| TC1.7.F5 | 拒绝原因为空时确认 | 不填原因点击确认 | 提示"请填写拒绝原因" |
| TC1.7.F6 | 拒绝原因超长提示 | 输入超过500字 | 显示字数统计，提示最多500字 |
| TC1.7.F7 | 填写拒绝原因后确认 | 填写原因后点击确认 | 成功，状态刷新为已拒绝 |
| TC1.7.F8 | 操作历史显示拒绝原因 | 评审拒绝后查看详情 | 操作历史显示拒绝原因 |
| TC1.7.F9 | 已拒绝状态显示重新编辑 | 评审拒绝后刷新页面 | 显示"重新编辑"按钮 |
| TC1.7.F10 | 列表页同步刷新 | 评审拒绝后返回列表 | 需求状态变为已拒绝 |

---

## 七、编码顺序

| 步骤 | 内容 | 依赖 | 说明 |
|------|------|------|------|
| 1 | 后端：POST /api/requirements/:id/review-reject 接口 | US1.5（状态变更模式） | 基础API实现 |
| 2 | 后端：PROJECT_MGR 权限校验 | 步骤1 | 唯一可评审角色 |
| 3 | 后端：拒绝原因校验（非空、≤500字） | 步骤1 | 与 US1.6 校验逻辑复用 |
| 4 | 后端：状态变更事务（状态更新+审计日志含原因） | 步骤1 | 与 US1.6 审计日志复用 |
| 5 | 后端：单元测试（15条） | 步骤1-4 | TC1.7.1~TC1.7.15 |
| 6 | 前端：评审拒绝弹窗组件 | US1.6前端 | ReviewRejectModal |
| 7 | 前端：handleReviewReject 函数 | 步骤6 | 调用API + 错误处理 |
| 8 | 前端：拒绝原因输入校验 | 步骤6 | 实时校验+错误提示 |
| 9 | 前端：评审拒绝成功刷新 | 步骤7 | 刷新详情+更新列表 |
| 10 | 前端：集成测试（10条） | 步骤6-9 | TC1.7.F1~TC1.7.F10 |

---

## 八、验收条件

### 8.1 功能验收

- [ ] AC1.7.1: 待评审状态需求，PROJECT_MGR 角色看到"评审拒绝"按钮
- [ ] AC1.7.2: BA 角色看不到"评审拒绝"按钮
- [ ] AC1.7.3: PM 角色看不到"评审拒绝"按钮
- [ ] AC1.7.4: 点击"评审拒绝"弹出弹窗，拒绝原因为必填输入框
- [ ] AC1.7.5: 拒绝原因为空时提交，提示"请填写拒绝原因"
- [ ] AC1.7.6: 拒绝原因超过 500 字时提示"拒绝原因最多 500 字"
- [ ] AC1.7.7: 填写原因后确认，状态变为"已拒绝"
- [ ] AC1.7.8: 操作历史记录"评审拒绝"条目，显示拒绝原因
- [ ] AC1.7.9: 已拒绝状态需求显示"重新编辑"按钮（BA可见）

### 8.2 技术验收

- [ ] AC1.7.10: 后端校验权限仅允许 PROJECT_MGR
- [ ] AC1.7.11: 后端校验拒绝原因不为空
- [ ] AC1.7.12: 后端校验拒绝原因长度 ≤500 字
- [ ] AC1.7.13: 拒绝原因记录到审计日志的 reason 字段
- [ ] AC1.7.14: 状态变更和审计日志在同一事务中
- [ ] AC1.7.15: 后端测试 15 条全部通过
- [ ] AC1.7.16: 前端测试 10 条全部通过

---

## 九、与其他用户故事的交互

### 9.1 US1.7 → US1.8 重新编辑

```
待评审 → [US1.7 评审拒绝] → 已拒绝 → [US1.8 重新编辑] → 草稿 → [US1.5 发起评审] → 待评审
```

### 9.2 US1.6 vs US1.7 对称性

| 对比项 | US1.6 评审通过 | US1.7 评审拒绝 |
|--------|---------------|---------------|
| 权限 | 仅 PROJECT_MGR | 仅 PROJECT_MGR |
| 意见/原因字段 | `reviewComment`（可选） | `reason`（必填） |
| 字数限制 | ≤500 字 | ≤500 字 |
| 后续状态 | 已就绪 | 已拒绝 |
| 后续操作 | 规划纳版/变更 | 重新编辑 |

### 9.3 权限矩阵总览

| 操作 | BA | PM | PROJECT_MGR | TECH_MGR | TEST_MGR | TRAIN_ADMIN | SUPER_ADMIN |
|------|:--:|:--:|:-----------:|:--------:|:--------:|:-----------:|:-----------:|
| 发起评审 | ✓ | - | - | - | - | ✓ | ✓ |
| 评审通过 | - | - | **✓** | - | - | - | - |
| 评审拒绝 | - | - | **✓** | - | - | - | - |

---

*文档编号：RT-T1-US1.7*
*创建时间：2026-05-15*
*更新时间：2026-05-15*
*版本：v1.1（grill 评审后修正）*
*审核状态：待审核*
