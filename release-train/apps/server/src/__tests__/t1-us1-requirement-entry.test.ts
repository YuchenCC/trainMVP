// ========== T1 US1.1 需求录入集成测试 ==========
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../app.js';
import { prisma } from '../prisma/index.js';
import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';

const TEST_SYSTEM = {
  name: '测试系统_US1',
  description: 'US1.1 需求录入集成测试用系统',
};

const TEST_BA = {
  username: 'test_ba_us1',
  password: 'BAPass123!',
  displayName: '测试BA_US1',
  email: 'test_ba_us1@test.com',
};

const TEST_PM = {
  username: 'test_pm_us1',
  password: 'PMPass123!',
  displayName: '测试PM_US1',
  email: 'test_pm_us1@test.com',
};

const TEST_PROJECT_MGR = {
  username: 'test_pmgr_us1',
  password: 'PMgrPass123!',
  displayName: '测试项目经理_US1',
  email: 'test_pmgr_us1@test.com',
};

describe('T1 US1.1 需求录入', () => {
  let app: FastifyInstance;
  let systemId: string;
  let baId: string;
  let pmId: string;
  let projectMgrId: string;
  let baToken: string;
  let pmToken: string;
  let projectMgrToken: string;
  let createdRequirementId: string;

  beforeAll(async () => {
    app = await createApp();
    await app.ready();

    const baPasswordHash = await bcrypt.hash(TEST_BA.password, 10);
    const pmPasswordHash = await bcrypt.hash(TEST_PM.password, 10);
    const pmgrPasswordHash = await bcrypt.hash(TEST_PROJECT_MGR.password, 10);

    const system = await prisma.system.create({
      data: { name: TEST_SYSTEM.name, description: TEST_SYSTEM.description },
    });
    systemId = system.id;

    const baUser = await prisma.user.create({
      data: { ...TEST_BA, password: baPasswordHash, role: 'BA' },
    });
    baId = baUser.id;

    const pmUser = await prisma.user.create({
      data: { ...TEST_PM, password: pmPasswordHash, role: 'PM' },
    });
    pmId = pmUser.id;

    const pmgrUser = await prisma.user.create({
      data: { ...TEST_PROJECT_MGR, password: pmgrPasswordHash, role: 'PROJECT_MGR' },
    });
    projectMgrId = pmgrUser.id;

    const baLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: TEST_BA.username, password: TEST_BA.password },
    });
    baToken = baLogin.json().data.token;

    const pmLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: TEST_PM.username, password: TEST_PM.password },
    });
    pmToken = pmLogin.json().data.token;

    const pmgrLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: TEST_PROJECT_MGR.username, password: TEST_PROJECT_MGR.password },
    });
    projectMgrToken = pmgrLogin.json().data.token;
  });

  afterAll(async () => {
    await app.close();
    await prisma.requirementDependency.deleteMany({
      where: { dependant: { creatorId: { in: [baId, pmId, projectMgrId] } } },
    });
    await prisma.statusLog.deleteMany({
      where: { requirement: { creatorId: { in: [baId, pmId, projectMgrId] } } },
    });
    await prisma.requirement.deleteMany({
      where: { creatorId: { in: [baId, pmId, projectMgrId] } },
    });
    await prisma.system.deleteMany({ where: { id: systemId } });
    await prisma.user.deleteMany({
      where: { id: { in: [baId, pmId, projectMgrId] } },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/requirements', () => {
    it('BA 创建需求成功，返回完整需求详情', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${baToken}` },
        payload: {
          title: '测试需求-用户登录优化',
          description: '<p>优化用户登录流程，提升体验</p>',
          systemId,
          priority: 'P1',
          storyPoints: 5,
          baId,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.title).toBe('测试需求-用户登录优化');
      expect(body.data.status).toBe('DRAFT');
      expect(body.data.system.id).toBe(systemId);
      expect(body.data.ba.id).toBe(baId);
      expect(body.data.creator.id).toBe(baId);
      expect(body.data.reqCode).toMatch(/^REQ-\d{4}-\d{4}$/);
      expect(body.data.storyPoints).toBe(5);
      expect(body.data.version).toBe(1);
      expect(body.data.dependencies).toEqual([]);
      createdRequirementId = body.data.id;
    });

    it('PM 创建需求成功', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${pmToken}` },
        payload: {
          title: 'PM创建的测试需求',
          description: '<p>PM创建的需求描述</p>',
          systemId,
          priority: 'P2',
          storyPoints: 3,
          baId,
          pmId,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.title).toBe('PM创建的测试需求');
      expect(body.data.pm?.id).toBe(pmId);
    });

    it('未登录用户创建需求应返回401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/requirements',
        payload: {
          title: '测试需求',
          description: '<p>描述</p>',
          systemId,
          priority: 'P2',
          storyPoints: 5,
          baId,
        },
      });

      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /api/requirements/:id', () => {
    it('获取需求详情成功', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/requirements/${createdRequirementId}`,
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(createdRequirementId);
      expect(body.data.title).toBe('测试需求-用户登录优化');
      expect(body.data.status).toBe('DRAFT');
    });

    it('获取不存在的需求应返回404', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/requirements/nonexistent-id',
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('PATCH /api/requirements/:id', () => {
    it('编辑草稿需求成功', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/requirements/${createdRequirementId}`,
        headers: { Authorization: `Bearer ${baToken}` },
        payload: {
          version: 1,
          title: '测试需求-用户登录优化(已编辑)',
          priority: 'P2',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.title).toBe('测试需求-用户登录优化(已编辑)');
      expect(body.data.priority).toBe('P2');
      expect(body.data.version).toBe(2);
    });

    it('乐观锁版本不匹配应返回409', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/requirements/${createdRequirementId}`,
        headers: { Authorization: `Bearer ${baToken}` },
        payload: {
          version: 1,
          title: '旧版本修改',
        },
      });

      expect(res.statusCode).toBe(409);
    });

    it('编辑不存在的需求应返回404', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/requirements/nonexistent-id',
        headers: { Authorization: `Bearer ${baToken}` },
        payload: {
          version: 1,
          title: '测试',
        },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /api/requirements/:id/cancel', () => {
    it('取消草稿需求成功', async () => {
      const newReq = await app.inject({
        method: 'POST',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${baToken}` },
        payload: {
          title: '待取消的测试需求',
          description: '<p>将被取消</p>',
          systemId,
          priority: 'P3',
          storyPoints: 2,
          baId,
        },
      });
      const reqId = newReq.json().data.id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${reqId}/cancel`,
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.success).toBe(true);
    });

    it('取消不存在的需求应返回404', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/requirements/nonexistent-id/cancel',
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
