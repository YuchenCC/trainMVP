# US1.8 重新编辑 - 详细设计

**版本号**: v1.1
**日期**: 2026-05-15
**设计状态**: 待审核
**来源**: [RT-T1-需求池管理-用户故事_v1.0_20260511.md](./RT-T1-需求池管理-用户故事_v1.0_20260511.md)
**PRD**: [RT-Task1-需求池管理-PRD.md](./RT-Task1-需求池管理-PRD.md) §2.8
**前置依赖**: US1.7（评审拒绝）

### 版本记录

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0 | 2026-05-15 | 初版：根据用户故事文档规划创建 |
| v1.1 | 2026-05-15 | grill 评审后修正：移除 TRAIN_ADMIN/SUPER_ADMIN 权限；同步更新权限矩阵 |

---

## 一、功能概述

| 项目 | 说明 |
|------|------|
| 用户故事编号 | US1.8 |
| 功能描述 | BA 或 PM 将已拒绝的需求重新编辑，需求退回草稿状态后可修改内容 |
| 触发入口 | 需求详情页 → 底部操作按钮 |
| 权限限制 | 业务归属人（BA）、产品经理（PM） |
| 前置条件 | 需求状态必须为"已拒绝" |
| 后置效果 | 状态变更为"草稿"，可编辑修改内容 |

---

## 二、API 设计

### 2.1 接口定义

**POST /api/requirements/:id/re-edit**

| 项目 | 说明 |
|------|------|
| 功能 | 将已拒绝需求重新编辑，状态退回草稿 |
| 权限 | BA（归属人）、PM（产品经理） |

### 2.2 请求参数

```typescript
// 路径参数
interface ReEditParams {
  id: string; // 需求ID
}

// 请求体（无额外参数）
interface ReEditBody {
  // 无需额外参数
}
```

### 2.3 响应体

```typescript
interface ReEditResponse {
  success: true;
  data: {
    id: string;
    reqCode: string;
    status: 'DRAFT';
    updatedAt: string;
    statusLog: StatusLogInfo;
  };
}
```

### 2.4 错误码

> **规范**：所有响应统一返回 HTTP 200，通过 `success: false` + `code` 区分错误类型。

| code | message | 说明 |
|------|---------|------|
| REQUIREMENT_NOT_REJECTED | 仅已拒绝状态可重新编辑 | 状态校验失败 |
| REQUIREMENT_PERMISSION_DENIED | 无重新编辑权限 | 无重新编辑权限 |
| REQUIREMENT_NOT_FOUND | 需求不存在 | 需求不存在 |
| REQUIREMENT_VERSION_CONFLICT | 需求已被其他人修改，请刷新后重试 | 乐观锁冲突 |
| UNAUTHORIZED | 未登录或登录已过期 | 未登录 |

---

## 三、业务规则

### BR1.8.1 前置条件校验

```typescript
async function reEdit(id: string, user: User) {
  // 1. 校验需求存在且状态为已拒绝
  const requirement = await prisma.requirement.findUnique({
    where: { id },
    select: { status: true, version: true, baId: true, pmId: true },
  });

  if (!requirement) {
    throw new NotFoundError('需求不存在');
  }

  if (requirement.status !== 'REJECTED') {
    throw errors.requirementNotRejected('仅已拒绝状态可重新编辑');
  }

  // 2. 校验权限：仅 BA（归属人）或 PM 可重新编辑
  const isBA = user.role === Role.BA;
  const isPM = user.role === Role.PM;

  if (!isBA && !isPM) {
    throw errors.requirementPermissionDenied('您没有重新编辑的权限');
  }

  // 3. 执行重新编辑
  return changeStatusToDraft(id, user);
}
```

### BR1.8.2 状态变更与审计日志

```typescript
async function changeStatusToDraft(id: string, user: User) {
  return prisma.$transaction(async (tx) => {
    // 1. 获取当前需求（含乐观锁版本）
    const requirement = await tx.requirement.findUnique({
      where: { id },
      select: { version: true, reqCode: true },
    });

    // 2. 更新状态为草稿
    const updated = await tx.requirement.update({
      where: { id, version: requirement!.version },
      data: {
        status: 'DRAFT',
        version: { increment: 1 },
      },
    });

    // 3. 记录审计日志
    await tx.statusLog.create({
      data: {
        requirementId: id,
        operatorId: user.id,
        operationType: 'RE_EDIT',
        fromStatus: 'REJECTED',
        toStatus: 'DRAFT',
      },
    });

    return updated;
  });
}
```

### BR1.8.3 前端重新编辑流程

```typescript
async function handleReEdit(id: string) {
  try {
    const res = await api.post(`/api/requirements/${id}/re-edit`);
    message.success('需求已重新编辑');
    onRefresh();
    navigate(`/requirements/${id}/edit`);
    return res.data;
  } catch (error: any) {
    if (error.code === 'REQUIREMENT_NOT_REJECTED') {
      message.error('需求已不在已拒绝状态');
      onRefresh();
    } else if (error.code === 'REQUIREMENT_PERMISSION_DENIED') {
      message.error('您没有重新编辑的权限');
    } else {
      message.error('重新编辑操作失败');
    }
    throw error;
  }
}
```

---

## 四、前端实现

### 4.1 操作按钮显示逻辑（已拒绝状态）

```typescript
// 重新编辑按钮显示条件：
// 1. 当前用户角色为 BA 或 PM
// 2. 需求状态为已拒绝（REJECTED）
function canShowReEditButton(user: User, requirement: RequirementDetail): boolean {
  return (
    (user.role === Role.BA || user.role === Role.PM) &&
    requirement.status === 'REJECTED'
  );
}
```

### 4.2 操作按钮矩阵（已拒绝状态）

| 角色 | 可用按钮 | 说明 |
|------|----------|------|
| BA | 重新编辑、取消 | BA 可重新编辑 |
| PM | 重新编辑 | 任意 PM 可重新编辑 |
| PROJECT_MGR | - | 无权限 |
| TECH_MGR | - | 无权限 |
| TEST_MGR | - | 无权限 |
| TRAIN_ADMIN | - | 无权限 |
| SUPER_ADMIN | - | 无权限 |

### 4.3 重新编辑按钮

```typescript
function ReEditButton({ requirement, currentUser, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  const canReEdit = checkCanReEdit(requirement, currentUser);

  if (!canReEdit) return null;

  const handleClick = async () => {
    setLoading(true);
    try {
      await handleReEdit(requirement.id);
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="primary"
      loading={loading}
      onClick={handleClick}
    >
      重新编辑
    </Button>
  );
}

function checkCanReEdit(requirement: Requirement, user: User): boolean {
  const { status } = requirement;

  if (status !== 'REJECTED') return false;

  const isBA = user.role === Role.BA;
  const isPM = user.role === Role.PM;

  return isBA || isPM;
}
```

### 4.4 重新编辑成功后跳转编辑页

```typescript
function RequirementDetailPage({ id }: Props) {
  const navigate = useNavigate();

  const handleReEditSuccess = () => {
    navigate(`/requirements/${id}/edit`);
  };

  return (
    <div className="requirement-detail-page">
      <ActionFooter
        requirement={data}
        currentUser={user}
        onRefresh={fetchData}
        onReEditSuccess={handleReEditSuccess}
      />
    </div>
  );
}
```

---

## 五、页面交互

### 5.1 重新编辑交互流程

```
┌─────────────────────────────────────────────────────────────────┐
│ 需求详情页 - 已拒绝状态                                              │
│                                                                  │
│ 需求编号：REQ-UC-2026-0001                                        │
│ 需求标题：用户登录优化                                              │
│ 状态：[已拒绝]                                                    │
│                                                                  │
│ 操作历史：                                                         │
│ · 2026-05-15 10:00 张三 评审拒绝 - 需求描述不够详细               │
│ · 2026-05-14 14:00 李四 发起评审                                 │
│ · 2026-05-14 09:00 张三 创建需求                                 │
│                                                                  │
│ 底部操作栏：                                                       │
│ [重新编辑] [取消]                                                  │
│                                                                  │
│ 点击"重新编辑"                                                     │
│         │                                                         │
│         ▼                                                         │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ ✅ 需求已重新编辑                                                 ││
│ │                                                                  ││
│ │ 需求已进入"草稿"状态，可以编辑后再次发起评审                          ││
│ │                                                                  ││
│ │                              [查看详情] [去编辑] [返回列表]         ││
│ └─────────────────────────────────────────────────────────────────┘│
│         │                                                         │
│         │ (点击"去编辑")                                            │
│         ▼                                                         │
│ ┌─────────────────────────────────────────────────────────────────┐│
│ │ 需求编辑页                                                        ││
│ │ (复用 US1.1 录入表单，预填当前数据)                                  ││
│ │                                                                  ││
│ │ 标题：用户登录优化                                                ││
│ │ 需求描述：...                                                     ││
│ │ ...                                                              ││
│ │                                                                  ││
│ │                                          [取消]  [保存]            ││
│ └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

---

## 六、测试案例

### 6.1 后端测试案例

| 编号 | 测试场景 | 输入 | 预期结果 |
|------|----------|------|----------|
| TC1.8.1 | BA正常重新编辑 | 已拒绝需求，BA用户（归属人）调用 | 200，状态变为DRAFT |
| TC1.8.2 | PM重新编辑 | 已拒绝需求，PM用户调用（任意PM） | 200，状态变为DRAFT |
| TC1.8.3 | PROJECT_MGR不能重新编辑 | 已拒绝需求，PMGR用户调用 | 403，无重新编辑权限 |
| TC1.8.4 | TECH_MGR不能重新编辑 | 已拒绝需求，TMGR用户调用 | 403，无重新编辑权限 |
| TC1.8.5 | TEST_MGR不能重新编辑 | 已拒绝需求，TEST_MGR用户调用 | 403，无重新编辑权限 |
| TC1.8.6 | TRAIN_ADMIN不能重新编辑 | 已拒绝需求，TA用户调用 | 403，无重新编辑权限 |
| TC1.8.7 | SUPER_ADMIN不能重新编辑 | 已拒绝需求，SA用户调用 | 403，无重新编辑权限 |
| TC1.8.8 | 非已拒绝状态 | 草稿需求调用 | 400，需求已不在已拒绝状态 |
| TC1.8.9 | 待评审状态 | 待评审需求调用 | 400，需求已不在已拒绝状态 |
| TC1.8.10 | 需求不存在 | 不存在的ID | 404，需求不存在 |
| TC1.8.11 | 未登录 | 未带Token | 401，未登录 |
| TC1.8.12 | 并发冲突 | 乐观锁版本不匹配 | 409，数据已被修改 |
| TC1.8.13 | 审计日志记录 | 重新编辑成功 | statusLog记录RE_EDIT |

### 6.2 前端测试案例

| 编号 | 测试场景 | 操作 | 预期结果 |
|------|----------|------|----------|
| TC1.8.F1 | BA看到重新编辑按钮 | 以BA身份查看已拒绝需求 | 显示"重新编辑"按钮 |
| TC1.8.F2 | PM显示重新编辑按钮 | 以PM身份查看已拒绝需求 | 显示"重新编辑"按钮 |
| TC1.8.F3 | PROJECT_MGR不显示重新编辑按钮 | 以PMGR身份查看已拒绝需求 | 不显示"重新编辑"按钮 |
| TC1.8.F4 | TECH_MGR不显示重新编辑按钮 | 以TMGR身份查看已拒绝需求 | 不显示"重新编辑"按钮 |
| TC1.8.F5 | 点击重新编辑 | 点击按钮 | 弹出成功提示，状态变为草稿 |
| TC1.8.F6 | 重新编辑后跳编辑页 | 点击重新编辑成功 | 自动跳转到编辑页面 |
| TC1.8.F7 | 编辑页预填数据 | 进入编辑页面 | 表单预填当前需求数据 |
| TC1.8.F8 | 操作历史显示记录 | 重新编辑后查看详情 | 操作历史显示"重新编辑" |
| TC1.8.F9 | 列表页同步刷新 | 重新编辑后返回列表 | 需求状态变为草稿 |

---

## 七、编码顺序

| 步骤 | 内容 | 依赖 | 说明 |
|------|------|------|------|
| 1 | 后端：POST /api/requirements/:id/re-edit 接口 | US1.7（评审拒绝模式） | 基础API实现 |
| 2 | 后端：权限校验（BA/PM） | 步骤1 | 仅 BA 和 PM 可操作 |
| 3 | 后端：状态变更事务（状态更新+审计日志） | 步骤1 | 复用审计日志 |
| 4 | 后端：单元测试（13条） | 步骤1-3 | TC1.8.1~TC1.8.13 |
| 5 | 前端：重新编辑按钮组件 | US1.7前端 | ReEditButton |
| 6 | 前端：handleReEdit 函数 | 步骤5 | 调用API + 成功跳转 |
| 7 | 前端：重新编辑成功跳转编辑页 | 步骤6 | navigate到edit页 |
| 8 | 前端：集成测试（9条） | 步骤5-7 | TC1.8.F1~TC1.8.F9 |

---

## 八、验收条件

### 8.1 功能验收

- [ ] AC1.8.1: 已拒绝状态需求，BA 角色看到"重新编辑"按钮
- [ ] AC1.8.2: 已拒绝状态需求，PM 角色看到"重新编辑"按钮
- [ ] AC1.8.3: PROJECT_MGR/TECH_MGR/TEST_MGR/TRAIN_ADMIN/SUPER_ADMIN 角色看不到"重新编辑"按钮
- [ ] AC1.8.4: 点击后状态变为"草稿"，自动进入编辑页面
- [ ] AC1.8.5: 编辑页面预填当前需求数据
- [ ] AC1.8.6: 修改后可重新发起评审（草稿→待评审）
- [ ] AC1.8.7: 操作历史记录"重新编辑"条目

### 8.2 技术验收

- [ ] AC1.8.8: 后端校验权限仅允许 BA 和 PM
- [ ] AC1.8.9: 前置条件：状态必须为已拒绝
- [ ] AC1.8.10: 使用乐观锁防止并发冲突
- [ ] AC1.8.11: 状态变更和审计日志在同一事务中
- [ ] AC1.8.12: 后端测试 13 条全部通过
- [ ] AC1.8.13: 前端测试 9 条全部通过

---

## 九、与其他用户故事的交互

### 9.1 完整评审流程

```
草稿 ──[US1.5 发起评审]──> 待评审 ──[US1.6 评审通过]──> 已就绪
                              │
                              └──[US1.7 评审拒绝]──> 已拒绝
                                                        │
                              [US1.8 重新编辑] ──────────┘
                                      │
                                      ▼
                                    草稿
```

### 9.2 状态流转图

```
┌─────────────────────────────────────────────────────────────────┐
│                        评审流程状态机                              │
│                                                                  │
│     ┌──────┐                                                     │
│     │ 草稿 │◄─────────────────────────────────────┐              │
│     └──┬───┘                                      │              │
│        │ US1.5 发起评审                            │ US1.8       │
│        ▼                                            │ 重新编辑    │
│  ┌───────────┐                                      │              │
│  │ 待评审    │────US1.6 评审通过────► ┌────────┐    │              │
│  └─────┬─────┘                       │ 已就绪 │────┘              │
│        │                             └───┬────┘                  │
│        │ US1.7 评审拒绝                  │                       │
│        ▼                               │                       │
│   ┌────────┐                          ▼                       │
│   │ 已拒绝 │◄───────────────────── US1.10 需求变更               │
│   └────────┘                          │                       │
│                                        │ (已纳版)              │
│                                        ▼                       │
│                              ┌──────────────┐                  │
│                              │ 已纳版(开发中)│                  │
│                              └──────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

### 9.3 权限矩阵总览

| 操作 | BA | PM | PROJECT_MGR | TECH_MGR | TEST_MGR | TRAIN_ADMIN | SUPER_ADMIN |
|------|:--:|:--:|:-----------:|:--------:|:--------:|:-----------:|:-----------:|
| 发起评审 | ✓ | - | - | - | - | ✓ | ✓ |
| 评审通过 | - | - | **✓** | - | - | - | - |
| 评审拒绝 | - | - | **✓** | - | - | - | - |
| 重新编辑 | ✓ | ✓ | - | - | - | - | - |
| 取消 | ✓ | - | - | - | - | ✓ | ✓ |

---

*文档编号：RT-T1-US1.8*
*创建时间：2026-05-15*
*更新时间：2026-05-15*
*版本：v1.1（grill 评审后修正）*
*审核状态：待审核*
