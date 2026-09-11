/** Shared formatting. Kept out of components so every screen agrees. */

export const num = (n) => Number(n ?? 0).toLocaleString('en-us');

const toDate = (value) =>
  new Date(String(value).replace(' ', 'T') + (String(value).endsWith('Z') ? '' : 'Z'));

/** "12m" / "4h" / "3d" / "2mo" — the loader's terse relative time. */
export function ago(value) {
  if (!value) return '—';
  const mins = Math.max(0, Math.round((Date.now() - toDate(value).getTime()) / 60000));
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  if (mins < 43200) return `${Math.floor(mins / 1440)}d`;
  return `${Math.floor(mins / 43200)}mo`;
}

/** "[09:41:02]" — the timestamp shape the loader's status pane uses. */
export function stamp(value) {
  if (!value) return '[--:--:--]';
  return `[${toDate(value).toTimeString().slice(0, 8)}]`;
}

/** "14 mar 2027" */
export function date(value) {
  if (!value) return '—';
  return toDate(value)
    .toLocaleDateString('en-gb', { day: '2-digit', month: 'short', year: 'numeric' })
    .toLowerCase();
}

export function bytes(n) {
  if (!n) return '—';
  if (n < 1024) return `${n} b`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} kb`;
  return `${(n / 1024 / 1024).toFixed(1)} mb`;
}

/** A plan's days remaining, as a share of its full length — drives the meter. */
export function planFraction(plan, daysLeft) {
  const full = { trial: 3, week: 7, month: 30, lifetime: null }[plan] ?? 30;
  if (full === null || daysLeft === null) return 1;
  return Math.max(0, Math.min(1, daysLeft / full));
}

export const groupClass = (role) => `g-${role ?? 'member'}`;
