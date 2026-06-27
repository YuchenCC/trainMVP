/**
 * ========== Prometheus 指标收集模块 ==========
 * 提供 HTTP 请求和业务操作的指标监控
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// 简单的内存指标存储（生产环境建议使用 prom-client）
// 如果需要更完善的 Prometheus 支持，可以引入 prom-client 库

interface MetricLabel {
  name: string;
  labels: Record<string, string>;
  value: number;
}

// 指标存储
const metrics: {
  httpRequestTotal: MetricLabel[];
  httpRequestDuration: MetricLabel[];
  businessOperationTotal: MetricLabel[];
} = {
  httpRequestTotal: [],
  httpRequestDuration: [],
  businessOperationTotal: [],
};

/**
 * 增加 HTTP 请求计数
 */
function incHttpRequest(method: string, route: string, statusCode: number): void {
  const key = `${method}:${route}:${statusCode}`;
  const existing = metrics.httpRequestTotal.find(m => m.name === key);
  if (existing) {
    existing.value++;
  } else {
    metrics.httpRequestTotal.push({
      name: key,
      labels: { method, route, statusCode: String(statusCode) },
      value: 1,
    });
  }
}

/**
 * 记录 HTTP 请求耗时
 */
function observeHttpDuration(method: string, route: string, statusCode: number, durationMs: number): void {
  const key = `${method}:${route}:${statusCode}`;
  const existing = metrics.httpRequestDuration.find(m => m.name === key);
  if (existing) {
    // 简单移动平均
    existing.value = (existing.value + durationMs) / 2;
  } else {
    metrics.httpRequestDuration.push({
      name: key,
      labels: { method, route, statusCode: String(statusCode) },
      value: durationMs,
    });
  }
}

/**
 * 增加业务操作计数
 */
function incBusinessOperation(module: string, action: string, status: 'success' | 'failure'): void {
  const key = `${module}:${action}:${status}`;
  const existing = metrics.businessOperationTotal.find(m => m.name === key);
  if (existing) {
    existing.value++;
  } else {
    metrics.businessOperationTotal.push({
      name: key,
      labels: { module, action, status },
      value: 1,
    });
  }
}

/**
 * 获取 Prometheus 格式的指标
 */
function getPrometheusMetrics(): string {
  const lines: string[] = [];

  // HTTP 请求总数
  lines.push('# HELP http_request_total HTTP 请求总数');
  lines.push('# TYPE http_request_total counter');
  for (const metric of metrics.httpRequestTotal) {
    const labels = Object.entries(metric.labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    lines.push(`http_request_total{${labels}} ${metric.value}`);
  }

  // HTTP 请求耗时
  lines.push('# HELP http_request_duration_ms HTTP 请求平均耗时(ms)');
  lines.push('# TYPE http_request_duration_ms gauge');
  for (const metric of metrics.httpRequestDuration) {
    const labels = Object.entries(metric.labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    lines.push(`http_request_duration_ms{${labels}} ${metric.value.toFixed(2)}`);
  }

  // 业务操作总数
  lines.push('# HELP business_operation_total 业务操作总数');
  lines.push('# TYPE business_operation_total counter');
  for (const metric of metrics.businessOperationTotal) {
    const labels = Object.entries(metric.labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    lines.push(`business_operation_total{${labels}} ${metric.value}`);
  }

  return lines.join('\n');
}

/**
 * 初始化指标中间件
 */
export function initializeMetrics(app: FastifyInstance): void {
  // 注册 /metrics 端点
  app.get('/metrics', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.header('Content-Type', 'text/plain; version=0.0.4');
    return getPrometheusMetrics();
  });

  // 请求完成时更新指标
  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const route = request.routeOptions?.url || request.url;
    const method = request.method;
    const statusCode = reply.statusCode;
    const duration = reply.elapsedTime;

    // 更新请求计数
    incHttpRequest(method, route, statusCode);

    // 更新请求耗时
    observeHttpDuration(method, route, statusCode, duration);
  });
}

/**
 * 记录业务操作
 */
export function recordBusinessOperation(
  module: string,
  action: string,
  status: 'success' | 'failure'
): void {
  incBusinessOperation(module, action, status);
}

/**
 * 获取当前指标快照（用于调试）
 */
export function getMetricsSnapshot() {
  return {
    httpRequestTotal: metrics.httpRequestTotal.map(m => ({
      labels: m.labels,
      value: m.value,
    })),
    httpRequestDuration: metrics.httpRequestDuration.map(m => ({
      labels: m.labels,
      avgDurationMs: m.value,
    })),
    businessOperationTotal: metrics.businessOperationTotal.map(m => ({
      labels: m.labels,
      value: m.value,
    })),
  };
}

/**
 * 重置指标数据（仅用于测试）
 */
export function resetMetrics(): void {
  metrics.httpRequestTotal = [];
  metrics.httpRequestDuration = [];
  metrics.businessOperationTotal = [];
}
