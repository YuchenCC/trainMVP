// ========== T2 US2.2 火车班次创建 TDD 测试 ==========
// 遵循 TDD 红-绿-重构循环：RED → GREEN → REFACTOR
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createApp } from '../app.js';
import { prisma } from '../prisma/index.js';
import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';

describe('T2 US2.2 火车班次创建', () => {
  let app: FastifyInstance;
  let trainAdminToken: string;
  let trainAdminId: string;
  let trainId: string;
  let testTimestamp: string;

  beforeAll(async () => {
    app = await createApp();
    await app.ready();
    testTimestamp = Date.now().toString();

    const passwordHash = await bcrypt.hash('TestPass123!', 10);

    // 创建火车管理员
    const trainAdmin = await prisma.user.create({
      data: {
        username: 'train_admin_us22_' + testTimestamp,
        password: passwordHash,
        displayName: '火车管理员',
        email: 'train_admin_us22_' + testTimestamp + '@test.com',
        role: 'TRAIN_ADMIN',
      },
    });
    trainAdminId = trainAdmin.id;

    // 登录获取 token
    trainAdminToken = (
      await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: trainAdmin.username, password: 'TestPass123!' },
      })
    ).json().data.token;
  });

  beforeEach(async () => {
    // 创建测试火车（PLANNING 状态）
    const system = await prisma.system.create({
      data: { name: 'US22_Sys_' + testTimestamp + '_' + Math.random(), description: '测试系统' },
    });

    const train = await prisma.train.create({
      data: {
        name: 'US22_Test_Train_' + testTimestamp + '_' + Math.random(),
        description: '测试火车',
        status: 'PLANNING',
        createdById: trainAdminId,
      },
    });

    // 添加搭载系统
    await prisma.trainSystem.create({
      data: {
        trainId: train.id,
        systemId: system.id,
        capacityPoints: 100,
        usedPoints: 0,
      },
    });

    trainId = train.id;
  });

  afterAll(async () => {
    await app.close();
    // 清理测试数据（按依赖顺序）
    await prisma.train.deleteMany({ where: { createdById: trainAdminId } });
    await prisma.system.deleteMany({ where: { name: { startsWith: 'US22_Sys_' + testTimestamp } } });
    try {
      await prisma.user.deleteMany({ where: { id: trainAdminId } });
    } catch (e) {
      console.warn('清理测试用户失败:', (e as Error).message);
    }
    await prisma.$disconnect();
  });

  // ========== 班次创建基础功能 ==========

  describe('班次创建基础功能', () => {
    it('创建班次成功 - 火车状态变为 IN_PROGRESS', async () => {
      // 创建班次前，火车状态应该是 PLANNING
      const beforeTrain = await prisma.train.findUnique({ where: { id: trainId } });
      expect(beforeTrain?.status).toBe('PLANNING');

      const res = await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/schedules`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: {
          startDate: '2026-06-02',
          endDate: '2026-06-27',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      // 班次状态为 PLANNING
      expect(body.data.status).toBe('PLANNING');
      expect(body.data.startDate).toBe('2026-06-02');
      expect(body.data.endDate).toBe('2026-06-27');

      // 创建班次后，火车状态应该变为 IN_PROGRESS
      const afterTrain = await prisma.train.findUnique({ where: { id: trainId } });
      expect(afterTrain?.status).toBe('IN_PROGRESS');
    });

    it('创建班次成功 - 关键节点日期自动计算', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/schedules`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: {
          startDate: '2026-06-01', // 周一
          endDate: '2026-06-26', // 周五，21天周期
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);

      // 统一投产日 = 结束日期
      expect(body.data.releaseDate).toBe('2026-06-26');

      // 统一纳版日 = 周期过半前的最后一个周五
      expect(body.data.boardingDate).toBeDefined();

      // 统一封板日 = 投产前一周的周五
      expect(body.data.lockdownDate).toBe('2026-06-19');
    });

    it('创建班次成功 - 容量快照已创建', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/schedules`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: {
          startDate: '2026-07-01',
          endDate: '2026-07-28',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data?.id).toBeDefined();

      // 获取创建的班次 ID
      const scheduleId = body.data.id;

      // 查询容量快照（通过 scheduleId 查询）
      const snapshots = await prisma.trainSystemSnapshot.findMany({
        where: { trainScheduleId: scheduleId },
      });

      expect(snapshots.length).toBeGreaterThan(0);
      expect(snapshots[0].capacityPoints).toBe(100);
      expect(snapshots[0].usedPoints).toBe(0);
    });

    it('火车不存在 - 返回 404', async () => {
      const fakeId = 'fake-train-id-' + Date.now();
      const res = await app.inject({
        method: 'POST',
        url: `/api/trains/${fakeId}/schedules`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: {
          startDate: '2026-06-01',
          endDate: '2026-06-26',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe('TRAIN_NOT_FOUND');
    });

    it('火车状态非 PLANNING - 返回业务错误', async () => {
      // 先创建一个班次使火车状态变为 IN_PROGRESS
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/schedules`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: {
          startDate: '2026-06-01',
          endDate: '2026-06-26',
        },
      });

      const scheduleId = createRes.json().data.id;

      // 尝试再次创建班次
      const res = await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/schedules`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: {
          startDate: '2026-07-01',
          endDate: '2026-07-28',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
      // 火车状态已变为 IN_PROGRESS，不允许再次创建班次
      expect(body.code).toBe('TRAIN_NOT_PLANNING');
    });

    it('结束时间早于开始时间 - 返回业务错误', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/schedules`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: {
          startDate: '2026-06-26',
          endDate: '2026-06-01',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe('TRAIN_SCHEDULE_END_DATE_INVALID');
    });

    it('结束时间等于开始时间 - 返回业务错误', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/schedules`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: {
          startDate: '2026-06-01',
          endDate: '2026-06-01',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe('TRAIN_SCHEDULE_END_DATE_INVALID');
    });
  });

  // ========== 班次名称 ==========

  describe('班次名称', () => {
    it('不填写班次名称 - 自动生成名称格式', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/schedules`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: {
          startDate: '2026-06-01',
          endDate: '2026-06-26',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      // 自动生成的班次名称应该包含火车名称
      expect(body.data.name).toContain('US22_Test_Train');
    });

    it('填写班次名称 - 使用指定名称', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/schedules`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: {
          name: '2026年Q3第1班',
          startDate: '2026-06-01',
          endDate: '2026-06-26',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.name).toBe('2026年Q3第1班');
    });
  });

  // ========== 班次编辑 ==========

  describe('班次编辑', () => {
    it('编辑班次时间 - 关键节点自动重新计算', async () => {
      // 先创建班次
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/schedules`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: {
          startDate: '2026-06-01',
          endDate: '2026-06-26',
        },
      });

      const schedule = createRes.json().data;
      const scheduleId = schedule.id;
      const scheduleVersion = schedule.version;

      // 编辑班次（正确的 URL 包含 scheduleId）
      const updateRes = await app.inject({
        method: 'PATCH',
        url: `/api/trains/${trainId}/schedules/${scheduleId}`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: {
          version: scheduleVersion,
          startDate: '2026-07-01',
          endDate: '2026-07-28',
        },
      });

      expect(updateRes.statusCode).toBe(200);
      const body = updateRes.json();
      expect(body.success).toBe(true);
      expect(body.data.startDate).toBe('2026-07-01');
      expect(body.data.endDate).toBe('2026-07-28');
    });

    it('编辑班次 - 乐观锁校验', async () => {
      // 先创建班次
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/schedules`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: {
          startDate: '2026-06-01',
          endDate: '2026-06-26',
        },
      });

      const scheduleId = createRes.json().data.id;

      // 使用错误的版本号编辑
      const updateRes = await app.inject({
        method: 'PATCH',
        url: `/api/trains/${trainId}/schedules/${scheduleId}`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: {
          version: 999, // 错误的版本号
          startDate: '2026-07-01',
          endDate: '2026-07-28',
        },
      });

      expect(updateRes.statusCode).toBe(200);
      const body = updateRes.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe('TRAIN_VERSION_CONFLICT');
    });
  });

  // ========== 班次查询 ==========

  describe('班次查询', () => {
    it('获取班次列表 - 返回班次摘要', async () => {
      // 先创建班次
      await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/schedules`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: {
          startDate: '2026-06-01',
          endDate: '2026-06-26',
        },
      });

      // 获取班次列表
      const listRes = await app.inject({
        method: 'GET',
        url: `/api/trains/${trainId}/schedules`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
      });

      expect(listRes.statusCode).toBe(200);
      const listBody = listRes.json();
      expect(listBody.success).toBe(true);
      expect(Array.isArray(listBody.data.list)).toBe(true);
      expect(listBody.data.list.length).toBeGreaterThan(0);

      // 获取第一个班次的 ID
      const scheduleId = listBody.data.list[0].id;

      // 获取班次详情
      const detailRes = await app.inject({
        method: 'GET',
        url: `/api/trains/${trainId}/schedules/${scheduleId}`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
      });

      expect(detailRes.statusCode).toBe(200);
      const detailBody = detailRes.json();
      expect(detailBody.success).toBe(true);
      expect(detailBody.data.trainId).toBe(trainId);
      expect(detailBody.data.startDate).toBe('2026-06-01');
      expect(detailBody.data.endDate).toBe('2026-06-26');
      expect(Array.isArray(detailBody.data.snapshots)).toBe(true);
    });
  });
});
