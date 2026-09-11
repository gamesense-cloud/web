import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Panel, { Meta, Status, Empty } from '../components/Panel.jsx';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { ago, date } from '../format.js';

const FILTERS = [['', 'all'], ['open', 'open'], ['answered', 'answered'], ['closed', 'closed']];

export function Tickets() {
  const { isAdmin, refresh } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState({ subject: '', body: '', priority: 'normal' });
  const [busy, setBusy] = useState(false);

  const load = (status) => api.tickets(status).then(setData).catch((e) => setError(e.message));

  useEffect(() => {
    document.title = 'tickets · gamesense.cloud';
    load(filter);
  }, [filter]);

  if (error && !data) return <Panel label="tickets" className="col-12"><Empty>{error}</Empty></Panel>;
  if (!data) return <div className="loading">loading tickets…</div>;

  async function create(event) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await api.createTicket(draft);
      setDraft({ subject: '', body: '', priority: 'normal' });
      await refresh();
      navigate(`/tickets/${res.ticket.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-head col-12">
        <div>
          <h1>{isAdmin ? 'support queue' : 'your tickets'}</h1>
          <p>
            {isAdmin
              ? 'every ticket on the service. replying marks one answered.'
              : 'anything account-bound goes here rather than a public thread.'}
          </p>
        </div>
        <div className="actions">
          {FILTERS.map(([value, label]) => (
            <button
              key={label}
              type="button"
              className={`btn btn-ghost btn-sm ${filter === value ? 'is-on' : ''}`}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="form-error col-12">{error}</div>}

      <Panel label={`${data.tickets.length} ticket${data.tickets.length === 1 ? '' : 's'}`} className={isAdmin ? 'col-12' : 'col-7'} flush>
        <div className="rows">
          {data.tickets.length === 0 && <Empty>nothing here</Empty>}
          {data.tickets.map((t) => (
            <Link
              key={t.id}
              to={`/tickets/${t.id}`}
              className={`row is-clickable ${t.status === 'open' ? 'is-flagged' : ''}`}
              style={{ gridTemplateColumns: 'minmax(0,1fr) auto auto' }}
            >
              <div>
                <div className="primary strong">{t.subject}</div>
                <div className="sub">
                  {isAdmin && <>{t.username} · </>}
                  {t.messageCount} messages · opened {ago(t.createdAt)} ago
                </div>
              </div>
              <Status value={t.status} />
              <div className="when">{ago(t.updatedAt)} ago</div>
            </Link>
          ))}
        </div>
      </Panel>

      {!isAdmin && (
        <Panel label="open a ticket" className="col-5">
          <form className="form" onSubmit={create}>
            <div className="line">
              <div>
                <label htmlFor="subject">subject</label>
                <input
                  id="subject"
                  className="field"
                  placeholder="what is wrong, in a few words"
                  maxLength={140}
                  value={draft.subject}
                  onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}
                />
              </div>
              <div style={{ flex: '0 0 130px' }}>
                <label htmlFor="priority">priority</label>
                <select
                  id="priority"
                  className="field"
                  value={draft.priority}
                  onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value }))}
                >
                  <option value="low">low</option>
                  <option value="normal">normal</option>
                  <option value="high">high</option>
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="body">what happened</label>
              <textarea
                id="body"
                className="field"
                placeholder="include your build number, and what you already tried"
                value={draft.body}
                onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
              />
            </div>
            <div className="foot">
              <span className="hint">tickets are private to you and staff</span>
              <button className="btn push" type="submit"
                      disabled={busy || draft.subject.trim().length < 6 || draft.body.trim().length < 10}>
                {busy ? 'opening…' : 'open ticket'}
              </button>
            </div>
          </form>
        </Panel>
      )}
    </>
  );
}

export function TicketDetail() {
  const { id } = useParams();
  const { user, isAdmin, refresh } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [body, setBody] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () => api.ticket(id).then((r) => setTicket(r.ticket)).catch((e) => setError(e.message));

  useEffect(() => { load(); }, [id]);
  useEffect(() => { if (ticket) document.title = `${ticket.subject} · gamesense.cloud`; }, [ticket]);

  if (error) return <Panel label="ticket" className="col-12"><Empty>{error}</Empty></Panel>;
  if (!ticket) return <div className="loading">loading ticket…</div>;

  async function reply(event) {
    event.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.replyToTicket(id, body.trim());
      setTicket(res.ticket);
      setBody('');
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status) {
    try {
      const res = await api.setTicketStatus(id, status);
      setTicket(res.ticket);
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <div className="page-head col-12">
        <div>
          <Link to="/tickets" style={{ color: 'var(--dim)', fontSize: 12 }}>← all tickets</Link>
          <h1 style={{ marginTop: 8 }}>{ticket.subject}</h1>
          <p>
            opened by {ticket.username} {ago(ticket.createdAt)} ago · {date(ticket.createdAt)} ·
            priority {ticket.priority}
          </p>
        </div>
        <div className="actions">
          <Status value={ticket.status} />
          {ticket.status !== 'closed' && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStatus('closed')}>
              close ticket
            </button>
          )}
          {isAdmin && ticket.status === 'closed' && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStatus('open')}>
              reopen
            </button>
          )}
        </div>
      </div>

      {error && <div className="form-error col-12">{error}</div>}

      <Panel label="conversation" className="col-12" flush>
        <div>
          {ticket.messages.map((m) => (
            <div key={m.id} className={`message ${m.authorRole === 'admin' ? 'is-staff' : ''}`}>
              <span className={`avatar g-${m.authorRole}`} aria-hidden="true">
                {m.author.charAt(0)}
              </span>
              <div className="body">
                <div className="head">
                  <b className={`g-${m.authorRole}`}>{m.author}</b>
                  {m.authorRole === 'admin' && <span className="tag tag-pin">staff</span>}
                  <time>{ago(m.createdAt)} ago</time>
                </div>
                <p>{m.body}</p>
              </div>
            </div>
          ))}
        </div>

        {ticket.status === 'closed' ? (
          <div style={{ padding: 'var(--sp-3)', borderTop: '1px solid var(--border)',
                        color: 'var(--faint)', fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="tag tag-lock">closed</span>
            this ticket is closed to new replies.
          </div>
        ) : (
          <form className="form" onSubmit={reply}
                style={{ padding: 'var(--sp-3)', borderTop: '1px solid var(--border)' }}>
            <div>
              <label htmlFor="reply">reply as {user.username}</label>
              <textarea
                id="reply"
                className="field"
                style={{ minHeight: 90 }}
                placeholder={isAdmin ? 'answering marks this ticket answered' : 'add anything that helps'}
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </div>
            <div className="foot">
              <span className="hint">
                {isAdmin ? 'the member is notified in their activity log' : 'staff are notified'}
              </span>
              <button className="btn push" type="submit" disabled={busy || !body.trim()}>
                {busy ? 'sending…' : 'send reply'}
              </button>
            </div>
          </form>
        )}
      </Panel>
    </>
  );
}

export default Tickets;
