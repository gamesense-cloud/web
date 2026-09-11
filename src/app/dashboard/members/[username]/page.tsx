import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import * as db from "@/lib/dashboard";
import { grantPlanAction, setRoleAction, toggleBanAction } from "@/app/actions";
import { ActionButton } from "@/components/forms";
import { Empty, Meta, PageHead, Panel, Status, ago, date, num, stamp } from "@/components/ui";

export const dynamic = "force-dynamic";

const PLANS = ["trial", "week", "month", "lifetime"];

export default async function MemberPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const me = (await currentUser())!;
  if (me.role !== "admin") redirect("/dashboard");

  const { username } = await params;
  const target = await db.findUserByUsername(username);
  if (!target) notFound();

  const [sub, history, resets, events] = await Promise.all([
    db.getSubscription(target.id),
    db.hwidHistory(target.id),
    db.resetsFor(target.id),
    db.eventsForUser(target.id, 30),
  ]);

  const isMe = target.id === me.id;

  return (
    <>
      <PageHead
        title={target.username}
        subtitle={`${target.email} · joined ${date(target.created_at)} · ${target.region}`}
        actions={
          <>
            <span className={`tag ${target.role === "admin" ? "tag-pin" : ""}`}>{target.role}</span>
            {target.banned_at && <span className="tag tag-lock">banned</span>}
          </>
        }
      />

      <div className="col-12">
        <Link href="/dashboard/members" style={{ color: "var(--dim)", fontSize: 12 }}>
          ← all accounts
        </Link>
      </div>

      <Panel label="subscription" className="col-6">
        {sub ? (
          <dl>
            <Meta label="product">{sub.productName}</Meta>
            <Meta label="plan">{sub.plan}</Meta>
            <Meta label="status"><Status value={sub.status} /></Meta>
            <Meta label="expires">{sub.expiresAt ? date(sub.expiresAt) : "never"}</Meta>
            <Meta label="remaining">
              {sub.daysLeft === null ? "lifetime" : `${num(sub.daysLeft)} days`}
            </Meta>
          </dl>
        ) : (
          <Empty>no subscription</Empty>
        )}
        <div className="rule" />
        <div className="row-x">
          {PLANS.map((plan) => (
            <ActionButton
              key={plan}
              run={grantPlanAction.bind(null, target.username, plan)}
              className="btn btn-ghost btn-sm"
            >
              {plan}
            </ActionButton>
          ))}
        </div>
      </Panel>

      <Panel label="account actions" className="col-6">
        <dl>
          <Meta label="role">{target.role}</Meta>
          <Meta label="last seen">
            {target.last_seen_at ? `${ago(target.last_seen_at)} ago` : "never"}
          </Meta>
          <Meta label="display name">{target.display_name ?? "—"}</Meta>
        </dl>
        <div className="rule" />
        <div className="stack">
          {isMe ? (
            <span className="t-dim" style={{ fontSize: 12 }}>
              this is your own account — role and ban are disabled here.
            </span>
          ) : (
            <>
              <ActionButton
                run={setRoleAction.bind(
                  null,
                  target.username,
                  target.role === "admin" ? "member" : "admin"
                )}
                className="btn btn-ghost"
              >
                make {target.role === "admin" ? "a member" : "an admin"}
              </ActionButton>
              <ActionButton
                run={toggleBanAction.bind(null, target.username)}
                className="btn btn-ghost"
                confirm={
                  target.banned_at
                    ? `lift the ban on ${target.username}?`
                    : `ban ${target.username}?`
                }
              >
                {target.banned_at ? "lift the ban" : "ban this account"}
              </ActionButton>
            </>
          )}
        </div>
      </Panel>

      <Panel label="hardware" className="col-7" flush>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>hwid</th><th>label</th><th>bound</th><th>released</th></tr></thead>
            <tbody>
              {history.length === 0 && (
                <tr><td colSpan={4}><span className="t-dim">never bound</span></td></tr>
              )}
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="strong mono">{h.hwid}</td>
                  <td>{h.label ?? "—"}</td>
                  <td>{date(h.boundAt)}</td>
                  <td>{h.releasedAt ? date(h.releasedAt) : <span className="t-ok">active</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel label="reset history" className="col-5" flush>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>requested</th><th>reason</th><th>status</th></tr></thead>
            <tbody>
              {resets.length === 0 && (
                <tr><td colSpan={3}><span className="t-dim">no resets</span></td></tr>
              )}
              {resets.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{date(r.requestedAt)}</td>
                  <td className="strong">{r.reason}</td>
                  <td><Status value={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel label="activity" className="col-12" flush>
        <ul className="feed">
          {events.length === 0 && <Empty>nothing recorded</Empty>}
          {events.map((e) => (
            <li key={e.id}>
              <time>{stamp(e.at)}</time>
              <span>{e.message}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
