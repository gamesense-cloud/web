"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  AuthError,
  changePassword,
  clearSessionCookie,
  login,
  register,
  requireAdmin,
  requireUser,
  setSessionCookie,
} from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import { can } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import * as db from "@/lib/dashboard";

/**
 * Mutations are server actions rather than /api routes: the dashboard is all
 * server components, so a form posts straight to one of these and the page
 * re-renders. The only /api routes left are the ones the loader itself calls.
 */

export type ActionState = { error?: string; ok?: string; fields?: Record<string, string> };

const fail = (e: unknown): ActionState => {
  if (e instanceof AuthError) return { error: e.message, fields: e.errors };
  const message = e instanceof Error ? e.message : "something went wrong";
  return { error: message };
};

async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

// ----------------------------------------------------------------- auth --
export async function signInAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const ip = await clientIp();
    const rl = rateLimit(`login:${ip}`, 5, 60_000);
    if (!rl.ok) {
      return { error: `too many login attempts — try again in ${Math.ceil(rl.retryAfterMs / 1000)}s` };
    }
    const user = await login(
      String(form.get("identifier") ?? ""),
      String(form.get("password") ?? "")
    );
    await setSessionCookie(user.id);
    await db.recordEvent({
      userId: user.id,
      actorId: user.id,
      kind: "session",
      message: "signed in from the web dashboard",
    });
  } catch (e) {
    return fail(e);
  }
  redirect("/dashboard");
}

export async function registerAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const ip = await clientIp();
    const rl = rateLimit(`register:${ip}`, 3, 300_000);
    if (!rl.ok) {
      return { error: `too many registration attempts — try again in ${Math.ceil(rl.retryAfterMs / 1000)}s` };
    }
    const user = await register({
      username: String(form.get("username") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    });
    await setSessionCookie(user.id);
    await db.recordEvent({
      userId: user.id,
      actorId: user.id,
      kind: "account",
      message: "account created",
    });
  } catch (e) {
    return fail(e);
  }
  redirect("/dashboard");
}

export async function signOutAction() {
  await clearSessionCookie();
  redirect("/login");
}

export async function changePasswordAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const ip = await clientIp();
    const rl = rateLimit(`chpw:${user.id}:${ip}`, 5, 300_000);
    if (!rl.ok) {
      return { error: `too many attempts — try again in ${Math.ceil(rl.retryAfterMs / 1000)}s` };
    }
    await changePassword(
      user.id,
      String(form.get("current") ?? ""),
      String(form.get("next") ?? "")
    );
    await db.recordEvent({
      userId: user.id,
      actorId: user.id,
      kind: "account",
      message: "password changed",
    });
    return { ok: "password changed" };
  } catch (e) {
    return fail(e);
  }
}

export async function updateProfileAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const displayName = String(form.get("displayName") ?? "").trim().slice(0, 40);
    const region = String(form.get("region") ?? "").trim().slice(0, 30);

    await supabaseAdmin()
      .from("users")
      .update({ display_name: displayName || null, region: region || "eu-central" })
      .eq("id", user.id);

    revalidatePath("/dashboard/settings");
    return { ok: "profile saved" };
  } catch (e) {
    return fail(e);
  }
}

// --------------------------------------------------------------- builds --
export async function downloadAction(buildId: string): Promise<ActionState> {
  try {
    const user = await requireUser();
    if (!can(user.role, "build.download")) {
      return { error: "your account cannot download builds" };
    }

    const build = await db.getBuild(buildId);
    if (!build) return { error: "no such build" };
    if (build.status !== "undetected") {
      return {
        error:
          build.status === "detected"
            ? "that build is detected and has been pulled"
            : "that build is still rebuilding",
      };
    }

    const sub = await db.getSubscription(user.id);
    if (!sub) return { error: "you do not have a subscription for this product" };
    if (sub.status === "expired") return { error: "your subscription has expired" };
    if (sub.status === "paused") return { error: "your subscription is paused" };

    await db.recordDownload(user.id, build.id, null);
    await db.recordEvent({
      userId: user.id,
      actorId: user.id,
      kind: "download",
      message: `downloaded ${build.productName} build ${build.version}`,
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/builds");
    return { ok: `build ${build.version} recorded — fetch the binary from /api/download` };
  } catch (e) {
    return fail(e);
  }
}

export async function publishBuildAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const version = String(form.get("version") ?? "").trim().slice(0, 20);
    const notes = String(form.get("notes") ?? "").trim().slice(0, 4000);

    if (!/^[a-z0-9.-]{1,20}$/i.test(version)) {
      return { error: "a version is letters, digits, dots and dashes" };
    }

    const build = await db.publishBuild({ version, notes, releasedBy: admin.id });
    if (!build) return { error: `could not publish ${version} — does it already exist?` };

    await db.recordEvent({
      actorId: admin.id,
      kind: "build",
      message: `${build.productName} build ${version} published`,
      scope: "service",
    });

    revalidatePath("/dashboard/builds");
    revalidatePath("/dashboard");
    return { ok: `build ${version} published and made current` };
  } catch (e) {
    return fail(e);
  }
}

export async function setBuildStatusAction(buildId: string, status: string): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    if (!["undetected", "updating", "detected"].includes(status)) {
      return { error: "status is undetected, updating or detected" };
    }

    const before = await db.getBuild(buildId);
    if (!before) return { error: "no such build" };

    await db.setBuildStatus(buildId, status as "undetected" | "updating" | "detected");
    await db.recordEvent({
      actorId: admin.id,
      kind: "build",
      message: `${before.productName} build ${before.version} marked ${status}`,
      scope: "service",
    });

    revalidatePath("/dashboard/builds");
    revalidatePath("/dashboard");
    return { ok: `${before.version} is now ${status}` };
  } catch (e) {
    return fail(e);
  }
}

// ----------------------------------------------------------------- hwid --
export async function requestResetAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const reason = String(form.get("reason") ?? "").trim().slice(0, 400);

    if (await db.pendingReset(user.id)) {
      return { error: "you already have a reset waiting on review" };
    }
    const until = await db.cooldownUntil(user.id);
    if (until) {
      return {
        error: `resets are one every ${db.RESET_COOLDOWN_DAYS} days — your next opens ${until.slice(0, 10)}`,
      };
    }
    if (reason.length < 8) {
      return { error: "say what changed — a new machine, a board swap, a reinstall" };
    }

    await db.requestReset(user.id, reason);
    await db.recordEvent({
      userId: user.id,
      actorId: user.id,
      kind: "hwid",
      message: "hwid reset requested — waiting on review",
    });

    revalidatePath("/dashboard/hwid");
    revalidatePath("/dashboard");
    return { ok: "reset requested — staff will review it" };
  } catch (e) {
    return fail(e);
  }
}

export async function resolveResetAction(
  id: string,
  status: "approved" | "denied",
  note: string | null
): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const result = await db.resolveReset(id, status, admin.id, note);
    if (!result) return { error: "no such pending reset" };

    await db.recordEvent({
      userId: result.userId,
      actorId: admin.id,
      kind: "hwid",
      message:
        status === "approved"
          ? "hwid reset approved — the next login binds a new machine"
          : `hwid reset denied${note ? ` — ${note}` : ""}`,
    });

    revalidatePath("/dashboard/resets");
    revalidatePath("/dashboard");
    return { ok: `reset ${status}` };
  } catch (e) {
    return fail(e);
  }
}

// -------------------------------------------------------------- tickets --
export async function createTicketAction(_: ActionState, form: FormData): Promise<ActionState> {
  const subject = String(form.get("subject") ?? "").trim().slice(0, 140);
  const body = String(form.get("body") ?? "").trim().slice(0, 8000);
  const priority = String(form.get("priority") ?? "normal");
  let ticketId: string | null = null;

  try {
    const user = await requireUser();
    if (subject.length < 6) return { error: "give it a subject" };
    if (body.length < 10) return { error: "say a bit more than that" };

    const ticket = await db.createTicket({
      userId: user.id,
      subject,
      body,
      priority: ["low", "normal", "high"].includes(priority) ? priority : "normal",
    });
    if (!ticket) return { error: "could not open that ticket" };
    ticketId = ticket.id;

    await db.recordEvent({
      userId: user.id,
      actorId: user.id,
      kind: "ticket",
      message: `ticket opened — ${subject}`,
    });
  } catch (e) {
    return fail(e);
  }
  redirect(`/dashboard/tickets/${ticketId}`);
}

export async function replyToTicketAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const user = await requireUser();
    const ticketId = String(form.get("ticketId") ?? "");
    const body = String(form.get("body") ?? "").trim().slice(0, 8000);
    if (body.length < 2) return { error: "write something first" };

    const byAdmin = user.role === "admin";
    const result = await db.replyToTicket({ ticketId, userId: user.id, body, byAdmin });
    if (!result) return { error: "no such ticket" };
    if ("closed" in result) return { error: "that ticket is closed" };

    if (byAdmin && result.ownerId !== user.id) {
      await db.recordEvent({
        userId: result.ownerId,
        actorId: user.id,
        kind: "ticket",
        message: `staff replied to your ticket — ${result.ticket?.subject ?? ""}`,
      });
    }

    revalidatePath(`/dashboard/tickets/${ticketId}`);
    revalidatePath("/dashboard/tickets");
    return { ok: "reply sent" };
  } catch (e) {
    return fail(e);
  }
}

export async function setTicketStatusAction(id: string, status: string): Promise<ActionState> {
  try {
    const user = await requireUser();
    if (!["open", "answered", "closed"].includes(status)) {
      return { error: "status is open, answered or closed" };
    }
    const ticket = await db.getTicket(id, user.role === "admin" ? null : user.id);
    if (!ticket) return { error: "no such ticket" };
    if (user.role !== "admin" && status !== "closed") {
      return { error: "only staff can reopen a ticket" };
    }

    await db.setTicketStatus(id, status);
    revalidatePath(`/dashboard/tickets/${id}`);
    revalidatePath("/dashboard/tickets");
    return { ok: `ticket ${status}` };
  } catch (e) {
    return fail(e);
  }
}

// --------------------------------------------------------------- admin --
export async function grantPlanAction(username: string, plan: string): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    if (!["trial", "week", "month", "lifetime"].includes(plan)) {
      return { error: "a plan is trial, week, month or lifetime" };
    }
    const target = await db.findUserByUsername(username);
    if (!target) return { error: "no such account" };

    await db.grantSubscription(target.id, plan as "trial" | "week" | "month" | "lifetime");
    await db.recordEvent({
      userId: target.id,
      actorId: admin.id,
      kind: "subscription",
      message: `subscription set to the ${plan} plan`,
    });

    revalidatePath(`/dashboard/members/${username}`);
    return { ok: `plan set to ${plan}` };
  } catch (e) {
    return fail(e);
  }
}

export async function setRoleAction(username: string, role: string): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    if (!["member", "admin"].includes(role)) return { error: "no such role" };

    const target = await db.findUserByUsername(username);
    if (!target) return { error: "no such account" };
    if (target.id === admin.id) return { error: "you cannot change your own role" };

    await supabaseAdmin().from("users").update({ role }).eq("id", target.id);
    await db.recordEvent({
      userId: target.id,
      actorId: admin.id,
      kind: "account",
      message: `role changed to ${role}`,
    });

    revalidatePath(`/dashboard/members/${username}`);
    revalidatePath("/dashboard/members");
    return { ok: `role changed to ${role}` };
  } catch (e) {
    return fail(e);
  }
}

export async function toggleBanAction(username: string): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const target = await db.findUserByUsername(username);
    if (!target) return { error: "no such account" };
    if (target.id === admin.id) return { error: "you cannot ban yourself" };

    const banning = !target.banned_at;
    await supabaseAdmin()
      .from("users")
      .update(
        banning
          ? { role: "banned", banned_at: new Date().toISOString(), banned_reason: "banned from the dashboard" }
          : { role: "member", banned_at: null, banned_reason: null }
      )
      .eq("id", target.id);

    await db.recordEvent({
      userId: target.id,
      actorId: admin.id,
      kind: "account",
      message: banning ? "account banned" : "account unbanned",
    });

    revalidatePath(`/dashboard/members/${username}`);
    revalidatePath("/dashboard/members");
    return { ok: banning ? "account banned" : "ban lifted" };
  } catch (e) {
    return fail(e);
  }
}

export async function announceAction(_: ActionState, form: FormData): Promise<ActionState> {
  try {
    const admin = await requireAdmin();
    const title = String(form.get("title") ?? "").trim().slice(0, 140);
    const body = String(form.get("body") ?? "").trim().slice(0, 4000);
    const level = String(form.get("level") ?? "info");

    if (title.length < 4) return { error: "give it a title" };
    if (body.length < 4) return { error: "give it something to say" };

    await db.createAnnouncement({
      title,
      body,
      level: ["info", "warn", "bad"].includes(level) ? level : "info",
      createdBy: admin.id,
    });
    await db.recordEvent({
      actorId: admin.id,
      kind: "announcement",
      message: `announcement posted — ${title}`,
      scope: "service",
    });

    revalidatePath("/dashboard");
    return { ok: "announcement posted" };
  } catch (e) {
    return fail(e);
  }
}
