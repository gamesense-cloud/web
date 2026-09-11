import { useEffect } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';

import Navbar from './components/Navbar.jsx';
import Panel, { Empty } from './components/Panel.jsx';
import { useAuth } from './auth.jsx';

import Overview from './pages/Overview.jsx';
import AdminOverview from './pages/AdminOverview.jsx';
import Builds from './pages/Builds.jsx';
import Hwid from './pages/Hwid.jsx';
import Resets from './pages/Resets.jsx';
import { Tickets, TicketDetail } from './pages/Tickets.jsx';
import { Members, MemberDetail } from './pages/Members.jsx';
import Activity from './pages/Activity.jsx';
import Settings from './pages/Settings.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';

/** Everything except the auth screens sits inside the masthead and footer. */
function Shell({ children }) {
  return (
    <div className="shell">
      <Navbar />
      <div className="page">{children}</div>
      <SiteFooter />
    </div>
  );
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <span>gamesense.cloud</span>
        <span>one session per machine · hwid is bound on first login</span>
        <span className="push">
          <i className="dot dot-ok" />
          <span className="mono">eu-central 24 ms</span>
        </span>
      </div>
    </footer>
  );
}

/** Signed in, or sent to the sign-in page with where they were going. */
function Private({ children, adminOnly = false }) {
  const { user, ready, isAdmin } = useAuth();
  const location = useLocation();

  if (!ready) return <Shell><div className="loading">checking your session…</div></Shell>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (adminOnly && !isAdmin) {
    return (
      <Shell>
        <Panel label="not for you">
          <Empty>that page is for admin accounts. sign in as admin to see it.</Empty>
        </Panel>
      </Shell>
    );
  }
  return <Shell>{children}</Shell>;
}

/** The landing page is whichever overview matches the role. */
function RoleOverview() {
  const { isAdmin } = useAuth();
  return isAdmin ? <AdminOverview /> : <Overview />;
}

function NotFound() {
  return (
    <Panel label="404">
      <Empty>
        no such page. <Link to="/" style={{ color: 'var(--accent)' }}>back to the overview</Link>
      </Empty>
    </Panel>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0 }); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/" element={<Private><RoleOverview /></Private>} />
        <Route path="/builds" element={<Private><Builds /></Private>} />
        <Route path="/hwid" element={<Private><Hwid /></Private>} />
        <Route path="/tickets" element={<Private><Tickets /></Private>} />
        <Route path="/tickets/:id" element={<Private><TicketDetail /></Private>} />
        <Route path="/activity" element={<Private><Activity /></Private>} />
        <Route path="/settings" element={<Private><Settings /></Private>} />

        <Route path="/members" element={<Private adminOnly><Members /></Private>} />
        <Route path="/members/:username" element={<Private adminOnly><MemberDetail /></Private>} />
        <Route path="/resets" element={<Private adminOnly><Resets /></Private>} />

        <Route path="*" element={<Private><NotFound /></Private>} />
      </Routes>
    </>
  );
}
