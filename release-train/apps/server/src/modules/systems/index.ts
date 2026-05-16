// ========== 系统模块路由 ==========
// 注册系统相关的 HTTP 路由：系统列表查询、系统成员查询、可选系统列表
// 路由文件（index.ts）负责接收请求参数、调用 service 层逻辑、返回响应
import { FastifyInstance } from 'fastify';               // Fastify 类型
import { ApiResponse } from '@release-train/shared'; // 通用响应类型
import { listSystems, getSystemUsers, SystemItem, SystemUserItem } from './service.js'; // service 层和本地类型
import { availableSystemsRoute } from '../trains/index.js'; // 可选系统路由

// ========== 系统用户响应类型（本地定义，避免 shared 类型冗余） ==========
/** 系统成员单条项（供前端下拉框使用） */
interface SystemUser {
  id: string;           // 用户 ID
  displayName: string;   // 用户显示名
  role: string;         // 成员角色（BA/PM/...）
}

/**
 * 注册系统模块所有路由到 Fastify 实例
 * 
 * @param fastify - Fastify 实例（由 app.ts 传入）
 */
export async function systemRoutes(fastify: FastifyInstance): Promise<void> {
  // ======================== 系统列表（支持关键词搜索） ========================
  fastify.get<{ Querystring: { q?: string }; Reply: ApiResponse<SystemItem[]> }>(
    '/api/systems',                                    // GET /api/systems?q=关键词
    {
      onRequest: [fastify.authenticate],                // 需要登录（所有角色可查看）
    },
    async (request, reply) => {
      const systems = await listSystems(request.query.q); // 调用 service，传关键词模糊搜索
      return reply.send({ success: true, data: systems }); // 返回系统列表（按名称升序，最多 50 条）
    },
  );

  // ======================== 系统成员列表 ========================
  fastify.get<{ Params: { id: string }; Reply: ApiResponse<SystemUserItem[]> }>(
    '/api/systems/:id/users',                          // GET /api/systems/:id/users
    {
      onRequest: [fastify.authenticate],                // 需要登录（所有角色可查看）
    },
    async (request, reply) => {
      // 调用 service 查询指定系统的所有成员（含 role 信息）
      const users = await getSystemUsers(request.params.id);
      return reply.send({ success: true, data: users }); // 返回成员列表
    },
  );

  // ======================== 可选系统列表（供火车创建/编辑使用） ========================
  // 注意：此路由必须在 /api/systems/:id/users 之后注册
  await availableSystemsRoute(fastify);
}
