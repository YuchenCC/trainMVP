// ========== T1 US1.11 需求变更集成测试 ==========
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../app.js';
import { prisma } from '../prisma/index.js';
import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';

describe('T1 US1.11 需求变更', () => {
  let app: FastifyInstance;
  let baId: string;
  let pmId: string;
  let baToken: string;
  let pmToken: string;
  let systemId: string;

  beforeAll(async () => {
    app = await createApp();
    await app.ready();

    const passwordHash = await bcrypt.hash('TestPass123!', 10);

    // 创建系统
    const system = await prisma.system.create({
      data: { name: 'US111_Sys_' + Date.now(), description: '测试' },
    });
    systemId = system.id;

    // 创建用户
    const ts = Date.now();
    const baUser = await prisma.user.create({
      data: { username: 'ba_us111_' + ts, password: passwordHash, displayName: 'BA', email: 'ba_us111_' + ts + '@test.com', role: 'BA' },
    });
    baId = baUser.id;

    const pm = await prisma.user.create({
      data: { username: 'pm_us111_' + ts, password: passwordHash, displayName: 'PM', email: 'pm_us111_' + ts + '@test.com', role: 'PM' },
    });
    pmId = pm.id;

    // 登录获取 token
    baToken = (await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: baUser.username, password: 'TestPass123!' } })).json().data.token;
    pmToken = (await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username: pm.username, password: 'TestPass123!' } })).json().data.token;
  });

  afterAll(async () => {
    await app.close();
    // 先删需求（依赖用户和系统）
    await prisma.requirement.deleteMany({ where: { baId } });
    await prisma.requirement.deleteMany({ where: { baId: pmId } });
    // 先删火车相关（依赖系统）
    await prisma.trainSystem.deleteMany({ where: { systemId } });
    await prisma.train.deleteMany({ where: { createdById: baId } });
    await prisma.train.deleteMany({ where: { createdById: pmId } });
    // 最后删用户和系统
    await prisma.user.deleteMany({ where: { id: baId } });
    await prisma.user.deleteMany({ where: { id: pmId } });
    await prisma.system.deleteMany({ where: { id: systemId } });
    await prisma.$disconnect();
  });

  // 辅助函数：创建测试需求
  const createReadyRequirement = async () => {
    return prisma.requirement.create({
      data: {
        title: 'Ready Req', description: '<p>test</p>', systemId, priority: 'P1',
        storyPoints: 5, baId, creatorId: baId, status: 'READY',
        reqCode: 'REQ-111-' + Date.now(), version: 1,
      },
    });
  };

  const createOnboardedRequirement = async (trainId: string) => {
    return prisma.requirement.create({
      data: {
        title: 'Onboarded Req', description: '<p>test</p>', systemId, priority: 'P1',
        storyPoints: 8, baId, creatorId: baId, status: 'ONBOARDED',
        subStatus: 'DEV_IN_PROGRESS', trainId,
        reqCode: 'REQ-111-' + Date.now(), version: 1,
      },
    });
  };

  const createFrozenRequirement = async (trainId: string) => {
    return prisma.requirement.create({
      data: {
        title: 'Frozen Req', description: '<p>test</p>', systemId, priority: 'P1',
        storyPoints: 3, baId, creatorId: baId, status: 'ONBOARDED',
        subStatus: 'FROZEN', trainId,
        reqCode: 'REQ-111-' + Date.now(), version: 1,
      },
    });
  };

  describe('已就绪状态需求变更', () => {
    it('BA变更已就绪需求成功，状态变为草稿', async () => {
      const req = await createReadyRequirement();
      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${req.id}/change`,
        headers: { Authorization: `Bearer ${baToken}` },
        payload: { changeReason: '测试变更' },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('DRAFT');
      await prisma.requirement.delete({ where: { id: req.id } });
    });

    it('变更原因为空应返回业务错误', async () => {
      const req = await createReadyRequirement();
      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${req.id}/change`,
        headers: { Authorization: `Bearer ${baToken}` },
        payload: { changeReason: '' },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe('VALIDATION_ERROR');
      await prisma.requirement.delete({ where: { id: req.id } });
    });

    it('变更原因超过500字应返回业务错误', async () => {
      const req = await createReadyRequirement();
      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${req.id}/change`,
        headers: { Authorization: `Bearer ${baToken}` },
        payload: { changeReason: 'A'.repeat(501) },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe('VALIDATION_ERROR');
      await prisma.requirement.delete({ where: { id: req.id } });
    });

    it('PM不能变更需求返回业务错误', async () => {
      const req = await createReadyRequirement();
      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${req.id}/change`,
        headers: { Authorization: `Bearer ${pmToken}` },
        payload: { changeReason: 'test' },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe('PERMISSION_DENIED');
      await prisma.requirement.delete({ where: { id: req.id } });
    });
  });

  describe('已纳版状态需求变更', () => {
    it('BA变更已纳版需求成功，状态变为草稿，train清空', async () => {
      // 创建火车
      const train = await prisma.train.create({
        data: { name: 'US111_Train', startDate: new Date(), endDate: new Date(), createdById: baId },
      });
      await prisma.trainSystem.create({
        data: { trainId: train.id, systemId, capacityPoints: 100, usedPoints: 0 },
      });

      const req = await createOnboardedRequirement(train.id);
      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${req.id}/change`,
        headers: { Authorization: `Bearer ${baToken}` },
        payload: { changeReason: '已纳版变更' },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('DRAFT');
      expect(body.data.train).toBeUndefined();

      // 清理
      await prisma.requirement.delete({ where: { id: req.id } });
      await prisma.trainSystem.deleteMany({ where: { trainId: train.id } });
      await prisma.train.delete({ where: { id: train.id } });
    });

    it('封板状态不能发起变更', async () => {
      const train = await prisma.train.create({
        data: { name: 'US111_Train_Frozen', startDate: new Date(), endDate: new Date(), createdById: baId },
      });
      await prisma.trainSystem.create({
        data: { trainId: train.id, systemId, capacityPoints: 100, usedPoints: 0 },
      });

      const req = await createFrozenRequirement(train.id);
      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${req.id}/change`,
        headers: { Authorization: `Bearer ${baToken}` },
        payload: { changeReason: '封板变更' },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe('REQUIREMENT_SEALED_CANNOT_CHANGE');

      // 清理
      await prisma.requirement.delete({ where: { id: req.id } });
      await prisma.trainSystem.deleteMany({ where: { trainId: train.id } });
      await prisma.train.delete({ where: { id: train.id } });
    });
  });

  describe('状态前置条件校验', () => {
    it('草稿状态需求不能发起变更', async () => {
      const req = await prisma.requirement.create({
        data: {
          title: 'Draft Req', description: '<p>test</p>', systemId, priority: 'P1',
          storyPoints: 3, baId, creatorId: baId, status: 'DRAFT',
          reqCode: 'REQ-111-' + Date.now(), version: 1,
        },
      });
      const res = await app.inject({
        method: 'POST',
        url: `/api/requirements/${req.id}/change`,
        headers: { Authorization: `Bearer ${baToken}` },
        payload: { changeReason: 'test' },
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.code).toBe('REQUIREMENT_NOT_READY_OR_IN_TRAIN');
      await prisma.requirement.delete({ where: { id: req.id } });
    });
  });
});
