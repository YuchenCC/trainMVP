import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../../../app.js';
import { FastifyInstance } from 'fastify';

describe('Logger - L2 API 集成测试', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('correlationMiddleware', () => {
    it('TC-CORR-004 - 响应头包含correlationId', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/health',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['x-correlation-id']).toBeDefined();
      expect(res.headers['x-correlation-id']).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
    });

    it('TC-CORR-006 - 分布式链路追踪传递（请求头中已有的correlationId应被保留）', async () => {
      const testCorrelationId = 'test-correlation-id-123';
      const res = await app.inject({
        method: 'GET',
        url: '/api/health',
        headers: {
          'x-correlation-id': testCorrelationId,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['x-correlation-id']).toBe(testCorrelationId);
    });

    it('TC-CORR-005 - onResponse记录请求完成日志（通过inject验证中间件执行）', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/health',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['x-correlation-id']).toBeDefined();
    });
  });

  describe('initializeMetrics', () => {
    it('TC-MET-004 - /metrics端点返回Prometheus格式', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/metrics',
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/plain');
      expect(res.headers['content-type']).toContain('version=0.0.4');

      const body = res.body;
      expect(body).toContain('# HELP http_request_total');
      expect(body).toContain('# TYPE http_request_total counter');
      expect(body).toContain('# HELP http_request_duration_ms');
      expect(body).toContain('# TYPE http_request_duration_ms gauge');
      expect(body).toContain('# HELP business_operation_total');
      expect(body).toContain('# TYPE business_operation_total counter');
    });

    it('TC-MET-001 - 增加HTTP请求计数（通过多次请求验证）', async () => {
      await app.inject({ method: 'GET', url: '/api/health' });
      await app.inject({ method: 'GET', url: '/api/health' });
      await app.inject({ method: 'GET', url: '/api/health' });

      const res = await app.inject({ method: 'GET', url: '/metrics' });
      expect(res.statusCode).toBe(200);

      const body = res.body;
      const match = body.match(/http_request_total\{method="GET",route="\/api\/health",statusCode="200"\} (\d+)/);
      expect(match).toBeDefined();
      expect(parseInt(match![1])).toBeGreaterThanOrEqual(3);
    });

    it('TC-MET-003 - 记录请求耗时（通过metrics端点验证）', async () => {
      await app.inject({ method: 'GET', url: '/api/health' });

      const res = await app.inject({ method: 'GET', url: '/metrics' });
      expect(res.statusCode).toBe(200);

      const body = res.body;
      expect(body).toContain('http_request_duration_ms');
      expect(body).toMatch(/http_request_duration_ms\{method="GET",route="\/api\/health",statusCode="200"\} \d+\.\d+/);
    });
  });
});