// ========== 查询版本火车列表路由 ==========
// GET /api/trains - 查询版本火车列表
import { FastifyInstance } from 'fastify';
import { ApiResponse } from '@release-train/shared';
import { listTrains, TrainListResponseData } from '../services/train.service.js';

// 列表查询参数校验 Schema
const listTrainsQuerystringSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
    page: { type: 'integer', minimum: 1, default: 1 },
    pageSize: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
  },
};

/**
 * 注册查询版本火车列表路由
 * @param fastify - Fastify 实例
 */
export async function listTrainsRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get<{ Querystring: { status?: string; page?: number; pageSize?: number }; Reply: ApiResponse<TrainListResponseData> }>(
    '/api/trains',
    {
      onRequest: [fastify.authenticate],
      schema: {
        querystring: listTrainsQuerystringSchema,
      },
    },
    async (request, reply) => {
      const result = await listTrains(request.query);
      return reply.send({ success: true, data: result });
    },
  );
}
