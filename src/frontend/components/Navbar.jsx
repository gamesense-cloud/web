import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

/** Navigation differs by role — an admin has a service to run, a member has an
 *  account to look after. Neither sees the other's links. */
const MEMBER_LINKS = [
  ['/', 'overview'],
  ['/builds', 'builds'],
  ['/hwid', 'hwid'],
  ['/tickets', 'tickets', 'tickets'],
  ['/activity', 'activity'],
];

const ADMIN_LINKS = [
  ['/', 'overview'],
  ['/builds', 'builds'],
  ['/members', 'members'],
  ['/resets', 'hwid resets', 'resets'],
  ['/tickets', 'tickets', 'tickets'],
  ['/activity', 'activity'],
];

export default function Navbar() {
  const { user, badges, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const links = user?.role === 'admin' ? ADMIN_LINKS : MEMBER_LINKS;

  return (
    <header className="masthead" ref={ref}>
      <div className="rainbow" />
      <div className="navbar">
        <div className="navbar-inner">
          <Link to="/" className="wordmark">gamesense<i>.cloud</i></Link>

          {user && (
            <nav className="navlinks">
              {links.map(([to, label, badgeKey]) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) => (isActive ? 'is-active' : undefined)}
                >
                  {label}
                  {badgeKey && badges?.[badgeKey] > 0 && (
                    <span className="count">{badges[badgeKey]}</span>
                  )}
                </NavLink>
              ))}
            </nav>
          )}

          <div className="navbar-right">
            {user ? (
              <button
                type="button"
                className="whoami"
                aria-expanded={open}
                onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
              >
                <span className={`avatar avatar-sm g-${user.role}`} aria-hidden="true">
                  {user.username.charAt(0)}
                </span>
                <span><b>{user.username}</b> <em>{user.role}</em></span>
              </button>
            ) : (
              <Link to="/login" className="btn btn-sm">sign in</Link>
            )}
          </div>
        </div>
      </div>

      {open && user && (
        <div className="menu" onClick={(e) => e.stopPropagation()}>
          <div className="head">{user.username} · {user.role}</div>
          <Link to="/settings" onClick={() => setOpen(false)}>account settings</Link>
          <Link to="/activity" onClick={() => setOpen(false)}>activity</Link>
          <hr />
          <button
            type="button"
            onClick={async () => { setOpen(false); await logout(); navigate('/login'); }}
          >
            log out
          </button>
        </div>
      )}
    </header>
  );
}
