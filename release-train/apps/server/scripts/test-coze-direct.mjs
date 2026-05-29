import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

// Coze 配置
const COZE_API_KEY = process.env.COZE_API_KEY;
const COZE_WORKFLOW_ID = process.env.COZE_REQUIREMENT_REVIEW_WORKFLOW_ID;

console.log('=== Coze 测试脚本 ===');
console.log('API Key:', COZE_API_KEY ? `${COZE_API_KEY.substring(0, 10)}...` : '未设置');
console.log('Workflow ID:', COZE_WORKFLOW_ID || '未设置');

// 测试数据
const testRequirement = {
  title: "示例标题",
  description: "这是一个测试需求描述",
  priority: "P3",
  storyPoints: 3,
  reqType: "功能需求",
  sourceChannel: "用户反馈",
  systemId: "SYS001",
  baId: "BA001",
};

async function testCoze() {
  if (!COZE_API_KEY || !COZE_WORKFLOW_ID) {
    console.error('❌ 缺少配置，请检查 .env 文件');
    return;
  }

  try {
    // 使用动态导入避免类型错误
    const { CozeAPI } = await import('@coze/api');

    const client = new CozeAPI({
      token: COZE_API_KEY,
      baseURL: 'https://api.coze.cn',
    });

    console.log('\n📡 开始调用 Coze 工作流...');
    console.log('测试数据:', JSON.stringify(testRequirement, null, 2));

    const result = await client.workflows.runs.stream({
      workflow_id: COZE_WORKFLOW_ID,
      parameters: testRequirement,
    });

    let eventCount = 0;
    let finalResult = null;

    for await (const part of result) {
      eventCount++;
      console.log(`\n🔄 事件 ${eventCount}:`, part.event);

      if (part.event === 'Message' && part.data) {
        const msgData = part.data;
        console.log('   📥 数据:', JSON.stringify(msgData, null, 2).substring(0, 500));
      }

      if (part.event === 'workflow_finish' && part.data) {
        const doneData = part.data;
        console.log('\n✅ 工作流完成!');
        console.log('📋 输出:', JSON.stringify(doneData, null, 2).substring(0, 1000));
        finalResult = doneData;
      }

      if (part.event === 'Error') {
        console.error('❌ 错误:', JSON.stringify(part.data, null, 2));
      }
    }

    console.log(`\n📊 总共收到 ${eventCount} 个事件`);

    if (finalResult) {
      console.log('\n🎉 最终结果:', JSON.stringify(finalResult, null, 2).substring(0, 500));
    }

  } catch (error) {
    console.error('\n❌ 调用失败:', error);
    console.error('错误详情:', error.message);
  }
}

testCoze();
