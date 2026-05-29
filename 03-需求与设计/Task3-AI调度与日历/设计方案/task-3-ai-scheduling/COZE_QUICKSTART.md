# Coze Bot 快速配置指南

## 第一步：创建 Coze Bot

### 1.1 登录 Coze 平台
- 访问：https://www.coze.cn/
- 使用抖音账号登录

### 1.2 创建新 Bot
1. 点击「创建 Bot」
2. 填写基础信息：
   - **Bot 名称**：版本火车智能纳版顾问
   - **Bot 描述**：专业的版本火车项目经理，根据容量、优先级和依赖关系，智能生成最优纳版建议
   - **头像**：🚂 (上传或选择版本火车相关头像)
   - **打招呼消息**：你好！我是版本火车智能纳版顾问，请提供班次容量信息和需求列表，我将为你生成纳版建议！

### 1.3 配置 LLM
1. 在「模型」页面选择：**ByteDance 豆包 - doubao-pro-32k**（推荐）
2. 复制粘贴以下内容到「系统提示词」：

```markdown
你是一位专业的版本火车项目经理（Release Train Manager），擅长需求优先级排序和纳版计划制定。你的职责是根据容量、优先级和依赖关系，为用户生成最优的纳版建议。

## 核心能力
1. **容量评估**：根据班次总容量和已使用容量，计算剩余可用容量
2. **优先级排序**：遵循 P0 > P1 > P2 > P3 的优先级原则
3. **依赖关系处理**：确保依赖需求在被依赖需求之后纳版
4. **容量分配**：根据需求的故事点数（Story Points）分配容量

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
- 如果 B 已取消，标记风险提示

### 4. 智能建议生成
生成建议时考虑：
- 容量约束：不超过班次剩余容量
- 优先级：严格遵循 P0 > P1 > P2 > P3
- 依赖关系：拓扑排序，确保依赖链正确
- 均衡分配：避免单个系统独占容量
```

3. 设置「温度参数」为：**0.7**
4. 设置「最大回复长度」为：**8192 tokens**

## 第二步：获取 API 凭证

### 2.1 创建个人访问令牌（PAT）
1. 在 Coze 页面右上角，点击头像 →「API 管理」
2. 点击「创建 Token」
3. 填写 Token 名称（如：版本火车纳版顾问）
4. 设置有效期（建议选择 90 天）
5. 复制生成的 Token（格式：`pat_xxxxxxxxxxxxxxxxxxxx`）

### 2.2 获取 Bot ID
1. 回到你的 Bot 编辑页面
2. 在 Bot 名称下方找到 Bot ID
3. 复制 Bot ID（格式类似：`xxxxxxxxxxxxxxxxxxxxxxxx`）

## 第三步：配置项目环境变量

### 3.1 更新 `.env` 文件
在项目根目录的 `.env` 文件中添加：

```env
# Coze API 配置
COZE_API_KEY=pat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
COZE_BOT_ID=xxxxxxxxxxxxxxxxxxxxxxxx
```

### 3.2 替换为实际值
将上面的示例值替换为你实际获取的：
- `COZE_API_KEY`：你的个人访问令牌（PAT）
- `COZE_BOT_ID`：你的 Bot ID

## 第四步：测试 Bot（可选）

在 Coze 平台的「调试」页面测试你的 Bot：

**测试输入**：
```json
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
      "dependencies": []
    },
    {
      "id": "req-002",
      "reqCode": "REQ-2026-0002",
      "title": "订单列表优化",
      "priority": "P1",
      "storyPoints": 5,
      "system": "订单系统",
      "status": "READY",
      "dependencies": []
    }
  ]
}
```

**预期输出**：Bot 应该返回包含分析、建议、警告和总结的 JSON 格式数据

## 第五步：部署 Bot（可选）

如果需要通过 API 调用，需要部署 Bot：

1. 在 Bot 页面点击「发布」
2. 选择「API」作为发布目标
3. 确认发布

## 常见问题

### Q: Bot 没有返回 JSON 格式？
A: 在系统提示词中强调输出格式，或在 Coze 工作流中添加 JSON 格式化插件

### Q: Coze API 调用失败？
A: 检查：
1. API Key 是否正确
2. Bot ID 是否正确
3. API Key 是否在有效期内
4. 网络是否可以访问 api.coze.cn

### Q: 如何添加历史纳版数据作为参考？
A: 在 Coze 中启用「知识库」插件，上传历史纳版记录

## 下一步

配置完成后，告诉我可以开始编码实现！我们将实现：
1. 后端 API 接口
2. Coze API 集成
3. 前端交互界面
4. 拖拽排序功能
5. 批量纳版功能
