import { useEffect, useState } from 'react';
import Panel, { Status, Empty } from '../components/Panel.jsx';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { ago, bytes, date, num } from '../format.js';

const STATUSES = ['undetected', 'updating', 'detected'];

/**
 * The loader's own shape: a list of versions on the left, the selected one in
 * detail on the right. Label/value pairs stay inside a panel narrow enough
 * that they still read as pairs.
 */
export default function Builds() {
  const { isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [draft, setDraft] = useState({ version: '', notes: '' });

  const load = async (keepId) => {
    const res = await api.builds();
    setData(res);
    const next = keepId
      ? res.builds.find((b) => b.id === keepId)
      : res.builds.find((b) => b.isCurrent) ?? res.builds[0];
    setSelected(next ?? null);
    return res;
  };

  useEffect(() => {
    document.title = 'builds · gamesense.cloud';
    load().catch((e) => setError(e.message));
  }, []);

  if (error && !data) return <Panel label="builds"><Empty>{error}</Empty></Panel>;
  if (!data || !selected) return <div className="loading">loading builds…</div>;

  async function download(build) {
    setError(null);
    setNote(null);
    try {
      const res = await api.download(build.id);
      setNote(`${build.version} — ${res.note}`);
      load(build.id);
    } catch (err) {
      setError(err.message);
    }
  }

  async function setStatus(build, status) {
    setError(null);
    try {
      await api.admin.setBuildStatus(build.id, status);
      load(build.id);
    } catch (err) {
      setError(err.message);
    }
  }

  async function publish(event) {
    event.preventDefault();
    setError(null);
    setPublishing(true);
    try {
      const created = await api.admin.publishBuild(draft);
      setNote(`build ${draft.version} published and made current`);
      setDraft({ version: '', notes: '' });
      load(created.build.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <>
      <div className="page-head col-12">
        <div>
          <h1>builds</h1>
          <p>
            {data.product.name} · {data.product.mode}
            {data.current ? ` · current is ${data.current.version}` : ' · nothing current'}
          </p>
        </div>
        <div className="actions">
          <span className="status active"><i className="dot dot-ok" />uptime 30d {data.uptime}%</span>
        </div>
      </div>

      {data.subscriptionBlock && (
        <div className="form-error col-12">{data.subscriptionBlock} — downloads are unavailable.</div>
      )}
      {error && <div className="form-error col-12">{error}</div>}
      {note && <div className="form-ok col-12">{note}</div>}

      <Panel label="versions" className="col-4" flush>
        <div className="fill">
          <div className="rows" style={{ flex: 1 }}>
            {data.builds.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`row is-clickable ${b.id === selected.id ? 'is-flagged' : ''}`}
                style={{ gridTemplateColumns: 'minmax(0,1fr) auto',
                         background: b.id === selected.id ? 'var(--raised)' : undefined }}
                onClick={() => setSelected(b)}
              >
                <div style={{ minWidth: 0 }}>
                  <div className={`primary mono ${b.id === selected.id ? 'strong' : ''}`}>
                    {b.version}
                    {/* a ternary, not `&&` — isCurrent is 0 or 1, and React
                        prints a literal 0 for the falsy branch of `&&` */}
                    {b.isCurrent ? <span className="tag tag-pin" style={{ marginLeft: 8 }}>current</span> : null}
                  </div>
                  <div className="sub">{ago(b.releasedAt)} ago · {bytes(b.byteSize)}</div>
                </div>
                <i className={`dot dot-${b.status === 'undetected' ? 'ok'
                  : b.status === 'updating' ? 'warn' : 'bad'}`} />
              </button>
            ))}
          </div>
        </div>
      </Panel>

      <Panel label={`build ${selected.version}`} className="col-8">
        <div className="page-head" style={{ marginBottom: 'var(--sp-3)' }}>
          <div className="figure">
            <b className="mono">{selected.version}</b>
            <span><Status value={selected.status} /></span>
          </div>
          <div className="actions">
            {isAdmin && (
              <select
                className="field"
                aria-label={`status of build ${selected.version}`}
                value={selected.status}
                onChange={(e) => setStatus(selected, e.target.value)}
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            <button
              type="button"
              className="btn btn-sm"
              disabled={!selected.downloadable}
              onClick={() => download(selected)}
            >
              {selected.status === 'detected' ? 'pulled'
                : selected.status === 'updating' ? 'rebuilding'
                  : data.subscriptionBlock ? 'unavailable' : 'download'}
            </button>
          </div>
        </div>

        <dl className="metagrid">
          <div><dt>released</dt><dd>{date(selected.releasedAt)}</dd></div>
          <div><dt>age</dt><dd>{ago(selected.releasedAt)} ago</dd></div>
          <div><dt>size</dt><dd>{bytes(selected.byteSize)}</dd></div>
          <div><dt>published by</dt><dd>{selected.releasedBy ?? '—'}</dd></div>
          {isAdmin && <div><dt>downloads</dt><dd>{num(selected.downloadCount ?? 0)}</dd></div>}
        </dl>

        {selected.notes && (
          <>
            <div className="rule" />
            <div style={{ color: 'var(--faint)', fontSize: 11, marginBottom: 8 }}>release notes</div>
            <p className="prose">{selected.notes}</p>
          </>
        )}
      </Panel>

      {isAdmin && (
        <Panel label="publish a build" className="col-12">
          <form className="form" onSubmit={publish}>
            <div className="line">
              <div style={{ flex: '0 0 170px' }}>
                <label htmlFor="version">version</label>
                <input
                  id="version"
                  className="field"
                  placeholder="2942"
                  value={draft.version}
                  onChange={(e) => setDraft((d) => ({ ...d, version: e.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="notes">release notes</label>
                <input
                  id="notes"
                  className="field"
                  placeholder="what changed, and what it broke"
                  value={draft.notes}
                  onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                />
              </div>
              <button className="btn" type="submit" disabled={publishing || !draft.version.trim()}>
                {publishing ? 'publishing…' : 'publish'}
              </button>
            </div>
            <span className="hint" style={{ color: 'var(--faint)', fontSize: 11 }}>
              publishing an undetected build makes it current immediately
            </span>
          </form>
        </Panel>
      )}
    </>
  );
}
