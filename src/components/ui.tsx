import type { ReactNode } from "react";

/**
 * The group box — a 1px frame with its label knocked into the top border, the
 * way the loader draws it by hand. Everything on the dashboard is one of these.
 */
export function Panel({
  label,
  flush = false,
  className = "",
  children,
}: {
  label?: string;
  flush?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`gb ${flush ? "flush" : ""} ${className}`}>
      {label && <h2 className="gb-label">{label}</h2>}
      {children}
    </section>
  );
}

export function Meta({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className="meta">
      <dt>{label}</dt>
      <dd className={className}>{children}</dd>
    </div>
  );
}

const DOT: Record<string, string> = {
  undetected: "ok", active: "ok", approved: "ok", closed: "ok", open: "ok",
  updating: "warn", pending: "warn", answered: "warn", paused: "warn",
  detected: "bad", expired: "bad", denied: "bad", banned: "bad",
};

/** Status is never colour alone — the dot and the word always travel together. */
export function Status({ value, label }: { value: string; label?: string }) {
  return (
    <span className={`status ${value}`}>
      <i className={`dot dot-${DOT[value] ?? "idle"}`} />
      {label ?? value}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

export function PageHead({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="page-head col-12">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}

/* ------------------------------------------------------------ formatting -- */
export const num = (n: number | null | undefined) =>
  Number(n ?? 0).toLocaleString("en-us");

export function ago(value?: string | null): string {
  if (!value) return "—";
  const mins = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h`;
  if (mins < 43200) return `${Math.floor(mins / 1440)}d`;
  return `${Math.floor(mins / 43200)}mo`;
}

export function date(value?: string | null): string {
  if (!value) return "—";
  return new Date(value)
    .toLocaleDateString("en-gb", { day: "2-digit", month: "short", year: "numeric" })
    .toLowerCase();
}

/** The loader's status-pane timestamp. */
export function stamp(value?: string | null): string {
  if (!value) return "[--:--:--]";
  return `[${new Date(value).toTimeString().slice(0, 8)}]`;
}

export function bytes(n?: number | null): string {
  if (!n) return "—";
  if (n < 1024) return `${n} b`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} kb`;
  return `${(n / 1024 / 1024).toFixed(1)} mb`;
}

export function planFraction(plan: string, daysLeft: number | null): number {
  const full: Record<string, number | null> = { trial: 3, week: 7, month: 30, lifetime: null };
  const span = full[plan] ?? 30;
  if (span === null || daysLeft === null) return 1;
  return Math.max(0, Math.min(1, daysLeft / span));
}
