// ========== T1 US1.2 系统管理集成测试 ==========
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../app.js';
import { prisma } from '../prisma/index.js';
import { FastifyInstance } from 'fastify';

const TEST_SYSTEM = {
  name: '测试系统_US1.2',
  description: 'US1.2 系统管理集成测试用系统',
};

const TEST_BA = {
  username: 'test_ba_us12',
  password: 'BAPass123!',
  displayName: '测试BA_US1.2',
  email: 'test_ba_us12@test.com',
};

describe('T1 US1.2 系统管理', () => {
  let app: FastifyInstance;
  let systemId: string;
  let baToken: string;
  let testTimestamp: string;

  beforeAll(async () => {
    testTimestamp = Date.now().toString();
    app = await createApp();
    await app.ready();

    // 清理测试数据
    await prisma.statusLog.deleteMany({
      where: { operator: { username: { startsWith: 'test_ba_us12' } } },
    });
    await prisma.requirement.deleteMany({
      where: { creator: { username: { startsWith: 'test_ba_us12' } } },
    });
    await prisma.systemMember.deleteMany({
      where: { user: { username: { startsWith: 'test_ba_us12' } } },
    });
    await prisma.user.deleteMany({
      where: { username: { startsWith: 'test_ba_us12' } },
    });
    await prisma.system.deleteMany({
      where: { name: { startsWith: '测试系统_US1.2' } },
    });

    // 创建测试系统
    const system = await prisma.system.create({
      data: { name: TEST_SYSTEM.name + '_' + testTimestamp, description: TEST_SYSTEM.description },
    });
    systemId = system.id;

    // 使用 seed 接口创建BA用户
    const baUsername = TEST_BA.username + '_' + testTimestamp;
    const seedRes = await app.inject({
      method: 'POST',
      url: '/api/auth/seed',
      payload: { ...TEST_BA, username: baUsername, role: 'BA' },
    });
    expect(seedRes.statusCode).toBe(200);

    // 将用户加入系统
    const baUser = await prisma.user.findUnique({ where: { username: baUsername } });
    if (baUser) {
      await prisma.systemMember.create({
        data: {
          systemId: systemId,
          userId: baUser.id,
          role: 'BA',
        },
      });
    }

    // 登录获取token
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: baUsername, password: TEST_BA.password },
    });
    expect(loginRes.statusCode).toBe(200);
    baToken = loginRes.json().data.token;
  });

  afterAll(async () => {
    await app.close();
    await prisma.statusLog.deleteMany({
      where: { operator: { username: { startsWith: 'test_ba_us12' } } },
    });
    await prisma.requirement.deleteMany({
      where: { creator: { username: { startsWith: 'test_ba_us12' } } },
    });
    await prisma.systemMember.deleteMany({
      where: { user: { username: { startsWith: 'test_ba_us12' } } },
    });
    await prisma.user.deleteMany({
      where: { username: { startsWith: 'test_ba_us12' } },
    });
    await prisma.system.deleteMany({
      where: { name: { startsWith: '测试系统_US1.2' } },
    });
    await prisma.$disconnect();
  });

  // ========== 系统列表查询 ==========
  describe('GET /api/systems 系统列表', () => {
    it('应返回系统列表', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/systems',
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('支持关键词搜索', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/systems?q=${TEST_SYSTEM.name}`,
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('不存在的关键词应返回空列表', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/systems?q=不存在的系统名_ZZZZ',
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.length).toBe(0);
    });

    it('无Token应返回失败', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/systems',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
    });
  });

  // ========== 系统成员查询 ==========
  describe('GET /api/systems/:id/users 系统成员', () => {
    it('应返回系统成员列表', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/systems/${systemId}/users`,
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);

      if (body.data.length > 0) {
        const member = body.data[0];
        expect(member).toHaveProperty('id');
        expect(member).toHaveProperty('displayName');
        expect(member).toHaveProperty('role');
      }
    });

    it('不存在的系统应返回失败', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/systems/non-existent-id/users',
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
    });
  });

  // ========== 可选系统列表 ==========
  describe('GET /api/systems/available 可选系统列表', () => {
    it('应返回可选系统列表', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/systems/available',
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('可选系统列表应包含必要字段', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/systems/available',
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);

      for (const system of body.data) {
        expect(system).toHaveProperty('id');
        expect(system).toHaveProperty('name');
      }
    });
  });
});
