import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Panel from '../components/Panel.jsx';
import { useAuth } from '../auth.jsx';

/** The two seeded accounts, so both sides of the dashboard are one click away. */
const ACCOUNTS = [
  { username: 'admin', role: 'admin', blurb: 'the whole service' },
  { username: 'member', role: 'member', blurb: 'one subscriber' },
];

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('member');
  const [password, setPassword] = useState('demo-password');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = 'sign in · gamesense.cloud';
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  async function submit(event, asUser) {
    event?.preventDefault();
    const name = asUser ?? identifier.trim();
    setBusy(true);
    setError(null);
    try {
      await login(name, asUser ? 'demo-password' : password);
      navigate(location.state?.from ?? '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <Panel label="authentication">
        <form className="form" onSubmit={submit}>
          <div>
            <label htmlFor="identifier">username</label>
            <input
              id="identifier"
              className="field"
              autoComplete="username"
              spellCheck="false"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="password">password</label>
            <input
              id="password"
              type="password"
              className="field"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <button className="btn" type="submit" disabled={busy || !password}>
            {busy ? 'signing in…' : 'login'}
          </button>
        </form>
      </Panel>

      <Panel label="or sign in as">
        <div className="accounts">
          {ACCOUNTS.map((a) => (
            <button key={a.username} type="button" disabled={busy}
                    onClick={(e) => submit(e, a.username)}>
              <span className={`avatar avatar-sm g-${a.role}`} aria-hidden="true">
                {a.username.charAt(0)}
              </span>
              <span>
                <b>{a.username}</b>
                <span style={{ color: 'var(--faint)' }}> — {a.blurb}</span>
              </span>
              <span className={`tag role ${a.role === 'admin' ? 'tag-pin' : ''}`}>{a.role}</span>
            </button>
          ))}
        </div>
      </Panel>

      <p className="note">
        one session per machine &nbsp;-&nbsp; hwid is bound on first login
        <br />
        no account? <Link to="/register">register</Link>
      </p>
    </div>
  );
}
