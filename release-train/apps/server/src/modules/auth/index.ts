// ========== 认证模块路由 ==========
// 提供登录、获取当前用户、初始化管理员三个接口
import { FastifyInstance } from 'fastify';
import { prisma } from '../../prisma/index.js';
import { errors } from '../../common/errors/index.js';
import { Role, SafeUser, LoginRequest, LoginResponse, ApiResponse } from '@release-train/shared';
import bcrypt from 'bcrypt';

// ========== 输入清理工具 ==========
// 移除控制字符和非法 Unicode，防止注入和解析异常
function sanitizeInput(input: string): string {
  return input
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/[\uD800-\uDFFF]/g, '');
}

// ========== 登录接口 ==========
export async function loginRoute(fastify: FastifyInstance): Promise<void> {
  fastify.post<{
    Body: LoginRequest;
    Reply: ApiResponse<LoginResponse>;
  }>(
    '/api/auth/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string', minLength: 1, maxLength: 100 },
            password: { type: 'string', minLength: 1, maxLength: 200 },
          },
        },
      },
    },
    async (request, reply) => {
      const { username: rawUsername, password: rawPassword } = request.body;
      const username = sanitizeInput(rawUsername);
      const password = sanitizeInput(rawPassword);

      const user = await prisma.user.findUnique({
        where: { username },
      });

      // 防止时序攻击：无论用户是否存在，都执行 bcrypt.compare
      // 用户不存在时使用 dummy hash，保证耗时一致
      const dummyHash = '$2b$10$XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
      const storedHash = user?.password || dummyHash;

      const isPasswordValid = await bcrypt.compare(password, storedHash);

      if (!user || !user.password || !isPasswordValid) {
        throw errors.unauthorized('用户名或密码错误');
      }

      // 生成 JWT Token（payload 仅包含非敏感信息）
      const token = fastify.jwt.sign(
        {
          sub: user.id,
          username: user.username,
          role: user.role,
        },
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      // 构造安全用户信息（剔除 password、ssoId 等敏感字段）
      const safeUser: SafeUser = {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        role: user.role as Role,
      };

      return reply.send({
        success: true,
        data: {
          token,
          user: safeUser,
        },
      });
    }
  );
}

// ========== 获取当前用户信息 ==========
export async function meRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get<{
    Reply: ApiResponse<SafeUser>;
  }>(
    '/api/auth/me',
    {
      onRequest: [fastify.authenticate], // 需要登录
    },
    async (request) => {
      // 从 JWT payload 中提取用户 ID
      const { sub: userId } = request.user as { sub: string };

      // 查询用户信息，仅选择安全字段（排除 password、ssoId）
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,
          role: true,
          // 不返回 password、ssoId
        },
      });

      if (!user) {
        throw errors.unauthorized();
      }

      return {
        success: true,
        data: user as SafeUser,
      };
    }
  );
}

// ========== 创建初始管理员（仅开发环境使用） ==========
export async function seedRoute(fastify: FastifyInstance): Promise<void> {
  fastify.post<{
    Body: { username: string; password: string; displayName: string; email: string; role?: string };
    Reply: ApiResponse<SafeUser>;
  }>(
    '/api/auth/seed',
    {
      schema: {
        body: {
          type: 'object',
          required: ['username', 'password', 'displayName', 'email'],
          properties: {
            username: { type: 'string', minLength: 1, maxLength: 100 },
            password: { type: 'string', minLength: 1, maxLength: 200 },
            displayName: { type: 'string', minLength: 1, maxLength: 200 },
            email: { type: 'string', minLength: 1, maxLength: 200 },
            role: { type: 'string', enum: ['BA', 'PM', 'PROJECT_MGR', 'TECH_MGR', 'TEST_MGR', 'TRAIN_ADMIN', 'SUPER_ADMIN'] },
          },
        },
      },
    },
    async (request, reply) => {
      if (process.env.NODE_ENV === 'production') {
        throw errors.forbidden('生产环境禁止使用此接口');
      }

      const { username: rawUsername, password: rawPassword, displayName: rawDisplayName, email: rawEmail } = request.body;
      const username = sanitizeInput(rawUsername);
      const password = sanitizeInput(rawPassword);
      const displayName = sanitizeInput(rawDisplayName);
      const email = sanitizeInput(rawEmail);

      const role = (request.body.role as Role) || 'SUPER_ADMIN';

      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing) {
        throw errors.conflict('用户名已存在');
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          displayName,
          email,
          role: role,
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,
          role: true,
        },
      });

      return reply.send({
        success: true,
        data: user as SafeUser,
      });
    }
  );
}
