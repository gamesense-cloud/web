import { useEffect, useState } from 'react';
import Panel, { Meta, Status, Empty } from '../components/Panel.jsx';
import { api } from '../api.js';
import { ago, date } from '../format.js';

export default function Hwid() {
  const [data, setData] = useState(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = () => api.hwid().then(setData).catch((e) => setError(e.message));

  useEffect(() => {
    document.title = 'hwid · gamesense.cloud';
    load();
  }, []);

  if (error && !data) return <Panel label="hwid"><Empty>{error}</Empty></Panel>;
  if (!data) return <div className="loading">loading your binding…</div>;

  const canRequest = !data.pending && !data.cooldownUntil;

  async function request(event) {
    event.preventDefault();
    setError(null);
    setNote(null);
    setBusy(true);
    try {
      await api.requestReset(reason);
      setReason('');
      setNote('reset requested — staff will review it and you will see the result here');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    navigator.clipboard?.writeText(data.active?.hwid ?? '').finally(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  }

  return (
    <>
      <div className="page-head col-12">
        <div>
          <h1>hardware id</h1>
          <p>
            one session per machine. your hwid binds on first login and stays bound —
            a reset is one every {data.cooldownDays} days.
          </p>
        </div>
      </div>

      {error && <div className="form-error col-12">{error}</div>}
      {note && <div className="form-ok col-12">{note}</div>}

        <Panel label="bound machine" className="col-5">
          {data.active ? (
            <>
              <div className="figure">
                <b className="mono" style={{ fontSize: 17 }}>{data.active.hwid}</b>
              </div>
              <div className="rule" />
              <dl>
                <Meta label="label">{data.active.label ?? '—'}</Meta>
                <Meta label="bound">{ago(data.active.boundAt)} ago · {date(data.active.boundAt)}</Meta>
                <Meta label="reset">
                  {data.pending
                    ? <Status value="pending" label="waiting on review" />
                    : data.cooldownUntil
                      ? `opens ${data.cooldownUntil.slice(0, 10)}`
                      : <span className="t-ok">available</span>}
                </Meta>
              </dl>
              <div className="rule" />
              <button type="button" className="btn btn-ghost" style={{ width: '100%' }} onClick={copy}>
                {copied ? 'copied' : 'copy hwid'}
              </button>
            </>
          ) : (
            <Empty>nothing bound — the next loader login binds this machine</Empty>
          )}
        </Panel>

        <Panel label="request a reset" className="col-7">
          {data.pending ? (
            <>
              <p style={{ margin: '0 0 var(--sp-3)', color: 'var(--dim)', fontSize: 12, lineHeight: 1.6 }}>
                you have a reset waiting on review. there is nothing else to do —
                it will appear below once staff have looked at it.
              </p>
              <dl className="metagrid">
                <div><dt>requested</dt><dd>{ago(data.pending.requestedAt)} ago</dd></div>
                <div><dt>status</dt><dd><Status value="pending" /></dd></div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <dt>reason</dt>
                  <dd style={{ whiteSpace: 'normal' }}>{data.pending.reason}</dd>
                </div>
              </dl>
            </>
          ) : data.cooldownUntil ? (
            <Empty>
              resets are one every {data.cooldownDays} days.
              your next one opens {data.cooldownUntil.slice(0, 10)}.
            </Empty>
          ) : (
            <form className="form" onSubmit={request}>
              <div>
                <label htmlFor="reason">what changed?</label>
                <textarea
                  id="reason"
                  className="field"
                  style={{ minHeight: 90 }}
                  placeholder="a new machine, a board swap, a reinstall — whatever moved the hwid"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
              <div className="foot">
                <span className="hint">approving a reset releases the current binding</span>
                <button className="btn push" type="submit" disabled={busy || !canRequest || reason.trim().length < 8}>
                  {busy ? 'requesting…' : 'request reset'}
                </button>
              </div>
            </form>
          )}
        </Panel>

      <Panel label="reset history" className="col-7" flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>requested</th><th>reason</th><th>status</th><th>resolved</th><th>by</th>
              </tr>
            </thead>
            <tbody>
              {data.resets.length === 0 && (
                <tr><td colSpan={5}><span className="t-dim">no resets on this account</span></td></tr>
              )}
              {data.resets.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{date(r.requestedAt)}</td>
                  <td className="strong">{r.reason}</td>
                  <td><Status value={r.status} /></td>
                  <td>{r.resolvedAt ? `${ago(r.resolvedAt)} ago` : '—'}</td>
                  <td>{r.resolvedBy ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel label="binding history" className="col-5" flush>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>hwid</th><th>label</th><th>bound</th><th>released</th></tr>
            </thead>
            <tbody>
              {data.history.map((h) => (
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
    </>
  );
}
