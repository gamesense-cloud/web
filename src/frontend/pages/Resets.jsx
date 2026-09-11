import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Panel, { Status, Empty } from '../components/Panel.jsx';
import { api } from '../api.js';
import { ago, date } from '../format.js';

/** The admin side of hwid: a queue to work through. */
export default function Resets() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [notes, setNotes] = useState({});

  const load = () => api.admin.resets().then(setData).catch((e) => setError(e.message));

  useEffect(() => {
    document.title = 'hwid resets · gamesense.cloud admin';
    load();
  }, []);

  if (error && !data) return <Panel label="hwid resets"><Empty>{error}</Empty></Panel>;
  if (!data) return <div className="loading">loading the queue…</div>;

  async function resolve(id, status) {
    setError(null);
    try {
      await api.admin.resolveReset(id, status, notes[id] ?? null);
      setNotes((n) => ({ ...n, [id]: '' }));
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const resolved = [...data.approved, ...data.denied]
    .sort((a, b) => String(b.requestedAt).localeCompare(String(a.requestedAt)));

  return (
    <>
      <div className="page-head col-12">
        <div>
          <h1>hwid resets</h1>
          <p>
            approving a reset releases the account's current binding, so the next
            login binds whatever machine it comes from.
          </p>
        </div>
        <div className="actions">
          <span className={`status ${data.pending.length ? 'pending' : 'active'}`}>
            <i className={`dot dot-${data.pending.length ? 'warn' : 'ok'}`} />
            {data.pending.length} waiting
          </span>
        </div>
      </div>

      {error && <div className="form-error col-12">{error}</div>}

      <Panel label="waiting on review" className="col-12" flush>
        <div className="rows">
          {data.pending.length === 0 && <Empty>nothing waiting — the queue is clear</Empty>}
          {data.pending.map((r) => (
            <div key={r.id} className="row is-flagged" style={{ gridTemplateColumns: 'minmax(0,1fr)' }}>
              <div>
                <div className="row-x" style={{ justifyContent: 'space-between' }}>
                  <Link to={`/members/${r.username}`} className="primary strong g-member">
                    {r.username}
                  </Link>
                  <span className="when">{ago(r.requestedAt)} ago</span>
                </div>
                <div className="sub" style={{ marginTop: 6 }}>{r.reason}</div>
                <div className="sub mono" style={{ marginTop: 4 }}>
                  current binding: {r.hwid ?? 'none'}
                </div>

                <div className="row-x" style={{ marginTop: 10, gap: 8 }}>
                  <input
                    className="field"
                    style={{ flex: 1, minWidth: 160 }}
                    placeholder="note (optional, shown to the member on a denial)"
                    value={notes[r.id] ?? ''}
                    onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                    aria-label={`note for ${r.username}`}
                  />
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
      </Panel>

      <Panel label="already resolved" className="col-12" flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>account</th><th>reason</th><th>status</th><th>requested</th></tr>
            </thead>
            <tbody>
              {resolved.length === 0 && (
                <tr><td colSpan={4}><span className="t-dim">nothing resolved yet</span></td></tr>
              )}
              {resolved.map((r) => (
                <tr key={r.id}>
                  <td className="strong">{r.username}</td>
                  <td>{r.reason}</td>
                  <td><Status value={r.status} /></td>
                  <td className="mono">{date(r.requestedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
