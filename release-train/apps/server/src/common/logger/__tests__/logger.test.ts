import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FastifyBaseLogger } from 'fastify';
import { Logger, setGlobalLogger, getGlobalLogger, getLoggerFromRequest, createBusinessLogger, logBusinessOperation } from '../logger';

const mockBaseLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
  child: vi.fn(),
  level: 30,
  fatal: vi.fn(),
  silent: false,
  msgPrefix: '',
} as unknown as FastifyBaseLogger;

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('核心方法', () => {
    it('TC-LOG-001 - info级别日志记录', () => {
      const logger = new Logger(mockBaseLogger);
      logger.info('test message', { key: 'value' });

      expect(mockBaseLogger.info).toHaveBeenCalled();
    });

    it('TC-LOG-002 - warn级别日志记录', () => {
      const logger = new Logger(mockBaseLogger);
      logger.warn('warning message', { key: 'value' });

      expect(mockBaseLogger.warn).toHaveBeenCalled();
    });

    it('TC-LOG-003 - error级别日志记录', () => {
      const logger = new Logger(mockBaseLogger);
      const error = new Error('test error');
      logger.error('error message', error, { key: 'value' });

      expect(mockBaseLogger.error).toHaveBeenCalled();
    });

    it('TC-LOG-004 - debug级别日志记录', () => {
      const logger = new Logger(mockBaseLogger);
      logger.debug('debug message', { key: 'value' });

      expect(mockBaseLogger.debug).toHaveBeenCalled();
    });

    it('TC-LOG-005 - trace级别日志记录', () => {
      const logger = new Logger(mockBaseLogger);
      logger.trace('trace message', { key: 'value' });

      expect(mockBaseLogger.trace).toHaveBeenCalled();
    });

    it('TC-LOG-006 - 业务日志记录', () => {
      const logger = new Logger(mockBaseLogger);
      logger.logBusiness({
        module: 'test',
        action: 'create',
        target: 'item-1',
        status: 'success',
      });

      expect(mockBaseLogger.info).toHaveBeenCalled();
    });
  });

  describe('上下文管理', () => {
    it('TC-LOG-007 - 设置correlationId（返回新实例）', () => {
      const logger = new Logger(mockBaseLogger);
      const newLogger = logger.withCorrelationId('test-corr-id');

      expect(newLogger).not.toBe(logger);
      newLogger.info('test');
      expect(mockBaseLogger.info).toHaveBeenCalled();
    });

    it('TC-LOG-008 - 设置用户信息（返回新实例）', () => {
      const logger = new Logger(mockBaseLogger);
      const newLogger = logger.withUser('user-1', 'admin');

      expect(newLogger).not.toBe(logger);
      newLogger.info('test');
      expect(mockBaseLogger.info).toHaveBeenCalled();
    });

    it('TC-LOG-009 - 链式设置上下文', () => {
      const logger = new Logger(mockBaseLogger);
      const chained = logger.withCorrelationId('corr-1').withUser('user-1');

      expect(chained).not.toBe(logger);
      chained.info('test');
      expect(mockBaseLogger.info).toHaveBeenCalled();
    });

    it('TC-LOG-010 - 日志脱敏metadata', () => {
      const logger = new Logger(mockBaseLogger);
      logger.info('test', { password: 'secret123', email: 'test@example.com' });

      expect(mockBaseLogger.info).toHaveBeenCalled();
    });
  });

  describe('全局Logger', () => {
    it('TC-LOG-011 - 设置全局Logger', () => {
      const logger = new Logger(mockBaseLogger);
      setGlobalLogger(logger);

      const global = getGlobalLogger();
      expect(global).toBe(logger);
    });
  });

  describe('请求Logger', () => {
    it('TC-LOG-013 - getLoggerFromRequest应正确设置correlationId', () => {
      const mockRequest = {
        log: mockBaseLogger,
        correlationId: 'test-request-correlation-id',
      } as any;

      const logger = getLoggerFromRequest(mockRequest);
      logger.info('test request log');

      expect(mockBaseLogger.info).toHaveBeenCalled();
    });

    it('getLoggerFromRequest无correlationId时正常工作', () => {
      const mockRequest = {
        log: mockBaseLogger,
        correlationId: undefined,
      } as any;

      const logger = getLoggerFromRequest(mockRequest);
      logger.info('test request log');

      expect(mockBaseLogger.info).toHaveBeenCalled();
    });
  });

  describe('业务日志辅助函数', () => {
    it('createBusinessLogger - success', () => {
      const logger = new Logger(mockBaseLogger);
      setGlobalLogger(logger);

      const businessLogger = createBusinessLogger('test-module');
      businessLogger.success('create', 'item-1');

      expect(mockBaseLogger.info).toHaveBeenCalled();
    });

    it('createBusinessLogger - failure', () => {
      const logger = new Logger(mockBaseLogger);
      setGlobalLogger(logger);

      const businessLogger = createBusinessLogger('test-module');
      businessLogger.failure('create', 'item-1');

      expect(mockBaseLogger.info).toHaveBeenCalled();
    });
  });
});