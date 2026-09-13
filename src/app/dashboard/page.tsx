import Link from "next/link";
import { currentUser } from "@/lib/auth";
import * as db from "@/lib/dashboard";
import { downloadAction } from "@/app/actions";
import { ActionButton } from "@/components/forms";
import AnnounceForm from "./AnnounceForm";
import ActivityChart from "@/components/ActivityChart";
import {
  Empty, Meta, PageHead, Panel, Status,
  ago, bytes, date, num, planFraction, stamp,
} from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "overview · gamesense.cloud" };

export default async function OverviewPage() {
  const user = (await currentUser())!;
  return user.role === "admin" ? <AdminOverview /> : <MemberOverview userId={user.id} name={user.displayName ?? user.username} />;
}

/* ------------------------------------------------------------- member -- */
async function MemberOverview({ userId, name }: { userId: string; name: string }) {
  const [sub, build, up, hwid, pending, cooldown, events, notices, tickets] =
    await Promise.all([
      db.getSubscription(userId),
      db.getCurrentBuild(),
      db.uptime(),
      db.activeHwid(userId),
      db.pendingReset(userId),
      db.cooldownUntil(userId),
      db.eventsForUser(userId, 10),
      db.listAnnouncements(3),
      db.listTickets({ userId, limit: 5 }),
    ]);

  const fraction = sub ? planFraction(sub.plan, sub.daysLeft) : 0;
  const meter = fraction > 0.5 ? "" : fraction > 0.2 ? "is-warn" : "is-bad";
  const expired = sub?.status === "expired";
  const openTickets = tickets.filter((t) => t.status === "open").length;

  return (
    <>
      <PageHead
        title={`welcome back, ${name}`}
        subtitle="everything on your account, and the state of the build you are running."
      />

      <Panel label="your subscription" className="col-4">
        {sub ? (
          <>
            <div className="figure">
              <b className={expired ? "t-bad" : undefined}>
                {sub.daysLeft === null ? "lifetime" : `${sub.daysLeft} days`}
              </b>
              <span>{sub.daysLeft === null ? "never expires" : "remaining"}</span>
            </div>
            {sub.daysLeft !== null && (
              <div className="meter">
                <div className="track">
                  <div className={`fill ${meter}`} style={{ width: `${fraction * 100}%` }} />
                </div>
                <div className="scale">
                  <span>{date(sub.startedAt)}</span>
                  <span>{date(sub.expiresAt)}</span>
                </div>
              </div>
            )}
            <div className="rule" />
            <dl>
              <Meta label="product">{sub.productName}</Meta>
              <Meta label="plan">{sub.plan}</Meta>
              <Meta label="status"><Status value={sub.status} /></Meta>
              <Meta label="mode">{sub.productMode}</Meta>
            </dl>
          </>
        ) : (
          <Empty>no subscription on this account yet</Empty>
        )}
      </Panel>

      <Panel label="build status" className="col-4">
        {build ? (
          <>
            <div className="figure">
              <b className="mono">{build.version}</b>
              <span><Status value={build.status} /></span>
            </div>
            <div className="rule" />
            <dl>
              <Meta label="product">{build.productName}</Meta>
              <Meta label="mode">{build.productMode}</Meta>
              <Meta label="released">{ago(build.releasedAt)} ago</Meta>
              <Meta label="size">{bytes(build.byteSize)}</Meta>
              <Meta label="uptime 30d" className="t-ok">{up}%</Meta>
            </dl>
            <div className="rule" />
            <ActionButton
              run={downloadAction.bind(null, build.id)}
              className="btn"
            >
              {build.status !== "undetected"
                ? "unavailable while rebuilding"
                : expired ? "subscription expired" : `download ${build.version}`}
            </ActionButton>
          </>
        ) : (
          <Empty>no build is current — every build is pulled</Empty>
        )}
      </Panel>

      <Panel label="this machine" className="col-4">
        {hwid ? (
          <>
            <div className="figure">
              <b className="mono" style={{ fontSize: 17 }}>{hwid.hwid}</b>
            </div>
            <div className="rule" />
            <dl>
              <Meta label="label">{hwid.label ?? "—"}</Meta>
              <Meta label="bound">{ago(hwid.boundAt)} ago</Meta>
              <Meta label="reset">
                {pending ? <Status value="pending" label="waiting on review" />
                  : cooldown ? `opens ${cooldown.slice(0, 10)}`
                  : <span className="t-ok">available</span>}
              </Meta>
              <Meta label="open tickets" className={openTickets ? "t-warn" : undefined}>
                {num(openTickets)}
              </Meta>
            </dl>
            <div className="rule" />
            <div className="row-x" style={{ flexWrap: "nowrap" }}>
              <Link href="/dashboard/hwid" className="btn btn-ghost" style={{ flex: 1, textAlign: "center" }}>
                manage hwid
              </Link>
              <Link href="/dashboard/tickets" className="btn btn-ghost" style={{ flex: 1, textAlign: "center" }}>
                tickets
              </Link>
            </div>
          </>
        ) : (
          <Empty>nothing bound — the next loader login binds this machine</Empty>
        )}
      </Panel>

      <Panel label="recent activity" className="col-8" flush>
        <div className="fill">
          <ul className="feed" style={{ flex: 1 }}>
            {events.length === 0 && <Empty>nothing yet</Empty>}
            {events.map((e) => (
              <li key={e.id}>
                <time>{stamp(e.at)}</time>
                <span>{e.message}</span>
              </li>
            ))}
          </ul>
          <div style={{ borderTop: "1px solid var(--border)", padding: "9px var(--sp-3)" }}>
            <Link href="/dashboard/activity" style={{ color: "var(--accent)", fontSize: 12 }}>
              the full log
            </Link>
          </div>
        </div>
      </Panel>

      <Panel label="your tickets" className="col-4" flush>
        <div className="fill">
          <div className="rows" style={{ flex: 1 }}>
            {tickets.length === 0 && <Empty>no tickets</Empty>}
            {tickets.map((t) => (
              <Link
                key={t.id}
                href={`/dashboard/tickets/${t.id}`}
                className={`row is-clickable ${t.status === "open" ? "is-flagged" : ""}`}
                style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}
              >
                <div style={{ minWidth: 0 }}>
                  <div className="primary strong">{t.subject}</div>
                  <div className="sub">{t.messageCount} messages</div>
                </div>
                <Status value={t.status} />
              </Link>
            ))}
          </div>
        </div>
      </Panel>

      <Panel label="announcements" className="col-12">
        {notices.length === 0 && <Empty>nothing announced</Empty>}
        {notices.map((a) => (
          <article key={a.id} className={`notice ${a.level}`}>
            <h3>{a.title}</h3>
            <p>{a.body}</p>
            <span className="when">{ago(a.at)} ago · {a.author ?? "staff"}</span>
          </article>
        ))}
      </Panel>
    </>
  );
}

/* -------------------------------------------------------------- admin -- */
async function AdminOverview() {
  const [stats, build, builds, queue, tickets, expiring, byPlan, events, daily, counts] =
    await Promise.all([
      db.serviceStats(),
      db.getCurrentBuild(),
      db.getBuilds(),
      db.resetQueue("pending"),
      db.listTickets({ status: "open", limit: 5 }),
      db.expiringSoon(14),
      db.subscriptionsByPlan(),
      db.allEvents(12),
      db.eventsPerDay(14),
      db.downloadCounts(),
    ]);

  return (
    <>
      <PageHead
        title="service overview"
        subtitle="accounts, the current build, and anything waiting on you."
      />

      <Panel label="at a glance" className="col-12">
        <dl className="stats">
          <div><dt>accounts</dt><dd>{num(stats.accounts)}</dd></div>
          <div><dt>active subscriptions</dt><dd>{num(stats.activeSubscriptions)}</dd></div>
          <div><dt>online now</dt><dd>{num(stats.onlineNow)}</dd></div>
          <div>
            <dt>open tickets</dt>
            <dd className={stats.openTickets ? "is-alert" : undefined}>{num(stats.openTickets)}</dd>
          </div>
          <div>
            <dt>hwid resets</dt>
            <dd className={stats.pendingResets ? "is-alert" : undefined}>{num(stats.pendingResets)}</dd>
          </div>
          <div><dt>downloads 7d</dt><dd>{num(stats.downloads7d)}</dd></div>
          <div><dt>uptime 30d</dt><dd>{stats.uptime}<small>%</small></dd></div>
        </dl>
      </Panel>

      <Panel label="events per day · last 14 days" className="col-12">
        <ActivityChart data={daily} />
      </Panel>

      <Panel label="current build" className="col-4">
        {build ? (
          <>
            <div className="figure">
              <b className="mono">{build.version}</b>
              <span><Status value={build.status} /></span>
            </div>
            <div className="rule" />
            <dl>
              <Meta label="product">{build.productName}</Meta>
              <Meta label="released">{ago(build.releasedAt)} ago</Meta>
              <Meta label="by">{build.releasedBy ?? "—"}</Meta>
            </dl>
            <div className="rule" />
            <Link href="/dashboard/builds" className="btn btn-ghost" style={{ textAlign: "center" }}>
              manage builds
            </Link>
          </>
        ) : (
          <Empty>no build is current — every build is pulled</Empty>
        )}
      </Panel>

      <Panel label="hwid reset queue" className="col-4" flush>
        <div className="fill">
          <div className="rows" style={{ flex: 1 }}>
            {queue.length === 0 && <Empty>nothing waiting</Empty>}
            {queue.map((r) => (
              <Link
                key={r.id}
                href="/dashboard/resets"
                className="row is-clickable is-flagged"
                style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}
              >
                <div style={{ minWidth: 0 }}>
                  <div className="primary strong">{r.username}</div>
                  <div className="sub">{r.reason}</div>
                </div>
                <div className="when">{ago(r.requestedAt)} ago</div>
              </Link>
            ))}
          </div>
        </div>
      </Panel>

      <Panel label="open tickets" className="col-4" flush>
        <div className="fill">
          <div className="rows" style={{ flex: 1 }}>
            {tickets.length === 0 && <Empty>no open tickets</Empty>}
            {tickets.map((t) => (
              <Link
                key={t.id}
                href={`/dashboard/tickets/${t.id}`}
                className="row is-clickable is-flagged"
                style={{ gridTemplateColumns: "minmax(0,1fr) auto" }}
              >
                <div style={{ minWidth: 0 }}>
                  <div className="primary strong">{t.subject}</div>
                  <div className="sub">{t.username} · {t.messageCount} messages</div>
                </div>
                <div className="when">{ago(t.updatedAt)} ago</div>
              </Link>
            ))}
          </div>
        </div>
      </Panel>

      <Panel label="recent builds" className="col-7" flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>version</th><th>status</th><th>released</th><th className="right">downloads</th></tr>
            </thead>
            <tbody>
              {builds.slice(0, 6).map((b) => (
                <tr key={b.id}>
                  <td className="strong mono">
                    {b.version}
                    {b.isCurrent ? <span className="tag tag-pin" style={{ marginLeft: 8 }}>current</span> : null}
                  </td>
                  <td><Status value={b.status} /></td>
                  <td>{ago(b.releasedAt)} ago</td>
                  <td className="right mono">{num(counts.get(b.id) ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel label="subscriptions" className="col-5">
        <dl className="metagrid">
          {byPlan.length === 0 && <div><dt>plans</dt><dd>none</dd></div>}
          {byPlan.map((p) => (
            <div key={p.plan}><dt>{p.plan}</dt><dd>{num(p.n)}</dd></div>
          ))}
        </dl>
        <div className="rule" />
        <div style={{ color: "var(--faint)", fontSize: 11, marginBottom: 9 }}>
          expiring in the next fortnight
        </div>
        {expiring.length === 0 ? (
          <div style={{ color: "var(--dim)", fontSize: 12 }}>nothing — every plan has room.</div>
        ) : (
          <dl>
            {expiring.map((s) => (
              <Meta key={s.username} label={s.username}>
                {s.daysLeft} days · {date(s.expiresAt)}
              </Meta>
            ))}
          </dl>
        )}
      </Panel>

      <Panel label="announcements" className="col-12">
        <AnnounceForm />
        {(await db.listAnnouncements(5)).map((a) => (
          <article key={a.id} className={`notice ${a.level}`}>
            <h3>{a.title}</h3>
            <p>{a.body}</p>
            <span className="when">{ago(a.at)} ago · {a.author ?? "staff"}</span>
          </article>
        ))}
      </Panel>

      <Panel label="activity" className="col-12" flush>
        <ul className="feed">
          {events.map((e) => (
            <li key={e.id}>
              <time>{stamp(e.at)}</time>
              <span>
                {e.subject && <span className="who">{e.subject} </span>}
                {e.message}
              </span>
            </li>
          ))}
        </ul>
        <div style={{ borderTop: "1px solid var(--border)", padding: "9px var(--sp-3)" }}>
          <Link href="/dashboard/activity" style={{ color: "var(--accent)", fontSize: 12 }}>
            the full log
          </Link>
        </div>
      </Panel>
    </>
  );
}
