// ========== 认证模块路由 ==========
// 提供登录、获取当前用户、初始化管理员三个接口。
import type { FastifyInstance } from 'fastify';
import type {
  ApiResponse,
  JwtPayload,
  LoginRequest,
  LoginResponse,
  SafeUser,
} from '@release-train/shared';
import { getCurrentUser, loginUser, seedAdmin, type SeedAdminRequest } from './service.js';
import { loginBodySchema, seedBodySchema } from './validators.js';

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post<{
    Body: LoginRequest;
    Reply: ApiResponse<LoginResponse>;
  }>(
    '/api/auth/login',
    {
      schema: {
        body: loginBodySchema,
      },
    },
    async (request, reply) => {
      const { user, payload } = await loginUser(request.body);
      const token = fastify.jwt.sign(payload, {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      });

      return reply.send({
        success: true,
        data: {
          token,
          user,
        },
      });
    }
  );

  fastify.get<{
    Reply: ApiResponse<SafeUser>;
  }>(
    '/api/auth/me',
    {
      onRequest: [fastify.authenticate],
    },
    async (request) => {
      const { sub: userId } = request.user as JwtPayload;
      const user = await getCurrentUser(userId);

      return {
        success: true,
        data: user,
      };
    }
  );

  fastify.post<{
    Body: SeedAdminRequest;
    Reply: ApiResponse<SafeUser>;
  }>(
    '/api/auth/seed',
    {
      schema: {
        body: seedBodySchema,
      },
    },
    async (request, reply) => {
      const user = await seedAdmin(request.body);

      return reply.send({
        success: true,
        data: user,
      });
    }
  );
}
