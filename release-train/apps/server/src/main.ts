// ========== 服务入口 ==========
// 创建 Fastify 实例并启动 HTTP 服务
import { createApp } from './app.js';

// 从环境变量读取端口号，默认 3000
const PORT = parseInt(process.env.SERVER_PORT || '3000', 10);

async function main() {
  const app = await createApp();

  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    app.log.info(`Server running at http://localhost:${PORT}`);
    if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
      app.log.info(`API docs at http://localhost:${PORT}/documentation`);
    }
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
