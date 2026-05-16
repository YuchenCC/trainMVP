// ========== 搭载系统路由 ==========
// POST   /api/trains/:id/systems     - 添加搭载系统
// DELETE /api/trains/:id/systems/:systemId - 移除搭载系统
// PATCH  /api/trains/:id/systems/:systemId - 更新搭载系统配置
import { FastifyInstance } from 'fastify';
import { rbacMiddleware } from '../../../common/middleware/index.js';
import {
  Operation,
  AddTrainSystemRequest,
  UpdateTrainSystemRequest,
  ApiResponse,
} from '@release-train/shared';
import {
  addTrainSystem,
  removeTrainSystem,
  updateTrainSystem,
  TrainSystemDetailResponse,
} from '../services/train.service.js';

// 添加搭载系统请求参数校验 Schema
const addTrainSystemBodySchema = {
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
};

// 更新搭载系统请求参数校验 Schema
const updateTrainSystemBodySchema = {
  type: 'object',
  properties: {
    capacityPoints: { type: 'integer', minimum: 1, maximum: 500 },
    baUserId: { type: 'string' },
    pmUserId: { type: 'string' },
    techMgrUserId: { type: 'string' },
    testMgrUserId: { type: 'string' },
    devTeamUserIds: { type: 'array', items: { type: 'string' } },
  },
};

// 路径参数校验 Schema
const trainSystemParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', minLength: 1 },
  },
};

const removeSystemParamsSchema = {
  type: 'object',
  required: ['id', 'systemId'],
  properties: {
    id: { type: 'string', minLength: 1 },
    systemId: { type: 'string', minLength: 1 },
  },
};

/**
 * 注册搭载系统相关路由
 * @param fastify - Fastify 实例
 */
export async function systemsRoutes(fastify: FastifyInstance): Promise<void> {
  // ======================== 添加搭载系统 ========================
  fastify.post<{ Params: { id: string }; Body: AddTrainSystemRequest; Reply: ApiResponse<TrainSystemDetailResponse> }>(
    '/api/trains/:id/systems',
    {
      onRequest: [
        fastify.authenticate,
        rbacMiddleware(Operation.MANAGE_TRAIN),
      ],
      schema: {
        params: trainSystemParamsSchema,
        body: addTrainSystemBodySchema,
      },
    },
    async (request, reply) => {
      const result = await addTrainSystem(request.params.id, request.body);
      return reply.status(201).send({ success: true, data: result });
    },
  );

  // ======================== 更新搭载系统配置 ========================
  fastify.patch<{ Params: { id: string; systemId: string }; Body: UpdateTrainSystemRequest; Reply: ApiResponse<TrainSystemDetailResponse> }>(
    '/api/trains/:id/systems/:systemId',
    {
      onRequest: [
        fastify.authenticate,
        rbacMiddleware(Operation.MANAGE_TRAIN),
      ],
      schema: {
        params: removeSystemParamsSchema,
        body: updateTrainSystemBodySchema,
      },
    },
    async (request, reply) => {
      const result = await updateTrainSystem(request.params.id, request.params.systemId, request.body);
      return reply.send({ success: true, data: result });
    },
  );

  // ======================== 移除搭载系统 ========================
  fastify.delete<{ Params: { id: string; systemId: string }; Reply: ApiResponse<void> }>(
    '/api/trains/:id/systems/:systemId',
    {
      onRequest: [
        fastify.authenticate,
        rbacMiddleware(Operation.MANAGE_TRAIN),
      ],
      schema: {
        params: removeSystemParamsSchema,
      },
    },
    async (request, reply) => {
      await removeTrainSystem(request.params.id, request.params.systemId);
      return reply.send({ success: true, data: undefined });
    },
  );
}
