// ========== 火车模块路由入口 ==========
// 聚合并导出所有火车相关路由
import { FastifyInstance } from 'fastify';
import { createTrainRoute } from './routes/create.js';
import { listTrainsRoute } from './routes/list.js';
import { getTrainRoute } from './routes/get.js';
import { updateTrainRoute } from './routes/update.js';
import { cancelTrainRoute } from './routes/cancel.js';
import { systemsRoutes } from './routes/systems.js';
import { availableSystemsRoute } from './routes/available-systems.js';
import { scheduleRoutes } from './routes/schedule.js';
import { operationsRoutes } from './routes/operations.js';

/**
 * 注册火车模块所有路由到 Fastify 实例
 * 
 * 路由顺序说明：
 * - /api/trains 列表路由必须在 /api/trains/:id 之前注册
 * - /api/systems/available 必须在 /api/systems/:id/users 之后注册
 * 
 * @param fastify - Fastify 实例（由 app.ts 传入）
 */
export async function trainRoutes(fastify: FastifyInstance): Promise<void> {
  // 火车 CRUD 路由
  await createTrainRoute(fastify);
  await listTrainsRoute(fastify);
  await getTrainRoute(fastify);
  await updateTrainRoute(fastify);
  await cancelTrainRoute(fastify);
  
  // 搭载系统管理路由
  await systemsRoutes(fastify);

  // 班次管理路由
  await scheduleRoutes(fastify);

  // 操作路由（US2.5-2.9）
  await operationsRoutes(fastify);
}

// 单独导出可选系统路由（在 systems 模块中注册）
export { availableSystemsRoute };
