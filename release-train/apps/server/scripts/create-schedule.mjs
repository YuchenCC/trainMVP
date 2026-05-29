import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const train = await prisma.train.findFirst();
  if (!train) { console.log('没有火车'); await prisma.$disconnect(); return; }

  const userId = (await prisma.user.findFirst()).id;
  const now = new Date();

  const schedule = await prisma.trainSchedule.create({
    data: {
      trainId: train.id,
      name: `${train.name} - 第1班`,
      status: 'IN_PROGRESS',
      startDate: new Date(now.getTime() + 3 * 86400000),
      endDate: new Date(now.getTime() + 33 * 86400000),
      boardingDate: now,
      sitDate: new Date(now.getTime() + 7 * 86400000),
      uatDate: new Date(now.getTime() + 17 * 86400000),
      lockdownDate: new Date(now.getTime() + 27 * 86400000),
      releaseDate: new Date(now.getTime() + 33 * 86400000),
      version: 1,
      createdById: userId,
    },
  });

  console.log(`✅ 创建班次: ${schedule.id} | ${schedule.name} [${schedule.status}]`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });