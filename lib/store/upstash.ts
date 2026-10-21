import { Redis } from "@upstash/redis";
import type { KVStore } from "./types";

/** Upstash Redis (REST) store: durable and shared across serverless instances. */
export class UpstashStore implements KVStore {
  readonly kind = "upstash" as const;
  readonly persistent = true;
  private readonly redis: Redis;

  constructor(url: string, token: string) {
    this.redis = new Redis({ url, token, automaticDeserialization: true, enableTelemetry: false });
  }

  async get<T>(key: string): Promise<T | null> {
    return (await this.redis.get<T>(key)) ?? null;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds && ttlSeconds > 0) await this.redis.set(key, value, { ex: Math.ceil(ttlSeconds) });
    else await this.redis.set(key, value);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async setIfAbsent(key: string, value: unknown, ttlSeconds: number): Promise<boolean> {
    const res = await this.redis.set(key, value, { nx: true, ex: Math.max(1, Math.ceil(ttlSeconds)) });
    return res === "OK";
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const value = await this.redis.incr(key);
    if (value === 1 && ttlSeconds && ttlSeconds > 0) await this.redis.expire(key, Math.ceil(ttlSeconds));
    return value;
  }

  async pushCapped(key: string, value: unknown, maxLength: number): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.lpush(key, value);
    pipeline.ltrim(key, 0, Math.max(0, maxLength - 1));
    await pipeline.exec();
  }

  async list<T>(key: string, limit: number): Promise<T[]> {
    return (await this.redis.lrange<T>(key, 0, Math.max(0, limit - 1))) ?? [];
  }

  async hset(key: string, values: Record<string, unknown>): Promise<void> {
    if (Object.keys(values).length === 0) return;
    await this.redis.hset(key, values);
  }

  async hgetall<T>(key: string): Promise<Record<string, T>> {
    return ((await this.redis.hgetall<Record<string, T>>(key)) ?? {}) as Record<string, T>;
  }

  async hdel(key: string, field: string): Promise<void> {
    await this.redis.hdel(key, field);
  }

  async ping(): Promise<boolean> {
    try {
      return (await this.redis.ping()) === "PONG";
    } catch {
      return false;
    }
  }
}
