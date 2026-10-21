import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { KVStore } from "./types";

interface FileEntry {
  key: string;
  value: unknown;
  expiresAt: number | null;
}

/**
 * Development store: one JSON file per key under `.data/kv/` (git-ignored).
 * Writes are atomic (temp file + rename). Suitable for local development and
 * end-to-end tests, not for serverless production (read-only filesystem).
 */
export class FileStore implements KVStore {
  readonly kind = "file" as const;
  readonly persistent = true;
  private ready: Promise<void> | null = null;

  constructor(private readonly dir: string) {}

  private ensureDir() {
    this.ready ??= mkdir(this.dir, { recursive: true }).then(() => undefined);
    return this.ready;
  }

  private fileFor(key: string) {
    const hash = createHash("sha256").update(key).digest("hex").slice(0, 40);
    return path.join(/*turbopackIgnore: true*/ this.dir, `${hash}.json`);
  }

  private async read(key: string): Promise<FileEntry | null> {
    try {
      const raw = await readFile(this.fileFor(key), "utf8");
      const entry = JSON.parse(raw) as FileEntry;
      if (entry.key !== key) return null;
      if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
        await rm(this.fileFor(key), { force: true });
        return null;
      }
      return entry;
    } catch {
      return null;
    }
  }

  private async write(key: string, value: unknown, expiresAt: number | null) {
    await this.ensureDir();
    const file = this.fileFor(key);
    const tmp = `${file}.${randomUUID()}.tmp`;
    const entry: FileEntry = { key, value, expiresAt };
    await writeFile(tmp, JSON.stringify(entry), "utf8");
    await rename(tmp, file);
  }

  private static expiry(ttlSeconds?: number) {
    return ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = await this.read(key);
    return entry ? (entry.value as T) : null;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    await this.write(key, value, FileStore.expiry(ttlSeconds));
  }

  async del(key: string): Promise<void> {
    await rm(this.fileFor(key), { force: true });
  }

  async setIfAbsent(key: string, value: unknown, ttlSeconds: number): Promise<boolean> {
    if (await this.read(key)) return false;
    await this.write(key, value, FileStore.expiry(ttlSeconds));
    return true;
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const entry = await this.read(key);
    const next = (typeof entry?.value === "number" ? entry.value : 0) + 1;
    await this.write(key, next, entry?.expiresAt ?? FileStore.expiry(ttlSeconds));
    return next;
  }

  async pushCapped(key: string, value: unknown, maxLength: number): Promise<void> {
    const entry = await this.read(key);
    const list = Array.isArray(entry?.value) ? (entry.value as unknown[]) : [];
    list.unshift(value);
    await this.write(key, list.slice(0, maxLength), entry?.expiresAt ?? null);
  }

  async list<T>(key: string, limit: number): Promise<T[]> {
    const entry = await this.read(key);
    return Array.isArray(entry?.value) ? (entry.value as T[]).slice(0, limit) : [];
  }

  async hset(key: string, values: Record<string, unknown>): Promise<void> {
    const entry = await this.read(key);
    const hash =
      entry?.value && typeof entry.value === "object" && !Array.isArray(entry.value)
        ? (entry.value as Record<string, unknown>)
        : {};
    await this.write(key, { ...hash, ...values }, entry?.expiresAt ?? null);
  }

  async hgetall<T>(key: string): Promise<Record<string, T>> {
    const entry = await this.read(key);
    return entry?.value && typeof entry.value === "object" && !Array.isArray(entry.value)
      ? (entry.value as Record<string, T>)
      : {};
  }

  async hdel(key: string, field: string): Promise<void> {
    const entry = await this.read(key);
    if (!entry || typeof entry.value !== "object" || entry.value === null) return;
    const hash = { ...(entry.value as Record<string, unknown>) };
    delete hash[field];
    await this.write(key, hash, entry.expiresAt);
  }

  async ping(): Promise<boolean> {
    try {
      await this.ensureDir();
      return true;
    } catch {
      return false;
    }
  }
}
