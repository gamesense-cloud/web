/**
 * Roles and the capability matrix.
 *
 * Two roles do anything — member and admin — and banned exists so an account
 * can be shut off without deleting the rows that point at it. Nothing is
 * inherited by rank: every capability lists the roles that hold it explicitly,
 * because "an admin can do everything a member can, plus…" is how permission
 * bugs get written.
 */

export type Role = "banned" | "member" | "admin";

export const ROLES: Record<Role, { rank: number; label: string }> = {
  banned: { rank: 0, label: "banned" },
  member: { rank: 20, label: "member" },
  admin: { rank: 100, label: "admin" },
};

export const CAPABILITIES = {
  // things a member does to their own account
  "dashboard.view": ["member", "admin"],
  "build.download": ["member", "admin"],
  "hwid.reset.request": ["member", "admin"],
  "ticket.create": ["member", "admin"],
  "ticket.reply": ["member", "admin"],
  "account.update": ["member", "admin"],

  // things only an admin does, to the service or to other accounts
  "admin.view": ["admin"],
  "member.list": ["admin"],
  "member.update": ["admin"],
  "member.ban": ["admin"],
  "subscription.grant": ["admin"],
  "build.publish": ["admin"],
  "build.status.set": ["admin"],
  "hwid.reset.resolve": ["admin"],
  "ticket.close": ["admin"],
  "announcement.create": ["admin"],
} as const satisfies Record<string, readonly Role[]>;

export type Capability = keyof typeof CAPABILITIES;

export function rankOf(role: string): number {
  return ROLES[role as Role]?.rank ?? -1;
}

export function can(role: string, capability: Capability): boolean {
  return (CAPABILITIES[capability] as readonly string[]).includes(role);
}

export function atLeast(role: string, minimum: Role): boolean {
  return rankOf(role) >= rankOf(minimum);
}

export const isAdmin = (user?: { role: string } | null): boolean =>
  user?.role === "admin";
