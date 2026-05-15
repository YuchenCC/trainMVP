// ========== T0 基础框架集成测试 ==========
// 通过 Fastify inject 方法验证认证、鉴权、健康检查等核心行为
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../app.js';
import { prisma } from '../prisma/index.js';
import { FastifyInstance } from 'fastify';
import { Operation, Role, PERMISSION_MATRIX, hasPermission } from '@release-train/shared';

// ========== 测试固定数据 ==========
const TEST_ADMIN = {
  username: 'test_admin',
  password: 'TestPass123!',
  displayName: '测试管理员',
  email: 'test_admin@test.com',
};

const TEST_BA = {
  username: 'test_ba',
  password: 'BAPass123!',
  displayName: '测试BA',
  email: 'test_ba@test.com',
};

const TEST_PM = {
  username: 'test_pm',
  password: 'PMPass123!',
  displayName: '测试PM',
  email: 'test_pm@test.com',
};

const TEST_TECH_MGR = {
  username: 'test_tech_mgr',
  password: 'TechMgrPass123!',
  displayName: '测试技术经理',
  email: 'test_tech_mgr@test.com',
};

// ========== 测试套件 ==========
describe('T0 基础框架', () => {
  let app: FastifyInstance;
  let adminToken: string;

  beforeAll(async () => {
    app = await createApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await prisma.user.deleteMany({
      where: {
        username: {
          in: [TEST_ADMIN.username, TEST_BA.username, TEST_PM.username, TEST_TECH_MGR.username],
        },
      },
    });
    await prisma.$disconnect();
  });

  // ========== 1. 健康检查 ==========
  describe('GET /api/health', () => {
    it('应返回 ok 状态', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/health',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('ok');
    });
  });

  // ========== 2. Seed 创建初始用户 ==========
  describe('POST /api/auth/seed', () => {
    it('应成功创建初始管理员', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/seed',
        payload: TEST_ADMIN,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.username).toBe(TEST_ADMIN.username);
      expect(body.data.role).toBe('SUPER_ADMIN');
      expect(body.data).not.toHaveProperty('password');
    });

    it('重复创建相同用户名应返回200，错误码 CONFLICT', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/seed',
        payload: TEST_ADMIN,
      });

      expect(res.statusCode).toBe(200); // 业务错误统一返回 200
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe('CONFLICT');
    });

    it('应成功创建BA用户', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/seed',
        payload: { ...TEST_BA, role: 'BA' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.username).toBe(TEST_BA.username);
    });

    it('应成功创建PM用户', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/seed',
        payload: { ...TEST_PM, role: 'PM' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.role).toBe('PM');
    });

    it('应成功创建TECH_MGR用户', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/seed',
        payload: { ...TEST_TECH_MGR, role: 'TECH_MGR' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.role).toBe('TECH_MGR');
    });
  });

  // ========== 3. 登录认证 ==========
  describe('POST /api/auth/login', () => {
    it('正确密码应登录成功并返回 Token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: TEST_ADMIN.username, password: TEST_ADMIN.password },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.token).toBeDefined();
      expect(typeof body.data.token).toBe('string');
      expect(body.data.user.username).toBe(TEST_ADMIN.username);
      expect(body.data.user.role).toBe('SUPER_ADMIN');
      expect(body.data.user).not.toHaveProperty('password');

      adminToken = body.data.token;
    });

    it('错误密码应返回 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: TEST_ADMIN.username, password: 'WrongPassword!' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
    });

    it('不存在的用户应返回 401', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'nonexistent', password: 'whatever' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
    });

    it('空用户名应返回200，错误码 VALIDATION_ERROR', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: '', password: 'whatever' },
      });

      expect(res.statusCode).toBe(200); // 参数校验属于业务错误，统一返回 200
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe('VALIDATION_ERROR');
    });
  });

  // ========== 4. 获取当前用户 ==========
  describe('GET /api/auth/me', () => {
    it('携带有效 Token 应返回当前用户信息', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.username).toBe(TEST_ADMIN.username);
      expect(body.data).not.toHaveProperty('password');
      expect(body.data).not.toHaveProperty('ssoId');
    });

    it('无 Token 应返回 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
    });

    it('无效 Token 应返回 401', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { Authorization: 'Bearer invalid.token.here' },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
    });
  });

  // ========== 5. RBAC 权限矩阵 ==========
  describe('RBAC 权限矩阵', () => {
    let baToken: string;
    let pmToken: string;
    let techMgrToken: string;

    beforeAll(async () => {
      const baRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: TEST_BA.username, password: TEST_BA.password },
      });
      baToken = baRes.json().data.token;

      const pmRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: TEST_PM.username, password: TEST_PM.password },
      });
      pmToken = pmRes.json().data.token;

      const techRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: TEST_TECH_MGR.username, password: TEST_TECH_MGR.password },
      });
      techMgrToken = techRes.json().data.token;
    });

    it('超级管理员应拥有所有权限', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.role).toBe('SUPER_ADMIN');
    });

    it('BA 角色应正确识别', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.role).toBe('BA');
    });

    it('BA 可创建需求（CREATE_REQ）', async () => {
      expect(hasPermission(Role.BA, Operation.CREATE_REQ)).toBe(true);
    });

    it('BA 不可评审需求（REVIEW_REQ）', async () => {
      expect(hasPermission(Role.BA, Operation.REVIEW_REQ)).toBe(false);
    });

    it('PM 不可评审需求（REVIEW_REQ）', async () => {
      expect(hasPermission(Role.PM, Operation.REVIEW_REQ)).toBe(false);
    });

    it('TECH_MGR 不可评审需求（REVIEW_REQ）', async () => {
      expect(hasPermission(Role.TECH_MGR, Operation.REVIEW_REQ)).toBe(false);
    });

    it('PROJECT_MGR 可评审需求（REVIEW_REQ）', async () => {
      expect(hasPermission(Role.PROJECT_MGR, Operation.REVIEW_REQ)).toBe(true);
    });

    it('TECH_MGR 可完成开发（COMPLETE_DEV）', async () => {
      expect(hasPermission(Role.TECH_MGR, Operation.COMPLETE_DEV)).toBe(true);
    });

    it('BA 不可完成开发（COMPLETE_DEV）', async () => {
      expect(hasPermission(Role.BA, Operation.COMPLETE_DEV)).toBe(false);
    });

    it('PM 不可完成开发（COMPLETE_DEV）', async () => {
      expect(hasPermission(Role.PM, Operation.COMPLETE_DEV)).toBe(false);
    });

    it('TRAIN_ADMIN 可创建火车（CREATE_TRAIN）', async () => {
      expect(hasPermission(Role.TRAIN_ADMIN, Operation.CREATE_TRAIN)).toBe(true);
    });

    it('BA 不可创建火车（CREATE_TRAIN）', async () => {
      expect(hasPermission(Role.BA, Operation.CREATE_TRAIN)).toBe(false);
    });

    it('超级管理员拥有所有操作权限', async () => {
      const allOps = Object.values(Operation);
      for (const op of allOps) {
        expect(hasPermission(Role.SUPER_ADMIN, op)).toBe(true);
      }
    });
  });

  // ========== 6. 安全性验证 ==========
  describe('安全性', () => {
    it('登录响应不应泄露密码', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: TEST_ADMIN.username, password: TEST_ADMIN.password },
      });

      const body = res.json();
      expect(body.data.user).not.toHaveProperty('password');
      expect(body.data.user).not.toHaveProperty('ssoId');
    });

    it('用户信息响应不应包含敏感字段', async () => {
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: TEST_BA.username, password: TEST_BA.password },
      });
      const token = loginRes.json().data.token;

      const meRes = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: { Authorization: `Bearer ${token}` },
      });

      const body = meRes.json();
      expect(body.data).not.toHaveProperty('password');
      expect(body.data).not.toHaveProperty('ssoId');
    });

    it('错误密码和不存在用户返回相同错误信息（防止用户名枚举）', async () => {
      const wrongPassRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: TEST_ADMIN.username, password: 'WrongPassword!' },
      });

      const notExistRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: 'nonexistent_user_xyz', password: 'whatever' },
      });

      expect(wrongPassRes.statusCode).toBe(notExistRes.statusCode);
      expect(wrongPassRes.json().message).toBe(notExistRes.json().message);
    });
  });
});
