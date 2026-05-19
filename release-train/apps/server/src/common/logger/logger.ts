/**
 * ========== 统一日志接口 ==========
 * 封装 Fastify Logger，提供结构化日志和业务日志能力
 */

import { FastifyBaseLogger, FastifyRequest } from 'fastify';
import { sanitizeObject, sanitizeValue } from './sanitizers';

// ========== 日志级别枚举 ==========
export enum LogLevel {
  TRACE = 10,
  DEBUG = 20,
  INFO = 30,
  WARN = 40,
  ERROR = 50,
  FATAL = 60,
}

// ========== 业务日志元数据 ==========
export interface BusinessLogMeta {
  module: string;
  action: string;
  target?: string;
  targetType?: string;
  userId?: string;
  duration?: number;
  status?: 'success' | 'failure';
  metadata?: Record<string, any>;
}

// ========== 统一日志接口 ==========
export interface AppLogger {
  info(message: string, metadata?: Record<string, any>): void;
  warn(message: string, metadata?: Record<string, any>): void;
  error(message: string, error?: Error, metadata?: Record<string, any>): void;
  debug(message: string, metadata?: Record<string, any>): void;
  trace(message: string, metadata?: Record<string, any>): void;

  logBusiness(meta: BusinessLogMeta): void;

  withCorrelationId(correlationId: string): AppLogger;
  withUser(userId: string, userRole?: string): AppLogger;
}

// ========== Logger 实现类 ==========
export class Logger implements AppLogger {
  private baseLogger: FastifyBaseLogger;
  private correlationId?: string;
  private userId?: string;
  private userRole?: string;

  constructor(baseLogger: FastifyBaseLogger) {
    this.baseLogger = baseLogger;
  }

  private buildContext(metadata?: Record<string, any>): Record<string, any> {
    const context: Record<string, any> = {};

    if (this.correlationId) {
      context.correlationId = this.correlationId;
    }
    if (this.userId) {
      context.userId = this.userId;
    }
    if (this.userRole) {
      context.userRole = this.userRole;
    }

    // 脱敏处理
    if (metadata) {
      const sanitized = sanitizeObject(metadata);
      Object.assign(context, sanitized);
    }

    return context;
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.baseLogger.info(this.buildContext(metadata), message);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.baseLogger.warn(this.buildContext(metadata), message);
  }

  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    const context = this.buildContext(metadata);

    if (error) {
      context.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    this.baseLogger.error(context, message);
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.baseLogger.debug(this.buildContext(metadata), message);
  }

  trace(message: string, metadata?: Record<string, any>): void {
    this.baseLogger.trace(this.buildContext(metadata), message);
  }

  logBusiness(meta: BusinessLogMeta): void {
    const context: Record<string, any> = {
      module: meta.module,
      action: meta.action,
      type: 'business',
    };

    if (meta.target) {
      context.target = meta.target;
    }
    if (meta.targetType) {
      context.targetType = meta.targetType;
    }
    if (meta.userId || this.userId) {
      context.userId = meta.userId || this.userId;
    }
    if (meta.duration) {
      context.duration = meta.duration;
    }
    if (meta.metadata) {
      context.metadata = sanitizeObject(meta.metadata);
    }

    if (this.correlationId) {
      context.correlationId = this.correlationId;
    }

    this.baseLogger.info(context, `[${meta.module}] ${meta.action}${meta.target ? ` - ${meta.target}` : ''}`);
  }

  withCorrelationId(correlationId: string): AppLogger {
    const logger = new Logger(this.baseLogger);
    logger.correlationId = correlationId;
    logger.userId = this.userId;
    logger.userRole = this.userRole;
    return logger;
  }

  withUser(userId: string, userRole?: string): AppLogger {
    const logger = new Logger(this.baseLogger);
    logger.correlationId = this.correlationId;
    logger.userId = userId;
    logger.userRole = userRole || this.userRole;
    return logger;
  }
}

// ========== 业务日志辅助函数 ==========
let globalLogger: AppLogger | null = null;

/**
 * 设置全局 Logger 实例
 */
export function setGlobalLogger(logger: AppLogger): void {
  globalLogger = logger;
}

/**
 * 获取全局 Logger 实例
 */
export function getGlobalLogger(): AppLogger {
  if (!globalLogger) {
    throw new Error('Global logger not initialized. Call setGlobalLogger first.');
  }
  return globalLogger;
}

/**
 * 创建业务日志帮助函数
 */
export function createBusinessLogger(module: string) {
  return {
    info: (action: string, message: string, meta?: Record<string, any>) => {
      const logger = getGlobalLogger();
      logger.info(message, { module, action, ...meta });
    },
    success: (action: string, target?: string, meta?: Record<string, any>) => {
      const logger = getGlobalLogger();
      logger.logBusiness({
        module,
        action,
        target,
        status: 'success' as const,
        ...meta,
      });
    },
    failure: (action: string, target?: string, meta?: Record<string, any>) => {
      const logger = getGlobalLogger();
      logger.logBusiness({
        module,
        action,
        target,
        status: 'failure' as const,
        ...meta,
      });
    },
    error: (action: string, error: Error, meta?: Record<string, any>) => {
      const logger = getGlobalLogger();
      logger.error(`[${module}] ${action} failed`, error, meta);
    },
  };
}

/**
 * 从 Fastify 请求获取 Logger
 */
export function getLoggerFromRequest(request: FastifyRequest): AppLogger {
  const baseLogger = request.log;
  const logger = new Logger(baseLogger);

  if (request.correlationId) {
    logger.withCorrelationId(request.correlationId);
  }

  // 如果请求中有用户信息，可以从 jwt 或 session 中获取
  // const user = request.user;

  return logger;
}

/**
 * 快速记录业务操作
 */
export function logBusinessOperation(meta: BusinessLogMeta): void {
  try {
    const logger = getGlobalLogger();
    logger.logBusiness(meta);
  } catch (error) {
    // 静默失败，避免日志记录影响业务
    console.error('Failed to log business operation:', error);
  }
}
