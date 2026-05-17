import { FastifyInstance } from 'fastify';
import { prisma } from '../../prisma/index.js';
import { ApiResponse } from '@release-train/shared';

export async function userRoutes(fastify: FastifyInstance) {
  // 获取当前用户的默认系统
  fastify.get(
    '/api/users/me/default-system',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const user = request.user as any;
      // 只有 BA 角色才需要默认系统
      if (user.role !== 'BA') {
        return reply.send({
          success: true,
          data: { systemId: null, systemName: null, allSystemsAvailable: true },
        });
      }

      // 查询该 BA 在进行中或计划中火车中作为业务归属人的系统
      const trainSystems = await prisma.trainSystem.findMany({
        where: {
          baUserId: user.id,
          train: {
            status: { in: ['PLANNING', 'IN_PROGRESS'] },
          },
        },
        include: {
          system: true,
          train: true,
        },
        take: 1,
      });

      if (trainSystems.length > 0) {
        return reply.send({
          success: true,
          data: {
            systemId: trainSystems[0].systemId,
            systemName: trainSystems[0].system.name,
            allSystemsAvailable: false,
          },
        });
      }

      return reply.send({
        success: true,
        data: { systemId: null, systemName: null, allSystemsAvailable: true },
      });
    },
  );

  // 获取当前用户的归属系统列表
  fastify.get(
    '/api/users/me/systems',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const user = request.user as any;
      // 只有 BA 角色才有归属系统
      if (user.role !== 'BA') {
        return reply.send({
          success: true,
          data: { systems: [], hasSystem: false },
        });
      }

      const trainSystems = await prisma.trainSystem.findMany({
        where: {
          baUserId: user.id,
          train: {
            status: { in: ['PLANNING', 'IN_PROGRESS'] },
          },
        },
        include: { system: true },
      });

      // 去重系统
      const uniqueSystems = new Map();
      trainSystems.forEach((ts) => {
        if (!uniqueSystems.has(ts.systemId)) {
          uniqueSystems.set(ts.systemId, { id: ts.systemId, name: ts.system.name });
        }
      });

      const systems = Array.from(uniqueSystems.values());

      return reply.send({
        success: true,
        data: { systems, hasSystem: systems.length > 0 },
      });
    },
  );
}
