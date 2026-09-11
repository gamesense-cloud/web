#!/usr/bin/env node
/**
 * Migration runner.
 *
 *   npm run db:migrate            apply anything not yet applied
 *   npm run db:migrate -- --fresh drop the database file first
 *
 * Each file in migrations/ runs once, inside a transaction, in filename order.
 * Applied names are recorded in the migrations table.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../config/index.js';
import { getDb, closeDb } from '../config/database.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(here, 'migrations');

export function migrate({ fresh = false, quiet = false } = {}) {
  const log = quiet ? () => {} : (...a) => console.log(...a);

  if (fresh) {
    closeDb();
    for (const suffix of ['', '-journal', '-wal', '-shm']) {
      const file = config.db.file + suffix;
      if (fs.existsSync(file)) fs.rmSync(file);
    }
    log(`dropped ${path.relative(process.cwd(), config.db.file)}`);
  }

  const db = getDb();
  db.exec(`CREATE TABLE IF NOT EXISTS migrations (
    name TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  const done = new Set(db.prepare('SELECT name FROM migrations').all().map((r) => r.name));
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  let applied = 0;
  for (const name of files) {
    if (done.has(name)) continue;
    const sql = fs.readFileSync(path.join(dir, name), 'utf8');
    db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO migrations (name) VALUES (?)').run(name);
    })();
    log(`applied ${name}`);
    applied += 1;
  }

  if (!applied) log('nothing to apply — database is current');
  return applied;
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedDirectly) {
  migrate({ fresh: process.argv.includes('--fresh') });
  closeDb();
}

export default migrate;
