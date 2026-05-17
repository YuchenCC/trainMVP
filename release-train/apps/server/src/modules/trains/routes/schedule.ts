// ========== 火车班次管理路由 (v2.0) ==========
// POST /api/trains/:trainId/schedules - 创建班次
// PATCH /api/trains/:trainId/schedules/:scheduleId - 更新班次
// DELETE /api/trains/:trainId/schedules/:scheduleId - 取消班次
// GET /api/trains/:trainId/schedules - 班次列表
// GET /api/trains/:trainId/schedules/:scheduleId - 班次详情
// POST /api/trains/schedules/preview - 预览关键日期
import { FastifyInstance, FastifyRequest } from 'fastify';
import { rbacMiddleware } from '../../../common/middleware/index.js';
import {
  Operation,
  CreateTrainScheduleRequest,
  UpdateTrainScheduleRequest,
  PreviewKeyDatesRequest,
  ApiResponse,
  JwtPayload,
} from '@release-train/shared';
import {
  createTrainSchedule,
  updateTrainSchedule,
  cancelTrainSchedule,
  listTrainSchedules,
  getTrainScheduleById,
  previewKeyDates,
  TrainScheduleDetailResponse,
  TrainScheduleListItemResponse,
} from '../services/train.service.js';

// ========== Schema 定义 ==========

const createScheduleBodySchema = {
  type: 'object',
  required: ['startDate', 'endDate'],
  properties: {
    name: { type: 'string' },
    startDate: { type: 'string', minLength: 1 },
    endDate: { type: 'string', minLength: 1 },
  },
};

const updateScheduleBodySchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    startDate: { type: ['string', 'null'] },
    endDate: { type: ['string', 'null'] },
    boardingDate: { type: ['string', 'null'] },
    lockdownDate: { type: ['string', 'null'] },
    releaseDate: { type: ['string', 'null'] },
    version: { type: 'integer' },
  },
};

const previewKeyDatesBodySchema = {
  type: 'object',
  required: ['startDate', 'endDate'],
  properties: {
    startDate: { type: 'string', minLength: 1 },
    endDate: { type: 'string', minLength: 1 },
  },
};

const scheduleParamsSchema = {
  type: 'object',
  required: ['trainId'],
  properties: {
    trainId: { type: 'string', minLength: 1 },
  },
};

const scheduleIdParamsSchema = {
  type: 'object',
  required: ['trainId', 'scheduleId'],
  properties: {
    trainId: { type: 'string', minLength: 1 },
    scheduleId: { type: 'string', minLength: 1 },
  },
};

// ========== 路由注册 ==========

export async function scheduleRoutes(fastify: FastifyInstance): Promise<void> {
  // 创建班次
  fastify.post<{
    Params: { trainId: string };
    Body: CreateTrainScheduleRequest;
    Reply: ApiResponse<TrainScheduleDetailResponse>;
  }>(
    '/api/trains/:trainId/schedules',
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
      const userId = (request.user as JwtPayload).sub;
      const result = await createTrainSchedule(request.params.trainId, request.body, userId);
      return reply.status(200).send({ success: true, data: result });
    },
  );

  // 更新班次 - PATCH
  fastify.patch<{
    Params: { trainId: string; scheduleId: string };
    Body: UpdateTrainScheduleRequest;
    Reply: ApiResponse<TrainScheduleDetailResponse>;
  }>(
    '/api/trains/:trainId/schedules/:scheduleId',
    {
      onRequest: [
        fastify.authenticate,
        rbacMiddleware(Operation.MANAGE_TRAIN),
      ],
      schema: {
        params: scheduleIdParamsSchema,
        body: updateScheduleBodySchema,
      },
    },
    async (request, reply) => {
      const result = await updateTrainSchedule(request.params.scheduleId, request.body);
      return reply.status(200).send({ success: true, data: result });
    },
  );

  // 更新班次 - PUT
  fastify.put<{
    Params: { trainId: string; scheduleId: string };
    Body: UpdateTrainScheduleRequest;
    Reply: ApiResponse<TrainScheduleDetailResponse>;
  }>(
    '/api/trains/:trainId/schedules/:scheduleId',
    {
      onRequest: [
        fastify.authenticate,
        rbacMiddleware(Operation.MANAGE_TRAIN),
      ],
      schema: {
        params: scheduleIdParamsSchema,
        body: updateScheduleBodySchema,
      },
    },
    async (request, reply) => {
      const result = await updateTrainSchedule(request.params.scheduleId, request.body);
      return reply.status(200).send({ success: true, data: result });
    },
  );

  // 取消班次
  fastify.delete<{
    Params: { trainId: string; scheduleId: string };
    Reply: ApiResponse<void>;
  }>(
    '/api/trains/:trainId/schedules/:scheduleId',
    {
      onRequest: [
        fastify.authenticate,
        rbacMiddleware(Operation.MANAGE_TRAIN),
      ],
      schema: {
        params: scheduleIdParamsSchema,
      },
    },
    async (request, reply) => {
      await cancelTrainSchedule(request.params.scheduleId);
      return reply.status(200).send({ success: true });
    },
  );

  // 班次列表
  fastify.get<{
    Params: { trainId: string };
    Reply: ApiResponse<{ list: TrainScheduleListItemResponse[] }>;
  }>(
    '/api/trains/:trainId/schedules',
    {
      onRequest: [
        fastify.authenticate,
      ],
      schema: {
        params: scheduleParamsSchema,
      },
    },
    async (request, reply) => {
      const result = await listTrainSchedules(request.params.trainId);
      return reply.status(200).send({ success: true, data: result });
    },
  );

  // 班次详情
  fastify.get<{
    Params: { trainId: string; scheduleId: string };
    Reply: ApiResponse<TrainScheduleDetailResponse>;
  }>(
    '/api/trains/:trainId/schedules/:scheduleId',
    {
      onRequest: [
        fastify.authenticate,
      ],
      schema: {
        params: scheduleIdParamsSchema,
      },
    },
    async (request, reply) => {
      const result = await getTrainScheduleById(request.params.scheduleId);
      return reply.status(200).send({ success: true, data: result });
    },
  );

  // 预览关键日期
  fastify.post<{
    Body: PreviewKeyDatesRequest;
    Reply: ApiResponse<{ boardingDate: string; lockdownDate: string; releaseDate: string }>;
  }>(
    '/api/trains/schedules/preview',
    {
      onRequest: [
        fastify.authenticate,
        rbacMiddleware(Operation.MANAGE_TRAIN),
      ],
      schema: {
        body: previewKeyDatesBodySchema,
      },
    },
    async (request, reply) => {
      const result = await previewKeyDates(request.body);
      return reply.status(200).send({ success: true, data: result });
    },
  );
}
