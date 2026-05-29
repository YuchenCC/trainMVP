# CoZe 需求变更智能体 - 完整配置流程

## 📋 配置前准备

### 需要准备的材料

| 材料 | 用途 | 获取方式 |
|-----|------|---------|
| 飞书账号 | 发布智能体 | 飞书App注册 |
| 版本火车系统 API 地址 | 插件配置 | 你的系统提供 |
| API Token | 接口认证 | 版本火车系统生成 |

---

## 第一步：创建智能体

### 1.1 登录 CoZe 平台

1. 打开 [https://www.coze.cn](https://www.coze.cn)
2. 使用抖音/手机号/邮箱登录
3. 进入「个人空间」

### 1.2 创建新智能体

```
点击「创建智能体」
  ↓
选择「从零开始创建」
  ↓
填写信息：
  - 名称：需求变更助手
  - 描述：自动分析对话中的需求变更，查询存量需求，生成变更分析报告
  - 图标：📋（或上传自定义图标）
  ↓
点击「确认创建」
```

---

## 第二步：配置人设与回复逻辑

### 2.1 进入「人设与回复逻辑」标签

复制以下完整提示词，粘贴到文本框：

```
你是「需求变更助手」，专门帮助产品经理分析需求变更，自动查询版本火车系统中的存量需求，生成专业的变更分析报告。

## 核心能力
1. 从用户对话中提取系统名称和需求变更信息
2. 调用版本火车系统API查询存量需求详情
3. 对比变更前后差异，分析影响范围
4. 识别潜在风险，给出应对建议
5. 生成结构化的变更分析报告和确认消息

## 工作流程
1. 接收用户输入（系统名+对话内容）
2. 提取关键信息（系统、需求概述、关键词）
3. 调用API查询版本火车系统
4. 匹配存量需求，获取详情和依赖关系
5. 分析变更内容（功能、时间、工作量）
6. 评估影响和风险
7. 生成输出（分析报告+确认消息）

## 输入格式要求
用户应按以下格式提供信息：

@需求变更助手

【系统】系统名称
【需求概述】
业务方：变更内容描述
开发：技术评估/工作量
...

## 输出要求

### 1. 结构化分析报告
```
📋 需求变更分析报告

基本信息
- 变更编号：自动生成
- 系统：XXX
- 关联需求：从系统查询到的需求ID和名称
- 当前状态：开发中/SIT/UAT等

变更详情表格
| 变更维度 | 变更前 | 变更后 | 影响 |

影响分析
- 对当前需求的影响
- 对下游依赖的影响
- 对整体进度的影响

风险评估表格
| 风险类型 | 等级 | 描述 | 应对建议 |

建议事项
```

### 2. 确认消息
生成可直接发送给业务方的确认消息，包含：
- 变更内容总结（带✅标记）
- 影响说明
- 风险提示（⚠️标记）
- 确认请求

### 3. 同步状态说明
- 已推送群聊摘要
- 已创建变更单
- 待人工确认

## 注意事项
- 如果缺少系统名称，提示用户使用【系统】XXX 格式
- 如果未查询到相关需求，提示用户检查系统名或创建新需求
- 变更影响评估使用"预计"、"可能"等不确定措辞
- 风险提醒要具体，给出可操作的应对建议
- 所有时间、工作量数据要准确引用系统返回的数据

## 异常处理
1. 未找到系统 → "未找到系统'{system_name}'，请检查系统名称是否正确"
2. 未匹配到需求 → "未在系统'{system_name}'中找到相关需求，是否创建新需求？"
3. API调用失败 → "系统查询失败，请稍后重试或联系管理员"
4. 未检测到变更 → "未从对话中检测到明确的变更点，请补充变更详情"
```

### 2.2 点击「保存」

---

## 第三步：创建版本火车系统插件

### 3.1 进入插件管理

```
点击左侧「插件」
  ↓
点击「创建插件」
  ↓
填写插件信息：
```

### 3.2 插件基础信息

| 字段 | 填写内容 |
|-----|---------|
| 插件名称 | 版本火车系统 |
| 插件描述 | 连接版本火车管理系统，查询需求列表、获取需求详情、创建变更单 |
| 插件图标 | 🚂（或自定义） |

### 3.3 创建工具1：查询需求列表

点击「创建工具」

**基础信息：**
| 字段 | 填写内容 |
|-----|---------|
| 工具名称 | search_requirements |
| 工具描述 | 根据系统名称和关键词搜索需求列表 |
| 请求方式 | GET |
| 请求URL | `https://your-system.com/api/v1/systems/{system_name}/requirements` |

**参数配置：**

| 参数名 | 类型 | 位置 | 必填 | 描述 |
|-------|------|------|------|------|
| system_name | string | path | 是 | 系统名称 |
| keywords | string | query | 否 | 搜索关键词，逗号分隔 |
| status | string | query | 否 | 状态筛选，如"开发中,SIT,UAT" |

**Header配置：**
| 参数名 | 值 |
|-------|-----|
| Authorization | Bearer {{token}} |
| Content-Type | application/json |

**输出参数（示例）：**
```json
{
  "system_name": "string",
  "requirements": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "status": "string",
      "priority": "string",
      "assignee": "string",
      "plan_start": "string",
      "plan_end": "string",
      "progress": "number"
    }
  ]
}
```

### 3.4 创建工具2：获取需求详情

**基础信息：**
| 字段 | 填写内容 |
|-----|---------|
| 工具名称 | get_requirement_details |
| 工具描述 | 获取需求的详细信息，包括依赖关系、团队、时间线 |
| 请求方式 | GET |
| 请求URL | `https://your-system.com/api/v1/requirements/{requirement_id}/details` |

**参数配置：**
| 参数名 | 类型 | 位置 | 必填 | 描述 |
|-------|------|------|------|------|
| requirement_id | string | path | 是 | 需求ID |

**输出参数（示例）：**
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "status": "string",
  "current_stage": "string",
  "dependencies": {
    "upstream": [{"id": "string", "name": "string", "status": "string"}],
    "downstream": [{"id": "string", "name": "string", "status": "string"}]
  },
  "blockers": [{"type": "string", "description": "string", "status": "string"}],
  "team": {"product_owner": "string", "developer": "string", "tester": "string"},
  "timeline": {"plan_start": "string", "plan_end": "string", "actual_start": "string", "actual_end": "string"},
  "workload": {"estimated": "number", "actual": "number", "unit": "string"}
}
```

### 3.5 创建工具3：创建变更单

**基础信息：**
| 字段 | 填写内容 |
|-----|---------|
| 工具名称 | create_change_request |
| 工具描述 | 在版本火车系统中创建需求变更单 |
| 请求方式 | POST |
| 请求URL | `https://your-system.com/api/v1/change-requests` |

**参数配置（Body）：**
```json
{
  "change_id": "string",
  "system": "string",
  "related_requirement_id": "string",
  "title": "string",
  "description": "string",
  "type": "string",
  "status": "string",
  "changes": {
    "functional": [{"field": "string", "before": "string", "after": "string"}],
    "schedule": {"before": "string", "after": "string", "delay_days": "number"},
    "workload": {"before": "number", "after": "number", "additional": "number"}
  },
  "impact": {
    "affected_requirements": ["string"],
    "risk_level": "string"
  },
  "created_at": "string"
}
```

### 3.6 保存并发布插件

```
点击「保存」
  ↓
点击「发布」
  ↓
等待审核通过（通常几分钟）
```

---

## 第四步：添加插件到智能体

### 4.1 绑定插件

```
在智能体编辑页面
  ↓
点击「插件」标签
  ↓
点击「+ 添加插件」
  ↓
搜索「版本火车系统」
  ↓
点击「添加」
```

### 4.2 配置插件认证

```
点击插件卡片上的「设置」
  ↓
填写 API Token：
  - 名称：版本火车系统Token
  - Token：你的系统生成的Bearer Token
  ↓
点击「保存」
```

---

## 第五步：创建工作流

### 5.1 进入工作流编辑

```
点击「工作流」标签
  ↓
点击「创建工作流」
  ↓
选择「从空白创建」
  ↓
命名：需求变更分析流程
```

### 5.2 添加节点（按顺序）

#### 节点1：开始节点

```
节点类型：开始
节点名称：开始
输出变量：
  - query: string (用户输入的完整消息)
```

#### 节点2：大模型 - 提取参数

```
节点类型：大模型
节点名称：提取关键信息

系统提示词：
请从用户输入中提取以下信息：
1. 系统名称：标记为【系统】后的内容
2. 需求概述：对话的核心主题
3. 完整对话：所有对话内容
4. 关键词：提取3-5个核心关键词

输出JSON格式：
{
  "system_name": "系统名称",
  "requirement_summary": "需求概述",
  "conversation": "完整对话",
  "keywords": ["关键词1", "关键词2", "关键词3"]
}

如果缺少系统名称，输出：{"error": "缺少系统名称"}

用户输入：{{开始.query}}

输出格式：JSON

输出变量：
  - extracted_data: object
```

#### 节点3：选择器 - 判断参数完整性

```
节点类型：选择器
节点名称：检查参数

条件分支：
- 分支1（缺参数）：{{提取关键信息.extracted_data.error}} != null
- 分支2（正常）：其他
```

#### 节点4：大模型 - 提示补充信息（缺参数分支）

```
节点类型：大模型
节点名称：提示补充信息

提示词：
请友好地提示用户补充缺失的信息：

{{提取关键信息.extracted_data.error}}

请使用以下格式回复：
"⚠️ 信息不完整

{{error_message}}

请按照以下格式重新输入：
【系统】系统名称
【需求概述】
业务方：...
开发：..."

输出变量：
  - reply: string
```

#### 节点5：插件 - 查询需求列表（正常分支）

```
节点类型：插件
节点名称：查询系统需求

选择插件：版本火车系统
选择工具：search_requirements

参数：
- system_name: {{提取关键信息.extracted_data.system_name}}
- keywords: {{提取关键信息.extracted_data.keywords}}
- status: "开发中,SIT,UAT,需求评审"

输出变量：
  - requirements_result: object
```

#### 节点6：大模型 - 匹配需求

```
节点类型：大模型
节点名称：匹配存量需求

系统提示词：
请根据用户需求概述，从需求列表中匹配最相关的需求。

用户需求：{{提取关键信息.extracted_data.requirement_summary}}
关键词：{{提取关键信息.extracted_data.keywords}}

需求列表：
{{查询系统需求.requirements_result.requirements}}

匹配规则：
1. 优先匹配需求名称包含关键词的
2. 其次匹配描述包含关键词的
3. 考虑状态（开发中/SIT/UAT优先）

输出JSON格式：
{
  "matched": true/false,
  "requirement": {
    "id": "需求ID",
    "name": "需求名称",
    "match_score": "匹配度0-100"
  },
  "reason": "匹配原因"
}

如果没有匹配到，matched为false

输出格式：JSON

输出变量：
  - match_result: object
```

#### 节点7：选择器 - 判断匹配结果

```
节点类型：选择器
节点名称：检查匹配结果

条件分支：
- 分支1（未匹配）：{{匹配存量需求.match_result.matched}} == false
- 分支2（已匹配）：其他
```

#### 节点8：大模型 - 提示未匹配（未匹配分支）

```
节点类型：大模型
节点名称：提示未匹配需求

提示词：
系统在"{{提取关键信息.extracted_data.system_name}}"中未找到相关需求。

请回复：
"⚠️ 未找到相关需求

在系统「{{system_name}}」中未找到与「{{summary}}」相关的需求。

可能原因：
1. 系统名称不正确
2. 需求尚未录入系统
3. 需求已完成或已取消

请检查系统名称，或确认是否需要创建新需求。"

输出变量：
  - reply: string
```

#### 节点9：插件 - 获取需求详情（已匹配分支）

```
节点类型：插件
节点名称：获取需求详情

选择插件：版本火车系统
选择工具：get_requirement_details

参数：
- requirement_id: {{匹配存量需求.match_result.requirement.id}}

输出变量：
  - requirement_details: object
```

#### 节点10：大模型 - 分析变更

```
节点类型：大模型
节点名称：分析需求变更

系统提示词：
你是一位资深产品经理，请根据以下信息分析需求变更。

## 当前对话中的变更意图
系统：{{提取关键信息.extracted_data.system_name}}
需求概述：{{提取关键信息.extracted_data.requirement_summary}}
对话内容：{{提取关键信息.extracted_data.conversation}}

## 存量需求信息
需求ID：{{获取需求详情.requirement_details.id}}
需求名称：{{获取需求详情.requirement_details.name}}
当前状态：{{获取需求详情.requirement_details.status}}
当前阶段：{{获取需求详情.requirement_details.current_stage}}
计划时间：{{获取需求详情.requirement_details.timeline.plan_start}} 至 {{获取需求详情.requirement_details.timeline.plan_end}}
当前进度：{{获取需求详情.requirement_details.progress}}%
负责人：{{获取需求详情.requirement_details.assignee}}
预估工作量：{{获取需求详情.requirement_details.workload.estimated}}人天

## 依赖关系
上游依赖：{{获取需求详情.requirement_details.dependencies.upstream}}
下游依赖：{{获取需求详情.requirement_details.dependencies.downstream}}

## 分析任务
1. 识别变更点（功能/时间/工作量/范围）
2. 对比变更前后差异
3. 评估对当前需求的影响
4. 评估对上下游依赖的影响
5. 识别风险（技术/进度/资源）
6. 给出应对建议

## 输出格式（JSON）
{
  "change_summary": {
    "main_change": "主要变更一句话描述",
    "change_type": "功能扩展|时间调整|范围变更|其他",
    "severity": "高|中|低"
  },
  "detailed_changes": [
    {
      "category": "功能|时间|范围|工作量",
      "before": "变更前",
      "after": "变更后",
      "impact": "影响说明"
    }
  ],
  "impact_analysis": {
    "current_req": "对当前需求的影响",
    "dependencies": "对依赖的影响",
    "schedule": "对进度的影响",
    "resources": "对资源的影响"
  },
  "risks": [
    {
      "type": "技术|进度|资源|沟通",
      "level": "高|中|低",
      "description": "风险描述",
      "suggestion": "应对建议"
    }
  ],
  "recommendations": ["建议1", "建议2"]
}

输出格式：JSON

输出变量：
  - analysis_result: object
```

#### 节点11：插件 - 创建变更单

```
节点类型：插件
节点名称：创建变更单

选择插件：版本火车系统
选择工具：create_change_request

参数：
- change_id: "CR-{{当前时间戳}}"
- system: {{提取关键信息.extracted_data.system_name}}
- related_requirement_id: {{获取需求详情.requirement_details.id}}
- title: {{分析需求变更.analysis_result.change_summary.main_change}}
- description: {{提取关键信息.extracted_data.conversation}}
- type: {{分析需求变更.analysis_result.change_summary.change_type}}
- status: "待确认"
- changes: {{分析需求变更.analysis_result.detailed_changes}}
- impact: {
    "affected_requirements": [{{获取需求详情.requirement_details.dependencies.downstream}}],
    "risk_level": {{分析需求变更.analysis_result.change_summary.severity}}
  }
- created_at: {{当前时间}}

输出变量：
  - change_request_result: object
```

#### 节点12：大模型 - 生成最终回复

```
节点类型：大模型
节点名称：生成分析报告

提示词：
请根据分析结果生成完整的变更分析报告。

## 基本信息
变更编号：{{创建变更单.change_request_result.change_id}}
系统：{{提取关键信息.extracted_data.system_name}}
关联需求：{{获取需求详情.requirement_details.id}} {{获取需求详情.requirement_details.name}}
当前状态：{{获取需求详情.requirement_details.status}}

## 分析结果
{{分析需求变更.analysis_result}}

## 输出要求
生成以下三部分内容：

### 1. 结构化分析报告（Markdown格式）
使用表格展示变更详情、影响分析、风险评估

### 2. 确认消息（可直接发送给业务方）
包含变更总结、影响说明、风险提示、确认请求

### 3. 同步状态说明
列出已完成的同步操作

请确保内容专业、清晰、易于理解。

输出变量：
  - final_report: string
```

#### 节点13：结束节点

```
节点类型：结束
节点名称：结束

输出变量：
  - output: {{生成分析报告.final_report}}
```

### 5.3 连接节点

按照以下顺序连接节点：

```
开始 
  ↓
提取关键信息
  ↓
检查参数 ──→ 提示补充信息 ──→ 结束
  ↓（正常）
查询系统需求
  ↓
匹配存量需求
  ↓
检查匹配结果 ──→ 提示未匹配需求 ──→ 结束
  ↓（已匹配）
获取需求详情
  ↓
分析需求变更
  ↓
创建变更单
  ↓
生成分析报告
  ↓
结束
```

### 5.4 保存并发布工作流

```
点击「保存」
  ↓
点击「试运行」测试（可选）
  ↓
点击「发布」
```

---

## 第六步：发布到飞书

### 6.1 配置发布渠道

```
点击「发布」按钮
  ↓
选择「发布到飞书」
  ↓
点击「配置」
```

### 6.2 飞书授权

```
点击「添加飞书账号」
  ↓
使用飞书App扫码授权
  ↓
选择要发布的范围：
  - 仅自己（推荐先测试）
  - 特定群聊
  - 整个组织
```

### 6.3 完成发布

```
点击「发布」
  ↓
等待审核（个人号通常秒过）
  ↓
发布成功
```

---

## 第七步：测试验证

### 7.1 测试用例1：正常流程

在飞书个人会话输入：

```
@需求变更助手

【系统】订单管理系统
【需求概述】
业务方：订单导出功能需要支持Excel格式，目前只支持CSV
开发：这个要改导出模块，预计增加2人天
业务方：那6月15日能上线吗？
开发：时间有点紧，可能要延期到6月20日
```

**预期结果：**
- 返回完整的变更分析报告
- 包含变更详情表格
- 包含确认消息
- 显示同步状态

### 7.2 测试用例2：缺少系统名

```
@需求变更助手

业务方：需要加一个导出功能
```

**预期结果：**
- 提示缺少系统名称
- 给出正确格式示例

### 7.3 测试用例3：未匹配到需求

```
@需求变更助手

【系统】不存在的系统
【需求概述】
业务方：需要加一个AI功能
```

**预期结果：**
- 提示未找到相关需求
- 给出可能原因

---

## 第八步：优化调整

### 常见问题处理

| 问题 | 解决方案 |
|-----|---------|
| API调用超时 | 检查网络连接，确认API地址正确 |
| 匹配不准确 | 调整匹配节点提示词，优化匹配逻辑 |
| 输出格式错乱 | 检查大模型节点输出格式设置 |
| 飞书收不到消息 | 检查飞书授权状态和权限配置 |

### 持续优化建议

1. **收集反馈**：记录每次分析的准确性
2. **调整提示词**：根据实际效果优化大模型提示词
3. **扩充API**：根据需要增加更多版本火车系统接口
4. **添加记忆**：使用CoZe的记忆功能保存历史上下文

---

## 配置完成！

🎉 你的需求变更智能体已经配置完成！

现在你可以在飞书中@需求变更助手，开始智能分析需求变更了。
