import { useEffect, useState } from 'react';
import Panel, { Empty } from '../components/Panel.jsx';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { date, stamp } from '../format.js';

/** The loader's status pane, given a whole page: mono timestamps, dim text. */
export default function Activity() {
  const { isAdmin } = useAuth();
  const [scope, setScope] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = 'activity · gamesense.cloud';
  }, []);

  useEffect(() => {
    api.activity(scope ?? (isAdmin ? 'all' : 'me'))
      .then(setData)
      .catch((e) => setError(e.message));
  }, [scope, isAdmin]);

  if (error) return <Panel label="activity" className="col-12"><Empty>{error}</Empty></Panel>;
  if (!data) return <div className="loading">loading the log…</div>;

  // Group by day, so a long log stays readable.
  const byDay = [];
  for (const event of data.events) {
    const day = String(event.at).slice(0, 10);
    const last = byDay[byDay.length - 1];
    if (last?.day === day) last.events.push(event);
    else byDay.push({ day, events: [event] });
  }

  return (
    <>
      <div className="page-head col-12">
        <div>
          <h1>activity</h1>
          <p>
            {data.scope === 'all'
              ? 'everything on the service, newest first.'
              : 'your account, plus anything service-wide.'}
          </p>
        </div>
        {isAdmin && (
          <div className="actions">
            <button
              type="button"
              className={`btn btn-ghost btn-sm ${data.scope === 'all' ? 'is-on' : ''}`}
              onClick={() => setScope('all')}
            >
              the whole service
            </button>
            <button
              type="button"
              className={`btn btn-ghost btn-sm ${data.scope === 'me' ? 'is-on' : ''}`}
              onClick={() => setScope('me')}
            >
              just me
            </button>
          </div>
        )}
      </div>

      {byDay.length === 0 && (
        <Panel label="log" className="col-12"><Empty>nothing recorded yet</Empty></Panel>
      )}

      {byDay.map((group) => (
        <Panel key={group.day} label={date(group.day)} className="col-12" flush>
          <ul className="feed">
            {group.events.map((e) => (
              <li key={e.id}>
                <time>{stamp(e.at)}</time>
                <span>
                  {e.subject && <span className="who">{e.subject} </span>}
                  {e.message}
                  {e.scope === 'service' && (
                    <span className="tag" style={{ marginLeft: 8 }}>service</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      ))}
    </>
  );
}
