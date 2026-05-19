# 日志模块设计方案

**版本号**: v1.0
**日期**: 2026年5月20日
**状态**: 待审核
**分支**: task-2-logging

---

## 一、现有问题分析

### 1.1 日志使用现状

| 问题 | 说明 |
|------|------|
| 硬编码 console | 直接使用 `console.log/error/warn`，无法控制日志级别 |
| 无请求追踪 | 无法关联一个请求在多个模块的日志 |
| 无业务指标 | 无法统计业务操作次数、错误率等 |
| 无统一格式 | 日志格式不统一，难以解析 |
| 敏感信息泄露风险 | 可能打印密码、token 等敏感信息 |

### 1.2 现有日志调用

```typescript
// main.ts
console.log(`🚀 Server running at http://localhost:${PORT}`);

// errors/index.ts
console.error('[Unhandled Error]', error);
```

---

## 二、设计目标

| 目标 | 说明 |
|------|------|
| 快速定位 | 请求级别 correlation ID，贯穿整个请求生命周期 |
| 问题排查 | 结构化 JSON 日志，便于 ELK/Graylog 收集和分析 |
| 监控支持 | Prometheus 指标：请求计数、延迟分布、错误率 |
| 敏感脱敏 | 自动过滤密码、token、authorization 等敏感字段 |
| 统一接口 | 替换所有 console.log/error/warn |

---

## 三、日志分级规范

使用 pino 内置日志级别：

| 级别 | 值 | 用途 | 示例 |
|------|-----|------|------|
| fatal | 60 | 致命错误，服务不可用 | 数据库连接失败 |
| error | 50 | 错误，需要关注 | API 调用失败、认证失败 |
| warn | 40 | 警告，业务异常 | 超过限流、容量预警 |
| info | 30 | 一般信息 | 服务启动、请求完成 |
| debug | 20 | 调试信息 | 请求参数、返回值 |
| trace | 10 | 详细跟踪 | SQL 执行、循环次数 |

---

## 四、标准化日志字段

### 4.1 请求日志格式

```typescript
interface RequestLog {
  timestamp: string;        // ISO 8601 格式
  level: string;            // info/warn/error
  message: string;          // 日志消息
  correlationId: string;     // 请求追踪 ID
  requestId: string;         // 请求唯一 ID (fastify 内置)
  method: string;           // HTTP 方法
  url: string;             // 请求路径
  statusCode?: number;      // 响应状态码
  duration?: number;         // 请求耗时(ms)
  userId?: string;         // 当前用户 ID (如果已登录)
  userRole?: string;        // 当前用户角色
  userAgent?: string;       // 浏览器 UA
  ip?: string;             // 客户端 IP
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}
```

### 4.2 业务日志格式

```typescript
interface BusinessLog {
  timestamp: string;
  level: string;
  message: string;
  correlationId: string;
  module: string;          // 模块名: auth, requirement, train, schedule
  action: string;           // 操作名: create, update, delete, approve, reject
  target?: string;         // 操作对象: requirementId, trainId
  targetType?: string;      // 对象类型: requirement, train, schedule
  userId?: string;          // 操作人
  duration?: number;        // 操作耗时(ms)
  metadata?: Record<string, any>;  // 额外业务数据
}
```

---

## 五、核心功能设计

### 5.1 日志模块结构

```
src/
├── common/
│   └── logger/
│       ├── index.ts          # 导出统一接口
│       ├── logger.ts         # Logger 封装类
│       ├── correlation.ts    # 请求追踪中间件
│       ├── metrics.ts        # Prometheus 指标
│       └── sanitizers.ts     # 敏感信息脱敏
```

### 5.2 统一日志接口

```typescript
// logger.ts
import { FastifyLogger } from 'fastify';

export interface Logger {
  info(message: string, metadata?: Record<string, any>): void;
  warn(message: string, metadata?: Record<string, any>): void;
  error(message: string, error?: Error, metadata?: Record<string, any>): void;
  debug(message: string, metadata?: Record<string, any>): void;

  // 业务日志
  logBusiness(action: string, module: string, metadata?: BusinessLogMeta): void;

  // 带 correlationId 的日志
  withCorrelationId(correlationId: string): Logger;
}

// 使用示例
const logger = new AppLogger(fastify.log);
logger.info('用户登录成功', { userId: '123', system: 'user-center' });
logger.logBusiness('create', 'requirement', { target: 'REQ-001', userId: '123' });
```

### 5.3 请求追踪中间件

```typescript
// correlation.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// 从请求头获取或生成 correlation ID
// 优先使用 X-Correlation-ID 请求头，支持链路追踪
export function correlationMiddleware(app: FastifyInstance) {
  app.addHook('onRequest', async (request: FastifyRequest) => {
    const correlationId = request.headers['x-correlation-id'] as string
      || generateCorrelationId();

    // 将 correlationId 附加到 request 对象
    request.correlationId = correlationId;

    // 添加到响应头，便于前端排查
    request.reply.header('X-Correlation-ID', correlationId);
  });
}
```

### 5.4 Prometheus 指标

```typescript
// metrics.ts
import { PrometheusRegistry } from 'prom-client';

// 指标定义
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP 请求耗时分布',
  labelNames: ['method', 'route', 'statusCode'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
});

const httpRequestTotal = new Counter({
  name: 'http_request_total',
  help: 'HTTP 请求总数',
  labelNames: ['method', 'route', 'statusCode'],
});

const businessOperationTotal = new Counter({
  name: 'business_operation_total',
  help: '业务操作总数',
  labelNames: ['module', 'action', 'status'], // status: success/failure
});

// 指标注册到 /metrics 端点
app.get('/metrics', async (request, reply) => {
  reply.header('Content-Type', prometheusRegistry.contentType);
  return prometheusRegistry.metrics();
});
```

### 5.5 敏感信息脱敏

#### 5.5.1 脱敏字段清单

**认证敏感字段**（必须脱敏）：

| 字段模式 | 说明 |
|----------|------|
| `*.password` | 密码 |
| `*.oldPassword` | 旧密码 |
| `*.newPassword` | 新密码 |
| `*.confirmPassword` | 确认密码 |
| `*.token` | 认证令牌 |
| `*.apiKey` | API密钥 |
| `*.api_key` | API密钥 |
| `*.secret` | 密钥 |
| `req.headers.authorization` | 请求头认证信息 |
| `req.headers.cookie` | 请求头Cookie |

**个人敏感信息**（必须脱敏）：

| 字段模式 | 说明 | 脱敏规则 |
|----------|------|----------|
| `*.email` | 邮箱 | `u***@example.com` |
| `*.phone` | 手机号 | `138****5678` |
| `*.mobile` | 手机号 | `138****5678` |
| `*.tel` | 电话 | `***-****-5678` |
| `*.idCard` | 身份证号 | `310***********1234` |
| `*.id_card` | 身份证号 | `310***********1234` |
| `*.idNumber` | 证件号码 | `310***********1234` |
| `*.bankCard` | 银行卡号 | `**** **** **** 5678` |
| `*.bankAccount` | 银行账号 | `**** **** **** 5678` |
| `*.address` | 地址 | 只显示省市 |
| `*.realName` | 真实姓名 | `李*` |
| `*.name` (当值为中文姓名时) | 姓名 | `李*` |
| `*.age` | 年龄 | 脱敏为范围: `18-25` |
| `*.gender` | 性别 | 保持不变 |
| `*.birthday` | 生日 | `****-**-**` |
| `*.socialSecurity` | 社保号 | `*** *** *** 5678` |

#### 5.5.2 脱敏实现

```typescript
// sanitizers.ts

// 默认脱敏路径
const DEFAULT_REDACT_PATHS = [
  // 认证敏感字段
  'req.headers.authorization',
  'req.headers.cookie',
  '*.password',
  '*.oldPassword',
  '*.newPassword',
  '*.confirmPassword',
  '*.token',
  '*.secret',
  '*.apiKey',
  '*.api_key',

  // 个人敏感字段
  '*.email',
  '*.phone',
  '*.mobile',
  '*.tel',
  '*.idCard',
  '*.id_card',
  '*.idNumber',
  '*.bankCard',
  '*.bankAccount',
  '*.address',
  '*.realName',
  '*.birthday',
  '*.socialSecurity',
];

// 自定义脱敏函数
function sanitizeValue(key: string, value: any): any {
  if (value === undefined || value === null) return value;
  if (typeof value !== 'string' && typeof value !== 'number') return value;

  const keyLower = key.toLowerCase();

  // 邮箱脱敏: user@example.com -> u***@example.com
  if (keyLower.includes('email') && typeof value === 'string' && value.includes('@')) {
    const [local, domain] = value.split('@');
    return `${local[0]}***@${domain}`;
  }

  // 手机号脱敏: 13812345678 -> 138****5678
  if ((keyLower.includes('phone') || keyLower.includes('mobile'))
    && typeof value === 'string' && /^\d{11}$/.test(value)) {
    return `${value.slice(0, 3)}****${value.slice(-4)}`;
  }

  // 身份证号脱敏: 310101199001011234 -> 310***********1234
  if ((keyLower.includes('idcard') || keyLower.includes('id_card') || keyLower.includes('idnumber'))
    && typeof value === 'string' && /^\d{17}[\dXx]$/.test(value)) {
    return `${value.slice(0, 3)}***********${value.slice(-4)}`;
  }

  // 银行卡号脱敏: 6222021234567890123 -> **** **** **** 0123
  if ((keyLower.includes('bankcard') || keyLower.includes('bankaccount'))
    && typeof value === 'string' && /^\d{16,19}$/.test(value)) {
    return `**** **** **** ${value.slice(-4)}`;
  }

  // 电话脱敏: 021-1234-5678 -> ***-****-5678
  if (keyLower.includes('tel') && typeof value === 'string' && /^\d{3,4}-\d{3,4}-\d{4}$/.test(value)) {
    return `***-****-${value.split('-').pop()}`;
  }

  // 中文姓名脱敏: 张三 -> 张*，欧阳娜 -> 欧*娜
  if ((keyLower.includes('realname') || keyLower.includes('name'))
    && typeof value === 'string' && /^[\u4e00-\u9fa5]{2,4}$/.test(value)) {
    if (value.length === 2) {
      return `${value[0]}*`;
    }
    return `${value[0]}*${value.slice(-1)}`;
  }

  // 地址脱敏: 只显示省市
  if (keyLower.includes('address') && typeof value === 'string' && value.length > 0) {
    const match = value.match(/^([^省市区]+[省市区])/);
    return match ? match[1] + '***' : '***';
  }

  // 生日脱敏: 1990-01-01 -> ****-**-**
  if (keyLower.includes('birthday') && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return '****-**-**';
  }

  // 社保号脱敏: 310000199001011234 -> *** *** *** 1234
  if (keyLower.includes('socialsecurity') && typeof value === 'string' && /^\d{18}$/.test(value)) {
    return `*** *** *** ${value.slice(-4)}`;
  }

  return value;
}
```

---

## 六、API 设计

### 6.1 注入日志到 Fastify 实例

```typescript
// app.ts 改造
export async function createApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      // ... 现有配置
    },
  });

  // 1. 注册 correlation ID 中间件
  await app.register(correlationMiddleware);

  // 2. 初始化业务日志指标
  initializeMetrics(app);

  // 3. 替换全局 error handler，记录错误日志
  app.setErrorHandler((error, request, reply) => {
    const logger = getLogger(request);
    logger.error('请求处理失败', error, {
      correlationId: request.correlationId,
      url: request.url,
      method: request.method,
    });
    handleError(error, reply);
  });
}
```

### 6.2 请求/响应日志钩子

```typescript
// 请求日志中间件
app.addHook('onResponse', async (request, reply) => {
  const logger = getLogger(request);
  const duration = reply.elapsedTime;

  // 记录请求完成日志
  logger.info('请求处理完成', {
    method: request.method,
    url: request.url,
    statusCode: reply.statusCode,
    duration,
  });

  // 更新 Prometheus 指标
  const route = request.routeOptions?.url || request.url;
  httpRequestDuration.observe(
    { method: request.method, route, statusCode: reply.statusCode },
    duration / 1000
  );
  httpRequestTotal.inc({
    method: request.method,
    route,
    statusCode: reply.statusCode,
  });
});
```

### 6.3 业务日志装饰器

```typescript
// 在 service 层使用业务日志
import { createBusinessLogger } from '@/common/logger';

const log = createBusinessLogger('requirement');

async function createRequirement(data: CreateRequirementDTO, userId: string) {
  const startTime = Date.now();

  try {
    const requirement = await prisma.requirement.create({ data });

    // 成功日志
    log.info('需求创建成功', {
      action: 'create',
      target: requirement.id,
      targetType: 'requirement',
      userId,
      duration: Date.now() - startTime,
      metadata: { title: requirement.title, systemId: requirement.systemId },
    });

    return requirement;
  } catch (error) {
    // 失败日志
    log.error('需求创建失败', error as Error, {
      action: 'create',
      targetType: 'requirement',
      userId,
      duration: Date.now() - startTime,
    });
    throw error;
  }
}
```

---

## 七、监控端点

### 7.1 指标端点

```
GET /metrics
Content-Type: text/plain

# HELP http_request_duration_seconds HTTP 请求耗时分布
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{method="GET",route="/api/requirements",statusCode="200",le="0.01"} 10
...

# HELP http_request_total HTTP 请求总数
# TYPE http_request_total counter
http_request_total{method="GET",route="/api/requirements",statusCode="200"} 150
...

# HELP business_operation_total 业务操作总数
# TYPE business_operation_total counter
business_operation_total{module="requirement",action="create",status="success"} 45
business_operation_total{module="requirement",action="create",status="failure"} 2
```

### 7.2 健康检查端点

```
GET /health
Response: { "status": "ok", "uptime": 3600, "timestamp": "2026-05-20T10:30:00Z" }
```

---

## 八、配置项

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| LOG_LEVEL | info | 日志级别: trace, debug, info, warn, error, fatal |
| LOG_FORMAT | json | 日志格式: json, pretty (开发环境) |
| ENABLE_METRICS | true | 是否启用 Prometheus 指标 |
| METRICS_PATH | /metrics | 指标端点路径 |
| ENABLE_CORRELATION | true | 是否启用请求追踪 |
| CORRELATION_HEADER | x-correlation-id | correlation ID 请求头名 |

---

## 九、迁移计划

### 阶段一：基础设施（本次实现）

1. 创建 `src/common/logger/` 目录
2. 实现 Logger 封装类
3. 实现 correlation 中间件
4. 实现 metrics 收集
5. 实现脱敏工具

### 阶段二：接入应用（后续迭代）

1. 替换 `console.log/error/warn` → AppLogger
2. 在 service 层添加业务日志
3. 配置日志格式化输出

### 阶段三：监控告警（后续迭代）

1. 配置 ELK/Graylog 日志收集
2. 配置 Grafana 看板
3. 配置错误率告警规则

---

## 十、验收条件

### 功能验收

- [ ] 所有 `console.log/error/warn` 已替换为 AppLogger
- [ ] 每个请求都有唯一的 correlationId
- [ ] 日志输出为 JSON 格式（生产环境）
- [ ] 敏感信息（password, token）自动脱敏
- [ ] `/metrics` 端点返回 Prometheus 指标

### 监控验收

- [ ] 可统计每个接口的请求量和延迟分布
- [ ] 可统计业务操作的成功/失败次数
- [ ] 可通过 correlationId 追踪完整请求链路

### 性能验收

- [ ] 日志记录耗时 < 1ms（pino 异步写入）
- [ ] 指标收集不影响主流程（异步）

---

## 十一、相关文件

| 文件 | 说明 |
|------|------|
| `src/common/logger/index.ts` | 导出统一接口 |
| `src/common/logger/logger.ts` | Logger 封装类 |
| `src/common/logger/correlation.ts` | 请求追踪中间件 |
| `src/common/logger/metrics.ts` | Prometheus 指标 |
| `src/common/logger/sanitizers.ts` | 敏感信息脱敏 |
| `src/app.ts` | 集成日志模块 |
| `src/main.ts` | 移除 console.log |

---

## 十二、技术选型

| 技术 | 选型 | 原因 |
|------|------|------|
| 日志库 | pino (Fastify 内置) | 高性能，异步写入 |
| 监控库 | prom-client | Prometheus 官方 Node.js 客户端 |
| 追踪ID | 自定义 | 轻量，无需引入 Jaeger |
