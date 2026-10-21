export type StoreKind = "upstash" | "file" | "memory";

/**
 * Minimal key-value abstraction used for: provider response cache /
 * last-known-good copies, quota tracking, monitoring logs, admin content and
 * settings. Values must be JSON-serialisable.
 */
export interface KVStore {
  readonly kind: StoreKind;
  /** True when data is durable and shared across server instances. */
  readonly persistent: boolean;
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  /** Sets the key only if it does not exist (used as a short-lived lock). */
  setIfAbsent(key: string, value: unknown, ttlSeconds: number): Promise<boolean>;
  incr(key: string, ttlSeconds?: number): Promise<number>;
  /** Prepends to a list and trims it to `maxLength` items (newest first). */
  pushCapped(key: string, value: unknown, maxLength: number): Promise<void>;
  list<T>(key: string, limit: number): Promise<T[]>;
  hset(key: string, values: Record<string, unknown>): Promise<void>;
  hgetall<T>(key: string): Promise<Record<string, T>>;
  hdel(key: string, field: string): Promise<void>;
  ping(): Promise<boolean>;
}
