// ========== 应用工厂 ==========
// 创建并配置 Fastify 实例，注册插件、路由和中间件
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
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

import { authMiddleware } from './common/middleware/index.js';
import { handleError } from './common/errors/index.js';
import { authRoutes } from './modules/auth/index.js';

// 兜底加载当前目录的 .env（兼容 apps/server/.env 符号链接）
dotenv.config();

// ========== 创建Fastify实例 ==========
export async function createApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
      // 日志中不打印敏感信息
      serializers: {
        req(request) {
          return {
            method: request.method,
            url: request.url,
            // 不记录请求体中的密码等敏感字段
          };
        },
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
      tags: [{ name: 'auth', description: '认证相关接口' }],
    },
  });

  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
    await app.register(swaggerUI, {
      routePrefix: '/documentation',
    });
  }

  // ========== 注册CORS（白名单限定，禁止使用*） ==========
  const corsOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:5173'];

  await app.register(cors, {
    origin: corsOrigins,
    credentials: true,
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
  app.setErrorHandler((error, _request, reply) => {
    handleError(error, reply);
  });

  // ========== 注册路由 ==========
  await app.register(authRoutes);

  // ========== 健康检查 ==========
  app.get('/api/health', async () => ({
    success: true,
    data: { status: 'ok', timestamp: new Date().toISOString() },
  }));

  return app;
}
