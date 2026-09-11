"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/actions";

/** Navigation differs by role — an admin runs a service, a member looks after
 *  an account. Neither sees the other's links. */
const MEMBER = [
  ["/dashboard", "overview"],
  ["/dashboard/builds", "builds"],
  ["/dashboard/hwid", "hwid"],
  ["/dashboard/tickets", "tickets"],
  ["/dashboard/activity", "activity"],
] as const;

const ADMIN = [
  ["/dashboard", "overview"],
  ["/dashboard/builds", "builds"],
  ["/dashboard/members", "members"],
  ["/dashboard/resets", "hwid resets"],
  ["/dashboard/tickets", "tickets"],
  ["/dashboard/activity", "activity"],
] as const;

export default function DashNav({
  username,
  role,
  badges,
}: {
  username: string;
  role: string;
  badges: { tickets: number; resets: number };
}) {
  const pathname = usePathname();
  const links = role === "admin" ? ADMIN : MEMBER;

  const badgeFor = (href: string) =>
    href.endsWith("/tickets") ? badges.tickets
      : href.endsWith("/resets") ? badges.resets
      : 0;

  return (
    <header className="dashnav">
      <div className="rainbow" />
      <div className="dashnav-inner">
        <Link href="/" className="wordmark">
          gamesense<i>.cloud</i>
        </Link>

        <nav className="dashlinks">
          {links.map(([href, label]) => {
            const active =
              href === "/dashboard" ? pathname === href : pathname.startsWith(href);
            const count = badgeFor(href);
            return (
              <Link key={href} href={href} className={active ? "is-active" : undefined}>
                {label}
                {count > 0 && <span className="count">{count}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="right">
          <Link href="/dashboard/settings" className="row-x" style={{ gap: 7 }}>
            <span className={`avatar g-${role}`} aria-hidden="true">
              {username.charAt(0)}
            </span>
            <span>
              <b>{username}</b>{" "}
              <span style={{ color: "var(--faint)", fontSize: 11 }}>{role}</span>
            </span>
          </Link>
          <form action={signOutAction}>
            <button type="submit" className="btn btn-ghost btn-sm">log out</button>
          </form>
        </div>
      </div>
    </header>
  );
}
