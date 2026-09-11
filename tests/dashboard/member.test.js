import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, setupDatabase, teardownDatabase, tokenFor, bearer } from '../helpers.js';

beforeAll(setupDatabase);
afterAll(teardownDatabase);

describe('the member overview', () => {
  it('returns every panel in one call', async () => {
    const token = await tokenFor(request, 'member');
    const res = await request(app).get('/api/dashboard/overview').set(bearer(token));

    expect(res.status).toBe(200);
    expect(res.body.subscription.plan).toBe('month');
    expect(res.body.subscription.daysLeft).toBeGreaterThan(0);
    expect(res.body.currentBuild.status).toBe('undetected');
    expect(res.body.hwid.active.hwid).toBeTruthy();
    expect(res.body.activity.length).toBeGreaterThan(0);
    expect(res.body.announcements.length).toBeGreaterThan(0);
  });

  it('is refused to a guest', async () => {
    const res = await request(app).get('/api/dashboard/overview');
    expect(res.status).toBe(401);
  });
});

describe('builds', () => {
  it('marks only undetected builds downloadable', async () => {
    const token = await tokenFor(request, 'member');
    const res = await request(app).get('/api/builds').set(bearer(token));

    expect(res.status).toBe(200);
    for (const build of res.body.builds) {
      expect(build.downloadable).toBe(build.status === 'undetected');
    }
    expect(res.body.current.isCurrent).toBe(1);
  });

  it('records a download of the current build', async () => {
    const token = await tokenFor(request, 'member');
    const before = await request(app).get('/api/builds/downloads').set(bearer(token));
    const builds = await request(app).get('/api/builds').set(bearer(token));
    const current = builds.body.current;

    const res = await request(app).post(`/api/builds/${current.id}/download`).set(bearer(token));
    expect(res.status).toBe(200);

    const after = await request(app).get('/api/builds/downloads').set(bearer(token));
    expect(after.body.downloads.length).toBe(before.body.downloads.length + 1);
  });

  it('refuses a build that has been pulled', async () => {
    const token = await tokenFor(request, 'member');
    const builds = await request(app).get('/api/builds').set(bearer(token));
    const detected = builds.body.builds.find((b) => b.status === 'detected');

    const res = await request(app).post(`/api/builds/${detected.id}/download`).set(bearer(token));
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/detected/);
  });

  it('does not tell a member how many times a build was downloaded', async () => {
    const token = await tokenFor(request, 'member');
    const res = await request(app).get('/api/builds').set(bearer(token));
    expect(res.body.builds[0].downloadCount).toBeUndefined();
  });
});

describe('hwid', () => {
  it('returns the active binding and its history', async () => {
    const token = await tokenFor(request, 'member');
    const res = await request(app).get('/api/hwid').set(bearer(token));

    expect(res.status).toBe(200);
    expect(res.body.active.hwid).toBe('4F8A-21C7-9E03-DD16');
    expect(res.body.history.length).toBe(2);
    expect(res.body.pending).toBeTruthy(); // the seed leaves one waiting
  });

  it('refuses a second request while one is pending', async () => {
    const token = await tokenFor(request, 'member');
    const res = await request(app)
      .post('/api/hwid/reset').set(bearer(token))
      .send({ reason: 'a completely different machine' });

    expect(res.status).toBe(409);
  });

  it('requires a reason with some substance', async () => {
    const admin = await tokenFor(request, 'admin');
    const res = await request(app)
      .post('/api/hwid/reset').set(bearer(admin)).send({ reason: 'new pc' });

    expect(res.status).toBe(422);
  });

  it('releases the binding when a reset is approved', async () => {
    const admin = await tokenFor(request, 'admin');
    const member = await tokenFor(request, 'member');

    const queue = await request(app).get('/api/admin/resets').set(bearer(admin));
    const pending = queue.body.pending[0];

    const resolved = await request(app)
      .post(`/api/admin/resets/${pending.id}`).set(bearer(admin))
      .send({ status: 'approved' });
    expect(resolved.status).toBe(200);

    const after = await request(app).get('/api/hwid').set(bearer(member));
    expect(after.body.active).toBeNull();
    expect(after.body.cooldownUntil).toBeTruthy(); // the thirty-day window opens
  });

  it('holds the member to the cooldown after an approval', async () => {
    const token = await tokenFor(request, 'member');
    const res = await request(app)
      .post('/api/hwid/reset').set(bearer(token))
      .send({ reason: 'trying again straight away' });

    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/every 30 days/);
  });
});

describe('tickets', () => {
  it('opens one and lists it back', async () => {
    const token = await tokenFor(request, 'member');
    const created = await request(app)
      .post('/api/tickets').set(bearer(token))
      .send({ subject: 'loader closes on launch', body: 'window appears for a frame and is gone.' });

    expect(created.status).toBe(201);
    expect(created.body.ticket.status).toBe('open');

    const list = await request(app).get('/api/tickets').set(bearer(token));
    expect(list.body.tickets.some((t) => t.id === created.body.ticket.id)).toBe(true);
  });

  it('rejects a subject that is too short', async () => {
    const token = await tokenFor(request, 'member');
    const res = await request(app)
      .post('/api/tickets').set(bearer(token))
      .send({ subject: 'help', body: 'a body long enough to pass' });

    expect(res.status).toBe(422);
  });

  it('marks the ticket answered when an admin replies, open when the member does', async () => {
    const member = await tokenFor(request, 'member');
    const admin = await tokenFor(request, 'admin');

    const created = await request(app)
      .post('/api/tickets').set(bearer(member))
      .send({ subject: 'overlay flickers at 240hz', body: 'only with g-sync on.' });
    const id = created.body.ticket.id;

    const answered = await request(app)
      .post(`/api/tickets/${id}/reply`).set(bearer(admin))
      .send({ body: 'post your driver version.' });
    expect(answered.body.ticket.status).toBe('answered');

    const reopened = await request(app)
      .post(`/api/tickets/${id}/reply`).set(bearer(member))
      .send({ body: '566.36.' });
    expect(reopened.body.ticket.status).toBe('open');
  });

  it('keeps one member from reading another account’s ticket', async () => {
    const admin = await tokenFor(request, 'admin');
    const mine = await request(app)
      .post('/api/tickets').set(bearer(await tokenFor(request, 'member')))
      .send({ subject: 'private matter here', body: 'not for anyone else to read.' });

    // a second member account
    await request(app).post('/api/auth/register')
      .send({ username: 'outsider', email: 'outsider@example.com', password: 'a-good-password' });
    const outsider = await tokenFor(request, 'outsider', 'a-good-password');

    const denied = await request(app)
      .get(`/api/tickets/${mine.body.ticket.id}`).set(bearer(outsider));
    expect(denied.status).toBe(404);

    const allowed = await request(app)
      .get(`/api/tickets/${mine.body.ticket.id}`).set(bearer(admin));
    expect(allowed.status).toBe(200);
  });

  it('shows a member only their own tickets, and an admin all of them', async () => {
    const outsider = await tokenFor(request, 'outsider', 'a-good-password');
    const admin = await tokenFor(request, 'admin');

    const theirs = await request(app).get('/api/tickets').set(bearer(outsider));
    expect(theirs.body.tickets).toHaveLength(0);

    const all = await request(app).get('/api/tickets').set(bearer(admin));
    expect(all.body.tickets.length).toBeGreaterThan(0);
  });
});

describe('activity', () => {
  it('gives a member their own rows plus service-wide ones, never another account', async () => {
    const member = await tokenFor(request, 'member');
    const res = await request(app).get('/api/dashboard/activity').set(bearer(member));

    expect(res.body.scope).toBe('me');
    expect(res.body.events.length).toBeGreaterThan(0);
    // nothing in a member's feed is another account's private row
    expect(res.body.events.every((e) => !e.subject || e.subject === 'member')).toBe(true);
  });

  it('will not widen the scope for a member who asks', async () => {
    const member = await tokenFor(request, 'member');
    const res = await request(app).get('/api/dashboard/activity?scope=all').set(bearer(member));
    expect(res.body.scope).toBe('me');
  });
});
