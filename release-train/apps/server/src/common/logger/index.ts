/**
 * ========== 日志模块统一导出 ==========
 * 提供日志、追踪、监控、脱敏等功能
 */

// Logger 核心
export {
  Logger,
  LogLevel,
  setGlobalLogger,
  getGlobalLogger,
  createBusinessLogger,
  getLoggerFromRequest,
  logBusinessOperation,
} from './logger';

// Logger 类型 (使用 type export 避免运行时问题)
export type { AppLogger, BusinessLogMeta } from './logger';

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
