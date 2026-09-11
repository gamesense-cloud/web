/**
 * Test harness. Every suite gets its own on-disk database, migrated and seeded
 * fresh, so tests never depend on order and never touch the dev database.
 */
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.BCRYPT_ROUNDS = '4'; // real bcrypt, but fast enough for a suite

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

// Point the config at a scratch file before anything imports it.
const dbFile = path.join(os.tmpdir(), `gsc-test-${crypto.randomUUID()}.db`);
process.env.DATABASE_FILE = dbFile;

const { migrate } = await import('../database/migrate.js');
const { seed } = await import('../database/seed.js');
const { closeDb } = await import('../config/database.js');
const { createServer } = await import('../src/backend/server.js');
const { DEV_PASSWORD } = await import('../database/seeds/users.js');

export { DEV_PASSWORD };

export function setupDatabase() {
  migrate({ quiet: true });
  seed({ quiet: true });
}

export function teardownDatabase() {
  closeDb();
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    const file = dbFile + suffix;
    if (fs.existsSync(file)) {
      try { fs.rmSync(file); } catch { /* windows keeps a handle a moment longer */ }
    }
  }
}

export const app = createServer();

/** Signs in and returns the bearer token. */
export async function tokenFor(request, username, password = DEV_PASSWORD) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ identifier: username, password });
  if (res.status !== 200) throw new Error(`login failed for ${username}: ${res.body.error}`);
  return res.body.token;
}

export const bearer = (token) => ({ Authorization: `Bearer ${token}` });
