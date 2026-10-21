import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * Password hashing with Node's built-in scrypt.
 * Format: scrypt$N$r$p$<salt base64url>$<hash base64url>
 * Generate a hash with: npm run admin:hash
 */

const KEY_LENGTH = 64;
const DEFAULTS = { N: 16384, r: 8, p: 1 };

function scrypt(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, { ...DEFAULTS, maxmem: 64 * 1024 * 1024 });
  return ["scrypt", DEFAULTS.N, DEFAULTS.r, DEFAULTS.p, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, nRaw, rRaw, pRaw, saltRaw, hashRaw] = parts;
  const N = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (![N, r, p].every((v) => Number.isInteger(v) && v > 0) || N > 1 << 20 || r > 32 || p > 16) return false;
  try {
    const salt = Buffer.from(saltRaw ?? "", "base64url");
    const expected = Buffer.from(hashRaw ?? "", "base64url");
    if (salt.length < 8 || expected.length < 32) return false;
    const actual = await scrypt(password.normalize("NFKC"), salt, expected.length, { N, r, p, maxmem: 256 * 1024 * 1024 });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** Valid-format hash of a random password, used to equalise timing for unknown users. */
export const DUMMY_HASH =
  "scrypt$16384$8$1$c2FsdHNhbHRzYWx0c2FsdA$YWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYQ";
