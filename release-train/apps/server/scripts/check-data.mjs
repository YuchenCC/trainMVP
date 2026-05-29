import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 1. 查询现有用户（用作创建者）
  const users = await prisma.user.findMany({
    select: { id: true, displayName: true, username: true },
    take: 3,
  });
  console.log('现有用户:');
  users.forEach(u => console.log(`  ${u.id} | ${u.displayName} | ${u.username}`));

  // 2. 查询现有系统
  const systems = await prisma.system.findMany({
    select: { id: true, name: true },
  });
  console.log('\n现有系统:');
  systems.forEach(s => console.log(`  ${s.id} | ${s.name}`));

  // 3. 查询现有需求
  const requirements = await prisma.requirement.findMany({
    select: { id: true, title: true, status: true, systemId: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  console.log('\n现有需求:');
  requirements.forEach(r => console.log(`  ${r.id} | ${r.title} | ${r.status} | systemId: ${r.systemId}`));

  // 4. 查询现有火车和班次
  const trains = await prisma.train.findMany({
    select: { id: true, name: true },
  });
  console.log('\n现有火车:');
  trains.forEach(t => console.log(`  ${t.id} | ${t.name}`));

  const schedules = await prisma.trainSchedule.findMany({
    select: { id: true, name: true, trainId: true, status: true },
  });
  console.log('\n现有班次:');
  schedules.forEach(s => console.log(`  ${s.id} | ${s.name} | trainId: ${s.trainId} | ${s.status}`));

  await prisma.$disconnect();
}

main().catch(console.error);