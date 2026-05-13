// ========== 种子数据脚本 ==========
// 预制系统、用户和关联关系，用于本地开发和演示
// 运行方式：pnpm db:seed （或 npx tsx prisma/seed.ts）
// 幂等安全：使用 upsert，重复执行不会重复创建数据
import { PrismaClient } from '@prisma/client';  // Prisma ORM 客户端
import bcrypt from 'bcrypt';                     // 密码哈希库（bcrypt）

const prisma = new PrismaClient();               // 创建非单例的独立 Prisma 客户端

/**
 * 简易汉字拼音映射工具
 * 
 * 将中文系统名称转换为拼音前缀，用于生成用户名的命名前缀。
 * 仅覆盖种子数据中出现的汉字，映射规则：
 * - "普惠前端系统" → "puhuiqianduan"
 * - "人力资源系统" → "renliziyuan"
 * 
 * @param text - 汉字文本
 * @returns 拼音字符串（仅覆盖种子数据中出现的汉字，未知字符原样返回）
 */
function pinyinOf(text: string): string {
  const map: Record<string, string> = {
    '普': 'pu', '惠': 'hui', '前': 'qian', '端': 'duan', '系': 'xi', '统': 'tong',
    '人': 'ren', '力': 'li', '资': 'zi', '源': 'yuan',
  };
  return text.split('').map((c) => map[c] || c).join(''); // 逐个字符映射并拼接
}

// ========== 预制系统配置 ==========
// 两个业务系统：普惠前端系统 + 人力资源系统
const SYSTEMS = [
  { name: '普惠前端系统', description: '面向普惠金融业务的前端系统，包含用户端和管理端' },
  { name: '人力资源系统', description: '企业人力资源管理系统，包含员工管理、考勤、薪酬等模块' },
];

// ========== 每系统角色分配 ==========
// 共 6 种角色（不含 SUPER_ADMIN，管理员通过 /api/auth/seed 单独创建）
// 顺序与 CHINESE_NAMES 一一对应：索引 0=BA, 1=PM, 2=PROJECT_MGR, ...
const ROLES = ['BA', 'PM', 'PROJECT_MGR', 'TECH_MGR', 'TEST_MGR', 'TRAIN_ADMIN'] as const;

// ========== SystemRole 枚举映射 ==========
// 只有以下角色会加入 SystemMember 表（TRAIN_ADMIN 是系统级角色，不关联具体系统）
// key = User.role → value = SystemMember.role（SystemRole 枚举值）
const SYSTEM_ROLES: Record<string, string> = {
  BA: 'BA',                    // 业务归属人
  PM: 'PM',                    // 产品经理
  PROJECT_MGR: 'PROJECT_MGR',  // 项目经理
  TECH_MGR: 'TECH_MGR',        // 技术经理
  TEST_MGR: 'TEST_MGR',        // 测试经理
};

// ========== 每系统人员姓名配置 ==========
// 每个系统 6 个人，角色依次对应 ROLES 数组中的顺序
const CHINESE_NAMES: Record<string, string[]> = {
  '普惠前端系统': ['张大伟', '李芳', '王建国', '刘洋', '陈敏', '赵雪'],
  '人力资源系统': ['周志强', '吴丽', '孙鹏', '黄婷', '马超', '林小红'],
};

/**
 * 主函数：导入种子数据
 * 
 * 执行流程：
 * 1. 生成统一密码哈希（123456）
 * 2. 遍历每个系统
 *    a. upsert 系统记录
 *    b. 遍历 6 个角色
 *      - upsert 用户记录（密码已哈希）
 *      - 如果角色在 SYSTEM_ROLES 中 → upsert SystemMember 关联
 *      - 如果角色是 TRAIN_ADMIN → 跳过 SystemMember（系统级管理）
 * 3. 打印账号汇总表
 */
async function main() {
  console.log('🌱 开始导入种子数据...\n');

  // 1. 生成统一密码哈希（所有账号密码都是 123456）
  const passwordHash = await bcrypt.hash('123456', 10); // 10 轮盐值

  // 2. 遍历每个系统
  for (const sys of SYSTEMS) {
    console.log(`📦 创建系统: ${sys.name}`);

    // 2a. upsert 系统记录（存在则跳过，不存在则创建）
    const system = await prisma.system.upsert({
      where: { name: sys.name },                                // 按唯一名称匹配
      update: {},                                                // 已存在：不做任何更新
      create: { name: sys.name, description: sys.description }, // 不存在：创建新纪录
    });

    // 2b. 遍历该系统的 6 个角色
    const names = CHINESE_NAMES[sys.name];                       // 获取该系统的人员姓名数组
    for (let i = 0; i < names.length; i++) {
      const role = ROLES[i];                                     // 当前角色（BA/PM/...）
      const displayName = names[i];                              // 当前人员姓名（如"张大伟"）
      const pinyin = pinyinOf(sys.name.replace('系统', ''));     // 拼音前缀（如"puhuiqianduan"）
      const username = `${pinyin}_${role.toLowerCase()}`;        // 用户名（如"puhuiqianduan_ba"）
      const email = `${username}@company.com`;                   // 邮箱（如"puhuiqianduan_ba@company.com"）

      // upsert 用户记录（存在则跳过，不存在则创建，密码已哈希）
      const user = await prisma.user.upsert({
        where: { username },                                 // 按唯一用户名匹配
        update: {},                                          // 已存在：不做任何更新
        create: {
          username,                                          // 用户名
          password: passwordHash,                            // 密码（bcrypt 哈希后的值）
          displayName,                                       // 显示名（如"张大伟"）
          email,                                             // 邮箱
          role,                                              // 全局角色（BA/PM/.../TRAIN_ADMIN）
        },
      });

      // 根据角色决定是否创建 SystemMember 关联
      if (SYSTEM_ROLES[role]) {
        // 角色在 SYSTEM_ROLES 中（BA/PM/PROJECT_MGR/TECH_MGR/TEST_MGR）
        // → upsert SystemMember 记录（建立用户与系统的关联）
        console.log(`  👤 ${role}: ${displayName} (${username} / 123456)`);
        await prisma.systemMember.upsert({
          where: {
            systemId_userId_role: {                         // 复合唯一约束：同一系统同一用户同一角色唯一
              systemId: system.id,                          // 系统 ID
              userId: user.id,                             // 用户 ID
              role: SYSTEM_ROLES[role] as any,             // 成员角色（SystemRole 枚举）
            },
          },
          update: {},
          create: {
            systemId: system.id,
            userId: user.id,
            role: SYSTEM_ROLES[role] as any,
          },
        });
      } else {
        // 角色是 TRAIN_ADMIN → 不关联到具体系统（系统级管理角色）
        console.log(`  👤 ${role}: ${displayName} (${username} / 123456) ⚠️ 系统级管理，不关联系统成员`);
      }
    }

    console.log(); // 系统间空行分隔
  }

  // 3. 打印汇总信息
  console.log('✅ 种子数据导入完成！');
  console.log('');
  console.log('========================================');
  console.log('  系统 & 账号汇总');
  console.log('========================================');
  console.log('  所有账号密码统一为: 123456');
  console.log('');

  for (const sys of SYSTEMS) {
    console.log(`📦 ${sys.name}`);
    const names = CHINESE_NAMES[sys.name];                   // 该系统的人员姓名
    for (let i = 0; i < names.length; i++) {
      const role = ROLES[i];                                 // 角色
      const displayName = names[i];                          // 姓名
      const pinyin = pinyinOf(sys.name.replace('系统', '')); // 拼音前缀
      const username = `${pinyin}_${role.toLowerCase()}`;    // 用户名
      console.log(`   ${role.padEnd(13)} ${displayName.padEnd(6)} — ${username}`);
    }
    console.log();
  }
}

// ========== 脚本入口 ==========
// 执行 main 函数，完成后断开 Prisma 连接
main()
  .then(async () => {
    await prisma.$disconnect(); // 断开数据库连接（避免进程挂起）
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);            // 异常退出码
  });
