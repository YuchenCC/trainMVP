// ========== T4 US4 班次变更率统计集成测试 ==========
import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../app.js';
import { prisma } from '../prisma/index.js';
import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';

const TEST_SYSTEM = {
  name: '测试系统_T4',
  description: 'T4 US4 变更率统计测试用系统',
};

const TEST_TRAIN_ADMIN = {
  username: 'test_train_admin_t4',
  password: 'TrainAdmin123!',
  displayName: '测试火车管理员_T4',
  email: 'test_train_admin_t4@test.com',
};

describe('T4 US4 班次变更率统计', () => {
  let app: FastifyInstance;
  let systemId: string;
  let trainAdminId: string;
  let trainAdminToken: string;
  let trainId: string;
  let scheduleId: string;
  let testTimestamp: string;
  let createdReqIds: string[] = [];

  beforeAll(async () => {
    testTimestamp = Date.now().toString();
    app = await createApp();
    await app.ready();

    // 确保 prisma 已连接
    await prisma.$connect();

    // 清理可能残留的测试数据
    try {
      await prisma.requirement.deleteMany({
        where: { creator: { username: { startsWith: 'test_train_admin_t4' } } },
      });
    } catch {}
    try {
      await prisma.trainSchedule.deleteMany({
        where: { train: { name: { startsWith: '测试火车_T4' } } },
      });
    } catch {}
    try {
      await prisma.train.deleteMany({
        where: { name: { startsWith: '测试火车_T4' } },
      });
    } catch {}
    try {
      await prisma.user.deleteMany({
        where: { username: { startsWith: 'test_train_admin_t4' } },
      });
    } catch {}
    try {
      await prisma.system.deleteMany({
        where: { name: { startsWith: '测试系统_T4' } },
      });
    } catch {}

    // 创建测试系统
    const system = await prisma.system.create({
      data: { name: TEST_SYSTEM.name + '_' + testTimestamp, description: TEST_SYSTEM.description },
    });
    systemId = system.id;

    // 创建火车管理员
    const passwordHash = await bcrypt.hash(TEST_TRAIN_ADMIN.password, 10);
    const trainAdmin = await prisma.user.create({
      data: {
        ...TEST_TRAIN_ADMIN,
        username: TEST_TRAIN_ADMIN.username + '_' + testTimestamp,
        email: TEST_TRAIN_ADMIN.email.replace('@', '_' + testTimestamp + '@'),
        password: passwordHash,
        role: 'TRAIN_ADMIN',
      },
    });
    trainAdminId = trainAdmin.id;

    // 登录获取token
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        username: TEST_TRAIN_ADMIN.username + '_' + testTimestamp,
        password: TEST_TRAIN_ADMIN.password,
      },
    });
    trainAdminToken = loginRes.json().data.token;

    // 创建测试火车（使用API）
    const createTrainRes = await app.inject({
      method: 'POST',
      url: '/api/trains',
      headers: { Authorization: `Bearer ${trainAdminToken}` },
      payload: {
        name: '测试火车_T4_' + testTimestamp,
        systems: [{ systemId: systemId, capacityPoints: 100 }],
      },
    });
    const trainData = createTrainRes.json().data;
    trainId = trainData.id;

    // 创建测试班次（使用API）
    const createScheduleRes = await app.inject({
      method: 'POST',
      url: `/api/trains/${trainId}/schedules`,
      headers: { Authorization: `Bearer ${trainAdminToken}` },
      payload: {
        name: '2026年Q2第1班_T4',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
    const scheduleData = createScheduleRes.json().data;
    scheduleId = scheduleData.id;
  });

  afterAll(async () => {
    // 清理测试数据
    try {
      if (createdReqIds.length > 0) {
        await prisma.requirement.deleteMany({
          where: { id: { in: createdReqIds } },
        });
      }
      await prisma.trainSchedule.deleteMany({
        where: { trainId: trainId },
      });
      await prisma.train.deleteMany({
        where: { id: trainId },
      });
      await prisma.user.deleteMany({
        where: { id: trainAdminId },
      });
      await prisma.system.deleteMany({
        where: { id: systemId },
      });
    } catch {}
    await app.close();
    await prisma.$disconnect();
  });

  // ========== 测试用例 ==========

  test('TC4.6.5 变更率数据正确性 - 部分需求有变更', async () => {
    // 创建3个已纳版需求
    const req1 = await prisma.requirement.create({
      data: {
        reqCode: 'REQ-T4-001',
        title: '测试需求1',
        description: '<p>测试需求1描述</p>',
        status: 'ONBOARDED',
        systemId: systemId,
        scheduleId: scheduleId,
        creatorId: trainAdminId,
        priority: 'P0',
        storyPoints: 3,
        baId: trainAdminId,
      },
    });
    const req2 = await prisma.requirement.create({
      data: {
        reqCode: 'REQ-T4-002',
        title: '测试需求2',
        description: '<p>测试需求2描述</p>',
        status: 'ONBOARDED',
        systemId: systemId,
        scheduleId: scheduleId,
        creatorId: trainAdminId,
        priority: 'P1',
        storyPoints: 5,
        baId: trainAdminId,
      },
    });
    const req3 = await prisma.requirement.create({
      data: {
        reqCode: 'REQ-T4-003',
        title: '测试需求3',
        description: '<p>测试需求3描述</p>',
        status: 'ONBOARDED',
        systemId: systemId,
        scheduleId: scheduleId,
        creatorId: trainAdminId,
        priority: 'P2',
        storyPoints: 2,
        baId: trainAdminId,
      },
    });

    createdReqIds.push(req1.id, req2.id, req3.id);

    // 为req1和req2添加状态变更记录（模拟变更）
    // req1: 2条变更记录（从DRAFT到PENDING_REVIEW，再到ONBOARDED）
    await prisma.statusLog.create({
      data: {
        requirementId: req1.id,
        operationType: 'CHANGE_REQUIREMENT' as any,
        fromStatus: 'DRAFT' as any,
        toStatus: 'PENDING_REVIEW' as any,
        operatorId: trainAdminId,
      },
    });
    await prisma.statusLog.create({
      data: {
        requirementId: req1.id,
        operationType: 'CHANGE_REQUIREMENT' as any,
        fromStatus: 'PENDING_REVIEW' as any,
        toStatus: 'ONBOARDED' as any,
        operatorId: trainAdminId,
      },
    });
    // req2: 2条变更记录（从DRAFT到PENDING_REVIEW，再到ONBOARDED）
    await prisma.statusLog.create({
      data: {
        requirementId: req2.id,
        operationType: 'CHANGE_REQUIREMENT' as any,
        fromStatus: 'DRAFT' as any,
        toStatus: 'PENDING_REVIEW' as any,
        operatorId: trainAdminId,
      },
    });
    await prisma.statusLog.create({
      data: {
        requirementId: req2.id,
        operationType: 'CHANGE_REQUIREMENT' as any,
        fromStatus: 'PENDING_REVIEW' as any,
        toStatus: 'ONBOARDED' as any,
        operatorId: trainAdminId,
      },
    });

    // 调用API获取统计数据
    const res = await app.inject({
      method: 'GET',
      url: `/api/stats/requirements?scheduleId=${scheduleId}`,
      headers: {
        Authorization: `Bearer ${trainAdminToken}`,
      },
    });

    const result = res.json();
    expect(result.success).toBe(true);
    expect(result.data.changeStats).toBeDefined();
    
    // 变更率 = 有变更记录的需求数 / 已纳版需求总数 = 2/3 ≈ 67%
    expect(result.data.changeStats.changeRate).toBe(67);
    expect(result.data.changeStats.changedCount).toBe(2);
    expect(result.data.changeStats.totalOnboarded).toBe(3);
  });

  test('TC4.6.6 紧急变更率数据正确性 - 部分需求有紧急变更', async () => {
    // 创建已纳版需求
    const req = await prisma.requirement.create({
      data: {
        reqCode: 'REQ-T4-004',
        title: '测试需求4（紧急变更）',
        description: '<p>测试紧急变更需求</p>',
        status: 'ONBOARDED',
        systemId: systemId,
        scheduleId: scheduleId,
        creatorId: trainAdminId,
        priority: 'P0',
        storyPoints: 8,
        baId: trainAdminId,
      },
    });
    createdReqIds.push(req.id);

    // 创建紧急变更记录
    await prisma.emergencyChange.create({
      data: {
        requirementId: req.id,
        urgency: 'P0' as any,
        reason: '紧急修复生产问题',
        status: 'APPROVED' as any,
      },
    });

    // 调用API获取统计数据
    const res = await app.inject({
      method: 'GET',
      url: `/api/stats/requirements?scheduleId=${scheduleId}`,
      headers: {
        Authorization: `Bearer ${trainAdminToken}`,
      },
    });

    const result = res.json();
    expect(result.success).toBe(true);
    
    // 验证紧急变更率统计
    expect(result.data.changeStats.emergencyChangeRate).toBeGreaterThan(0);
    expect(result.data.changeStats.emergencyChangeCount).toBe(1);
  });

  test('TC4.6.8 无已纳版需求显示0', async () => {
    // 创建一个新的班次（无已纳版需求）
    const createEmptyScheduleRes = await app.inject({
      method: 'POST',
      url: `/api/trains/${trainId}/schedules`,
      headers: { Authorization: `Bearer ${trainAdminToken}` },
      payload: {
        name: '空班次_T4_' + testTimestamp,
        startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 44 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
    const emptyScheduleData = createEmptyScheduleRes.json().data;
    const emptyScheduleId = emptyScheduleData.id;

    try {
      const res = await app.inject({
        method: 'GET',
        url: `/api/stats/requirements?scheduleId=${emptyScheduleId}`,
        headers: {
          Authorization: `Bearer ${trainAdminToken}`,
        },
      });

      const result = res.json();
      expect(result.success).toBe(true);
      expect(result.data.changeStats).toBeDefined();
      // 无已纳版需求时变更率应为0
      expect(result.data.changeStats.totalOnboarded).toBe(0);
      expect(result.data.changeStats.changeRate).toBe(0);
      expect(result.data.changeStats.emergencyChangeRate).toBe(0);
    } finally {
      // 通过删除火车来级联删除班次
      // 不需要单独删除
    }
  });

  test('TC4.6.9 切换班次数据更新', async () => {
    // 创建第二个班次（使用API）
    const createSchedule2Res = await app.inject({
      method: 'POST',
      url: `/api/trains/${trainId}/schedules`,
      headers: { Authorization: `Bearer ${trainAdminToken}` },
      payload: {
        name: '班次2_T4_' + testTimestamp,
        startDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
    const schedule2Data = createSchedule2Res.json().data;
    const schedule2Id = schedule2Data.id;
    
    try {
      // 获取两个班次的统计数据
      const res1 = await app.inject({
        method: 'GET',
        url: `/api/stats/requirements?scheduleId=${scheduleId}`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
      });
      const res2 = await app.inject({
        method: 'GET',
        url: `/api/stats/requirements?scheduleId=${schedule2Id}`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
      });

      const result1 = res1.json();
      const result2 = res2.json();

      // 班次1有已纳版需求，班次2无
      expect(result1.data.changeStats.totalOnboarded).toBeGreaterThan(0);
      expect(result2.data.changeStats.totalOnboarded).toBe(0);
    } finally {
      // 通过删除火车来级联删除班次
      // 不需要单独删除
    }
  });

  test('TC4.6.10 无班次数据时不显示选择器（API正常返回）', async () => {
    // 验证API在无scheduleId时也能正常返回
    const res = await app.inject({
      method: 'GET',
      url: '/api/stats/requirements',
      headers: {
        Authorization: `Bearer ${trainAdminToken}`,
      },
    });

    const result = res.json();
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.byStatus).toBeDefined();
  });
});