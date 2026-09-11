import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Panel, { Meta, Status, Empty } from '../components/Panel.jsx';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { ago, date, num, stamp } from '../format.js';

const PLANS = ['trial', 'week', 'month', 'lifetime'];

export function Members() {
  const [data, setData] = useState(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => { document.title = 'members · gamesense.cloud admin'; }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      api.admin.members({ q: query }).then(setData).catch((e) => setError(e.message));
    }, query ? 180 : 0);
    return () => clearTimeout(id);
  }, [query]);

  if (error && !data) return <Panel label="members" className="col-12"><Empty>{error}</Empty></Panel>;
  if (!data) return <div className="loading">loading accounts…</div>;

  return (
    <>
      <div className="page-head col-12">
        <div>
          <h1>accounts</h1>
          <p>{num(data.total)} on this install.</p>
        </div>
        <div className="actions">
          <input
            type="search"
            className="field"
            placeholder="find an account"
            aria-label="find an account"
            style={{ width: 180 }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <Panel label="members" className="col-12" flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>account</th><th>role</th><th>plan</th><th>expires</th>
                <th>hwid</th><th>last seen</th>
              </tr>
            </thead>
            <tbody>
              {data.users.length === 0 && (
                <tr><td colSpan={6}><span className="t-dim">nobody by that name</span></td></tr>
              )}
              {data.users.map((u) => (
                <tr key={u.id}>
                  <td className="strong">
                    <Link to={`/members/${u.username}`} className={`g-${u.role}`}>{u.username}</Link>
                    <div className="sub" style={{ color: 'var(--faint)', fontSize: 11 }}>{u.email}</div>
                  </td>
                  <td><span className={`tag ${u.role === 'admin' ? 'tag-pin' : ''}`}>{u.role}</span></td>
                  <td>{u.plan ?? '—'}</td>
                  <td>{u.expiresAt ? date(u.expiresAt) : u.plan === 'lifetime' ? 'never' : '—'}</td>
                  <td className="mono">{u.hwid ?? '—'}</td>
                  <td>{u.lastSeenAt ? `${ago(u.lastSeenAt)} ago` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

export function MemberDetail() {
  const { username } = useParams();
  const { user: me } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);

  const load = () => api.admin.member(username).then(setData).catch((e) => setError(e.message));

  useEffect(() => {
    document.title = `${username} · gamesense.cloud admin`;
    load();
  }, [username]);

  if (error && !data) return <Panel label="account" className="col-12"><Empty>{error}</Empty></Panel>;
  if (!data) return <div className="loading">loading account…</div>;

  const { user, subscription, hwid, hwidHistory, resets, sessions, activity } = data;
  const isMe = user.id === me?.id;

  async function act(fn, message) {
    setError(null);
    setNote(null);
    try {
      await fn();
      setNote(message);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="page-head col-12">
        <div>
          <Link to="/members" style={{ color: 'var(--dim)', fontSize: 12 }}>← all accounts</Link>
          <h1 style={{ marginTop: 8 }} className={`g-${user.role}`}>
            {user.username}
            <span className={`tag ${user.role === 'admin' ? 'tag-pin' : ''}`} style={{ marginLeft: 8 }}>
              {user.role}
            </span>
            {user.bannedAt && <span className="tag tag-lock" style={{ marginLeft: 6 }}>banned</span>}
          </h1>
          <p>{user.email} · joined {date(user.createdAt)} · {user.region}</p>
        </div>
      </div>

      {error && <div className="form-error col-12">{error}</div>}
      {note && <div className="form-ok col-12">{note}</div>}

      <Panel label="subscription" className="col-6">
          {subscription ? (
            <dl>
              <Meta label="product">{subscription.productName}</Meta>
              <Meta label="plan">{subscription.plan}</Meta>
              <Meta label="status"><Status value={subscription.status} /></Meta>
              <Meta label="expires">
                {subscription.expiresAt ? date(subscription.expiresAt) : 'never'}
              </Meta>
              <Meta label="remaining">
                {subscription.daysLeft === null ? 'lifetime' : `${subscription.daysLeft} days`}
              </Meta>
            </dl>
          ) : (
            <Empty>no subscription</Empty>
          )}
          <div className="rule" />
          <div className="row-x">
            {PLANS.map((plan) => (
              <button
                key={plan}
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => act(() => api.admin.grant(username, plan), `plan set to ${plan}`)}
              >
                {plan}
              </button>
            ))}
          </div>
        </Panel>

        <Panel label="account actions" className="col-6">
          <dl>
            <Meta label="role">{user.role}</Meta>
            <Meta label="last seen">{user.lastSeenAt ? `${ago(user.lastSeenAt)} ago` : 'never'}</Meta>
            <Meta label="sessions">{num(sessions.length)}</Meta>
          </dl>
          <div className="rule" />
          <div className="stack">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={isMe}
              title={isMe ? 'you cannot change your own role' : undefined}
              onClick={() => act(
                () => api.admin.setRole(username, user.role === 'admin' ? 'member' : 'admin'),
                `role changed to ${user.role === 'admin' ? 'member' : 'admin'}`
              )}
            >
              make {user.role === 'admin' ? 'a member' : 'an admin'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => act(() => api.admin.revokeSessions(username), 'all sessions revoked')}
            >
              sign out everywhere
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={isMe}
              title={isMe ? 'you cannot ban yourself' : undefined}
              onClick={() => act(
                () => api.admin.ban(username, 'banned from the admin dashboard'),
                user.bannedAt ? 'account unbanned' : 'account banned'
              )}
            >
              {user.bannedAt ? 'lift the ban' : 'ban this account'}
            </button>
          </div>
      </Panel>

      <Panel label="hardware" className="col-7" flush>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>hwid</th><th>label</th><th>bound</th><th>released</th></tr></thead>
              <tbody>
                {hwidHistory.length === 0 && (
                  <tr><td colSpan={4}><span className="t-dim">never bound</span></td></tr>
                )}
                {hwidHistory.map((h) => (
                  <tr key={h.id}>
                    <td className="strong mono">{h.hwid}</td>
                    <td>{h.label ?? '—'}</td>
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
          {activity.length === 0 && <Empty>nothing recorded</Empty>}
          {activity.map((e) => (
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

export default Members;
