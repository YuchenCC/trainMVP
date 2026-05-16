// ========== T2 US2.1 版本火车创建 集成测试 ==========
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../app.js';
import { prisma } from '../prisma/index.js';
import { FastifyInstance } from 'fastify';

describe('T2 US2.1 版本火车创建', () => {
  let app: FastifyInstance;
  let adminToken: string;
  let systemIds: string[] = [];

  beforeAll(async () => {
    app = await createApp();
    await app.ready();

    // 清理测试数据
    await prisma.trainSystem.deleteMany({
      where: { train: { name: { startsWith: '[UT]' } } },
    });
    await prisma.train.deleteMany({
      where: { name: { startsWith: '[UT]' } },
    });
    await prisma.system.deleteMany({
      where: { name: { startsWith: '[UT]' } },
    });

    // 创建多个测试系统
    const testTimestamp = Date.now().toString();
    for (let i = 0; i < 20; i++) {
      const system = await prisma.system.create({
        data: { 
          name: `[UT]测试系统_${testTimestamp}_${i}`, 
          description: `单元测试系统 ${i}` 
        },
      });
      systemIds.push(system.id);
    }

    // 登录获取 token
    const adminLoginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'admin', password: 'admin123' },
    });
    adminToken = adminLoginRes.json().data.token;
  });

  afterAll(async () => {
    await app.close();
  });

  // 创建火车辅助函数
  const createTrain = async (name: string, systems: { systemId: string; capacityPoints: number }[]) => {
    return app.inject({
      method: 'POST',
      url: '/api/trains',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name, systems },
    });
  };

  // TC2.1.1 创建火车
  describe('TC2.1.1 POST /api/trains 创建火车', () => {
    it('可以创建火车', async () => {
      const res = await createTrain('[UT]火车_创建', [{ systemId: systemIds[0], capacityPoints: 100 }]);
      expect(res.statusCode).toBe(201);
      expect(res.json().success).toBe(true);
      expect(res.json().data.name).toBe('[UT]火车_创建');
      expect(res.json().data.status).toBe('PLANNING');
    });

    it('火车名称必填', async () => {
      const res = await createTrain('', [{ systemId: systemIds[1], capacityPoints: 100 }]);
      expect(res.json().success).toBe(false);
    });

    it('火车名称长度至少2字符', async () => {
      const res = await createTrain('A', [{ systemId: systemIds[2], capacityPoints: 100 }]);
      expect(res.json().success).toBe(false);
    });

    it('至少需要一个搭载系统', async () => {
      const res = await createTrain('[UT]火车_无系统', []);
      expect(res.json().success).toBe(false);
    });

    it('容量点数必须在 1-500 范围内', async () => {
      const res = await createTrain('[UT]火车_容量超限', [{ systemId: systemIds[3], capacityPoints: 600 }]);
      expect(res.json().success).toBe(false);
    });

    it('系统冲突', async () => {
      // 第一个火车使用 systemIds[4]
      const res1 = await createTrain('[UT]火车_冲突1', [{ systemId: systemIds[4], capacityPoints: 100 }]);
      expect(res1.statusCode).toBe(201);

      // 第二个火车也使用 systemIds[4]
      const res2 = await createTrain('[UT]火车_冲突2', [{ systemId: systemIds[4], capacityPoints: 50 }]);
      expect(res2.json().success).toBe(false);
      expect(res2.json().code).toBe('TRAIN_SYSTEM_CONFLICT');
    });

    it('未登录无法创建火车', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/trains',
        payload: { name: '[UT]火车_未登录', systems: [{ systemId: systemIds[5], capacityPoints: 100 }] },
      });
      // 由于错误处理返回 200 格式，检查 success 字段
      expect(res.json().success).toBe(false);
    });
  });

  // TC2.1.2 火车列表
  describe('TC2.1.2 GET /api/trains 火车列表', () => {
    it('可以获取火车列表', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/trains',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
      expect(Array.isArray(res.json().data.list)).toBe(true);
    });

    it('支持按状态筛选', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/trains?status=PLANNING',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
    });

    it('支持分页参数', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/trains?page=1&pageSize=5',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().data.pagination.page).toBe(1);
      expect(res.json().data.pagination.pageSize).toBe(5);
    });

    it('未登录无法访问', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/trains',
      });
      // 注意：由于错误处理返回 200 格式，这里检查 success 字段
      expect(res.json().success).toBe(false);
    });
  });

  // TC2.1.3 火车详情
  describe('TC2.1.3 GET /api/trains/:id 火车详情', () => {
    it('可以获取火车详情', async () => {
      const createRes = await createTrain('[UT]火车_详情', [{ systemId: systemIds[6], capacityPoints: 80 }]);
      const trainId = createRes.json().data.id;

      const res = await app.inject({
        method: 'GET',
        url: `/api/trains/${trainId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.id).toBe(trainId);
      expect(res.json().data.systems).toHaveLength(1);
    });

    it('不存在的火车返回错误', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/trains/nonexistent-id-12345',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.json().success).toBe(false);
    });
  });

  // TC2.1.4 更新火车
  describe('TC2.1.4 PATCH /api/trains/:id 更新火车', () => {
    it('可以更新火车名称', async () => {
      const createRes = await createTrain('[UT]火车_更新前', [{ systemId: systemIds[7], capacityPoints: 60 }]);
      const trainId = createRes.json().data.id;
      const version = createRes.json().data.version;

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/trains/${trainId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { name: '[UT]火车_已更新', version },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.name).toBe('[UT]火车_已更新');
      expect(res.json().data.version).toBe(version + 1);
    });

    it('乐观锁版本冲突', async () => {
      const createRes = await createTrain('[UT]火车_乐观锁', [{ systemId: systemIds[8], capacityPoints: 50 }]);
      const trainId = createRes.json().data.id;

      // 第一次更新
      await app.inject({
        method: 'PATCH',
        url: `/api/trains/${trainId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { name: '第一次更新', version: 1 },
      });

      // 第二次用旧版本更新，应该冲突
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/trains/${trainId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { name: '第二次更新', version: 1 },
      });

      expect(res.json().success).toBe(false);
      expect(res.json().code).toBe('TRAIN_VERSION_CONFLICT');
    });
  });

  // TC2.1.5 取消火车
  describe('TC2.1.5 POST /api/trains/:id/cancel 取消火车', () => {
    it('可以取消规划中的火车', async () => {
      const createRes = await createTrain('[UT]火车_待取消', [{ systemId: systemIds[9], capacityPoints: 30 }]);
      const trainId = createRes.json().data.id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/cancel`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.status).toBe('CANCELLED');
    });

    it('非规划中状态不能取消', async () => {
      const createRes = await createTrain('[UT]火车_重复取消', [{ systemId: systemIds[10], capacityPoints: 25 }]);
      const trainId = createRes.json().data.id;

      await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/cancel`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/cancel`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.json().success).toBe(false);
    });
  });

  // TC2.1.6 可选系统列表
  describe('TC2.1.6 GET /api/systems/available 可选系统列表', () => {
    it('可以获取可选系统列表', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/systems/available',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.json().data)).toBe(true);
    });

    it('返回的系统包含冲突信息', async () => {
      await createTrain('[UT]火车_冲突检测', [{ systemId: systemIds[11], capacityPoints: 100 }]);

      const res = await app.inject({
        method: 'GET',
        url: '/api/systems/available',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      const conflictedSystem = res.json().data.find((s: any) => s.id === systemIds[11]);
      expect(conflictedSystem?.conflictTrain).toBeDefined();
    });
  });

  // TC2.1.7 添加搭载系统
  describe('TC2.1.7 POST /api/trains/:id/systems 添加搭载系统', () => {
    it('可以向火车添加搭载系统', async () => {
      // 创建一个带系统的火车
      const createRes = await createTrain('[UT]火车_添加系统', [{ systemId: systemIds[12], capacityPoints: 50 }]);
      const trainId = createRes.json().data.id;

      // 添加一个新系统
      const res = await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/systems`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { systemId: systemIds[16], capacityPoints: 70 },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().data.system.id).toBe(systemIds[16]);
      expect(res.json().data.capacityPoints).toBe(70);
    });

    it('不能添加已在火车中的系统', async () => {
      const createRes = await createTrain('[UT]火车_重复添加', [{ systemId: systemIds[13], capacityPoints: 100 }]);
      const trainId = createRes.json().data.id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/systems`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { systemId: systemIds[13], capacityPoints: 50 },
      });

      expect(res.json().success).toBe(false);
      expect(res.json().code).toBe('TRAIN_SYSTEM_CONFLICT');
    });
  });

  // TC2.1.8 更新搭载系统
  describe('TC2.1.8 PATCH /api/trains/:id/systems/:systemId 更新搭载系统', () => {
    it('可以更新搭载系统容量', async () => {
      const createRes = await createTrain('[UT]火车_更新系统', [{ systemId: systemIds[14], capacityPoints: 50 }]);
      const trainId = createRes.json().data.id;
      const systemRecordId = createRes.json().data.systems[0].id;

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/trains/${trainId}/systems/${systemRecordId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { capacityPoints: 80 },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.capacityPoints).toBe(80);
    });
  });

  // TC2.1.9 移除搭载系统
  describe('TC2.1.9 DELETE /api/trains/:id/systems/:systemId 移除搭载系统', () => {
    it('可以移除未使用的搭载系统', async () => {
      const createRes = await createTrain('[UT]火车_移除系统', [{ systemId: systemIds[15], capacityPoints: 30 }]);
      const trainId = createRes.json().data.id;
      const systemRecordId = createRes.json().data.systems[0].id;

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/trains/${trainId}/systems/${systemRecordId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);

      const detailRes = await app.inject({
        method: 'GET',
        url: `/api/trains/${trainId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(detailRes.json().data.systems).toHaveLength(0);
    });
  });
});
