# 智能纳版（AI Agent 排期建议）设计方案

**版本号**: v1.1
**日期**: 2026-05-24
**变更**: 基于功能测试优化 Prompt + 后端预处理（循环依赖检测、canAccommodate 精确计算）

---

## 变更记录

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v1.0 | 2026-05-24 | 初版设计 |
| v1.1 | 2026-05-24 | Prompt 优化 + 后端预处理（详见 [COZE_PROMPT_OPTIMIZED_v1.1.md](./COZE_PROMPT_OPTIMIZED_v1.1.md)） |

---

## 功能概述

根据用户手动选择的需求列表，结合容量限制、优先级排序、依赖关系，自动生成智能纳版建议列表，支持用户调整顺序后确认纳版。

---

## 1. Coze Bot 配置

### 1.1 Bot 基础信息

| 配置项 | 值 |
|--------|-----|
| **Bot 名称** | 版本火车智能纳版顾问 |
| **Bot 描述** | 专业的版本火车项目经理，根据容量、优先级和依赖关系，智能生成最优纳版建议 |
| **头像** | 🚂 (或自定义版本火车相关头像) |
| **打招呼消息** | 你好！我是版本火车智能纳版顾问，请提供班次容量信息和需求列表，我将为你生成纳版建议！ |

### 1.2 Coze Prompt 配置

**角色设定（Persona）**

```markdown
你是一位专业的版本火车项目经理（Release Train Manager），擅长需求优先级排序和纳版计划制定。

## 核心能力
1. **容量评估**：根据班次总容量和已使用容量，计算剩余可用容量
2. **优先级排序**：遵循 P0 > P1 > P2 > P3 的优先级原则
3. **依赖关系处理**：确保依赖需求在被依赖需求之后纳版
4. **容量分配**：根据需求的故事点数（Story Points）分配容量

## 输入数据
班次信息：{{trainSchedule}}
- 班次名称：trainScheduleName
- 总容量：totalCapacity
- 已使用容量：usedCapacity
- 剩余容量：remainingCapacity

### 需求列表
你需要处理的内容来自用户传入的列表变量{{selectedRequirements}}，如果不为空，则看列表每一项包含：
- 需求编号：reqCode
-需求名称：title
  - 优先级：priority
  - 故事点数：storyPoints
  - 归属系统：system
  - 状态：status
  - 依赖需求列表： dependencies，如果不为空，则处理列表每一项包含：
  - - 依赖需求编号depReqCode：依赖需求名称depTitle
  - - 依赖优先级：depPriority
  - - 依赖故事点数：depStoryPoints
  - - 状态：depStatus
补充要求：请不要遗漏列表里的任何符合条件的元素，不要编造不存在的信息。



## 处理规则

### 1. 容量检查
- 计算所有选中需求的总故事点数
- 如果总点数 > 剩余容量，标记容量预警
- 按故事点数从大到小排序，优先安排大需求

### 2. 优先级排序
排序优先级：
1. P0（最高）：线上故障/业务阻断，必须优先纳版
2. P1（高）：核心功能/重要需求
3. P2（中）：常规需求
4. P3（低）：优化/体验类需求

同优先级内按故事点数降序排列（点数大的优先）

### 3. 依赖关系处理
对于 A 依赖 B 的情况：
- 如果 B 尚未纳版（状态不是 ONBOARDED 或 RELEASED），建议将 B 排在 A 之前
- 如果 B 已纳版或已投产，A 可以正常纳版
- 如果 B 已取消或草稿，标记风险提示

### 4. 智能建议生成
生成建议时考虑：
- 容量约束：不超过班次剩余容量
- 优先级：严格遵循 P0 > P1 > P2 > P3
- 依赖关系：拓扑排序，确保依赖链正确
- 均衡分配：避免单个系统独占容量

## 输出要求

输出纳版需求，并转换成以下 JSON 格式输出，不要添加任何额外文字说明：
{"output":

{
  "success": true,
  "analysis": {
    "totalSelected": 选中需求总数,
    "totalStoryPoints": 总故事点数,
    "remainingCapacity": 班次剩余容量,
    "canAccommodate": true或false,
    "exceededBy": 超出点数或null
  },
  "suggestions": [
    {
      "order": 1,
      "id": "需求ID",
      "reqCode": "需求编号",
      "title": "需求标题",
      "priority": "P0/P1/P2/P3",
      "storyPoints": 点数,
      "system": "归属系统",
      "status": "状态",
      "suggestion": "recommended",
      "reason": "建议理由"
    }
  ],
  "warnings": [
    {
      "type": "capacity_exceeded或dependency_risk或cycle_dependency",
      "reqCode": "相关需求编号（可选）",
      "message": "警告信息"
    }
  ],
  "summary": "总结说明"
}}

```

**技能配置（Skills）** - 无需额外技能，纯自然语言处理

### 1.3 Coze 工作流配置（Workflow）

创建一个名为 `SmartOnboardWorkflow` 的工作流：

#### 节点 1：数据输入（Start Node）
- **节点类型**：Start
- **输入参数**：
  - `trainSchedule`: Object（班次容量信息）
  - `selectedRequirements`: Array（需求列表）

#### 节点 2：调用 LLM
- **节点类型**：LLM
- **模型选择**：ByteDance 豆包模型（推荐 `doubao-pro-32k`）
- **系统提示词**：（使用上面的角色设定）
- **用户提示词**：
```
请根据以下数据生成纳版建议：

班次信息：
{trainSchedule}

需求列表：
{selectedRequirements}

请按照以下 JSON 格式输出：
{
  "success": true,
  "analysis": {
    "totalSelected": 数量,
    "totalStoryPoints": 总点数,
    "remainingCapacity": 剩余容量,
    "isCapacityExceeded": 是否超限,
    "exceededBy": 超出点数
  },
  "suggestions": [
    {
      "order": 序号,
      "reqCode": "需求编号",
      "title": "需求标题",
      "priority": "P0/P1/P2/P3",
      "storyPoints": 点数,
      "system": "归属系统",
      "suggestion": "recommended/optional/not_recommended",
      "reason": "建议理由"
    }
  ],
  "warnings": [
    {
      "type": "capacity_exceeded/dependency_risk/priority_conflict",
      "reqCode": "需求编号",
      "message": "警告信息"
    }
  ],
  "summary": "总结说明"
}
```

#### 节点 3：输出格式化（End Node）
- **节点类型**：End
- **输出**：返回 LLM 生成的 JSON 数据

### 1.4 Coze API 配置

创建一个名为 `generate_suggestions` 的 API 插件：

**API 名称**：generate_suggestions

**API 描述**：根据班次容量和需求列表生成智能纳版建议

**请求格式**：
```
POST /api/smart-onboard/generate
Content-Type: application/json

{
  "trainSchedule": {
    "name": "2026年Q2第1班",
    "totalCapacity": 100,
    "usedCapacity": 65,
    "remainingCapacity": 35
  },
  "selectedRequirements": [
    {
      "id": "req-001",
      "reqCode": "REQ-2026-0001",
      "title": "用户登录优化",
      "priority": "P0",
      "storyPoints": 8,
      "system": "用户中心",
      "status": "READY",
      "dependencies": [
        {
          "id": "req-003",
          "reqCode": "REQ-2026-0003",
          "title": "基础权限模块",
          "priority": "P0",
          "storyPoints": 5,
          "status": "READY"
        }
      ]
    }
  ]
}
```

**响应格式**：
```json
{
  "success": true,
  "data": {
    "analysis": {
      "totalSelected": 10,
      "totalStoryPoints": 85,
      "remainingCapacity": 35,
      "isCapacityExceeded": true,
      "exceededBy": 50
    },
    "suggestions": [...],
    "warnings": [...],
    "summary": "..."
  }
}
```

### 1.5 Coze 配置步骤

1. **创建 Bot**
   - 登录 Coze 平台
   - 点击「创建 Bot」
   - 填写基础信息（名称、描述、头像）

2. **配置 LLM**
   - 在「模型」页面选择豆包模型
   - 复制粘贴角色设定到系统提示词
   - 设置温度参数为 0.7

3. **创建工作流**（可选，复杂场景用）
   - 在「工作流」页面创建新工作流
   - 添加 Start → LLM → End 节点
   - 配置输入输出参数

4. **部署 Bot**
   - 在「发布」页面选择部署目标
   - 可部署为 API 供后端调用

---

## 2. API 接口设计

### 2.1 请求数据模型

```typescript
/**
 * 智能纳版请求参数
 */
interface SmartOnboardRequest {
  trainScheduleId: string;           // 班次ID
  selectedRequirementIds: string[]; // 用户选择的需求ID列表
  options?: {
    maxSuggestions?: number;       // 最大建议数量（默认10）
    allowPartial?: boolean;       // 允许部分纳版（容量不足时）
  };
}

/**
 * 需求信息（传给AI）
 */
interface RequirementInfo {
  id: string;
  reqCode: string;
  title: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  storyPoints: number;
  system: string;
  status: string;
  dependencies: DependencyInfo[];
}

/**
 * 依赖需求信息
 */
interface DependencyInfo {
  id: string;
  reqCode: string;
  title: string;
  priority: string;
  storyPoints: number;
  status: string;
}

/**
 * 班次容量信息
 */
interface TrainScheduleCapacity {
  id: string;
  name: string;
  totalCapacity: number;
  usedCapacity: number;
  remainingCapacity: number;
}
```

### 2.2 响应数据模型

```typescript
/**
 * 智能纳版响应结果
 */
interface SmartOnboardResponse {
  success: boolean;
  data?: {
    analysis: {
      totalSelected: number;          // 选中的需求总数
      totalStoryPoints: number;       // 选中需求的总故事点数
      remainingCapacity: number;       // 班次剩余容量
      isCapacityExceeded: boolean;     // 是否超过容量
      exceededBy?: number;            // 超出多少点
    };
    suggestions: SuggestionItem[];     // 纳版建议列表
    warnings: WarningItem[];           // 警告信息
    summary: string;                   // 总结说明
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * 纳版建议项
 */
interface SuggestionItem {
  order: number;                      // 推荐顺序
  reqCode: string;                    // 需求编号
  title: string;                      // 需求标题
  priority: string;                   // 优先级
  storyPoints: number;               // 故事点数
  system: string;                    // 归属系统
  suggestion: 'recommended' | 'optional' | 'not_recommended';
  reason: string;                    // 建议理由
}

/**
 * 警告信息项
 */
interface WarningItem {
  type: 'capacity_exceeded' | 'dependency_risk' | 'priority_conflict';
  reqCode?: string;
  message: string;
}
```

### 2.3 API 端点设计

```
POST /api/smart-onboard/suggest
Content-Type: application/json
Authorization: Bearer {token}

请求体：
{
  "trainScheduleId": "schedule-001",
  "selectedRequirementIds": ["req-001", "req-002", "req-003"],
  "options": {
    "maxSuggestions": 10,
    "allowPartial": true
  }
}

响应：
{
  "success": true,
  "data": {
    "analysis": {
      "totalSelected": 3,
      "totalStoryPoints": 20,
      "remainingCapacity": 35,
      "isCapacityExceeded": false
    },
    "suggestions": [
      {
        "order": 1,
        "reqCode": "REQ-2026-0001",
        "title": "用户登录优化",
        "priority": "P0",
        "storyPoints": 8,
        "system": "用户中心",
        "suggestion": "recommended",
        "reason": "P0优先级，无前置依赖"
      }
    ],
    "warnings": [],
    "summary": "建议优先纳版P0需求"
  }
}
```

---

## 3. 前端交互设计

### 3.1 功能入口

**位置**：仪表盘页面 → 智能纳版入口卡片

**UI 设计**：
```
┌────────────────────────────────────────────┐
│  🚀 智能纳版建议                           │
│                                            │
│  根据容量、优先级和依赖关系，                │
│  AI 智能生成最优纳版方案                    │
│                                            │
│  [ 开始智能纳版 →]                         │
└────────────────────────────────────────────┘
```

### 3.2 选择需求页面

**功能**：用户手动勾选要参与纳版的待纳版需求

**UI 布局**：
```
┌──────────────────────────────────────────────────────────┐
│  📋 选择参与纳版的需求                                    │
│                                                          │
│  筛选：[全部系统 ▼] [全部状态 ▼] [搜索... 🔍]            │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ ☐ REQ-2026-0001  用户登录优化    P0  8点  用户中心 │  │
│  │   依赖: REQ-2026-0003 (基础权限模块)               │  │
│  ├────────────────────────────────────────────────────┤  │
│  │ ☑ REQ-2026-0002  订单列表优化    P1  5点  订单系统 │  │
│  │   无依赖                                            │  │
│  ├────────────────────────────────────────────────────┤  │
│  │ ☐ REQ-2026-0003  基础权限模块    P0  5点  用户中心 │  │
│  │   无依赖                                            │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  已选择: 2 个需求, 共 13 点                             │
│  剩余容量: 35 点                                         │
│                                                          │
│                              [下一步：生成建议 →]        │
└──────────────────────────────────────────────────────────┘
```

**交互说明**：
- 复选框选择需求
- 显示依赖关系提示（如果有前置依赖）
- 实时统计已选需求的故事点数
- 与班次剩余容量对比，超出时提示

### 3.3 纳版建议页面

**功能**：展示 AI 生成的纳版建议列表，支持拖拽排序

**UI 布局**：
```
┌──────────────────────────────────────────────────────────┐
│  📊 智能纳版建议                                         │
│                                                          │
│  📈 分析结果                                             │
│  ├─ 选中需求: 3 个                                      │
│  ├─ 总故事点数: 20 点                                   │
│  ├─ 班次剩余容量: 35 点                                 │
│  └─ 容量状态: ✅ 正常（剩余 15 点）                     │
│                                                          │
│  💡 建议列表（可拖拽调整顺序）                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │ ⋮ 1. REQ-2026-0003  基础权限模块  P0  5点  用户中心│  │
│  │   理由: P0优先级，无前置依赖，建议优先纳版          │  │
│  ├────────────────────────────────────────────────────┤  │
│  │ ⋮ 2. REQ-2026-0001  用户登录优化  P0  8点  用户中心│  │
│  │   理由: P0优先级，依赖需求(0003)已建议纳版          │  │
│  ├────────────────────────────────────────────────────┤  │
│  │ ⋮ 3. REQ-2026-0002  订单列表优化  P1  5点  订单系统│  │
│  │   理由: P1优先级，无前置依赖                        │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ⚠️ 警告: 无                                            │
│                                                          │
│  📝 总结: 建议优先纳版2个P0需求共13点，可充分利用容量   │
│                                                          │
│  [上一步]              [导出建议]  [确认纳版 →]          │
└──────────────────────────────────────────────────────────┘
```

**交互说明**：
- 拖拽排序：用户可调整建议顺序
- 显示建议理由：说明为什么这样排序
- 容量实时更新：拖拽后自动重新计算
- 警告提示：容量超限或依赖风险时显示

### 3.4 确认纳版页面

**功能**：展示最终纳版清单，用户确认后执行批量纳版

**UI 布局**：
```
┌──────────────────────────────────────────────────────────┐
│  ✅ 确认纳版                                            │
│                                                          │
│  即将为以下需求执行批量纳版到 "2026年Q2第1班":          │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 1. REQ-2026-0003  基础权限模块  P0  5点          │  │
│  │ 2. REQ-2026-0001  用户登录优化  P0  8点          │  │
│  │ 3. REQ-2026-0002  订单列表优化  P1  5点          │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  纳版后班次容量: 已使用 78/100 点                       │
│                                                          │
│  [取消]                    [确认批量纳版]               │
└──────────────────────────────────────────────────────────┘
```

---

## 4. 后端服务设计

### 4.1 服务流程

```
用户选择需求
    ↓
前端调用 POST /api/smart-onboard/suggest
    ↓
后端查询班次容量信息
    ↓
后端查询选中需求的详细信息（含依赖关系）
    ↓
组装数据调用豆包 API
    ↓
解析 AI 返回的建议
    ↓
返回结构化建议列表
    ↓
前端展示可排序的纳版建议
    ↓
用户调整顺序后确认
    ↓
调用批量纳版 API
    ↓
更新需求的 scheduleId 和状态
```

### 4.2 关键实现点

#### 4.2.1 数据查询优化
```typescript
// 批量查询需求的依赖关系
async function getRequirementsWithDependencies(ids: string[]) {
  return prisma.requirement.findMany({
    where: { id: { in: ids } },
    include: {
      dependencies: {
        include: {
          dependency: true  // 包含被依赖的需求详情
        }
      }
    }
  });
}
```

#### 4.2.2 后端预处理（v1.1 新增）

Coze/LLM 在处理以下场景时存在短板，改为后端代码兜底：

**① 循环依赖检测（DFS 图算法）**

LLM 不擅长图论判断，改用 DFS 检测选中需求中的循环依赖：

```typescript
function detectCycleDependencies(requirements: RequirementForAI[]): OnboardWarning[] {
  // 用 visited + recStack 双重标记做 DFS 环检测
  // 发现环时生成 type=cycle_dependency 的警告
}
```

**② canAccommodate 精确计算**

AI 对 `canAccommodate` 的语义理解不稳定（有时理解为"部分可纳版"），改为后端直接计算：

```typescript
const totalStoryPoints = requirements.reduce((sum, r) => sum + r.storyPoints, 0);
const realCanAccommodate = totalStoryPoints <= schedule.remainingCapacity;
// exceededBy = realCanAccommodate ? 0 : (totalStoryPoints - remainingCapacity)
```

**③ 警告合并**

后端检测到的循环依赖警告与 Coze 返回的容量/依赖警告合并输出。

代码位置：`apps/server/src/modules/smart-onboard/service.ts:generateOnboardSuggestions()`

#### 4.2.3 Coze API 调用

Coze 提供 REST API 接口，可直接调用。

```typescript
/**
 * Coze API 客户端
 */
class CozeClient {
  private apiKey: string;
  private botId: string;
  private baseUrl: string = 'https://api.coze.cn';

  constructor(config: { apiKey: string; botId: string }) {
    this.apiKey = config.apiKey;
    this.botId = config.botId;
  }

  /**
   * 调用 Coze Bot 生成纳版建议
   */
  async generateSuggestions(
    trainSchedule: TrainScheduleCapacity,
    requirements: RequirementInfo[]
  ): Promise<SmartOnboardResponse> {
    try {
      // 构建用户消息
      const userMessage = this.buildUserMessage(trainSchedule, requirements);

      // 调用 Coze API
      const response = await fetch(`${this.baseUrl}/open_api/v2/chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          bot_id: this.botId,
          user: 'version-train-system',
          conversation_id: this.generateConversationId(),
          stream: false,  // 非流式响应
          auto_save_history: false,
          additional_messages: [
            {
              role: 'user',
              content: JSON.stringify(userMessage),
              content_type: 'text'
            }
          ]
        })
      });

      if (!response.ok) {
        throw new Error(`Coze API 请求失败: ${response.status}`);
      }

      const result = await response.json();
      return this.parseCozeResponse(result);

    } catch (error) {
      logger.error('Coze API 调用失败', { error });
      throw new Error('AI服务暂时不可用，请稍后重试');
    }
  }

  /**
   * 构建用户消息
   */
  private buildUserMessage(
    trainSchedule: TrainScheduleCapacity,
    requirements: RequirementInfo[]
  ) {
    return {
      trainSchedule,
      selectedRequirements: requirements
    };
  }

  /**
   * 解析 Coze 返回的响应
   */
  private parseCozeResponse(cozeResult: any): SmartOnboardResponse {
    // Coze 返回格式
    // {
    //   messages: [
    //     { role: 'assistant', type: 'answer', content: '...' }
    //   ]
    // }
    const assistantMessage = cozeResult.messages?.find(
      (msg: any) => msg.role === 'assistant' && msg.type === 'answer'
    );

    if (!assistantMessage) {
      throw new Error('AI 响应格式错误');
    }

    // 尝试从 content 中解析 JSON
    try {
      const content = assistantMessage.content;
      // 清理内容，提取 JSON 部分
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('无法提取 JSON 响应');
      }
      return JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      logger.error('解析 AI 响应失败', { content: assistantMessage.content, parseError });
      throw new Error('AI 响应解析失败');
    }
  }

  private generateConversationId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 导出单例
let cozeClient: CozeClient | null = null;

export function getCozeClient(): CozeClient {
  if (!cozeClient) {
    cozeClient = new CozeClient({
      apiKey: process.env.COZE_API_KEY || '',
      botId: process.env.COZE_BOT_ID || ''
    });
  }
  return cozeClient;
}
```

**Coze API 环境变量配置**

在 `.env` 文件中添加：

```env
# Coze API 配置
COZE_API_KEY=pat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
COZE_BOT_ID=xxxxxxxxxxxxxxxxxxxxxxxx
```

**获取 Coze Bot ID 的步骤**：
1. 在 Coze 平台创建 Bot
2. 在 Bot 「设置」页面找到 Bot ID
3. 在 Coze 「API 管理」页面创建个人访问令牌（PAT）

#### 4.2.3 批量纳版实现
```typescript
async function batchOnboard(reqIds: string[], scheduleId: string) {
  return prisma.$transaction(async (tx) => {
    const results = await Promise.all(
      reqIds.map(id =>
        tx.requirement.update({
          where: { id },
          data: {
            scheduleId,
            status: 'ONBOARDED',
            subStatus: 'DEV_IN_PROGRESS'
          }
        })
      )
    );

    // 更新班次容量
    const totalPoints = results.reduce((sum, r) => sum + r.storyPoints, 0);
    await tx.trainSchedule.update({
      where: { id: scheduleId },
      data: {
        usedCapacity: { increment: totalPoints }
      }
    });

    return results;
  });
}
```

---

## 5. 数据库模型扩展

### 5.1 新增表：纳版建议记录

```prisma
// 智能纳版建议记录
model OnboardSuggestion {
  id              String    @id @default(cuid())
  trainScheduleId String    // 班次ID
  userId          String    // 操作用户ID
  totalSelected   Int       // 选中需求数
  totalPoints     Int       // 总故事点数
  suggestions     Json      // AI 返回的建议列表（JSON）
  warnings        Json      // 警告列表（JSON）
  summary         String    // AI 生成的总结
  createdAt       DateTime  @default(now())

  trainSchedule   TrainSchedule @relation(fields: [trainScheduleId], references: [id])
  user            User         @relation(fields: [userId], references: [id])

  @@index([trainScheduleId])
  @@index([userId])
}
```

---

## 6. 错误处理

### 6.1 AI 服务异常
```typescript
// 降级策略：使用规则引擎
if (aiServiceUnavailable) {
  logger.warn('AI服务不可用，降级为规则引擎');
  return generateByRuleEngine(requirements);
}
```

### 6.2 容量超限处理
```typescript
if (totalPoints > remainingCapacity) {
  // 返回警告但不阻止操作
  warnings.push({
    type: 'capacity_exceeded',
    message: `容量超出 ${totalPoints - remainingCapacity} 点，建议减少需求或调整班次容量`
  });
}
```

### 6.3 循环依赖检测
```typescript
// AI 返回后，后端再次验证依赖关系
const hasCycle = detectCycleDependencies(selectedRequirements);
if (hasCycle) {
  throw new Error('检测到循环依赖，请检查需求依赖关系');
}
```

---

## 7. 安全考虑

### 7.1 权限控制
- 仅 `BA` 和 `PM` 角色可使用智能纳版功能
- 需校验用户是否有权限操作目标班次

### 7.2 输入校验
```typescript
const schema = {
  trainScheduleId: { type: 'string', required: true },
  selectedRequirementIds: {
    type: 'array',
    items: { type: 'string' },
    maxItems: 50,  // 最多50个需求
    required: true
  }
};
```

### 7.3 审计日志
```typescript
// 记录纳版建议操作
await statusLogService.log({
  operationType: 'SMART_ONBOARD_SUGGEST',
  requirementIds: selectedRequirementIds,
  aiResponse: suggestions,
  userId: currentUser.id
});
```

---

## 8. 性能优化

### 8.1 缓存策略
- 班次容量信息：缓存 5 分钟
- 需求列表：实时查询（数据敏感度高）

### 8.2 AI 调用优化
- 超时设置：10 秒
- 重试机制：最多 2 次
- 降级策略：AI 不可用时使用规则引擎

### 8.3 前端优化
- 虚拟滚动：需求列表超过 100 条时启用
- 懒加载：拖拽列表延迟渲染

---

## 9. 测试计划

### 9.1 单元测试
- 规则引擎逻辑测试
- 依赖关系检测测试
- 容量计算测试

### 9.2 集成测试
- AI API 集成测试
- 批量纳版事务测试
- 权限控制测试

### 9.3 E2E 测试
- 完整用户流程测试
- 异常场景测试（容量超限、依赖冲突）

---

## 10. 后续优化方向

1. **历史学习**：积累历史纳版数据，训练 AI 模型
2. **智能容量建议**：AI 预测最优班次容量
3. **冲突检测**：实时检测需求间的技术冲突
4. **多维度排序**：增加系统均衡、资源平衡等维度

---

*文档版本：v1.0*
*创建时间：2026-05-24*
*作者：AI Assistant*
