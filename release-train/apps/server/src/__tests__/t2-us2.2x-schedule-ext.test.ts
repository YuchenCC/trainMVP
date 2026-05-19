// ========== T2 US2.2.x 火车班次扩展测试 ==========
// 包含：状态变更(US2.2.1)、班次取消(US2.2.2)、关键日期预览(US2.2.3)
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createApp } from '../app.js';
import { prisma } from '../prisma/index.js';
import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';

describe('T2 US2.2.x 火车班次扩展功能', () => {
  let app: FastifyInstance;
  let trainAdminToken: string;
  let trainAdminId: string;
  let trainId: string;
  let scheduleId: string;
  let testTimestamp: string;

  beforeAll(async () => {
    app = await createApp();
    await app.ready();
    testTimestamp = Date.now().toString();

    const passwordHash = await bcrypt.hash('TestPass123!', 10);

    const trainAdmin = await prisma.user.create({
      data: {
        username: 'train_admin_us22x_' + testTimestamp,
        password: passwordHash,
        displayName: '火车管理员',
        email: 'train_admin_us22x_' + testTimestamp + '@test.com',
        role: 'TRAIN_ADMIN',
      },
    });
    trainAdminId = trainAdmin.id;

    trainAdminToken = (
      await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: trainAdmin.username, password: 'TestPass123!' },
      })
    ).json().data.token;
  });

  beforeEach(async () => {
    const system = await prisma.system.create({
      data: { name: 'US22x_Sys_' + testTimestamp + '_' + Math.random(), description: '测试系统' },
    });

    const train = await prisma.train.create({
      data: {
        name: 'US22x_Test_Train_' + testTimestamp + '_' + Math.random(),
        description: '测试火车',
        createdById: trainAdminId,
      },
    });

    await prisma.trainSystem.create({
      data: {
        trainId: train.id,
        systemId: system.id,
        capacityPoints: 100,
        usedPoints: 0,
      },
    });

    trainId = train.id;

    const schedule = await prisma.trainSchedule.create({
      data: {
        trainId: train.id,
        name: 'US22x_Test_Schedule',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-26'),
        boardingDate: new Date('2026-06-12'),
        lockdownDate: new Date('2026-06-19'),
        releaseDate: new Date('2026-06-26'),
        status: 'PLANNING',
        createdById: trainAdminId,
      },
    });
    scheduleId = schedule.id;
  });

  afterAll(async () => {
    await app.close();
    await prisma.trainSchedule.deleteMany({ where: { train: { createdById: trainAdminId } } });
    await prisma.train.deleteMany({ where: { createdById: trainAdminId } });
    await prisma.system.deleteMany({ where: { name: { startsWith: 'US22x_Sys_' + testTimestamp } } });
    try {
      await prisma.user.deleteMany({ where: { id: trainAdminId } });
    } catch (e) {
      console.warn('清理测试用户失败:', (e as Error).message);
    }
    await prisma.$disconnect();
  });

  // ========== US2.2.1 班次状态变更 ==========
  describe('US2.2.1 班次状态变更', () => {
    it('PLANNING → IN_PROGRESS 变更成功', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/schedules/${scheduleId}/status`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: { status: 'IN_PROGRESS' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('IN_PROGRESS');
    });

    it('IN_PROGRESS → LOCKED_DOWN 变更成功', async () => {
      await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/schedules/${scheduleId}/status`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: { status: 'IN_PROGRESS' },
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/schedules/${scheduleId}/status`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: { status: 'LOCKED_DOWN' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('LOCKED_DOWN');
    });

    it('LOCKED_DOWN → RELEASED 变更成功', async () => {
      await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/schedules/${scheduleId}/status`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: { status: 'IN_PROGRESS' },
      });
      await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/schedules/${scheduleId}/status`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: { status: 'LOCKED_DOWN' },
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/schedules/${scheduleId}/status`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: { status: 'RELEASED' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('RELEASED');
    });

    it('RELEASED 是终态，不能再变更', async () => {
      await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/schedules/${scheduleId}/status`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: { status: 'IN_PROGRESS' },
      });
      await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/schedules/${scheduleId}/status`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: { status: 'LOCKED_DOWN' },
      });
      await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/schedules/${scheduleId}/status`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: { status: 'RELEASED' },
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/schedules/${scheduleId}/status`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: { status: 'PLANNING' },
      });

      expect(res.json().success).toBe(false);
    });

    it('PLANNING 不能跳到 LOCKED_DOWN（跳过 IN_PROGRESS）', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/schedules/${scheduleId}/status`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: { status: 'LOCKED_DOWN' },
      });

      expect(res.json().success).toBe(false);
    });

    it('IN_PROGRESS 不能跳到 RELEASED（跳过 LOCKED_DOWN）', async () => {
      await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/schedules/${scheduleId}/status`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: { status: 'IN_PROGRESS' },
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/schedules/${scheduleId}/status`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: { status: 'RELEASED' },
      });

      expect(res.json().success).toBe(false);
    });

    it('不存在的班次返回错误', async () => {
      const fakeScheduleId = 'fake-schedule-id-' + Date.now();
      const res = await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/schedules/${fakeScheduleId}/status`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: { status: 'IN_PROGRESS' },
      });

      expect(res.json().success).toBe(false);
      expect(res.json().code).toBe('TRAIN_NOT_FOUND');
    });
  });

  // ========== US2.2.2 班次取消 ==========
  describe('US2.2.2 班次取消', () => {
    it('可以取消空班次', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/trains/${trainId}/schedules/${scheduleId}`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
    });

    it('取消后班次不存在', async () => {
      await app.inject({
        method: 'DELETE',
        url: `/api/trains/${trainId}/schedules/${scheduleId}`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
      });

      const detailRes = await app.inject({
        method: 'GET',
        url: `/api/trains/${trainId}/schedules`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
      });

      const scheduleIds = detailRes.json().data.list.map((s: any) => s.id);
      expect(scheduleIds).not.toContain(scheduleId);
    });

    it('不存在的班次取消返回错误', async () => {
      const fakeScheduleId = 'fake-schedule-id-' + Date.now();
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/trains/${trainId}/schedules/${fakeScheduleId}`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
      });

      expect(res.json().success).toBe(false);
    });
  });

  // ========== US2.2.3 关键日期预览 ==========
  describe('US2.2.3 关键日期预览', () => {
    it('预览关键日期成功', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/trains/schedules/preview',
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: {
          startDate: '2026-06-01',
          endDate: '2026-06-26',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.boardingDate).toBeDefined();
      expect(body.data.lockdownDate).toBeDefined();
      expect(body.data.releaseDate).toBe('2026-06-26');
    });

    it('结束日期早于开始日期返回错误', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/trains/schedules/preview',
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: {
          startDate: '2026-06-26',
          endDate: '2026-06-01',
        },
      });

      expect(res.json().success).toBe(false);
      expect(res.json().code).toBe('TRAIN_SCHEDULE_END_DATE_INVALID');
    });

    it('开始日期等于结束日期返回错误', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/trains/schedules/preview',
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: {
          startDate: '2026-06-01',
          endDate: '2026-06-01',
        },
      });

      expect(res.json().success).toBe(false);
      expect(res.json().code).toBe('TRAIN_SCHEDULE_END_DATE_INVALID');
    });

    it('预览日期计算正确（21天周期）', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/trains/schedules/preview',
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: {
          startDate: '2026-06-01',
          endDate: '2026-06-27',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.releaseDate).toBe('2026-06-27');
      expect(body.data.lockdownDate).toBeDefined();
    });
  });
});
