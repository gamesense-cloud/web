"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fourteen days of activity — one series, so no legend: the panel label names
 * it. Axes are recessive, the endpoint is emphasised because "where it is now"
 * is what is being read, and the same numbers are available as a table for
 * anyone who cannot read the shape.
 */
const H = 132;
const PAD = { top: 14, right: 16, bottom: 22, left: 34 };

/** The smallest round number that clears the peak with a little headroom. */
const STEPS = [2, 4, 5, 8, 10, 15, 20, 25, 40, 50, 75, 100, 150, 200, 500, 1000];
const niceCeiling = (max: number) =>
  STEPS.find((s) => s >= max * 1.15) ?? Math.ceil((max * 1.15) / 1000) * 1000;

export default function ActivityChart({
  data,
  label = "events per day",
}: {
  data: { day: string; n: number }[];
  label?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);

  // The viewBox tracks the container width so the chart keeps a constant
  // height at every screen size; a fixed viewBox collapses to ~40px on a phone.
  const [W, setW] = useState(1200);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === "undefined") return;
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

  const x = (i: number) =>
    PAD.left + (data.length === 1 ? plotW / 2 : (i / (data.length - 1)) * plotW);
  const y = (n: number) => PAD.top + plotH - (n / ceiling) * plotH;

  const line = data
    .map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.n).toFixed(1)}`)
    .join(" ");
  const area =
    `${line} L${x(data.length - 1).toFixed(1)},${(PAD.top + plotH).toFixed(1)} ` +
    `L${x(0).toFixed(1)},${(PAD.top + plotH).toFixed(1)} Z`;

  const last = data[data.length - 1];
  const day = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

  return (
    <div className="chart" ref={box} style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: "block", width: "100%", height: H }}
        role="img"
        aria-label={`${label}: ${data.map((d) => `${d.day} ${d.n}`).join(", ")}`}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          const i = Math.round(((px - PAD.left) / plotW) * (data.length - 1));
          if (i >= 0 && i < data.length) setHover(i);
        }}
        onMouseLeave={() => setHover(null)}
      >
        <line x1={PAD.left} y1={y(0)} x2={W - PAD.right} y2={y(0)} stroke="var(--border)" />
        <line
          x1={PAD.left} y1={y(ceiling)} x2={W - PAD.right} y2={y(ceiling)}
          stroke="var(--border)" strokeDasharray="2 3"
        />
        <text x={PAD.left - 6} y={y(ceiling) + 3} textAnchor="end"
              fill="var(--faint)" style={{ font: "10px var(--mono)" }}>{ceiling}</text>
        <text x={PAD.left - 6} y={y(0) + 3} textAnchor="end"
              fill="var(--faint)" style={{ font: "10px var(--mono)" }}>0</text>

        <path d={area} fill="var(--accent)" opacity={0.12} />
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />

        {hover !== null && (
          <>
            <line x1={x(hover)} y1={PAD.top} x2={x(hover)} y2={y(0)}
                  stroke="var(--accent-dark)" strokeDasharray="2 2" />
            <circle cx={x(hover)} cy={y(data[hover].n)} r={4.5}
                    fill="var(--accent)" stroke="var(--panel)" strokeWidth={2} />
          </>
        )}

        <circle cx={x(data.length - 1)} cy={y(last.n)} r={4}
                fill="var(--accent)" stroke="var(--panel)" strokeWidth={2} />

        <text x={PAD.left} y={H - 6} fill="var(--faint)" style={{ font: "10px var(--mono)" }}>
          {day(data[0].day)}
        </text>
        <text x={W - PAD.right} y={H - 6} textAnchor="end" fill="var(--faint)"
              style={{ font: "10px var(--mono)" }}>
          {day(last.day)}
        </text>

        <rect x={PAD.left} y={PAD.top} width={plotW} height={plotH} fill="transparent" />
      </svg>

      {hover !== null && (
        <div
          style={{
            position: "absolute",
            left: `${(x(hover) / W) * 100}%`,
            top: `${(y(data[hover].n) / H) * 100}%`,
            transform: "translate(-50%, -130%)",
            background: "var(--raised)",
            border: "1px solid var(--frame)",
            padding: "5px 8px",
            fontSize: 11,
            whiteSpace: "nowrap",
            pointerEvents: "none",
          }}
        >
          {data[hover].day} · <b style={{ color: "var(--accent)", fontFamily: "var(--mono)" }}>
            {data[hover].n}
          </b>
        </div>
      )}

      <details style={{ marginTop: "var(--sp-3)" }}>
        <summary style={{ color: "var(--faint)", fontSize: 11, cursor: "pointer" }}>figures</summary>
        <div className="table-wrap" style={{ marginTop: 9 }}>
          <table className="table">
            <thead><tr><th>day</th><th className="right">events</th></tr></thead>
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
