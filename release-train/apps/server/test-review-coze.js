// 测试需求审查智能体
import { CozeAPI } from '@coze/api';
import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

// Coze 配置（从环境变量读取）
const COZE_API_KEY = process.env.COZE_API_KEY;
const COZE_WORKFLOW_ID = process.env.COZE_WORKFLOW_ID || '7644965581724794932';

// 初始化 Coze 客户端
const client = new CozeAPI({
  token: COZE_API_KEY,
  baseURL: 'https://api.coze.cn',
});

// 测试需求数据
const testRequirement = {
  title: '用户登录页面优化',
  description: '作为普通用户，我希望登录页面更加简洁美观，以便提升登录体验。',
  priority: 'P1',
  storyPoints: 8,
  reqType: 'OPTIMIZATION',
  sourceChannel: 'USER_FEEDBACK',
};

/**
 * 构建审查提示词
 */
function buildPrompt(requirement) {
  return `
请对以下需求进行智能审查，检查是否符合用户故事规范：

需求标题：${requirement.title}
需求描述：${requirement.description}
优先级：${requirement.priority}
故事点数：${requirement.storyPoints}
需求类型：${requirement.reqType}
来源渠道：${requirement.sourceChannel}

请检查以下方面：
1. 用户故事格式是否正确（作为...我想要...以便...）
2. 需求描述是否清晰、完整
3. 是否包含明确的验收条件
4. 是否描述了业务价值
5. 是否存在歧义或模糊表述

请以 JSON 格式返回审查结果：
{
  "issues": [
    {
      "type": "问题类型",
      "message": "问题描述",
      "suggestion": "改进建议",
      "severity": "high|medium|low"
    }
  ],
  "suggestions": ["建议1", "建议2"],
  "score": 0-100
}
`;
}

async function testRequirementReview() {
  try {
    console.log('🚀 开始测试需求审查智能体...');
    console.log('📋 测试需求:', JSON.stringify(testRequirement, null, 2));
    
    const prompt = buildPrompt(testRequirement);
    console.log('\n📝 构建的提示词长度:', prompt.length);
    
    console.log('\n📡 调用 Coze 工作流...');
    
    // 参数平铺，Coze 中直接使用 {{title}} 即可
    const result = await client.workflows.runs.stream({
      workflow_id: COZE_WORKFLOW_ID,
      parameters: {
        prompt: prompt,
        title: testRequirement.title,
        description: testRequirement.description,
        priority: testRequirement.priority,
        storyPoints: testRequirement.storyPoints,
        reqType: testRequirement.reqType,
        sourceChannel: testRequirement.sourceChannel,
      },
    });
    
    let finalOutput = null;
    
    for await (const part of result) {
      console.log('\n🔄 收到事件:', part.event);
      
      // workflow_finish 事件
      if (part.event === 'workflow_finish' && part.data && part.data.output) {
        let output = part.data.output;
        
        if (typeof output === 'string') {
          try {
            output = JSON.parse(output);
          } catch (e) {
            console.log('⚠️ 输出不是有效的 JSON');
          }
        }
        
        // 解析 output 字段
        if (output && output.output) {
          finalOutput = typeof output.output === 'string' ? JSON.parse(output.output) : output.output;
        } else {
          finalOutput = output;
        }
        
        console.log('\n🎉 审查结果:');
        console.log(JSON.stringify(finalOutput, null, 2));
      }
      
      // Done 事件表示工作流结束
      if (part.event === 'Done' && part.data) {
        console.log('✅ 工作流执行完成');
        if (part.data.debug_url) {
          console.log('🔗 调试链接:', part.data.debug_url);
        }
        break;
      }
    }
    
    if (!finalOutput) {
      console.log('\n⚠️ 未获取到审查结果');
    }
    
  } catch (error) {
    console.error('\n❌ 调用失败:', error);
    console.error('📌 错误详情:', error.message);
  }
}

testRequirementReview();