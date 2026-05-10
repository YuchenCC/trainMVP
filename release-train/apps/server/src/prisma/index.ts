// ========== Prisma 客户端单例 ==========
// 利用 globalThis 缓存，防止开发环境热重载时创建多个数据库连接
import { PrismaClient } from '@prisma/client';

// 扩展 globalThis 类型，挂载 prisma 实例
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// 首次创建实例后缓存到全局，后续复用
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// 非生产环境将实例挂载到 globalThis，避免 HMR 重复创建
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
