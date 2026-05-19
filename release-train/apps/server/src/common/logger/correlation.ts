/**
 * ========== 请求追踪中间件 ==========
 * 为每个请求生成或传递 correlation ID
 * 支持分布式链路追踪
 */

import { FastifyInstance, FastifyRequest, FastifyReply, HookHandlerDoneFunction } from 'fastify';

// Correlation ID 请求头名称
const CORRELATION_HEADER = 'x-correlation-id';
const CORRELATION_CONTEXT_KEY = 'correlationId';

/**
 * 生成唯一的 correlation ID
 * 格式: {timestamp}-{random}
 */
function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

/**
 * 获取请求的 correlation ID
 * 优先从请求头获取（支持链路追踪），如果没有则生成新的
 */
function getCorrelationId(request: FastifyRequest): string {
  const headerValue = request.headers[CORRELATION_HEADER] as string;
  if (headerValue && headerValue.length > 0 && headerValue.length <= 100) {
    return headerValue;
  }
  return generateCorrelationId();
}

/**
 * Correlation 中间件
 * 在 onRequest 钩子中设置 correlation ID
 */
export function correlationMiddleware(app: FastifyInstance): void {
  // onRequest: 请求开始时设置 correlation ID
  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const correlationId = getCorrelationId(request);

    // 将 correlationId 附加到 request 对象
    request.correlationId = correlationId;

    // 添加到响应头，便于前端排查
    reply.header(CORRELATION_HEADER, correlationId);
  });

  // onResponse: 请求结束时记录日志
  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const correlationId = request.correlationId || 'unknown';
    const duration = reply.elapsedTime;

    // 使用 fastify 内置 logger 记录请求完成
    request.log.info({
      correlationId,
      method: request.method,
      url: request.url,
      statusCode: reply.statusCode,
      duration,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    }, 'request completed');
  });
}

/**
 * 扩展 FastifyRequest 类型声明
 */
declare module 'fastify' {
  interface FastifyRequest {
    correlationId: string;
  }
}

/**
 * 扩展 FastifyInstance 类型声明
 */
declare module '@fastify/swagger' {
  interface FastifyInstance {
    correlationId?: string;
  }
}
