// ========== Fastify 类型扩展 ==========
// 为 @fastify/jwt 插件注册的装饰器补充 TypeScript 类型声明

import '@fastify/jwt';

declare module 'fastify' {
  interface FastifyInstance {
    // JWT 认证守卫，注册 @fastify/jwt 后自动挂载
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }

  interface FastifyRequest {
    // JWT 解码后的用户信息，由 authenticate 中间件注入
    user?: {
      sub: string;    // 用户 ID
      username: string;
      role: string;   // 用户角色（对应 Role 枚举）
    };
  }
}
