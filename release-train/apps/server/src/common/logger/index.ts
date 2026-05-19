/**
 * ========== 日志模块统一导出 ==========
 * 提供日志、追踪、监控、脱敏等功能
 */

// Logger 核心
export {
  Logger,
  AppLogger,
  LogLevel,
  BusinessLogMeta,
  setGlobalLogger,
  getGlobalLogger,
  createBusinessLogger,
  getLoggerFromRequest,
  logBusinessOperation,
} from './logger';

// 请求追踪
export { correlationMiddleware } from './correlation';

// 指标监控
export {
  initializeMetrics,
  recordBusinessOperation,
  getMetricsSnapshot,
} from './metrics';

// 敏感信息脱敏
export {
  sanitizeObject,
  sanitizeValue,
  sanitizeRequestLog,
  REDACT_CONFIG,
} from './sanitizers';
