import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, setupDatabase, teardownDatabase, tokenFor, bearer } from '../helpers.js';

beforeAll(setupDatabase);
afterAll(teardownDatabase);

/** Every admin route, walked from a member token. None may answer. */
describe('the admin surface is closed to members', () => {
  const routes = [
    ['get', '/api/admin/overview'],
    ['get', '/api/admin/members'],
    ['get', '/api/admin/members/member'],
    ['get', '/api/admin/resets'],
    ['post', '/api/admin/members/member/role'],
    ['post', '/api/admin/members/member/ban'],
    ['post', '/api/admin/members/member/subscription'],
    ['post', '/api/admin/builds'],
  ];

  it.each(routes)('refuses %s %s', async (method, path) => {
    const token = await tokenFor(request, 'member');
    const res = await request(app)[method](path).set(bearer(token)).send({});
    expect(res.status).toBe(403);
  });

  it('refuses a guest as unauthenticated rather than forbidden', async () => {
    const res = await request(app).get('/api/admin/overview');
    expect(res.status).toBe(401);
  });
});

describe('the admin overview', () => {
  it('counts the service rather than one account', async () => {
    const token = await tokenFor(request, 'admin');
    const res = await request(app).get('/api/admin/overview').set(bearer(token));

    expect(res.status).toBe(200);
    expect(res.body.stats.accounts).toBe(2);
    expect(res.body.stats.activeSubscriptions).toBe(2);
    expect(res.body.stats.pendingResets).toBe(1);
    expect(res.body.daily).toHaveLength(14);
    expect(res.body.resetQueue).toHaveLength(1);
  });

  it('fills every day in the chart series, including quiet ones', async () => {
    const token = await tokenFor(request, 'admin');
    const res = await request(app).get('/api/admin/overview').set(bearer(token));

    const days = res.body.daily.map((d) => d.day);
    expect(new Set(days).size).toBe(14);
    expect(res.body.daily.every((d) => typeof d.n === 'number')).toBe(true);
  });
});

describe('managing builds', () => {
  it('publishes one and makes it current', async () => {
    const token = await tokenFor(request, 'admin');
    const res = await request(app)
      .post('/api/admin/builds').set(bearer(token))
      .send({ version: '2942', notes: 'the alt-tab fix.' });

    expect(res.status).toBe(201);
    expect(res.body.build.isCurrent).toBe(1);

    const builds = await request(app).get('/api/builds').set(bearer(token));
    expect(builds.body.current.version).toBe('2942');
    // exactly one build is current
    expect(builds.body.builds.filter((b) => b.isCurrent).length).toBe(1);
  });

  it('refuses a duplicate version', async () => {
    const token = await tokenFor(request, 'admin');
    const res = await request(app)
      .post('/api/admin/builds').set(bearer(token)).send({ version: '2942' });
    expect(res.status).toBe(409);
  });

  it('validates the version string', async () => {
    const token = await tokenFor(request, 'admin');
    const res = await request(app)
      .post('/api/admin/builds').set(bearer(token)).send({ version: 'drop table builds' });
    expect(res.status).toBe(422);
  });

  /**
   * The one that matters: pulling the build the loader points at must promote
   * the next good one, never leave the service pointing at a detected build.
   */
  it('promotes the next good build when the current one is pulled', async () => {
    const token = await tokenFor(request, 'admin');
    const before = await request(app).get('/api/builds').set(bearer(token));
    const current = before.body.current;

    const res = await request(app)
      .post(`/api/admin/builds/${current.id}/status`).set(bearer(token))
      .send({ status: 'detected' });

    expect(res.status).toBe(200);
    expect(res.body.current).toBeTruthy();
    expect(res.body.current.id).not.toBe(current.id);
    expect(res.body.current.status).toBe('undetected');
  });

  it('rejects a status that is not one of the three', async () => {
    const token = await tokenFor(request, 'admin');
    const res = await request(app)
      .post('/api/admin/builds/1/status').set(bearer(token)).send({ status: 'probably fine' });
    expect(res.status).toBe(422);
  });
});

describe('managing accounts', () => {
  it('grants a subscription and the member sees it', async () => {
    const admin = await tokenFor(request, 'admin');
    await request(app).post('/api/auth/register')
      .send({ username: 'fresh', email: 'fresh@example.com', password: 'a-good-password' });

    const granted = await request(app)
      .post('/api/admin/members/fresh/subscription').set(bearer(admin)).send({ plan: 'week' });
    expect(granted.status).toBe(200);
    expect(granted.body.subscription.plan).toBe('week');

    const theirs = await tokenFor(request, 'fresh', 'a-good-password');
    const overview = await request(app).get('/api/dashboard/overview').set(bearer(theirs));
    expect(overview.body.subscription.plan).toBe('week');
    expect(overview.body.subscription.daysLeft).toBeGreaterThan(0);
  });

  it('refuses a plan that does not exist', async () => {
    const admin = await tokenFor(request, 'admin');
    const res = await request(app)
      .post('/api/admin/members/member/subscription').set(bearer(admin))
      .send({ plan: 'forever-and-ever' });
    expect(res.status).toBe(422);
  });

  it('will not let an admin change their own role or ban themselves', async () => {
    const admin = await tokenFor(request, 'admin');

    const role = await request(app)
      .post('/api/admin/members/admin/role').set(bearer(admin)).send({ role: 'member' });
    expect(role.status).toBe(422);

    const ban = await request(app)
      .post('/api/admin/members/admin/ban').set(bearer(admin)).send({});
    expect(ban.status).toBe(422);
  });

  it('promotes a member to admin, and the new admin can reach the admin surface', async () => {
    const admin = await tokenFor(request, 'admin');
    await request(app).post('/api/auth/register')
      .send({ username: 'deputy', email: 'deputy@example.com', password: 'a-good-password' });

    const before = await request(app)
      .get('/api/admin/overview').set(bearer(await tokenFor(request, 'deputy', 'a-good-password')));
    expect(before.status).toBe(403);

    await request(app)
      .post('/api/admin/members/deputy/role').set(bearer(admin)).send({ role: 'admin' });

    const after = await request(app)
      .get('/api/admin/overview').set(bearer(await tokenFor(request, 'deputy', 'a-good-password')));
    expect(after.status).toBe(200);
  });

  it('sees another account in full, including its hwid history', async () => {
    const admin = await tokenFor(request, 'admin');
    const res = await request(app).get('/api/admin/members/member').set(bearer(admin));

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBeTruthy();
    expect(res.body.hwidHistory.length).toBeGreaterThan(0);
    expect(res.body.activity.length).toBeGreaterThan(0);
  });
});

describe('announcements', () => {
  it('lets an admin post one and a member read it', async () => {
    const admin = await tokenFor(request, 'admin');
    const member = await tokenFor(request, 'member');

    const posted = await request(app)
      .post('/api/dashboard/announcements').set(bearer(admin))
      .send({ title: 'region move on friday', body: 'eu-west comes back online.', level: 'warn' });
    expect(posted.status).toBe(201);

    const seen = await request(app).get('/api/dashboard/announcements').set(bearer(member));
    expect(seen.body.announcements.some((a) => a.title === 'region move on friday')).toBe(true);
  });

  it('refuses one from a member', async () => {
    const member = await tokenFor(request, 'member');
    const res = await request(app)
      .post('/api/dashboard/announcements').set(bearer(member))
      .send({ title: 'from a member', body: 'should not be possible' });
    expect(res.status).toBe(403);
  });
});
