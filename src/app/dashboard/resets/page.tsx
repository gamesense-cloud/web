import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import * as db from "@/lib/dashboard";
import { resolveResetAction } from "@/app/actions";
import { ActionButton } from "@/components/forms";
import { Empty, PageHead, Panel, Status, ago, date } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "hwid resets · gamesense.cloud" };

export default async function ResetsPage() {
  const user = (await currentUser())!;
  if (user.role !== "admin") redirect("/dashboard");

  const [pending, approved, denied] = await Promise.all([
    db.resetQueue("pending"),
    db.resetQueue("approved"),
    db.resetQueue("denied"),
  ]);

  const resolved = [...approved, ...denied].sort((a, b) =>
    String(b.requestedAt).localeCompare(String(a.requestedAt))
  );

  return (
    <>
      <PageHead
        title="hwid resets"
        subtitle="approving a reset releases the account's current binding, so the next login binds whatever machine it comes from."
        actions={
          <span className={`status ${pending.length ? "pending" : "active"}`}>
            <i className={`dot dot-${pending.length ? "warn" : "ok"}`} />
            {pending.length} waiting
          </span>
        }
      />

      <Panel label="waiting on review" className="col-12" flush>
        <div className="rows">
          {pending.length === 0 && <Empty>nothing waiting — the queue is clear</Empty>}
          {pending.map((r) => (
            <div key={r.id} className="row is-flagged" style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
              <div>
                <div className="row-x" style={{ justifyContent: "space-between" }}>
                  <Link
                    href={`/dashboard/members/${r.username}`}
                    className="primary strong"
                    style={{ color: "var(--text)" }}
                  >
                    {r.username}
                  </Link>
                  <span className="when">{ago(r.requestedAt)} ago</span>
                </div>
                <div className="sub" style={{ marginTop: 6 }}>{r.reason}</div>
                <div className="sub mono" style={{ marginTop: 4 }}>
                  current binding: {r.hwid ?? "none"}
                </div>
                <div className="row-x" style={{ marginTop: 10, gap: 8 }}>
                  <ActionButton
                    run={resolveResetAction.bind(null, r.id, "approved", null)}
                    className="btn btn-sm"
                  >
                    approve
                  </ActionButton>
                  <ActionButton
                    run={resolveResetAction.bind(null, r.id, "denied", null)}
                    className="btn btn-ghost btn-sm"
                  >
                    deny
                  </ActionButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel label="already resolved" className="col-12" flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>account</th><th>reason</th><th>status</th><th>requested</th></tr>
            </thead>
            <tbody>
              {resolved.length === 0 && (
                <tr><td colSpan={4}><span className="t-dim">nothing resolved yet</span></td></tr>
              )}
              {resolved.map((r) => (
                <tr key={r.id}>
                  <td className="strong">{r.username}</td>
                  <td>{r.reason}</td>
                  <td><Status value={r.status} /></td>
                  <td className="mono">{date(r.requestedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
