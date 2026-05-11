export { authRoutes } from './routes.js';
export {
  assertDevSeedEnabled,
  assertStrongPassword,
  buildJwtPayload,
  getCurrentUser,
  loginUser,
  seedAdmin,
  toSafeUser,
} from './service.js';
export type { SeedAdminRequest } from './service.js';
