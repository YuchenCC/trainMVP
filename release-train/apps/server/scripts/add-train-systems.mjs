import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 查询所有系统
  const systems = await prisma.system.findMany({
    select: { id: true, name: true },
  });
  
  console.log('可用系统列表:');
  systems.forEach((sys, index) => {
    console.log(`${index + 1}. ID: ${sys.id}, 名称: ${sys.name}`);
  });
  
  // 为火车添加系统关联（添加前3个系统）
  const trainId = 'cmpi887mh0002odclsgiwfaxc';
  
  // 先检查是否已有关联
  const existingAssociations = await prisma.trainSystem.findMany({
    where: { trainId },
  });
  
  if (existingAssociations.length > 0) {
    console.log('\n已有关联:', existingAssociations);
  } else {
    console.log('\n开始添加系统关联...');
    
    // 添加前3个系统
    for (let i = 0; i < Math.min(3, systems.length); i++) {
      const system = systems[i];
      try {
        await prisma.trainSystem.create({
          data: {
            trainId,
            systemId: system.id,
          },
        });
        console.log(`✅ 已关联系统: ${system.name}`);
      } catch (e) {
        console.log(`❌ 关联系统 ${system.name} 失败:`, e);
      }
    }
    
    console.log('\n添加完成！');
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);