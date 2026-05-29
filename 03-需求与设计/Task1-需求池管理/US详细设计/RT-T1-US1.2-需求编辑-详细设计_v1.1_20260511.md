# US1.2 需求编辑 - 详细设计

**版本号**: v1.1
**日期**: 2026-05-11
**设计状态**: 待审核
**来源**: [RT-T1-需求池管理-设计方案_20260511.md](./RT-T1-需求池管理-设计方案_20260511.md) v1.1
**PRD**: [RT-Task1-需求池管理-PRD.md](./RT-Task1-需求池管理-PRD.md) §2.3.1
**前置**: US1.1 需求录入（复用录入表单组件 RequirementForm）
**对齐**: [RT-T1-US1.1-需求录入-详细设计_v1.2_20260511.md](./RT-T1-US1.1-需求录入-详细设计_v1.2_20260511.md)

### 版本记录

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0 | 2026-05-11 | 初版：从设计方案中独立拆出 |
| v1.1 | 2026-05-11 | 对齐 US1.1 详细设计 v1.2：标题长度、描述长度、编辑权限、XSS双重过滤、补充测试案例、补充编码顺序 |

---

## 一、功能概述

| 项目 | 说明 |
|------|------|
| 用户故事编号 | US1.2 |
| 功能描述 | 编辑草稿状态的需求信息 |
| 触发入口 | 需求详情页 → "编辑"按钮 / 需求列表页 → 操作列"编辑"按钮 |
| 状态限制 | 仅草稿状态可编辑 |
| 权限限制 | BA、PM、PROJECT_MGR、TRAIN_ADMIN、SUPER_ADMIN（草稿状态不限归属人） |
| 前置依赖 | US1.1（复用录入表单组件 RequirementForm） |

---

## 二、与 US1.1 的差异点

US1.2 复用 US1.1 的录入表单，以下为编辑模式独有的差异：

| 差异项 | US1.1 录入 | US1.2 编辑 |
|--------|-----------|-----------|
| 表单模式 | `mode='create'` | `mode='edit'` |
| 初始数据 | 空表单 | 预填当前需求数据 |
| 需求编号 | 自动生成 `REQ-{年份}-{4位序号}` | 不展示（只读字段） |
| 创建人 | 自动填充当前用户 | 不展示（只读字段） |
| 乐观锁 | 无 | 提交时附加 `version` 字段 |
| 审计日志 | 记录 CREATE | 记录 UPDATE（含变更字段列表） |
| 归属系统修改 | 首次选择 | 可修改，需二次确认 |
| 依赖关系 | 新增依赖 | 全量替换（同 US1.1 逻辑） |
| 编辑权限 | - | 草稿状态不限归属人（与 US1.1 录入权限一致） |

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
| 权限 | BA、PM、PROJECT_MGR、TRAIN_ADMIN、SUPER_ADMIN |
| 前置 | 需求状态为 DRAFT |

### 4.2 请求体

```typescript
interface UpdateRequirementRequest {
  version: number;          // 乐观锁：必须匹配当前版本号（必填）
  title?: string;           // 需求标题（1-200字符，与US1.1一致）
  description?: string;     // 需求描述（HTML，1-50000字符，与US1.1一致）
  systemId?: string;        // 归属系统ID（修改时需二次确认）
  priority?: Priority;      // 优先级 P0/P1/P2/P3
  storyPoints?: number;     // 工作量点数（1-100）
  baId?: string;            // 业务归属人ID
  pmId?: string;            // 产品经理ID（可选）
  reqType?: ReqType;        // 需求类型
  sourceChannel?: SourceChannel; // 来源渠道
  dependencyIds?: string[]; // 依赖需求ID列表（全量替换，与US1.1一致）
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
| title | 必填（如果传入），长度 1-200 字符（与US1.1一致） | "需求标题必填" / "需求标题长度需在 1-200 字符之间" |
| description | 必填（如果传入），HTML，长度 1-50000 字符（与US1.1一致），XSS双重过滤 | "需求描述必填" / "需求描述长度不能超过50000字符" |
| systemId | 必须是已存在的系统 | "归属系统不存在" |
| priority | 必填（如果传入），枚举值 P0/P1/P2/P3 | "优先级格式错误" |
| storyPoints | 范围 1-100 整数 | "工作量点数必须为 1-100 的正整数" |
| baId | 必须是存在的 BA 用户 | "业务归属人不存在" |
| pmId | 可选，如果传入必须是存在的用户 | "产品经理不存在" |
| reqType | 枚举值 NEW_FEATURE/OPTIMIZATION/BUG | "需求类型格式错误" |
| sourceChannel | 枚举值 BUSINESS/USER_FEEDBACK/DATA_ANALYSIS/COMPETITOR | "来源渠道格式错误" |
| dependencyIds | 数组，每项必须是已存在的需求 ID | "依赖需求不存在" / "不能依赖自身" / "存在循环依赖" |

### XSS 过滤策略（与 US1.1 一致）

双重过滤：后端 `sanitize-html` + 前端 `DOMPurify`

```typescript
// 后端：sanitize-html 白名单
const ALLOWED_TAGS = [
  'p', 'br', 'b', 'i', 'u', 'strong', 'em',
  'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a', 'img', 'blockquote', 'pre', 'code', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
];

// 前端：DOMPurify（与 US1.1 一致）
const cleanHtml = DOMPurify.sanitize(dirtyHtml, {
  ALLOWED_TAGS,
  ALLOWED_ATTR: ['href', 'target', 'src', 'alt', 'class'],
});
```

---

## 六、业务规则

### BR1.2.1 仅草稿状态可编辑

```typescript
if (current.status !== 'DRAFT') {
  throw new ForbiddenError('仅草稿状态的需求可编辑');
}
```

### BR1.2.2 编辑权限（与 US1.1 录入权限一致，草稿状态不限归属人）

```typescript
// 草稿状态下，BA/PM/PROJECT_MGR/TRAIN_ADMIN/SUPER_ADMIN 均可编辑
// 不限归属人（与 US1.1 录入权限对齐）
const canEdit = [
  Role.BA, Role.PM, Role.PROJECT_MGR,
  Role.TRAIN_ADMIN, Role.SUPER_ADMIN,
].includes(user.role);

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

### BR1.2.7 依赖关系全量替换（与 US1.1 一致）

编辑时传入的 `dependencyIds` 为全量替换：

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

  // 草稿状态下，BA/PM/PROJECT_MGR/TRAIN_ADMIN/SUPER_ADMIN 均可编辑
  // 不限归属人（与 US1.1 录入权限对齐）
  const canEdit = [
    Role.BA, Role.PM, Role.PROJECT_MGR,
    Role.TRAIN_ADMIN, Role.SUPER_ADMIN,
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

## 八、测试案例

### 8.1 后端测试案例

| 编号 | 测试场景 | 输入 | 预期结果 |
|------|----------|------|----------|
| TC1.2.1 | 正常编辑标题 | PATCH /api/requirements/:id, {version:1, title:"新标题"} | 200, title="新标题", version=2 |
| TC1.2.2 | 正常编辑描述 | PATCH /api/requirements/:id, {version:1, description:"<p>新描述</p>"} | 200, description更新 |
| TC1.2.3 | 正常修改优先级 | PATCH /api/requirements/:id, {version:1, priority:"P0"} | 200, priority=P0 |
| TC1.2.4 | 正常修改工作量点数 | PATCH /api/requirements/:id, {version:1, storyPoints:5} | 200, storyPoints=5 |
| TC1.2.5 | 正常修改依赖关系 | PATCH /api/requirements/:id, {version:1, dependencyIds:["id1","id2"]} | 200, 依赖全量替换 |
| TC1.2.6 | 编辑非草稿需求 | PATCH /api/requirements/:id (status=PENDING_REVIEW) | 403, "仅草稿状态的需求可编辑" |
| TC1.2.7 | 乐观锁冲突 | PATCH /api/requirements/:id, {version:0} (当前version=1) | 409, currentVersion=1 |
| TC1.2.8 | 标题为空 | PATCH /api/requirements/:id, {version:1, title:""} | 400, "需求标题必填" |
| TC1.2.9 | 标题超长 | PATCH /api/requirements/:id, {version:1, title:"x".repeat(201)} | 400, "需求标题长度需在 1-200 字符之间" |
| TC1.2.10 | 工作量点数超范围 | PATCH /api/requirements/:id, {version:1, storyPoints:0} | 400, "工作量点数必须为 1-100 的正整数" |
| TC1.2.11 | 工作量点数非整数 | PATCH /api/requirements/:id, {version:1, storyPoints:1.5} | 400, "工作量点数必须为 1-100 的正整数" |
| TC1.2.12 | 依赖自引用 | PATCH /api/requirements/:id, {version:1, dependencyIds:[":id"]} | 400, "不能依赖自身" |
| TC1.2.13 | 依赖循环引用 | PATCH /api/requirements/:id, {version:1, dependencyIds:["idB"]} (idB已依赖id) | 400, "存在循环依赖" |
| TC1.2.14 | 依赖不存在 | PATCH /api/requirements/:id, {version:1, dependencyIds:["nonexistent"]} | 400, "依赖需求不存在" |
| TC1.2.15 | XSS过滤 | PATCH /api/requirements/:id, {version:1, description:"<script>alert(1)</script>"} | 200, script标签被过滤 |
| TC1.2.16 | 无权限编辑 | PATCH /api/requirements/:id (role=TECH_MGR) | 403, "您没有编辑权限" |
| TC1.2.17 | 需求不存在 | PATCH /api/requirements/nonexistent | 404, "需求不存在" |
| TC1.2.18 | 审计日志记录 | PATCH /api/requirements/:id, {version:1, title:"新标题"} | 200, statusLog包含UPDATE记录 |
| TC1.2.19 | version字段缺失 | PATCH /api/requirements/:id, {title:"新标题"} (无version) | 400, "version必填" |
| TC1.2.20 | 修改归属系统 | PATCH /api/requirements/:id, {version:1, systemId:"newSystemId"} | 200, systemId更新 |

### 8.2 前端测试案例

| 编号 | 测试场景 | 操作 | 预期结果 |
|------|----------|------|----------|
| TC1.2.F1 | 草稿显示编辑按钮 | 以BA身份查看草稿需求 | 显示"编辑"按钮 |
| TC1.2.F2 | 非草稿隐藏编辑按钮 | 以BA身份查看待评审需求 | 不显示"编辑"按钮 |
| TC1.2.F3 | 无权限隐藏编辑按钮 | 以TECH_MGR身份查看草稿需求 | 不显示"编辑"按钮 |
| TC1.2.F4 | 编辑表单预填数据 | 点击"编辑" | 表单预填当前需求数据 |
| TC1.2.F5 | 需求编号不可编辑 | 查看编辑表单 | 不显示需求编号字段 |
| TC1.2.F6 | 创建人不可编辑 | 查看编辑表单 | 不显示创建人字段 |
| TC1.2.F7 | 保存成功跳转详情 | 修改标题并保存 | 显示成功提示，跳转详情页 |
| TC1.2.F8 | 乐观锁冲突弹窗 | 两个浏览器同时编辑，后保存 | 弹出"数据已被修改"确认弹窗 |
| TC1.2.F9 | 归属系统修改确认 | 修改归属系统并保存 | 弹出确认弹窗 |
| TC1.2.F10 | 依赖关系编辑 | 添加/删除依赖并保存 | 依赖列表更新 |
| TC1.2.F11 | PM可编辑草稿 | 以PM身份查看草稿需求 | 显示"编辑"按钮 |
| TC1.2.F12 | PROJECT_MGR可编辑草稿 | 以PROJECT_MGR身份查看草稿需求 | 显示"编辑"按钮 |
| TC1.2.F13 | 取消编辑返回详情 | 点击"取消" | 返回需求详情页，数据不变 |

---

## 九、编码顺序

| 步骤 | 内容 | 依赖 |
|------|------|------|
| 1 | Schema 确认（version 字段已在 US1.1 中定义） | US1.1 |
| 2 | 后端：PATCH /api/requirements/:id 接口实现 | 步骤1 |
| 3 | 后端：乐观锁校验逻辑 | 步骤2 |
| 4 | 后端：审计日志记录（UPDATE） | 步骤2 |
| 5 | 后端：依赖关系全量替换 | 步骤2 |
| 6 | 后端：单元测试（20条） | 步骤2-5 |
| 7 | 前端：编辑按钮组件（权限控制） | US1.1 前端 |
| 8 | 前端：编辑表单复用（mode='edit'） | 步骤7 |
| 9 | 前端：乐观锁冲突处理 | 步骤8 |
| 10 | 前端：归属系统修改确认弹窗 | 步骤8 |
| 11 | 前端：集成测试（13条） | 步骤7-10 |

---

## 十、验收条件

### 10.1 功能验收

- [ ] AC1.2.1: 草稿状态的需求详情页显示"编辑"按钮
- [ ] AC1.2.2: 点击"编辑"打开预填当前数据的表单
- [ ] AC1.2.3: 修改标题并保存，详情页显示新标题
- [ ] AC1.2.4: 需求编号和创建人不可编辑（表单中不展示）
- [ ] AC1.2.5: 非草稿状态的需求不显示"编辑"按钮
- [ ] AC1.2.6: 非授权角色（TECH_MGR、TEST_MGR）看不到"编辑"按钮
- [ ] AC1.2.7: PM、PROJECT_MGR 可编辑草稿需求（不限归属人）

### 10.2 技术验收

- [ ] AC1.2.8: 乐观锁 version 不匹配时，返回 409 和 currentVersion
- [ ] AC1.2.9: 字段校验失败时，返回 400 和具体字段错误信息
- [ ] AC1.2.10: 编辑保存后，操作历史记录 UPDATE 日志（含变更字段列表）
- [ ] AC1.2.11: 修改归属系统时，前端弹出确认提示
- [ ] AC1.2.12: 修改依赖关系时，后端校验循环依赖和自依赖
- [ ] AC1.2.13: 并发编辑时，后保存的请求返回 409，前端弹出刷新确认弹窗
- [ ] AC1.2.14: XSS双重过滤（sanitize-html + DOMPurify）
- [ ] AC1.2.15: 后端测试 20 条全部通过
- [ ] AC1.2.16: 前端测试 13 条全部通过

---

*文档编号：RT-T1-US1.2*
*创建时间：2026-05-11*
*更新时间：2026-05-11*
*版本：v1.1（对齐US1.1 v1.2）*
*审核状态：待审核*
