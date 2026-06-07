// 导览配置测试脚本
import { getFeatureTours, getTourConfigs } from './apps/web/src/tour/config';

console.log('='.repeat(60));
console.log('导览配置测试');
console.log('='.repeat(60));

// 测试所有页面级导览
const featureTours = getFeatureTours();
console.log(`\n页面级导览总数: ${featureTours.length}`);

featureTours.forEach((tour) => {
  console.log(`\n📋 ${tour.name}`);
  console.log(`   ID: ${tour.id}`);
  console.log(`   步骤数: ${tour.steps.length}`);
  console.log(`   描述: ${tour.description}`);
  
  tour.steps.forEach((step, index) => {
    console.log(`   步骤 ${index + 1}: ${step.title}`);
    console.log(`      Target: ${step.target}`);
    console.log(`      Placement: ${step.placement || 'auto'}`);
  });
});

// 测试角色专属导览
const roleTours = getTourConfigs();
console.log(`\n\n角色专属导览总数: ${roleTours.length}`);

roleTours.forEach((tour) => {
  console.log(`\n👤 ${tour.name}`);
  console.log(`   ID: ${tour.id}`);
  console.log(`   目标角色: ${tour.targetRoles.join(', ')}`);
  console.log(`   触发方式: ${tour.trigger}`);
  console.log(`   步骤数: ${tour.steps.length}`);
});

console.log('\n' + '='.repeat(60));
console.log('✅ 导览配置测试完成');
console.log('='.repeat(60));