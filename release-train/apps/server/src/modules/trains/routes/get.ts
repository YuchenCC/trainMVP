// ========== 查询版本火车详情路由 ==========
// GET /api/trains/:id - 查询版本火车详情
import { FastifyInstance } from 'fastify';
import { ApiResponse } from '@release-train/shared';
import { getTrainById, TrainDetailResponse } from '../services/train.service.js';

// 路径参数校验 Schema
const getTrainParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', minLength: 1 },
  },
};

/**
 * 注册查询版本火车详情路由
 * @param fastify - Fastify 实例
 */
export async function getTrainRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Params: { id: string }; Reply: ApiResponse<TrainDetailResponse> }>(
    '/api/trains/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: getTrainParamsSchema,
      },
    },
    async (request, reply) => {
      const result = await getTrainById(request.params.id);
      return reply.send({ success: true, data: result });
    },
  );
}
