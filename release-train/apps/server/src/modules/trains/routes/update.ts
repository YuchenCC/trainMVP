// ========== 更新版本火车路由 ==========
// PATCH /api/trains/:id - 更新版本火车基本信息
import { FastifyInstance } from 'fastify';
import { UpdateTrainRequest, ApiResponse } from '@release-train/shared';
import { updateTrain, TrainDetailResponse } from '../services/train.service.js';

// 更新火车请求参数校验 Schema
const updateTrainBodySchema = {
  type: 'object',
  required: ['version'],
  properties: {
    version: { type: 'integer', minimum: 1 },
    name: { type: 'string', minLength: 2, maxLength: 100 },
    description: { type: 'string', maxLength: 2000 },
  },
};

// 路径参数校验 Schema
const updateTrainParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', minLength: 1 },
  },
};

/**
 * 注册更新版本火车路由
 * @param fastify - Fastify 实例
 */
export async function updateTrainRoute(fastify: FastifyInstance): Promise<void> {
  fastify.patch<{ Params: { id: string }; Body: UpdateTrainRequest; Reply: ApiResponse<TrainDetailResponse> }>(
    '/api/trains/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: updateTrainParamsSchema,
        body: updateTrainBodySchema,
      },
    },
    async (request, reply) => {
      const result = await updateTrain(request.params.id, request.body);
      return reply.send({ success: true, data: result });
    },
  );
}
