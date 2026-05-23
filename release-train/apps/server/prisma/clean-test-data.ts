// ========== 清理单元测试产生的临时数据 ==========
// 运行方式：npx tsx prisma/clean-test-data.ts
// 作用：删除数据库中由单元测试产生的 US 开头测试数据

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('开始清理单元测试产生的临时数据...');

  // 1. 删除以 "测试系统_US" 开头的系统
  let deletedSystems = await prisma.system.deleteMany({
    where: {
      name: {
        startsWith: '测试系统_US'
      }
    }
  });
  console.log(`删除了 ${deletedSystems.count} 个测试系统（测试系统_US开头）`);

  // 2. 删除以 "US" 开头的系统（如 US14_Risk_Sys_xxx）
  deletedSystems = await prisma.system.deleteMany({
    where: {
      name: {
        startsWith: 'US'
      }
    }
  });
  console.log(`删除了 ${deletedSystems.count} 个测试系统（US开头）`);

  // 3. 删除名称包含 "测试系统" 的系统
  deletedSystems = await prisma.system.deleteMany({
    where: {
      name: {
        contains: '测试系统'
      }
    }
  });
  console.log(`删除了 ${deletedSystems.count} 个测试系统（包含测试系统）`);

  // 4. 删除以 "test_" 开头的用户
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      username: {
        startsWith: 'test_'
      }
    }
  });
  console.log(`删除了 ${deletedUsers.count} 个测试用户`);

  // 5. 删除名称包含 "test" 或 "TEST" 的用户（不区分大小写）
  const deletedTestUsers = await prisma.user.deleteMany({
    where: {
      OR: [
        { username: { contains: 'test' } },
        { username: { contains: 'TEST' } }
      ]
    }
  });
  console.log(`删除了 ${deletedTestUsers.count} 个测试用户（test相关）`);

  console.log('清理完成！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
