/**
 * The only two accounts on this install: one of each role, so both sides of
 * the dashboard can be looked at. There is deliberately nobody else.
 *
 * Change a username or the password here and re-run `npm run db:reset`.
 */
export const users = [
  {
    username: 'admin',
    email: 'admin@gamesense.cloud',
    role: 'admin',
    displayName: 'admin',
    region: 'eu-central',
    joinedDaysAgo: 900,
  },
  {
    username: 'member',
    email: 'member@gamesense.cloud',
    role: 'member',
    displayName: 'member',
    region: 'eu-central',
    joinedDaysAgo: 96,
  },
];

/** Both accounts share this. It is a development password, not a secret. */
export const DEV_PASSWORD = 'demo-password';

export default users;
