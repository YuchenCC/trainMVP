import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 查询现有用户
  const users = await prisma.user.findMany({ take: 5 });
  console.log('现有用户:', users.map(u => `${u.id}|${u.displayName || 'N/A'}`));
  if (users.length === 0) {
    console.log('❌ 没有用户，请先创建用户');
    await prisma.$disconnect();
    return;
  }
  const userId = users[0].id;

  // 查询现有系统
  const systems = await prisma.system.findMany();
  console.log('现有系统:', systems.map(s => `${s.id}|${s.name}`));
  if (systems.length === 0) {
    console.log('❌ 没有系统，请先创建系统');
    await prisma.$disconnect();
    return;
  }

  // 清理旧数据（按顺序删除：依赖表 → 主表）
  const oldSnapshotCount = await prisma.trainSystemSnapshot.count();
  if (oldSnapshotCount > 0) {
    await prisma.trainSystemSnapshot.deleteMany();
    console.log(`清理了 ${oldSnapshotCount} 个班次快照`);
  }
  const oldScheduleCount = await prisma.trainSchedule.count();
  if (oldScheduleCount > 0) {
    await prisma.trainSchedule.deleteMany();
    console.log(`清理了 ${oldScheduleCount} 个班次`);
  }
  const oldTrainSystemCount = await prisma.trainSystem.count();
  if (oldTrainSystemCount > 0) {
    await prisma.trainSystem.deleteMany();
    console.log(`清理了 ${oldTrainSystemCount} 个火车-系统关联`);
  }
  const oldTrainCount = await prisma.train.count();
  if (oldTrainCount > 0) {
    await prisma.train.deleteMany();
    console.log(`清理了 ${oldTrainCount} 个火车`);
  }

  // 创建火车
  const train = await prisma.train.create({
    data: {
      name: '铁胆火车侠-Pro',
      description: '2026年第二季度主推火车，承载普惠金融核心业务需求',
      version: 1,
      createdById: userId,
    },
  });
  console.log(`✅ 创建火车: ${train.id} | ${train.name}`);

  // 关联系统
  for (const sys of systems.slice(0, 2)) {
    await prisma.trainSystem.create({
      data: {
        trainId: train.id,
        systemId: sys.id,
        capacityPoints: 55,
        baUserId: userId,
        pmUserId: userId,
      },
    });
    console.log(`✅ 关联系统: ${sys.name}`);
  }

  // 取第一个系统作为需求系统
  const primarySystem = systems[0];

  // 创建10条需求（状态为READY）
  const reqTitles = [
    { title: '用户登录页面优化', desc: '作为系统用户，我想要更简洁的登录页面，以便快速完成身份验证。需要优化页面布局，减少加载时间，增加记住密码功能。', points: 5, priority: 'P1' },
    { title: '数据导出功能', desc: '作为数据分析师，我想要导出报表数据为Excel格式，以便进行线下分析和汇报。需要支持多条件筛选和自定义导出字段。', points: 8, priority: 'P2' },
    { title: '消息通知中心', desc: '作为平台用户，我想要一个统一的消息通知中心，以便及时获取系统动态和审批提醒。需要支持站内信和邮件通知两种方式。', points: 8, priority: 'P1' },
    { title: '权限管理重构', desc: '作为系统管理员，我想要更灵活的权限配置界面，以便根据组织架构分配不同角色的访问权限。需要支持RBAC模型和自定义角色。', points: 13, priority: 'P2' },
    { title: '报表看板首页', desc: '作为部门经理，我想要在首页看到团队的关键指标看板，以便快速了解业务进展和风险。需要支持图表展示和数据下钻。', points: 8, priority: 'P3' },
    { title: '接口性能优化', desc: '作为技术负责人，我想要优化系统API响应速度，以便提升用户体验。需要对慢查询进行索引优化，增加缓存层。', points: 5, priority: 'P2' },
    { title: '操作日志记录', desc: '作为审计人员，我需要完整的用户操作日志记录，以便追溯关键操作和合规审计。需要记录操作时间、操作人、操作内容和结果。', points: 3, priority: 'P3' },
    { title: '批量导入功能', desc: '作为运营人员，我想要批量导入用户数据，以便快速完成数据迁移和初始化工作。需要支持CSV格式并校验数据格式。', points: 5, priority: 'P2' },
    { title: '移动端适配', desc: '作为移动办公人员，我需要在手机上也能正常使用系统核心功能，以便随时处理工作事务。需要适配审批流程和数据查看功能。', points: 13, priority: 'P2' },
    { title: '系统配置管理', desc: '作为系统管理员，我想要通过界面管理系统参数配置，以便无需修改代码即可调整系统行为。需要支持配置项的增删改查和版本记录。', points: 5, priority: 'P3' },
  ];

  const requirements = [];
  for (let i = 0; i < reqTitles.length; i++) {
    const req = await prisma.requirement.create({
      data: {
        reqCode: `REQ-2026-${String(i + 1).padStart(3, '0')}`,
        title: reqTitles[i].title,
        description: reqTitles[i].desc,
        systemId: i < 5 ? primarySystem.id : (systems.length > 1 ? systems[1].id : systems[0].id),
        priority: reqTitles[i].priority,
        storyPoints: reqTitles[i].points,
        baId: userId,
        creatorId: userId,
        status: 'READY',
        reqType: i % 2 === 0 ? 'NEW_FEATURE' : 'OPTIMIZATION',
        sourceChannel: i % 3 === 0 ? 'BUSINESS' : (i % 3 === 1 ? 'USER_FEEDBACK' : 'DATA_ANALYSIS'),
        version: 1,
      },
    });
    requirements.push(req);
   console.log(`✅ 创建需求 ${req.reqCode}: ${req.title} [${req.priority}] ${req.storyPoints}pts`);
  }

 // 创建班次（状态为APPROVED以便纳版）
 const now = new Date();
 const startDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
 const endDate = new Date(now.getTime() + 33 * 24 * 60 * 60 * 1000);
 const boardingDate = new Date(now.getTime());
 const sitDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
 const uatDate = new Date(now.getTime() + 17 * 24 * 60 * 60 * 1000);
 const lockdownDate = new Date(now.getTime() + 27 * 24 * 60 * 60 * 1000);
 const releaseDate = endDate;

 const schedule = await prisma.trainSchedule.create({
   data: {
     trainId: train.id,
     name: `${train.name} - 第1班`,
     status: 'IN_PROGRESS',
     startDate,
     endDate,
     boardingDate,
     sitDate,
     uatDate,
     lockdownDate,
     releaseDate,
     version: 1,
     createdById: userId,
   },
 });
 console.log(`✅ 创建班次: ${schedule.id} | ${schedule.name} [${schedule.status}]`);

 console.log(`\n🎉 数据生成完成！`);
 console.log(`   火车: 1 条`);
 console.log(`   班次: 1 条`);
 console.log(`   系统关联: ${Math.min(2, systems.length)} 条`);
 console.log(`   需求: ${requirements.length} 条 (READY)`);
 console.log(`   班次ID: ${schedule.id}`);

 await prisma.$disconnect();
}

main().catch(console.error);