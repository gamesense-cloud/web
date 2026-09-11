import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import config, { ROOT } from '../../config/index.js';
import { getDb } from '../../config/database.js';

import { attachUser } from './middleware/auth.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { notFound, errorHandler } from './middleware/error.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import dashboardRoutes from './routes/dashboard.js';
import buildRoutes from './routes/builds.js';
import hwidRoutes from './routes/hwid.js';
import ticketRoutes from './routes/tickets.js';
import adminRoutes from './routes/admin.js';

export function createServer() {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(cors({ origin: config.api.webOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false }));

  // Uploaded files are served as attachments, never inline — an uploaded svg
  // or html file must not be able to run on this origin.
  app.use('/uploads', express.static(config.uploads.dir, {
    index: false,
    dotfiles: 'deny',
    setHeaders: (res) => {
      res.setHeader('Content-Disposition', 'attachment');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  }));

  app.use('/api', apiLimiter, attachUser);

  app.get('/api/health', (_req, res) => {
    const db = getDb();
    res.json({
      ok: true,
      env: config.env,
      accounts: db.prepare('SELECT COUNT(*) AS n FROM users').get().n,
      builds: db.prepare('SELECT COUNT(*) AS n FROM builds').get().n,
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/builds', buildRoutes);
  app.use('/api/hwid', hwidRoutes);
  app.use('/api/tickets', ticketRoutes);
  app.use('/api/admin', adminRoutes);

  // In production the API also serves the built frontend, so one process runs
  // the whole site. In development Vite serves it and proxies /api here.
  const dist = path.join(ROOT, 'dist');
  if (config.isProduction && fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(dist, 'index.html'));
    });
  }

  app.use('/api', notFound);
  app.use(errorHandler);

  return app;
}

const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (invokedDirectly) {
  const app = createServer();
  const server = app.listen(config.api.port, () => {
    console.log(`api listening on http://localhost:${config.api.port}  [${config.env}]`);
    if (!config.isProduction) {
      console.log(`web dev server expected at ${config.api.webOrigin}`);
    }
  });

  // The common startup failure is a stale process from a previous run still
  // holding the port. Say that, rather than throwing a listen stack trace.
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `\nport ${config.api.port} is already in use — something else is on it, ` +
        `usually an api from an earlier run.\n\n` +
        `  windows:  npx kill-port ${config.api.port}\n` +
        `            (or) Get-NetTCPConnection -LocalPort ${config.api.port} | Stop-Process -Id { $_.OwningProcess } -Force\n` +
        `  macos/linux:  lsof -ti:${config.api.port} | xargs kill\n\n` +
        `or set API_PORT in .env to a free port.\n`
      );
    } else {
      console.error(`the api could not start: ${err.message}`);
    }
    process.exit(1);
  });

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => server.close(() => process.exit(0)));
  }
}

export default createServer;
