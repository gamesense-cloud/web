/**
 * Roles and the capability matrix the permissions middleware reads.
 *
 * Two roles that do anything: member and admin. Nothing is inherited by rank —
 * every capability lists the roles that hold it explicitly, because "an admin
 * can do everything a member can, plus…" is how permission bugs get written.
 */

export const ROLES = {
  banned: { rank: 0, label: 'banned', color: 'bad' },
  member: { rank: 20, label: 'member', color: 'text' },
  admin: { rank: 100, label: 'admin', color: 'accent' },
};

export const CAPABILITIES = {
  // things a member does to their own account
  'dashboard.view': ['member', 'admin'],
  'build.download': ['member', 'admin'],
  'hwid.reset.request': ['member', 'admin'],
  'ticket.create': ['member', 'admin'],
  'ticket.reply': ['member', 'admin'],
  'account.update': ['member', 'admin'],

  // things only an admin does, to the service or to other accounts
  'admin.view': ['admin'],
  'member.list': ['admin'],
  'member.update': ['admin'],
  'member.ban': ['admin'],
  'subscription.grant': ['admin'],
  'build.publish': ['admin'],
  'build.status.set': ['admin'],
  'hwid.reset.resolve': ['admin'],
  'ticket.close': ['admin'],
  'announcement.create': ['admin'],
};

export function rankOf(role) {
  return ROLES[role]?.rank ?? -1;
}

export function can(role, capability) {
  const allowed = CAPABILITIES[capability];
  if (!allowed) throw new Error(`unknown capability: ${capability}`);
  return allowed.includes(role);
}

export function atLeast(role, minimum) {
  return rankOf(role) >= rankOf(minimum);
}

export const isAdmin = (user) => user?.role === 'admin';

export default { ROLES, CAPABILITIES, can, atLeast, rankOf, isAdmin };
