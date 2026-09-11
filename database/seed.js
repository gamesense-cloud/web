#!/usr/bin/env node
/**
 * Seed runner —  npm run db:seed
 *
 * Idempotent: it wipes the content tables first, so running it twice gives the
 * same database rather than a doubled one. It does not touch the schema.
 *
 * Exactly two accounts, one of each role, and nobody else. Everything else is
 * the service's own data plus enough activity for the member's panels to have
 * something in them.
 */
import bcrypt from 'bcryptjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../config/index.js';
import { getDb, closeDb } from '../config/database.js';
import { migrate } from './migrate.js';
import roles from './seeds/roles.js';
import users, { DEV_PASSWORD } from './seeds/users.js';
import { product, builds, announcements } from './seeds/service.js';

/** minutes-ago → the 'YYYY-MM-DD HH:MM:SS' SQLite writes by default */
const at = (minutesAgo) =>
  new Date(Date.now() - minutesAgo * 60_000).toISOString().slice(0, 19).replace('T', ' ');
const days = (n) => at(n * 1440);

export function seed({ quiet = false } = {}) {
  const log = quiet ? () => {} : (...a) => console.log(...a);
  migrate({ quiet: true });

  const db = getDb();
  const hash = bcrypt.hashSync(DEV_PASSWORD, Math.min(config.auth.bcryptRounds, 8));

  const run = db.transaction(() => {
    for (const table of [
      'ticket_messages', 'tickets', 'announcements', 'events', 'downloads',
      'hwid_resets', 'hwids', 'subscriptions', 'builds', 'products',
      'sessions', 'users', 'roles',
    ]) db.prepare(`DELETE FROM ${table}`).run();
    db.prepare("DELETE FROM sqlite_sequence WHERE name NOT IN ('migrations')").run();

    // ------------------------------------------------------------ roles --
    const insertRole = db.prepare('INSERT INTO roles (name, rank, label, color) VALUES (?,?,?,?)');
    for (const r of roles) insertRole.run(r.name, r.rank, r.label, r.color);

    // ------------------------------------------------------------ users --
    const insertUser = db.prepare(`
      INSERT INTO users (username, email, password_hash, role, display_name, region,
                         created_at, last_seen_at)
      VALUES (@username, @email, @hash, @role, @displayName, @region, @created, @seen)
    `);
    const id = {};
    users.forEach((u, i) => {
      const info = insertUser.run({
        ...u,
        hash,
        created: days(u.joinedDaysAgo),
        seen: at(i === 0 ? 34 : 3),
      });
      id[u.username] = Number(info.lastInsertRowid);
    });
    const admin = id.admin;
    const member = id.member;

    // ---------------------------------------------------------- product --
    const productId = Number(
      db.prepare('INSERT INTO products (slug, name, mode) VALUES (?,?,?)')
        .run(product.slug, product.name, product.mode).lastInsertRowid
    );

    // ----------------------------------------------------------- builds --
    const insertBuild = db.prepare(`
      INSERT INTO builds (product_id, version, status, notes, is_current, byte_size,
                          released_at, released_by)
      VALUES (?,?,?,?,?,?,?,?)
    `);
    const buildId = {};
    let currentTaken = false;
    for (const b of builds) {
      const isCurrent = !currentTaken && b.status === 'undetected';
      if (isCurrent) currentTaken = true;
      buildId[b.version] = Number(
        insertBuild.run(productId, b.version, b.status, b.notes, isCurrent ? 1 : 0,
          b.bytes, at(b.minutesAgo), admin).lastInsertRowid
      );
    }

    // ---------------------------------------------------- subscriptions --
    const insertSub = db.prepare(`
      INSERT INTO subscriptions (user_id, product_id, plan, status, started_at, expires_at)
      VALUES (?,?,?,?,?,?)
    `);
    insertSub.run(member, productId, 'month', 'active', days(96), days(-41));
    insertSub.run(admin, productId, 'lifetime', 'active', days(900), null);

    // ------------------------------------------------------------- hwid --
    const insertHwid = db.prepare(
      'INSERT INTO hwids (user_id, hwid, label, bound_at, released_at) VALUES (?,?,?,?,?)'
    );
    insertHwid.run(member, '4F8A-21C7-9E03-DD16', 'desktop', days(96), null);
    insertHwid.run(member, 'B217-99C4-01FE-7A3D', 'old laptop', days(240), days(97));
    insertHwid.run(admin, 'D5C1-7740-2B8E-14AA', 'workstation', days(900), null);

    // one pending request, so the admin queue has something to act on
    db.prepare(`INSERT INTO hwid_resets (user_id, reason, status, requested_at)
                VALUES (?,?,?,?)`)
      .run(member, 'motherboard replaced under warranty, same model', 'pending', at(220));

    // -------------------------------------------------------- downloads --
    const insertDownload = db.prepare(
      'INSERT INTO downloads (user_id, build_id, ip, at) VALUES (?,?,?,?)'
    );
    insertDownload.run(member, buildId['2941'], '10.0.0.14', at(8));
    insertDownload.run(member, buildId['2940'], '10.0.0.14', at(2150));
    insertDownload.run(member, buildId['2939'], '10.0.0.14', at(7100));
    insertDownload.run(admin, buildId['2941'], '10.0.0.2', at(11));

    // --------------------------------------------------------- sessions --
    const insertSession = db.prepare(`
      INSERT INTO sessions (id, user_id, user_agent, ip, created_at, expires_at)
      VALUES (?,?,?,?,?, datetime('now','+7 days'))
    `);
    insertSession.run('seed-session-1', member, 'loader/2941 (windows 11 24h2)', '10.0.0.14', at(9));
    insertSession.run('seed-session-2', member, 'mozilla/5.0 (windows nt 10.0)', '10.0.0.14', at(46));
    insertSession.run('seed-session-3', member, 'loader/2940 (windows 11 24h2)', '10.0.0.14', at(2160));
    insertSession.run('seed-session-4', admin, 'mozilla/5.0 (windows nt 10.0)', '10.0.0.2', at(34));

    // ---------------------------------------------------- announcements --
    const insertAnnouncement = db.prepare(`
      INSERT INTO announcements (title, body, level, created_by, created_at) VALUES (?,?,?,?,?)
    `);
    for (const a of announcements) {
      insertAnnouncement.run(a.title, a.body, a.level, admin, at(a.minutesAgo));
    }

    // ----------------------------------------------------------- events --
    const insertEvent = db.prepare(`
      INSERT INTO events (user_id, actor_id, kind, message, scope, at) VALUES (?,?,?,?,?,?)
    `);
    const memberEvents = [
      ['session', 'signed in — session bound to this machine', 9],
      ['download', 'downloaded counter-strike 2 build 2941', 8],
      ['hwid', 'hwid reset requested — waiting on review', 220],
      ['session', 'signed in from the web dashboard', 46],
      ['download', 'downloaded counter-strike 2 build 2940', 2150],
      ['subscription', 'subscription renewed — month plan, 41 days remaining', 4320],
    ];
    for (const [kind, message, mins] of memberEvents) {
      insertEvent.run(member, member, kind, message, 'user', at(mins));
    }

    const serviceEvents = [
      ['build', 'counter-strike 2 build 2941 published', 12],
      ['build', 'counter-strike 2 build 2938 marked detected and pulled', 14400],
      ['maintenance', 'scheduled maintenance announced for sunday 02:00 utc', 180],
      ['build', 'counter-strike 2 build 2940 published', 2160],
    ];
    for (const [kind, message, mins] of serviceEvents) {
      insertEvent.run(null, admin, kind, message, 'service', at(mins));
    }

    // ---------------------------------------------------------- tickets --
    const insertTicket = db.prepare(`
      INSERT INTO tickets (user_id, subject, status, priority, created_at, updated_at)
      VALUES (?,?,?,?,?,?)
    `);
    const insertTicketMessage = db.prepare(
      'INSERT INTO ticket_messages (ticket_id, user_id, body, created_at) VALUES (?,?,?,?)'
    );

    const openTicket = Number(insertTicket.run(
      member, 'hwid does not match after a motherboard swap', 'answered', 'normal',
      at(230), at(205)
    ).lastInsertRowid);
    insertTicketMessage.run(openTicket, member,
      'swapped a dead board for the same model and the loader says the hwid does not match. same drives, same cpu.',
      at(230));
    insertTicketMessage.run(openTicket, admin,
      'the board is part of the hash, so a swap reads as a new machine even when the model is identical.\n\n' +
      'i have queued your reset — it is on the hwid page, you will see it flip to approved.',
      at(205));

    // left open on purpose, so the admin queue has something waiting on it
    const waitingTicket = Number(insertTicket.run(
      member, 'overlay flickers at 240hz with g-sync on', 'open', 'normal',
      at(95), at(95)
    ).lastInsertRowid);
    insertTicketMessage.run(waitingTicket, member,
      'external overlay flickers about once a second at 240hz. turning g-sync off stops it completely, and 165hz is fine either way.\n\n' +
      'build 2941, windows 11 24h2, nvidia 566.36.',
      at(95));

    const closedTicket = Number(insertTicket.run(
      member, 'does stream proof survive obs game capture?', 'closed', 'low',
      at(4400), at(4380)
    ).lastInsertRowid);
    insertTicketMessage.run(closedTicket, member,
      'would rather not find out the hard way on a stream with viewers on it.', at(4400));
    insertTicketMessage.run(closedTicket, admin,
      'game capture and display capture both come back clean. window capture pointed at the game window is the one that is not covered.',
      at(4380));

    log(`seeded ${users.length} accounts (${users.map((u) => `${u.username}/${u.role}`).join(', ')})`);
    log(`        1 product · ${builds.length} builds · ${announcements.length} announcements · 3 tickets`);
  });

  run();
  return true;
}

const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedDirectly) {
  seed();
  console.log(`\nsign in as  admin  or  member  — password: ${DEV_PASSWORD}`);
  closeDb();
}

export default seed;
