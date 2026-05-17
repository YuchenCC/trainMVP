import { FastifyInstance } from 'fastify';
import { userRoutes } from './routes.js';

export async function usersModule(fastify: FastifyInstance) {
  await userRoutes(fastify);
}

export { userRoutes };
