#!/usr/bin/env node
/**
 * Seeds a fresh Supabase project with the two accounts and the service's own
 * data. Run it once, after running supabase/schema.sql in the SQL editor:
 *
 *   npm run db:seed
 *
 * It reads .env.local, so the keys never leave your machine. Running it twice
 * is harmless — it upserts rather than duplicating.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

// .env.local, parsed by hand so this needs no extra dependency
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {
  console.error("could not read .env.local — create it first (see README)");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const PASSWORD = process.env.SEED_PASSWORD ?? "demo-password";
const at = (minutesAgo) => new Date(Date.now() - minutesAgo * 60_000).toISOString();
const days = (n) => at(n * 1440);

const hash = bcrypt.hashSync(PASSWORD, 10);

async function upsertUser(username, role, joinedDaysAgo) {
  const { data: existing } = await db
    .from("users").select("id").ilike("username", username).maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await db
    .from("users")
    .insert({
      username,
      email: `${username}@gamesense.cloud`,
      password_hash: hash,
      role,
      display_name: username,
      created_at: days(joinedDaysAgo),
      last_seen_at: at(5),
    })
    .select("id")
    .single();
  if (error) throw new Error(`${username}: ${error.message}`);
  return data.id;
}

const admin = await upsertUser("admin", "admin", 900);
const member = await upsertUser("member", "member", 96);

// ---------------------------------------------------------------- product --
let { data: product } = await db.from("products").select("id").eq("slug", "cs2").maybeSingle();
if (!product) {
  const { data, error } = await db
    .from("products")
    .insert({ slug: "cs2", name: "counter-strike 2", mode: "internal · d3d11" })
    .select("id").single();
  if (error) throw new Error(`product: ${error.message}`);
  product = data;
}

// ----------------------------------------------------------------- builds --
const BUILDS = [
  ["2941", "undetected", 12,
    "ragebot rewritten rather than patched — the old one still assumed one hitbox pass per tick.\n" +
    "resolver keeps a short per-player history, so it settles in about two shots and does not thrash on jitter.\n" +
    "known: alt-tab can stall the overlay for a frame in borderless. fix queued for 2942."],
  ["2940", "undetected", 2160,
    "shots were queued against the wrong subtick window above 128 tick.\ntiming correction only, no feature changes."],
  ["2939", "undetected", 7200,
    "glow redrawn into the stencil rather than a post-process pass, so it survives smoke."],
  ["2938", "detected", 14400,
    "pulled. the faceit client changed what it does to the game process on launch.\ndo not run a cached copy of this build."],
];

for (const [version, status, minutesAgo, notes] of BUILDS) {
  const { data: exists } = await db
    .from("builds").select("id").eq("product_id", product.id).eq("version", version).maybeSingle();
  if (exists) continue;
  await db.from("builds").insert({
    product_id: product.id,
    version, status, notes,
    byte_size: 4_600_000,
    released_at: at(minutesAgo),
    released_by: admin,
    is_current: false,
  });
}

// exactly one current build: the newest undetected one
await db.from("builds").update({ is_current: false }).eq("is_current", true);
const { data: newest } = await db
  .from("builds").select("id")
  .eq("product_id", product.id).eq("status", "undetected")
  .order("released_at", { ascending: false }).limit(1).maybeSingle();
if (newest) await db.from("builds").update({ is_current: true }).eq("id", newest.id);

// ---------------------------------------------------------- subscriptions --
await db.from("subscriptions").upsert(
  [
    { user_id: member, product_id: product.id, plan: "month", status: "active",
      started_at: days(96), expires_at: days(-41) },
    { user_id: admin, product_id: product.id, plan: "lifetime", status: "active",
      started_at: days(900), expires_at: null },
  ],
  { onConflict: "user_id,product_id" }
);

// ------------------------------------------------------------------ hwid --
const { data: bound } = await db
  .from("hwids").select("id").eq("user_id", member).is("released_at", null).maybeSingle();
if (!bound) {
  await db.from("hwids").insert({
    user_id: member, hwid: "4F8A-21C7-9E03-DD16", label: "desktop", bound_at: days(96),
  });
}

const { data: pending } = await db
  .from("hwid_resets").select("id").eq("user_id", member).eq("status", "pending").maybeSingle();
if (!pending) {
  await db.from("hwid_resets").insert({
    user_id: member,
    reason: "motherboard replaced under warranty, same model",
    status: "pending",
    requested_at: at(220),
  });
}

// --------------------------------------------------------- announcements --
const NOTICES = [
  ["scheduled maintenance — sunday 02:00 to 04:00 utc", "warn", 180,
    "auth is offline for two hours while the eu box gets a kernel update.\nthe loader will say handshake failed. that is expected and it is not your hwid."],
  ["build 2941 is live", "info", 12,
    "ragebot rewrite and a new resolver. 2940 keeps working until the next game patch."],
];
const { count: noticeCount } = await db
  .from("announcements").select("*", { count: "exact", head: true });
if (!noticeCount) {
  for (const [title, level, minutesAgo, body] of NOTICES) {
    await db.from("announcements").insert({
      title, body, level, created_by: admin, created_at: at(minutesAgo),
    });
  }
}

// ---------------------------------------------------------------- events --
const { count: eventCount } = await db.from("events").select("*", { count: "exact", head: true });
if (!eventCount) {
  const rows = [
    [member, "session", "signed in — session bound to this machine", "user", 9],
    [member, "download", "downloaded counter-strike 2 build 2941", "user", 8],
    [member, "hwid", "hwid reset requested — waiting on review", "user", 220],
    [member, "subscription", "subscription renewed — month plan", "user", 4320],
    [null, "build", "counter-strike 2 build 2941 published", "service", 12],
    [null, "build", "counter-strike 2 build 2938 marked detected and pulled", "service", 14400],
    [null, "maintenance", "scheduled maintenance announced for sunday 02:00 utc", "service", 180],
  ];
  for (const [userId, kind, message, scope, minutesAgo] of rows) {
    await db.from("events").insert({
      user_id: userId, actor_id: admin, kind, message, scope, at: at(minutesAgo),
    });
  }
}

// --------------------------------------------------------------- tickets --
const { count: ticketCount } = await db.from("tickets").select("*", { count: "exact", head: true });
if (!ticketCount) {
  const { data: open } = await db
    .from("tickets")
    .insert({
      user_id: member,
      subject: "overlay flickers at 240hz with g-sync on",
      status: "open",
      created_at: at(95),
      updated_at: at(95),
    })
    .select("id").single();
  await db.from("ticket_messages").insert({
    ticket_id: open.id,
    user_id: member,
    body: "external overlay flickers about once a second at 240hz. turning g-sync off stops it.\n\nbuild 2941, windows 11 24h2, nvidia 566.36.",
    created_at: at(95),
  });
}

console.log(`seeded. sign in as  admin  or  member  — password: ${PASSWORD}`);
