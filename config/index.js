import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(fileURLToPath(new URL('../', import.meta.url)));

const num = (value, fallback) => {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
};

const env = process.env.NODE_ENV ?? 'development';
const isProduction = env === 'production';

// In production a real secret is mandatory. In development we fall back so a
// fresh clone runs with no setup, but the value is obviously not a secret.
const jwtSecret = process.env.JWT_SECRET || (isProduction ? '' : 'dev-only-secret');
if (isProduction && !jwtSecret) {
  throw new Error('JWT_SECRET must be set when NODE_ENV=production');
}

export const config = {
  env,
  isProduction,
  isTest: env === 'test',

  api: {
    port: num(process.env.API_PORT, 4000),
    webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  },

  auth: {
    jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
    bcryptRounds: num(process.env.BCRYPT_ROUNDS, 10),
  },

  db: {
    file: path.resolve(ROOT, process.env.DATABASE_FILE ?? './database/dashboard.db'),
  },

  uploads: {
    dir: path.resolve(ROOT, process.env.UPLOAD_DIR ?? './public/uploads'),
    maxBytes: num(process.env.UPLOAD_MAX_BYTES, 20 * 1024 * 1024),
    allowedMime: [
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp',
      'video/mp4',
      'text/plain',
      'application/octet-stream', // .cfg files
    ],
  },

  rate: {
    windowMs: num(process.env.RATE_WINDOW_MS, 60_000),
    max: num(process.env.RATE_MAX_REQUESTS, 240),
    maxAuth: num(process.env.RATE_MAX_AUTH, 10),
    maxPosts: num(process.env.RATE_MAX_POSTS, 12),
  },
};

export default config;
