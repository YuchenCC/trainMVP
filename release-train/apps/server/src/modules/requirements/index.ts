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
} from '@release-train/shared';
import {
  createRequirement,                // 创建需求 service
  getRequirementById,               // 获取需求详情 service
  updateRequirement,                // 编辑需求 service
  cancelRequirement,                // 取消需求 service
  searchRequirements,               // 搜索需求 service
  listRequirements,                 // 需求列表 service（分页）
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
  fastify.post<{ Params: { id: string }; Reply: ApiResponse<{ success: true }> }>(
    '/api/requirements/:id/cancel',                      // POST /api/requirements/:id/cancel
    {
      onRequest: [
        fastify.authenticate,                            // 需要登录
        rbacMiddleware(Operation.CANCEL_REQ),             // 需要 CANCEL_REQ 权限（BA/PROJECT_MGR/TRAIN_ADMIN）
      ],
    },
    async (request, reply) => {
      const userId = getUserId(request);                            // 从 JWT 提取操作人
      const result = await cancelRequirement(request.params.id, userId); // 调用 service 取消
      return reply.send({ success: true, data: result });
    },
  );
}
