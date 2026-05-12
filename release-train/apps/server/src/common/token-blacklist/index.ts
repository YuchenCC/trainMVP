// ========== Token 黑名单服务 ==========
// 用于 Token 吊销场景（用户登出、密码修改、账号禁用等）
// 当前实现为内存存储，生产环境应替换为 Redis
import { FastifyInstance } from 'fastify';

// 内存黑名单：tokenId -> 过期时间戳
const revokedTokens = new Map<string, number>();

// 定期清理过期条目（每 5 分钟）
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

// ========== 启动清理定时器 ==========
export function startTokenCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [tokenId, expiresAt] of revokedTokens) {
      if (expiresAt <= now) {
        revokedTokens.delete(tokenId);
      }
    }
  }, CLEANUP_INTERVAL);
}

// ========== 停止清理定时器 ==========
export function stopTokenCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

// ========== 吊销 Token ==========
export function revokeToken(tokenId: string, expiresAtMs: number): void {
  revokedTokens.set(tokenId, expiresAtMs);
}

// ========== 检查 Token 是否已吊销 ==========
export function isTokenRevoked(tokenId: string): boolean {
  const expiresAt = revokedTokens.get(tokenId);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    revokedTokens.delete(tokenId);
    return false;
  }
  return true;
}

// ========== 获取当前黑名单大小（测试用） ==========
export function getRevokedTokenCount(): number {
  return revokedTokens.size;
}

// ========== 清空黑名单（测试用） ==========
export function clearRevokedTokens(): void {
  revokedTokens.clear();
}
