import { currentUser } from "@/lib/auth";
import * as db from "@/lib/dashboard";
import { downloadAction, publishBuildAction, setBuildStatusAction } from "@/app/actions";
import { ActionButton, ActionForm, ActionSelect } from "@/components/forms";
import { Empty, PageHead, Panel, Status, ago, bytes, date, num } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "builds · gamesense.cloud" };

const STATUSES = ["undetected", "updating", "detected"];

export default async function BuildsPage() {
  const user = (await currentUser())!;
  const admin = user.role === "admin";

  const [builds, current, up, sub, counts] = await Promise.all([
    db.getBuilds(),
    db.getCurrentBuild(),
    db.uptime(),
    db.getSubscription(user.id),
    admin ? db.downloadCounts() : Promise.resolve(new Map<string, number>()),
  ]);

  const blocked = !sub
    ? "you do not have a subscription for this product"
    : sub.status === "expired"
      ? "your subscription has expired"
      : sub.status === "paused"
        ? "your subscription is paused"
        : null;

  return (
    <>
      <PageHead
        title="builds"
        subtitle={`${current?.productName ?? "counter-strike 2"} · ${current?.productMode ?? "internal · d3d11"}${current ? ` · current is ${current.version}` : " · nothing current"}`}
        actions={
          <span className="status active">
            <i className="dot dot-ok" />uptime 30d {up}%
          </span>
        }
      />

      {blocked && (
        <div className="form-error col-12">{blocked} — downloads are unavailable.</div>
      )}

      {admin && (
        <Panel label="publish a build" className="col-12">
          <ActionForm
            action={publishBuildAction}
            submit="publish"
            hint="publishing an undetected build makes it current immediately"
          >
            <div className="line">
              <div style={{ flex: "0 0 170px" }}>
                <label htmlFor="version">version</label>
                <input id="version" name="version" className="field" placeholder="2942" required />
              </div>
              <div>
                <label htmlFor="notes">release notes</label>
                <input id="notes" name="notes" className="field" placeholder="what changed, and what it broke" />
              </div>
            </div>
          </ActionForm>
        </Panel>
      )}

      {builds.length === 0 && (
        <Panel label="builds" className="col-12"><Empty>no builds published yet</Empty></Panel>
      )}

      {builds.map((b) => (
        <Panel
          key={b.id}
          label={b.isCurrent ? `${b.version} · current` : b.version}
          className="col-6"
        >
          <div className="page-head" style={{ marginBottom: "var(--sp-3)" }}>
            <div className="figure">
              <b className="mono">{b.version}</b>
              <span><Status value={b.status} /></span>
            </div>
            <div className="actions">
              {admin && (
                <ActionSelect
                  label={`status of build ${b.version}`}
                  value={b.status}
                  options={STATUSES}
                  run={setBuildStatusAction.bind(null, b.id)}
                />
              )}
              <ActionButton run={downloadAction.bind(null, b.id)} className="btn btn-sm">
                {b.status === "detected" ? "pulled"
                  : b.status === "updating" ? "rebuilding"
                  : blocked ? "unavailable" : "download"}
              </ActionButton>
            </div>
          </div>

          <dl className="metagrid">
            <div><dt>released</dt><dd>{date(b.releasedAt)}</dd></div>
            <div><dt>age</dt><dd>{ago(b.releasedAt)} ago</dd></div>
            <div><dt>size</dt><dd>{bytes(b.byteSize)}</dd></div>
            <div><dt>by</dt><dd>{b.releasedBy ?? "—"}</dd></div>
            {admin && <div><dt>downloads</dt><dd>{num(counts.get(b.id) ?? 0)}</dd></div>}
          </dl>

          {b.notes && (
            <>
              <div className="rule" />
              <div style={{ color: "var(--faint)", fontSize: 11, marginBottom: 8 }}>release notes</div>
              <p style={{ margin: 0, color: "var(--dim)", fontSize: 12, lineHeight: 1.6, whiteSpace: "pre-line" }}>
                {b.notes}
              </p>
            </>
          )}
        </Panel>
      ))}
    </>
  );
}
