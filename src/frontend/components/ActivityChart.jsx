import { useEffect, useId, useRef, useState } from 'react';

/**
 * Fourteen days of activity — one series, so no legend: the panel label names
 * it. Axes are recessive, the endpoint is emphasised because "where it is now"
 * is the thing being read, and the same numbers are available as a table for
 * anyone who cannot read the shape.
 */
const H = 132;
const PAD = { top: 14, right: 16, bottom: 22, left: 34 };

/**
 * The smallest round number that clears the peak with a little headroom, so
 * the top tick names a value the reader recognises and the line is not
 * stranded along the bottom of an over-tall plot.
 */
const STEPS = [2, 4, 5, 8, 10, 15, 20, 25, 40, 50, 75, 100, 150, 200, 500, 1000];
function niceCeiling(max) {
  const wanted = max * 1.15;
  return STEPS.find((s) => s >= wanted) ?? Math.ceil(wanted / 1000) * 1000;
}

export default function ActivityChart({ data, label = 'events per day' }) {
  const [hover, setHover] = useState(null);
  const id = useId();

  /**
   * The viewBox tracks the container width rather than being fixed, so the
   * chart keeps a constant height at every screen size. A fixed viewBox with
   * `height: auto` collapses to about 40px on a phone, which is too short to
   * read an axis in.
   */
  const boxRef = useRef(null);
  const [W, setW] = useState(1200);

  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width);
      if (next > 0) setW(next);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!data?.length) return <p className="empty">nothing recorded yet</p>;

  const max = Math.max(1, ...data.map((d) => d.n));
  const ceiling = niceCeiling(max);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (i) => PAD.left + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = (n) => PAD.top + plotH - (n / ceiling) * plotH;

  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.n).toFixed(1)}`).join(' ');
  const area = `${line} L${x(data.length - 1).toFixed(1)},${(PAD.top + plotH).toFixed(1)} `
    + `L${x(0).toFixed(1)},${(PAD.top + plotH).toFixed(1)} Z`;

  const last = data[data.length - 1];
  const day = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7);

  function onMove(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * W;
    const ratio = (px - PAD.left) / plotW;
    const i = Math.round(ratio * (data.length - 1));
    if (i >= 0 && i < data.length) setHover(i);
  }

  return (
    <div className="chart" ref={boxRef}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ height: H }}
        role="img"
        aria-label={`${label}: ${data.map((d) => `${d.day} ${d.n}`).join(', ')}`}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {/* baseline and ceiling, the only two gridlines worth drawing */}
        <line className="grid-line" x1={PAD.left} y1={y(0)} x2={W - PAD.right} y2={y(0)} />
        <line className="grid-line" x1={PAD.left} y1={y(ceiling)} x2={W - PAD.right} y2={y(ceiling)}
              strokeDasharray="2 3" />
        <text className="axis-label" x={PAD.left - 6} y={y(ceiling) + 3} textAnchor="end">{ceiling}</text>
        <text className="axis-label" x={PAD.left - 6} y={y(0) + 3} textAnchor="end">0</text>

        <path className="area" d={area} />
        <path className="line" d={line} />

        {hover !== null && (
          <>
            <line className="crosshair" x1={x(hover)} y1={PAD.top} x2={x(hover)} y2={y(0)} />
            <circle className="marker" cx={x(hover)} cy={y(data[hover].n)} r="4.5" />
          </>
        )}

        <circle className="endpoint" cx={x(data.length - 1)} cy={y(last.n)} r="4" />

        <text className="axis-label" x={PAD.left} y={H - 6}>{day(data[0].day)}</text>
        <text className="axis-label" x={W - PAD.right} y={H - 6} textAnchor="end">{day(last.day)}</text>

        <rect className="hit" x={PAD.left} y={PAD.top} width={plotW} height={plotH} />
      </svg>

      {hover !== null && (
        <div
          className="chart-tip"
          style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(data[hover].n) / H) * 100}%` }}
        >
          {data[hover].day} · <b>{data[hover].n}</b>
        </div>
      )}

      <details className="chart-figures">
        <summary>figures</summary>
        <div className="table-wrap">
          <table className="table" id={`${id}-table`}>
            <thead>
              <tr><th>day</th><th className="right">events</th></tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.day}>
                  <td className="mono">{d.day}</td>
                  <td className="right mono">{d.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
