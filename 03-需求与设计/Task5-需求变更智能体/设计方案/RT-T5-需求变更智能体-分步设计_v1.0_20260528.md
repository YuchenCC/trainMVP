# T5 需求变更智能体 — 分步设计

**版本**: v1.0  
**日期**: 2026-05-28  
**状态**: ⏸️ 待审核

---

## 整体流程

```
用户 @需求变更助手 飞书群聊
  【系统】订单管理系统
  【需求概述】导出功能要加 Excel ...
    │
    ▼
┌──────────────────────────────────────────────────┐
│ Step 1 参数提取                                    │
│ Coze 节点：从消息中提取 {系统名, 关键词, 对话原文}    │
└──────────────┬───────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────┐
│ Step 2 系统名模糊查询 → 一步拿到系统 + 需求列表       │
│ 插件调用 GET /api/plugin/systems/search            │
│          ?name=订单管理&keyword=导出                │
│ → 返回：系统信息 + 匹配的需求列表                    │
│   系统不存在 → data: null                          │
└──────────────┬───────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────┐
│ Step 3 获取需求详情                                │
│ 插件调用 GET /api/plugin/requirements/{id}/detail  │
│ → 返回完整信息：                                    │
│   状态=ONBOARDED 子状态=DEV_IN_PROGRESS            │
│   前置依赖 REQ-2026-0030 订单数据接口 [READY]       │
│   被依赖 REQ-2026-0058 数据报表 [DRAFT]             │
│   BA=张三  PM=李四  storyPoints=5                  │
│   所属班次=第3班 封板日=6月20日                     │
└──────────────┬───────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────┐
│ Step 4 智能分析变更                                │
│ LLM 综合对话 + 存量需求信息，生成：                  │
│ - 变更前后对比                                     │
│ - 工作量/进度影响评估                               │
│ - 依赖链风险识别                                   │
│ - 班次容量影响                                     │
└──────────────┬───────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────┐
│ Step 5 创建变更单 + 输出                           │
│ 插件调用 POST /api/plugin/change-requests          │
│ → 创建 ChangeRequest 记录                          │
│ → 输出：Markdown 分析 + 飞书确认卡片               │
└──────────────────────────────────────────────────┘
```

---

## Step 1：参数提取

### 用户输入格式

```
@需求变更助手

【系统】订单管理系统
【需求概述】
业务方：订单导出功能需要支持Excel格式，目前只支持CSV
开发：这个要改导出模块，预计增加2人天
业务方：那6月15日能上线吗？
开发：时间有点紧，可能要延期到6月20日
```

### Coze 节点：提取关键信息

**输入**：用户原始消息  
**输出**：结构化 JSON

```json
{
  "systemName": "订单管理系统",
  "keywords": ["导出", "Excel", "CSV", "延期"],
  "conversation": "业务方：订单导出功能需要支持Excel格式..."
}
```

**节点提示词**：

```
从用户输入提取：
- systemName：【系统】后的内容，必填
- keywords：核心关键词数组，用于匹配需求名称
- conversation：完整对话原文

如果缺少【系统】，输出 { "error": "请使用【系统】XXX 格式指定系统名称" }
如果缺少【需求概述】，输出 { "error": "请使用【需求概述】描述变更内容" }
```

---

## Step 2：系统名模糊查询（合并查系统 + 查需求）

一步到位：用系统名模糊匹配，同时返回系统信息和该系统的需求列表。

### 插件接口

```
GET /api/plugin/systems/search?name={systemName}&keyword={keyword}
Header: X-Plugin-Key: {PLUGIN_API_KEY}
```

**参数**：

| 参数 | 必填 | 说明 |
|------|------|------|
| name | ✅ | 系统名称，模糊匹配 (contains) |
| keyword | ❌ | 需求标题/编号关键词，模糊匹配 |

### 响应

```json
// 系统存在，且有匹配需求
{
  "success": true,
  "data": {
    "system": {
      "id": "cuid_xxx",
      "name": "订单管理系统",
      "description": "订单全生命周期管理"
    },
    "requirements": [
      {
        "id": "cuid_xxx",
        "reqCode": "REQ-2026-0042",
        "title": "订单导出功能优化",
        "status": "ONBOARDED",
        "subStatus": "DEV_IN_PROGRESS",
        "priority": "P1",
        "storyPoints": 5,
        "baName": "张三"
      },
      {
        "id": "cuid_yyy",
        "reqCode": "REQ-2026-0058",
        "title": "订单数据报表",
        "status": "DRAFT",
        "subStatus": null,
        "priority": "P2",
        "storyPoints": 8,
        "baName": "李四"
      }
    ]
  }
}

// 系统不存在
{
  "success": true,
  "data": null
}
```

### Coze 节点处理

```
if data == null:
    → 输出 "未找到系统「{systemName}」，请确认系统名称"
    → 终止

if data.requirements 为空:
    → 输出 "系统「{systemName}」下未找到与「{keyword}」相关的需求"
    → 终止

else:
    → 根据关键词相似度匹配最相关需求 → 取其 id
    → 如果匹配结果 > 1，取第一个（或展示候选让用户确认）
    → 进入 Step 3
```

---

## Step 3：获取需求详情

### 插件接口

```
GET /api/plugin/requirements/{requirementId}/detail
Header: X-Plugin-Key: {PLUGIN_API_KEY}
```

### 响应

```json
{
  "success": true,
  "data": {
    "id": "cuid_xxx",
    "reqCode": "REQ-2026-0042",
    "title": "订单导出功能优化",
    "description": "当前支持 CSV 格式导出，业务方要求扩展支持 Excel 导出...",
    "status": "ONBOARDED",
    "subStatus": "DEV_IN_PROGRESS",
    "priority": "P1",
    "storyPoints": 5,
    "reqType": "OPTIMIZATION",
    "systemName": "订单管理系统",
    "baName": "张三",
    "pmName": "李四",

    "schedule": {
      "id": "schedule_xxx",
      "name": "第3班",
      "status": "IN_PROGRESS",
      "lockdownDate": "2026-06-20",
      "releaseDate": "2026-07-01"
    },

    "dependencies": [
      {
        "id": "dep_001",
        "reqCode": "REQ-2026-0030",
        "title": "订单数据接口重构",
        "status": "READY",
        "subStatus": null,
        "relation": "upstream"
      },
      {
        "id": "dep_002",
        "reqCode": "REQ-2026-0058",
        "title": "订单数据报表",
        "status": "DRAFT",
        "subStatus": null,
        "relation": "downstream"
      }
    ],

    "statusHistory": [
      { "from": "DRAFT", "to": "PENDING_REVIEW", "time": "2026-05-10" },
      { "from": "PENDING_REVIEW", "to": "READY", "time": "2026-05-12" },
      { "from": "READY", "to": "ONBOARDED", "time": "2026-05-15" }
    ],

    "createdAt": "2026-05-08T10:00:00Z"
  }
}
```

### 字段说明

| 字段 | 用途（给 AI 分析用） |
|------|---------------------|
| status + subStatus | 判断需求当前阶段（开发中/SIT/UAT/封板），决定变更影响面 |
| dependencies | 上游依赖没就绪不能改？下游依赖被阻塞要通知谁？ |
| schedule | 封板日期临近？变更可能导致延期？ |
| storyPoints | 变更工作量预测的基准 |

---

## Step 4：智能分析变更

### LLM 分析提示词

```
你是需求变更分析专家。请根据以下信息生成变更分析报告。

## 对话原文
{conversation}

## 存量需求信息
需求编号：{reqCode}
需求标题：{title}
当前状态：{status} - {subStatusLabel}
工作量：{storyPoints} 点
负责人：BA={baName}, PM={pmName}
所属班次：{scheduleName}，封板日 {lockdownDate}
前置依赖：{dependencies}
下游影响：{downstreamDeps}
历史流转：DRAFT → PENDING_REVIEW → READY → ONBOARDED(开发中)

## 分析要求

### 1. 变更识别
从对话中识别变更点，按以下分类：
- 新增功能/范围扩大 → workloadImpact 增加
- 修改实现方式 → 需要评估技术风险
- 删除/缩减范围 → workloadImpact 减少
- 时间变更 → scheduleImpact
- 优先级变更 → 影响纳版决策

### 2. 影响评估
- 工作量：基于当前 storyPoints(5) 估算变更后的工作量变化
- 进度：对比封板日(2026-06-20)，评估是否会导致延期
- 依赖风险：上游 READY 状态的依赖如果也要改，会产生连锁影响
- 下游阻塞：下游 DRAFT 状态的需求如果依赖本需求，变更会延迟它们

### 3. 输出格式
输出 Markdown：

📋 **需求变更分析 — {reqCode} {title}**

| 变更项 | 类型 | 变更前 | 变更后 | 影响 |
|--------|------|--------|--------|------|
| ... | 新增 | - | ... | +X人天 |

**影响评估**
- 工作量变化：+X 人天
- 进度影响：预计延期 X 天
- 风险等级：高/中/低
- ⚠️ 上游依赖 {depReqCode} 状态为 {depStatus}，如果也需要变更...
- ⚠️ 下游 {downCount} 个需求依赖本需求...

**建议**
- ...
```

---

## Step 5：创建变更单 + 输出

### 创建变更单 — 插件接口

```
POST /api/plugin/change-requests
Header: X-Plugin-Key: {PLUGIN_API_KEY}

{
  "requirementId": "cuid_xxx",
  "conversation": "业务方：订单导出功能需要支持Excel格式...",
  "changeSummary": "📋 **需求变更分析 — REQ-2026-0042...",
  "workloadImpact": "+2人天",
  "scheduleImpact": "预计延期1天至6月21日",
  "riskLevel": "中",
  "riskDescription": "上游依赖 REQ-2026-0030 状态为 READY..."
}
```

**响应**：

```json
{
  "success": true,
  "data": {
    "id": "cr_xxx",
    "changeCode": "CR-2026-0001",
    "status": "PENDING"
  }
}
```

### 最终输出给用户

```
📋 **需求变更分析 — REQ-2026-0042 订单导出功能优化**

**当前状态**: 已纳版 · 开发中（第3班，封板日 6月20日）

| 变更项 | 类型 | 变更前 | 变更后 | 影响 |
|--------|------|--------|--------|------|
| 导出格式 | 新增 | 仅 CSV | 支持 Excel | +2人天 |

**影响评估**
- 工作量变化: +2人天（当前 5 点，预计增至 8 点）
- 进度影响: 可能延期 1 天（封板日 6月20日 → 6月21日）
- 风险等级: ⚠️ 中风险
- ⚠️ 下游 REQ-2026-0058「订单数据报表」依赖本需求（当前 DRAFT），变更将影响其启动时间
- ⚠️ 上游 REQ-2026-0030「订单数据接口」状态 READY，需确认其导出接口是否需要同步修改

**变更单已创建**: CR-2026-0001

---

> 💬 确认卡片已发送至群聊，请 @李四 确认变更
```

---

## 数据模型

### ChangeRequest 表

```prisma
model ChangeRequest {
  id               String        @id @default(cuid())
  changeCode       String        @unique                    // CR-2026-0001
  requirementId    String
  systemId         String                                    // 冗余，加速查询
  conversation     String?       @db.Text                   // 对话原文
  changeSummary    String?       @db.Text                   // AI 生成的 Markdown 分析
  workloadImpact   String?                                   // "+2人天"
  scheduleImpact   String?                                   // "延期1天"
  riskLevel        String?       @default("低")             // 高/中/低
  riskDescription  String?       @db.Text
  status           String        @default("PENDING")        // PENDING → CONFIRMED → EXECUTED → REJECTED
  source           String        @default("coze")           // coze/manual
  confirmedBy      String?
  confirmedAt      DateTime?
  createdAt        DateTime      @default(now())

  requirement      Requirement   @relation(fields: [requirementId], references: [id], onDelete: Cascade)
  system           System        @relation(fields: [systemId], references: [id])

  @@index([requirementId, createdAt(sort: Desc)])
  @@index([systemId])
}
```

---

## 需要开发的接口汇总

| # | 路由 | 用途 | Step |
|---|------|------|------|
| 1 | `GET /api/plugin/systems/search?name=&keyword=` | 系统名模糊查询 → 系统信息 + 需求列表 | Step 2 |
| 2 | `GET /api/plugin/requirements/:id/detail` | 需求完整详情（含依赖/班次/历史） | Step 3 |
| 3 | `POST /api/plugin/change-requests` | 创建变更单 | Step 5 |

> 全部使用 Header `X-Plugin-Key` 鉴权（环境变量 `PLUGIN_API_KEY`），  
> 不要求 JWT，因为调用方是 Coze 工作流而不是浏览器用户。

---

## Coze 配置清单

| 配置层 | 内容 |
|--------|------|
| 插件 | 3 个 API 端点 → 认证方式 API Key → OpenAPI schema |
| 人设 | 需求变更分析专家，按 Step 4 提示词 |
| 工作流 | 提取参数 → 模糊查询系统+需求 → 获取详情 → LLM 分析 → 创建变更单 → 飞书卡片 |

---

## 前端改动

需求详情页 (`detail.tsx`) 操作历史下方新增「变更记录」卡片，复用现有 `Timeline` 组件展示 `ChangeRequest` 列表。

---

**版本记录**

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0 | 2026-05-28 | 分步设计，6步流程映射到 4 个插件 API |
