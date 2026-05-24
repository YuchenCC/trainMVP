
// 测试 Coze 工作流调用
import { CozeAPI } from '@coze/api';
import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

// 初始化 Coze 客户端
const client = new CozeAPI({
  token: process.env.COZE_API_KEY,
  baseURL: process.env.COZE_BASE_URL || 'https://api.coze.cn',
});

// 测试数据
const testData = {
  trainSchedule: {
    name: '2026年Q2第1班',
    totalCapacity: 100,
    usedCapacity: 65,
    remainingCapacity: 35
  },
  selectedRequirements: [
    {
      id: 'req-001',
      reqCode: 'REQ-2026-0001',
      title: '用户登录优化',
      priority: 'P0',
      storyPoints: 8,
      system: '用户中心',
      status: 'READY',
      dependencies: [
        {
          depId: 'req-003',
          depReqCode: 'REQ-2026-0003',
          depTitle: '基础权限模块',
          depPriority: 'P0',
          depStoryPoints: 5,
          depStatus: 'READY'
        }
      ]
    },
    {
      id: 'req-002',
      reqCode: 'REQ-2026-0002',
      title: '订单列表优化',
      priority: 'P1',
      storyPoints: 5,
      system: '订单系统',
      status: 'READY',
      dependencies: []
    },
    {
      id: 'req-003',
      reqCode: 'REQ-2026-0003',
      title: '基础权限模块',
      priority: 'P0',
      storyPoints: 5,
      system: '用户中心',
      status: 'READY',
      dependencies: []
    },
    {
      id: 'req-004',
      reqCode: 'REQ-2026-0004',
      title: '订单支付功能',
      priority: 'P1',
      storyPoints: 8,
      system: '订单系统',
      status: 'READY',
      dependencies: [
        {
          depId: 'req-002',
          depReqCode: 'REQ-2026-0002',
          depTitle: '订单列表优化',
          depPriority: 'P1',
          depStoryPoints: 5,
          depStatus: 'READY'
        }
      ]
    }
  ]
};

async function testCozeWorkflow() {
  try {
    console.log('🚀 开始测试 Coze 工作流...');
    console.log('📋 测试数据:', JSON.stringify(testData, null, 2));
    
    console.log('\n📡 调用 Coze 工作流...');
    const result = await client.workflows.runs.stream({
      workflow_id: process.env.COZE_WORKFLOW_ID,
      parameters: {
        parameters: testData,
      },
    });
    
    let finalOutput = null;
    
    for await (const part of result) {
      console.log('\n🔄 收到事件:', part.event);
      console.log('📥 事件数据:', JSON.stringify(part.data, null, 2));
      
      if (part.event === 'workflow_finish' && part.data && part.data.output) {
        let output = part.data.output;
        
        console.log('\n📝 原始输出:', output);
        
        if (typeof output === 'string') {
          try {
            output = JSON.parse(output);
          } catch (e) {
            console.log('⚠️ 输出不是有效的 JSON');
          }
        }
        
        finalOutput = output.output || output;
        console.log('\n✅ 工作流完成！最终输出:');
        console.log(JSON.stringify(finalOutput, null, 2));
      }
    }
    
    if (!finalOutput) {
      console.log('\n⚠️ 未找到工作流的输出');
    }
    
  } catch (error) {
    console.error('\n❌ 调用 Coze 工作流失败:', error);
  }
}

testCozeWorkflow();
