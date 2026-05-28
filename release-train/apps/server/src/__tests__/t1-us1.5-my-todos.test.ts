// ========== T1 US1.5 用户待办聚合测试 ==========
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../app.js';
import { prisma } from '../prisma/index.js';
import { FastifyInstance } from 'fastify';

const TEST_SYSTEM = {
  name: '测试系统_US1.5',
  description: 'US1.5 用户待办集成测试用系统',
};

const TEST_USERS = {
  ba: {
    username: 'test_ba_us15',
    password: 'BAPass123!',
    displayName: '测试BA_US1.5',
    email: 'test_ba_us15@test.com',
    role: 'BA' as const,
  },
  pm: {
    username: 'test_pm_us15',
    password: 'PMPass123!',
    displayName: '测试PM_US1.5',
    email: 'test_pm_us15@test.com',
    role: 'PM' as const,
  },
  projectMgr: {
    username: 'test_pmgr_us15',
    password: 'PMgrPass123!',
    displayName: '测试项目经理_US1.5',
    email: 'test_pmgr_us15@test.com',
    role: 'PROJECT_MGR' as const,
  },
  techMgr: {
    username: 'test_techmgr_us15',
    password: 'TechMgrPass123!',
    displayName: '测试技术经理_US1.5',
    email: 'test_techmgr_us15@test.com',
    role: 'TECH_MGR' as const,
  },
  trainAdmin: {
    username: 'test_trainadmin_us15',
    password: 'TrainAdminPass123!',
    displayName: '测试火车管理员_US1.5',
    email: 'test_trainadmin_us15@test.com',
    role: 'TRAIN_ADMIN' as const,
  },
};

describe('T1 US1.5 用户待办聚合', () => {
  let app: FastifyInstance;
  let systemId: string;
  let tokens: Record<string, string> = {};
  let testTimestamp: string;

  beforeAll(async () => {
    testTimestamp = Date.now().toString();
    app = await createApp();
    await app.ready();

    // 清理测试数据
    await prisma.statusLog.deleteMany({
      where: { operator: { username: { startsWith: 'test_', contains: '_us15' } } },
    });
    await prisma.requirement.deleteMany({
      where: { creator: { username: { startsWith: 'test_', contains: '_us15' } } },
    });
    await prisma.systemMember.deleteMany({
      where: { user: { username: { startsWith: 'test_', contains: '_us15' } } },
    });
    await prisma.user.deleteMany({
      where: { username: { startsWith: 'test_', contains: '_us15' } },
    });
    await prisma.system.deleteMany({
      where: { name: { startsWith: '测试系统_US1.5' } },
    });

    // 创建测试系统
    const system = await prisma.system.create({
      data: { name: TEST_SYSTEM.name + '_' + testTimestamp, description: TEST_SYSTEM.description },
    });
    systemId = system.id;

    // 创建各角色用户并登录
    for (const [key, userData] of Object.entries(TEST_USERS)) {
      const username = userData.username + '_' + testTimestamp;

      // 使用 seed 接口创建用户
      const seedRes = await app.inject({
        method: 'POST',
        url: '/api/auth/seed',
        payload: { ...userData, username },
      });
      expect(seedRes.statusCode).toBe(200);

      // 将用户加入系统
      const user = await prisma.user.findUnique({ where: { username } });
      if (user) {
        await prisma.systemMember.create({
          data: {
            systemId: systemId,
            userId: user.id,
            role: 'BA',
          },
        });
      }

      // 登录获取token
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username, password: userData.password },
      });
      expect(loginRes.statusCode).toBe(200);
      tokens[key] = loginRes.json().data.token;
    }
  });

  afterAll(async () => {
    await app.close();
    await prisma.statusLog.deleteMany({
      where: { operator: { username: { startsWith: 'test_', contains: '_us15' } } },
    });
    await prisma.requirement.deleteMany({
      where: { creator: { username: { startsWith: 'test_', contains: '_us15' } } },
    });
    await prisma.systemMember.deleteMany({
      where: { user: { username: { startsWith: 'test_', contains: '_us15' } } },
    });
    await prisma.user.deleteMany({
      where: { username: { startsWith: 'test_', contains: '_us15' } },
    });
    await prisma.system.deleteMany({
      where: { name: { startsWith: '测试系统_US1.5' } },
    });
    await prisma.$disconnect();
  });

  // ========== BA 待办 ==========
  describe('BA 待办 (GET /api/requirements/my-todos)', () => {
    it('BA应能获取自己的待办', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/requirements/my-todos',
        headers: { Authorization: `Bearer ${tokens.ba}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('pendingReviewRejected');
      expect(body.data).toHaveProperty('changeApprovedNeedsResubmit');
      expect(Array.isArray(body.data.pendingReviewRejected)).toBe(true);
      expect(Array.isArray(body.data.changeApprovedNeedsResubmit)).toBe(true);
    });

    it('BA无Token应返回失败', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/requirements/my-todos',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
    });
  });

  // ========== PM 待办 ==========
  describe('PM 待办', () => {
    it('PM应能获取自己的待办', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/requirements/my-todos',
        headers: { Authorization: `Bearer ${tokens.pm}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('pendingReviewList');
      expect(Array.isArray(body.data.pendingReviewList)).toBe(true);
    });
  });

  // ========== PROJECT_MGR 待办 ==========
  describe('PROJECT_MGR 待办', () => {
    it('PROJECT_MGR应能获取自己的待办', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/requirements/my-todos',
        headers: { Authorization: `Bearer ${tokens.projectMgr}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('pendingReviewList');
      expect(body.data).toHaveProperty('emergencyPendingApproval');
      expect(Array.isArray(body.data.pendingReviewList)).toBe(true);
      expect(Array.isArray(body.data.emergencyPendingApproval)).toBe(true);
    });
  });

  // ========== TECH_MGR 待办 ==========
  describe('TECH_MGR 待办', () => {
    it('TECH_MGR应能获取自己的待办', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/requirements/my-todos',
        headers: { Authorization: `Bearer ${tokens.techMgr}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('pendingReviewList');
      expect(body.data).toHaveProperty('pendingDevComplete');
      expect(Array.isArray(body.data.pendingReviewList)).toBe(true);
      expect(Array.isArray(body.data.pendingDevComplete)).toBe(true);
    });
  });

  // ========== TRAIN_ADMIN 待办 ==========
  describe('TRAIN_ADMIN 待办', () => {
    it('TRAIN_ADMIN应能获取自己的待办', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/requirements/my-todos',
        headers: { Authorization: `Bearer ${tokens.trainAdmin}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('pendingOnboard');
      expect(body.data).toHaveProperty('pendingRelease');
      expect(Array.isArray(body.data.pendingOnboard)).toBe(true);
      expect(Array.isArray(body.data.pendingRelease)).toBe(true);
    });
  });
});
