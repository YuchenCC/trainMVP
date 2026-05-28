// ========== T5 需求变更智能体 — 插件 API 测试 ==========
// 验证 /api/plugin/* 三个接口：系统搜索、需求详情、变更单 CRUD
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../app.js';
import { prisma } from '../prisma/index.js';
import { FastifyInstance } from 'fastify';

// ========== 测试固定数据 ==========
const TEST_SYSTEM = {
  name: 'T5测试系统_插件API',
  description: 'T5 插件 API 测试用系统',
};

const TEST_BA = {
  username: 'test_ba_t5',
  password: 'T5BAPass123!',
  displayName: '测试BA_T5',
  email: 'test_ba_t5@test.com',
};

// ========== 测试套件 ==========
describe('T5 需求变更智能体 - 插件 API', () => {
  let app: FastifyInstance;
  let systemId: string;
  let baId: string;
  let baToken: string;
  let requirementId: string;
  let pluginKey: string;

  beforeAll(async () => {
    process.env.PLUGIN_API_KEY = 'test-plugin-key-t5';
    pluginKey = 'test-plugin-key-t5';
    app = await createApp();
    await app.ready();

    // 创建测试用户（超管）
    const adminSeed = await app.inject({
      method: 'POST',
      url: '/api/auth/seed',
      payload: {
        username: 'test_admin_t5',
        password: 'T5AdminPass123!',
        displayName: '测试管理员_T5',
        email: 'test_admin_t5@test.com',
      },
    });
    const adminLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: 'test_admin_t5', password: 'T5AdminPass123!' },
    });
    const adminToken = adminLogin.json().data.token;

    const baSeed = await app.inject({
      method: 'POST',
      url: '/api/auth/seed',
      payload: { ...TEST_BA, role: 'BA' },
    });
    baId = baSeed.json().data.id;

    const baLogin = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { username: TEST_BA.username, password: TEST_BA.password },
    });
    baToken = baLogin.json().data.token;

    // 创建测试系统（通过 Prisma，因为没有公开的创建 API）
    const system = await prisma.system.create({
      data: TEST_SYSTEM,
    });
    systemId = system.id;

    // 创建测试需求
    const reqRes = await app.inject({
      method: 'POST',
      url: '/api/requirements',
      headers: { Authorization: `Bearer ${baToken}` },
      payload: {
        title: 'T5-订单导出功能优化',
        description: '<p>支持Excel和CSV导出</p>',
        systemId,
        priority: 'P1',
        storyPoints: 5,
        baId,
      },
    });
    requirementId = reqRes.json().data.id;
  });

  afterAll(async () => {
    await app.close();
    await prisma.changeRequest.deleteMany({ where: { systemId } });
    await prisma.requirementDependency.deleteMany({
      where: { dependant: { systemId } },
    });
    await prisma.requirement.deleteMany({ where: { systemId } });
    await prisma.systemMember.deleteMany({ where: { systemId } });
    await prisma.system.deleteMany({ where: { id: systemId } });
    await prisma.user.deleteMany({ where: { username: { in: [TEST_BA.username, 'test_admin_t5'] } } });
    await prisma.$disconnect();
    delete process.env.PLUGIN_API_KEY;
  });

  // ================================================================
  // 鉴权测试
  // ================================================================
  describe('插件 API Key 鉴权', () => {
    it('缺少 X-Plugin-Key 应返回 UNAUTHORIZED', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/plugin/systems/search?name=测试',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe('UNAUTHORIZED');
    });

    it('错误 X-Plugin-Key 应返回 UNAUTHORIZED', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/plugin/systems/search?name=测试',
        headers: { 'X-Plugin-Key': 'wrong-key' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe('UNAUTHORIZED');
    });

    it('正确 X-Plugin-Key 可正常访问', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/plugin/systems/search?name=${encodeURIComponent(TEST_SYSTEM.name)}`,
        headers: { 'X-Plugin-Key': pluginKey },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
    });
  });

  // ================================================================
  // Step 2: 系统模糊搜索
  // ================================================================
  describe('GET /api/plugin/systems/search 系统模糊搜索', () => {
    it('按系统名模糊匹配（全名）', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/plugin/systems/search?name=${encodeURIComponent(TEST_SYSTEM.name)}`,
        headers: { 'X-Plugin-Key': pluginKey },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.system.name).toBe(TEST_SYSTEM.name);
    });

    it('按系统名模糊匹配（部分名）', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/plugin/systems/search?name=T5测试',
        headers: { 'X-Plugin-Key': pluginKey },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).not.toBeNull();
      expect(body.data.system.name).toContain('T5测试');
    });

    it('系统不存在返回 null', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/plugin/systems/search?name=不存在的系统XYZ',
        headers: { 'X-Plugin-Key': pluginKey },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeNull();
    });

    it('带 keyword 过滤需求列表', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/plugin/systems/search?name=${encodeURIComponent(TEST_SYSTEM.name)}&keyword=导出`,
        headers: { 'X-Plugin-Key': pluginKey },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.requirements.length).toBeGreaterThanOrEqual(1);
      expect(body.data.requirements[0].title).toContain('导出');
    });

    it('keyword 不匹配时返回空需求列表', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/plugin/systems/search?name=${encodeURIComponent(TEST_SYSTEM.name)}&keyword=不存在的关键词XYZ`,
        headers: { 'X-Plugin-Key': pluginKey },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.requirements.length).toBe(0);
    });

    it('缺少 name 参数应返回校验错误', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/plugin/systems/search',
        headers: { 'X-Plugin-Key': pluginKey },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
    });
  });

  // ================================================================
  // Step 3: 需求完整详情
  // ================================================================
  describe('GET /api/plugin/requirements/:id/detail 需求详情', () => {
    it('应返回需求完整详情', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/plugin/requirements/${requirementId}/detail`,
        headers: { 'X-Plugin-Key': pluginKey },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(requirementId);
      expect(body.data.title).toContain('导出');
      expect(body.data.status).toBe('DRAFT');
      expect(body.data.priority).toBe('P1');
      expect(body.data.storyPoints).toBe(5);
      expect(body.data.systemName).toBe(TEST_SYSTEM.name);
      expect(body.data.baName).toBe(TEST_BA.displayName);
    });

    it('包含依赖列表（空数组）', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/plugin/requirements/${requirementId}/detail`,
        headers: { 'X-Plugin-Key': pluginKey },
      });

      const body = res.json();
      expect(Array.isArray(body.data.dependencies)).toBe(true);
    });

    it('包含状态流转历史', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/plugin/requirements/${requirementId}/detail`,
        headers: { 'X-Plugin-Key': pluginKey },
      });

      const body = res.json();
      expect(Array.isArray(body.data.statusHistory)).toBe(true);
      // 创建需求时生成一条 CREATE 日志
      expect(body.data.statusHistory.length).toBeGreaterThanOrEqual(1);
    });

    it('需求不存在返回错误', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/plugin/requirements/nonexistent-id/detail',
        headers: { 'X-Plugin-Key': pluginKey },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
    });
  });

  // ================================================================
  // Step 5: 创建变更单
  // ================================================================
  describe('POST /api/plugin/change-requests 创建变更单', () => {
    it('应成功创建变更单，source 自动标记 coze', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/plugin/change-requests',
        headers: { 'X-Plugin-Key': pluginKey },
        payload: {
          requirementId,
          conversation: '业务方：导出要加Excel格式',
          changeSummary: '## 变更分析\n新增Excel导出',
          workloadImpact: '+2人天',
          scheduleImpact: '延期1天',
          riskLevel: '中',
          riskDescription: '导出性能可能下降',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('PENDING');
      expect(body.data.source).toBe('coze');
      expect(body.data.changeCode).toMatch(/^CR-\d{4}-\d{4}$/);
    });

    it('变更编号格式 CR-2026-XXXX', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/plugin/change-requests',
        headers: { 'X-Plugin-Key': pluginKey },
        payload: { requirementId },
      });

      const body = res.json();
      expect(body.data.changeCode).toMatch(/^CR-2026-\d{4}$/);
    });

    it('需求不存在返回错误', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/plugin/change-requests',
        headers: { 'X-Plugin-Key': pluginKey },
        payload: {
          requirementId: 'nonexistent-id',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
    });

    it('缺少 requirementId 应返回校验错误', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/plugin/change-requests',
        headers: { 'X-Plugin-Key': pluginKey },
        payload: {},
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
    });
  });
});
