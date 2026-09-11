import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabase";
import type { AccountUser, PublicUser } from "./types";
import type { Role } from "./permissions";

const COOKIE = "gsc_session";
const DAYS = 7;

/**
 * The session is an httpOnly cookie rather than a bearer token in
 * localStorage: server components can read it, and script on the page cannot.
 */
function secret(): Uint8Array {
  const value =
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV === "production" ? "" : "dev-only-secret-change-me");
  if (!value) {
    throw new Error("AUTH_SECRET must be set in production");
  }
  return new TextEncoder().encode(value);
}

export class AuthError extends Error {
  status: number;
  errors?: Record<string, string>;
  constructor(message: string, status = 401, errors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

const USERNAME = /^[a-z0-9_.-]{3,24}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegistration(input: {
  username?: string;
  email?: string;
  password?: string;
}) {
  const errors: Record<string, string> = {};
  if (!USERNAME.test(String(input.username ?? "").toLowerCase())) {
    errors.username =
      "three to twenty-four characters, lowercase letters, digits, . _ -";
  }
  if (!EMAIL.test(String(input.email ?? ""))) {
    errors.email = "that does not look like an email address";
  }
  if (String(input.password ?? "").length < 8) {
    errors.password = "at least eight characters";
  }
  return errors;
}

const PUBLIC_COLUMNS =
  "id, username, role, display_name, region, last_seen_at, banned_at, created_at";

/* eslint-disable @typescript-eslint/no-explicit-any */
function toPublic(row: any): PublicUser {
  return {
    id: row.id,
    username: row.username,
    role: row.role as Role,
    displayName: row.display_name ?? null,
    region: row.region,
    lastSeenAt: row.last_seen_at ?? null,
    bannedAt: row.banned_at ?? null,
    createdAt: row.created_at,
  };
}

export function toAccount(row: any): AccountUser {
  return { ...toPublic(row), email: row.email };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export { toPublic };

// ------------------------------------------------------------- the token --
async function issue(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DAYS}d`)
    .sign(secret());
}

export async function setSessionCookie(userId: string) {
  const jar = await cookies();
  jar.set(COOKIE, await issue(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** The signed-in account, or null. Safe to call from any server component. */
export async function currentUser(): Promise<PublicUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.sub) return null;
    userId = payload.sub;
  } catch {
    return null;
  }

  const db = supabaseAdmin();
  const { data } = await db
    .from("users")
    .select(PUBLIC_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (!data || data.role === "banned") return null;

  // last_seen drives the "online now" figure; a write per request is cheap
  // enough at this scale and keeps it honest.
  await db
    .from("users")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", userId);

  return toPublic(data);
}

/** For route handlers that must have a user. Throws a 401 otherwise. */
export async function requireUser(): Promise<PublicUser> {
  const user = await currentUser();
  if (!user) throw new AuthError("sign in to do that", 401);
  return user;
}

export async function requireAdmin(): Promise<PublicUser> {
  const user = await requireUser();
  if (user.role !== "admin") {
    throw new AuthError("that needs an admin account", 403);
  }
  return user;
}

// ------------------------------------------------------------- passwords --
export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function register(input: {
  username?: string;
  email?: string;
  password?: string;
}) {
  const errors = validateRegistration(input);
  if (Object.keys(errors).length) {
    throw new AuthError("those details did not pass validation", 422, errors);
  }

  const username = String(input.username).toLowerCase();
  const email = String(input.email).toLowerCase();
  const db = supabaseAdmin();

  const { data: clash } = await db
    .from("users")
    .select("username, email")
    .or(`username.eq.${username},email.eq.${email}`)
    .maybeSingle();

  if (clash) {
    throw new AuthError(
      clash.username === username
        ? "that username is taken"
        : "an account already uses that email address",
      409
    );
  }

  const { data, error } = await db
    .from("users")
    .insert({
      username,
      email,
      password_hash: await hashPassword(String(input.password)),
      display_name: username,
    })
    .select(PUBLIC_COLUMNS)
    .single();

  if (error || !data) throw new AuthError("could not create that account", 500);
  return toPublic(data);
}

/**
 * A login against a username that does not exist still runs a bcrypt compare
 * against a dummy hash, so a wrong username and a wrong password take the same
 * time and return the same message.
 */
const DUMMY_HASH =
  "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidiu";

export async function login(identifier?: string, password?: string) {
  const key = String(identifier ?? "").toLowerCase();
  const db = supabaseAdmin();

  const { data: row } = await db
    .from("users")
    .select(`${PUBLIC_COLUMNS}, password_hash`)
    .or(`username.eq.${key},email.eq.${key}`)
    .maybeSingle();

  const ok = await bcrypt.compare(
    String(password ?? ""),
    row?.password_hash ?? DUMMY_HASH
  );

  if (!row || !ok) {
    throw new AuthError("that username and password do not match", 401);
  }
  if (row.role === "banned") {
    throw new AuthError("that account is banned", 403);
  }

  return toPublic(row);
}

export async function changePassword(
  userId: string,
  currentPassword?: string,
  newPassword?: string
) {
  const db = supabaseAdmin();
  const { data: row } = await db
    .from("users")
    .select("password_hash")
    .eq("id", userId)
    .maybeSingle();

  if (!row) throw new AuthError("no such account", 404);
  if (!(await bcrypt.compare(String(currentPassword ?? ""), row.password_hash))) {
    throw new AuthError("your current password is not right", 401);
  }
  if (String(newPassword ?? "").length < 8) {
    throw new AuthError("the new password needs at least eight characters", 422);
  }

  await db
    .from("users")
    .update({ password_hash: await hashPassword(String(newPassword)) })
    .eq("id", userId);
}
