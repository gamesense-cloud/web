import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import config from './index.js';

let db;

/**
 * One connection for the process. SQLite in WAL mode handles the concurrency a
 * forum of this size needs, and keeps the whole thing to a single file that
 * `npm run db:reset` can throw away.
 */
export function getDb() {
  if (db) return db;

  fs.mkdirSync(path.dirname(config.db.file), { recursive: true });
  db = new Database(config.db.file);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  return db;
}

/** Wraps a function so every statement inside it commits or rolls back together. */
export function transaction(fn) {
  return getDb().transaction(fn);
}

export function closeDb() {
  if (db) {
    db.close();
    db = undefined;
  }
}

export default getDb;
