/**
 * The group box — a 1px frame with its label knocked into the top border, the
 * way BeginGroupBox draws it by hand in the loader. Everything on the
 * dashboard is one of these.
 *
 * `flush` removes the side padding, for panels whose content is rows that
 * should run edge to edge.
 */
export default function Panel({ label, flush = false, actions, children, className = '', ...rest }) {
  return (
    <section className={`gb ${flush ? 'flush' : ''} ${className}`} {...rest}>
      {label && <h2 className="gb-label">{label}</h2>}
      {actions && (
        <div className="row-x" style={{ justifyContent: 'flex-end', marginBottom: 'var(--sp-3)' }}>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/** Label hard left, value hard right — the loader's MetaRow. */
export function Meta({ label, children, className = '' }) {
  return (
    <div className="meta">
      <dt>{label}</dt>
      <dd className={className}>{children}</dd>
    </div>
  );
}

/** A status word with its dot. status also drives the colour, via CSS. */
export function Status({ value, label }) {
  const dot = {
    undetected: 'ok', active: 'ok', approved: 'ok', closed: 'ok',
    updating: 'warn', pending: 'warn', answered: 'warn', paused: 'warn',
    detected: 'bad', expired: 'bad', denied: 'bad', banned: 'bad',
    open: 'ok',
  }[value] ?? 'idle';

  return (
    <span className={`status ${value}`}>
      <i className={`dot dot-${dot}`} />
      {label ?? value}
    </span>
  );
}

export function Empty({ children }) {
  return <p className="empty">{children}</p>;
}
