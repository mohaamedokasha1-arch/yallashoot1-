#!/usr/bin/env node
/**
 * Generates an ADMIN_PASSWORD_HASH value (scrypt) for the admin panel.
 *   npm run admin:hash -- "your-long-unique-password"
 * Run it in a private terminal; the password itself is never stored.
 */
import { randomBytes, scrypt } from "node:crypto";
import { createInterface } from "node:readline/promises";

const N = 16384;
const r = 8;
const p = 1;

async function readPassword() {
  const arg = process.argv[2];
  if (arg) return arg;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const value = await rl.question("Password: ");
  rl.close();
  return value;
}

const password = (await readPassword()).normalize("NFKC");
if (password.length < 12) {
  console.error("Use at least 12 characters.");
  process.exit(1);
}
const salt = randomBytes(16);
const key = await new Promise((resolve, reject) =>
  scrypt(password, salt, 64, { N, r, p, maxmem: 64 * 1024 * 1024 }, (err, k) => (err ? reject(err) : resolve(k))),
);
console.log(["scrypt", N, r, p, salt.toString("base64url"), key.toString("base64url")].join("$"));
