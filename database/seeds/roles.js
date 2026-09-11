// User groups, in rank order. Mirrors config/permissions.js — that file is the
// authority for what a role may do, this one is what the database stores.
export const roles = [
  { name: 'banned', rank: 0, label: 'banned', color: 'bad' },
  { name: 'member', rank: 20, label: 'member', color: 'text' },
  { name: 'admin', rank: 100, label: 'admin', color: 'accent' },
];

export default roles;
