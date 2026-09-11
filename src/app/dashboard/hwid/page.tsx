import { currentUser } from "@/lib/auth";
import * as db from "@/lib/dashboard";
import { requestResetAction } from "@/app/actions";
import { ActionForm } from "@/components/forms";
import { Empty, Meta, PageHead, Panel, Status, ago, date } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "hwid · gamesense.cloud" };

export default async function HwidPage() {
  const user = (await currentUser())!;
  const [active, history, resets, pending, cooldown] = await Promise.all([
    db.activeHwid(user.id),
    db.hwidHistory(user.id),
    db.resetsFor(user.id),
    db.pendingReset(user.id),
    db.cooldownUntil(user.id),
  ]);

  return (
    <>
      <PageHead
        title="hardware id"
        subtitle={`one session per machine. your hwid binds on first login and stays bound — a reset is one every ${db.RESET_COOLDOWN_DAYS} days.`}
      />

      <Panel label="bound machine" className="col-5">
        {active ? (
          <>
            <div className="figure">
              <b className="mono" style={{ fontSize: 17 }}>{active.hwid}</b>
            </div>
            <div className="rule" />
            <dl>
              <Meta label="label">{active.label ?? "—"}</Meta>
              <Meta label="bound">{ago(active.boundAt)} ago · {date(active.boundAt)}</Meta>
              <Meta label="reset">
                {pending ? <Status value="pending" label="waiting on review" />
                  : cooldown ? `opens ${cooldown.slice(0, 10)}`
                  : <span className="t-ok">available</span>}
              </Meta>
            </dl>
          </>
        ) : (
          <Empty>nothing bound — the next loader login binds this machine</Empty>
        )}
      </Panel>

      <Panel label="request a reset" className="col-7">
        {pending ? (
          <>
            <p style={{ margin: "0 0 var(--sp-3)", color: "var(--dim)", fontSize: 12, lineHeight: 1.6 }}>
              you have a reset waiting on review. there is nothing else to do —
              it will appear below once staff have looked at it.
            </p>
            <dl className="metagrid">
              <div><dt>requested</dt><dd>{ago(pending.requestedAt)} ago</dd></div>
              <div><dt>status</dt><dd><Status value="pending" /></dd></div>
              <div style={{ gridColumn: "1 / -1" }}>
                <dt>reason</dt>
                <dd style={{ whiteSpace: "normal" }}>{pending.reason}</dd>
              </div>
            </dl>
          </>
        ) : cooldown ? (
          <Empty>
            resets are one every {db.RESET_COOLDOWN_DAYS} days.
            your next one opens {cooldown.slice(0, 10)}.
          </Empty>
        ) : (
          <ActionForm
            action={requestResetAction}
            submit="request reset"
            hint="approving a reset releases the current binding"
          >
            <div>
              <label htmlFor="reason">what changed?</label>
              <textarea
                id="reason"
                name="reason"
                className="field"
                style={{ minHeight: 90 }}
                placeholder="a new machine, a board swap, a reinstall — whatever moved the hwid"
                required
              />
            </div>
          </ActionForm>
        )}
      </Panel>

      <Panel label="reset history" className="col-7" flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>requested</th><th>reason</th><th>status</th><th>resolved</th><th>by</th></tr>
            </thead>
            <tbody>
              {resets.length === 0 && (
                <tr><td colSpan={5}><span className="t-dim">no resets on this account</span></td></tr>
              )}
              {resets.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{date(r.requestedAt)}</td>
                  <td className="strong">{r.reason}</td>
                  <td><Status value={r.status} /></td>
                  <td>{r.resolvedAt ? `${ago(r.resolvedAt)} ago` : "—"}</td>
                  <td>{r.resolvedBy ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel label="binding history" className="col-5" flush>
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
    </>
  );
}
