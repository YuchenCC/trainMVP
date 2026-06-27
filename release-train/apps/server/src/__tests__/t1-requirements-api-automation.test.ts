// ========== T1 需求池管理 - API 自动化测试 ==========
// 根据 RT-T1-需求池管理-分层测试策略_v1.0_20260626.md 第3.1节 API 接口清单编写
// 覆盖所有 12 个 API 接口的核心测试场景

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createApp } from '../app.js';
import { prisma } from '../prisma/index.js';
import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';

const TEST_SYSTEM_NAME = 'API测试系统';
const TEST_PREFIX = `api_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

describe('T1 需求池管理 API 自动化测试', { sequential: true }, () => {
  let app: FastifyInstance;
  let systemId: string;
  let baToken: string;
  let pmToken: string;
  let projectMgrToken: string;
  let techMgrToken: string;
  let trainAdminToken: string;
  let testMgrToken: string;
  let allTestUserIds: string[] = [];

  beforeAll(async () => {
    app = await createApp();
    await app.ready();
    await cleanupTestData();
    const system = await prisma.system.create({
      data: { name: TEST_SYSTEM_NAME + '_' + TEST_PREFIX, description: 'API自动化测试用系统' },
    });
    systemId = system.id;
    await createTestUsers();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
    await prisma.$disconnect();
  });

  async function cleanupTestData() {
    if (allTestUserIds.length > 0) {
      await prisma.requirementDependency.deleteMany({
        where: { dependant: { creatorId: { in: allTestUserIds } } },
      });
      await prisma.statusLog.deleteMany({ where: { operatorId: { in: allTestUserIds } } });
      await prisma.requirement.deleteMany({ where: { creatorId: { in: allTestUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: allTestUserIds } } });
    }
    await prisma.system.deleteMany({ where: { name: { startsWith: TEST_SYSTEM_NAME } } });
  }

  async function createTestUsers() {
    const users = [
      { username: `${TEST_PREFIX}_ba`, role: 'BA', password: 'BAPass123!' },
      { username: `${TEST_PREFIX}_pm`, role: 'PM', password: 'PMPass123!' },
      { username: `${TEST_PREFIX}_projectmgr`, role: 'PROJECT_MGR', password: 'PMgrPass123!' },
      { username: `${TEST_PREFIX}_techmgr`, role: 'TECH_MGR', password: 'TechPass123!' },
      { username: `${TEST_PREFIX}_trainadmin`, role: 'TRAIN_ADMIN', password: 'TrainPass123!' },
      { username: `${TEST_PREFIX}_testmgr`, role: 'TEST_MGR', password: 'TestPass123!' },
    ];

    for (const { username, role, password } of users) {
      const hash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: { username, password: hash, displayName: `${role}_${TEST_PREFIX}`, email: `${username}@test.com`, role },
      });
      allTestUserIds.push(user.id);

      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username, password },
      });
      const token = loginRes.json().data.token;

      switch (role) {
        case 'BA': baToken = token; break;
        case 'PM': pmToken = token; break;
        case 'PROJECT_MGR': projectMgrToken = token; break;
        case 'TECH_MGR': techMgrToken = token; break;
        case 'TRAIN_ADMIN': trainAdminToken = token; break;
        case 'TEST_MGR': testMgrToken = token; break;
      }
    }
  }

  async function createTestRequirement(title: string, status: string = 'DRAFT'): Promise<string> {
    const res = await app.inject({
      method: 'POST',
      url: '/api/requirements',
      headers: { Authorization: `Bearer ${baToken}` },
      payload: {
        title,
        description: '<p>测试需求</p>',
        systemId,
        priority: 'P2',
        storyPoints: 3,
        baId: allTestUserIds[0],
      },
    });
    const body = res.json();
    if (!body.success) {
      throw new Error(`创建需求失败: ${body.message}`);
    }
    const reqId = body.data.id;
    if (status !== 'DRAFT') {
      await prisma.requirement.update({ where: { id: reqId }, data: { status } });
    }
    return reqId;
  }

  // ====================================================================
  // US1.1 POST /api/requirements
  // ====================================================================
  describe('US1.1 POST /api/requirements', () => {
    it('TC1.1.1 BA正常录入需求', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${baToken}` },
        payload: {
          title: 'API测试-用户登录优化',
          description: '<p>优化用户登录流程</p>',
          systemId,
          priority: 'P1',
          storyPoints: 5,
          baId: allTestUserIds[0],
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      console.log('TC1.1.1 response:', JSON.stringify(body, null, 2));
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('DRAFT');
      expect(body.data.reqCode).toMatch(/^REQ-\d{4}-\d{4}$/);
      expect(body.data.version).toBe(1);
    });

    it('TC1.1.2 标题为空校验', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${baToken}` },
        payload: {
          title: '',
          description: '<p>描述</p>',
          systemId,
          priority: 'P1',
          storyPoints: 5,
          baId: allTestUserIds[0],
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(false);
    });

    it('TC1.1.5 工作量点数过小', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${baToken}` },
        payload: { title: '测试', description: '<p>测试</p>', systemId, priority: 'P1', storyPoints: 0, baId: allTestUserIds[0] },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(false);
    });

    it('TC1.1.6 工作量点数过大', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${baToken}` },
        payload: { title: '测试', description: '<p>测试</p>', systemId, priority: 'P1', storyPoints: 101, baId: allTestUserIds[0] },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(false);
    });

    it('TC1.1.7 XSS攻击防护', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${baToken}` },
        payload: { title: 'XSS测试', description: '<script>alert(1)</script><p>安全内容</p>', systemId, priority: 'P2', storyPoints: 1, baId: allTestUserIds[0] },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.description).not.toContain('<script');
      expect(body.data.description).toContain('<p>安全内容</p>');
    });

    it('TC1.1.11 PM角色录入需求', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${pmToken}` },
        payload: { title: 'PM创建', description: '<p>PM创建</p>', systemId, priority: 'P2', storyPoints: 3, baId: allTestUserIds[0], pmId: allTestUserIds[1] },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      console.log('TC1.1.11 response:', JSON.stringify(body));
      expect(body.success).toBe(true);
    });
  });

  // ====================================================================
  // US1.3 GET /api/requirements
  // ====================================================================
  describe('US1.3 GET /api/requirements', () => {
    it('TC1.3.1 默认显示全部系统需求', async () => {
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
      expect(body.data.page).toBe(1);
      expect(body.data.pageSize).toBe(20);
    });

    it('TC1.3.2 按系统筛选', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/requirements?systemId=${systemId}`,
        headers: { Authorization: `Bearer ${baToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      for (const item of body.data.list) {
        expect(item.system.id).toBe(systemId);
      }
    });

    it('TC1.3.3 按状态筛选', async () => {
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

    it('TC1.3.4 关键字搜索', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${baToken}` },
        payload: { title: '搜索测试关键字ABC', description: '<p>测试</p>', systemId, priority: 'P2', storyPoints: 1, baId: allTestUserIds[0] },
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/requirements?keyword=搜索测试关键字ABC',
        headers: { Authorization: `Bearer ${baToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.total).toBeGreaterThanOrEqual(1);
    });

    it('TC1.3.5 分页功能', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/requirements?page=1&pageSize=5',
        headers: { Authorization: `Bearer ${baToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.pageSize).toBe(5);
    });

    it('TC1.3.6 排序功能', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/requirements?sortBy=priority&sortOrder=asc',
        headers: { Authorization: `Bearer ${baToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
    });
  });

  // ====================================================================
  // US1.4 GET /api/requirements/:id
  // ====================================================================
  describe('US1.4 GET /api/requirements/:id', () => {
    it('TC1.4.1 详情页信息完整展示', async () => {
      const reqId = await createTestRequirement('详情测试需求');
      const res = await app.inject({
        method: 'GET',
        url: `/api/requirements/${reqId}`,
        headers: { Authorization: `Bearer ${baToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(reqId);
      expect(body.data.system.id).toBe(systemId);
    });

    it('TC1.4.4 依赖需求展示', async () => {
      const reqId = await createTestRequirement('依赖展示测试');
      const res = await app.inject({
        method: 'GET',
        url: `/api/requirements/${reqId}`,
        headers: { Authorization: `Bearer ${baToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data.dependencies)).toBe(true);
    });

    it('TC1.4.5 操作历史时间线', async () => {
      const reqId = await createTestRequirement('历史时间线测试');
      const res = await app.inject({
        method: 'GET',
        url: `/api/requirements/${reqId}`,
        headers: { Authorization: `Bearer ${baToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data.statusLogs)).toBe(true);
      expect(body.data.statusLogs.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ====================================================================
  // US1.2 PATCH /api/requirements/:id
  // ====================================================================
  describe('US1.2 PATCH /api/requirements/:id', () => {
    it('TC1.2.1 正常编辑草稿需求', async () => {
      const reqId = await createTestRequirement('编辑测试需求');
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/requirements/${reqId}`,
        headers: { Authorization: `Bearer ${baToken}` },
        payload: { version: 1, title: '编辑后标题', priority: 'P2' },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.version).toBe(2);
    });

    it('TC1.2.2 非草稿状态不可编辑', async () => {
      const reqId = await createTestRequirement('非草稿编辑测试', 'PENDING_REVIEW');
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/requirements/${reqId}`,
        headers: { Authorization: `Bearer ${baToken}` },
        payload: { version: 1, title: '尝试编辑' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(false);
    });

    it('TC1.2.6 乐观锁冲突处理', async () => {
      const reqId = await createTestRequirement('乐观锁测试');
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/requirements/${reqId}`,
        headers: { Authorization: `Bearer ${baToken}` },
        payload: { version: 1, title: '第一次修改' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);

      const res2 = await app.inject({
        method: 'PATCH',
        url: `/api/requirements/${reqId}`,
        headers: { Authorization: `Bearer ${baToken}` },
        payload: { version: 1, title: '旧版本修改' },
      });
      expect(res2.statusCode).toBe(200);
      const body = res2.json();
      expect(body.success).toBe(false);
    });

    it('TC1.2.7 编辑审计日志记录', async () => {
      const reqId = await createTestRequirement('审计日志测试');
      await app.inject({
        method: 'PATCH',
        url: `/api/requirements/${reqId}`,
        headers: { Authorization: `Bearer ${baToken}` },
        payload: { version: 1, title: '修改后' },
      });

      const logs = await prisma.statusLog.findMany({ where: { requirementId: reqId } });
      expect(logs.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ====================================================================
  // US1.9 POST /api/requirements/:id/cancel
  // ====================================================================
  describe('US1.9 POST /api/requirements/:id/cancel', () => {
    it('TC1.9.1 BA取消草稿需求', async () => {
      const reqId = await createTestRequirement('取消测试');
      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${reqId}/cancel`,
        headers: { Authorization: `Bearer ${baToken}` },
        payload: { reason: '测试取消' },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('CANCELLED');
    });

    it('TC1.9.3 已投产需求不可取消', async () => {
      const reqId = await createTestRequirement('已投产取消测试', 'RELEASED');
      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${reqId}/cancel`,
        headers: { Authorization: `Bearer ${baToken}` },
        payload: { reason: '尝试取消已投产' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(false);
    });

    it('TC1.9.4 非BA角色不可取消', async () => {
      const reqId = await createTestRequirement('非BA取消测试');
      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${reqId}/cancel`,
        headers: { Authorization: `Bearer ${techMgrToken}` },
        payload: { reason: '技术经理尝试取消' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(false);
    });
  });

  // ====================================================================
  // US1.5 POST /api/requirements/:id/submit-review
  // ====================================================================
  describe('US1.5 POST /api/requirements/:id/submit-review', () => {
    it('TC1.5.1 正常发起评审', async () => {
      const reqId = await createTestRequirement('发起评审测试');
      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${reqId}/submit-review`,
        headers: { Authorization: `Bearer ${baToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('PENDING_REVIEW');
    });

    it('TC1.5.2 非草稿状态不允许发起评审', async () => {
      const reqId = await createTestRequirement('非草稿评审测试', 'PENDING_REVIEW');
      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${reqId}/submit-review`,
        headers: { Authorization: `Bearer ${baToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(false);
    });

    it('TC1.5.3 非BA角色不允许发起评审', async () => {
      const reqId = await createTestRequirement('非BA评审测试');
      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${reqId}/submit-review`,
        headers: { Authorization: `Bearer ${techMgrToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(false);
    });
  });

  // ====================================================================
  // US1.6 POST /api/requirements/:id/review-pass
  // ====================================================================
  describe('US1.6 POST /api/requirements/:id/review-pass', () => {
    it('TC1.6.1 PM正常评审通过', async () => {
      const reqId = await createTestRequirement('评审通过测试', 'PENDING_REVIEW');
      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${reqId}/review-pass`,
        headers: { Authorization: `Bearer ${projectMgrToken}` },
        payload: { comment: '评审通过' },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('READY');
    });

    it('TC1.6.2 非PM角色不可评审', async () => {
      const reqId = await createTestRequirement('非PM评审测试', 'PENDING_REVIEW');
      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${reqId}/review-pass`,
        headers: { Authorization: `Bearer ${baToken}` },
        payload: { comment: 'BA尝试评审' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(false);
    });

    it('TC1.6.3 非待评审状态不可评审', async () => {
      const reqId = await createTestRequirement('非待评审测试');
      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${reqId}/review-pass`,
        headers: { Authorization: `Bearer ${projectMgrToken}` },
        payload: { comment: '评审' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(false);
    });
  });

  // ====================================================================
  // US1.7 POST /api/requirements/:id/review-reject
  // ====================================================================
  describe('US1.7 POST /api/requirements/:id/review-reject', () => {
    it('TC1.7.1 PM正常评审拒绝', async () => {
      const reqId = await createTestRequirement('评审拒绝测试', 'PENDING_REVIEW');
      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${reqId}/review-reject`,
        headers: { Authorization: `Bearer ${projectMgrToken}` },
        payload: { reason: '需求不完整' },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('REJECTED');
    });

    it('TC1.7.2 拒绝原因必填校验', async () => {
      const reqId = await createTestRequirement('拒绝原因测试', 'PENDING_REVIEW');
      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${reqId}/review-reject`,
        headers: { Authorization: `Bearer ${projectMgrToken}` },
        payload: { reason: '' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(false);
    });

    it('TC1.7.3 非PM角色不可拒绝', async () => {
      const reqId = await createTestRequirement('非PM拒绝测试', 'PENDING_REVIEW');
      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${reqId}/review-reject`,
        headers: { Authorization: `Bearer ${baToken}` },
        payload: { reason: 'BA尝试拒绝' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(false);
    });

    it('TC1.7.6 拒绝后可重新编辑', async () => {
      const reqId = await createTestRequirement('拒绝后编辑测试', 'REJECTED');
      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${reqId}/re-edit`,
        headers: { Authorization: `Bearer ${baToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
    });
  });

  // ====================================================================
  // US1.12 紧急变更
  // ====================================================================
  describe('US1.12 紧急变更', () => {
    it('TC1.12.1 正常创建紧急变更', async () => {
      const reqId = await createTestRequirement('紧急变更测试', 'ONBOARDED');
      await prisma.requirement.update({ where: { id: reqId }, data: { subStatus: 'FROZEN' } });

      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${reqId}/emergency-change`,
        headers: { Authorization: `Bearer ${baToken}` },
        payload: { urgency: 'P0', reason: '线上紧急问题' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
    });

    it('TC1.12.3 非PM不可创建紧急变更', async () => {
      const reqId = await createTestRequirement('非PM紧急变更测试', 'ONBOARDED');
      await prisma.requirement.update({ where: { id: reqId }, data: { subStatus: 'FROZEN' } });

      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${reqId}/emergency-change`,
        headers: { Authorization: `Bearer ${techMgrToken}` },
        payload: { urgency: 'P1', reason: '技术经理尝试' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(false);
    });

    it('TC1.12.5 紧急变更审批通过', async () => {
      const reqId = await createTestRequirement('紧急变更审批测试', 'ONBOARDED');
      await prisma.requirement.update({ where: { id: reqId }, data: { subStatus: 'FROZEN' } });

      await app.inject({
        method: 'POST',
        url: `/api/requirements/${reqId}/emergency-change`,
        headers: { Authorization: `Bearer ${baToken}` },
        payload: { urgency: 'P1', reason: '测试审批' },
      });

      await prisma.emergencyChange.updateMany({
        where: { requirementId: reqId, status: 'PENDING' },
        data: { approverId: allTestUserIds[5] },
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${reqId}/emergency-approve`,
        headers: { Authorization: `Bearer ${testMgrToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
    });

    it('TC1.12.6 紧急变更审批拒绝', async () => {
      const reqId = await createTestRequirement('紧急变更拒绝测试', 'ONBOARDED');
      await prisma.requirement.update({ where: { id: reqId }, data: { subStatus: 'FROZEN' } });

      await app.inject({
        method: 'POST',
        url: `/api/requirements/${reqId}/emergency-change`,
        headers: { Authorization: `Bearer ${baToken}` },
        payload: { urgency: 'P1', reason: '测试拒绝' },
      });

      await prisma.emergencyChange.updateMany({
        where: { requirementId: reqId, status: 'PENDING' },
        data: { approverId: allTestUserIds[5] },
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${reqId}/emergency-reject`,
        headers: { Authorization: `Bearer ${testMgrToken}` },
        payload: { reason: '理由不充分' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(true);
    });
  });

  // ====================================================================
  // US1.13 依赖关系管理
  // ====================================================================
  describe('US1.13 依赖关系管理', () => {
    it('TC1.13.1 添加依赖需求', async () => {
      const reqAId = await createTestRequirement('依赖A');
      const reqBRes = await app.inject({
        method: 'POST',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${baToken}` },
        payload: { title: '依赖B', description: '<p>依赖B</p>', systemId, priority: 'P2', storyPoints: 3, baId: allTestUserIds[0], dependencyIds: [reqAId] },
      });
      const reqBId = reqBRes.json().data.id;

      const res = await app.inject({
        method: 'GET',
        url: `/api/requirements/${reqBId}`,
        headers: { Authorization: `Bearer ${baToken}` },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.dependencies.length).toBe(1);
    });

    it('TC1.13.3 循环依赖校验', async () => {
      const reqAId = await createTestRequirement('循环A');
      const reqBRes = await app.inject({
        method: 'POST',
        url: '/api/requirements',
        headers: { Authorization: `Bearer ${baToken}` },
        payload: { title: '循环B', description: '<p>循环B</p>', systemId, priority: 'P2', storyPoints: 3, baId: allTestUserIds[0], dependencyIds: [reqAId] },
      });
      const reqBId = reqBRes.json().data.id;

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/requirements/${reqAId}`,
        headers: { Authorization: `Bearer ${baToken}` },
        payload: { version: 1, dependencyIds: [reqBId] },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe('REQUIREMENT_CIRCULAR_DEPENDENCY');
    });

    it('TC1.13.5 非BA不可管理依赖', async () => {
      const reqId = await createTestRequirement('非BA依赖测试');
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/requirements/${reqId}`,
        headers: { Authorization: `Bearer ${techMgrToken}` },
        payload: { version: 1, dependencyIds: [] },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().success).toBe(false);
    });
  });
});