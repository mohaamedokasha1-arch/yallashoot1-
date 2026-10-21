import type { KVStore } from "./types";

interface Entry {
  value: unknown;
  expiresAt: number | null;
}

/** In-process store. Not shared between serverless instances; lost on restart. */
export class MemoryStore implements KVStore {
  readonly kind = "memory" as const;
  readonly persistent = false;
  private readonly data = new Map<string, Entry>();

  private read(key: string): Entry | undefined {
    const entry = this.data.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.data.delete(key);
      return undefined;
    }
    return entry;
  }

  private write(key: string, value: unknown, ttlSeconds?: number) {
    // Store a structured clone so callers can't mutate cached objects.
    this.data.set(key, {
      value: structuredClone(value),
      expiresAt: ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.read(key);
    return entry ? (structuredClone(entry.value) as T) : null;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    this.write(key, value, ttlSeconds);
  }

  async del(key: string): Promise<void> {
    this.data.delete(key);
  }

  async setIfAbsent(key: string, value: unknown, ttlSeconds: number): Promise<boolean> {
    if (this.read(key)) return false;
    this.write(key, value, ttlSeconds);
    return true;
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const entry = this.read(key);
    const next = (typeof entry?.value === "number" ? entry.value : 0) + 1;
    this.data.set(key, {
      value: next,
      expiresAt: entry?.expiresAt ?? (ttlSeconds ? Date.now() + ttlSeconds * 1000 : null),
    });
    return next;
  }

  async pushCapped(key: string, value: unknown, maxLength: number): Promise<void> {
    const entry = this.read(key);
    const list = Array.isArray(entry?.value) ? (entry.value as unknown[]) : [];
    list.unshift(structuredClone(value));
    list.length = Math.min(list.length, maxLength);
    this.data.set(key, { value: list, expiresAt: entry?.expiresAt ?? null });
  }

  async list<T>(key: string, limit: number): Promise<T[]> {
    const entry = this.read(key);
    const list = Array.isArray(entry?.value) ? (entry.value as T[]) : [];
    return structuredClone(list.slice(0, limit));
  }

  async hset(key: string, values: Record<string, unknown>): Promise<void> {
    const entry = this.read(key);
    const hash = (entry?.value && typeof entry.value === "object" && !Array.isArray(entry.value)
      ? entry.value
      : {}) as Record<string, unknown>;
    for (const [field, value] of Object.entries(values)) hash[field] = structuredClone(value);
    this.data.set(key, { value: hash, expiresAt: entry?.expiresAt ?? null });
  }

  async hgetall<T>(key: string): Promise<Record<string, T>> {
    const entry = this.read(key);
    if (!entry || typeof entry.value !== "object" || entry.value === null) return {};
    return structuredClone(entry.value as Record<string, T>);
  }

  async hdel(key: string, field: string): Promise<void> {
    const entry = this.read(key);
    if (entry && typeof entry.value === "object" && entry.value !== null) {
      delete (entry.value as Record<string, unknown>)[field];
    }
  }

  async ping(): Promise<boolean> {
    return true;
  }

  /** Test helper. */
  clear() {
    this.data.clear();
  }
}
