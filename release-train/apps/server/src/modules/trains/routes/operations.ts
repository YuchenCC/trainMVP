// ========== 火车操作路由 (US2.5-2.9) ==========
// Precheck onboard, onboard, remove, release, rollback, complete
import { FastifyInstance } from 'fastify';
import { rbacMiddleware } from '../../../common/middleware/index.js';
import {
  Operation,
  PrecheckOnboardRequest,
  PrecheckOnboardResponse,
  OnboardRequest,
  OnboardResponse,
  ReadyRequirementsResponse,
  RemoveFromTrainRequest,
  BatchRemoveFromTrainRequest,
  BatchReleaseRequest,
  RollbackRequest,
  CompleteCheckResponse,
  ApiResponse,
  JwtPayload,
  BatchOperationResult,
} from '@release-train/shared';
import {
  precheckOnboard,
  getReadyRequirements,
  getOnboardedRequirements,
  onboardRequirements,
  removeFromTrain,
  batchRemoveFromTrain,
  releaseRequirement,
  batchReleaseRequirements,
  rollbackRequirement,
  checkComplete,
  completeTrain,
} from '../services/train.service.js';

// ========== Schema 定义 ==========
const scheduleParamsSchema = {
  type: 'object',
  required: ['scheduleId'],
  properties: { scheduleId: { type: 'string', minLength: 1 } },
};

const trainParamsSchema = {
  type: 'object',
  required: ['trainId'],
  properties: { trainId: { type: 'string', minLength: 1 } },
};

const requirementParamsSchema = {
  type: 'object',
  required: ['scheduleId', 'requirementId'],
  properties: {
    scheduleId: { type: 'string', minLength: 1 },
    requirementId: { type: 'string', minLength: 1 },
  },
};

const precheckBodySchema = {
  type: 'object',
  required: ['requirementIds'],
  properties: { requirementIds: { type: 'array', items: { type: 'string' } } },
};

const onboardBodySchema = {
  type: 'object',
  required: ['requirementIds'],
  properties: {
    requirementIds: { type: 'array', items: { type: 'string' } },
    confirmedRisks: { type: 'array' },
  },
};

const removeBodySchema = {
  type: 'object',
  required: ['reason'],
  properties: { reason: { type: 'string', minLength: 1, maxLength: 500 } },
};

const batchRemoveBodySchema = {
  type: 'object',
  required: ['requirementIds', 'reason'],
  properties: {
    requirementIds: { type: 'array', items: { type: 'string' } },
    reason: { type: 'string', minLength: 1, maxLength: 500 },
  },
};

const batchReleaseBodySchema = {
  type: 'object',
  required: ['requirementIds'],
  properties: { requirementIds: { type: 'array', items: { type: 'string' } } },
};

const rollbackBodySchema = {
  type: 'object',
  required: ['reason'],
  properties: { reason: { type: 'string', minLength: 1, maxLength: 500 } },
};

// ========== 内部辅助函数：获取火车的第一个班次 ==========
async function getFirstScheduleId(trainId: string): Promise<string> {
  const { prisma } = await import('../../../prisma/index.js');
  const schedule = await prisma.trainSchedule.findFirst({
    where: { trainId },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!schedule) {
    throw new Error('该火车还没有创建班次');
  }
  return schedule.id;
}

// ========== 路由注册 ==========
export async function operationsRoutes(fastify: FastifyInstance): Promise<void> {
  // Get ready requirements for schedule (US2.5)
  fastify.get<{
    Params: { scheduleId: string };
    Reply: ApiResponse<ReadyRequirementsResponse>;
  }>(
    '/api/trains/schedules/:scheduleId/ready-requirements',
    {
      onRequest: [fastify.authenticate],
      schema: { params: scheduleParamsSchema },
    },
    async (request, reply) => {
      const result = await getReadyRequirements(request.params.scheduleId);
      return reply.status(200).send({ success: true, data: result });
    },
  );

  // Get onboarded requirements for schedule
  fastify.get<{
    Params: { scheduleId: string };
    Reply: ApiResponse<any>;
  }>(
    '/api/trains/schedules/:scheduleId/onboarded-requirements',
    {
      onRequest: [fastify.authenticate],
      schema: { params: scheduleParamsSchema },
    },
    async (request, reply) => {
      const result = await getOnboardedRequirements(request.params.scheduleId);
      return reply.status(200).send({ success: true, data: result });
    },
  );

  // Get ready requirements for train (US2.5)
  fastify.get<{
    Params: { trainId: string };
    Reply: ApiResponse<ReadyRequirementsResponse>;
  }>(
    '/api/trains/:trainId/ready-requirements',
    {
      onRequest: [fastify.authenticate],
      schema: { params: trainParamsSchema },
    },
    async (request, reply) => {
      const scheduleId = await getFirstScheduleId(request.params.trainId);
      const result = await getReadyRequirements(scheduleId);
      return reply.status(200).send({ success: true, data: result });
    },
  );

  // Get onboarded requirements for train
  fastify.get<{
    Params: { trainId: string };
    Reply: ApiResponse<any>;
  }>(
    '/api/trains/:trainId/onboarded-requirements',
    {
      onRequest: [fastify.authenticate],
      schema: { params: trainParamsSchema },
    },
    async (request, reply) => {
      const scheduleId = await getFirstScheduleId(request.params.trainId);
      const result = await getOnboardedRequirements(scheduleId);
      return reply.status(200).send({ success: true, data: result });
    },
  );

  // Precheck onboard (trainId 版本，自动找第一个班次)
  fastify.post<{
    Params: { trainId: string };
    Body: PrecheckOnboardRequest;
    Reply: ApiResponse<PrecheckOnboardResponse>;
  }>(
    '/api/trains/:trainId/onboard/precheck',
    {
      onRequest: [fastify.authenticate, rbacMiddleware(Operation.MANAGE_TRAIN)],
      schema: { params: trainParamsSchema, body: precheckBodySchema },
    },
    async (request, reply) => {
      const scheduleId = await getFirstScheduleId(request.params.trainId);
      const result = await precheckOnboard(scheduleId, request.body.requirementIds);
      return reply.status(200).send({ success: true, data: result });
    },
  );

  // Precheck onboard (US2.5)
  fastify.post<{
    Params: { scheduleId: string };
    Body: PrecheckOnboardRequest;
    Reply: ApiResponse<PrecheckOnboardResponse>;
  }>(
    '/api/trains/schedules/:scheduleId/onboard/precheck',
    {
      onRequest: [fastify.authenticate, rbacMiddleware(Operation.MANAGE_TRAIN)],
      schema: { params: scheduleParamsSchema, body: precheckBodySchema },
    },
    async (request, reply) => {
      const result = await precheckOnboard(request.params.scheduleId, request.body.requirementIds);
      return reply.status(200).send({ success: true, data: result });
    },
  );

  // Onboard requirements (trainId 版本)
  fastify.post<{
    Params: { trainId: string };
    Body: OnboardRequest;
    Reply: ApiResponse<OnboardResponse>;
  }>(
    '/api/trains/:trainId/onboard',
    {
      onRequest: [fastify.authenticate, rbacMiddleware(Operation.MANAGE_TRAIN)],
      schema: { params: trainParamsSchema, body: onboardBodySchema },
    },
    async (request, reply) => {
      const scheduleId = await getFirstScheduleId(request.params.trainId);
      const userId = (request.user as JwtPayload).sub;
      const result = await onboardRequirements(scheduleId, request.body, userId);
      return reply.status(200).send({ success: true, data: result });
    },
  );

  // Onboard requirements (US2.5)
  fastify.post<{
    Params: { scheduleId: string };
    Body: OnboardRequest;
    Reply: ApiResponse<OnboardResponse>;
  }>(
    '/api/trains/schedules/:scheduleId/onboard',
    {
      onRequest: [fastify.authenticate, rbacMiddleware(Operation.MANAGE_TRAIN)],
      schema: { params: scheduleParamsSchema, body: onboardBodySchema },
    },
    async (request, reply) => {
      const userId = (request.user as JwtPayload).sub;
      const result = await onboardRequirements(request.params.scheduleId, request.body, userId);
      return reply.status(200).send({ success: true, data: result });
    },
  );

  // Remove requirement from train (trainId 版本)
  fastify.post<{
    Params: { trainId: string; requirementId: string };
    Body: RemoveFromTrainRequest;
    Reply: ApiResponse<void>;
  }>(
    '/api/trains/:trainId/requirements/:requirementId/remove',
    {
      onRequest: [fastify.authenticate, rbacMiddleware(Operation.MANAGE_TRAIN)],
      schema: {
        params: {
          type: 'object',
          required: ['trainId', 'requirementId'],
          properties: {
            trainId: { type: 'string' },
            requirementId: { type: 'string' },
          },
        },
        body: removeBodySchema,
      },
    },
    async (request, reply) => {
      const scheduleId = await getFirstScheduleId(request.params.trainId);
      const userId = (request.user as JwtPayload).sub;
      await removeFromTrain(scheduleId, request.params.requirementId, request.body.reason, userId);
      return reply.status(200).send({ success: true });
    },
  );

  // Remove requirement from train (US2.6)
  fastify.post<{
    Params: { scheduleId: string; requirementId: string };
    Body: RemoveFromTrainRequest;
    Reply: ApiResponse<void>;
  }>(
    '/api/trains/schedules/:scheduleId/requirements/:requirementId/remove',
    {
      onRequest: [fastify.authenticate, rbacMiddleware(Operation.MANAGE_TRAIN)],
      schema: { params: requirementParamsSchema, body: removeBodySchema },
    },
    async (request, reply) => {
      const userId = (request.user as JwtPayload).sub;
      await removeFromTrain(request.params.scheduleId, request.params.requirementId, request.body.reason, userId);
      return reply.status(200).send({ success: true });
    },
  );

  // Batch remove requirements (US2.6)
  fastify.post<{
    Params: { scheduleId: string };
    Body: BatchRemoveFromTrainRequest;
    Reply: ApiResponse<BatchOperationResult>;
  }>(
    '/api/trains/schedules/:scheduleId/requirements/remove-batch',
    {
      onRequest: [fastify.authenticate, rbacMiddleware(Operation.MANAGE_TRAIN)],
      schema: { params: scheduleParamsSchema, body: batchRemoveBodySchema },
    },
    async (request, reply) => {
      const userId = (request.user as JwtPayload).sub;
      const result = await batchRemoveFromTrain(request.params.scheduleId, request.body.requirementIds, request.body.reason, userId);
      return reply.status(200).send({ success: true, data: result });
    },
  );

  // Release requirement (trainId 版本)
  fastify.post<{
    Params: { trainId: string; requirementId: string };
    Reply: ApiResponse<void>;
  }>(
    '/api/trains/:trainId/requirements/:requirementId/release',
    {
      onRequest: [fastify.authenticate, rbacMiddleware(Operation.MANAGE_TRAIN)],
      schema: {
        params: {
          type: 'object',
          required: ['trainId', 'requirementId'],
          properties: {
            trainId: { type: 'string' },
            requirementId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const scheduleId = await getFirstScheduleId(request.params.trainId);
      const userId = (request.user as JwtPayload).sub;
      await releaseRequirement(scheduleId, request.params.requirementId, userId);
      return reply.status(200).send({ success: true });
    },
  );

  // Release requirement (US2.7)
  fastify.post<{
    Params: { scheduleId: string; requirementId: string };
    Reply: ApiResponse<void>;
  }>(
    '/api/trains/schedules/:scheduleId/requirements/:requirementId/release',
    {
      onRequest: [fastify.authenticate, rbacMiddleware(Operation.MANAGE_TRAIN)],
      schema: { params: requirementParamsSchema },
    },
    async (request, reply) => {
      const userId = (request.user as JwtPayload).sub;
      await releaseRequirement(request.params.scheduleId, request.params.requirementId, userId);
      return reply.status(200).send({ success: true });
    },
  );

  // Batch release (US2.7)
  fastify.post<{
    Params: { scheduleId: string };
    Body: BatchReleaseRequest;
    Reply: ApiResponse<BatchOperationResult>;
  }>(
    '/api/trains/schedules/:scheduleId/requirements/release-batch',
    {
      onRequest: [fastify.authenticate, rbacMiddleware(Operation.MANAGE_TRAIN)],
      schema: { params: scheduleParamsSchema, body: batchReleaseBodySchema },
    },
    async (request, reply) => {
      const userId = (request.user as JwtPayload).sub;
      const result = await batchReleaseRequirements(request.params.scheduleId, request.body.requirementIds, userId);
      return reply.status(200).send({ success: true, data: result });
    },
  );

  // Rollback requirement (trainId 版本)
  fastify.post<{
    Params: { trainId: string; requirementId: string };
    Body: RollbackRequest;
    Reply: ApiResponse<void>;
  }>(
    '/api/trains/:trainId/requirements/:requirementId/rollback',
    {
      onRequest: [fastify.authenticate, rbacMiddleware(Operation.MANAGE_TRAIN)],
      schema: {
        params: {
          type: 'object',
          required: ['trainId', 'requirementId'],
          properties: {
            trainId: { type: 'string' },
            requirementId: { type: 'string' },
          },
        },
        body: rollbackBodySchema,
      },
    },
    async (request, reply) => {
      const scheduleId = await getFirstScheduleId(request.params.trainId);
      const userId = (request.user as JwtPayload).sub;
      await rollbackRequirement(scheduleId, request.params.requirementId, request.body.reason, userId);
      return reply.status(200).send({ success: true });
    },
  );

  // Rollback requirement (US2.8)
  fastify.post<{
    Params: { scheduleId: string; requirementId: string };
    Body: RollbackRequest;
    Reply: ApiResponse<void>;
  }>(
    '/api/trains/schedules/:scheduleId/requirements/:requirementId/rollback',
    {
      onRequest: [fastify.authenticate, rbacMiddleware(Operation.MANAGE_TRAIN)],
      schema: { params: requirementParamsSchema, body: rollbackBodySchema },
    },
    async (request, reply) => {
      const userId = (request.user as JwtPayload).sub;
      await rollbackRequirement(request.params.scheduleId, request.params.requirementId, request.body.reason, userId);
      return reply.status(200).send({ success: true });
    },
  );

  // Check complete (US2.9)
  fastify.get<{
    Params: { trainId: string };
    Reply: ApiResponse<CompleteCheckResponse>;
  }>(
    '/api/trains/:trainId/complete-check',
    {
      onRequest: [fastify.authenticate],
      schema: { params: trainParamsSchema },
    },
    async (request, reply) => {
      const result = await checkComplete(request.params.trainId);
      return reply.status(200).send({ success: true, data: result });
    },
  );

  // Complete train (US2.9)
  fastify.post<{
    Params: { trainId: string };
    Reply: ApiResponse<void>;
  }>(
    '/api/trains/:trainId/complete',
    {
      onRequest: [fastify.authenticate, rbacMiddleware(Operation.MANAGE_TRAIN)],
      schema: { params: trainParamsSchema },
    },
    async (request, reply) => {
      await completeTrain(request.params.trainId);
      return reply.status(200).send({ success: true });
    },
  );
}
