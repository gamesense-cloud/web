import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import config from '../../../config/index.js';
import { getDb } from '../../../config/database.js';

fs.mkdirSync(config.uploads.dir, { recursive: true });

/**
 * Stored names are random — the uploader's filename is kept in the database for
 * display but never used on disk, so a crafted name cannot escape the directory
 * or overwrite an existing file.
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.uploads.dir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).slice(0, 10).replace(/[^.a-z0-9]/gi, '');
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: config.uploads.maxBytes, files: 4 },
  fileFilter: (_req, file, cb) => {
    if (config.uploads.allowedMime.includes(file.mimetype)) return cb(null, true);
    const err = new Error(`${file.mimetype} is not an accepted file type`);
    err.status = 415;
    err.expose = true;
    cb(err);
  },
});

export function record({ file, userId, postId = null }) {
  const info = getDb()
    .prepare(`INSERT INTO attachments (post_id, user_id, filename, stored_name, mime_type, byte_size)
              VALUES (?,?,?,?,?,?)`)
    .run(postId, userId, file.originalname, file.filename, file.mimetype, file.size);

  return {
    id: Number(info.lastInsertRowid),
    filename: file.originalname,
    url: `/uploads/${file.filename}`,
    mimeType: file.mimetype,
    byteSize: file.size,
  };
}

export function forPost(postId) {
  return getDb()
    .prepare(`SELECT id, filename, stored_name AS storedName, mime_type AS mimeType,
                     byte_size AS byteSize
              FROM attachments WHERE post_id = ?`)
    .all(postId)
    .map((a) => ({ ...a, url: `/uploads/${a.storedName}` }));
}

export function attachToPost(attachmentIds, postId, userId) {
  if (!attachmentIds?.length) return 0;
  const stmt = getDb().prepare(
    'UPDATE attachments SET post_id = ? WHERE id = ? AND user_id = ? AND post_id IS NULL'
  );
  let n = 0;
  for (const id of attachmentIds) n += stmt.run(postId, id, userId).changes;
  return n;
}

export function remove(id, userId) {
  const db = getDb();
  const row = db.prepare('SELECT * FROM attachments WHERE id = ? AND user_id = ?').get(id, userId);
  if (!row) return false;
  const file = path.join(config.uploads.dir, row.stored_name);
  if (fs.existsSync(file)) fs.rmSync(file);
  db.prepare('DELETE FROM attachments WHERE id = ?').run(id);
  return true;
}

/** Human-readable size, the way the attachment tile renders it. */
export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} b`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kb`;
  return `${(bytes / 1024 / 1024).toFixed(1)} mb`;
}

export default { upload, record, forPost, attachToPost, remove, formatSize };
