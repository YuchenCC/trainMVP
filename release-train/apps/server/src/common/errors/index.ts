import { FastifyError, FastifyReply } from 'fastify';
import { getErrorCodeEntry, ErrorType } from '@release-train/shared';

// ========== 业务错误基类 ==========
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public errorType: ErrorType; // 区分技术错误 vs 业务错误

  constructor(statusCode: number, message: string, code: string, errorType: ErrorType) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errorType = errorType;
    this.name = 'AppError';
  }
}

// ========== 内部工具：从注册表创建错误实例 ==========
// 所有错误工厂方法最终调用此函数，确保错误码、状态码、类型与注册表一致
function makeError(code: string, overrideMessage?: string): AppError {
  const entry = getErrorCodeEntry(code); // 从 shared 错误码注册表查询
  if (!entry) {
    // 未注册的错误码：兜底为 500 技术错误
    return new AppError(500, `未知错误码: ${code}`, code, ErrorType.TECHNICAL);
  }
  return new AppError(
    entry.statusCode,                        // HTTP 状态码（来自注册表）
    overrideMessage ?? entry.message,        // 提示消息（可覆盖默认值）
    entry.code,                              // 错误码
    entry.type,                              // 技术/业务类型
  );
}

// ========== 常用错误工厂 ==========
// 每个方法对应 ERROR_CODE_MAP 中的一条记录
// 新增错误码时：1) 在 shared/error-codes.ts 注册 → 2) 在此新增工厂方法
export const errors = {
  unauthorized: (message?: string) =>
    makeError('UNAUTHORIZED', message), // 401 技术错误：未登录

  forbidden: (message?: string) =>
    makeError('FORBIDDEN', message), // 403 技术错误：IP访问拒绝等基础设施层拦截

  permissionDenied: (message?: string) =>
    makeError('PERMISSION_DENIED', message), // 200 业务错误：用户角色权限不足

  notFound: (resource = '资源') =>
    makeError('NOT_FOUND', `${resource}不存在`), // 404 技术错误：资源不存在

  badRequest: (message?: string) =>
    makeError('BAD_REQUEST', message), // 200 业务错误：参数错误

  conflict: (message?: string) =>
    makeError('CONFLICT', message), // 200 业务错误：数据冲突

  internal: (message?: string) =>
    makeError('INTERNAL_ERROR', message), // 500 技术错误：服务器内部错误
};

// ========== 错误处理函数（生产环境不暴露堆栈） ==========
export function handleError(error: unknown, reply: FastifyReply): void {
  if (error instanceof AppError) {
    // 业务错误统一返回 HTTP 200，通过 success:false 区分
    // 技术错误使用注册表中定义的 HTTP 状态码
    reply.status(error.statusCode).send({
      success: false,
      message: error.message,
      code: error.code,
    });
    return;
  }

  // Fastify内置错误（包括 schema 验证、rate-limit 等）
  const fastifyError = error as FastifyError;
  if (fastifyError.statusCode) {
    // 速率限制错误：返回自定义格式
    if (fastifyError.statusCode === 429) {
      reply.status(429).send({
        success: false,
        message: '请求过于频繁，请稍后再试',
        code: 'RATE_LIMIT_EXCEEDED',
      });
      return;
    }

    // Schema 验证错误：参数校验属于业务错误，返回 200
    if (fastifyError.statusCode === 400 && fastifyError.code === 'FST_ERR_VALIDATION') {
      reply.status(200).send({
        success: false,
        message: '请求参数验证失败',
        code: 'VALIDATION_ERROR',
      });
      return;
    }

    // 其他 Fastify 错误
    reply.status(fastifyError.statusCode).send({
      success: false,
      message: fastifyError.message,
      code: fastifyError.code || 'FASTIFY_ERROR',
    });
    return;
  }

  // Rate-limit 抛出的错误可能没有 statusCode（通过 errorResponseBuilder 处理）
  // 检查是否为 rate-limit 相关错误
  if ((error as any)?.code === 'RATE_LIMIT_EXCEEDED') {
    reply.status(429).send({
      success: false,
      message: (error as any)?.message || '请求过于频繁，请稍后再试',
      code: 'RATE_LIMIT_EXCEEDED',
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