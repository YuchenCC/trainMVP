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

    it('获取不存在的需求应返回200，错误码 REQUIREMENT_NOT_FOUND', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/requirements/nonexistent-id',
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200); // 业务错误统一返回 200
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe('REQUIREMENT_NOT_FOUND');
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

    it('乐观锁版本不匹配应返回200，错误码 REQUIREMENT_VERSION_CONFLICT', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/requirements/${createdRequirementId}`,
        headers: { Authorization: `Bearer ${baToken}` },
        payload: {
          version: 1,
          title: '旧版本修改',
        },
      });

      expect(res.statusCode).toBe(200); // 业务错误统一返回 200
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe('REQUIREMENT_VERSION_CONFLICT');
    });

    it('编辑不存在的需求应返回200，错误码 REQUIREMENT_NOT_FOUND', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/requirements/nonexistent-id',
        headers: { Authorization: `Bearer ${baToken}` },
        payload: {
          version: 1,
          title: '测试',
        },
      });

      expect(res.statusCode).toBe(200); // 业务错误统一返回 200
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe('REQUIREMENT_NOT_FOUND');
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

    it('取消不存在的需求应返回200，错误码 REQUIREMENT_NOT_FOUND', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/requirements/nonexistent-id/cancel',
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200); // 业务错误统一返回 200
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe('REQUIREMENT_NOT_FOUND');
    });
  });

  // ====================================================================
  // 分页列表测试（TDD）
  // ====================================================================
  describe('GET /api/requirements 分页列表', () => {
    it('默认分页（不传参数）返回第一页，默认 pageSize=20', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('list');
      expect(body.data).toHaveProperty('total');
      expect(body.data).toHaveProperty('page');
      expect(body.data).toHaveProperty('pageSize');
      expect(body.data.page).toBe(1);
      expect(body.data.pageSize).toBe(20);
      expect(Array.isArray(body.data.list)).toBe(true);
      expect(body.data.total).toBeGreaterThanOrEqual(0);
    });

    it('分页响应结构正确：list 元素包含必要字段', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);

      if (body.data.list.length > 0) {
        const item = body.data.list[0];
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('reqCode');
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('status');
        expect(item).toHaveProperty('priority');
        expect(item).toHaveProperty('storyPoints');
        expect(item).toHaveProperty('system');
        expect(item).toHaveProperty('ba');
        expect(item).toHaveProperty('creator');
        expect(item).toHaveProperty('createdAt');
        expect(item).toHaveProperty('updatedAt');
        expect(item.system).toHaveProperty('id');
        expect(item.system).toHaveProperty('name');
        expect(item.ba).toHaveProperty('id');
        expect(item.ba).toHaveProperty('displayName');
        expect(item.creator).toHaveProperty('id');
        expect(item.creator).toHaveProperty('displayName');
      }
    });

    it('自定义 pageSize=5 返回最多5条', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/requirements?pageSize=5',
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.pageSize).toBe(5);
      expect(body.data.list.length).toBeLessThanOrEqual(5);
    });

    it('pageSize 超出上限100应截断为100', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/requirements?pageSize=200',
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.pageSize).toBe(100); // 截断为上限
    });

    it('pageSize=0 应修正为1', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/requirements?pageSize=0',
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.pageSize).toBe(1); // 最小为1
    });

    it('page=0 应修正为第1页', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/requirements?page=0',
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.page).toBe(1); // 最小为1
    });

    it('按关键词搜索（标题匹配）', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/requirements?keyword=用户登录',
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.total).toBeGreaterThanOrEqual(0);
      // 所有结果标题或编号应包含关键词
      for (const item of body.data.list) {
        const matchTitle = item.title.includes('用户登录');
        const matchCode = item.reqCode.includes('用户登录');
        expect(matchTitle || matchCode).toBe(true);
      }
    });

    it('按关键词搜索（编号匹配）', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/requirements?keyword=REQ-2026',
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.total).toBeGreaterThanOrEqual(0);
      for (const item of body.data.list) {
        const matchTitle = item.title.includes('REQ-2026');
        const matchCode = item.reqCode.includes('REQ-2026');
        expect(matchTitle || matchCode).toBe(true);
      }
    });

    it('按状态筛选 DRAFT', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/requirements?status=DRAFT',
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      for (const item of body.data.list) {
        expect(item.status).toBe('DRAFT');
      }
    });

    it('筛选无数据的状态返回空列表', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/requirements?status=RELEASED',
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.list).toEqual([]);
      expect(body.data.total).toBe(0);
    });

    it('未登录应返回401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/requirements',
      });

      expect(res.statusCode).toBe(401);
      const body = res.json();
      expect(body.success).toBe(false);
    });

    it('第二页数据与第一页不重复', async () => {
      // 先查第一页
      const page1 = await app.inject({
        method: 'GET',
        url: '/api/requirements?pageSize=2',
        headers: { Authorization: `Bearer ${baToken}` },
      });
      const page1Ids = page1.json().data.list.map((item: any) => item.id);

      // 再查第二页
      const page2 = await app.inject({
        method: 'GET',
        url: '/api/requirements?page=2&pageSize=2',
        headers: { Authorization: `Bearer ${baToken}` },
      });
      const page2Ids = page2.json().data.list.map((item: any) => item.id);

      // 两页 ID 不应有交集
      if (page2Ids.length > 0) {
        const intersection = page1Ids.filter((id: string) => page2Ids.includes(id));
        expect(intersection).toEqual([]);
      }
    });
  });
});
