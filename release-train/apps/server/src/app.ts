// ========== 应用工厂 ==========
// 创建并配置 Fastify 实例，注册插件、路由和中间件
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 获取当前目录的父目录（monorepo 根目录），用于定位 .env 文件
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const monorepoRoot = path.resolve(__dirname, '..', '..', '..');

// 优先从 monorepo 根目录加载 .env 文件
dotenv.config({ path: path.join(monorepoRoot, '.env') });

import { authMiddleware, rbacMiddleware } from './common/middleware/index.js';
import { handleError } from './common/errors/index.js';
import { loginRoute, meRoute, seedRoute } from './modules/auth/index.js';
import { requirementRoutes } from './modules/requirements/index.js';
import { systemRoutes } from './modules/systems/index.js';
import { Operation } from '@release-train/shared';

// 兜底加载当前目录的 .env（兼容 apps/server/.env 符号链接）
dotenv.config();

// ========== 创建Fastify实例 ==========
export async function createApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      serializers: {
        req(request) {
          return {
            method: request.method,
            url: request.url,
          };
        },
        res(reply) {
          return {
            statusCode: reply.statusCode,
          };
        },
      },
      redact: {
        paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.token'],
        censor: '[REDACTED]',
      },
    },
  });

  // ========== 注册Swagger文档 ==========
  await app.register(swagger, {
    openapi: {
      info: {
        title: '版本火车需求管理系统 API',
        version: '0.1.0',
        description: '版本火车需求管理系统后端API文档',
      },
      tags: [
        { name: 'auth', description: '认证相关接口' },
      ],
    },
  });

  await app.register(swaggerUI, {
    routePrefix: '/documentation',
  });

  // ========== 注册CORS（白名单限定，禁止使用*） ==========
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:5173'];

  await app.register(cors, {
    origin: corsOrigins,
    credentials: true,
  });

  // ========== 注册速率限制（防暴力破解） ==========
  // 非生产环境放宽限制：测试环境避免测试间互相影响，开发环境避免前端浏览触发限流
  // 可通过 RATE_LIMIT_MAX 环境变量覆盖（测试用例用）
  const isProduction = process.env.NODE_ENV === 'production';
  const rateLimitMax = process.env.RATE_LIMIT_MAX
    ? parseInt(process.env.RATE_LIMIT_MAX, 10)
    : (isProduction ? 200 : 1000);
  await app.register(rateLimit, {
    max: rateLimitMax,
    timeWindow: '1 minute',
    keyGenerator: (request) => {
      return request.ip;
    },
    errorResponseBuilder: () => ({
      success: false,
      message: '请求过于频繁，请稍后再试',
      code: 'RATE_LIMIT_EXCEEDED',
    }),
    addHeadersOnExceeding: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true,
    },
  });

  // ========== 注册JWT插件 ==========
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET 环境变量未配置，请通过 .env.local 注入');
  }

  await app.register(jwt, {
    secret: jwtSecret,
  });

  // ========== 注册认证中间件装饰器 ==========
  app.decorate('authenticate', authMiddleware);

  // ========== 全局错误处理 ==========
  app.setErrorHandler((error, request, reply) => {
    handleError(error, reply);
  });

  // ========== 生产环境 HTTPS 强制 ==========
  if (process.env.NODE_ENV === 'production') {
    app.addHook('onRequest', async (request, reply) => {
      const proto = request.headers['x-forwarded-proto'] || request.protocol;
      if (proto === 'http') {
        return reply.code(301).redirect(`https://${request.hostname}${request.url}`);
      }
    });
  }

  // ========== 注册路由 ==========
  await app.register(loginRoute);
  await app.register(meRoute);
  await app.register(seedRoute);
  await app.register(systemRoutes);
  await app.register(requirementRoutes);

  // ========== 健康检查 ==========
  app.get('/api/health', async () => ({
    success: true,
    data: { status: 'ok', timestamp: new Date().toISOString() },
  }));

  // ========== RBAC 测试路由（仅开发/测试环境） ==========
  if (process.env.NODE_ENV !== 'production') {
    app.post('/api/test/rbac/create-req', {
      onRequest: [app.authenticate, rbacMiddleware(Operation.CREATE_REQ)],
    }, async () => ({ success: true, data: { message: 'CREATE_REQ allowed' } }));

    app.post('/api/test/rbac/review-req', {
      onRequest: [app.authenticate, rbacMiddleware(Operation.REVIEW_REQ)],
    }, async () => ({ success: true, data: { message: 'REVIEW_REQ allowed' } }));

    app.post('/api/test/rbac/complete-dev', {
      onRequest: [app.authenticate, rbacMiddleware(Operation.COMPLETE_DEV)],
    }, async () => ({ success: true, data: { message: 'COMPLETE_DEV allowed' } }));
  }

  return app;
}
