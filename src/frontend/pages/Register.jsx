import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Panel from '../components/Panel.jsx';
import { useAuth } from '../auth.jsx';

const FIELDS = [
  ['username', 'username', 'text', 'username',
    'lowercase letters, digits, . _ - · three to twenty-four characters'],
  ['email', 'email', 'email', 'email', 'where your key and invoices go'],
  ['password', 'password', 'password', 'new-password', 'at least eight characters'],
];

export default function Register() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = 'register · gamesense.cloud';
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      await register(form.username.trim().toLowerCase(), form.email.trim(), form.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.errors ?? {});
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <Panel label="create an account">
        <form className="form" onSubmit={submit}>
          {FIELDS.map(([id, label, type, autoComplete, hint]) => (
            <div key={id}>
              <label htmlFor={id}>{label}</label>
              <input
                id={id}
                type={type}
                className="field"
                autoComplete={autoComplete}
                spellCheck="false"
                value={form[id]}
                onChange={(e) => setForm((f) => ({ ...f, [id]: e.target.value }))}
              />
              {fieldErrors[id] ? (
                <div className="t-bad" style={{ fontSize: 11, marginTop: 4 }}>{fieldErrors[id]}</div>
              ) : (
                <div className="t-dim" style={{ fontSize: 11, marginTop: 4 }}>{hint}</div>
              )}
            </div>
          ))}

          {error && Object.keys(fieldErrors).length === 0 && (
            <div className="form-error">{error}</div>
          )}

          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'creating…' : 'register'}
          </button>
        </form>
      </Panel>

      <p className="note">
        new accounts start with no subscription — an admin grants one from the
        members page.
        <br />
        already registered? <Link to="/login">sign in</Link>
      </p>
    </div>
  );
}
