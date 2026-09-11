import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, setupDatabase, teardownDatabase, tokenFor, bearer, DEV_PASSWORD } from '../helpers.js';

beforeAll(setupDatabase);
afterAll(teardownDatabase);

describe('the seeded install', () => {
  it('has exactly two accounts, one of each role', async () => {
    const token = await tokenFor(request, 'admin');
    const res = await request(app).get('/api/admin/members').set(bearer(token));

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.users.map((u) => u.username).sort()).toEqual(['admin', 'member']);
    expect(res.body.users.map((u) => u.role).sort()).toEqual(['admin', 'member']);
  });
});

describe('registration', () => {
  it('creates an account as a member and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'newcomer', email: 'newcomer@example.com', password: 'a-good-enough-password',
    });

    expect(res.status).toBe(201);
    expect(res.body.user.username).toBe('newcomer');
    expect(res.body.user.role).toBe('member');
    expect(res.body.token).toBeTruthy();
  });

  it('never returns the password hash or email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'quiet', email: 'quiet@example.com', password: 'another-password',
    });
    expect(res.body.user.password_hash).toBeUndefined();
    expect(res.body.user.email).toBeUndefined();
  });

  it('reports every invalid field at once', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'A B', email: 'not-an-email', password: 'short',
    });

    expect(res.status).toBe(422);
    expect(Object.keys(res.body.errors).sort()).toEqual(['email', 'password', 'username']);
  });

  it('refuses a username that is taken, case-insensitively', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'ADMIN', email: 'someone@example.com', password: 'a-good-password',
    });
    expect(res.status).toBe(409);
  });
});

describe('login', () => {
  it('accepts both seeded accounts', async () => {
    for (const name of ['admin', 'member']) {
      const res = await request(app)
        .post('/api/auth/login').send({ identifier: name, password: DEV_PASSWORD });
      expect(res.status).toBe(200);
      expect(res.body.user.username).toBe(name);
    }
  });

  it('gives the same answer for a wrong password and an unknown user', async () => {
    const wrongPassword = await request(app)
      .post('/api/auth/login').send({ identifier: 'member', password: 'nope' });
    const unknownUser = await request(app)
      .post('/api/auth/login').send({ identifier: 'nobody-here', password: 'nope' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    expect(wrongPassword.body.error).toBe(unknownUser.body.error);
  });

  it('refuses a banned account with its own message', async () => {
    const admin = await tokenFor(request, 'admin');
    await request(app).post('/api/auth/register')
      .send({ username: 'trouble', email: 'trouble@example.com', password: 'a-good-password' });
    await request(app).post('/api/admin/members/trouble/ban').set(bearer(admin)).send({});

    const res = await request(app)
      .post('/api/auth/login').send({ identifier: 'trouble', password: 'a-good-password' });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/banned/);
  });
});

describe('session', () => {
  it('returns null for a guest and the account for a token', async () => {
    const guest = await request(app).get('/api/auth/me');
    expect(guest.body.user).toBeNull();

    const token = await tokenFor(request, 'member');
    const signedIn = await request(app).get('/api/auth/me').set(bearer(token));

    expect(signedIn.body.user.username).toBe('member');
    expect(signedIn.body.badges).toHaveProperty('tickets');
    expect(signedIn.body.subscription.plan).toBe('month');
  });

  it('ignores a forged token', async () => {
    const res = await request(app).get('/api/auth/me').set(bearer('not.a.real.token'));
    expect(res.body.user).toBeNull();
  });

  it('changes a password and rejects the old one', async () => {
    await request(app).post('/api/auth/register')
      .send({ username: 'rotator', email: 'rotator@example.com', password: 'first-password' });
    const token = await tokenFor(request, 'rotator', 'first-password');

    const changed = await request(app)
      .post('/api/auth/password').set(bearer(token))
      .send({ currentPassword: 'first-password', newPassword: 'second-password' });
    expect(changed.status).toBe(200);

    const old = await request(app)
      .post('/api/auth/login').send({ identifier: 'rotator', password: 'first-password' });
    expect(old.status).toBe(401);

    const fresh = await request(app)
      .post('/api/auth/login').send({ identifier: 'rotator', password: 'second-password' });
    expect(fresh.status).toBe(200);
  });

  it('refuses a password change without the current password', async () => {
    const token = await tokenFor(request, 'member');
    const res = await request(app)
      .post('/api/auth/password').set(bearer(token))
      .send({ currentPassword: 'guessing', newPassword: 'a-brand-new-password' });

    expect(res.status).toBe(401);
  });
});
