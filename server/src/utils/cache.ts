import { redisClient, redisAvailable } from '../config/redis.js';

/**
 * Cache-aside helpers. Redis is optional: if it is down or errors, every helper falls
 * through to the loader so the app behaves exactly as it does without a cache.
 */
const isUp = () => redisAvailable && redisClient.isReady;

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  load: () => Promise<T>,
): Promise<T> {
  if (isUp()) {
    try {
      const hit = await redisClient.get(key);
      if (hit !== null) return JSON.parse(hit) as T;
    } catch {
      // treat a failed read as a miss
    }
  }

  const value = await load();

  // Don't cache "not found" results (null/undefined), so a later create is seen immediately
  if (value != null && isUp()) {
    try {
      await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
    } catch {
      // a failed write only costs us the cache entry
    }
  }
  return value;
}

export async function invalidate(...keys: string[]): Promise<void> {
  if (!isUp() || keys.length === 0) return;
  try {
    await redisClient.del(keys);
  } catch {
    // entries still expire via their TTL
  }
}

export const userCacheKey = (id: number) => `user:${id}`;
