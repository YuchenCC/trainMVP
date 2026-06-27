/**
 * 需求查询接口 API 测试
 * 
 * 覆盖以下接口：
 *   GET  /api/requirements          — 需求列表分页查询
 *   GET  /api/requirements/search   — 需求关键词搜索
 *   GET  /api/requirements/:id      — 需求详情
 *   GET  /api/stats/requirements    — 需求聚合统计
 * 
 * @generated-by automating-api-testing
 * @date 2026-06-09
 */

import { describe, it, expect, beforeAll } from 'vitest';
import Fastify from 'fastify';
import { requirementRoutes } from '../modules/requirements/index.js';

// ========== 辅助函数 ==========

let app: ReturnType<typeof Fastify>;
let authToken: string;

/** 创建测试用 Fastify 实例，注册需求路由 */
async function buildApp() {
  const fastify = Fastify({ logger: false });

  // Mock 认证中间件
  fastify.decorate('authenticate', async (request: any) => {
    request.user = { sub: 'test-user-id', username: 'tester', role: 'BA' };
  });

  await fastify.register(requirementRoutes);
  await fastify.ready();
  return fastify;
}

/** 发送 GET 请求的辅助函数 */
async function get(path: string, query?: Record<string, any>) {
  const url = query ? `${path}?${new URLSearchParams(query).toString()}` : path;
  return app.inject({
    method: 'GET',
    url,
    headers: { Authorization: `Bearer ${authToken}` },
  });
}

// ========== 测试套件 ==========

describe('需求查询接口 API', () => {

  beforeAll(async () => {
    app = await buildApp();
    authToken = 'mock-token';
  });

  // ================================================================
  // US1: 需求列表分页查询 — GET /api/requirements
  // ================================================================
  describe('GET /api/requirements — 需求列表分页查询', () => {

    // 成功场景：默认分页查询
    it('应返回分页数据（默认 page=1, pageSize=20）', async () => {
      const res = await get('/api/requirements');
      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('list');
      expect(body.data).toHaveProperty('total');
      expect(body.data).toHaveProperty('page', 1);
      expect(body.data).toHaveProperty('pageSize', 20);
      expect(Array.isArray(body.data.list)).toBe(true);
    });

    // 成功场景：指定分页参数
    it('应支持 page 和 pageSize 参数', async () => {
      const res = await get('/api/requirements', { page: 2, pageSize: 10 });
      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.data.page).toBe(2);
      expect(body.data.pageSize).toBe(10);
    });

    // 成功场景：按状态筛选
    it('应支持 status 单值筛选', async () => {
      const res = await get('/api/requirements', { status: 'DRAFT' });
      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      body.data.list.forEach((item: any) => {
        expect(item.status).toBe('DRAFT');
      });
    });

    // 成功场景：按状态多选筛选
    it('应支持 status 多值筛选（逗号分隔）', async () => {
      const res = await get('/api/requirements', { status: 'DRAFT,PENDING_REVIEW' });
      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      body.data.list.forEach((item: any) => {
        expect(['DRAFT', 'PENDING_REVIEW']).toContain(item.status);
      });
    });

    // 成功场景：按系统筛选
    it('应支持 systemId 筛选', async () => {
      const res = await get('/api/requirements', { systemId: 'test-system-id' });
      expect(res.statusCode).toBe(200);
    });

    // 成功场景：关键词搜索 + 分页
    it('应支持 keyword 模糊匹配（匹配编号或标题）', async () => {
      const res = await get('/api/requirements', { keyword: '登录' });
      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      body.data.list.forEach((item: any) => {
        const matchesTitle = item.title.includes('登录');
        const matchesCode = item.reqCode.includes('登录');
        expect(matchesTitle || matchesCode).toBe(true);
      });
    });

    // 成功场景：排序
    it('应支持 sortBy 和 sortOrder 排序', async () => {
      const res = await get('/api/requirements', {
        sortBy: 'priority',
        sortOrder: 'desc',
      });
      expect(res.statusCode).toBe(200);
    });

    // 成功场景：空结果
    it('关键词无匹配时应返回空列表', async () => {
      const res = await get('/api/requirements', { keyword: '___NONEXISTENT___' });
      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.data.list).toHaveLength(0);
      expect(body.data.total).toBe(0);
    });

    // 边界值：pageSize 超上限
    it('pageSize 超过 100 应限制为 100', async () => {
      const res = await get('/api/requirements', { pageSize: 999 });
      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.data.pageSize).toBeLessThanOrEqual(100);
    });

    // 边界值：page 小于 1
    it('page 小于 1 应返回第 1 页', async () => {
      const res = await get('/api/requirements', { page: 0 });
      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.data.page).toBeGreaterThanOrEqual(1);
    });

    // 认证：未登录应返回 401
    it('未登录应返回 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/requirements',
      });
      expect(res.statusCode).toBe(401);
    });
  });

  // ================================================================
  // US2: 需求搜索 — GET /api/requirements/search
  // ================================================================
  describe('GET /api/requirements/search — 需求搜索', () => {

    // 成功场景：按关键词搜索
    it('应返回匹配的需求列表（最多 20 条）', async () => {
      const res = await get('/api/requirements/search', { q: '登录' });
      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeLessThanOrEqual(20);

      // 每个搜索结果包含 id, reqCode, title, status
      body.data.forEach((item: any) => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('reqCode');
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('status');
      });
    });

    // 成功场景：空关键词返回空数组
    it('空关键词应返回空数组', async () => {
      const res = await get('/api/requirements/search', { q: '' });
      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(0);
    });

    // 成功场景：无匹配返回空数组
    it('无匹配关键词应返回空数组', async () => {
      const res = await get('/api/requirements/search', { q: '___NONEXISTENT___' });
      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(0);
    });

    // 认证：未登录应返回 401
    it('未登录应返回 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/requirements/search?q=test',
      });
      expect(res.statusCode).toBe(401);
    });
  });

  // ================================================================
  // US3: 需求详情 — GET /api/requirements/:id
  // ================================================================
  describe('GET /api/requirements/:id — 需求详情', () => {

    // 成功场景：获取已有需求详情
    it('应返回完整的需求详情', async () => {
      const res = await get('/api/requirements/test-id');
      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      if (body.success) {
        expect(body.data).toHaveProperty('id');
        expect(body.data).toHaveProperty('reqCode');
        expect(body.data).toHaveProperty('title');
        expect(body.data).toHaveProperty('description');
        expect(body.data).toHaveProperty('system');
        expect(body.data).toHaveProperty('priority');
        expect(body.data).toHaveProperty('status');
        expect(body.data).toHaveProperty('storyPoints');
        expect(body.data).toHaveProperty('ba');
      }
    });

    // 错误场景：不存在的需求 ID
    it('不存在的 ID 应返回 404', async () => {
      const res = await get('/api/requirements/nonexistent-id');
      expect(res.statusCode).toBe(404);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
    });

    // 认证：未登录应返回 401
    it('未登录应返回 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/requirements/test-id',
      });
      expect(res.statusCode).toBe(401);
    });
  });

  // ================================================================
  // US4: 需求聚合统计 — GET /api/stats/requirements
  // ================================================================
  describe('GET /api/stats/requirements — 需求聚合统计', () => {

    // 成功场景：获取统计
    it('应返回需求统计数据', async () => {
      const res = await get('/api/stats/requirements');
      expect(res.statusCode).toBe(200);

      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
    });

    // 成功场景：按系统筛选统计
    it('应支持 systemIds 筛选', async () => {
      const res = await get('/api/stats/requirements', {
        systemIds: 'sys-1,sys-2',
      });
      expect(res.statusCode).toBe(200);
    });

    // 成功场景：按班次筛选统计
    it('应支持 scheduleId 筛选', async () => {
      const res = await get('/api/stats/requirements', {
        scheduleId: 'test-schedule-id',
      });
      expect(res.statusCode).toBe(200);
    });

    // 认证：未登录应返回 401
    it('未登录应返回 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/stats/requirements',
      });
      expect(res.statusCode).toBe(401);
    });
  });
});