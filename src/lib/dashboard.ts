import { supabaseAdmin } from "./supabase";
import type {
  ActivityEvent,
  Announcement,
  Build,
  BuildStatus,
  Hwid,
  HwidReset,
  LoaderSession,
  Plan,
  Product,
  Subscription,
  Ticket,
  TicketMessage,
} from "./types";
import type { Role } from "./permissions";

/* eslint-disable @typescript-eslint/no-explicit-any */

export const RESET_COOLDOWN_DAYS = 30;

/** Usernames for a set of ids, in one round trip. */
async function usernames(ids: (string | null | undefined)[]) {
  const wanted = [...new Set(ids.filter(Boolean) as string[])];
  if (!wanted.length) return new Map<string, string>();
  const db = supabaseAdmin();
  const { data } = await db.from("users").select("id, username").in("id", wanted);
  return new Map((data ?? []).map((u: any) => [u.id, u.username as string]));
}

export function daysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

// -------------------------------------------------------------- product --
export async function getProduct(): Promise<Product | null> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("products")
    .select("id, slug, name, mode")
    .order("created_at")
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

// --------------------------------------------------------------- builds --
function toBuild(row: any, product: Product | null, by: Map<string, string>): Build {
  return {
    id: row.id,
    version: row.version,
    status: row.status,
    notes: row.notes ?? "",
    byteSize: Number(row.byte_size ?? 0),
    isCurrent: Boolean(row.is_current),
    releasedAt: row.released_at,
    releasedBy: row.released_by ? by.get(row.released_by) ?? null : null,
    productName: product?.name ?? "counter-strike 2",
    productMode: product?.mode ?? "internal · d3d11",
  };
}

export async function getBuilds(): Promise<Build[]> {
  const db = supabaseAdmin();
  const [product, { data }] = await Promise.all([
    getProduct(),
    db.from("builds").select("*").order("released_at", { ascending: false }),
  ]);
  const by = await usernames((data ?? []).map((b: any) => b.released_by));
  return (data ?? []).map((b: any) => toBuild(b, product, by));
}

export async function getCurrentBuild(): Promise<Build | null> {
  const db = supabaseAdmin();
  const [product, { data }] = await Promise.all([
    getProduct(),
    db.from("builds").select("*").eq("is_current", true).maybeSingle(),
  ]);
  if (!data) return null;
  const by = await usernames([data.released_by]);
  return toBuild(data, product, by);
}

export async function getBuild(id: string): Promise<Build | null> {
  const db = supabaseAdmin();
  const [product, { data }] = await Promise.all([
    getProduct(),
    db.from("builds").select("*").eq("id", id).maybeSingle(),
  ]);
  if (!data) return null;
  const by = await usernames([data.released_by]);
  return toBuild(data, product, by);
}

/**
 * Exactly one build is current. The unique partial index enforces it, so the
 * old one has to be cleared before the new one is set.
 */
async function makeCurrent(id: string) {
  const db = supabaseAdmin();
  await db.from("builds").update({ is_current: false }).eq("is_current", true);
  await db.from("builds").update({ is_current: true }).eq("id", id);
}

export async function publishBuild(input: {
  version: string;
  notes: string;
  byteSize?: number;
  releasedBy: string;
}): Promise<Build | null> {
  const db = supabaseAdmin();
  const product = await getProduct();
  if (!product) return null;

  const { data, error } = await db
    .from("builds")
    .insert({
      product_id: product.id,
      version: input.version,
      notes: input.notes,
      byte_size: input.byteSize ?? 4_600_000,
      released_by: input.releasedBy,
      is_current: false,
    })
    .select("*")
    .single();

  if (error || !data) return null;
  await makeCurrent(data.id);
  return getBuild(data.id);
}

/**
 * Pulling the current build promotes the newest undetected one behind it, so
 * the service never points at a build that has been marked detected.
 */
export async function setBuildStatus(id: string, status: BuildStatus) {
  const db = supabaseAdmin();
  const before = await getBuild(id);
  if (!before) return null;

  await db.from("builds").update({ status }).eq("id", id);

  if (status !== "undetected" && before.isCurrent) {
    await db.from("builds").update({ is_current: false }).eq("id", id);
    const { data: next } = await db
      .from("builds")
      .select("id")
      .eq("status", "undetected")
      .neq("id", id)
      .order("released_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (next) await makeCurrent(next.id);
  }

  if (status === "undetected") {
    const { data: anyCurrent } = await db
      .from("builds")
      .select("id")
      .eq("is_current", true)
      .maybeSingle();
    if (!anyCurrent) await makeCurrent(id);
  }

  return getBuild(id);
}

/** 30-day uptime: the share of days with no detected build. */
export async function uptime(): Promise<string> {
  const db = supabaseAdmin();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { count } = await db
    .from("builds")
    .select("*", { count: "exact", head: true })
    .eq("status", "detected")
    .gte("released_at", since);
  return Math.max(0, 100 - (count ?? 0) * 0.8).toFixed(1);
}

export async function downloadCounts(): Promise<Map<string, number>> {
  const db = supabaseAdmin();
  const { data } = await db.from("downloads").select("build_id");
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.build_id, (counts.get(row.build_id) ?? 0) + 1);
  }
  return counts;
}

// -------------------------------------------------------- subscriptions --
export async function getSubscription(userId: string): Promise<Subscription | null> {
  const db = supabaseAdmin();
  const [product, { data }] = await Promise.all([
    getProduct(),
    db.from("subscriptions").select("*").eq("user_id", userId).maybeSingle(),
  ]);
  if (!data) return null;

  const left = daysLeft(data.expires_at);
  const expired = left === 0 && data.expires_at !== null;
  return {
    id: data.id,
    plan: data.plan,
    status: expired ? "expired" : data.status,
    startedAt: data.started_at,
    expiresAt: data.expires_at,
    daysLeft: left,
    productName: product?.name ?? "counter-strike 2",
    productMode: product?.mode ?? "internal · d3d11",
  };
}

export async function grantSubscription(userId: string, plan: Plan) {
  const db = supabaseAdmin();
  const product = await getProduct();
  if (!product) return null;

  const days = { trial: 3, week: 7, month: 30, lifetime: null }[plan];
  const expiresAt = days
    ? new Date(Date.now() + days * 86_400_000).toISOString()
    : null;

  await db.from("subscriptions").upsert(
    {
      user_id: userId,
      product_id: product.id,
      plan,
      status: "active",
      expires_at: expiresAt,
    },
    { onConflict: "user_id,product_id" }
  );
  return getSubscription(userId);
}

export async function activeSubscriptionCount(): Promise<number> {
  const db = supabaseAdmin();
  const now = new Date().toISOString();
  const [{ count: lifetime }, { count: timed }] = await Promise.all([
    db.from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .is("expires_at", null),
    db.from("subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .gt("expires_at", now),
  ]);
  return (lifetime ?? 0) + (timed ?? 0);
}

export async function expiringSoon(days = 14) {
  const db = supabaseAdmin();
  const now = new Date().toISOString();
  const until = new Date(Date.now() + days * 86_400_000).toISOString();
  const { data } = await db
    .from("subscriptions")
    .select("user_id, plan, expires_at")
    .eq("status", "active")
    .not("expires_at", "is", null)
    .gte("expires_at", now)
    .lte("expires_at", until)
    .order("expires_at");

  const names = await usernames((data ?? []).map((s: any) => s.user_id));
  return (data ?? []).map((s: any) => ({
    username: names.get(s.user_id) ?? "?",
    plan: s.plan as Plan,
    expiresAt: s.expires_at as string,
    daysLeft: daysLeft(s.expires_at) ?? 0,
  }));
}

export async function subscriptionsByPlan() {
  const db = supabaseAdmin();
  const { data } = await db
    .from("subscriptions")
    .select("plan")
    .eq("status", "active");
  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.plan, (counts.get(row.plan) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([plan, n]) => ({ plan, n }))
    .sort((a, b) => b.n - a.n);
}

// ----------------------------------------------------------------- hwid --
export async function activeHwid(userId: string): Promise<Hwid | null> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("hwids")
    .select("*")
    .eq("user_id", userId)
    .is("released_at", null)
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id,
    hwid: data.hwid,
    label: data.label,
    boundAt: data.bound_at,
    releasedAt: null,
  };
}

export async function hwidHistory(userId: string): Promise<Hwid[]> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("hwids")
    .select("*")
    .eq("user_id", userId)
    .order("bound_at", { ascending: false });
  return (data ?? []).map((h: any) => ({
    id: h.id,
    hwid: h.hwid,
    label: h.label,
    boundAt: h.bound_at,
    releasedAt: h.released_at,
  }));
}

function toReset(row: any, resolvedBy?: string | null): HwidReset {
  return {
    id: row.id,
    reason: row.reason,
    status: row.status,
    requestedAt: row.requested_at,
    resolvedAt: row.resolved_at,
    resolvedBy: resolvedBy ?? null,
    note: row.note,
  };
}

export async function resetsFor(userId: string): Promise<HwidReset[]> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("hwid_resets")
    .select("*")
    .eq("user_id", userId)
    .order("requested_at", { ascending: false });
  const by = await usernames((data ?? []).map((r: any) => r.resolved_by));
  return (data ?? []).map((r: any) => toReset(r, r.resolved_by ? by.get(r.resolved_by) : null));
}

export async function pendingReset(userId: string): Promise<HwidReset | null> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("hwid_resets")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "pending")
    .maybeSingle();
  return data ? toReset(data) : null;
}

/** When the next reset opens: 30 days after the last approved one. */
export async function cooldownUntil(userId: string): Promise<string | null> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("hwid_resets")
    .select("resolved_at")
    .eq("user_id", userId)
    .eq("status", "approved")
    .order("resolved_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.resolved_at) return null;
  const until = new Date(data.resolved_at).getTime() + RESET_COOLDOWN_DAYS * 86_400_000;
  return until > Date.now() ? new Date(until).toISOString() : null;
}

export async function requestReset(userId: string, reason: string) {
  const db = supabaseAdmin();
  const { data } = await db
    .from("hwid_resets")
    .insert({ user_id: userId, reason })
    .select("*")
    .single();
  return data ? toReset(data) : null;
}

export async function resetQueue(status: string): Promise<HwidReset[]> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("hwid_resets")
    .select("*")
    .eq("status", status)
    .order("requested_at");

  const ids = (data ?? []).map((r: any) => r.user_id);
  const names = await usernames(ids);

  const { data: bindings } = await db
    .from("hwids")
    .select("user_id, hwid")
    .in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"])
    .is("released_at", null);
  const bound = new Map((bindings ?? []).map((h: any) => [h.user_id, h.hwid]));

  return (data ?? []).map((r: any) => ({
    ...toReset(r),
    userId: r.user_id,
    username: names.get(r.user_id) ?? "?",
    hwid: bound.get(r.user_id) ?? null,
  }));
}

export async function pendingResetCount(): Promise<number> {
  const db = supabaseAdmin();
  const { count } = await db
    .from("hwid_resets")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  return count ?? 0;
}

/** Approving releases the current binding, so the next login rebinds. */
export async function resolveReset(
  id: string,
  status: "approved" | "denied",
  adminId: string,
  note: string | null
) {
  const db = supabaseAdmin();
  const { data: row } = await db
    .from("hwid_resets")
    .select("*")
    .eq("id", id)
    .eq("status", "pending")
    .maybeSingle();
  if (!row) return null;

  await db
    .from("hwid_resets")
    .update({
      status,
      resolved_at: new Date().toISOString(),
      resolved_by: adminId,
      note,
    })
    .eq("id", id);

  if (status === "approved") {
    await db
      .from("hwids")
      .update({ released_at: new Date().toISOString() })
      .eq("user_id", row.user_id)
      .is("released_at", null);
  }

  return { userId: row.user_id as string, status };
}

// ------------------------------------------------------------ downloads --
export async function recordDownload(userId: string, buildId: string, ip: string | null) {
  const db = supabaseAdmin();
  await db.from("downloads").insert({ user_id: userId, build_id: buildId, ip });
}

export async function downloadsFor(userId: string) {
  const db = supabaseAdmin();
  const { data } = await db
    .from("downloads")
    .select("id, at, ip, build_id")
    .eq("user_id", userId)
    .order("at", { ascending: false })
    .limit(50);

  const builds = await getBuilds();
  const byId = new Map(builds.map((b) => [b.id, b]));
  return (data ?? []).map((d: any) => ({
    id: d.id,
    at: d.at,
    ip: d.ip,
    version: byId.get(d.build_id)?.version ?? "?",
    status: byId.get(d.build_id)?.status ?? "detected",
  }));
}

export async function downloadsSince(days: number): Promise<number> {
  const db = supabaseAdmin();
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { count } = await db
    .from("downloads")
    .select("*", { count: "exact", head: true })
    .gte("at", since);
  return count ?? 0;
}

// --------------------------------------------------------------- events --
export async function recordEvent(input: {
  userId?: string | null;
  actorId?: string | null;
  kind: string;
  message: string;
  scope?: "user" | "service";
}) {
  const db = supabaseAdmin();
  await db.from("events").insert({
    user_id: input.userId ?? null,
    actor_id: input.actorId ?? null,
    kind: input.kind,
    message: input.message,
    scope: input.scope ?? "user",
  });
}

/** A member's own feed: their rows, plus anything service-wide. */
export async function eventsForUser(userId: string, limit = 20): Promise<ActivityEvent[]> {
  const db = supabaseAdmin();
  const [{ data: own }, { data: service }] = await Promise.all([
    db.from("events")
      .select("id, kind, message, scope, at")
      .eq("user_id", userId)
      .order("at", { ascending: false })
      .limit(limit),
    db.from("events")
      .select("id, kind, message, scope, at")
      .eq("scope", "service")
      .order("at", { ascending: false })
      .limit(limit),
  ]);
  const merged = [...(own ?? []), ...(service ?? [])]
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, limit);
  const seen = new Set<string>();
  return (merged.filter(e => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  })) as ActivityEvent[];
}

/** The admin feed: everything, with the account each row belongs to. */
export async function allEvents(limit = 40): Promise<ActivityEvent[]> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("events")
    .select("id, kind, message, scope, at, user_id")
    .order("at", { ascending: false })
    .limit(limit);
  const names = await usernames((data ?? []).map((e: any) => e.user_id));
  return (data ?? []).map((e: any) => ({
    id: e.id,
    kind: e.kind,
    message: e.message,
    scope: e.scope,
    at: e.at,
    subject: e.user_id ? names.get(e.user_id) ?? null : null,
  }));
}

/** Fourteen days of counts, quiet days included, for the admin chart. */
export async function eventsPerDay(days = 14) {
  const db = supabaseAdmin();
  const { data, error } = await db.rpc("events_per_day", { days });

  if (!error && data) {
    return (data as any[]).map((r) => ({ day: r.day as string, n: Number(r.n) }));
  }

  // the rpc is the fast path; this keeps the chart working without it
  const since = new Date(Date.now() - (days - 1) * 86_400_000);
  since.setHours(0, 0, 0, 0);
  const { data: rows } = await db
    .from("events")
    .select("at")
    .gte("at", since.toISOString());

  const counts = new Map<string, number>();
  for (const row of rows ?? []) {
    const day = String(row.at).slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86_400_000)
      .toISOString()
      .slice(0, 10);
    return { day: d, n: counts.get(d) ?? 0 };
  });
}

// -------------------------------------------------------------- tickets --
function toTicket(row: any, username: string, messageCount: number, lastBody: string | null): Ticket {
  return {
    id: row.id,
    subject: row.subject,
    status: row.status,
    priority: row.priority,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userId: row.user_id,
    username,
    messageCount,
    lastBody,
  };
}

export async function listTickets(options: {
  userId?: string | null;
  status?: string | null;
  limit?: number;
}): Promise<Ticket[]> {
  const db = supabaseAdmin();
  let query = db.from("tickets").select("*");
  if (options.userId) query = query.eq("user_id", options.userId);
  if (options.status) query = query.eq("status", options.status);

  const { data } = await query
    .order("updated_at", { ascending: false })
    .limit(options.limit ?? 50);

  const rows = data ?? [];
  const names = await usernames(rows.map((t: any) => t.user_id));

  const ids = rows.map((t: any) => t.id);
  const { data: messages } = ids.length
    ? await db
        .from("ticket_messages")
        .select("ticket_id, body, created_at")
        .in("ticket_id", ids)
        .order("created_at")
    : { data: [] as any[] };

  const counts = new Map<string, number>();
  const last = new Map<string, string>();
  for (const m of messages ?? []) {
    counts.set(m.ticket_id, (counts.get(m.ticket_id) ?? 0) + 1);
    last.set(m.ticket_id, m.body);
  }

  const out = rows.map((t: any) =>
    toTicket(t, names.get(t.user_id) ?? "?", counts.get(t.id) ?? 0, last.get(t.id) ?? null)
  );
  // open first, then by recency — the queue a person works down
  return out.sort((a, b) => {
    const rank = (s: string) => (s === "open" ? 0 : 1);
    return rank(a.status) - rank(b.status) ||
      b.updatedAt.localeCompare(a.updatedAt);
  });
}

export async function getTicket(id: string, scopeToUser?: string | null) {
  const db = supabaseAdmin();
  const { data } = await db.from("tickets").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  if (scopeToUser && data.user_id !== scopeToUser) return null;

  const names = await usernames([data.user_id]);
  const { data: rows } = await db
    .from("ticket_messages")
    .select("id, body, created_at, user_id")
    .eq("ticket_id", id)
    .order("created_at");

  const authors = await usernames((rows ?? []).map((m: any) => m.user_id));
  const { data: roleRows } = await db
    .from("users")
    .select("id, role")
    .in("id", [...new Set((rows ?? []).map((m: any) => m.user_id))]);
  const roles = new Map((roleRows ?? []).map((u: any) => [u.id, u.role as Role]));

  const messages: TicketMessage[] = (rows ?? []).map((m: any) => ({
    id: m.id,
    body: m.body,
    createdAt: m.created_at,
    author: authors.get(m.user_id) ?? "?",
    authorRole: roles.get(m.user_id) ?? "member",
  }));

  const ticket = toTicket(
    data,
    names.get(data.user_id) ?? "?",
    messages.length,
    messages.at(-1)?.body ?? null
  );
  return { ...ticket, messages };
}

export async function createTicket(input: {
  userId: string;
  subject: string;
  body: string;
  priority: string;
}) {
  const db = supabaseAdmin();
  const { data } = await db
    .from("tickets")
    .insert({
      user_id: input.userId,
      subject: input.subject,
      priority: input.priority,
    })
    .select("*")
    .single();
  if (!data) return null;

  await db
    .from("ticket_messages")
    .insert({ ticket_id: data.id, user_id: input.userId, body: input.body });
  return getTicket(data.id);
}

/**
 * A member replying reopens the ticket; an admin replying marks it answered.
 * Either way it moves back to the top of the queue.
 */
export async function replyToTicket(input: {
  ticketId: string;
  userId: string;
  body: string;
  byAdmin: boolean;
}) {
  const db = supabaseAdmin();
  const { data: ticket } = await db
    .from("tickets")
    .select("*")
    .eq("id", input.ticketId)
    .maybeSingle();
  if (!ticket) return null;
  if (!input.byAdmin && ticket.user_id !== input.userId) return null;
  if (ticket.status === "closed") return { closed: true as const };

  await db
    .from("ticket_messages")
    .insert({ ticket_id: input.ticketId, user_id: input.userId, body: input.body });
  await db
    .from("tickets")
    .update({
      status: input.byAdmin ? "answered" : "open",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.ticketId);

  return { ticket: await getTicket(input.ticketId), ownerId: ticket.user_id as string };
}

export async function setTicketStatus(id: string, status: string) {
  const db = supabaseAdmin();
  await db
    .from("tickets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  return getTicket(id);
}

export async function openTicketCount(): Promise<number> {
  const db = supabaseAdmin();
  const { count } = await db
    .from("tickets")
    .select("*", { count: "exact", head: true })
    .eq("status", "open");
  return count ?? 0;
}

// -------------------------------------------------------- announcements --
export async function listAnnouncements(limit = 20): Promise<Announcement[]> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("announcements")
    .select("id, title, body, level, created_at, created_by")
    .order("created_at", { ascending: false })
    .limit(limit);
  const by = await usernames((data ?? []).map((a: any) => a.created_by));
  return (data ?? []).map((a: any) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    level: a.level,
    at: a.created_at,
    author: a.created_by ? by.get(a.created_by) ?? null : null,
  }));
}

export async function createAnnouncement(input: {
  title: string;
  body: string;
  level: string;
  createdBy: string;
}) {
  const db = supabaseAdmin();
  await db.from("announcements").insert({
    title: input.title,
    body: input.body,
    level: input.level,
    created_by: input.createdBy,
  });
}

// ------------------------------------------------------ loader sessions --
export async function sessionsFor(userId: string, limit = 8): Promise<LoaderSession[]> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("sessions")
    .select("session_id, last_ping")
    .eq("user_id", userId)
    .order("last_ping", { ascending: false })
    .limit(limit);
  return (data ?? []).map((s: any) => ({
    id: s.session_id,
    ip: null,
    userAgent: "loader",
    at: s.last_ping,
  }));
}

// ---------------------------------------------------------------- stats --
export async function serviceStats() {
  const db = supabaseAdmin();
  const [{ count: accounts }, active, openTickets, resets, downloads, up] =
    await Promise.all([
      db.from("users").select("*", { count: "exact", head: true }).neq("role", "banned"),
      activeSubscriptionCount(),
      openTicketCount(),
      pendingResetCount(),
      downloadsSince(7),
      uptime(),
    ]);

  const fifteenMinAgo = new Date(Date.now() - 15 * 60_000).toISOString();
  const { count: online } = await db
    .from("users")
    .select("*", { count: "exact", head: true })
    .gte("last_seen_at", fifteenMinAgo);

  return {
    accounts: accounts ?? 0,
    activeSubscriptions: active,
    onlineNow: online ?? 0,
    openTickets,
    pendingResets: resets,
    downloads7d: downloads,
    uptime: up,
  };
}

export async function listUsers(query = "") {
  const db = supabaseAdmin();
  let q = db
    .from("users")
    .select("id, username, email, role, region, last_seen_at, banned_at, created_at");
  if (query) {
    const escaped = query.replace(/[%_\\]/g, (c) => `\\${c}`);
    q = q.ilike("username", `%${escaped}%`);
  }

  const { data } = await q.order("created_at");
  const rows = data ?? [];
  const ids = rows.map((u: any) => u.id);

  const { data: subs } = ids.length
    ? await db.from("subscriptions").select("user_id, plan, status, expires_at").in("user_id", ids)
    : { data: [] as any[] };
  const { data: binds } = ids.length
    ? await db.from("hwids").select("user_id, hwid").in("user_id", ids).is("released_at", null)
    : { data: [] as any[] };

  const subBy = new Map((subs ?? []).map((s: any) => [s.user_id, s]));
  const hwidBy = new Map((binds ?? []).map((h: any) => [h.user_id, h.hwid]));

  return rows
    .map((u: any) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role as Role,
      region: u.region,
      lastSeenAt: u.last_seen_at,
      bannedAt: u.banned_at,
      createdAt: u.created_at,
      plan: subBy.get(u.id)?.plan ?? null,
      expiresAt: subBy.get(u.id)?.expires_at ?? null,
      hwid: hwidBy.get(u.id) ?? null,
    }))
    .sort((a, b) => Number(b.role === "admin") - Number(a.role === "admin"));
}

export async function findUserByUsername(username: string) {
  const db = supabaseAdmin();
  const { data } = await db
    .from("users")
    .select("id, username, email, role, display_name, region, last_seen_at, banned_at, created_at")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  return data;
}
