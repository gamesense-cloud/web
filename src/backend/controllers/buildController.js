import { getDb } from '../../../config/database.js';
import { asyncHandler } from '../middleware/error.js';
import Build, { isDownloadable } from '../models/Build.js';
import Subscription from '../models/Subscription.js';
import Event from '../models/Event.js';

/** Only an active, unexpired subscription may pull a build. */
function subscriptionBlock(userId) {
  const sub = Subscription.forUser(userId);
  if (!sub) return 'you do not have a subscription for this product';
  if (sub.status === 'expired') return 'your subscription has expired';
  if (sub.status === 'paused') return 'your subscription is paused';
  return null;
}

export const list = asyncHandler(async (req, res) => {
  const builds = Build.all();
  const blocked = subscriptionBlock(req.user.id);

  res.json({
    product: Build.product(),
    current: Build.current(),
    uptime: Build.uptime(),
    subscriptionBlock: blocked,
    builds: builds.map((b) => ({
      ...b,
      downloadable: isDownloadable(b) && !blocked,
      downloadCount: req.user.role === 'admin' ? Build.downloadsOf(b.id) : undefined,
    })),
  });
});

export const show = asyncHandler(async (req, res) => {
  const build = Build.find(Number(req.params.id));
  if (!build) return res.status(404).json({ error: 'no such build' });
  res.json({ build });
});

/**
 * Records the download and hands back a URL. There is no binary here — the
 * loader is not part of this project — so the response says so plainly rather
 * than pretending to serve a file.
 */
export const download = asyncHandler(async (req, res) => {
  const build = Build.find(Number(req.params.id));
  if (!build) return res.status(404).json({ error: 'no such build' });

  if (!isDownloadable(build)) {
    return res.status(409).json({
      error: build.status === 'detected'
        ? 'that build is detected and has been pulled'
        : 'that build is still rebuilding',
    });
  }

  const blocked = subscriptionBlock(req.user.id);
  if (blocked) return res.status(403).json({ error: blocked });

  getDb()
    .prepare('INSERT INTO downloads (user_id, build_id, ip) VALUES (?,?,?)')
    .run(req.user.id, build.id, req.ip);

  Event.record({
    userId: req.user.id,
    actorId: req.user.id,
    kind: 'download',
    message: `downloaded ${build.productName} build ${build.version}`,
  });

  res.json({
    ok: true,
    build: { id: build.id, version: build.version },
    note: 'download recorded — the loader binary is not part of this project',
  });
});

export const downloadsForMe = asyncHandler(async (req, res) => {
  const rows = getDb()
    .prepare(`SELECT d.id, d.at, d.ip, b.version, b.status, p.name AS productName
              FROM downloads d
              JOIN builds b ON b.id = d.build_id
              JOIN products p ON p.id = b.product_id
              WHERE d.user_id = ? ORDER BY d.at DESC LIMIT 50`)
    .all(req.user.id);
  res.json({ downloads: rows });
});

// ------------------------------------------------------------------ admin --
export const publish = asyncHandler(async (req, res) => {
  const version = String(req.body?.version ?? '').trim().slice(0, 20);
  const notes = String(req.body?.notes ?? '').trim().slice(0, 4000);
  if (!/^[a-z0-9.-]{1,20}$/i.test(version)) {
    return res.status(422).json({ error: 'a version is letters, digits, dots and dashes' });
  }

  const product = Build.product();
  const exists = getDb()
    .prepare('SELECT 1 FROM builds WHERE product_id = ? AND version = ?')
    .get(product.id, version);
  if (exists) return res.status(409).json({ error: `build ${version} already exists` });

  const build = Build.publish({
    productId: product.id,
    version,
    notes,
    byteSize: Number(req.body?.byteSize) || 4_600_000,
    releasedBy: req.user.id,
  });

  Event.record({
    actorId: req.user.id,
    kind: 'build',
    message: `${product.name} build ${version} published`,
    scope: 'service',
  });

  res.status(201).json({ build });
});

export const setStatus = asyncHandler(async (req, res) => {
  const status = req.body?.status;
  if (!['undetected', 'updating', 'detected'].includes(status)) {
    return res.status(422).json({ error: 'status is undetected, updating or detected' });
  }

  const build = Build.find(Number(req.params.id));
  if (!build) return res.status(404).json({ error: 'no such build' });

  const updated = Build.setStatus(build.id, status);

  Event.record({
    actorId: req.user.id,
    kind: 'build',
    message: `${build.productName} build ${build.version} marked ${status}`,
    scope: 'service',
  });

  res.json({ build: updated, current: Build.current() });
});

export default { list, show, download, downloadsForMe, publish, setStatus };
