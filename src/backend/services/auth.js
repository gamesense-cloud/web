import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import config from '../../../config/index.js';
import { getDb } from '../../../config/database.js';
import User from '../models/User.js';

export class AuthError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.status = status;
    this.expose = true;
  }
}

const USERNAME = /^[a-z0-9_.-]{3,24}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegistration({ username, email, password }) {
  const errors = {};
  if (!USERNAME.test(String(username ?? '').toLowerCase())) {
    errors.username = 'three to twenty-four characters, lowercase letters, digits, . _ -';
  }
  if (!EMAIL.test(String(email ?? ''))) errors.email = 'that does not look like an email address';
  if (String(password ?? '').length < 8) errors.password = 'at least eight characters';
  return errors;
}

export function hashPassword(password) {
  return bcrypt.hash(password, config.auth.bcryptRounds);
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    config.auth.jwtSecret,
    { expiresIn: config.auth.jwtExpiresIn }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, config.auth.jwtSecret);
  } catch {
    return null;
  }
}

export async function register({ username, email, password }) {
  const errors = validateRegistration({ username, email, password });
  if (Object.keys(errors).length) {
    const err = new AuthError('those details did not pass validation', 422);
    err.errors = errors;
    throw err;
  }

  const name = String(username).toLowerCase();
  const db = getDb();
  if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(name)) {
    throw new AuthError('that username is taken', 409);
  }
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) {
    throw new AuthError('an account already uses that email address', 409);
  }

  const user = User.create({ username: name, email, passwordHash: await hashPassword(password) });
  return { user, token: signToken(user) };
}

export async function login({ identifier, password, userAgent, ip }) {
  const row = User.findForAuth(String(identifier ?? '').toLowerCase());
  // Compare against a dummy hash when the user is missing, so a wrong username
  // and a wrong password take the same amount of time to answer.
  const hash = row?.password_hash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidiu';
  const ok = await bcrypt.compare(String(password ?? ''), hash);

  if (!row || !ok) throw new AuthError('that username and password do not match', 401);
  if (row.role === 'banned') throw new AuthError('that account is banned', 403);

  const user = User.find(row.id);
  User.touchLastSeen(user.id);
  createSession({ userId: user.id, userAgent, ip });
  return { user, token: signToken(user) };
}

export function createSession({ userId, userAgent, ip }) {
  const id = crypto.randomUUID();
  const days = 7;
  getDb()
    .prepare(`INSERT INTO sessions (id, user_id, user_agent, ip, expires_at)
              VALUES (?,?,?,?, datetime('now', ?))`)
    .run(id, userId, userAgent ?? null, ip ?? null, `+${days} days`);
  return id;
}

export function revokeSessions(userId) {
  getDb().prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
}

export async function changePassword({ userId, currentPassword, newPassword }) {
  const row = getDb().prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!row) throw new AuthError('no such account', 404);
  if (!(await bcrypt.compare(String(currentPassword ?? ''), row.password_hash))) {
    throw new AuthError('your current password is not right', 401);
  }
  if (String(newPassword ?? '').length < 8) {
    throw new AuthError('the new password needs at least eight characters', 422);
  }
  getDb()
    .prepare('UPDATE users SET password_hash = ? WHERE id = ?')
    .run(await hashPassword(newPassword), userId);
  revokeSessions(userId);
  return true;
}

export default { register, login, signToken, verifyToken, changePassword, AuthError };
