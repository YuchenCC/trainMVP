import { FastifyRequest, FastifyReply } from 'fastify';
import { errors } from '../errors/index.js';
import { Role, Operation, PERMISSION_MATRIX, JwtPayload } from '@release-train/shared';
import { isTokenRevoked } from '../token-blacklist/index.js';

// ========== JWT认证中间件 ==========
// 校验请求中的JWT Token，将用户信息挂载到 request.user
// 同时检查 Token 是否已被吊销
export async function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify<JwtPayload>();
  } catch {
    throw errors.unauthorized();
  }

  // 检查 Token 是否已被吊销（登出、密码修改等场景）
  const payload = request.user as JwtPayload;
  if (payload.jti && isTokenRevoked(payload.jti)) {
    throw errors.unauthorized('登录已失效，请重新登录');
  }
}

// ========== RBAC权限中间件工厂（基于操作权限） ==========
// 传入 Operation 枚举值，自动从 PERMISSION_MATRIX 查询允许的角色
// 推荐使用此方式，权限集中管理在 shared/constants 中
export function rbacMiddleware(operation: Operation) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user as JwtPayload | undefined;

    if (!user) {
      throw errors.unauthorized();
    }

    // 超级管理员拥有所有权限
    if (user.role === Role.SUPER_ADMIN) {
      return;
    }

    // 从权限矩阵查询该操作允许的角色
    const allowedRoles = PERMISSION_MATRIX[operation];
    if (!allowedRoles || !allowedRoles.includes(user.role as Role)) {
      throw errors.forbidden();
    }
  };
}

// ========== RBAC权限中间件工厂（基于角色白名单，兼容旧用法） ==========
// 直接传入角色列表，适用于简单的角色校验场景
export function rbacRolesMiddleware(...allowedRoles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user as JwtPayload | undefined;

    if (!user) {
      throw errors.unauthorized();
    }

    if (user.role === Role.SUPER_ADMIN) {
      return;
    }

    if (!allowedRoles.includes(user.role as Role)) {
      throw errors.forbidden();
    }
  };
}
