import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📊 当前数据概况:');
  
  const trainCount = await prisma.train.count();
  const scheduleCount = await prisma.trainSchedule.count();
  const systemCount = await prisma.trainSystem.count();
  
  console.log(`  火车(Train): ${trainCount} 条`);
  console.log(`  班次(TrainSchedule): ${scheduleCount} 条`);
  console.log(`  火车-系统关联(TrainSystem): ${systemCount} 条`);
  
  if (trainCount === 0 && scheduleCount === 0 && systemCount === 0) {
    console.log('\n✅ 没有数据需要删除');
    await prisma.$disconnect();
    return;
  }
  
  console.log('\n🗑️  开始删除...');
  
  // 先删关联表（外键依赖）
  const deletedSystems = await prisma.trainSystem.deleteMany();
  console.log(`  ✅ 删除火车-系统关联: ${deletedSystems.count} 条`);
  
  // 删班次
  const deletedSchedules = await prisma.trainSchedule.deleteMany();
  console.log(`  ✅ 删除班次: ${deletedSchedules.count} 条`);
  
  // 删火车
  const deletedTrains = await prisma.train.deleteMany();
  console.log(`  ✅ 删除火车: ${deletedTrains.count} 条`);
  
  console.log('\n✅ 删除完成！');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ 删除失败:', e);
  process.exit(1);
});