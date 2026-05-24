
// 使用真实的 Coze API 信息测试
import { CozeAPI } from '@coze/api';

// 使用您提供的真实信息
const client = new CozeAPI({
  token: 'pat_yTvxGaUchbPifKjXjf3Ovj5W6Mg47PqdLqOgK8guGCvA6lTwjVUzPq6OudBYcAqq',
  baseURL: 'https://api.coze.cn',
});

// 使用您提供的测试数据
const testData = {
  selectedRequirements: [
    {
      dependencies: [],
      id: "req-101",
      priority: "P0",
      reqCode: "REQ-2026-0101",
      status: "READY",
      storyPoints: 8,
      system: "用户中心",
      title: "用户登录优化"
    },
    {
      dependencies: [],
      id: "req-102",
      priority: "P1",
      reqCode: "REQ-2026-0102",
      status: "READY",
      storyPoints: 5,
      system: "订单系统",
      title: "订单列表优化"
    }
  ],
  trainSchedule: {
    name: "2026年Q2第2班",
    remainingCapacity: 10,
    totalCapacity: 50,
    usedCapacity: 40
  }
};

async function testRealCoze() {
  try {
    console.log('🚀 使用真实 API 信息测试 Coze 工作流...');
    console.log('📋 测试数据:', JSON.stringify(testData, null, 2));
    
    console.log('\n📡 调用 Coze 工作流...');
    const result = await client.workflows.runs.stream({
      workflow_id: '7643295782439354408',
      parameters: {
        parameters: testData,
      },
    });
    
    let finalOutput = null;
    const allEvents = [];
    
    for await (const part of result) {
      allEvents.push(part);
      console.log('\n🔄 收到事件:', part.event);
      console.log('📥 事件数据:', JSON.stringify(part.data, null, 2));
      
      if (part.data) {
        // 检查所有可能有输出的字段
        let output = part.data?.output || part.data?.result || part.data;
        if (output) {
          console.log('\n📝 发现输出:', typeof output);
          
          if (typeof output === 'string') {
            try {
              output = JSON.parse(output);
              console.log('✅ 成功解析 JSON');
            } catch (e) {
              console.log('⚠️ 不是有效 JSON');
            }
          }
          
          finalOutput = output?.output || output?.result || output?.data || output;
          
          if (part.event === 'workflow_finish') {
            console.log('\n✅ 工作流完成！最终输出:');
            console.log(JSON.stringify(finalOutput, null, 2));
          }
        }
      }
    }
    
    if (!finalOutput) {
      console.log('\n⚠️ 未找到最终输出');
      console.log('所有事件数量:', allEvents.length);
    }
    
  } catch (error) {
    console.error('\n❌ 调用 Coze 工作流失败:', error);
  }
}

testRealCoze();
