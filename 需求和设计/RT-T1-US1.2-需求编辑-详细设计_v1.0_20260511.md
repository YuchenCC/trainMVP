# US1.2 需求编辑 - 详细设计

**版本号**: v1.0
**日期**: 2026-05-11
**设计状态**: 待审核
**来源**: [RT-T1-需求池管理-设计方案_20260511.md](./RT-T1-需求池管理-设计方案_20260511.md) v1.1
**PRD**: [RT-Task1-需求池管理-PRD.md](./RT-Task1-需求池管理-PRD.md) §2.3.1
**前置**: US1.1 需求录入（复用录入表单组件）

### 版本记录

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0 | 2026-05-11 | 初版：从设计方案中独立拆出，参考 US1.1 格式 |

---

## 一、功能概述

| 项目 | 说明 |
|------|------|
| 用户故事编号 | US1.2 |
| 功能描述 | 编辑草稿状态的需求信息 |
| 触发入口 | 需求详情页 → "编辑"按钮 / 需求列表页 → 操作列"编辑"按钮 |
| 状态限制 | 仅草稿状态可编辑 |
| 权限限制 | BA（业务归属人）、PM（产品经理）、火车管理员、超级管理员 |
| 前置依赖 | US1.1（复用录入表单组件 RequirementForm） |

---

## 二、与 US1.1 的差异点

US1.2 复用 US1.1 的录入表单，以下为编辑模式独有的差异：

| 差异项 | US1.1 录入 | US1.2 编辑 |
|--------|-----------|-----------|
| 表单模式 | `mode='create'` | `mode='edit'` |
| 初始数据 | 空表单 | 预填当前需求数据 |
| 需求编号 | 自动生成，不可编辑 | 不展示（只读字段） |
| 创建人 | 自动填充当前用户 | 不展示（只读字段） |
| 乐观锁 | 无 | 提交时附加 `version` 字段 |
| 审计日志 | 记录 CREATE | 记录 UPDATE（含变更字段列表） |
| 归属系统修改 | 首次选择 | 可修改，需二次确认 |
| 依赖关系 | 新增依赖 | 全量替换（同 US1.1 逻辑） |

---

## 三、页面交互流程

```
用户点击"编辑"
    ↓
校验1：需求状态是否为"草稿"？
    ↓ 否 → 提示"仅草稿状态的需求可编辑"（理论上不会出现，按钮已隐藏）
    ↓ 是
校验2：当前用户是否有编辑权限？
    ↓ 否 → 提示"您没有编辑权限"（理论上不会出现，按钮已隐藏）
    ↓ 是
打开编辑表单（预填当前数据，mode='edit'）
    ↓
用户修改字段 → 点击"保存"
    ↓
校验3：version 是否匹配当前版本号？（乐观锁）
    ↓ 否 → 返回 409 + "数据已被修改，请刷新后重试"
    ↓ 是
校验4：字段是否通过校验？
    ↓ 否 → 返回 400 + 具体字段错误信息
    ↓ 是
校验5：依赖关系是否合法？（自依赖、循环依赖）
    ↓ 否 → 返回 400 + 具体错误信息
    ↓ 是
保存数据（version + 1）
记录审计日志（UPDATE）
返回更新后的需求详情
```

---

## 四、API 设计

### 4.1 接口定义

**PATCH /api/requirements/:id**

| 项目 | 说明 |
|------|------|
| 权限 | BA（业务归属人）、PM、TRAIN_ADMIN、SUPER_ADMIN |
| 前置 | 需求状态为 DRAFT |

### 4.2 请求体

```typescript
interface UpdateRequirementRequest {
  version: number;          // 乐观锁：必须匹配当前版本号（必填）
  title?: string;           // 需求标题（2-100字符）
  description?: string;     // 需求描述（HTML，XSS白名单过滤）
  systemId?: string;        // 归属系统ID（修改时需二次确认）
  priority?: Priority;      // 优先级 P0/P1/P2/P3
  storyPoints?: number;     // 工作量点数（1-100）
  baId?: string;            // 业务归属人ID
  pmId?: string;            // 产品经理ID（可选）
  reqType?: ReqType;        // 需求类型
  sourceChannel?: SourceChannel; // 来源渠道
  dependencyIds?: string[]; // 依赖需求ID列表（全量替换）
}
```

### 4.3 响应体

```typescript
// 成功 (200)
interface UpdateRequirementResponse {
  success: true;
  data: RequirementDetail;
  message: '需求更新成功';
}

// 乐观锁冲突 (409)
interface VersionConflictResponse {
  success: false;
  error: {
    code: 'VERSION_CONFLICT';
    message: '数据已被修改，请刷新后重试';
    currentVersion: number;
  };
}

// 校验失败 (400)
interface ValidationErrorResponse {
  success: false;
  error: {
    code: 'VALIDATION_ERROR';
    message: string;
    details: {
      field: string;
      message: string;
    }[];
  };
}
```

### 4.4 错误码汇总

| HTTP状态码 | 错误码 | 说明 |
|-----------|--------|------|
| 400 | VALIDATION_ERROR | 参数校验失败，返回 details 数组 |
| 401 | UNAUTHORIZED | 未登录或 Token 过期 |
| 403 | FORBIDDEN | 无编辑权限或非草稿状态 |
| 404 | NOT_FOUND | 需求不存在 |
| 409 | VERSION_CONFLICT | 乐观锁冲突，返回 currentVersion |
| 500 | INTERNAL_ERROR | 服务端错误 |

---

## 五、字段校验规则

与 US1.1 一致，补充编辑模式特殊规则：

| 字段 | 规则 | 错误信息 |
|------|------|----------|
| version | 必填，必须匹配当前版本号 | "数据已被修改，请刷新后重试" |
| title | 必填（如果传入），长度 2-100 字符 | "需求标题必填" / "需求标题长度需在 2-100 字符之间" |
| description | 必填（如果传入），XSS 白名单过滤 | "需求描述必填" |
| systemId | 必须是已存在的系统 | "归属系统不存在" |
| priority | 必填（如果传入），枚举值 P0/P1/P2/P3 | "优先级格式错误" |
| storyPoints | 范围 1-100 整数 | "工作量点数必须为 1-100 的正整数" |
| baId | 必须是存在的 BA 用户 | "业务归属人不存在" |
| pmId | 可选，如果传入必须是存在的用户 | "产品经理不存在" |
| reqType | 枚举值 NEW_FEATURE/OPTIMIZATION/BUG | "需求类型格式错误" |
| sourceChannel | 枚举值 BUSINESS/USER_FEEDBACK/DATA_ANALYSIS/COMPETITOR | "来源渠道格式错误" |
| dependencyIds | 数组，每项必须是已存在的需求 ID | "依赖需求不存在" / "不能依赖自身" / "存在循环依赖" |

---

## 六、业务规则

### BR1.2.1 仅草稿状态可编辑

```typescript
if (current.status !== 'DRAFT') {
  throw new ForbiddenError('仅草稿状态的需求可编辑');
}
```

### BR1.2.2 编辑权限校验

```typescript
// BA 角色：仅业务归属人可编辑
if (user.role === Role.BA && current.baId !== user.id) {
  throw new ForbiddenError('仅业务归属人可编辑');
}

// 其他授权角色：PM、TRAIN_ADMIN、SUPER_ADMIN
const canEdit = [Role.PM, Role.TRAIN_ADMIN, Role.SUPER_ADMIN].includes(user.role);
if (!canEdit) {
  throw new ForbiddenError('您没有编辑权限');
}
```

### BR1.2.3 编辑不改变需求编号和创建人

- `reqCode` 和 `creatorId` 不参与更新
- UPDATE 语句排除这两个字段
- 前端表单不展示这两个字段

### BR1.2.4 乐观锁

```typescript
if (current.version !== data.version) {
  throw new ConflictError('数据已被修改，请刷新后重试', {
    currentVersion: current.version,
  });
}

// 更新时递增版本号
await prisma.requirement.update({
  where: { id },
  data: {
    ...updateData,
    version: { increment: 1 },
  },
});
```

### BR1.2.5 编辑操作记录审计日志

```typescript
// 计算变更字段列表
const changedFields = Object.keys(updateData).filter(key => {
  return JSON.stringify(current[key]) !== JSON.stringify(updateData[key]);
});

await prisma.statusLog.create({
  data: {
    requirementId: id,
    operatorId: user.id,
    operationType: 'UPDATE',
    reason: `修改字段: ${changedFields.join(', ')}`,
  },
});
```

### BR1.2.6 归属系统修改需二次确认

前端实现：当用户修改 `systemId` 时，弹出确认弹窗：

```
修改归属系统可能影响依赖关系，确认修改吗？
[取消] [确认修改]
```

### BR1.2.7 依赖关系全量替换

与 US1.1 一致，编辑时传入的 `dependencyIds` 为全量替换：

1. 删除该需求的所有现有依赖关系
2. 校验新依赖列表（自依赖、循环依赖）
3. 批量创建新依赖关系

---

## 七、前端实现

### 7.1 编辑按钮组件

```typescript
interface EditButtonProps {
  requirement: Requirement;
  currentUser: User;
  onEdit: () => void;
}

function EditButton({ requirement, currentUser, onEdit }: EditButtonProps) {
  // 仅草稿状态显示
  if (requirement.status !== 'DRAFT') return null;

  // BA 角色需要校验是否是该需求的业务归属人
  if (currentUser.role === Role.BA && requirement.baId !== currentUser.id) {
    return null;
  }

  // 授权角色
  const canEdit = [
    Role.BA, Role.PM, Role.TRAIN_ADMIN, Role.SUPER_ADMIN,
  ].includes(currentUser.role);

  return canEdit ? <Button onClick={onEdit}>编辑</Button> : null;
}
```

### 7.2 编辑表单（复用 US1.1 RequirementForm）

```typescript
// 编辑模式特殊处理
function RequirementForm({ mode, initialData, onSubmit, onCancel }: RequirementFormProps) {
  const [form] = Form.useForm();

  const handleSubmit = async (values: any) => {
    if (mode === 'edit') {
      await onSubmit({
        ...values,
        version: initialData.version, // 乐观锁
      });
    } else {
      await onSubmit(values);
    }
  };

  return (
    <Form form={form} initialValues={initialData} onFinish={handleSubmit}>
      {/* 标题、描述、系统、优先级、点数、BA、PM 等字段 */}
      {/* 编辑模式下不展示 reqCode 和 creator */}
    </Form>
  );
}
```

### 7.3 乐观锁冲突处理

```typescript
// 前端处理 409 响应
async function handleSave(data: UpdateRequirementRequest) {
  try {
    const res = await api.patch(`/api/requirements/${id}`, data);
    message.success('需求更新成功');
    fetchRequirement(id); // 刷新详情
  } catch (error) {
    if (error.response?.status === 409) {
      Modal.confirm({
        title: '数据已被修改',
        content: '其他用户已修改了该需求，请刷新后重试。',
        okText: '刷新',
        cancelText: '取消',
        onOk: () => fetchRequirement(id),
      });
    }
  }
}
```

---

## 八、验收条件

### 8.1 功能验收

- [ ] AC1.2.1: 草稿状态的需求详情页显示"编辑"按钮
- [ ] AC1.2.2: 点击"编辑"打开预填当前数据的表单
- [ ] AC1.2.3: 修改标题并保存，详情页显示新标题
- [ ] AC1.2.4: 需求编号和创建人不可编辑（表单中不展示）
- [ ] AC1.2.5: 非草稿状态的需求不显示"编辑"按钮
- [ ] AC1.2.6: 非授权角色看不到"编辑"按钮
- [ ] AC1.2.7: BA 角色只能编辑自己归属的需求，不能编辑其他 BA 的需求

### 8.2 技术验收

- [ ] AC1.2.8: 乐观锁 version 不匹配时，返回 409 和 currentVersion
- [ ] AC1.2.9: 字段校验失败时，返回 400 和具体字段错误信息
- [ ] AC1.2.10: 编辑保存后，操作历史记录 UPDATE 日志（含变更字段列表）
- [ ] AC1.2.11: 修改归属系统时，前端弹出确认提示
- [ ] AC1.2.12: 修改依赖关系时，后端校验循环依赖和自依赖
- [ ] AC1.2.13: 并发编辑时，后保存的请求返回 409，前端弹出刷新确认弹窗

---

*文档编号：RT-T1-US1.2*
*创建时间：2026-05-11*
*审核状态：待审核*
