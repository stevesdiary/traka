import { Redis } from '@upstash/redis';
import logger from '../utils/logger.js';

export const upstashRedis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Compatibility wrapper to match redis client interface
export const redis = {
  async get(key: string): Promise<string | null> {
    const value = await upstashRedis.get(key);
    if (value === null || value === undefined) return null;
    // Upstash REST API auto-deserializes JSON — return as-is if already an object
    if (typeof value === 'object') return value as unknown as string;
    return String(value);
  },

  async set(key: string, value: string): Promise<void> {
    await upstashRedis.set(key, value);
  },

  async setEx(key: string, seconds: number, value: string): Promise<void> {
    await upstashRedis.setex(key, seconds, value);
  },

  async del(key: string): Promise<void> {
    await upstashRedis.del(key);
  },

  async exists(key: string): Promise<number> {
    return await upstashRedis.exists(key);
  },

  async expire(key: string, seconds: number): Promise<void> {
    await upstashRedis.expire(key, seconds);
  },

  async ttl(key: string): Promise<number> {
    return await upstashRedis.ttl(key);
  },

  async keys(pattern: string): Promise<string[]> {
    const matchedKeys: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, elements] = await upstashRedis.scan(cursor, {
        match: pattern,
        count: 100
      });
      matchedKeys.push(...elements);
      cursor = nextCursor;
    } while (cursor !== '0');
    return matchedKeys;
  },

  async incr(key: string): Promise<number> {
    return await upstashRedis.incr(key);
  },

  async decr(key: string): Promise<number> {
    return await upstashRedis.decr(key);
  },

  async hSet(key: string, field: string, value: string): Promise<void> {
    await upstashRedis.hset(key, { [field]: value });
  },

  async hGet(key: string, field: string): Promise<string | null> {
    return await upstashRedis.hget(key, field);
  },

  async hGetAll(key: string): Promise<Record<string, string>> {
    return await upstashRedis.hgetall(key) as Record<string, string>;
  },

  async hDel(key: string, field: string): Promise<void> {
    await upstashRedis.hdel(key, field);
  },

  async sAdd(key: string, member: string): Promise<void> {
    await upstashRedis.sadd(key, member);
  },

  async sRem(key: string, member: string): Promise<void> {
    await upstashRedis.srem(key, member);
  },

  async sMembers(key: string): Promise<string[]> {
    return await upstashRedis.smembers(key);
  },

  async sIsMember(key: string, member: string): Promise<boolean> {
    const result = await upstashRedis.sismember(key, member);
    return result === 1;
  },

  // No-op methods for compatibility (Upstash is serverless, no connection needed)
  async connect(): Promise<void> {
    logger.info('Upstash Redis initialized (serverless)');
  },

  async disconnect(): Promise<void> {
    logger.info('Upstash Redis cleanup (no connection to close)');
  },
};
