// ========== 取消版本火车路由 ==========
// POST /api/trains/:id/cancel - 取消版本火车
import { FastifyInstance } from 'fastify';
import { ApiResponse } from '@release-train/shared';
import { cancelTrain } from '../services/train.service.js';

// 路径参数校验 Schema
const cancelTrainParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', minLength: 1 },
  },
};

/**
 * 注册取消版本火车路由
 * @param fastify - Fastify 实例
 */
export async function cancelTrainRoute(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Params: { id: string }; Reply: ApiResponse<void> }>(
    '/api/trains/:id/cancel',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: cancelTrainParamsSchema,
      },
    },
    async (request, reply) => {
      await cancelTrain(request.params.id);
      return reply.send({ success: true });
    },
  );
}
