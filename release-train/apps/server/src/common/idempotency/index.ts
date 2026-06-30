// ========== 幂等性服务 ==========
// 用于防止重复请求导致的数据重复或状态不一致
// 当前实现为内存存储，生产环境应替换为 Redis
// 幂等键格式：{operation}:{resourceId}:{uniqueKey}

import { FastifyInstance } from 'fastify';

interface IdempotencyRecord {
  status: 'processing' | 'completed';
  result?: any;
  expiresAt: number;
}

const idempotencyStore = new Map<string, IdempotencyRecord>();

const DEFAULT_TTL_MS = 5 * 60 * 1000;

const CLEANUP_INTERVAL = 5 * 60 * 1000;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export function startIdempotencyCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of idempotencyStore) {
      if (record.expiresAt <= now) {
        idempotencyStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
}

export function stopIdempotencyCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

export async function executeIdempotent<T>(
  key: string,
  operation: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<T> {
  const now = Date.now();
  const existing = idempotencyStore.get(key);

  if (existing) {
    if (existing.expiresAt <= now) {
      idempotencyStore.delete(key);
    } else if (existing.status === 'completed' && existing.result !== undefined) {
      return existing.result as T;
    } else if (existing.status === 'processing') {
      throw new Error('请求正在处理中，请稍后重试');
    }
  }

  idempotencyStore.set(key, {
    status: 'processing',
    expiresAt: now + ttlMs,
  });

  try {
    const result = await operation();
    idempotencyStore.set(key, {
      status: 'completed',
      result,
      expiresAt: now + ttlMs,
    });
    return result;
  } catch (error) {
    idempotencyStore.delete(key);
    throw error;
  }
}

export function setIdempotentResult<T>(
  key: string,
  result: T,
  ttlMs: number = DEFAULT_TTL_MS
): void {
  idempotencyStore.set(key, {
    status: 'completed',
    result,
    expiresAt: Date.now() + ttlMs,
  });
}

export function isIdempotentKeyExists(key: string): boolean {
  const existing = idempotencyStore.get(key);
  if (!existing) return false;
  if (existing.expiresAt <= Date.now()) {
    idempotencyStore.delete(key);
    return false;
  }
  return true;
}

export function getIdempotentResult<T>(key: string): T | undefined {
  const existing = idempotencyStore.get(key);
  if (!existing || existing.expiresAt <= Date.now()) {
    if (existing) idempotencyStore.delete(key);
    return undefined;
  }
  return existing.result as T;
}

export function clearIdempotencyStore(): void {
  idempotencyStore.clear();
}

export function getIdempotencyStoreSize(): number {
  return idempotencyStore.size;
}