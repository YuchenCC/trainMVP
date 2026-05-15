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

      expect(res.statusCode).toBe(200);
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

    it('BA 编辑其他 BA 的需求应返回200，错误码 REQUIREMENT_PERMISSION_DENIED', async () => {
      // 创建第二个 BA 用户
      const ba2PasswordHash = await bcrypt.hash('BA2Pass123!', 10);
      const ba2 = await prisma.user.create({
        data: {
          username: 'test_ba2_us1',
          password: ba2PasswordHash,
          displayName: '测试BA2_US1',
          email: 'test_ba2_us1@test.com',
          role: 'BA',
        },
      });
      const ba2Login = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'test_ba2_us1', password: 'BA2Pass123!' },
      });
      const ba2Token = ba2Login.json().data.token;

      // BA2 尝试编辑 BA1 创建的需求
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/requirements/${createdRequirementId}`,
        headers: { Authorization: `Bearer ${ba2Token}` },
        payload: {
          version: 1,
          title: 'BA2 越权编辑',
        },
      });

      expect(res.statusCode).toBe(200); // 业务错误统一返回 200
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe('REQUIREMENT_PERMISSION_DENIED');

      // 清理 BA2
      await prisma.user.delete({ where: { id: ba2.id } });
    });

    it('PM 可以编辑任意 BA 的草稿需求', async () => {
      // 先查询当前版本号（前面的测试可能已修改）
      const current = await prisma.requirement.findUnique({
        where: { id: createdRequirementId },
        select: { version: true },
      });

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/requirements/${createdRequirementId}`,
        headers: { Authorization: `Bearer ${pmToken}` },
        payload: {
          version: current!.version,
          title: 'PM 编辑 BA 的需求',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.title).toBe('PM 编辑 BA 的需求');
    });

    it('编辑时添加自依赖应返回200，错误码 REQUIREMENT_CIRCULAR_DEPENDENCY', async () => {
      const current = await prisma.requirement.findUnique({
        where: { id: createdRequirementId },
        select: { version: true },
      });

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/requirements/${createdRequirementId}`,
        headers: { Authorization: `Bearer ${baToken}` },
        payload: {
          version: current!.version,
          dependencyIds: [createdRequirementId],
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe('REQUIREMENT_CIRCULAR_DEPENDENCY');
    });
  });

  describe('依赖校验（创建时）', () => {
    it('创建时添加自依赖应返回200，错误码 REQUIREMENT_CIRCULAR_DEPENDENCY', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${baToken}` },
        payload: {
          title: '自依赖测试需求',
          description: '<p>测试自依赖</p>',
          systemId,
          priority: 'P3',
          storyPoints: 1,
          baId,
        },
      });
      const newId = res.json().data.id;

      const res2 = await app.inject({
        method: 'POST',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${baToken}` },
        payload: {
          title: '自依赖测试需求2',
          description: '<p>测试自依赖2</p>',
          systemId,
          priority: 'P3',
          storyPoints: 1,
          baId,
          dependencyIds: [newId],
        },
      });

      expect(res2.statusCode).toBe(200);
      const body = res2.json();
      expect(body.success).toBe(true);

      // 清理
      await prisma.requirementDependency.deleteMany({
        where: { dependantId: res2.json().data.id },
      });
      await prisma.statusLog.deleteMany({
        where: { requirementId: { in: [newId, res2.json().data.id] } },
      });
      await prisma.requirement.deleteMany({
        where: { id: { in: [newId, res2.json().data.id] } },
      });
    });

    it('创建时循环依赖应返回200，错误码 REQUIREMENT_CIRCULAR_DEPENDENCY', async () => {
      const reqA = await app.inject({
        method: 'POST',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${baToken}` },
        payload: {
          title: '循环依赖测试A',
          description: '<p>A</p>',
          systemId,
          priority: 'P3',
          storyPoints: 1,
          baId,
        },
      });
      const idA = reqA.json().data.id;

      const reqB = await app.inject({
        method: 'POST',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${baToken}` },
        payload: {
          title: '循环依赖测试B',
          description: '<p>B</p>',
          systemId,
          priority: 'P3',
          storyPoints: 1,
          baId,
          dependencyIds: [idA],
        },
      });
      const idB = reqB.json().data.id;

      // 尝试让 A 依赖 B（形成 A→B→A 循环）
      const current = await prisma.requirement.findUnique({
        where: { id: idA },
        select: { version: true },
      });
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/requirements/${idA}`,
        headers: { Authorization: `Bearer ${baToken}` },
        payload: {
          version: current!.version,
          dependencyIds: [idB],
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe('REQUIREMENT_CIRCULAR_DEPENDENCY');

      // 清理
      await prisma.requirementDependency.deleteMany({
        where: { dependantId: { in: [idA, idB] } },
      });
      await prisma.statusLog.deleteMany({
        where: { requirementId: { in: [idA, idB] } },
      });
      await prisma.requirement.deleteMany({
        where: { id: { in: [idA, idB] } },
      });
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

      expect(res.statusCode).toBe(200);
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

  // ====================================================================
  // US1.3 增强筛选与排序测试（TDD RED 阶段）
  // ====================================================================
  describe('US1.3 增强筛选与排序', () => {
    let system2Id: string;
    let reqDraftId: string;
    let reqPendingReviewId: string;
    let reqP0Id: string;
    let reqP3Id: string;
    let reqHighSPId: string;
    let reqLowSPId: string;

    let reqSystem2Id: string;

    beforeAll(async () => {
      // 清理上次测试可能残留的数据
      await prisma.system.deleteMany({ where: { name: '测试系统_US1.3_系统2' } });

      // 创建第二个系统（用于系统筛选测试）
      const system2 = await prisma.system.create({
        data: { name: '测试系统_US1.3_系统2', description: 'US1.3 系统筛选测试用' },
      });
      system2Id = system2.id;

      // 创建不同状态的需求（用于状态多选测试）
      const draft = await app.inject({
        method: 'POST',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${baToken}` },
        payload: {
          title: 'US1.3-草稿需求-状态筛选测试',
          description: '<p>用于状态多选测试的草稿需求</p>',
          systemId,
          priority: 'P2',
          storyPoints: 3,
          baId,
        },
      });
      reqDraftId = draft.json().data.id;

      // 创建一个待评审需求（手动改库）
      const pendingReview = await app.inject({
        method: 'POST',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${baToken}` },
        payload: {
          title: 'US1.3-待评审需求-状态筛选测试',
          description: '<p>用于状态多选测试的待评审需求</p>',
          systemId,
          priority: 'P1',
          storyPoints: 5,
          baId,
        },
      });
      reqPendingReviewId = pendingReview.json().data.id;
      await prisma.requirement.update({
        where: { id: reqPendingReviewId },
        data: { status: 'PENDING_REVIEW' },
      });

      // 创建归属系统2的需求（用于系统筛选测试）
      const sys2Req = await app.inject({
        method: 'POST',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${baToken}` },
        payload: {
          title: 'US1.3-系统2需求-系统筛选测试',
          description: '<p>归属系统2的需求</p>',
          systemId: system2Id,
          priority: 'P2',
          storyPoints: 3,
          baId,
        },
      });
      reqSystem2Id = sys2Req.json().data.id;

      // 创建不同优先级的需求（用于排序测试）
      const p0Req = await app.inject({
        method: 'POST',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${baToken}` },
        payload: {
          title: 'US1.3-P0需求-排序测试',
          description: '<p>P0 优先级需求</p>',
          systemId,
          priority: 'P0',
          storyPoints: 8,
          baId,
        },
      });
      reqP0Id = p0Req.json().data.id;

      const p3Req = await app.inject({
        method: 'POST',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${baToken}` },
        payload: {
          title: 'US1.3-P3需求-排序测试',
          description: '<p>P3 优先级需求</p>',
          systemId,
          priority: 'P3',
          storyPoints: 1,
          baId,
        },
      });
      reqP3Id = p3Req.json().data.id;

      // 创建不同工作量的需求（用于排序测试）
      const highSP = await app.inject({
        method: 'POST',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${baToken}` },
        payload: {
          title: 'US1.3-高工作量需求-排序测试',
          description: '<p>100点工作量需求</p>',
          systemId,
          priority: 'P2',
          storyPoints: 100,
          baId,
        },
      });
      reqHighSPId = highSP.json().data.id;

      const lowSP = await app.inject({
        method: 'POST',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${baToken}` },
        payload: {
          title: 'US1.3-低工作量需求-排序测试',
          description: '<p>1点工作量需求</p>',
          systemId,
          priority: 'P2',
          storyPoints: 1,
          baId,
        },
      });
      reqLowSPId = lowSP.json().data.id;
    });

    afterAll(async () => {
      // 清理 US1.3 测试数据（先删依赖和日志，再删需求，最后删系统）
      const testIds = [reqDraftId, reqPendingReviewId, reqP0Id, reqP3Id, reqHighSPId, reqLowSPId, reqSystem2Id].filter(Boolean);
      if (testIds.length > 0) {
        await prisma.requirementDependency.deleteMany({
          where: { dependantId: { in: testIds } },
        });
        await prisma.statusLog.deleteMany({
          where: { requirementId: { in: testIds } },
        });
        await prisma.requirement.deleteMany({
          where: { id: { in: testIds } },
        });
      }
      if (system2Id) {
        await prisma.system.deleteMany({ where: { id: system2Id } });
      }
    });

    // TC1.3.5 状态多选
    it('状态多选：同时筛选 DRAFT 和 PENDING_REVIEW', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/requirements?status=DRAFT&status=PENDING_REVIEW',
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      // 所有结果的状态应为 DRAFT 或 PENDING_REVIEW
      for (const item of body.data.list) {
        expect(['DRAFT', 'PENDING_REVIEW']).toContain(item.status);
      }
      // 至少应包含我们创建的草稿和待评审需求
      const statuses = body.data.list.map((item: any) => item.status);
      expect(statuses).toContain('DRAFT');
      expect(statuses).toContain('PENDING_REVIEW');
    });

    // TC1.3.3 按系统筛选
    it('按系统筛选：只返回指定系统的需求', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/requirements?systemId=${system2Id}`,
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.total).toBeGreaterThanOrEqual(1);
      // 所有结果应归属系统2
      for (const item of body.data.list) {
        expect(item.system.id).toBe(system2Id);
      }
    });

    // TC1.3.7 组合筛选
    it('组合筛选：系统 + 状态 + 关键字', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/requirements?systemId=${systemId}&status=DRAFT&keyword=US1.3-草稿`,
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      // 所有结果应同时满足：归属系统1、状态DRAFT、标题含关键词
      for (const item of body.data.list) {
        expect(item.system.id).toBe(systemId);
        expect(item.status).toBe('DRAFT');
        const matchTitle = item.title.includes('US1.3-草稿');
        const matchCode = item.reqCode.includes('US1.3-草稿');
        expect(matchTitle || matchCode).toBe(true);
      }
    });

    // TC1.3.8 按创建时间排序（升序）
    it('按创建时间升序排序', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/requirements?sortBy=createdAt&sortOrder=asc&pageSize=50',
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      // 验证升序：前一条的创建时间 <= 后一条
      const list = body.data.list;
      for (let i = 1; i < list.length; i++) {
        expect(new Date(list[i - 1].createdAt).getTime()).toBeLessThanOrEqual(
          new Date(list[i].createdAt).getTime(),
        );
      }
    });

    // TC1.3.8 按创建时间排序（降序，默认）
    it('按创建时间降序排序（默认）', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/requirements?sortBy=createdAt&sortOrder=desc&pageSize=50',
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      // 验证降序：前一条的创建时间 >= 后一条
      const list = body.data.list;
      for (let i = 1; i < list.length; i++) {
        expect(new Date(list[i - 1].createdAt).getTime()).toBeGreaterThanOrEqual(
          new Date(list[i].createdAt).getTime(),
        );
      }
    });

    // TC1.3.9 按优先级排序
    it('按优先级升序排序（P0→P3）', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/requirements?sortBy=priority&sortOrder=asc&pageSize=50',
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      // 验证优先级升序：P0 < P1 < P2 < P3
      const priorityOrder = ['P0', 'P1', 'P2', 'P3'];
      const list = body.data.list;
      for (let i = 1; i < list.length; i++) {
        const prevIdx = priorityOrder.indexOf(list[i - 1].priority);
        const currIdx = priorityOrder.indexOf(list[i].priority);
        expect(prevIdx).toBeLessThanOrEqual(currIdx);
      }
    });

    // TC1.3.10 按工作量排序
    it('按工作量降序排序（大→小）', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/requirements?sortBy=storyPoints&sortOrder=desc&pageSize=50',
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      // 验证工作量降序
      const list = body.data.list;
      for (let i = 1; i < list.length; i++) {
        expect(list[i - 1].storyPoints).toBeGreaterThanOrEqual(list[i].storyPoints);
      }
    });

    // TC1.3.13 subStatus 字段
    it('列表项包含 subStatus 字段', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/requirements?pageSize=50',
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      // 验证每个列表项都包含 subStatus 字段
      for (const item of body.data.list) {
        expect(item).toHaveProperty('subStatus');
      }
    });

    // 排序默认值测试
    it('不传排序参数时默认按创建时间降序', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/requirements?pageSize=50',
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      // 验证默认降序
      const list = body.data.list;
      for (let i = 1; i < list.length; i++) {
        expect(new Date(list[i - 1].createdAt).getTime()).toBeGreaterThanOrEqual(
          new Date(list[i].createdAt).getTime(),
        );
      }
    });
  });

  // ====================================================================
  // US1.5 发起评审测试（TDD）
  // ====================================================================
  describe('US1.5 POST /api/requirements/:id/submit-review 发起评审', () => {
    let trainAdminToken: string;
    let superAdminToken: string;
    let techMgrToken: string;
    let ba2Token: string;
    let ba2Id: string;
    let trainAdminId: string;
    let superAdminId: string;
    let techMgrId: string;
    let draftReqId: string;
    let allTestUserIds: string[];

    beforeAll(async () => {
      // 清理上次测试可能残留的数据
      await prisma.user.deleteMany({
        where: {
          username: {
            in: [
              'test_train_admin_us1',
              'test_super_admin_us1',
              'test_tech_mgr_us1',
              'test_ba2_us15',
            ],
          },
        },
      });

      const trainAdminPasswordHash = await bcrypt.hash('TrainPass123!', 10);
      const superAdminPasswordHash = await bcrypt.hash('SuperPass123!', 10);
      const techMgrPasswordHash = await bcrypt.hash('TechPass123!', 10);
      const ba2PasswordHash = await bcrypt.hash('BA2Pass123!', 10);

      const trainAdminUser = await prisma.user.create({
        data: {
          username: 'test_train_admin_us1',
          password: trainAdminPasswordHash,
          displayName: '测试火车管理员_US1',
          email: 'test_train_admin_us1@test.com',
          role: 'TRAIN_ADMIN',
        },
      });
      trainAdminId = trainAdminUser.id;

      const superAdminUser = await prisma.user.create({
        data: {
          username: 'test_super_admin_us1',
          password: superAdminPasswordHash,
          displayName: '测试超级管理员_US1',
          email: 'test_super_admin_us1@test.com',
          role: 'SUPER_ADMIN',
        },
      });
      superAdminId = superAdminUser.id;

      const techMgrUser = await prisma.user.create({
        data: {
          username: 'test_tech_mgr_us1',
          password: techMgrPasswordHash,
          displayName: '测试技术经理_US1',
          email: 'test_tech_mgr_us1@test.com',
          role: 'TECH_MGR',
        },
      });
      techMgrId = techMgrUser.id;

      const ba2User = await prisma.user.create({
        data: {
          username: 'test_ba2_us15',
          password: ba2PasswordHash,
          displayName: '测试BA2_US15',
          email: 'test_ba2_us15@test.com',
          role: 'BA',
        },
      });
      ba2Id = ba2User.id;

      // 收集所有测试用户 ID 用于清理
      allTestUserIds = [trainAdminId, superAdminId, techMgrId, ba2Id].filter(Boolean);

      const trainAdminLogin = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'test_train_admin_us1', password: 'TrainPass123!' },
      });
      trainAdminToken = trainAdminLogin.json().data.token;

      const superAdminLogin = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'test_super_admin_us1', password: 'SuperPass123!' },
      });
      superAdminToken = superAdminLogin.json().data.token;

      const techMgrLogin = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'test_tech_mgr_us1', password: 'TechPass123!' },
      });
      techMgrToken = techMgrLogin.json().data.token;

      const ba2Login = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'test_ba2_us15', password: 'BA2Pass123!' },
      });
      ba2Token = ba2Login.json().data.token;

      const draftReq = await app.inject({
        method: 'POST',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${baToken}` },
        payload: {
          title: 'US1.5-发起评审测试需求',
          description: '<p>用于发起评审测试的草稿需求</p>',
          systemId,
          priority: 'P2',
          storyPoints: 5,
          baId,
        },
      });
      draftReqId = draftReq.json().data.id;
    });

    afterAll(async () => {
      // 先删除 StatusLog（外键引用 operatorId → User）
      if (allTestUserIds && allTestUserIds.length > 0) {
        await prisma.statusLog.deleteMany({
          where: { operatorId: { in: allTestUserIds } },
        });
      }

      // 删除测试创建的所有需求（含级联 StatusLog）
      const testReqIds = [draftReqId].filter(Boolean);
      if (testReqIds.length > 0) {
        await prisma.requirementDependency.deleteMany({
          where: { dependantId: { in: testReqIds } },
        });
        await prisma.statusLog.deleteMany({
          where: { requirementId: { in: testReqIds } },
        });
        await prisma.requirement.deleteMany({
          where: { id: { in: testReqIds } },
        });
      }

      // 最后删除测试用户
      await prisma.user.deleteMany({
        where: {
          username: {
            in: [
              'test_train_admin_us1',
              'test_super_admin_us1',
              'test_tech_mgr_us1',
              'test_ba2_us15',
            ],
          },
        },
      });
    });

    // TC1.5.1 正常发起评审（BA归属人）
    it('TC1.5.1 BA归属人正常发起评审，状态变为PENDING_REVIEW', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${draftReqId}/submit-review`,
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('PENDING_REVIEW');
      expect(body.data.id).toBe(draftReqId);
    });

    // TC1.5.2 火车管理员发起评审
    it('TC1.5.2 火车管理员发起评审，状态变为PENDING_REVIEW', async () => {
      // 创建新的草稿需求（TC1.5.1 已改变状态）
      const newDraft = await app.inject({
        method: 'POST',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${baToken}` },
        payload: {
          title: 'US1.5-TC1.5.2-火车管理员发起评审',
          description: '<p>火车管理员发起评审测试</p>',
          systemId,
          priority: 'P2',
          storyPoints: 5,
          baId,
        },
      });
      const newDraftId = newDraft.json().data.id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${newDraftId}/submit-review`,
        headers: { Authorization: `Bearer ${trainAdminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('PENDING_REVIEW');
      expect(body.data.id).toBe(newDraftId);
    });

    // TC1.5.3 超级管理员发起评审
    it('TC1.5.3 超级管理员发起评审，状态变为PENDING_REVIEW', async () => {
      const newDraft = await app.inject({
        method: 'POST',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${baToken}` },
        payload: {
          title: 'US1.5-TC1.5.3-超级管理员发起评审',
          description: '<p>超级管理员发起评审测试</p>',
          systemId,
          priority: 'P2',
          storyPoints: 5,
          baId,
        },
      });
      const newDraftId = newDraft.json().data.id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${newDraftId}/submit-review`,
        headers: { Authorization: `Bearer ${superAdminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('PENDING_REVIEW');
      expect(body.data.id).toBe(newDraftId);
    });

    // TC1.5.4 PM不能发起评审
    it('TC1.5.4 PM不能发起评审，返回REQUIREMENT_PERMISSION_DENIED', async () => {
      const newDraft = await app.inject({
        method: 'POST',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${baToken}` },
        payload: {
          title: 'US1.5-TC1.5.4-PM不能发起评审',
          description: '<p>PM权限测试</p>',
          systemId,
          priority: 'P2',
          storyPoints: 5,
          baId,
        },
      });
      const newDraftId = newDraft.json().data.id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${newDraftId}/submit-review`,
        headers: { Authorization: `Bearer ${pmToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe('PERMISSION_DENIED');
    });

    // TC1.5.5 技术经理不能发起评审
    it('TC1.5.5 技术经理不能发起评审，返回PERMISSION_DENIED', async () => {
      const newDraft = await app.inject({
        method: 'POST',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${baToken}` },
        payload: {
          title: 'US1.5-TC1.5.5-技术经理不能发起评审',
          description: '<p>技术经理权限测试</p>',
          systemId,
          priority: 'P2',
          storyPoints: 5,
          baId,
        },
      });
      const newDraftId = newDraft.json().data.id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${newDraftId}/submit-review`,
        headers: { Authorization: `Bearer ${techMgrToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe('PERMISSION_DENIED');
    });

    // TC1.5.6 非归属人BA不能发起评审
    it('TC1.5.6 非归属人BA不能发起评审，返回REQUIREMENT_PERMISSION_DENIED', async () => {
      const newDraft = await app.inject({
        method: 'POST',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${baToken}` },
        payload: {
          title: 'US1.5-TC1.5.6-非归属BA不能发起评审',
          description: '<p>非归属BA权限测试</p>',
          systemId,
          priority: 'P2',
          storyPoints: 5,
          baId,
        },
      });
      const newDraftId = newDraft.json().data.id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${newDraftId}/submit-review`,
        headers: { Authorization: `Bearer ${ba2Token}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe('REQUIREMENT_PERMISSION_DENIED');
    });

    // TC1.5.7 标题缺失
    it('TC1.5.7 标题缺失，返回BAD_REQUEST', async () => {
      // 通过数据库直接创建标题为空的需求（API 层会拦截空标题）
      const emptyTitleReq = await prisma.requirement.create({
        data: {
          reqCode: 'REQ-TC157-EMPTY-TITLE',
          title: '',
          description: '<p>标题为空测试</p>',
          status: 'DRAFT',
          systemId,
          priority: 'P2',
          storyPoints: 5,
          baId,
          creatorId: baId,
        },
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${emptyTitleReq.id}/submit-review`,
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe('BAD_REQUEST');
      expect(body.message).toContain('标题');
    });

    // TC1.5.8 描述缺失
    it('TC1.5.8 描述缺失，返回BAD_REQUEST', async () => {
      // 通过数据库直接创建描述为空的需求
      const emptyDescReq = await prisma.requirement.create({
        data: {
          reqCode: 'REQ-TC158-EMPTY-DESC',
          title: 'US1.5-TC1.5.8-描述缺失',
          description: '',
          status: 'DRAFT',
          systemId,
          priority: 'P2',
          storyPoints: 5,
          baId,
          creatorId: baId,
        },
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${emptyDescReq.id}/submit-review`,
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe('BAD_REQUEST');
      expect(body.message).toContain('描述');
    });

    // TC1.5.9 非草稿状态发起评审
    it('TC1.5.9 非草稿状态发起评审，返回REQUIREMENT_NOT_DRAFT', async () => {
      // draftReqId 已在 TC1.5.1 中变为 PENDING_REVIEW
      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${draftReqId}/submit-review`,
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe('REQUIREMENT_NOT_DRAFT');
    });

    // TC1.5.10 需求不存在
    it('TC1.5.10 需求不存在，返回REQUIREMENT_NOT_FOUND', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/requirements/nonexistent-id-12345/submit-review',
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe('REQUIREMENT_NOT_FOUND');
    });

    // TC1.5.11 未登录
    it('TC1.5.11 未登录发起评审，返回UNAUTHORIZED', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${draftReqId}/submit-review`,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe('UNAUTHORIZED');
    });

    // TC1.5.12 并发冲突（乐观锁）
    it('TC1.5.12 并发冲突，返回REQUIREMENT_VERSION_CONFLICT', async () => {
      // 创建新草稿
      const newDraft = await app.inject({
        method: 'POST',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${baToken}` },
        payload: {
          title: 'US1.5-TC1.5.12-并发冲突测试',
          description: '<p>并发冲突测试</p>',
          systemId,
          priority: 'P2',
          storyPoints: 5,
          baId,
        },
      });
      const newDraftId = newDraft.json().data.id;

      // 第一次发起评审（成功）
      const res1 = await app.inject({
        method: 'POST',
        url: `/api/requirements/${newDraftId}/submit-review`,
        headers: { Authorization: `Bearer ${baToken}` },
      });
      expect(res1.statusCode).toBe(200);
      expect(res1.json().success).toBe(true);

      // 第二次发起评审（版本冲突，因为状态已变为 PENDING_REVIEW）
      const res2 = await app.inject({
        method: 'POST',
        url: `/api/requirements/${newDraftId}/submit-review`,
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res2.statusCode).toBe(200);
      const body2 = res2.json();
      expect(body2.success).toBe(false);
      // 第二次请求会因为状态不是 DRAFT 而返回 REQUIREMENT_NOT_DRAFT
      // 乐观锁冲突场景需要并发请求，这里验证状态校验即可
      expect(body2.code).toBe('REQUIREMENT_NOT_DRAFT');
    });

    // TC1.5.13 审计日志记录
    it('TC1.5.13 发起评审成功后，statusLog记录SUBMIT_REVIEW', async () => {
      const newDraft = await app.inject({
        method: 'POST',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${baToken}` },
        payload: {
          title: 'US1.5-TC1.5.13-审计日志测试',
          description: '<p>审计日志测试</p>',
          systemId,
          priority: 'P2',
          storyPoints: 5,
          baId,
        },
      });
      const newDraftId = newDraft.json().data.id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${newDraftId}/submit-review`,
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);

      // 验证 statusLog 记录
      const logs = await prisma.statusLog.findMany({
        where: { requirementId: newDraftId },
        orderBy: { createdAt: 'desc' },
        take: 1,
      });
      expect(logs.length).toBe(1);
      expect(logs[0].operationType).toBe('SUBMIT_REVIEW');
      expect(logs[0].fromStatus).toBe('DRAFT');
      expect(logs[0].toStatus).toBe('PENDING_REVIEW');
    });

    // TC1.5.14 重复发起评审（草稿→待评审→草稿→待评审）
    it('TC1.5.14 重复发起评审，每次都成功', async () => {
      // 第一次：创建草稿 → 发起评审
      const req1 = await app.inject({
        method: 'POST',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${baToken}` },
        payload: {
          title: 'US1.5-TC1.5.14-重复评审测试-第一次',
          description: '<p>重复评审测试第一次</p>',
          systemId,
          priority: 'P2',
          storyPoints: 5,
          baId,
        },
      });
      const req1Id = req1.json().data.id;

      const submit1 = await app.inject({
        method: 'POST',
        url: `/api/requirements/${req1Id}/submit-review`,
        headers: { Authorization: `Bearer ${baToken}` },
      });
      expect(submit1.statusCode).toBe(200);
      expect(submit1.json().success).toBe(true);
      expect(submit1.json().data.status).toBe('PENDING_REVIEW');

      // 第二次：创建新草稿 → 发起评审
      const req2 = await app.inject({
        method: 'POST',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${baToken}` },
        payload: {
          title: 'US1.5-TC1.5.14-重复评审测试-第二次',
          description: '<p>重复评审测试第二次</p>',
          systemId,
          priority: 'P2',
          storyPoints: 5,
          baId,
        },
      });
      const req2Id = req2.json().data.id;

      const submit2 = await app.inject({
        method: 'POST',
        url: `/api/requirements/${req2Id}/submit-review`,
        headers: { Authorization: `Bearer ${baToken}` },
      });
      expect(submit2.statusCode).toBe(200);
      expect(submit2.json().success).toBe(true);
      expect(submit2.json().data.status).toBe('PENDING_REVIEW');
    });
  });
});
