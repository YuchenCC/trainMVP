import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const schedule = await prisma.trainSchedule.findUnique({
    where: { id: 'cmpjfxgaj0004etvssbvgji19' },
    include: { 
      train: { 
        include: { 
          trainSystems: { 
            include: { system: { select: { id: true, name: true } } }
          } 
        } 
      } 
    },
  });
  
  console.log('班次信息:', JSON.stringify(schedule, null, 2));
  
  const systemIds = schedule?.train?.trainSystems.map(ts => ts.systemId) || [];
  console.log('系统ID列表:', systemIds);
  
  const requirements = await prisma.requirement.findMany({
    where: {
      status: 'READY',
      systemId: { in: systemIds },
    },
    select: { id: true, title: true, status: true, systemId: true },
  });
  
  console.log('READY状态需求:', requirements.length, '条');
  console.log(JSON.stringify(requirements, null, 2));
  
  await prisma.$disconnect();
}

main().catch(console.error);