// ========== 创建版本火车路由 ==========
// POST /api/trains - 创建版本火车
import { FastifyInstance, FastifyRequest } from 'fastify';
import { rbacMiddleware } from '../../../common/middleware/index.js';
import {
  Operation,
  CreateTrainRequest,
  ApiResponse,
  JwtPayload,
} from '@release-train/shared';
import { createTrain, TrainDetailResponse } from '../services/train.service.js';

// 从 JWT Token 提取当前用户 ID
const getUserId = (request: FastifyRequest): string => {
  const user = request.user as JwtPayload;
  return user.sub;
};

// 创建火车请求参数校验 Schema
const createTrainBodySchema = {
  type: 'object',
  required: ['name'],
  properties: {
    name: { type: 'string', minLength: 2, maxLength: 100 },
    description: { type: 'string', maxLength: 2000 },
    systems: {
      type: 'array',
      items: {
        type: 'object',
        required: ['systemId', 'capacityPoints'],
        properties: {
          systemId: { type: 'string', minLength: 1 },
          capacityPoints: { type: 'integer', minimum: 1, maximum: 500 },
          baUserId: { type: 'string' },
          pmUserId: { type: 'string' },
          techMgrUserId: { type: 'string' },
          testMgrUserId: { type: 'string' },
          devTeamUserIds: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
};

/**
 * 注册创建版本火车路由
 * @param fastify - Fastify 实例
 */
export async function createTrainRoute(fastify: FastifyInstance): Promise<void> {
  fastify.post<{ Body: CreateTrainRequest; Reply: ApiResponse<TrainDetailResponse> }>(
    '/api/trains',
    {
      onRequest: [
        fastify.authenticate,
        rbacMiddleware(Operation.CREATE_TRAIN),
      ],
      schema: {
        body: createTrainBodySchema,
      },
    },
    async (request, reply) => {
      const userId = getUserId(request);
      const result = await createTrain(request.body, userId);
      return reply.status(201).send({ success: true, data: result });
    },
  );
}
