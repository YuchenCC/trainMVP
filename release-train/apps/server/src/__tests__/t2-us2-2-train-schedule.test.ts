// ========== T2 US2.2 火车班次创建集成测试 ==========
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createApp } from '../app';
import { prisma } from '../prisma';
import { FastifyInstance } from 'fastify';

describe('T2 US2.2 火车班次创建', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let testSystemId: string;

  beforeAll(async () => {
    app = await createApp();
    await app.ready();

    // 清理旧的测试数据
    await prisma.trainSystem.deleteMany({
      where: { train: { name: { startsWith: '[UT-SCHEDULE]' } } },
    });
    await prisma.train.deleteMany({
      where: { name: { startsWith: '[UT-SCHEDULE]' } },
    });
    await prisma.system.deleteMany({
      where: { name: { startsWith: '[UT-SCHEDULE]' } },
    });

    // 创建测试系统
    const testSystem = await prisma.system.create({
      data: {
        name: '[UT-SCHEDULE] Test System 1',
        description: 'Test system for schedule',
      },
    });
    testSystemId = testSystem.id;

    // 登录获取 admin token
    const adminLoginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'admin123' },
    });
    adminToken = adminLoginRes.json().data.token;
  });

  // 每个测试前创建新的火车
  let testTrainId: string;
  beforeEach(async () => {
    // 先清理之前的火车
    await prisma.trainSystem.deleteMany({
      where: { train: { name: { startsWith: '[UT-SCHEDULE]' } } },
    });
    await prisma.train.deleteMany({
      where: { name: { startsWith: '[UT-SCHEDULE]' } },
    });

    const createTrainRes = await app.inject({
      method: 'POST',
      url: '/api/trains',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: `[UT-SCHEDULE] Test Train ${Date.now()}`,
        description: 'Test train for schedule functionality',
        systems: [
          {
            systemId: testSystemId,
            capacityPoints: 50,
          },
        ],
      },
    });
    const responseBody = createTrainRes.json();
    if (!responseBody.success) {
      throw new Error(`Failed to create test train: ${JSON.stringify(responseBody)}`);
    }
    testTrainId = responseBody.data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // ========== T2.2.1 创建火车班次 ==========
  describe('T2.2.1 POST /api/trains/:id/schedule', () => {
    it('应该成功创建火车班次，状态变为进行中', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/trains/${testTrainId}/schedule`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          startDate: '2026-06-01',
          endDate: '2026-06-30',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
      expect(res.json().data.status).toBe('IN_PROGRESS');
      expect(res.json().data.startDate).toBe('2026-06-01');
      expect(res.json().data.endDate).toBe('2026-06-30');
      expect(res.json().data.boardingDate).toBeTruthy();
      expect(res.json().data.lockdownDate).toBeTruthy();
      expect(res.json().data.releaseDate).toBeTruthy();
    });

    it('应该拒绝创建班次，开始时间不能为空', async () => {
      // 测试时不传字段，而不是传空字符串
      const res = await app.inject({
        method: 'POST',
        url: `/api/trains/${testTrainId}/schedule`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          endDate: '2026-06-30',
        },
      });

      expect(res.json().success).toBe(false);
    });

    it('应该拒绝创建班次，结束时间不能为空', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/trains/${testTrainId}/schedule`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          startDate: '2026-06-01',
        },
      });

      expect(res.json().success).toBe(false);
    });

    it('应该拒绝创建班次，结束时间不能早于开始时间', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/trains/${testTrainId}/schedule`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          startDate: '2026-06-30',
          endDate: '2026-06-01',
        },
      });

      expect(res.json().success).toBe(false);
      expect(res.json().code).toBe('TRAIN_SCHEDULE_END_DATE_INVALID');
    });

    it('应该拒绝创建班次，火车不存在', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/trains/nonexistent-train-id-12345/schedule',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          startDate: '2026-06-01',
          endDate: '2026-06-30',
        },
      });

      expect(res.json().success).toBe(false);
      expect(res.json().code).toBe('TRAIN_NOT_FOUND');
    });

    it('应该拒绝创建班次，未登录', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/trains/${testTrainId}/schedule`,
        payload: {
          startDate: '2026-06-01',
          endDate: '2026-06-30',
        },
      });

      expect(res.json().success).toBe(false);
    });
  });

  // ========== T2.2.2 获取关键日期 ==========
  describe('T2.2.2 GET /api/trains/:id/key-dates', () => {
    it('应该成功获取关键日期信息', async () => {
      // 先创建班次
      await app.inject({
        method: 'POST',
        url: `/api/trains/${testTrainId}/schedule`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          startDate: '2026-06-01',
          endDate: '2026-06-30',
        },
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/trains/${testTrainId}/key-dates`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
      expect(res.json().data.startDate).toBe('2026-06-01');
      expect(res.json().data.endDate).toBe('2026-06-30');
      expect(res.json().data.boardingDate).toBeTruthy();
      expect(res.json().data.lockdownDate).toBeTruthy();
      expect(res.json().data.releaseDate).toBe('2026-06-30');
      expect(res.json().data.daysCount).toBeGreaterThan(0);
    });

    it('应该拒绝获取，火车不存在', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/trains/nonexistent-train-id-12345/key-dates',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.json().success).toBe(false);
      expect(res.json().code).toBe('TRAIN_NOT_FOUND');
    });
  });

  // ========== T2.2.3 更新火车班次 ==========
  describe('T2.2.3 PATCH /api/trains/:id/schedule', () => {
    it('应该成功更新火车班次时间', async () => {
      // 先创建班次
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/trains/${testTrainId}/schedule`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          startDate: '2026-06-01',
          endDate: '2026-06-30',
        },
      });
      
      const currentVersion = createRes.json().data.version;

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/trains/${testTrainId}/schedule`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          startDate: '2026-06-10',
          endDate: '2026-07-10',
          version: currentVersion,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
      expect(res.json().data.startDate).toBe('2026-06-10');
      expect(res.json().data.endDate).toBe('2026-07-10');
    });

    it('应该成功手动设置关键节点日期', async () => {
      // 先创建班次
      const createRes = await app.inject({
        method: 'POST',
        url: `/api/trains/${testTrainId}/schedule`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          startDate: '2026-06-01',
          endDate: '2026-06-30',
        },
      });
      
      const currentVersion = createRes.json().data.version;

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/trains/${testTrainId}/schedule`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          boardingDate: '2026-06-15',
          lockdownDate: '2026-06-25',
          version: currentVersion,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
      expect(res.json().data.boardingDate).toBe('2026-06-15');
      expect(res.json().data.lockdownDate).toBe('2026-06-25');
    });
  });
});
