# US1.10 子状态变更 - 详细设计

**版本号**: v1.0
**日期**: 2026-05-15
**设计状态**: 待审核
**来源**: [RT-T1-需求池管理-用户故事_v1.0_20260511.md](./RT-T1-需求池管理-用户故事_v1.0_20260511.md)
**PRD**: [RT-Task1-需求池管理-PRD.md](./RT-Task1-需求池管理-PRD.md) §2.10
**前置依赖**: US1.6（评审通过）

### 版本记录

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0 | 2026-05-15 | 初版：合并原US1.12/1.13/1.14为单一子状态变更功能 |

---

## 一、功能概述

| 项目 | 说明 |
|------|------|
| 用户故事编号 | US1.10 |
| 功能描述 | 项目经理/技术经理/测试经理变更已纳版需求的子状态（推进或回退）；封板状态仅火车管理员可操作且不可变更 |
| 触发入口 | 已纳版需求详情页 → 子状态选择区域 |
| 权限限制 | PROJECT_MGR/TECH_MGR/TEST_MGR（非封板）；TRAIN_ADMIN（封板状态） |
| 前置条件 | 需求主状态为"已纳版"，子状态不为"封板" |
| 后置效果 | 子状态变更为目标状态，记录审计日志 |

### 子状态选项

| 值 | 说明 |
|------|------|
| DEV_IN_PROGRESS | 开发中 |
| SIT_TEST | SIT测试 |
| UAT_TEST | UAT测试 |
| SEALED | 封板（终态，不可变更） |

---

## 二、API 设计

### 2.1 接口定义

**POST /api/requirements/:id/change-sub-status**

| 项目 | 说明 |
|------|------|
| 功能 | 变更已纳版需求的子状态 |
| 权限 | PROJECT_MGR / TECH_MGR / TEST_MGR（非封板）；TRAIN_ADMIN（封板状态） |

### 2.2 请求参数

```typescript
// 路径参数
interface ChangeSubStatusParams {
  id: string; // 需求ID
}

// 请求体
interface ChangeSubStatusBody {
  subStatus: 'DEV_IN_PROGRESS' | 'SIT_TEST' | 'UAT_TEST' | 'SEALED'; // 目标子状态
  comment?: string; // 变更说明，可选，最多 500 字
}
```

### 2.3 响应体

```typescript
interface ChangeSubStatusResponse {
  success: true;
  data: {
    id: string;
    reqCode: string;
    status: 'IN_TRAIN'; // 主状态不变
    subStatus: string; // 新的子状态
    updatedAt: string;
    statusLog: StatusLogInfo;
  };
}
```

### 2.4 错误码

> **规范**：所有响应统一返回 HTTP 200，通过 `success: false` + `code` 区分错误类型。

| code | message | 说明 |
|------|---------|------|
| BAD_REQUEST | 变更说明最多 500 字 | 变更说明超长 |
| REQUIREMENT_NOT_IN_TRAIN | 仅已纳版需求可变更子状态 | 主状态校验失败 |
| SUB_STATUS_CANNOT_CHANGE | 封板状态不可变更 | 封板状态校验失败 |
| SUB_STATUS_SAME_AS_CURRENT | 不能选择当前状态 | 新子状态等于当前 |
| SUB_STATUS_INVALID | 无效的子状态值 | 子状态值校验失败 |
| REQUIREMENT_PERMISSION_DENIED | 无变更子状态的权限 | 权限校验失败 |
| REQUIREMENT_NOT_FOUND | 需求不存在 | 需求不存在 |
| REQUIREMENT_VERSION_CONFLICT | 需求已被其他人修改，请刷新后重试 | 乐观锁冲突 |
| UNAUTHORIZED | 未登录或登录已过期 | 未登录 |

---

## 三、业务规则

### BR1.10.1 前置条件校验

```typescript
async function changeSubStatus(id: string, user: User, subStatus: string, comment?: string) {
  // 1. 校验需求存在
  const requirement = await prisma.requirement.findUnique({
    where: { id },
    select: { status: true, subStatus: true, version: true },
  });

  if (!requirement) {
    throw errors.requirementNotFound('需求不存在');
  }

  // 2. 校验主状态必须为已纳版
  if (requirement.status !== 'IN_TRAIN') {
    throw errors.requirementNotInTrain('仅已纳版需求可变更子状态');
  }

  // 3. 校验子状态不为封板
  if (requirement.subStatus === 'SEALED') {
    throw errors.subStatusCannotChange('封板状态不可变更');
  }

  // 4. 校验目标子状态有效
  const validSubStatuses = ['DEV_IN_PROGRESS', 'SIT_TEST', 'UAT_TEST', 'SEALED'];
  if (!validSubStatuses.includes(subStatus)) {
    throw errors.subStatusInvalid('无效的子状态值');
  }

  // 5. 校验不能选择当前子状态
  if (requirement.subStatus === subStatus) {
    throw errors.subStatusSameAsCurrent('不能选择当前状态');
  }

  // 6. 校验权限
  // 非封板状态：PROJECT_MGR / TECH_MGR / TEST_MGR
  // 封板状态：TRAIN_ADMIN（但实际上封板状态不可变更，走到这说明是非封板）
  const canChange = [Role.PROJECT_MGR, Role.TECH_MGR, Role.TEST_MGR].includes(user.role);
  if (!canChange) {
    throw errors.requirementPermissionDenied('您没有变更子状态的权限');
  }

  // 7. 校验变更说明长度
  if (comment && comment.length > 500) {
    throw errors.badRequest('变更说明最多 500 字');
  }

  // 8. 执行变更
  return performSubStatusChange(id, user, subStatus, comment);
}
```

### BR1.10.2 执行子状态变更

```typescript
async function performSubStatusChange(
  id: string,
  user: User,
  subStatus: string,
  comment?: string
) {
  return prisma.$transaction(async (tx) => {
    // 1. 获取当前需求（含乐观锁版本）
    const requirement = await tx.requirement.findUnique({
      where: { id },
      select: { version: true, reqCode: true, subStatus: true },
    });

    // 2. 更新子状态
    const updated = await tx.requirement.update({
      where: { id, version: requirement!.version },
      data: {
        subStatus: subStatus,
        version: { increment: 1 },
      },
    });

    // 3. 记录审计日志
    await tx.statusLog.create({
      data: {
        requirementId: id,
        operatorId: user.id,
        operationType: 'CHANGE_SUB_STATUS',
        fromStatus: requirement!.subStatus, // 变更前子状态
        toStatus: subStatus, // 变更后子状态
        reason: comment || undefined,
      },
    });

    return updated;
  });
}
```

### BR1.10.3 前端子状态变更流程

```typescript
async function handleChangeSubStatus(id: string, subStatus: string, comment?: string) {
  try {
    const res = await api.post(`/api/requirements/${id}/change-sub-status`, {
      subStatus,
      comment,
    });
    message.success('子状态已变更');
    onRefresh();
    return res.data;
  } catch (error: any) {
    if (error.code === 'SUB_STATUS_CANNOT_CHANGE') {
      message.error('封板状态不可变更');
    } else if (error.code === 'SUB_STATUS_SAME_AS_CURRENT') {
      message.warning('不能选择当前状态');
    } else if (error.code === 'REQUIREMENT_PERMISSION_DENIED') {
      message.error('您没有变更子状态的权限');
    } else {
      message.error('子状态变更失败');
    }
    throw error;
  }
}
```

---

## 四、前端实现

### 4.1 子状态选择区域显示逻辑

```typescript
// 子状态选择区域显示条件：
// 1. 需求主状态为已纳版（IN_TRAIN）
// 2. 子状态不为封板（SEALED）
// 3. 当前用户角色为 PROJECT_MGR / TECH_MGR / TEST_MGR
function canShowSubStatusSelector(requirement: Requirement, user: User): boolean {
  if (requirement.status !== 'IN_TRAIN') return false;
  if (requirement.subStatus === 'SEALED') return false;

  const roles = [Role.PROJECT_MGR, Role.TECH_MGR, Role.TEST_MGR];
  return roles.includes(user.role);
}
```

### 4.2 子状态下拉框选项

```typescript
// 根据当前子状态，生成可选的子状态下拉选项
function getSubStatusOptions(currentSubStatus: string): SelectOption[] {
  const allOptions = [
    { value: 'DEV_IN_PROGRESS', label: '开发中' },
    { value: 'SIT_TEST', label: 'SIT测试' },
    { value: 'UAT_TEST', label: 'UAT测试' },
    { value: 'SEALED', label: '封板' },
  ];

  // 当前子状态不可选（过滤掉自己）
  return allOptions.filter(opt => opt.value !== currentSubStatus);
}
```

### 4.3 子状态变更组件

```typescript
function SubStatusSelector({
  requirement,
  currentUser,
  onSuccess,
}: Props) {
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const options = getSubStatusOptions(requirement.subStatus);
  const canChange = canShowSubStatusSelector(requirement, currentUser);

  if (!canChange) return null;

  const handleChange = async () => {
    if (!selectedStatus) {
      message.warning('请选择目标子状态');
      return;
    }

    if (selectedStatus === requirement.subStatus) {
      message.warning('不能选择当前状态');
      return;
    }

    setLoading(true);
    try {
      await handleChangeSubStatus(requirement.id, selectedStatus, comment);
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="子状态变更">
      <Space direction="vertical" style={{ width: '100%' }}>
        <Space>
          <span>当前状态：</span>
          <Tag color={getSubStatusColor(requirement.subStatus)}>
            {getSubStatusLabel(requirement.subStatus)}
          </Tag>
        </Space>
        <Select
          placeholder="选择目标子状态"
          value={selectedStatus}
          onChange={setSelectedStatus}
          style={{ width: 200 }}
        >
          {options.map(opt => (
            <Option key={opt.value} value={opt.value}>
              {opt.label}
            </Option>
          ))}
        </Select>
        <Input.TextArea
          placeholder="变更说明（可选）"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          rows={2}
          showCount
        />
        <Button
          type="primary"
          loading={loading}
          disabled={!selectedStatus}
          onClick={handleChange}
        >
          确认变更
        </Button>
      </Space>
    </Card>
  );
}
```

### 4.4 子状态颜色映射

```typescript
function getSubStatusColor(subStatus: string): string {
  const colors: Record<string, string> = {
    'DEV_IN_PROGRESS': 'blue',
    'SIT_TEST': 'orange',
    'UAT_TEST': 'purple',
    'SEALED': 'green',
  };
  return colors[subStatus] || 'default';
}

function getSubStatusLabel(subStatus: string): string {
  const labels: Record<string, string> = {
    'DEV_IN_PROGRESS': '开发中',
    'SIT_TEST': 'SIT测试',
    'UAT_TEST': 'UAT测试',
    'SEALED': '封板',
  };
  return labels[subStatus] || subStatus;
}
```

---

## 五、页面交互

### 5.1 子状态变更交互流程

```
┌─────────────────────────────────────────────────────────────────┐
│ 需求详情页 - 已纳版状态                                              │
│                                                                  │
│ 需求编号：REQ-UC-2026-0001                                        │
│ 需求标题：用户登录优化                                              │
│ 状态：[已纳版]                                                    │
│ 子状态：[开发中]                                                  │
│ 归属火车：V1.2.0                                                   │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 子状态变更                                                    │ │
│ │                                                              │ │
│ │ 当前状态：开发中                                              │ │
│ │                                                              │ │
│ │ 目标状态：[SIT测试 ▼]                                        │ │
│ │                                                              │ │
│ │ 变更说明：                                                    │ │
│ │ ┌─────────────────────────────────────────────────────────┐ │ │
│ │ │ 开发联调完成，可以进入测试阶段                              │ │ │
│ │ └─────────────────────────────────────────────────────────┘ │ │
│ │                                                      0/500  │ │
│ │                                                              │ │
│ │                                   [确认变更]                  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ 底部操作栏：                                                       │
│ [需求变更] [取消]                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 封板状态显示

```
┌─────────────────────────────────────────────────────────────────┐
│ 需求详情页 - 已纳版状态（封板）                                       │
│                                                                  │
│ 需求编号：REQ-UC-2026-0001                                        │
│ 需求标题：用户登录优化                                              │
│ 状态：[已纳版]                                                    │
│ 子状态：[封板] ✅                                                  │
│ 归属火车：V1.2.0                                                   │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 子状态：封板                                                  │ │
│ │ ⚠️ 封板状态不可变更                                            │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ 底部操作栏：                                                       │
│ [紧急变更] [取消]                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 六、测试案例

### 6.1 后端测试案例

| 编号 | 测试场景 | 输入 | 预期结果 |
|------|----------|------|----------|
| TC1.10.1 | PROJECT_MGR变更子状态 | 已纳版-开发中，PROJECT_MGR，变更为SIT_TEST | 200，子状态变为SIT_TEST |
| TC1.10.2 | TECH_MGR变更子状态 | 已纳版-开发中，TECH_MGR，变更为UAT_TEST | 200，子状态变为UAT_TEST |
| TC1.10.3 | TEST_MGR变更子状态 | 已纳版-SIT_TEST，TEST_MGR，变更为UAT_TEST | 200，子状态变为UAT_TEST |
| TC1.10.4 | 回退子状态 | 已纳版-UAT_TEST，PROJECT_MGR，变更为SIT_TEST | 200，子状态变为SIT_TEST |
| TC1.10.5 | 推进到封板 | 已纳版-UAT_TEST，PROJECT_MGR，变更为SEALED | 200，子状态变为SEALED |
| TC1.10.6 | 封板状态不可变更 | 已纳版-SEALED，PROJECT_MGR | 400，封板状态不可变更 |
| TC1.10.7 | 非已纳版不可变更 | 草稿需求调用 | 400，仅已纳版需求可变更 |
| TC1.10.8 | BA不能变更 | 已纳版-开发中，BA用户 | 403，无变更权限 |
| TC1.10.9 | PM不能变更 | 已纳版-开发中，PM用户 | 403，无变更权限 |
| TC1.10.10 | 选择当前状态 | 目标状态=当前状态 | 400，不能选择当前状态 |
| TC1.10.11 | 变更说明超长 | comment 超过 500 字 | 400，变更说明最多 500 字 |
| TC1.10.12 | 需求不存在 | 不存在的ID | 404，需求不存在 |
| TC1.10.13 | 未登录 | 未带Token | 401，未登录 |
| TC1.10.14 | 并发冲突 | 乐观锁版本不匹配 | 409，数据已被修改 |
| TC1.10.15 | 审计日志记录 | 变更成功 | statusLog记录CHANGE_SUB_STATUS |

### 6.2 前端测试案例

| 编号 | 测试场景 | 操作 | 预期结果 |
|------|----------|------|----------|
| TC1.10.F1 | 显示子状态选择区域 | 以PROJECT_MGR身份查看已纳版-开发中需求 | 显示子状态变更区域 |
| TC1.10.F2 | 不显示变更区域 | 以BA身份查看已纳版-开发中需求 | 不显示子状态变更区域 |
| TC1.10.F3 | 封板状态不显示变更区域 | 查看已纳版-封板需求 | 不显示子状态变更区域 |
| TC1.10.F4 | 下拉框过滤当前状态 | 当前状态=开发中 | 下拉框可选SIT/UAT/封板 |
| TC1.10.F5 | 选择目标状态后变更 | 选择SIT测试，点击确认 | 成功，子状态更新 |
| TC1.10.F6 | 选择当前状态提示 | 选择当前状态，点击确认 | 提示不能选择当前状态 |
| TC1.10.F7 | 变更说明字数统计 | 输入超过500字 | 显示字数统计 |
| TC1.10.F8 | 操作历史显示记录 | 变更后查看详情 | 操作历史显示子状态变更 |

---

## 七、编码顺序

| 步骤 | 内容 | 依赖 | 说明 |
|------|------|------|------|
| 1 | 后端：POST /api/requirements/:id/change-sub-status 接口 | US1.1（数据模型） | 基础API实现 |
| 2 | 后端：权限校验（PROJECT_MGR/TECH_MGR/TEST_MGR） | 步骤1 | 非封板状态权限 |
| 3 | 后端：前置条件校验（已纳版、非封板） | 步骤1 | 主状态+子状态校验 |
| 4 | 后端：目标子状态校验（不能等于当前） | 步骤1 | 子状态校验 |
| 5 | 后端：变更说明长度校验（≤500字） | 步骤1 | 可选说明校验 |
| 6 | 后端：状态变更事务 | 步骤1 | 复用审计日志 |
| 7 | 后端：单元测试（15条） | 步骤1-6 | TC1.10.1~TC1.10.15 |
| 8 | 前端：子状态选择组件 | US1.4前端 | SubStatusSelector |
| 9 | 前端：子状态颜色和标签 | 步骤8 | 样式映射 |
| 10 | 前端：handleChangeSubStatus 函数 | 步骤8 | 调用API + 错误处理 |
| 11 | 前端：集成测试（8条） | 步骤8-10 | TC1.10.F1~TC1.10.F8 |

---

## 八、验收条件

### 8.1 功能验收

- [ ] AC1.10.1: 已纳版需求详情页显示子状态选择区域
- [ ] AC1.10.2: PROJECT_MGR / TECH_MGR / TEST_MGR 角色可见并可操作
- [ ] AC1.10.3: 下拉框可选任意子状态（排除当前状态）
- [ ] AC1.10.4: 选择不同子状态后确认，子状态变更
- [ ] AC1.10.5: 选择当前子状态时，提示"不能选择当前状态"
- [ ] AC1.10.6: 封板状态不显示子状态变更区域
- [ ] AC1.10.7: 操作历史记录子状态变更条目

### 8.2 技术验收

- [ ] AC1.10.8: 后端校验权限仅允许 PROJECT_MGR / TECH_MGR / TEST_MGR
- [ ] AC1.10.9: 前置条件：主状态必须为已纳版
- [ ] AC1.10.10: 前置条件：子状态不能为封板
- [ ] AC1.10.11: 目标子状态不能等于当前子状态
- [ ] AC1.10.12: 变更说明长度限制 ≤500 字
- [ ] AC1.10.13: 使用乐观锁防止并发冲突
- [ ] AC1.10.14: 状态变更和审计日志在同一事务中
- [ ] AC1.10.15: 后端测试 15 条全部通过
- [ ] AC1.10.16: 前端测试 8 条全部通过

---

## 九、与其他用户故事的交互

### 9.1 子状态流转图

```
                    ┌─────────────────────────────────────┐
                    │         已纳版（IN_TRAIN）           │
                    └─────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
   ┌─────────────┐          ┌─────────────┐          ┌───────────┐
   │  开发中     │          │  SIT测试    │          │  UAT测试  │
   │(DEV_IN_PRO)│◄────────►│ (SIT_TEST) │◄────────►│ (UAT_TEST)│
   └─────────────┘          └─────────────┘          └─────┬─────┘
          │                         │                       │
          └─────────────────────────┴───────────────────────┘
                                  │                               ▲
                                  │         推进/回退             │
                                  └───────────────────────────────┘
                                                                  │
                                                          ┌───────┴───────┐
                                                          │    封板       │
                                                          │  (SEALED) ⚠️  │
                                                          │ 不可变更      │
                                                          └───────────────┘
```

### 9.2 权限矩阵

| 操作 | BA | PM | PROJECT_MGR | TECH_MGR | TEST_MGR | TRAIN_ADMIN | SUPER_ADMIN |
|------|:--:|:--:|:-----------:|:--------:|:--------:|:-----------:|:-----------:|
| 发起评审 | ✓ | - | - | - | - | ✓ | ✓ |
| 评审通过 | - | - | **✓** | - | - | - | - |
| 评审拒绝 | - | - | **✓** | - | - | - | - |
| 重新编辑 | ✓ | ✓ | - | - | - | - | - |
| 取消 | ✓ | - | - | - | - | ✓ | ✓ |
| 子状态变更（非封板） | - | - | ✓ | ✓ | ✓ | - | - |
| 子状态变更（封板） | - | - | - | - | - | - | - |

---

*文档编号：RT-T1-US1.10*
*创建时间：2026-05-15*
*更新时间：2026-05-15*
*版本：v1.0*
*审核状态：待审核*
