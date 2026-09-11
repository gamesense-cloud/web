/**
 * Page controls. Shows at most five numbers around the current page, with the
 * first and last always reachable — long boards stay one click from the end.
 */
export default function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;

  const from = Math.max(1, Math.min(page - 2, pages - 4));
  const to = Math.min(pages, from + 4);
  const numbers = [];
  for (let i = from; i <= to; i += 1) numbers.push(i);

  const Button = ({ label, target, current = false, disabled = false, aria }) => (
    <button
      type="button"
      className={current ? 'is-current' : undefined}
      disabled={disabled}
      aria-current={current ? 'page' : undefined}
      aria-label={aria}
      onClick={() => onChange(target)}
    >
      {label}
    </button>
  );

  return (
    <nav className="pager" aria-label="pagination">
      <Button label="‹" target={page - 1} disabled={page === 1} aria="previous page" />
      {from > 1 && <Button label="1" target={1} />}
      {from > 2 && <span className="t-dim" style={{ padding: '0 2px' }}>…</span>}
      {numbers.map((n) => (
        <Button key={n} label={String(n)} target={n} current={n === page} />
      ))}
      {to < pages - 1 && <span className="t-dim" style={{ padding: '0 2px' }}>…</span>}
      {to < pages && <Button label={String(pages)} target={pages} />}
      <Button label="›" target={page + 1} disabled={page === pages} aria="next page" />
      <span className="of">page {page} of {pages}</span>
    </nav>
  );
}
