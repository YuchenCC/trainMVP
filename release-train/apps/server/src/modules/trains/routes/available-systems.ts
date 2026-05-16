// ========== 可选系统列表路由 ==========
// GET /api/systems/available - 获取可选系统列表
import { FastifyInstance } from 'fastify';
import { ApiResponse } from '@release-train/shared';
import { getAvailableSystems, AvailableSystemResponse } from '../services/train.service.js';

// 查询参数校验 Schema
const availableSystemsQuerystringSchema = {
  type: 'object',
  properties: {
    trainId: { type: 'string' },
  },
};

/**
 * 注册可选系统列表路由
 * @param fastify - Fastify 实例
 */
export async function availableSystemsRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: { trainId?: string }; Reply: ApiResponse<AvailableSystemResponse[]> }>(
    '/api/systems/available',
    {
      onRequest: [fastify.authenticate],
      schema: {
        querystring: availableSystemsQuerystringSchema,
      },
    },
    async (request, reply) => {
      const result = await getAvailableSystems(request.query.trainId);
      return reply.send({ success: true, data: result });
    },
  );
}
