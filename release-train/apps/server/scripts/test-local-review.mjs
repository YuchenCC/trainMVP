// 本地测试需求审查功能
import { reviewRequirementData } from './dist/modules/requirement-review/service.js';

async function testReview() {
  console.log('🧪 测试需求审查功能...\n');

  // 测试1：完整需求
  const completeRequirement = {
    title: '用户登录页面优化',
    description: '作为普通用户，我希望登录页面支持手机号快捷登录，以便快速完成登录操作，提升用户体验',
    priority: 'P1',
    storyPoints: 8,
    reqType: 'OPTIMIZATION',
    sourceChannel: 'USER_FEEDBACK',
    systemId: 'sys-user-center',
    baId: 'ba-john',
  };

  console.log('📋 测试数据 1（完整需求）：');
  console.log(JSON.stringify(completeRequirement, null, 2));
  
  try {
    const result1 = await reviewRequirementData(completeRequirement);
    console.log('\n✅ 审查结果：');
    console.log(JSON.stringify(result1, null, 2));
  } catch (error) {
    console.error('❌ 审查失败:', error);
  }

  // 测试2：不完整需求
  const incompleteRequirement = {
    title: '优化搜索',
    description: '优化搜索功能',
    priority: '',
    storyPoints: 0,
    reqType: '',
    sourceChannel: '',
    systemId: '',
    baId: '',
  };

  console.log('\n\n📋 测试数据 2（不完整需求）：');
  console.log(JSON.stringify(incompleteRequirement, null, 2));
  
  try {
    const result2 = await reviewRequirementData(incompleteRequirement);
    console.log('\n✅ 审查结果：');
    console.log(JSON.stringify(result2, null, 2));
  } catch (error) {
    console.error('❌ 审查失败:', error);
  }
}

testReview();