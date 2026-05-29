// ========== 插件 API 路由（T5） ==========
// 为 Coze 插件提供 HTTP 接口，使用 X-Plugin-Key 鉴权
// 路由：/api/plugin/systems/search, /api/plugin/requirements/:id/detail, /api/plugin/change-requests
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { searchSystems, getRequirementDetailForPlugin, createChangeRequest } from './service.js';

// ========== 插件 API Key 鉴权中间件 ==========
// 校验请求头 X-Plugin-Key 是否与环境变量 PLUGIN_API_KEY 匹配
async function pluginKeyAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const key = request.headers['x-plugin-key'] as string | undefined;
  const expectedKey = process.env.PLUGIN_API_KEY;

  if (!expectedKey) {
    // 未配置 PLUGIN_API_KEY 时跳过鉴权（开发环境便利）
    return;
  }

  if (!key || key !== expectedKey) {
    reply.status(200).send({
      success: false,
      message: '插件 API Key 无效',
      code: 'UNAUTHORIZED',
    });
    return;
  }
}

// ========== 路由注册 ==========
export async function pluginRoutes(fastify: FastifyInstance): Promise<void> {
  // 所有插件路由添加 API Key 鉴权
  fastify.addHook('preHandler', pluginKeyAuth);

  // ===== 系统模糊搜索 =====
  fastify.get<{
    Querystring: { name: string; keyword?: string };
  }>(
    '/api/plugin/systems/search',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', minLength: 1 }, // 系统名，必填
            keyword: { type: 'string' },              // 需求关键词，可选
          },
        },
      },
    },
    async (request, reply) => {
      const { name, keyword } = request.query;
      const result = await searchSystems(name, keyword);
      reply.send({ success: true, data: result });
    },
  );

  // ===== 需求完整详情 =====
  fastify.get<{
    Params: { id: string };
  }>(
    '/api/plugin/requirements/:id/detail',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
      },
    },
    async (request, reply) => {
      const result = await getRequirementDetailForPlugin(request.params.id);
      reply.send({ success: true, data: result });
    },
  );

  // ===== 创建变更单 =====
  fastify.post<{
    Body: {
      requirementId: string;
      conversation?: string;
      changeSummary?: string;
      workloadImpact?: string;
      scheduleImpact?: string;
      riskLevel?: string;
      riskDescription?: string;
    };
  }>(
    '/api/plugin/change-requests',
    {
      schema: {
        body: {
          type: 'object',
          required: ['requirementId'],
          properties: {
            requirementId: { type: 'string' },
            conversation: { type: 'string' },
            changeSummary: { type: 'string' },
            workloadImpact: { type: 'string' },
            scheduleImpact: { type: 'string' },
            riskLevel: { type: 'string' },
            riskDescription: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const result = await createChangeRequest({
        ...request.body,
        source: 'coze',
      });
      reply.send({ success: true, data: result });
    },
  );
}
