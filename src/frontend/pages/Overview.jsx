import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Panel, { Meta, Status, Empty } from '../components/Panel.jsx';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { ago, bytes, date, num, planFraction, stamp } from '../format.js';

/** Shortens a user agent to the part a person actually reads. */
function client(userAgent = '') {
  const ua = String(userAgent);
  if (ua.startsWith('loader/')) return ua;
  if (/headless/i.test(ua)) return 'web dashboard (headless)';
  if (/chrome/i.test(ua)) return 'web dashboard · chrome';
  if (/firefox/i.test(ua)) return 'web dashboard · firefox';
  return 'web dashboard';
}

/** What a member sees on landing: their subscription, the build, their
 *  machine, and what has happened recently. */
export default function Overview() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [ping, setPing] = useState(24);

  useEffect(() => {
    document.title = 'overview · gamesense.cloud';
    api.overview().then(setData).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    const id = setInterval(() => setPing(21 + Math.floor(Math.random() * 8)), 3200);
    return () => clearInterval(id);
  }, []);

  if (error) return <Panel label="overview"><Empty>{error}</Empty></Panel>;
  if (!data) return <div className="loading">loading your dashboard…</div>;

  const { subscription: sub, currentBuild, hwid, activity, announcements, tickets, sessions } = data;
  const fraction = sub ? planFraction(sub.plan, sub.daysLeft) : 0;
  const meterClass = fraction > 0.5 ? '' : fraction > 0.2 ? 'is-warn' : 'is-bad';
  const expired = sub?.status === 'expired';

  async function download() {
    if (!currentBuild) return;
    try {
      await api.download(currentBuild.id);
      setData(await api.overview());
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="page-head col-12">
        <div>
          <h1>welcome back, {user.displayName ?? user.username}</h1>
          <p>everything on your account, and the state of the build you are running.</p>
        </div>
        <div className="actions">
          <span className="status active"><i className="dot dot-ok" />eu-central · {ping} ms</span>
        </div>
      </div>

      {/* three equal panels — each narrow enough that a label/value pair still
          reads as a pair, and all three end on the same line */}
      <Panel label="your subscription" className="col-4">
        {sub ? (
          <>
            <div className="figure">
              <b className={expired ? 't-bad' : undefined}>
                {sub.daysLeft === null ? 'lifetime' : `${sub.daysLeft} days`}
              </b>
              <span>{sub.daysLeft === null ? 'never expires' : 'remaining'}</span>
            </div>

            {sub.daysLeft !== null && (
              <div className="meter">
                <div className="track">
                  <div className={`fill ${meterClass}`} style={{ width: `${fraction * 100}%` }} />
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
          <Empty>no subscription on this account</Empty>
        )}
      </Panel>

      <Panel label="build status" className="col-4">
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
              <Meta label="size">{bytes(currentBuild.byteSize)}</Meta>
              <Meta label="uptime 30d" className="t-ok">{data.uptime}%</Meta>
            </dl>
            <div className="rule" />
            <button
              type="button"
              className="btn"
              onClick={download}
              disabled={currentBuild.status !== 'undetected' || expired}
            >
              {currentBuild.status !== 'undetected'
                ? 'unavailable while rebuilding'
                : expired ? 'subscription expired' : `download ${currentBuild.version}`}
            </button>
          </>
        ) : (
          <Empty>no build is current — every build is pulled</Empty>
        )}
      </Panel>

      <Panel label="this machine" className="col-4">
        {hwid.active ? (
          <>
            <div className="figure">
              <b className="mono" style={{ fontSize: 17 }}>{hwid.active.hwid}</b>
            </div>
            <div className="rule" />
            <dl>
              <Meta label="label">{hwid.active.label ?? '—'}</Meta>
              <Meta label="bound">{ago(hwid.active.boundAt)} ago</Meta>
              <Meta label="reset">
                {hwid.pendingReset
                  ? <Status value="pending" label="waiting on review" />
                  : hwid.cooldownUntil
                    ? `opens ${hwid.cooldownUntil.slice(0, 10)}`
                    : <span className="t-ok">available</span>}
              </Meta>
              <Meta label="open tickets" className={tickets.open ? 't-warn' : undefined}>
                {num(tickets.open)}
              </Meta>
            </dl>
            <div className="rule" />
            <div className="row-x" style={{ flexWrap: 'nowrap' }}>
              <button type="button" className="btn btn-ghost" style={{ flex: 1 }}
                      onClick={() => navigate('/hwid')}>
                manage hwid
              </button>
              <button type="button" className="btn btn-ghost" style={{ flex: 1 }}
                      onClick={() => navigate('/tickets')}>
                tickets
              </button>
            </div>
          </>
        ) : (
          <Empty>nothing bound — the next login binds this machine</Empty>
        )}
      </Panel>

      {/* the log fills the height the sessions column sets, rather than
          leaving a hole beside it */}
      <Panel label="recent activity" className="col-8" flush>
        <div className="fill">
          <ul className="feed is-scroll">
            {activity.length === 0 && <Empty>nothing yet</Empty>}
            {activity.map((e) => (
              <li key={e.id}>
                <time>{stamp(e.at)}</time>
                <span>{e.message}</span>
              </li>
            ))}
          </ul>
          <div style={{ borderTop: '1px solid var(--border)', padding: '9px var(--sp-3)' }}>
            <Link to="/activity" style={{ color: 'var(--accent)', fontSize: 12 }}>the full log</Link>
          </div>
        </div>
      </Panel>

      <Panel label="recent sessions" className="col-4" flush>
        <div className="fill">
          <div className="rows" style={{ flex: 1 }}>
            {sessions.length === 0 && <Empty>no sessions recorded</Empty>}
            {sessions.map((s) => (
              <div key={s.id} className="row" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
                <div style={{ minWidth: 0 }}>
                  <div className="primary" style={{ overflow: 'hidden', textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap' }}>
                    {client(s.userAgent)}
                  </div>
                  <div className="sub mono">{s.ip}</div>
                </div>
                <div className="when">{ago(s.at)} ago</div>
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel label="announcements" className="col-12">
        {announcements.length === 0 && <Empty>nothing announced</Empty>}
        {announcements.map((a) => (
          <article key={a.id} className={`notice ${a.level}`}>
            <h3>{a.title}</h3>
            <p className="prose">{a.body}</p>
            <span className="when">{ago(a.at)} ago · {a.author ?? 'staff'}</span>
          </article>
        ))}
      </Panel>
    </>
  );
}
