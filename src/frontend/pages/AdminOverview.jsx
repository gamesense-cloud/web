import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Panel, { Meta, Status, Empty } from '../components/Panel.jsx';
import ActivityChart from '../components/ActivityChart.jsx';
import { api } from '../api.js';
import { ago, date, num, stamp } from '../format.js';

/** What an admin sees on landing: the service, not one account. The figures
 *  lead here because on an ops screen the figures are the point. */
export default function AdminOverview() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = () => api.admin.overview().then(setData).catch((e) => setError(e.message));

  useEffect(() => {
    document.title = 'overview · gamesense.cloud admin';
    load();
  }, []);

  if (error) return <Panel label="overview"><Empty>{error}</Empty></Panel>;
  if (!data) return <div className="loading">loading the service…</div>;

  const { stats, currentBuild, builds, resetQueue, tickets, expiring, byPlan, activity, daily } = data;

  async function resolve(id, status) {
    await api.admin.resolveReset(id, status);
    load();
  }

  return (
    <>
      <div className="page-head col-12">
        <div>
          <h1>service overview</h1>
          <p>accounts, the current build, and anything waiting on you.</p>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/builds')}>
            publish a build
          </button>
        </div>
      </div>

      <Panel label="at a glance" className="col-12">
        <dl className="stats">
          <div><dt>accounts</dt><dd>{num(stats.accounts)}</dd></div>
          <div><dt>active subscriptions</dt><dd>{num(stats.activeSubscriptions)}</dd></div>
          <div><dt>online now</dt><dd>{num(stats.onlineNow)}</dd></div>
          <div>
            <dt>open tickets</dt>
            <dd className={stats.openTickets ? 'is-alert' : undefined}>{num(stats.openTickets)}</dd>
          </div>
          <div>
            <dt>hwid resets</dt>
            <dd className={stats.pendingResets ? 'is-alert' : undefined}>{num(stats.pendingResets)}</dd>
          </div>
          <div><dt>downloads 7d</dt><dd>{num(stats.downloads7d)}</dd></div>
          <div><dt>uptime 30d</dt><dd>{stats.uptime}<small>%</small></dd></div>
        </dl>
      </Panel>

      <Panel label="events per day · last 14 days" className="col-12">
        <ActivityChart data={daily} />
      </Panel>

      {/* three things that need attention, side by side and the same height */}
      <Panel label="current build" className="col-4">
        {currentBuild ? (
          <>
            <div className="figure">
              <b className="mono">{currentBuild.version}</b>
              <span><Status value={currentBuild.status} /></span>
            </div>
            <div className="rule" />
            <dl>
              <Meta label="product">{currentBuild.productName}</Meta>
              <Meta label="mode">{currentBuild.productMode}</Meta>
              <Meta label="released">{ago(currentBuild.releasedAt)} ago</Meta>
              <Meta label="by">{currentBuild.releasedBy ?? '—'}</Meta>
            </dl>
            <div className="rule" />
            <button type="button" className="btn btn-ghost" onClick={() => navigate('/builds')}>
              manage builds
            </button>
          </>
        ) : (
          <Empty>no build is current — every build is pulled</Empty>
        )}
      </Panel>

      <Panel label="hwid reset queue" className="col-4" flush>
        <div className="fill">
          <div className="rows" style={{ flex: 1 }}>
            {resetQueue.length === 0 && <Empty>nothing waiting</Empty>}
            {resetQueue.map((r) => (
              <div key={r.id} className="row is-flagged" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
                <div>
                  <Link to={`/members/${r.username}`} className="primary strong g-member">
                    {r.username}
                  </Link>
                  <div className="sub">{r.reason}</div>
                  <div className="row-x" style={{ marginTop: 9, gap: 6 }}>
                    <button type="button" className="btn btn-sm" onClick={() => resolve(r.id, 'approved')}>
                      approve
                    </button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => resolve(r.id, 'denied')}>
                      deny
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {resetQueue.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border)', padding: '9px var(--sp-3)' }}>
              <Link to="/resets" style={{ color: 'var(--accent)', fontSize: 12 }}>the whole queue</Link>
            </div>
          )}
        </div>
      </Panel>

      <Panel label="open tickets" className="col-4" flush>
        <div className="fill">
          <div className="rows" style={{ flex: 1 }}>
            {tickets.length === 0 && <Empty>no open tickets</Empty>}
            {tickets.map((t) => (
              <Link key={t.id} to={`/tickets/${t.id}`} className="row is-clickable is-flagged"
                    style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
                <div style={{ minWidth: 0 }}>
                  <div className="primary strong">{t.subject}</div>
                  <div className="sub">{t.username} · {t.messageCount} messages</div>
                </div>
                <div className="when">{ago(t.updatedAt)} ago</div>
              </Link>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--border)', padding: '9px var(--sp-3)' }}>
            <Link to="/tickets" style={{ color: 'var(--accent)', fontSize: 12 }}>the whole queue</Link>
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
              {builds.map((b) => (
                <tr key={b.id}>
                  <td className="strong mono">
                    {b.version}
                    {b.isCurrent ? <span className="tag tag-pin" style={{ marginLeft: 8 }}>current</span> : null}
                  </td>
                  <td><Status value={b.status} /></td>
                  <td>{ago(b.releasedAt)} ago</td>
                  <td className="right mono">{num(b.downloadCount ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* plans and expiries together, so neither is a panel holding one line */}
      <Panel label="subscriptions" className="col-5">
        <dl className="metagrid">
          {byPlan.length === 0 && <div><dt>plans</dt><dd>none</dd></div>}
          {byPlan.map((p) => (
            <div key={p.plan}><dt>{p.plan}</dt><dd>{num(p.n)}</dd></div>
          ))}
        </dl>
        <div className="rule" />
        <div style={{ color: 'var(--faint)', fontSize: 11, marginBottom: 9 }}>
          expiring in the next fortnight
        </div>
        {expiring.length === 0 ? (
          <div style={{ color: 'var(--dim)', fontSize: 12 }}>nothing — every plan has room.</div>
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

      <Panel label="activity" className="col-12" flush>
        <ul className="feed">
          {activity.map((e) => (
            <li key={e.id}>
              <time>{stamp(e.at)}</time>
              <span>
                {e.subject && <span className="who">{e.subject} </span>}
                {e.message}
              </span>
            </li>
          ))}
        </ul>
        <div style={{ borderTop: '1px solid var(--border)', padding: '9px var(--sp-3)' }}>
          <Link to="/activity" style={{ color: 'var(--accent)', fontSize: 12 }}>the full log</Link>
        </div>
      </Panel>
    </>
  );
}
