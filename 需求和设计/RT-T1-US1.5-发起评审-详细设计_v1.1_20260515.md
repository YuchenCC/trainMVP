# US1.5 发起评审 - 详细设计

**版本号**: v1.0
**日期**: 2026-05-15
**设计状态**: 待审核
**来源**: [RT-T1-需求池管理-用户故事_v1.0_20260511.md](./RT-T1-需求池管理-用户故事_v1.0_20260511.md)
**PRD**: [RT-Task1-需求池管理-PRD.md](./RT-Task1-需求池管理-PRD.md) §2.5
**前置依赖**: US1.1（需求录入）、US1.3（列表入口）、US1.4（详情查看）

### 版本记录

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0 | 2026-05-15 | 初版：根据用户故事文档规划创建 |
| v1.1 | 2026-05-15 | Grill审核10项修正：错误码对齐HTTP200规范+errors工厂函数、BA归属人校验、标题校验1-200字符、fromStatus从实际读取、去掉ValidationErrorList组件、修正AC1.5.12措辞、测试案例14条+HTTP状态码更新、简化交互流程图 |

---

## 一、功能概述

| 项目 | 说明 |
|------|------|
| 用户故事编号 | US1.5 |
| 功能描述 | 业务 BA 将草稿状态的需求发起评审，进入评审流程 |
| 触发入口 | 需求列表页 → 操作按钮 / 需求详情页 → 底部操作按钮 |
| 权限限制 | 业务归属人（BA）、火车管理员、超级管理员 |
| 前置条件 | 需求状态必须为"草稿" |
| 后置效果 | 状态变更为"待评审"，需求不可编辑 |

---

## 二、API 设计

### 2.1 接口定义

**POST /api/requirements/:id/submit-review**

| 项目 | 说明 |
|------|------|
| 功能 | 将草稿状态需求发起评审 |
| 权限 | BA（归属人）、火车管理员、超级管理员 |

### 2.2 请求参数

```typescript
// 路径参数
interface SubmitReviewParams {
  id: string; // 需求ID
}

// 请求体（可选）
interface SubmitReviewBody {
  // 无需额外参数，发起评审不需填写原因
}
```

### 2.3 响应体

```typescript
interface SubmitReviewResponse {
  success: true;
  data: {
    id: string;
    reqCode: string;
    status: 'PENDING_REVIEW';
    updatedAt: string;
    statusLog: StatusLogInfo;
  };
}
```

### 2.4 错误码

> **规范**：所有响应统一返回 HTTP 200，通过 `success: false` + `code` 区分错误类型。

| code | message | 说明 |
|------|---------|------|
| BAD_REQUEST | 标题不能为空 | 必填字段校验失败 |
| BAD_REQUEST | 需求描述不能为空 | 必填字段校验失败 |
| BAD_REQUEST | 归属系统不能为空 | 必填字段校验失败 |
| BAD_REQUEST | 优先级不能为空 | 必填字段校验失败 |
| BAD_REQUEST | 工作量点数必须为 1-100 的正整数 | 必填字段校验失败 |
| BAD_REQUEST | 业务归属人不能为空 | 必填字段校验失败 |
| REQUIREMENT_NOT_DRAFT | 仅草稿状态可发起评审 | 状态校验失败 |
| REQUIREMENT_PERMISSION_DENIED | 无发起评审权限 | 无发起评审权限 |
| REQUIREMENT_NOT_FOUND | 需求不存在 | 需求不存在 |
| REQUIREMENT_VERSION_CONFLICT | 需求已被其他人修改，请刷新后重试 | 乐观锁冲突 |
| UNAUTHORIZED | 未登录或登录已过期 | 未登录 |

### 2.5 必填字段校验清单

| 字段 | 校验规则 | 错误提示 |
|------|----------|----------|
| title | 非空，1-200 字符 | 标题不能为空或标题长度需在 1-200 字符 |
| description | 非空，非纯空白 | 需求描述不能为空 |
| systemId | 非空 | 归属系统不能为空 |
| priority | 非空，P0/P1/P2/P3 | 优先级不能为空 |
| storyPoints | 非空，1-100 正整数 | 工作量点数不能为空且需为 1-100 |
| baId | 非空 | 业务归属人不能为空 |

---

## 三、业务规则

### BR1.5.1 前置条件校验

```typescript
// 后端校验逻辑
async function submitReview(id: string, user: User) {
  // 1. 校验需求存在且状态为草稿
  const requirement = await prisma.requirement.findUnique({
    where: { id },
    select: { status: true, statusLogs: true },
  });

  if (!requirement) {
    throw errors.requirementNotFound('需求不存在');
  }

  if (requirement.status !== 'DRAFT') {
    throw errors.requirementNotDraft('仅草稿状态可发起评审');
  }

  // 2. 校验权限：BA必须是归属人，TA/SA不限
  const isBA = user.role === Role.BA && user.id === requirement.baId;
  const isTrainAdmin = user.role === Role.TRAIN_ADMIN;
  const isSuperAdmin = user.role === Role.SUPER_ADMIN;

  if (!isBA && !isTrainAdmin && !isSuperAdmin) {
    throw errors.requirementPermissionDenied('您没有发起评审的权限');
  }

  // 3. 校验必填字段
  const fullRequirement = await prisma.requirement.findUnique({
    where: { id },
  });

  validateRequiredFields(fullRequirement); // 校验失败直接抛 BAD_REQUEST

  // 4. 发起评审
  return changeStatus(id, 'PENDING_REVIEW', user);
}
```

### BR1.5.2 必填字段校验函数

```typescript
/**
 * 必填字段校验：发起评审前校验需求字段完整性
 * @throws AppError 200 - 校验失败时抛出 BAD_REQUEST（业务错误）
 */
function validateRequiredFields(requirement: Requirement): void {
  // 标题校验
  if (!requirement.title || requirement.title.trim().length < 1) {
    throw errors.badRequest('标题不能为空');
  }
  if (requirement.title.length > 200) {
    throw errors.badRequest('标题长度不能超过 200 字符');
  }

  // 描述校验（非纯空白）
  if (!requirement.description || requirement.description.trim().length === 0) {
    throw errors.badRequest('需求描述不能为空');
  }

  // 归属系统
  if (!requirement.systemId) {
    throw errors.badRequest('归属系统不能为空');
  }

  // 优先级
  if (!requirement.priority) {
    throw errors.badRequest('优先级不能为空');
  }

  // 工作量点数
  if (!requirement.storyPoints || requirement.storyPoints < 1 || requirement.storyPoints > 100) {
    throw errors.badRequest('工作量点数必须为 1-100 的正整数');
  }

  // 业务归属人
  if (!requirement.baId) {
    throw errors.badRequest('业务归属人不能为空');
  }
}
```

### BR1.5.3 状态变更与审计日志

```typescript
async function changeStatus(id: string, newStatus: ReqStatus, user: User) {
  // 使用事务保证原子性
  return prisma.$transaction(async (tx) => {
    // 1. 获取当前需求（含乐观锁版本）
    const requirement = await tx.requirement.findUnique({
      where: { id },
      select: { version: true, reqCode: true, status: true },
    });

    // 2. 更新状态
    const updated = await tx.requirement.update({
      where: { id, version: requirement!.version },
      data: {
        status: newStatus,
        version: { increment: 1 },
      },
    });

    // 3. 记录审计日志（fromStatus 从实际数据读取）
    await tx.statusLog.create({
      data: {
        requirementId: id,
        operatorId: user.id,
        operationType: 'SUBMIT_REVIEW',
        fromStatus: requirement!.status,
        toStatus: newStatus,
      },
    });

    return updated;
  });
}
```

### BR1.5.4 前端发起评审流程

```typescript
// 前端发起评审函数
async function handleSubmitReview(requirementId: string) {
  try {
    const res = await api.post(`/api/requirements/${requirementId}/submit-review`);
    message.success('评审已提交');
    // 刷新详情页
    onRefresh();
    // 更新列表中该需求的状态
    updateRequirementInList(requirementId, { status: 'PENDING_REVIEW' });
    return res.data;
  } catch (error: any) {
    if (error.code === 'BAD_REQUEST') {
      // 显示具体校验错误
      message.error(`无法发起评审：${error.message}`);
    } else if (error.code === 'REQUIREMENT_PERMISSION_DENIED') {
      message.error('您没有发起评审的权限');
    } else {
      message.error('发起评审失败');
    }
    throw error;
  }
}
```

---

## 四、前端实现

### 4.1 列表页操作按钮

复用 US1.3 的操作按钮矩阵：

```typescript
// US1.3 按钮矩阵中草稿状态的按钮
// BA: 编辑、发起评审、取消
// PM: 编辑
// TRAIN_ADMIN: 取消
// SUPER_ADMIN: 编辑、发起评审、取消

const draftButtons: Record<Role, ActionButton[]> = {
  [Role.BA]: [
    { key: 'edit', label: '编辑', type: 'default' },
    { key: 'submitReview', label: '发起评审', type: 'primary' },
    { key: 'cancel', label: '取消', type: 'default' },
  ],
  [Role.PM]: [
    { key: 'edit', label: '编辑', type: 'default' },
  ],
  [Role.PROJECT_MGR]: [],
  [Role.TECH_MGR]: [],
  [Role.TEST_MGR]: [],
  [Role.TRAIN_ADMIN]: [
    { key: 'cancel', label: '取消', type: 'default' },
  ],
  [Role.SUPER_ADMIN]: [
    { key: 'edit', label: '编辑', type: 'default' },
    { key: 'submitReview', label: '发起评审', type: 'primary' },
    { key: 'cancel', label: '取消', type: 'default' },
  ],
};
```

### 4.2 详情页底部操作按钮

```typescript
// 详情页操作按钮
function DetailActionButtons({ requirement, currentUser, onRefresh }: Props) {
  const { status, id } = requirement;
  const buttons = getActionButtons(requirement, currentUser);

  const submitReviewBtn = buttons.find(b => b.key === 'submitReview');

  if (!submitReviewBtn) return null;

  return (
    <Space>
      <Button
        type="primary"
        onClick={async () => {
          try {
            await handleSubmitReview(id);
          } catch (e) {
            // 错误已由 handleSubmitReview 处理
          }
        }}
      >
        {submitReviewBtn.label}
      </Button>
      {/* 其他按钮... */}
    </Space>
  );
}
```

---

## 五、页面交互

### 5.1 发起评审交互流程

```
┌─────────────────────────────────────────────────────────────────┐
│ 需求列表页                                                        │
│ ┌────────┬──────────┬──────┬─────┬────────┬───────────────────┐│
│ │ □     │ REQ-...  │ 草稿 │ P1  │  5    │ [编辑][发起评审][取消]││
│ └────────┴──────────┴──────┴─────┴────────┴───────────────────┘│
│                                                                  │
│ 点击"发起评审"                                                     │
│         │                                                         │
│         ▼                                                         │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ 发起评审确认                                                     ││
│ │                                                                  ││
│ │ REQ-UC-2026-0001 用户登录优化                                    ││
│ │                                                                  ││
│ │ 确认发起评审？发起后需求将进入评审流程，不可再编辑                    ││
│ │                                                                  ││
│ │                                          [取消]  [确认发起评审]    ││
│ └─────────────────────────────────────────────────────────────────┘│
│         │                                                         │
│         ▼                                                         │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ ✅ 评审已提交                                                    ││
│ │                                                                  ││
│ │ 需求已进入评审流程，等待产品经理/项目经理/技术经理评审               ││
│ │                                          [查看详情] [返回列表]     ││
│ └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 校验失败提示

```
┌─────────────────────────────────────────────────────────────────┐
│ 点击"确认发起评审"后，后端校验失败                                    │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐││
│ │ ❌ 无法发起评审：需求描述不能为空                               │││
│ └─────────────────────────────────────────────────────────────┘││
│                                                                  │
│ （顶部 message.error 提示，3秒后自动消失）                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 六、测试案例

### 6.1 后端测试案例

| 编号 | 测试场景 | 输入 | 预期结果 |
|------|----------|------|----------|
| TC1.5.1 | 正常发起评审 | 草稿需求，BA用户调用 | 200, success:true, 状态变为PENDING_REVIEW |
| TC1.5.2 | 火车管理员发起评审 | 草稿需求，TRAIN_ADMIN用户调用 | 200, success:true, 状态变为PENDING_REVIEW |
| TC1.5.3 | 超级管理员发起评审 | 草稿需求，SUPER_ADMIN用户调用 | 200, success:true, 状态变为PENDING_REVIEW |
| TC1.5.4 | PM不能发起评审 | 草稿需求，PM用户调用 | 200, success:false, code=REQUIREMENT_PERMISSION_DENIED |
| TC1.5.5 | 技术经理不能发起评审 | 草稿需求，TECH_MGR用户调用 | 200, success:false, code=REQUIREMENT_PERMISSION_DENIED |
| TC1.5.6 | 非归属人BA不能发起评审 | 草稿需求，非归属人的BA用户调用 | 200, success:false, code=REQUIREMENT_PERMISSION_DENIED |
| TC1.5.7 | 标题缺失 | 标题为空的草稿需求 | 200, success:false, code=BAD_REQUEST |
| TC1.5.8 | 描述缺失 | 描述为空的草稿需求 | 200, success:false, code=BAD_REQUEST |
| TC1.5.9 | 非草稿状态 | 待评审需求调用 | 200, success:false, code=REQUIREMENT_NOT_DRAFT |
| TC1.5.10 | 需求不存在 | 不存在的ID | 200, success:false, code=REQUIREMENT_NOT_FOUND |
| TC1.5.11 | 未登录 | 未带Token | 200, success:false, code=UNAUTHORIZED |
| TC1.5.12 | 并发冲突 | 乐观锁版本不匹配 | 200, success:false, code=REQUIREMENT_VERSION_CONFLICT |
| TC1.5.13 | 审计日志记录 | 发起评审成功 | statusLog记录SUBMIT_REVIEW |
| TC1.5.14 | 重复发起评审 | 草稿→待评审→草稿(重新编辑)→待评审 | 每次都成功 |

### 6.2 前端测试案例

| 编号 | 测试场景 | 操作 | 预期结果 |
|------|----------|------|----------|
| TC1.5.F1 | 草稿需求显示发起评审按钮 | 进入草稿需求详情页 | 显示"发起评审"按钮 |
| TC1.5.F2 | 待评审需求不显示发起评审按钮 | 进入待评审需求详情页 | 不显示"发起评审"按钮 |
| TC1.5.F3 | PM看不到发起评审按钮 | 以PM角色查看草稿需求 | 不显示"发起评审"按钮 |
| TC1.5.F4 | 点击发起评审成功 | 点击按钮并确认 | 弹出成功提示，状态刷新为待评审 |
| TC1.5.F5 | 点击发起评审后刷新列表 | 发起评审后返回列表 | 需求状态变为待评审 |
| TC1.5.F6 | 校验失败显示提示 | 字段缺失时点击发起评审 | 显示缺失字段列表 |
| TC1.5.F7 | 去完善按钮跳转编辑页 | 校验失败时点击"去完善" | 跳转到编辑页面 |
| TC1.5.F8 | 发起评审后按钮消失 | 发起评审成功后 | 编辑/发起评审按钮消失，仅保留查看 |
| TC1.5.F9 | 操作历史显示记录 | 发起评审成功后查看详情 | 操作历史显示"发起评审"记录 |
| TC1.5.F10 | 列表页操作列按钮 | 查看草稿需求列表 | BA看到发起评审按钮 |
| TC1.5.F11 | 列表页批量发起评审 | US1.17中验证 | - |

---

## 七、编码顺序

| 步骤 | 内容 | 依赖 | 说明 |
|------|------|------|------|
| 1 | 后端：POST /api/requirements/:id/submit-review 接口 | US1.1（数据模型） | 基础API实现 |
| 2 | 后端：必填字段校验函数 validateRequiredFields | 步骤1 | 复用US1.1校验逻辑 |
| 3 | 后端：权限校验（BA/TRAIN_ADMIN/SUPER_ADMIN） | 步骤1 | 复用角色枚举 |
| 4 | 后端：状态变更事务（状态更新+审计日志） | 步骤1 | 复用US1.4审计日志 |
| 5 | 后端：单元测试（14条） | 步骤1-4 | TC1.5.1~TC1.5.14 |
| 6 | 前端：列表页操作按钮（草稿状态） | US1.3前端 | 复用按钮矩阵 |
| 7 | 前端：详情页底部操作按钮 | US1.4前端 | 复用详情页 |
| 8 | 前端：handleSubmitReview 函数 | 步骤6-7 | 调用API + 错误处理 |
| 9 | 前端：发起评审确认弹窗 | 步骤8 | 确认对话框 |
| 11 | 前端：成功提示和页面刷新 | 步骤8 | 刷新详情+更新列表 |
| 12 | 前端：集成测试（11条） | 步骤6-11 | TC1.5.F1~TC1.5.F11 |

---

## 八、验收条件

### 8.1 功能验收

- [ ] AC1.5.1: 草稿状态需求，BA 角色在列表页和详情页看到"发起评审"按钮
- [ ] AC1.5.2: PM 角色看不到"发起评审"按钮
- [ ] AC1.5.3: 点击"发起评审"，校验必填字段完整后状态变为"待评审"
- [ ] AC1.5.4: 必填字段缺失时，提示具体缺失字段列表
- [ ] AC1.5.5: 非草稿状态需求不显示"发起评审"按钮
- [ ] AC1.5.6: 发起评审成功后，页面刷新状态，按钮变为"查看"/"取消"
- [ ] AC1.5.7: 操作历史记录"发起评审"条目，包含操作人和时间

### 8.2 技术验收

- [ ] AC1.5.8: 后端校验所有必填字段（title/description/systemId/priority/storyPoints/baId）
- [ ] AC1.5.9: 权限校验仅允许 BA/TRAIN_ADMIN/SUPER_ADMIN
- [ ] AC1.5.10: 使用乐观锁防止并发冲突
- [ ] AC1.5.11: 状态变更和审计日志在同一事务中
- [ ] AC1.5.12: 发起评审后需求不可编辑（无编辑入口）
- [ ] AC1.5.13: 后端测试 14 条全部通过
- [ ] AC1.5.14: 前端测试 11 条全部通过

---

## 九、与其他用户故事的交互

### 9.1 US1.5 → US1.6 评审通过

```
草稿 → [US1.5 发起评审] → 待评审 → [US1.6 评审通过] → 已就绪
```

### 9.2 US1.5 → US1.7 评审拒绝

```
草稿 → [US1.5 发起评审] → 待评审 → [US1.7 评审拒绝] → 已拒绝
                                              ↓
                                        [US1.8 重新编辑] → 草稿
```

### 9.3 权限矩阵回顾

| 操作 | BA | PM | PROJECT_MGR | TECH_MGR | TEST_MGR | TRAIN_ADMIN | SUPER_ADMIN |
|------|:--:|:--:|:-----------:|:--------:|:--------:|:-----------:|:-----------:|
| 发起评审 | ✓ | - | - | - | - | ✓ | ✓ |
| 评审通过 | - | ✓ | ✓ | ✓ | - | ✓ | ✓ |
| 评审拒绝 | - | ✓ | ✓ | ✓ | - | ✓ | ✓ |

---

*文档编号：RT-T1-US1.5*
*创建时间：2026-05-15*
*审核状态：待审核*
