# US1.6 评审通过 - 详细设计

**版本号**: v1.1
**日期**: 2026-05-15
**设计状态**: 待审核
**来源**: [RT-T1-需求池管理-用户故事_v1.0_20260511.md](./RT-T1-需求池管理-用户故事_v1.0_20260511.md)
**PRD**: [RT-Task1-需求池管理-PRD.md](./RT-Task1-需求池管理-PRD.md) §2.6
**前置依赖**: US1.5（发起评审）

### 版本记录

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0 | 2026-05-15 | 初版：根据用户故事文档规划创建 |
| v1.1 | 2026-05-15 | grill 评审后修正：权限收缩为仅 PROJECT_MGR；StatusLog 增加 reviewComment 字段；API 响应增加 isAlreadyApproved 字段 |

---

## 一、功能概述

| 项目 | 说明 |
|------|------|
| 用户故事编号 | US1.6 |
| 功能描述 | 项目经理通过需求评审，需求进入已就绪状态 |
| 触发入口 | 需求列表页 → 操作按钮 / 需求详情页 → 底部操作按钮 |
| 权限限制 | 仅项目经理（PROJECT_MGR）可评审通过 |
| 前置条件 | 需求状态必须为"待评审" |
| 后置效果 | 状态变更为"已就绪"，评审通过不可逆 |

---

## 二、API 设计

### 2.1 接口定义

**POST /api/requirements/:id/review-pass**

| 项目 | 说明 |
|------|------|
| 功能 | 评审通过，需求进入已就绪状态 |
| 权限 | 仅 PROJECT_MGR |

### 2.2 请求参数

```typescript
// 路径参数
interface ReviewPassParams {
  id: string; // 需求ID
}

// 请求体（可选）
interface ReviewPassBody {
  comment?: string; // 评审意见，可选，最多 500 字
}
```

### 2.3 响应体

```typescript
interface ReviewPassResponse {
  success: true;
  data: {
    id: string;
    reqCode: string;
    status: 'READY';
    updatedAt: string;
    statusLog: StatusLogInfo;
  };
}
```

### 2.4 需求详情接口扩展（用于前端按钮预判）

**GET /api/requirements/:id**

响应体增加字段：

```typescript
interface RequirementDetailResponse {
  // ... 原有字段 ...
  isAlreadyApproved: boolean; // 是否已有评审通过记录，用于前端判断是否显示评审按钮
}
```

### 2.5 错误码

> **规范**：所有响应统一返回 HTTP 200，通过 `success: false` + `code` 区分错误类型。

| code | message | 说明 |
|------|---------|------|
| REQUIREMENT_NOT_PENDING_REVIEW | 仅待评审状态可评审通过 | 状态校验失败 |
| REQUIREMENT_ALREADY_APPROVED | 该需求已被评审通过 | 重复评审 |
| BAD_REQUEST | 评审意见最多 500 字 | 评审意见超长 |
| REQUIREMENT_PERMISSION_DENIED | 无评审通过权限 | 仅 PROJECT_MGR 可操作 |
| REQUIREMENT_NOT_FOUND | 需求不存在 | 需求不存在 |
| REQUIREMENT_VERSION_CONFLICT | 需求已被其他人修改，请刷新后重试 | 乐观锁冲突 |
| UNAUTHORIZED | 未登录或登录已过期 | 未登录 |

---

## 三、业务规则

### BR1.6.1 前置条件校验

```typescript
async function reviewPass(id: string, user: User, comment?: string) {
  // 1. 校验需求存在且状态为待评审
  const requirement = await prisma.requirement.findUnique({
    where: { id },
    select: { status: true, version: true },
  });

  if (!requirement) {
    throw new NotFoundError('需求不存在');
  }

  if (requirement.status !== 'PENDING_REVIEW') {
    throw errors.requirementNotPendingReview('仅待评审状态可评审通过');
  }

  // 2. 校验权限：仅 PROJECT_MGR 可评审通过
  if (user.role !== Role.PROJECT_MGR) {
    throw errors.requirementPermissionDenied('您没有评审通过的权限');
  }

  // 3. 校验评审意见长度
  if (comment && comment.length > 500) {
    throw errors.badRequest('评审意见最多 500 字');
  }

  // 4. 执行评审通过
  return changeStatusToReady(id, user, comment);
}
```

### BR1.6.2 状态变更与审计日志

```typescript
async function changeStatusToReady(id: string, user: User, comment?: string) {
  return prisma.$transaction(async (tx) => {
    // 1. 获取当前需求（含乐观锁版本）
    const requirement = await tx.requirement.findUnique({
      where: { id },
      select: { version: true, reqCode: true },
    });

    // 2. 更新状态为已就绪
    const updated = await tx.requirement.update({
      where: { id, version: requirement!.version },
      data: {
        status: 'READY',
        version: { increment: 1 },
      },
    });

    // 3. 记录审计日志
    await tx.statusLog.create({
      data: {
        requirementId: id,
        operatorId: user.id,
        operationType: 'REVIEW_PASS',
        fromStatus: 'PENDING_REVIEW',
        toStatus: 'READY',
        reviewComment: comment || undefined, // 评审意见（可选）
      },
    });

    return updated;
  });
}
```

### BR1.6.3 防重复评审校验

```typescript
// 需求详情接口中返回是否已有评审通过记录
async function getRequirementDetail(id: string, user: User) {
  const requirement = await prisma.requirement.findUnique({ ... });

  // 查询是否已有评审通过记录
  const approvedLog = await prisma.statusLog.findFirst({
    where: {
      requirementId: id,
      operationType: 'REVIEW_PASS',
    },
  });

  return {
    ...requirement,
    isAlreadyApproved: !!approvedLog,
  };
}
```

### BR1.6.4 前端评审通过流程

```typescript
async function handleReviewPass(id: string, comment?: string) {
  try {
    const res = await api.post(`/api/requirements/${id}/review-pass`, { comment });
    message.success('评审已通过');
    onRefresh();
    updateRequirementInList(id, { status: 'READY' });
    return res.data;
  } catch (error: any) {
    if (error.code === 'BAD_REQUEST') {
      message.warning(error.message);
      onRefresh();
    } else if (error.code === 'REQUIREMENT_PERMISSION_DENIED') {
      message.error('您没有评审通过的权限');
    } else {
      message.error('评审通过操作失败');
    }
    throw error;
  }
}
```

---

## 四、前端实现

### 4.1 操作按钮显示逻辑（待评审状态）

```typescript
// 评审通过按钮显示条件：
// 1. 当前用户角色为 PROJECT_MGR
// 2. 需求状态为待评审（PENDING_REVIEW）
// 3. 该需求尚未被评审通过（isAlreadyApproved === false）
function canShowReviewPassButton(user: User, requirement: RequirementDetail): boolean {
  return (
    user.role === Role.PROJECT_MGR &&
    requirement.status === 'PENDING_REVIEW' &&
    !requirement.isAlreadyApproved
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

### 4.3 评审通过弹窗

```typescript
function ReviewPassModal({ visible, requirement, onCancel, onSuccess }: Props) {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleOk = async () => {
    setLoading(true);
    try {
      await handleReviewPass(requirement.id, comment);
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="评审通过"
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>取消</Button>,
        <Button key="submit" type="primary" loading={loading} onClick={handleOk}>
          确认通过
        </Button>,
      ]}
    >
      <div className="review-pass-content">
        <Alert
          type="info"
          message={
            <span>
              确认通过需求 <Text strong>{requirement.reqCode} {requirement.title}</Text>
            </span>
          }
        />
        <Form.Item label="评审意见" style={{ marginTop: 16 }}>
          <Input.TextArea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            placeholder="可选，填写评审通过的意见或备注"
            showCount
          />
        </Form.Item>
      </div>
    </Modal>
  );
}
```

### 4.4 评审通过后按钮变化

```
┌─────────────────────────────────────────────────────────────────┐
│ 评审通过前（待评审状态）                                           │
│ 底部操作栏：[评审通过] [评审拒绝] [取消]（仅 PROJECT_MGR 可见）       │
│                                                                  │
│ 评审通过后（已就绪状态）                                           │
│ 底部操作栏：[需求变更] [取消]（BA可见）                              │
│            无按钮（其他角色可见）                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 五、页面交互

### 5.1 评审通过交互流程

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
│ 点击"评审通过"                                                     │
│         │                                                         │
│         ▼                                                         │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ 评审通过                                                          ││
│ │                                                                  ││
│ │ 确认通过需求 REQ-UC-2026-0001 用户登录优化？                       ││
│ │                                                                  ││
│ │ 评审意见（可选）：                                                 ││
│ │ ┌─────────────────────────────────────────────────────────────┐││
│ │ │                                                             │││
│ │ └─────────────────────────────────────────────────────────────┘││
│ │                                    0/500                        ││
│ │                                                                  ││
│ │                                          [取消]  [确认通过]        ││
│ └─────────────────────────────────────────────────────────────────┘│
│         │                                                         │
│         ▼                                                         │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ ✅ 评审已通过                                                     ││
│ │                                                                  ││
│ │ 需求已进入"已就绪"状态，可以进行后续规划和纳版                        ││
│ │                                                                  ││
│ │                                          [查看详情] [返回列表]      ││
│ └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 六、测试案例

### 6.1 后端测试案例

| 编号 | 测试场景 | 输入 | 预期结果 |
|------|----------|------|----------|
| TC1.6.1 | PROJECT_MGR正常评审通过 | 待评审需求，PROJECT_MGR用户调用 | 200，状态变为READY |
| TC1.6.2 | BA不能评审通过 | 待评审需求，BA用户调用 | 403，无评审通过权限 |
| TC1.6.3 | PM不能评审通过 | 待评审需求，PM用户调用 | 403，无评审通过权限 |
| TC1.6.4 | TECH_MGR不能评审通过 | 待评审需求，TECH_MGR用户调用 | 403，无评审通过权限 |
| TC1.6.5 | TEST_MGR不能评审通过 | 待评审需求，TEST_MGR用户调用 | 403，无评审通过权限 |
| TC1.6.6 | 非待评审状态 | 草稿需求调用 | 400，仅待评审状态可评审通过 |
| TC1.6.7 | 已被评审通过 | 已就绪需求调用 | 400，该需求已被评审通过 |
| TC1.6.8 | 评审意见超长 | comment 超过 500 字 | 400，评审意见最多 500 字 |
| TC1.6.9 | 评审意见正好500字 | comment = 500 字 | 200，成功 |
| TC1.6.10 | 需求不存在 | 不存在的ID | 404，需求不存在 |
| TC1.6.11 | 未登录 | 未带Token | 401，未登录 |
| TC1.6.12 | 并发冲突 | 乐观锁版本不匹配 | 409，数据已被修改 |
| TC1.6.13 | 审计日志记录 | 评审通过成功 | statusLog记录REVIEW_PASS |
| TC1.6.14 | 评审意见记录 | 评审通过带comment | 审计日志 reviewComment 字段包含评审意见 |
| TC1.6.15 | 评审意见为空 | 评审通过不带comment | 审计日志 reviewComment 为 null |

### 6.2 前端测试案例

| 编号 | 测试场景 | 操作 | 预期结果 |
|------|----------|------|----------|
| TC1.6.F1 | PROJECT_MGR看到评审通过按钮 | 以PROJECT_MGR身份查看待评审需求，isAlreadyApproved=false | 显示"评审通过"按钮 |
| TC1.6.F2 | 已有通过记录时不显示按钮 | 以PROJECT_MGR身份查看待评审需求，isAlreadyApproved=true | 不显示"评审通过"按钮 |
| TC1.6.F3 | BA看不到评审通过按钮 | 以BA身份查看待评审需求 | 不显示"评审通过"按钮 |
| TC1.6.F4 | PM看不到评审通过按钮 | 以PM身份查看待评审需求 | 不显示"评审通过"按钮 |
| TC1.6.F5 | 点击评审通过 | PROJECT_MGR点击按钮并确认 | 弹出成功提示，状态刷新为已就绪 |
| TC1.6.F6 | 评审意见填写 | 填写评审意见后提交 | 成功，评审意见被记录 |
| TC1.6.F7 | 操作历史显示记录 | 评审通过成功后查看详情 | 操作历史显示"评审通过" |
| TC1.6.F8 | 列表页同步刷新 | 评审通过后返回列表 | 需求状态变为已就绪 |

---

## 七、编码顺序

| 步骤 | 内容 | 依赖 | 说明 |
|------|------|------|------|
| 1 | 后端：评审通过 POST 接口 | US1.5（状态变更模式） | 基础API实现 |
| 2 | 后端：PROJECT_MGR 权限校验 | 步骤1 | 唯一可评审角色 |
| 3 | 后端：评审意见长度校验（≤500字） | 步骤1 | 复用 US1.7 校验 |
| 4 | 后端：防重复评审校验 | 步骤1 | 查询 statusLogs |
| 5 | 后端：状态变更事务（状态更新+审计日志） | 步骤1 | 复用 US1.5 审计日志 |
| 6 | 后端：StatusLog 增加 reviewComment 字段 | 步骤5 | 评审意见独立字段 |
| 7 | 后端：需求详情增加 isAlreadyApproved 字段 | 步骤4 | 前端按钮预判 |
| 8 | 后端：单元测试（15条） | 步骤1-7 | TC1.6.1~TC1.6.15 |
| 9 | 前端：评审通过弹窗组件 | US1.4前端 | ReviewPassModal |
| 10 | 前端：handleReviewPass 函数 | 步骤9 | 调用API + 错误处理 |
| 11 | 前端：评审通过按钮显示逻辑 | 步骤7 | 基于 isAlreadyApproved + PROJECT_MGR |
| 12 | 前端：评审通过成功刷新 | 步骤10 | 刷新详情+更新列表 |
| 13 | 前端：集成测试（8条） | 步骤9-12 | TC1.6.F1~TC1.6.F8 |

---

## 八、验收条件

### 8.1 功能验收

- [ ] AC1.6.1: 待评审状态需求，PROJECT_MGR 角色看到"评审通过"按钮
- [ ] AC1.6.2: 已有关评审通过记录时，PROJECT_MGR 不显示"评审通过"按钮
- [ ] AC1.6.3: BA 角色看不到"评审通过"按钮
- [ ] AC1.6.4: PM 角色看不到"评审通过"按钮
- [ ] AC1.6.5: TECH_MGR 角色看不到"评审通过"按钮
- [ ] AC1.6.6: 点击"评审通过"后状态变为"已就绪"
- [ ] AC1.6.7: 评审意见可选填写，保存后可在操作历史查看

### 8.2 技术验收

- [ ] AC1.6.8: 后端校验权限仅允许 PROJECT_MGR
- [ ] AC1.6.9: 防重复评审：已有通过记录的需求不允许再次通过
- [ ] AC1.6.10: 评审意见长度限制 ≤500 字
- [ ] AC1.6.11: 使用乐观锁防止并发冲突
- [ ] AC1.6.12: 状态变更和审计日志在同一事务中
- [ ] AC1.6.13: StatusLog 使用独立 reviewComment 字段存储评审意见
- [ ] AC1.6.14: 需求详情 API 返回 isAlreadyApproved 字段
- [ ] AC1.6.15: 后端测试 15 条全部通过
- [ ] AC1.6.16: 前端测试 8 条全部通过

---

## 九、与其他用户故事的交互

### 9.1 US1.6 → US1.10 需求变更（普通变更）

```
已就绪 → [US1.10 需求变更] → 草稿 → [US1.5 发起评审] → 待评审 → [US1.6 评审通过] → 已就绪
```

### 9.2 US1.6 → US1.11 紧急变更（封板状态）

```
已就绪 → 规划纳版 → 已纳版（封板）→ [US1.11 紧急变更] → 草稿 → [US1.5 发起评审] ...
```

### 9.3 US1.6 → US1.12 开发完成

```
已就绪 → 规划纳版 → 已纳版（开发中）→ [US1.12 开发完成] → 已纳版（SIT测试）
```

### 9.4 权限矩阵总览

| 操作 | BA | PM | PROJECT_MGR | TECH_MGR | TEST_MGR | TRAIN_ADMIN | SUPER_ADMIN |
|------|:--:|:--:|:-----------:|:--------:|:--------:|:-----------:|:-----------:|
| 发起评审 | ✓ | - | - | - | - | ✓ | ✓ |
| 评审通过 | - | - | **✓** | - | - | - | - |
| 评审拒绝 | - | - | **✓** | - | - | - | - |

---

## 十、StatusLog 字段设计

评审通过操作的审计日志字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 主键 |
| requirementId | string | 需求ID |
| operatorId | string | 操作人ID |
| operationType | 'REVIEW_PASS' | 操作类型 |
| fromStatus | 'PENDING_REVIEW' | 变更前状态 |
| toStatus | 'READY' | 变更后状态 |
| reviewComment | string \| null | 评审意见（可选） |
| reason | - | 评审通过不使用 reason 字段 |

> **说明**：reason 字段保留给评审拒绝/取消/变更等必填原因的操作。评审通过使用独立的 reviewComment 字段。

---

*文档编号：RT-T1-US1.6*
*创建时间：2026-05-15*
*更新时间：2026-05-15*
*版本：v1.1（grill 评审后修正）*
*审核状态：待审核*
