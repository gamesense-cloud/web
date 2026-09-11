/**
 * The service's own data — the product, its build history, and the
 * announcements on the overview. None of this is per-account; the member's
 * subscription, hwid and activity are generated in seed.js against whichever
 * accounts exist.
 */

export const product = {
  slug: 'cs2',
  name: 'counter-strike 2',
  mode: 'internal · d3d11',
};

/** Newest first. The first row with status 'undetected' becomes current. */
export const builds = [
  {
    version: '2941',
    status: 'undetected',
    minutesAgo: 12,
    bytes: 4_612_096,
    notes:
      'ragebot rewritten rather than patched — the old one still assumed one hitbox pass per tick.\n' +
      'resolver keeps a short per-player history, so it settles in about two shots and does not thrash on jitter.\n' +
      'known: alt-tab can stall the overlay for a frame in borderless. fix queued for 2942.',
  },
  {
    version: '2940',
    status: 'undetected',
    minutesAgo: 2160,
    bytes: 4_598_784,
    notes:
      'shots were queued against the wrong subtick window above 128 tick, which is why community servers felt worse than premier.\n' +
      'timing correction only, no feature changes.',
  },
  {
    version: '2939',
    status: 'undetected',
    minutesAgo: 7200,
    bytes: 4_571_136,
    notes:
      'glow redrawn into the stencil rather than a post-process pass, so it survives smoke and does not bleed at the edges.\n' +
      'outline width is exposed under visuals; default 1.0, the old one was nearer 1.6.',
  },
  {
    version: '2938',
    status: 'detected',
    minutesAgo: 14400,
    bytes: 4_559_872,
    notes:
      'pulled. the faceit client changed what it does to the game process on launch and we were mapping into the middle of it.\n' +
      'do not run a cached copy of this build.',
  },
];

export const announcements = [
  {
    title: 'scheduled maintenance — sunday 02:00 to 04:00 utc',
    level: 'warn',
    minutesAgo: 180,
    body:
      'auth is offline for two hours while the eu box gets a kernel update. already-running sessions keep working, new logins will not.\n' +
      'the loader will say handshake failed rather than something more useful. that is expected and it is not your hwid.',
  },
  {
    title: 'build 2941 is live',
    level: 'info',
    minutesAgo: 12,
    body:
      'ragebot rewrite and a new resolver. download it from the builds page — 2940 keeps working until the next game patch.',
  },
  {
    title: 'one session per machine',
    level: 'info',
    minutesAgo: 43_200,
    body:
      'your hwid binds on first login and it stays bound. resets are one every thirty days and go through the hwid page, not a ticket.',
  },
];

export default { product, builds, announcements };
