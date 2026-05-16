// ========== T1 US1.4 需求详情查看 — riskLevel 测试 ==========
// 测试 buildRequirementDetail 返回的 dependencies 中每条记录的 riskLevel 计算逻辑
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../app.js';
import { prisma } from '../prisma/index.js';
import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';

describe('T1 US1.4 依赖风险等级 (riskLevel)', () => {
  let app: FastifyInstance;
  let baToken: string;
  let systemId: string;

  beforeAll(async () => {
    app = await createApp();
    await app.ready();

    const passwordHash = await bcrypt.hash('TestPass123!', 10);

    const ts = Date.now();

    const system = await prisma.system.create({
      data: { name: 'US14_Risk_Sys_' + ts, description: '测试' },
    });
    systemId = system.id;

    const baUser = await prisma.user.create({
      data: {
        username: 'ba_us14_' + ts,
        password: passwordHash,
        displayName: 'BA',
        email: 'ba_us14_' + ts + '@test.com',
        role: 'BA',
      },
    });

    baToken = (
      await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: baUser.username, password: 'TestPass123!' },
      })
    ).json().data.token;
  });

  afterAll(async () => {
    await app.close();
    await prisma.requirement.deleteMany({ where: { systemId } });
    await prisma.system.deleteMany({ where: { id: systemId } });
    await prisma.$disconnect();
  });

  // 辅助函数：创建处于指定状态的被依赖需求
  const createDependency = async (status: string, baId: string) => {
    const req = await prisma.requirement.create({
      data: {
        title: `Dep_${status}_${Date.now()}`,
        description: '<p>dependency</p>',
        systemId,
        priority: 'P2',
        storyPoints: 3,
        baId,
        creatorId: baId,
        status: status as any,
        reqCode: 'REQ-14-' + Date.now() + '-' + status,
        version: 1,
      },
    });
    return req;
  };

  // 辅助函数：创建依赖方需求，并设置依赖关系
  const createDependantWithDeps = async (baId: string, depIds: string[]) => {
    const dependant = await prisma.requirement.create({
      data: {
        title: 'Dependant_' + Date.now(),
        description: '<p>dependant</p>',
        systemId,
        priority: 'P1',
        storyPoints: 5,
        baId,
        creatorId: baId,
        status: 'DRAFT',
        reqCode: 'REQ-14-D-' + Date.now(),
        version: 1,
      },
    });

    for (const depId of depIds) {
      await prisma.requirementDependency.create({
        data: { dependantId: dependant.id, dependencyId: depId },
      });
    }

    await prisma.statusLog.create({
      data: {
        requirementId: dependant.id,
        operationType: 'CREATE' as any,
        toStatus: 'DRAFT' as any,
        operatorId: baId,
      },
    });

    return dependant;
  };

  // RED 测试：验证 riskLevel 计算逻辑
  describe('riskLevel 计算', () => {
    it('ONBOARDED 状态依赖 → riskLevel = null', async () => {
      const baUser = await prisma.user.findFirst({ where: { role: 'BA' } });
      if (!baUser) throw new Error('No BA user found');

      const dep = await createDependency('ONBOARDED', baUser.id);
      const dependant = await createDependantWithDeps(baUser.id, [dep.id]);

      const res = await app.inject({
        method: 'GET',
        url: `/api/requirements/${dependant.id}`,
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);

      const found = (body.data.dependencies as any[]).find((d: any) => d.id === dep.id);
      expect(found).toBeDefined();
      expect(found.riskLevel).toBeNull();

      await prisma.requirement.delete({ where: { id: dependant.id } });
      await prisma.requirement.delete({ where: { id: dep.id } });
    });

    it('RELEASED 状态依赖 → riskLevel = null', async () => {
      const baUser = await prisma.user.findFirst({ where: { role: 'BA' } });
      if (!baUser) throw new Error('No BA user found');

      const dep = await createDependency('RELEASED', baUser.id);
      const dependant = await createDependantWithDeps(baUser.id, [dep.id]);

      const res = await app.inject({
        method: 'GET',
        url: `/api/requirements/${dependant.id}`,
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      const found = (body.data.dependencies as any[]).find((d: any) => d.id === dep.id);
      expect(found).toBeDefined();
      expect(found.riskLevel).toBeNull();

      await prisma.requirement.delete({ where: { id: dependant.id } });
      await prisma.requirement.delete({ where: { id: dep.id } });
    });

    it('READY 状态依赖 → riskLevel = warning', async () => {
      const baUser = await prisma.user.findFirst({ where: { role: 'BA' } });
      if (!baUser) throw new Error('No BA user found');

      const dep = await createDependency('READY', baUser.id);
      const dependant = await createDependantWithDeps(baUser.id, [dep.id]);

      const res = await app.inject({
        method: 'GET',
        url: `/api/requirements/${dependant.id}`,
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      const found = (body.data.dependencies as any[]).find((d: any) => d.id === dep.id);
      expect(found).toBeDefined();
      expect(found.riskLevel).toBe('warning');

      await prisma.requirement.delete({ where: { id: dependant.id } });
      await prisma.requirement.delete({ where: { id: dep.id } });
    });

    it('CANCELLED 状态依赖 → riskLevel = critical', async () => {
      const baUser = await prisma.user.findFirst({ where: { role: 'BA' } });
      if (!baUser) throw new Error('No BA user found');

      const dep = await createDependency('CANCELLED', baUser.id);
      const dependant = await createDependantWithDeps(baUser.id, [dep.id]);

      const res = await app.inject({
        method: 'GET',
        url: `/api/requirements/${dependant.id}`,
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      const found = (body.data.dependencies as any[]).find((d: any) => d.id === dep.id);
      expect(found).toBeDefined();
      expect(found.riskLevel).toBe('critical');

      await prisma.requirement.delete({ where: { id: dependant.id } });
      await prisma.requirement.delete({ where: { id: dep.id } });
    });

    it('DRAFT 状态依赖 → riskLevel = high', async () => {
      const baUser = await prisma.user.findFirst({ where: { role: 'BA' } });
      if (!baUser) throw new Error('No BA user found');

      const dep = await createDependency('DRAFT', baUser.id);
      const dependant = await createDependantWithDeps(baUser.id, [dep.id]);

      const res = await app.inject({
        method: 'GET',
        url: `/api/requirements/${dependant.id}`,
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      const found = (body.data.dependencies as any[]).find((d: any) => d.id === dep.id);
      expect(found).toBeDefined();
      expect(found.riskLevel).toBe('high');

      await prisma.requirement.delete({ where: { id: dependant.id } });
      await prisma.requirement.delete({ where: { id: dep.id } });
    });

    it('PENDING_REVIEW 状态依赖 → riskLevel = high', async () => {
      const baUser = await prisma.user.findFirst({ where: { role: 'BA' } });
      if (!baUser) throw new Error('No BA user found');

      const dep = await createDependency('PENDING_REVIEW', baUser.id);
      const dependant = await createDependantWithDeps(baUser.id, [dep.id]);

      const res = await app.inject({
        method: 'GET',
        url: `/api/requirements/${dependant.id}`,
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      const found = (body.data.dependencies as any[]).find((d: any) => d.id === dep.id);
      expect(found).toBeDefined();
      expect(found.riskLevel).toBe('high');

      await prisma.requirement.delete({ where: { id: dependant.id } });
      await prisma.requirement.delete({ where: { id: dep.id } });
    });

    it('REJECTED 状态依赖 → riskLevel = high', async () => {
      const baUser = await prisma.user.findFirst({ where: { role: 'BA' } });
      if (!baUser) throw new Error('No BA user found');

      const dep = await createDependency('REJECTED', baUser.id);
      const dependant = await createDependantWithDeps(baUser.id, [dep.id]);

      const res = await app.inject({
        method: 'GET',
        url: `/api/requirements/${dependant.id}`,
        headers: { Authorization: `Bearer ${baToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      const found = (body.data.dependencies as any[]).find((d: any) => d.id === dep.id);
      expect(found).toBeDefined();
      expect(found.riskLevel).toBe('high');

      await prisma.requirement.delete({ where: { id: dependant.id } });
      await prisma.requirement.delete({ where: { id: dep.id } });
    });
  });
});
