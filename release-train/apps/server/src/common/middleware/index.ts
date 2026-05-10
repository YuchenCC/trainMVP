import { FastifyRequest, FastifyReply } from 'fastify';
import { errors } from '../errors/index.js';
import { Role, JwtPayload } from '@release-train/shared';

// ========== JWT认证中间件 ==========
// 校验请求中的JWT Token，将用户信息挂载到 request.user
export async function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    // @fastify/jwt 会自动验证并注入 request.user
    await request.jwtVerify<JwtPayload>();
  } catch {
    throw errors.unauthorized();
  }
}

// ========== RBAC权限中间件工厂 ==========
// 返回一个中间件函数，校验当前用户是否拥有指定角色
export function rbacMiddleware(...allowedRoles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user as JwtPayload | undefined;

    if (!user) {
      throw errors.unauthorized();
    }

    // 超级管理员拥有所有权限
    if (user.role === Role.SUPER_ADMIN) {
      return;
    }

    // 服务端二次校验角色权限（不依赖前端按钮控制）
    if (!allowedRoles.includes(user.role)) {
      throw errors.forbidden();
    }
  };
}
