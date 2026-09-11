import { useEffect, useState } from 'react';
import Panel, { Meta, Status, Empty } from '../components/Panel.jsx';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { ago, date, num } from '../format.js';

export default function Settings() {
  const { refresh } = useAuth();
  const [data, setData] = useState(null);
  const [profile, setProfile] = useState({ displayName: '', region: '' });
  const [passwords, setPasswords] = useState({ current: '', next: '' });
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);

  const load = () => api.account().then((res) => {
    setData(res);
    setProfile({ displayName: res.user.displayName ?? '', region: res.user.region ?? '' });
  }).catch((e) => setError(e.message));

  useEffect(() => {
    document.title = 'settings · gamesense.cloud';
    load();
  }, []);

  if (error && !data) return <Panel label="settings" className="col-12"><Empty>{error}</Empty></Panel>;
  if (!data) return <div className="loading">loading your account…</div>;

  const { user, subscription, hwid, sessions } = data;

  async function saveProfile(event) {
    event.preventDefault();
    setError(null);
    setNote(null);
    try {
      await api.updateAccount(profile);
      await refresh();
      setNote('profile saved');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function savePassword(event) {
    event.preventDefault();
    setError(null);
    setNote(null);
    try {
      const res = await api.changePassword(passwords.current, passwords.next);
      setPasswords({ current: '', next: '' });
      setNote(res.note ?? 'password changed');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="page-head col-12">
        <div>
          <h1>account settings</h1>
          <p>who you are on this install, and the machines signed in as you.</p>
        </div>
      </div>

      {error && <div className="form-error col-12">{error}</div>}
      {note && <div className="form-ok col-12">{note}</div>}

      <Panel label="account" className="col-5">
          <dl>
            <Meta label="username">{user.username}</Meta>
            <Meta label="email">{user.email}</Meta>
            <Meta label="role">{user.role}</Meta>
            <Meta label="joined">{date(user.createdAt)}</Meta>
            <Meta label="hwid">
              <span className="mono" style={{ fontSize: 11 }}>{hwid?.hwid ?? 'not bound'}</span>
            </Meta>
          </dl>
          {subscription && (
            <>
              <div className="rule" />
              <dl>
                <Meta label="plan">{subscription.plan}</Meta>
                <Meta label="status"><Status value={subscription.status} /></Meta>
                <Meta label="expires">
                  {subscription.expiresAt ? date(subscription.expiresAt) : 'never'}
                </Meta>
              </dl>
            </>
          )}
        </Panel>

        <Panel label="profile" className="col-7">
          <form className="form" onSubmit={saveProfile}>
            <div>
              <label htmlFor="displayName">display name</label>
              <input
                id="displayName"
                className="field"
                maxLength={40}
                value={profile.displayName}
                onChange={(e) => setProfile((p) => ({ ...p, displayName: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="region">preferred region</label>
              <select
                id="region"
                className="field"
                value={profile.region}
                onChange={(e) => setProfile((p) => ({ ...p, region: e.target.value }))}
              >
                <option value="eu-central">eu-central</option>
                <option value="eu-west">eu-west</option>
                <option value="us-east">us-east</option>
                <option value="us-west">us-west</option>
              </select>
            </div>
            <div className="foot">
              <span className="hint">the region the loader prefers when it handshakes</span>
              <button className="btn push" type="submit">save profile</button>
            </div>
          </form>
      </Panel>

      <Panel label="password" className="col-12">
        <form className="form" onSubmit={savePassword}>
          <div className="line">
            <div>
              <label htmlFor="current">current password</label>
              <input
                id="current"
                type="password"
                className="field"
                autoComplete="current-password"
                value={passwords.current}
                onChange={(e) => setPasswords((p) => ({ ...p, current: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="next">new password</label>
              <input
                id="next"
                type="password"
                className="field"
                autoComplete="new-password"
                value={passwords.next}
                onChange={(e) => setPasswords((p) => ({ ...p, next: e.target.value }))}
              />
            </div>
          </div>
          <div className="foot">
            <span className="hint">changing it signs out every other session</span>
            <button className="btn push" type="submit"
                    disabled={!passwords.current || !passwords.next}>
              change password
            </button>
          </div>
        </form>
      </Panel>

      <Panel label="signed-in sessions" className="col-12" flush>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>where</th><th>ip</th><th>started</th><th>expires</th></tr></thead>
            <tbody>
              {sessions.length === 0 && (
                <tr><td colSpan={4}><span className="t-dim">no sessions recorded</span></td></tr>
              )}
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td className="strong">{s.userAgent ?? 'unknown'}</td>
                  <td className="mono">{s.ip ?? '—'}</td>
                  <td>{ago(s.at)} ago</td>
                  <td>{date(s.expiresAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
