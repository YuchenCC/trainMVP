// ========== 火车班次管理路由 ==========
// POST /api/trains/:id/schedule - 创建班次
// PATCH /api/trains/:id/schedule - 更新班次
// GET /api/trains/:id/key-dates - 获取关键日期
import { FastifyInstance, FastifyRequest } from 'fastify';
import { rbacMiddleware } from '../../../common/middleware/index.js';
import {
  Operation,
  CreateTrainScheduleRequest,
  UpdateTrainScheduleRequest,
  ApiResponse,
  JwtPayload,
  KeyDatesResponse,
} from '@release-train/shared';
import {
  createTrainSchedule,
  updateTrainSchedule,
  getKeyDates,
  TrainDetailResponse,
} from '../services/train.service.js';

// ========== Schema 定义 ==========

const createScheduleBodySchema = {
  type: 'object',
  required: ['startDate', 'endDate'],
  properties: {
    startDate: { type: 'string', minLength: 1 },
    endDate: { type: 'string', minLength: 1 },
  },
};

const updateScheduleBodySchema = {
  type: 'object',
  properties: {
    startDate: { type: 'string', minLength: 1 },
    endDate: { type: 'string', minLength: 1 },
    boardingDate: { type: 'string' },
    lockdownDate: { type: 'string' },
    releaseDate: { type: 'string' },
  },
};

const scheduleParamsSchema = {
  type: 'object',
  required: ['id'],
  properties: {
    id: { type: 'string', minLength: 1 },
  },
};

// ========== 路由注册 ==========

/**
 * 注册火车班次管理路由
 * @param fastify - Fastify 实例
 */
export async function scheduleRoutes(fastify: FastifyInstance): Promise<void> {
  // 创建班次
  fastify.post<{
    Params: { id: string };
    Body: CreateTrainScheduleRequest;
    Reply: ApiResponse<TrainDetailResponse>;
  }>(
    '/api/trains/:id/schedule',
    {
      onRequest: [
        fastify.authenticate,
        rbacMiddleware(Operation.MANAGE_TRAIN),
      ],
      schema: {
        params: scheduleParamsSchema,
        body: createScheduleBodySchema,
      },
    },
    async (request, reply) => {
      const result = await createTrainSchedule(request.params.id, request.body);
      return reply.status(200).send({ success: true, data: result });
    },
  );

  // 更新班次
  fastify.patch<{
    Params: { id: string };
    Body: UpdateTrainScheduleRequest;
    Reply: ApiResponse<TrainDetailResponse>;
  }>(
    '/api/trains/:id/schedule',
    {
      onRequest: [
        fastify.authenticate,
        rbacMiddleware(Operation.MANAGE_TRAIN),
      ],
      schema: {
        params: scheduleParamsSchema,
        body: updateScheduleBodySchema,
      },
    },
    async (request, reply) => {
      const result = await updateTrainSchedule(request.params.id, request.body);
      return reply.status(200).send({ success: true, data: result });
    },
  );

  // 获取关键日期
  fastify.get<{
    Params: { id: string };
    Reply: ApiResponse<KeyDatesResponse>;
  }>(
    '/api/trains/:id/key-dates',
    {
      onRequest: [
        fastify.authenticate,
      ],
      schema: {
        params: scheduleParamsSchema,
      },
    },
    async (request, reply) => {
      const result = await getKeyDates(request.params.id);
      return reply.status(200).send({ success: true, data: result });
    },
  );
}
