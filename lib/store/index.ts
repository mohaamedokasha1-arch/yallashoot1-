import "server-only";
import path from "node:path";
import { redisConfig } from "@/lib/env";
import { FileStore } from "./file";
import { MemoryStore } from "./memory";
import type { KVStore } from "./types";
import { UpstashStore } from "./upstash";

export type { KVStore, StoreKind } from "./types";

const PREFIX = "ys:";

/** Adds a namespace prefix so the Redis database can be shared safely. */
class PrefixedStore implements KVStore {
  constructor(private readonly inner: KVStore) {}
  get kind() {
    return this.inner.kind;
  }
  get persistent() {
    return this.inner.persistent;
  }
  get<T>(key: string) {
    return this.inner.get<T>(PREFIX + key);
  }
  set(key: string, value: unknown, ttlSeconds?: number) {
    return this.inner.set(PREFIX + key, value, ttlSeconds);
  }
  del(key: string) {
    return this.inner.del(PREFIX + key);
  }
  setIfAbsent(key: string, value: unknown, ttlSeconds: number) {
    return this.inner.setIfAbsent(PREFIX + key, value, ttlSeconds);
  }
  incr(key: string, ttlSeconds?: number) {
    return this.inner.incr(PREFIX + key, ttlSeconds);
  }
  pushCapped(key: string, value: unknown, maxLength: number) {
    return this.inner.pushCapped(PREFIX + key, value, maxLength);
  }
  list<T>(key: string, limit: number) {
    return this.inner.list<T>(PREFIX + key, limit);
  }
  hset(key: string, values: Record<string, unknown>) {
    return this.inner.hset(PREFIX + key, values);
  }
  hgetall<T>(key: string) {
    return this.inner.hgetall<T>(PREFIX + key);
  }
  hdel(key: string, field: string) {
    return this.inner.hdel(PREFIX + key, field);
  }
  ping() {
    return this.inner.ping();
  }
}

const globalForStore = globalThis as unknown as { __ysStore?: KVStore; __ysStoreOverride?: KVStore };

function createStore(): KVStore {
  const redis = redisConfig();
  if (redis) return new PrefixedStore(new UpstashStore(redis.url, redis.token));
  const forced = process.env.YS_STORE;
  if (forced === "memory" || process.env.VERCEL || process.env.NODE_ENV === "test") {
    return new PrefixedStore(new MemoryStore());
  }
  // Development/test-only store. The ignore hints keep Turbopack from tracing
  // the whole project into the serverless bundle because of a dynamic path.
  const dir = process.env.YS_DATA_DIR?.trim() || path.join(/*turbopackIgnore: true*/ process.cwd(), ".data", "kv");
  return new PrefixedStore(new FileStore(path.resolve(/*turbopackIgnore: true*/ dir)));
}

export function getStore(): KVStore {
  if (globalForStore.__ysStoreOverride) return globalForStore.__ysStoreOverride;
  globalForStore.__ysStore ??= createStore();
  return globalForStore.__ysStore;
}

/** Test hook: replace the store (pass undefined to reset). */
export function setStoreForTests(store: KVStore | undefined) {
  globalForStore.__ysStoreOverride = store;
}

/**
 * Whether admin-managed content (articles, settings, annotations) can be
 * saved safely. In production this requires a persistent shared store.
 */
export function contentWritesAllowed(store: KVStore = getStore()): boolean {
  if (store.kind === "upstash") return true;
  if (store.kind === "file") return !process.env.VERCEL;
  return process.env.NODE_ENV !== "production";
}
