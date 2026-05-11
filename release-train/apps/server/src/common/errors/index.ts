import type { FastifyError, FastifyReply } from 'fastify';

// ========== 业务错误基类 ==========
export class AppError extends Error {
  public statusCode: number;
  public code: string;

  constructor(statusCode: number, message: string, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'AppError';
  }
}

// ========== 常用错误工厂 ==========
export const errors = {
  unauthorized: (message = '未登录或登录已过期') => new AppError(401, message, 'UNAUTHORIZED'),

  forbidden: (message = '无权限执行此操作') => new AppError(403, message, 'FORBIDDEN'),

  notFound: (resource = '资源') => new AppError(404, `${resource}不存在`, 'NOT_FOUND'),

  badRequest: (message = '请求参数错误') => new AppError(400, message, 'BAD_REQUEST'),

  conflict: (message = '数据冲突') => new AppError(409, message, 'CONFLICT'),

  internal: (message = '服务器内部错误') => new AppError(500, message, 'INTERNAL_ERROR'),
};

// ========== 错误处理函数（生产环境不暴露堆栈） ==========
export function handleError(error: unknown, reply: FastifyReply): void {
  if (error instanceof AppError) {
    reply.status(error.statusCode).send({
      success: false,
      message: error.message,
      code: error.code,
    });
    return;
  }

  // Fastify内置错误
  const fastifyError = error as FastifyError;
  if (fastifyError.statusCode) {
    reply.status(fastifyError.statusCode).send({
      success: false,
      message: fastifyError.message,
      code: fastifyError.code || 'FASTIFY_ERROR',
    });
    return;
  }

  // 未知错误：生产环境不暴露堆栈信息
  const isDev = process.env.NODE_ENV !== 'production';
  console.error('[Unhandled Error]', error);

  reply.status(500).send({
    success: false,
    message: isDev ? (error instanceof Error ? error.message : '服务器内部错误') : '服务器内部错误',
    code: 'INTERNAL_ERROR',
  });
}
