// ========== 需求模块路由 ==========
// 注册需求相关的 HTTP 路由：创建、查询、编辑、取消、搜索
// 路由文件（index.ts）负责接收请求参数、调用 service 层逻辑、返回响应
import { FastifyInstance, FastifyRequest } from 'fastify'; // Fastify 类型
import { rbacMiddleware } from '../../common/middleware/index.js'; // RBAC 权限中间件工厂
import {
  Operation,                         // 操作权限枚举（CREATE_REQ/EDIT_REQ 等）
  CreateRequirementRequest,          // 创建需求请求体类型
  UpdateRequirementRequest,          // 编辑需求请求体类型
  ApiResponse,                       // 通用 API 响应包装类型
  PaginatedResponse,                 // 分页响应包装类型
  RequirementDetail,                 // 需求详情响应类型
  RequirementListItem,               // 需求列表项类型
  RequirementListQuery,              // 需求列表查询参数类型
  JwtPayload,                        // JWT Token 载荷类型（sub/username/role）
  ReqSubStatus,                      // 需求子状态枚举（用于子状态变更）
} from '@release-train/shared';
import {
  createRequirement,                // 创建需求 service
  getRequirementById,               // 获取需求详情 service
  updateRequirement,                // 编辑需求 service
  cancelRequirement,                // 取消需求 service
  submitReview,                     // 发起评审 service
  reviewPass,                       // 评审通过 service
  reviewReject,                     // 评审拒绝 service
  reEdit,                          // 重新编辑 service
  searchRequirements,               // 搜索需求 service
  listRequirements,                 // 需求列表 service（分页）
  changeRequirement,                // 需求变更 service
  changeSubStatus,                  // 子状态变更 service
  emergencyChange,                  // 紧急变更 service
  RequirementSearchItem,            // 搜索单项类型
} from './service.js';

// ========== 从 JWT Token 提取当前用户 ID ==========
/**
 * 从 Fastify 请求对象中提取当前登录用户的 ID
 * 
 * request.user 由 authMiddleware 在 onRequest 阶段注入（JWT 解码后的 payload）
 * 本函数在所有需要知道"谁在操作"的路由中使用
 * 
 * @param request - Fastify 请求对象（request.user 已被中间件注入）
 * @returns 当前用户的 ID（JWT sub 字段）
 */
const getUserId = (request: FastifyRequest): string => {
  const user = request.user as JwtPayload; // JWT payload = { sub, username, role, ... }
  return user.sub;                         // sub = 用户 ID（来自 JWT 签发时的 sub 字段）
};

/**
 * 注册需求模块所有路由到 Fastify 实例
 * 
 * 注意：/api/requirements/search 必须在 /api/requirements/:id 之前注册
 * 否则 Fastify 会将 "search" 匹配为 :id 参数 → 导致路由错误
 * 
 * @param fastify - Fastify 实例（由 app.ts 传入）
 */
export async function requirementRoutes(fastify: FastifyInstance): Promise<void> {
  // ======================== 需求列表（分页） ========================
  // 注意：此路由必须放在 :id 路由之前，避免 Fastify 路由匹配冲突
  fastify.get<{ Querystring: RequirementListQuery; Reply: ApiResponse<PaginatedResponse<RequirementListItem>> }>(
    '/api/requirements',                                 // GET /api/requirements?page=1&pageSize=20&status=DRAFT&keyword=
    {
      onRequest: [fastify.authenticate],                  // 需要登录
    },
    async (request, reply) => {
      const result = await listRequirements(request.query); // 调用 service 分页查询
      return reply.send({ success: true, data: result });   // 返回分页数据
    },
  );

  // ======================== 需求搜索 ========================
  // 注意：此路由必须放在 :id 路由之前，避免 "search" 被 :id 捕获
  fastify.get<{ Querystring: { q: string }; Reply: ApiResponse<RequirementSearchItem[]> }>(
    '/api/requirements/search',                          // GET /api/requirements/search?q=关键词
    {
      onRequest: [fastify.authenticate],                  // 需要登录
    },
    async (request, reply) => {
      const results = await searchRequirements(request.query.q || ''); // 调用 service 搜索
      return reply.send({ success: true, data: results });            // 返回搜索结果
    },
  );

  // ======================== 创建需求 ========================
  fastify.post<{ Body: CreateRequirementRequest; Reply: ApiResponse<RequirementDetail> }>(
    '/api/requirements',                                 // POST /api/requirements
    {
      onRequest: [
        fastify.authenticate,                            // 需要登录
        rbacMiddleware(Operation.CREATE_REQ),             // 需要 CREATE_REQ 权限（BA/PM/PROJECT_MGR/TRAIN_ADMIN）
      ],
      schema: {
        body: {                                          // Fastify 内置 JSON Schema 校验
          type: 'object',
          required: ['title', 'description', 'systemId', 'priority', 'storyPoints', 'baId'], // 必填字段
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 200 },    // 标题 1-200 字
            description: { type: 'string', minLength: 1 },               // 描述非空
            systemId: { type: 'string', minLength: 1 },                  // 系统 ID 非空
            priority: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] }, // 优先级枚举
            storyPoints: { type: 'integer', minimum: 1, maximum: 100 },  // 点数 1-100
            baId: { type: 'string', minLength: 1 },                      // BA ID 非空
            pmId: { type: 'string' },                                     // PM ID 可选
            reqType: { type: 'string', enum: ['NEW_FEATURE', 'OPTIMIZATION', 'BUG'] },    // 类型枚举
            sourceChannel: { type: 'string', enum: ['BUSINESS', 'USER_FEEDBACK', 'DATA_ANALYSIS', 'COMPETITOR'] }, // 渠道枚举
            dependencyIds: {
              type: 'array',                             // 依赖 ID 数组
              items: { type: 'string' },                 // 每项是字符串
              maxItems: 20,                              // 最多 20 个依赖
            },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = getUserId(request);                 // 从 JWT 提取当前用户 ID
      const result = await createRequirement(request.body, userId); // 调用 service 创建
      return reply.send({ success: true, data: result });           // 返回完整需求详情
    },
  );

  // ======================== 获取需求详情 ========================
  fastify.get<{ Params: { id: string }; Reply: ApiResponse<RequirementDetail> }>(
    '/api/requirements/:id',                             // GET /api/requirements/:id
    {
      onRequest: [fastify.authenticate],                  // 需要登录（所有角色可查看）
    },
    async (request, reply) => {
      const result = await getRequirementById(request.params.id); // 调用 service 查询
      return reply.send({ success: true, data: result });
    },
  );

  // ======================== 编辑需求 ========================
  fastify.patch<{ Params: { id: string }; Body: UpdateRequirementRequest; Reply: ApiResponse<RequirementDetail> }>(
    '/api/requirements/:id',                             // PATCH /api/requirements/:id
    {
      onRequest: [
        fastify.authenticate,                            // 需要登录
        rbacMiddleware(Operation.EDIT_REQ),               // 需要 EDIT_REQ 权限（BA/PM/PROJECT_MGR）
      ],
      schema: {
        body: {                                          // 请求体校验（与创建类似，但 version 必填，其他全可选）
          type: 'object',
          required: ['version'],                         // version 必填（乐观锁）
          properties: {
            version: { type: 'integer', minimum: 1 },    // 乐观锁版本号 ≥1
            title: { type: 'string', minLength: 1, maxLength: 200 },
            description: { type: 'string', minLength: 1 },
            systemId: { type: 'string', minLength: 1 },
            priority: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
            storyPoints: { type: 'integer', minimum: 1, maximum: 100 },
            baId: { type: 'string', minLength: 1 },
            pmId: { type: 'string' },
            reqType: { type: 'string', enum: ['NEW_FEATURE', 'OPTIMIZATION', 'BUG'] },
            sourceChannel: { type: 'string', enum: ['BUSINESS', 'USER_FEEDBACK', 'DATA_ANALYSIS', 'COMPETITOR'] },
            dependencyIds: {
              type: 'array',
              items: { type: 'string' },
              maxItems: 20,
            },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = getUserId(request);                            // 从 JWT 提取操作人
      const result = await updateRequirement(request.params.id, request.body, userId); // 调用 service 编辑
      return reply.send({ success: true, data: result });
    },
  );

  // ======================== 取消需求 ========================
  fastify.post<{ Params: { id: string }; Body: { reason: string }; Reply: ApiResponse<RequirementDetail> }>(
    '/api/requirements/:id/cancel',                      // POST /api/requirements/:id/cancel
    {
      onRequest: [
        fastify.authenticate,                            // 需要登录
        rbacMiddleware(Operation.CANCEL_REQ),             // 需要 CANCEL_REQ 权限（BA/TRAIN_ADMIN/SUPER_ADMIN）
      ],
    },
    async (request, reply) => {
      const user = request.user as JwtPayload;                       // 从 JWT 提取用户信息
      const userId = user.sub;                                       // 操作人 ID
      const operatorRole = user.role;                                // 操作人角色
      const reason = request.body?.reason || '';                     // 取消原因（必填）
      const result = await cancelRequirement(request.params.id, userId, operatorRole, reason); // 调用 service 取消
      return reply.send({ success: true, data: result });
    },
  );

  // ======================== 发起评审 ========================
  fastify.post<{ Params: { id: string }; Reply: ApiResponse<RequirementDetail> }>(
    '/api/requirements/:id/submit-review',               // POST /api/requirements/:id/submit-review
    {
      onRequest: [
        fastify.authenticate,                            // 需要登录
        rbacMiddleware(Operation.SUBMIT_REVIEW),          // 需要 SUBMIT_REVIEW 权限（BA/TRAIN_ADMIN）
      ],
    },
    async (request, reply) => {
      const user = request.user as JwtPayload;                       // 从 JWT 提取用户信息
      const userId = user.sub;                                       // 操作人 ID
      const operatorRole = user.role;                                // 操作人角色
      const result = await submitReview(request.params.id, userId, operatorRole); // 调用 service 发起评审
      return reply.send({ success: true, data: result });
    },
  );

  // ======================== 评审通过 ========================
  fastify.post<{ Params: { id: string }; Body: { comment?: string }; Reply: ApiResponse<RequirementDetail> }>(
    '/api/requirements/:id/review-pass',               // POST /api/requirements/:id/review-pass
    {
      onRequest: [
        fastify.authenticate,                            // 需要登录
        rbacMiddleware(Operation.REVIEW_REQ),             // 需要 REVIEW_REQ 权限（仅 PROJECT_MGR）
      ],
    },
    async (request, reply) => {
      const user = request.user as JwtPayload;                       // 从 JWT 提取用户信息
      const userId = user.sub;                                       // 操作人 ID
      const operatorRole = user.role;                                // 操作人角色
      const comment = request.body?.comment;                         // 评审意见（可选）
      const result = await reviewPass(request.params.id, userId, operatorRole, comment); // 调用 service 评审通过
      return reply.send({ success: true, data: result });
    },
  );

  // ======================== 评审拒绝 ========================
  fastify.post<{ Params: { id: string }; Body: { reason: string }; Reply: ApiResponse<RequirementDetail> }>(
    '/api/requirements/:id/review-reject',              // POST /api/requirements/:id/review-reject
    {
      onRequest: [
        fastify.authenticate,                            // 需要登录
        rbacMiddleware(Operation.REVIEW_REQ),             // 需要 REVIEW_REQ 权限（仅 PROJECT_MGR）
      ],
    },
    async (request, reply) => {
      const user = request.user as JwtPayload;                       // 从 JWT 提取用户信息
      const userId = user.sub;                                       // 操作人 ID
      const operatorRole = user.role;                                // 操作人角色
      const reason = request.body?.reason || '';                     // 拒绝原因（必填）
      const result = await reviewReject(request.params.id, userId, operatorRole, reason); // 调用 service 评审拒绝
      return reply.send({ success: true, data: result });
    },
  );

  // ======================== 重新编辑 ========================
  fastify.post<{ Params: { id: string }; Reply: ApiResponse<RequirementDetail> }>(
    '/api/requirements/:id/re-edit',                  // POST /api/requirements/:id/re-edit
    {
      onRequest: [
        fastify.authenticate,                            // 需要登录
        rbacMiddleware(Operation.EDIT_REQ),               // 需要 EDIT_REQ 权限（BA/PM/PROJECT_MGR）
      ],
    },
    async (request, reply) => {
      const user = request.user as JwtPayload;                       // 从 JWT 提取用户信息
      const userId = user.sub;                                       // 操作人 ID
      const operatorRole = user.role;                                // 操作人角色
      const result = await reEdit(request.params.id, userId, operatorRole); // 调用 service 重新编辑
      return reply.send({ success: true, data: result });
    },
  );

  // ======================== 需求变更 ========================
  fastify.post<{
    Params: { id: string };
    Body: { changeReason: string };
    Reply: ApiResponse<RequirementDetail>;
  }>(
    '/api/requirements/:id/change',                    // POST /api/requirements/:id/change
    {
      onRequest: [
        fastify.authenticate,                            // 需要登录
        rbacMiddleware(Operation.CHANGE_REQ),             // 需要 CHANGE_REQ 权限（BA/TRAIN_ADMIN/SUPER_ADMIN）
      ],
      schema: {
        body: {
          type: 'object',
          required: ['changeReason'],                     // 变更原因必填
          properties: {
            changeReason: { type: 'string', minLength: 1, maxLength: 500 }, // 1-500 字
          },
        },
      },
    },
    async (request, reply) => {
      const user = request.user as JwtPayload;                       // 从 JWT 提取用户信息
      const userId = user.sub;                                       // 操作人 ID
      const operatorRole = user.role;                                // 操作人角色
      const changeReason = request.body.changeReason;                 // 变更原因
      const result = await changeRequirement(request.params.id, userId, operatorRole, changeReason); // 调用 service 需求变更
      return reply.send({ success: true, data: result });
    },
  );

  // ======================== 子状态变更 ========================
  fastify.post<{
    Params: { id: string };
    Body: { subStatus: string; comment?: string };
    Reply: ApiResponse<RequirementDetail>;
  }>(
    '/api/requirements/:id/change-sub-status',         // POST /api/requirements/:id/change-sub-status
    {
      onRequest: [
        fastify.authenticate,                            // 需要登录
        rbacMiddleware(Operation.CHANGE_SUB_STATUS),      // 需要 CHANGE_SUB_STATUS 权限（PROJECT_MGR/TECH_MGR/TEST_MGR）
      ],
      schema: {
        body: {
          type: 'object',
          required: ['subStatus'],                        // 目标子状态必填
          properties: {
            subStatus: { type: 'string', enum: ['DEV_IN_PROGRESS', 'SIT_TESTING', 'UAT_TESTING', 'FROZEN'] }, // 有效子状态枚举
            comment: { type: 'string', maxLength: 500 },  // 变更说明可选，最多 500 字
          },
        },
      },
    },
    async (request, reply) => {
      const user = request.user as JwtPayload;                       // 从 JWT 提取用户信息
      const userId = user.sub;                                       // 操作人 ID
      const subStatus = request.body.subStatus as ReqSubStatus;     // 目标子状态（类型转换）
      const comment = request.body.comment;                          // 变更说明（可选）
      const result = await changeSubStatus(request.params.id, userId, subStatus, comment); // 调用 service 子状态变更
      return reply.send({ success: true, data: result });
    },
  );

  // ======================== 紧急变更 ========================
  fastify.post<{
    Params: { id: string };
    Body: { urgency: string; reason: string };
    Reply: ApiResponse<RequirementDetail>;
  }>(
    '/api/requirements/:id/emergency-change',          // POST /api/requirements/:id/emergency-change
    {
      onRequest: [
        fastify.authenticate,                            // 需要登录
        rbacMiddleware(Operation.EMERGENCY_CHANGE),       // 需要 EMERGENCY_CHANGE 权限（BA/TRAIN_ADMIN）
      ],
      schema: {
        body: {
          type: 'object',
          required: ['urgency', 'reason'],                // 紧急程度和原因必填
          properties: {
            urgency: { type: 'string', enum: ['P0', 'P1'] }, // P0紧急/P1较紧急
            reason: { type: 'string', minLength: 1, maxLength: 500 }, // 1-500 字
          },
        },
      },
    },
    async (request, reply) => {
      const user = request.user as JwtPayload;                       // 从 JWT 提取用户信息
      const userId = user.sub;                                       // 操作人 ID
      const operatorRole = user.role;                                // 操作人角色
      const urgency = request.body.urgency;                          // 紧急程度
      const reason = request.body.reason;                            // 变更原因
      const result = await emergencyChange(request.params.id, userId, operatorRole, urgency, reason); // 调用 service 紧急变更
      return reply.send({ success: true, data: result });
    },
  );
}
