// ========== 需求审查模块路由 ==========
// 注册需求审查相关的 HTTP 路由

import { FastifyInstance } from 'fastify';
import { rbacMiddleware } from '../../common/middleware/index.js';
import {
  Operation,
  ApiResponse,
  CreateRequirementRequest,
} from '@release-train/shared';
import {
  reviewRequirement,
  reviewRequirementData,
  RequirementReviewResult,
} from './service.js';

/**
 * 注册需求审查模块所有路由到 Fastify 实例
 * 
 * @param fastify - Fastify 实例
 */
export async function requirementReviewRoutes(fastify: FastifyInstance): Promise<void> {
  // ======================== 执行需求审查（根据需求ID） ========================
  fastify.post<{ 
    Params: { id: string }; 
    Reply: ApiResponse<RequirementReviewResult>; 
  }>(
    '/api/requirements/:id/review',
    {
      onRequest: [
        fastify.authenticate,
        rbacMiddleware(Operation.CREATE_REQ),
      ],
    },
    async (request, reply) => {
      const result = await reviewRequirement(request.params.id);
      return reply.send({ success: true, data: result });
    },
  );

  // ======================== 实时审查需求数据（创建前预览） ========================
  // 允许在创建需求前预览审查结果，帮助用户提前完善需求
  fastify.post<{ 
    Body: CreateRequirementRequest; 
    Reply: ApiResponse<RequirementReviewResult>; 
  }>(
    '/api/requirements/review',
    {
      onRequest: [
        fastify.authenticate,
        rbacMiddleware(Operation.CREATE_REQ),
      ],
    },
    async (request, reply) => {
      const result = await reviewRequirementData(request.body);
      return reply.send({ success: true, data: result });
    },
  );
}