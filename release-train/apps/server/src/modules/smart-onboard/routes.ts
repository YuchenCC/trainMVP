
import { FastifyInstance } from 'fastify';
import {
  SmartOnboardSuggestRequest,
  ConfirmOnboardRequest,
} from '@release-train/shared';
import { generateOnboardSuggestions, confirmOnboard } from './service';

/**
 * 智能纳版相关路由
 */
export async function smartOnboardRoutes(fastify: FastifyInstance) {
  // POST /api/smart-onboard/suggest - 生成智能纳版建议
  fastify.post(
    '/api/smart-onboard/suggest',
    {
      onRequest: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['scheduleId', 'requirementIds'],
          properties: {
            scheduleId: { type: 'string' },
            requirementIds: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
    async (request, reply) => {
      const data = request.body as SmartOnboardSuggestRequest;
      const result = await generateOnboardSuggestions(data);
      reply.send({ success: true, data: result });
    },
  );

  // POST /api/smart-onboard/confirm - 确认并执行纳版
  fastify.post(
    '/api/smart-onboard/confirm',
    {
      onRequest: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['scheduleId', 'requirementIds'],
          properties: {
            scheduleId: { type: 'string' },
            requirementIds: { type: 'array', items: { type: 'string' } },
            confirmedRisks: {
              type: 'array',
              items: {
                type: 'object',
                required: ['requirementId', 'riskLevel'],
                properties: {
                  requirementId: { type: 'string' },
                  riskLevel: { type: 'string' },
                  confirmedNote: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const data = request.body as ConfirmOnboardRequest;
      const userId = request.user.id;
      const result = await confirmOnboard(data, userId);
      reply.send({ success: true, data: result });
    },
  );
}

