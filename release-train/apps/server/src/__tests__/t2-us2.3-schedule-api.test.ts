// ========== T2 US2.3 班次列表查询与火车切换 - L2 API 自动化测试 ==========
// 测试范围：全局班次列表、指定火车班次列表、分页、排序、认证、权限
// 参考：appendix-T2-US2.3-测试案例测试方式对照表.md（TC2.3-API-01~08）
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createApp } from '../app.js';
import { prisma } from '../prisma/index.js';
import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';

describe('T2 US2.3 班次列表查询与火车切换 - L2 API', () => {
  let app: FastifyInstance;
  let trainAdminToken: string;
  let trainAdminId: string;
  let normalUserToken: string;
  let normalUserId: string;
  let trainId: string;
  let scheduleId: string;
  let testTimestamp: string;

  beforeAll(async () => {
    app = await createApp();
    await app.ready();
    testTimestamp = Date.now().toString();

    const passwordHash = await bcrypt.hash('TestPass123!', 10);

    // 创建火车管理员
    const trainAdmin = await prisma.user.create({
      data: {
        username: 'train_admin_us23_' + testTimestamp,
        password: passwordHash,
        displayName: '火车管理员',
        email: 'train_admin_us23_' + testTimestamp + '@test.com',
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

    // 创建普通用户（BA 角色，无火车管理权限）
    const normalUser = await prisma.user.create({
      data: {
        username: 'normal_user_us23_' + testTimestamp,
        password: passwordHash,
        displayName: '普通用户',
        email: 'normal_user_us23_' + testTimestamp + '@test.com',
        role: 'BA',
      },
    });
    normalUserId = normalUser.id;

    normalUserToken = (
      await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: normalUser.username, password: 'TestPass123!' },
      })
    ).json().data.token;
  });

  beforeEach(async () => {
    const system = await prisma.system.create({
      data: { name: 'US23_Sys_' + testTimestamp + '_' + Math.random(), description: '测试系统' },
    });

    const train = await prisma.train.create({
      data: {
        name: 'US23_Test_Train_' + testTimestamp + '_' + Math.random(),
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
        name: 'US23_Test_Schedule',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-26'),
        boardingDate: new Date('2026-05-29'),
        sitDate: new Date('2026-06-12'),
        uatDate: new Date('2026-06-17'),
        lockdownDate: new Date('2026-06-23'),
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
    await prisma.system.deleteMany({ where: { name: { startsWith: 'US23_Sys_' + testTimestamp } } });
    try {
      await prisma.user.deleteMany({ where: { id: trainAdminId } });
      await prisma.user.deleteMany({ where: { id: normalUserId } });
    } catch (e) {
      console.warn('清理测试用户失败:', (e as Error).message);
    }
    await prisma.$disconnect();
  });

  // ========== TC2.3-API-01 查询全局班次列表 ==========
  describe('TC2.3-API-01 查询全局班次列表', () => {
    it('认证用户查询全局班次列表 → 返回结构包含 list 和 pagination', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/schedules',
        headers: { Authorization: `Bearer ${trainAdminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('list');
      expect(body.data).toHaveProperty('pagination');
      expect(body.data.list).toBeInstanceOf(Array);
    });

    it('返回字段包含班次基本信息', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/schedules',
        headers: { Authorization: `Bearer ${trainAdminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      if (body.data.list.length > 0) {
        const firstItem = body.data.list[0];
        expect(firstItem).toHaveProperty('id');
        expect(firstItem).toHaveProperty('name');
        expect(firstItem).toHaveProperty('trainName');
        expect(firstItem).toHaveProperty('status');
      }
    });
  });

  // ========== TC2.3-API-02 全局班次列表分页 ==========
  describe('TC2.3-API-02 全局班次列表分页', () => {
    it('默认分页参数 → page=1, pageSize=20', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/schedules',
        headers: { Authorization: `Bearer ${trainAdminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.pagination.page).toBe(1);
      expect(body.data.pagination.pageSize).toBe(20);
    });

    it('自定义分页参数 → page=2, pageSize=10', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/schedules?page=2&pageSize=10',
        headers: { Authorization: `Bearer ${trainAdminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.pagination.page).toBe(2);
      expect(body.data.pagination.pageSize).toBe(10);
    });

    // TODO: Schema 验证 minimum: 1，但项目使用 200 统一响应格式处理验证错误
    // 需确认业务期望：是否应返回 HTTP 400，或保持 200 + success: false
    it('边界参数 → page=0 返回 success: false（Schema 验证错误）', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/schedules?page=0',
        headers: { Authorization: `Bearer ${trainAdminToken}` },
      });

      // Schema 定义 minimum: 1，但项目统一使用 200 响应格式
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(false);
    });

    it('边界参数 → pageSize=100 不超过最大值', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/schedules?pageSize=100',
        headers: { Authorization: `Bearer ${trainAdminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.data.pagination.pageSize).toBeLessThanOrEqual(100);
    });
  });

  // ========== TC2.3-API-03 全局班次按创建时间倒序 ==========
  describe('TC2.3-API-03 全局班次按创建时间倒序', () => {
    it('返回列表按 createdAt 倒序排列', async () => {
      // 创建多个班次以验证排序
      await prisma.trainSchedule.create({
        data: {
          trainId,
          name: 'US23_Schedule_2',
          startDate: new Date('2026-07-01'),
          endDate: new Date('2026-07-26'),
          status: 'PLANNING',
          createdById: trainAdminId,
        },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/schedules',
        headers: { Authorization: `Bearer ${trainAdminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      if (body.data.list.length >= 2) {
        const dates = body.data.list.map((item: any) => new Date(item.createdAt).getTime());
        for (let i = 0; i < dates.length - 1; i++) {
          expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
        }
      }
    });
  });

  // ========== TC2.3-API-04 查询指定火车班次列表 ==========
  describe('TC2.3-API-04 查询指定火车班次列表', () => {
    it('查询指定火车的班次列表 → 返回该火车的班次', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/trains/${trainId}/schedules`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.list).toBeInstanceOf(Array);
      body.data.list.forEach((item: any) => {
        expect(item.trainId).toBe(trainId);
      });
    });
  });

  // ========== TC2.3-API-05 查询不存在火车的班次列表 ==========
  describe('TC2.3-API-05 查询不存在火车的班次列表', () => {
    it('查询不存在的火车 → 返回错误', async () => {
      const fakeTrainId = 'non-existent-train-id';
      const res = await app.inject({
        method: 'GET',
        url: `/api/trains/${fakeTrainId}/schedules`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
      });

      expect(res.json().success).toBe(false);
      expect(res.json().code).toBeDefined();
    });
  });

  // ========== TC2.3-API-06 未登录不可查询班次列表 ==========
  // TODO: 项目使用 200 统一响应格式，错误通过 success: false 标识
  // 需确认是否应改为 HTTP 状态码 401，或调整测试策略文档预期
  describe('TC2.3-API-06 未登录不可查询班次列表', () => {
    it('未登录查询全局班次列表 → 返回 success: false', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/schedules',
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(false);
    });

    it('未登录查询指定火车班次列表 → 返回 success: false', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/trains/${trainId}/schedules`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(false);
    });
  });

  // ========== TC2.3-API-07 非火车管理员不可创建班次 ==========
  // TODO: 项目使用 200 统一响应格式，错误通过 success: false 标识
  describe('TC2.3-API-07 非火车管理员不可创建班次', () => {
    it('普通用户尝试创建班次 → 返回 success: false', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/schedules`,
        headers: { Authorization: `Bearer ${normalUserToken}` },
        payload: {
          startDate: '2026-08-01',
          endDate: '2026-08-26',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(false);
    });
  });

  // ========== TC2.3-API-08 非火车管理员不可变更班次状态 ==========
  // TODO: 项目使用 200 统一响应格式，错误通过 success: false 标识
  describe('TC2.3-API-08 非火车管理员不可变更班次状态', () => {
    it('普通用户尝试变更班次状态 → 返回 success: false', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/schedules/${scheduleId}/status`,
        headers: { Authorization: `Bearer ${normalUserToken}` },
        payload: { status: 'IN_PROGRESS' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(false);
    });

    it('火车管理员变更状态 → 成功', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/trains/${trainId}/schedules/${scheduleId}/status`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
        payload: { status: 'IN_PROGRESS' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
      expect(res.json().data.status).toBe('IN_PROGRESS');
    });
  });
});