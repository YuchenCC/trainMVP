# RT-Task6-需求审查-设计方案_v1.0_20260529

> 版本记录：v1.0 | 2026-05-29 | 初始版本，基于已实现代码反向编写

---

## 一、API 设计

### 1.1 POST /api/requirements/review — 实时审查（创建前预览）

**用途：** 用户填写需求表单后，在提交前预览审查结果，无需先保存需求。

**认证：** Bearer Token（JWT）
**权限：** CREATE_REQ

**请求体：**
```json
{
  "title": "需求标题",
  "description": "需求描述",
  "priority": "P2",
  "storyPoints": 5,
  "reqType": "NEW_FEATURE",
  "sourceChannel": "USER_FEEDBACK",
  "systemId": "cmppqfwu30000tj5c734y7mac",
  "baId": "cmpi1ow520001f8xgl8pcqfyp"
}
```

**响应体：**
```json
{
  "success": true,
  "data": {
    "requirementId": "",
    "passed": true,
    "score": 78,
    "issues": [
      {
        "type": "TITLE_TOO_SHORT",
        "message": "标题过短，当前 3 字符，建议至少 5 字符",
        "suggestion": "请提供更清晰的需求标题",
        "severity": "medium"
      }
    ],
    "suggestions": [
      "优化需求标题，明确核心功能和所属场景",
      "补充可量化的验收条件"
    ],
    "optimizedTitle": "需求创建页面新增AI需求审核功能入口",
    "optimizedDescription": "作为普惠金融业务BA...",
    "acceptanceCriteria": [
      "需求创建页右上角固定展示AI需求审核按钮",
      "点击审核按钮后系统需在3秒内完成审核"
    ],
    "reviewedAt": "2026-05-29T12:00:00.000Z"
  }
}
```

**字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| passed | boolean | 是否通过（score >= 60） |
| score | number | 综合评分 0-100 |
| issues | array | 发现的问题列表 |
| issues[].type | string | 问题类型枚举 |
| issues[].severity | string | 严重程度：high/medium/low |
| suggestions | string[] | AI 优化建议 |
| optimizedTitle | string? | AI 优化后的标题 |
| optimizedDescription | string? | AI 优化后的描述 |
| acceptanceCriteria | string[]? | AI 建议的验收条件 |

### 1.2 POST /api/requirements/:id/review — 对已有需求审查

**用途：** 对已存在的需求进行审查（根据需求ID查询）

**路径参数：** `id` — 需求ID

**响应：** 与 1.1 相同结构，`requirementId` 为实际需求ID。

---

## 二、数据模型

### 2.1 审查结果（TypeScript 接口）

```typescript
interface RequirementReviewResult {
  requirementId: string;         // 需求ID（实时审查时为空字符串）
  passed: boolean;               // 是否通过（score >= 60）
  score: number;                 // 综合评分 0-100
  issues: ReviewIssue[];         // 问题列表
  suggestions: string[];         // 优化建议
  optimizedTitle?: string;       // AI优化后的标题
  optimizedDescription?: string; // AI优化后的需求描述
  acceptanceCriteria?: string[]; // AI建议的验收条件
  reviewedAt: Date;              // 审查时间
}

interface ReviewIssue {
  type: ReviewIssueType;         // 问题类型
  message: string;               // 问题描述
  suggestion: string;            // 改进建议
  severity: 'high' | 'medium' | 'low'; // 严重程度
}

enum ReviewIssueType {
  TITLE_TOO_SHORT = 'TITLE_TOO_SHORT',
  DESCRIPTION_TOO_SHORT = 'DESCRIPTION_TOO_SHORT',
  INVALID_USER_STORY_FORMAT = 'INVALID_USER_STORY_FORMAT',
  MISSING_PRIORITY = 'MISSING_PRIORITY',
  INVALID_STORY_POINTS = 'INVALID_STORY_POINTS',
  MISSING_SYSTEM = 'MISSING_SYSTEM',
  MISSING_BA = 'MISSING_BA',
  MISSING_ACCEPTANCE_CRITERIA = 'MISSING_ACCEPTANCE_CRITERIA',
  AMBIGUOUS_DESCRIPTION = 'AMBIGUOUS_DESCRIPTION',
  MISSING_BUSINESS_VALUE = 'MISSING_BUSINESS_VALUE',
}
```

### 2.2 审查规则配置

```typescript
const REVIEW_RULES = {
  userStoryPattern: /作为[\u4e00-\u9fa5a-zA-Z]+，?我(希望|想要|需要)...以便.../,
  minAcceptanceCriteria: 3,
  minDescriptionLength: 50,
  requiredPriority: ['P0', 'P1', 'P2', 'P3'],
  storyPointsRange: { min: 1, max: 100 },
};
```

### 2.3 评分计算

```
总分 = 本地规则得分 × 20% + AI评分 × 80%

本地规则得分 = 100 - Σ(扣分)
  严重问题(high):  扣 20 分
  中等问题(medium): 扣 10 分
  轻微问题(low):    扣 5 分
```

---

## 三、架构设计

### 3.1 审查流程

```
┌──────────────────────────────────────────────────────┐
│                   RequirementForm.tsx                 │
│                  (前端：AI审查按钮 + Modal)              │
└──────────────────────┬───────────────────────────────┘
                       │ POST /api/requirements/review
                       │ Axios timeout: 180s
                       ▼
┌──────────────────────────────────────────────────────┐
│            requirement-review/index.ts                │
│                  (路由层：认证 + RBAC)                  │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│           requirement-review/service.ts               │
│                                                      │
│  reviewRequirementData(requirement)                   │
│    ├── runLocalReview()        ← 本地规则（同步）       │
│    │   ├── 检查标题 ≥ 5 字符                           │
│    │   ├── 检查描述 ≥ 50 字符                          │
│    │   ├── 检查用户故事格式                             │
│    │   ├── 检查优先级有效值                             │
│    │   ├── 检查故事点数 1-100                          │
│    │   ├── 检查关联系统                                │
│    │   └── 检查BA分配                                 │
│    │                                                  │
│    └── runAiReview()            ← AI审查（异步）       │
│        ├── mapReqTypeToChinese()  枚举→中文            │
│        ├── mapPriorityToChinese()                     │
│        ├── mapSourceChannelToChinese()                │
│        │                                              │
│        └── coze.runWorkflow(REQUIREMENT_REVIEW, {...})│
│            ├── 成功 → 返回 issues/suggestions/score   │
│            │          + optimizedTitle/Description    │
│            │          + acceptanceCriteria            │
│            └── 失败 → 降级（空结果，不阻塞）             │
│                                                      │
│  合并结果 → RequirementReviewResult                   │
│  总分 = localScore × 20% + aiScore × 80%              │
└──────────────────────────────────────────────────────┘
```

### 3.2 Coze 集成

**工作流 ID:** `COZE_REQUIREMENT_REVIEW_WORKFLOW_ID`

**输入参数（传中文枚举值）：**
```typescript
{
  title: string,           // 需求标题
  description: string,     // 需求描述
  priority: string,        // "高"|"中"|"低"|"紧急"
  storyPoints: number,     // 1-100
  reqType: string,         // "功能需求"|"优化"|"缺陷"
  sourceChannel: string,   // "业务需求"|"用户反馈"|"数据分析"|"竞品分析"
  systemId: string,        // 系统ID
  baId: string,            // BA用户ID
}
```

**Coze SDK 调用方式：**
```typescript
// CozeClient.runWorkflow(workflow, parameters)
// SDK 自动将 parameters 包装为 { parameters: {...} }
this.apiClient.workflows.runs.stream({
  workflow_id: workflowId,
  parameters: parameters,
});

// 流式事件处理
for await (const part of res) {
  if (part.event === 'PING')       → 保活心跳，忽略
  if (part.event === 'Message')    → 解析 content JSON → 提取 output 字段
  if (part.event === 'Done')       → 工作流结束，提取最终 output
  if (part.event === 'Error')      → 抛出异常（错误码+调试链接）
}
```

**Coze 输出格式：**
```json
{
  "output": {
    "issues": [...],
    "suggestions": [...],
    "score": 78,
    "optimizedTitle": "...",
    "optimizedDescription": "...",
    "acceptanceCriteria": [...]
  }
}
```

**中文枚举映射：**

| 数据库枚举 | Coze输入中文 |
|-----------|-------------|
| P0 | 紧急 |
| P1 | 高 |
| P2 | 中 |
| P3 | 低 |
| NEW_FEATURE | 功能需求 |
| OPTIMIZATION | 优化 |
| BUG | 缺陷 |
| BUSINESS | 业务需求 |
| USER_FEEDBACK | 用户反馈 |
| DATA_ANALYSIS | 数据分析 |
| COMPETITOR | 竞品分析 |

### 3.3 代码结构映射

| 文件 | 职责 |
|------|------|
| `apps/web/src/components/requirements/RequirementForm.tsx` | 前端：AI审查按钮 + 结果Modal（Tabs布局） |
| `apps/web/src/services/requirement.ts` | 前端：reviewData() API调用 |
| `apps/web/src/services/api.ts` | 前端：Axios实例（timeout: 180s） |
| `apps/server/src/modules/requirement-review/index.ts` | 后端：路由注册（认证+RBAC） |
| `apps/server/src/modules/requirement-review/service.ts` | 后端：审查逻辑（本地规则+AI+Coze调用） |
| `apps/server/src/common/coze/index.ts` | 后端：Coze SDK封装（流式处理） |
| `packages/shared/src/types/review.ts` | 共享：ReviewIssue/ReviewResult类型 |

---

## 四、降级策略

当 AI 审查不可用时（网络异常/Coze服务故障/超时/工作流配置错误），系统自动降级：

| 降级层级 | 触发条件 | 处理方式 |
|---------|---------|---------|
| L1 | Coze API 返回 Error 事件 | catch 异常，返回空结果 |
| L2 | 网络超时 | catch 异常，返回空结果 |
| L3 | Coze 返回格式异常 | 解析失败，返回空结果 |
| L4 | 降级激活 | 本地规则审查正常执行 |
| L5 | 最终输出 | 评分仅用本地规则（100%权重），不展示AI优化内容 |

降级行为对用户透明，不弹错误提示，仅后端记录 warn 日志。

---

## 五、前端实现要点

### 5.1 状态管理

```typescript
// AI审查状态
const [reviewLoading, setReviewLoading] = useState(false);
const [reviewResult, setReviewResult] = useState<{
  issues: ReviewIssue[];
  suggestions: string[];
  score: number;
  passed: boolean;
  optimizedTitle?: string;
  optimizedDescription?: string;
  acceptanceCriteria?: string[];
} | null>(null);
const [showReviewModal, setShowReviewModal] = useState(false);
```

### 5.2 审查触发流程

```typescript
const handleAIReview = async () => {
  // 1. 校验必填字段
  await form.validateFields(['title', 'description', 'systemId', 'priority', 'storyPoints']);
  // 2. 打开Modal + 设置loading
  setReviewResult(null);
  setShowReviewModal(true);
  setReviewLoading(true);
  // 3. 调用API
  const result = await requirementService.reviewData({...formValues});
  // 4. 展示结果
  setReviewResult(result.data);
  setReviewLoading(false);
};
```

### 5.3 Modal 结构

- **审查中：** 居中 spinner + 4步检查动画
- **审查结果：**
  - 评分头部卡片（渐变色 + 圆形badge）
  - AI优化建议区（紫色卡片）
  - Tabs（问题 / 建议 / 验收条件）
  - Footer（复制按钮 + 关闭按钮）

---

## 六、版本记录

| 版本 | 日期 | 修改内容 |
|------|------|---------|
| v1.0 | 2026-05-29 | 初始版本：API设计 + 数据模型 + 架构 + Coze集成 + 降级策略 + 前端实现 |

---

*文档路径：03-需求与设计/Task6-需求审查/设计方案/RT-Task6-需求审查-设计方案_v1.0_20260529.md*
