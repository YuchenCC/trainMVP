# T5 需求变更智能体 — 设计方案

**版本**: v1.0  
**日期**: 2026-05-28  
**状态**: ⏸️ 待审核

---

## 目录

1. [用户故事拆解](#一用户故事拆解)
2. [数据模型设计](#二数据模型设计)
3. [接口设计](#三接口设计)
4. [前端原型](#四前端原型)
5. [Coze 智能体配置](#五coze-智能体配置)
6. [测试案例](#六测试案例)

---

## 一、用户故事拆解

| US | 名称 | 类型 | 工作量 | 说明 |
|----|------|------|--------|------|
| US5.1 | 需求变更记录 API | 服务端 | 3 | ChangeRequest CRUD，变更记录查询 |
| US5.2 | 需求详情-变更记录展示 | 前端 | 1 | 需求详情页新增变更历史时间线 |
| US5.3 | Coze 插件 API | 服务端 | 1 | 为 Coze 插件提供系统查询、需求查询接口 |
| US5.4 | Coze 智能体 Prompt + 工作流 | Coze 平台 | 2 | 变更检测 → 调插件 → 生成分析 → 创建变更单 |
| US5.5 | 飞书发布 + 消息卡片 | Coze 平台 | 1 | 智能体发布到飞书，卡片模板配置 |

### 依赖关系

```
US5.1 (API) ──┬── US5.2 (前端展示)
              └── US5.3 (Coze 插件 API)
                       └── US5.4 (智能体 Prompt)
                                └── US5.5 (飞书发布)
```

---

## 二、数据模型设计

### 2.1 新增表：ChangeRequest（需求变更单）

```prisma
// ========== 需求变更单 ==========
model ChangeRequest {
  id               String        @id @default(cuid())       // 变更单 ID
  changeCode       String        @unique                      // 变更编号，格式 CR-{年份}-{4位序号}
  requirementId    String                                    // 关联需求 ID
  conversation     String?       @db.Text                     // 对话原文（用户 @智能体 的对话内容）
  changeSummary    String?       @db.Text                     // 变更摘要（JSON 或 Markdown）

  // 影响分析
  workloadImpact   String?                                    // 工作量影响（如 "+2人天"）
  scheduleImpact   String?                                    // 进度影响（如 "延期1天"）
  riskLevel        String?       @default("低")              // 风险等级：高/中/低
  riskDescription  String?       @db.Text                     // 风险描述

  // 状态与确认
  status           String        @default("PENDING")          // PENDING → CONFIRMED → EXECUTED
  confirmedBy      String?                                    // 确认人 ID（飞书点确认的用户）
  confirmedAt      DateTime?                                  // 确认时间
  source           String        @default("manual")           // 来源：manual/coze

  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  requirement      Requirement   @relation(fields: [requirementId], references: [id], onDelete: Cascade)

  @@index([requirementId, createdAt(sort: Desc)])
}
```

### 2.2 变更状态机

```
PENDING ──确认──▶ CONFIRMED ──执行──▶ EXECUTED
  │
  └──拒绝──▶ REJECTED
```

### 2.3 与现有模型的关系

```
Requirement (现有)
  ├── StatusLog[] (现有，操作审计)
  └── ChangeRequest[] (新增，变更记录) ← T5 新增
```

现有 `StatusLog` 记录的是**状态流转操作**（创建→评审→纳版→投产），T5 新增的 `ChangeRequest` 记录的是**需求内容变更**（对话→检测→影响分析→确认）。

两者不同：前者是状态机操作日志，后者是需求变更分析记录。

---

## 三、接口设计

### 3.1 US5.1 需求变更记录 API

#### 3.1.1 创建变更单

```
POST /api/requirements/:id/change-requests
```

**请求体**：

```typescript
{
  conversation?: string;      // 对话原文
  changeSummary?: string;     // 变更摘要（Markdown）
  workloadImpact?: string;    // 工作量影响
  scheduleImpact?: string;    // 进度影响
  riskLevel?: string;         // 高/中/低
  riskDescription?: string;   // 风险描述
  source?: string;            // manual/coze，默认 manual
}
```

**响应**：

```typescript
{
  success: true,
  data: {
    id: string;
    changeCode: string;        // 自动生成，如 CR-2026-0001
    requirementId: string;
    status: "PENDING";
    // ... 其他字段
  }
}
```

**权限**: 已登录用户（有变更需求权限的角色）

#### 3.1.2 查询需求变更记录列表

```
GET /api/requirements/:id/change-requests
```

**响应**：

```typescript
{
  success: true,
  data: {
    list: ChangeRequestItem[];  // 按 createdAt 倒序
    total: number;
  }
}

interface ChangeRequestItem {
  id: string;
  changeCode: string;          // CR-2026-0001
  changeSummary: string | null;
  workloadImpact: string | null;
  scheduleImpact: string | null;
  riskLevel: string | null;
  status: string;
  source: string;
  createdAt: string;
  confirmedAt: string | null;
}
```

**权限**: 已登录用户

#### 3.1.3 确认变更单

```
POST /api/change-requests/:id/confirm
```

**请求体**：

```typescript
{
  action: "confirm" | "reject";  // 确认或拒绝
}
```

**响应**：

```typescript
{
  success: true,
  data: {
    id: string;
    status: "CONFIRMED" | "REJECTED";
    confirmedAt: string;
    confirmedBy: string;
  }
}
```

**权限**: 已登录用户（PROJECT_MGR / SUPER_ADMIN）

#### 3.1.4 变更编号生成逻辑

```typescript
// 同需求编号模式，格式：CR-{年份}-{4位序号}
// 在 Prisma 事务内生成，冲突自增重试最多 3 次
async function generateChangeCode(tx: Prisma.TransactionClient, maxRetries = 3): Promise<string> {
  const year = new Date().getFullYear();
  const latest = await tx.changeRequest.findFirst({
    where: { changeCode: { startsWith: `CR-${year}-` } },
    orderBy: { changeCode: 'desc' },
  });
  const nextSeq = latest
    ? parseInt(latest.changeCode.split('-')[2], 10) + 1
    : 1;
  return `CR-${year}-${String(nextSeq).padStart(4, '0')}`;
}
```

### 3.2 US5.3 Coze 插件 API

Coze 插件需要调用以下接口。为插件单独设计 API，使用 API Key 鉴权（非 JWT Session），路径前缀 `/api/plugin/`。

#### 鉴权方式

```
Header: X-Plugin-Key: {PLUGIN_API_KEY}
```

从环境变量 `PLUGIN_API_KEY` 读取，Coze 插件配置中填写。

#### 3.2.1 按系统名查询系统

```
GET /api/plugin/systems?name={systemName}
```

**响应**：

```typescript
{
  success: true,
  data: {
    id: string;
    name: string;
    description: string | null;
    requirementCount: number;   // 系统下的需求总数
  } | null
}
```

**用途**: 智能体从对话中提取系统名后，调用此接口确认系统是否存在。

#### 3.2.2 查询系统下的需求列表

```
GET /api/plugin/systems/{systemId}/requirements?keyword={keyword}
```

**响应**：

```typescript
{
  success: true,
  data: {
    systemName: string;
    requirements: {
      id: string;
      reqCode: string;
      title: string;
      status: string;
      priority: string;
      storyPoints: number;
      baName: string;
      createdAt: string;
    }[];
  }
}
```

**用途**: 智能体获取存量需求，对比变更点。

#### 3.2.3 获取需求详情

```
GET /api/plugin/requirements/{requirementId}
```

**响应**：

```typescript
{
  success: true,
  data: {
    id: string;
    reqCode: string;
    title: string;
    description: string;
    status: string;
    subStatus: string | null;
    priority: string;
    storyPoints: number;
    systemName: string;
    baName: string;
    pmName: string | null;
    dependencies: { reqCode: string; title: string; status: string }[];
    changeRequests: ChangeRequestItem[];   // 变更历史
    createdAt: string;
  }
}
```

#### 3.2.4 创建变更单

```
POST /api/plugin/change-requests
```

**请求体**：

```typescript
{
  requirementId: string;
  conversation?: string;
  changeSummary?: string;
  workloadImpact?: string;
  scheduleImpact?: string;
  riskLevel?: string;
  riskDescription?: string;
}
```

**响应**：同 3.1.1。

---

## 四、前端原型

### 4.1 需求详情页 — 变更记录区域

在现有「操作历史」Timeline 下方新增「变更记录」卡片。

**位置**:

```
┌─ 需求描述 ────────────────────────────┐
├─ 前置依赖 ────────────────────────────┤
├─ 操作历史 ────────────────────────────┤  ← 现有 StatusLog
├─ 变更记录 ────────────────────────────┤  ← T5 新增 ChangeRequest
│  ┌─────────────────────────────────┐  │
│  │ 2026-05-28 14:30  [Coze]        │  │
│  │ 工作量+2人天，进度延期1天       │  │
│  │ 风险：导出功能可能影响报表性能  │  │
│  │ 状态：待确认                     │  │
│  │ ─────────────────────────────── │  │
│  │ 2026-05-28 10:00  [manual]      │  │
│  │ 变更原因：新增 Excel 导出       │  │
│  │ 状态：已确认                     │  │
│  └─────────────────────────────────┘  │
└────────────────────────────────────────┘
```

### 4.2 组件设计

```tsx
// 复用现有 Timeline 组件
<Card title={`变更记录（${changeRequests.length}）`} style={{ marginBottom: 16 }}>
  {changeRequests.length === 0 ? (
    <Text type="secondary">暂无变更记录</Text>
  ) : (
    <Timeline mode="left">
      {changeRequests.map((cr) => (
        <Timeline.Item key={cr.id}>
          <Tag color={cr.source === 'coze' ? 'purple' : 'blue'}>
            {cr.source === 'coze' ? 'Coze 智能体' : '人工'}
          </Tag>
          <Tag color={cr.status === 'PENDING' ? 'orange' : cr.status === 'CONFIRMED' ? 'green' : 'default'}>
            {CHANGE_STATUS_LABELS[cr.status]}
          </Tag>
          <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>
            {cr.changeSummary || '-'}
          </div>
          {cr.workloadImpact && (
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 4 }}>
              工作量: {cr.workloadImpact}
              {cr.scheduleImpact && ` | 进度: ${cr.scheduleImpact}`}
            </div>
          )}
          {cr.riskLevel && (
            <div style={{ color: '#ef4444', fontSize: 12, marginTop: 2 }}>
              ⚠️ {cr.riskLevel}风险: {cr.riskDescription}
            </div>
          )}
          <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>
            {new Date(cr.createdAt).toLocaleString('zh-CN')}
          </div>
        </Timeline.Item>
      ))}
    </Timeline>
  )}
</Card>
```

### 4.3 改动文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `detail.tsx` | 修改 | 新增变更记录卡片，埋入现有操作历史下方 |
| `requirement.ts` (service) | 修改 | 新增 `getChangeRequests` 方法 |
| `@release-train/shared` | 修改 | 新增 `ChangeRequestItem` 类型和 label 常量 |

---

## 五、Coze 智能体配置

### 5.1 系统提示词

```
你是「需求变更助手」，专门帮助产品经理分析和确认需求变更。

## 核心能力
1. 分析对话内容，识别需求变更点（新增/修改/删除/范围/时间/优先级）
2. 调用「版本火车」插件查询存量需求，对比变更前后差异
3. 评估变更影响（工作量、进度、风险）
4. 调用插件创建变更单同步到版本火车系统
5. 生成结构化的变更摘要和确认消息

## 工作流程
1. 从用户对话中提取：系统名称、需求关键词、变更内容
2. 调用 getSystems 查询系统是否存在
3. 调用 getRequirements 获取存量需求列表
4. 对比分析变更点
5. 调用 createChangeRequest 创建变更单
6. 输出：结构化摘要 + 确认卡片

## 输出格式
变更分析结果采用以下 Markdown 格式：

📋 **需求变更分析**
- **系统**: {系统名称}
- **关联需求**: {REQ-2026-XXXX} {需求标题}

| 变更项 | 类型 | 变更前 | 变更后 |
|--------|------|--------|--------|
| ... | 新增/修改/删除 | ... | ... |

**影响评估**
- 工作量: ...
- 进度: ...
- 风险: ⚠️ ...

发送确认卡片到群聊。

## 注意事项
- 如果对话中没有明确的变更，不生成变更单
- 影响评估使用"预计"、"可能"等措辞
```

### 5.2 Coze 工作流节点

```
[开始] → [接收用户消息]
  ↓
[参数提取] — 提取系统名、关键词
  ↓
[插件调用: getSystems] — 查询系统
  ↓
[插件调用: getRequirements] — 查询需求
  ↓
[LLM 分析] — 变更检测 + 影响分析
  ↓
{有变更?}
  ├─ 否 → [回复: 未检测到变更]
  └─ 是 → [插件调用: createChangeRequest]
            ↓
          [飞书消息卡片: 变更确认卡片]
            ↓
          [回复: 分析结果]
```

### 5.3 Coze 插件配置

| 配置项 | 值 |
|--------|-----|
| 插件名称 | 版本火车 API |
| 认证方式 | API Key (Header: X-Plugin-Key) |
| 接口 1 | `GET /api/plugin/systems?name={}` → 查询系统 |
| 接口 2 | `GET /api/plugin/systems/{id}/requirements?keyword={}` → 查询需求 |
| 接口 3 | `GET /api/plugin/requirements/{id}` → 需求详情 |
| 接口 4 | `POST /api/plugin/change-requests` → 创建变更单 |

### 5.4 飞书消息卡片模板

```json
{
  "msg_type": "interactive",
  "card": {
    "header": {
      "title": { "tag": "plain_text", "content": "📋 需求变更确认" }
    },
    "elements": [
      {
        "tag": "markdown",
        "content": "**系统**: 订单管理系统\n**关联需求**: REQ-2026-0042 订单导出功能\n\n**变更内容**:\n- ✅ 新增：Excel 导出格式\n- ✅ 修改：支持多 sheet 导出\n\n**影响评估**:\n- 工作量: +2人天\n- 进度: 预计延期1天至6月20日\n- 风险: ⚠️ 导出大量数据可能影响性能"
      },
      {
        "tag": "hr"
      },
      {
        "tag": "action",
        "actions": [
          {
            "tag": "button",
            "text": { "tag": "plain_text", "content": "✅ 确认变更" },
            "type": "primary",
            "value": { "changeRequestId": "xxx", "action": "confirm" }
          },
          {
            "tag": "button",
            "text": { "tag": "plain_text", "content": "❌ 拒绝" },
            "type": "danger",
            "value": { "changeRequestId": "xxx", "action": "reject" }
          }
        ]
      }
    ]
  }
}
```

按钮回调 → Coze 工作流 → 调用 `POST /api/plugin/change-requests/:id/confirm`

---

## 六、测试案例

### 6.1 US5.1 需求变更记录 API 测试

| 编号 | 测试用例 | 预期结果 |
|------|----------|----------|
| TC5.1.1 | 创建变更单（完整字段） | 200，返回 changeCode 自动生成 |
| TC5.1.2 | 创建变更单（最小字段） | 200，changeSummary/workloadImpact 等为 null |
| TC5.1.3 | 需求不存在时创建 | success:false, code: REQUIREMENT_NOT_FOUND |
| TC5.1.4 | 查询需求变更记录列表 | 200，按时间倒序 |
| TC5.1.5 | 查询无变更记录的需求 | 200，list 为空数组 |
| TC5.1.6 | 确认变更单 | 200，status 变为 CONFIRMED |
| TC5.1.7 | 拒绝变更单 | 200，status 变为 REJECTED |
| TC5.1.8 | 重复确认已确认的变更单 | success:false, 不允许 |
| TC5.1.9 | 未登录访问 | success:false, code: UNAUTHORIZED |
| TC5.1.10 | 变更编号格式 | CR-2026-XXXX，符合规范 |

### 6.2 US5.3 Coze 插件 API 测试

| 编号 | 测试用例 | 预期结果 |
|------|----------|----------|
| TC5.3.1 | 按名称查询系统（存在） | 200，返回系统信息 |
| TC5.3.2 | 按名称查询系统（不存在） | 200，data 为 null |
| TC5.3.3 | 按名称查询系统（模糊匹配） | 200，支持模糊搜索 |
| TC5.3.4 | 查询系统需求列表 | 200，含 keyword 过滤 |
| TC5.3.5 | 查询需求详情 | 200，含依赖和变更记录 |
| TC5.3.6 | 无 X-Plugin-Key 访问 | 200，success:false, UNAUTHORIZED |
| TC5.3.7 | 错误 X-Plugin-Key 访问 | 200，success:false, UNAUTHORIZED |
| TC5.3.8 | 通过插件 API 创建变更单 | 200，source 自动标记为 "coze" |

### 6.3 US5.4~5.5 Coze 智能体测试（手动回归）

| 编号 | 测试用例 | 预期结果 |
|------|----------|----------|
| TC5.4.1 | @智能体 + 明确变更对话 | 输出结构化摘要 + 飞书卡片 |
| TC5.4.2 | @智能体 + 无变更对话 | 输出"未检测到变更" |
| TC5.4.3 | @智能体 + 缺少系统名 | 提示"请提供系统名称" |
| TC5.4.4 | 点击飞书卡片「确认变更」 | 变更单状态更新为 CONFIRMED |
| TC5.4.5 | 点击飞书卡片「拒绝」 | 变更单状态更新为 REJECTED |
| TC5.4.6 | 变更单同步到需求详情页 | 需求详情页「变更记录」可看到该变更单 |

---

**版本记录**

| 版本 | 日期 | 变更说明 |
|------|------|----------|
| v1.0 | 2026-05-28 | 初始版本，T5 完整设计方案 |
