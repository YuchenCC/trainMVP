# CoZe 需求审查智能体 - 完整配置指南

## 📋 配置前准备

### 需要准备的材料

| 材料 | 用途 | 获取方式 |
|-----|------|---------|
| 飞书账号 | 发布智能体 | 飞书App注册 |
| CoZe API Key | 后端调用 | CoZe平台获取 |

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
  - 名称：需求审查助手
  - 描述：智能审查需求描述，生成优化后的需求和验收条件
  - 图标：📝（或上传自定义图标）
  ↓
点击「确认创建」
```

---

## 第二步：创建工作流（重要！）

### 2.1 进入工作流编辑

```
点击「工作流」标签
  ↓
点击「创建工作流」
  ↓
选择「从空白创建」
  ↓
命名：需求审查流程
```

### 2.2 添加节点（按顺序）

#### 节点1：开始节点

```
节点类型：开始
节点名称：开始
输出变量：
  - title: string (需求标题)
  - description: string (需求描述)
  - priority: string (优先级)
  - storyPoints: number (故事点数)
  - reqType: string (需求类型)
  - sourceChannel: string (来源渠道)
```

#### 节点2：大模型 - 需求审查

```
节点类型：大模型
节点名称：需求审查

系统提示词：
【直接复制下面的完整提示词】
```

---

## 📝 Coze 智能体提示词（完整版 - 直接复制）

```
你是一位专业的需求审查专家，负责审查软件需求的完整性、规范性和清晰度，帮助 BA 写出高质量的需求文档。

### 任务说明
1. 审查输入的需求是否符合用户故事格式
2. 发现需求中的问题和不足
3. 给出具体的改进建议和优化后的需求描述
4. 生成明确的验收条件

### 输入格式
你将收到以下信息：
- title: 需求标题
- description: 需求描述
- priority: 优先级（P0/P1/P2/P3）
- storyPoints: 故事点数
- reqType: 需求类型（NEW_FEATURE/OPTIMIZATION/BUG）
- sourceChannel: 来源渠道

### 审查要点

#### 1. 用户故事格式
- 是否符合标准格式：作为<角色>，我想要<功能>以便<价值>
- 角色是否明确且具体
- 功能描述是否清晰
- 业务价值是否合理

#### 2. 需求完整性
- 描述长度是否足够（建议50字以上）
- 是否有业务背景说明
- 是否有功能目标说明
- 是否有成功标准

#### 3. 验收条件
- 是否有可量化的验收条件
- 是否包含前端/后端/测试各方面

### 输出格式（严格 JSON）

{
  "output": {
    "issues": [
      {
        "type": "问题类型",
        "message": "问题详细描述",
        "suggestion": "具体的改进建议",
        "severity": "high|medium|low"
      }
    ],
    "suggestions": [
      "建议1",
      "建议2"
    ],
    "score": 85,
    "optimizedTitle": "优化后的标题",
    "optimizedDescription": "优化后的完整需求描述（200字以上，包含用户故事、背景、目标等）",
    "acceptanceCriteria": [
      "验收条件1",
      "验收条件2",
      "验收条件3"
    ]
  }
}

### 评分标准

| 分数 | 说明 |
|------|------|
| 90-100 | 优秀，需求完整、规范，无明显问题 |
| 70-89 | 良好，有小问题，基本符合要求 |
| 50-69 | 一般，有较多问题需要改进 |
| 0-49 | 不合格，问题严重，需要重写 |

### 优化后的需求描述示例

输入：
title: 用户登录页面优化
description: 优化登录页面

输出（optimizedDescription）：
作为普通用户，我希望登录页面更加简洁美观，以便提升登录体验。

【业务背景】
当前登录页面存在加载速度慢、UI风格不统一等问题，用户反馈体验不佳，影响用户第一印象。

【功能目标】
1. 优化页面UI设计，使其更符合公司品牌风格
2. 提升页面加载速度，减少用户等待时间
3. 增加记住密码和自动登录功能

【验收条件】
1. 页面首屏加载时间小于2秒
2. 支持7天内免密码自动登录
3. 支持一键记住密码

### 注意事项

1. 必须用 output 包裹所有数据
2. 只返回 JSON，不要有任何其他文字
3. 中文输出，使用中文描述
4. 评分合理，避免满分或零分
5. 验收条件具体，可量化、可测试

### 审查内容

需求标题：{{开始.title}}
需求描述：{{开始.description}}
优先级：{{开始.priority}}
故事点数：{{开始.storyPoints}}
需求类型：{{开始.reqType}}
来源渠道：{{开始.sourceChannel}}

请检查以下方面：
1. 用户故事格式是否正确（作为...我想要...以便...）
2. 需求描述是否清晰、完整
3. 是否包含明确的验收条件
4. 是否描述了业务价值
5. 是否存在歧义或模糊表述
```

**继续配置节点：**

```
用户输入：（留空，使用系统提示词中的变量）

输出格式：JSON

输出变量：
  - review_result: object
```

#### 节点3：结束节点

```
节点类型：结束
节点名称：结束

输出变量：
  - output: {{需求审查.review_result.output}}
```

### 2.3 连接节点

按照以下顺序连接节点：

```
开始 
  ↓
需求审查
  ↓
结束
```

### 2.4 保存并发布工作流

```
点击「保存」
  ↓
点击「试运行」测试（可选）
  ↓
点击「发布」
```

---

## 第三步：获取工作流 ID

### 3.1 复制工作流 ID

```
在工作流编辑页面
  ↓
点击右上角「...」
  ↓
选择「复制工作流ID」
  ↓
保存这个ID，后面配置后端要用
```

---

## 第四步：配置后端环境变量

### 4.1 编辑 .env 文件

打开项目根目录的 `.env` 文件，修改以下配置：

```env
# Coze 智能纳版（禁止明文密钥，通过.env.local注入实际值）
COZE_API_KEY=你的Coze_API_Key
COZE_REQUIREMENT_REVIEW_WORKFLOW_ID=你的需求审查工作流ID
COZE_BASE_URL=https://api.coze.cn
```

### 4.2 获取 Coze API Key

```
登录 CoZe 平台
  ↓
点击右上角头像
  ↓
选择「个人设置」
  ↓
选择「API Key」
  ↓
点击「生成新的 API Key」
  ↓
复制并保存
```

---

## 第五步：测试验证

### 5.1 后端测试脚本

创建测试文件 `apps/server/test-review-coze.js`：

```javascript
import { CozeClient } from './src/common/coze/index.js';

const client = new CozeClient({
  apiKey: '你的API_KEY',
  baseURL: 'https://api.coze.cn',
  workflowIds: {
    REQUIREMENT_REVIEW: '你的工作流ID'
  }
});

const testData = {
  title: '新增需求审核入口',
  description: '在需求创建页面新增需求审核的按钮',
  priority: 'P2',
  storyPoints: 5,
  reqType: 'NEW_FEATURE',
  sourceChannel: '产品会议'
};

async function test() {
  console.log('开始测试需求审查...');
  console.log('测试数据:', testData);

  try {
    const result = await client.runWorkflow('REQUIREMENT_REVIEW', testData);
    console.log('审查结果:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('测试失败:', error);
  }
}

test();
```

### 5.2 运行测试

```bash
cd apps/server
node test-review-coze.js
```

### 5.3 前端测试

1. 启动前端和后端服务
2. 访问需求创建页面
3. 填写需求信息
4. 点击「AI审查」按钮
5. 查看是否返回优化后的需求

---

## 📊 测试用例

### 测试用例1：简单需求

```
title: 用户登录页面优化
description: 优化登录页面
priority: P2
storyPoints: 3
reqType: OPTIMIZATION
sourceChannel: 用户反馈
```

**预期结果：**
- 检测到描述过短
- 生成优化后的完整描述
- 提供验收条件

### 测试用例2：完整需求

```
title: 用户登录页面优化
description: 作为普通用户，我希望登录页面更加简洁美观，以便提升登录体验。当前登录页面存在加载速度慢、UI风格不统一等问题，用户反馈体验不佳。
priority: P1
storyPoints: 8
reqType: OPTIMIZATION
sourceChannel: 用户反馈
```

**预期结果：**
- 评分较高（70-90分）
- 问题较少
- 提供优化建议

### 测试用例3：不符合用户故事格式

```
title: 加个导出功能
description: 导出Excel
priority: P3
storyPoints: 2
reqType: NEW_FEATURE
sourceChannel: 业务方
```

**预期结果：**
- 检测到格式问题
- 生成符合用户故事格式的描述
- 提供完整的验收条件

---

## 🔧 常见问题处理

| 问题 | 解决方案 |
|-----|---------|
| API返回404 | 检查工作流ID是否正确 |
| 返回格式错误 | 检查提示词中的JSON格式要求 |
| 没有优化字段 | 确认提示词包含optimizedTitle等字段 |
| 前端不显示结果 | 检查前端API服务是否正确处理返回数据 |

---

## 📝 提示词优化建议

1. **根据实际业务调整**：根据你的业务特点，修改审查要点
2. **增加行业特定规则**：如果是金融行业，可以增加合规性检查
3. **调整评分标准**：根据团队要求，调整评分权重
4. **优化示例**：添加更多团队常见的需求示例

---

## 🎉 配置完成！

现在你的需求审查智能体已经配置完成，可以在前端使用 AI 审查功能了！
