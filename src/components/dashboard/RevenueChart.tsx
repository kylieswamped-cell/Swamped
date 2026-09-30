"use client";

import { useEffect, useRef, useState } from "react";
import type { RevenuePoint } from "@/lib/dashboard/stats";
import { formatMoney } from "@/lib/quotes/totals";

// Geometry from the Figma frame (1063 × 280 plot area).
const HEIGHT = 280;
const LEFT = 50;
const RIGHT_PAD = 20;
const TOP = 16.67;
const BOTTOM = 250;
const STEPS = 7;
const INK = "#0b192c";

const compactMoney = (n: number) => (n === 0 ? "$0" : n >= 1000 ? `$${+(n / 1000).toFixed(1)}k` : `$${n}`);

/** Smallest "nice" step (1, 2, 2.5, 5 × 10ⁿ) so STEPS of it cover `max`; never below $5k. */
function niceStep(max: number) {
  const raw = Math.max(max / STEPS, 5000);
  const mag = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
}

/** Monotone cubic path (Fritsch–Carlson): smooth, and never overshoots below $0. */
function monotonePath(pts: [number, number][]) {
  const n = pts.length;
  if (n < 2) return "";
  const dx = pts.slice(1).map((p, i) => p[0] - pts[i][0]);
  const slope = pts.slice(1).map((p, i) => (p[1] - pts[i][1]) / dx[i]);
  const tangent = pts.map((_, i) => {
    if (i === 0) return slope[0];
    if (i === n - 1) return slope[n - 2];
    return slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  });
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += ` C${pts[i][0] + h},${pts[i][1] + tangent[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - tangent[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return d;
}

export default function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1063);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    // The container is sized by the layout alone (min-w-0 + overflow-hidden),
    // so the SVG's own width can never feed back into this measurement.
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.floor(entry.contentRect.width);
      setWidth((prev) => (Math.abs(prev - next) > 1 ? next : prev));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const step = niceStep(Math.max(...data.map((d) => d.revenue), 0));
  const maxY = step * STEPS;
  const right = width - RIGHT_PAD;
  const x = (i: number) => LEFT + ((right - LEFT) * i) / Math.max(data.length - 1, 1);
  const y = (v: number) => BOTTOM - ((BOTTOM - TOP) * v) / maxY;

  const points = data.map((d, i) => [x(i), y(d.revenue)] as [number, number]);
  const line = monotonePath(points);
  const area = `${line} L${right},${BOTTOM} L${LEFT},${BOTTOM} Z`;
  const active = hover === null ? null : data[hover];

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * (right - LEFT);
    const i = Math.round((px / (right - LEFT)) * (data.length - 1));
    setHover(Math.min(Math.max(i, 0), data.length - 1));
  };

  return (
    <section className="flex flex-col gap-6 rounded-lg border border-[#e2e8f0] bg-white p-6 drop-shadow-[0_0.63px_0.63px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-[16px] font-bold leading-[19.2px] tracking-[0.031px] text-[#0f172a]">Revenue Performance</h2>
          <p className="mt-[3px] text-[13px] leading-[15.6px] text-[#64748b]">Last 12 months overview</p>
        </div>
        <p className="flex items-center gap-2 text-[12px] font-medium leading-[18px] tracking-[0.059px] text-[#475569]">
          <span className="size-2.5 rounded-full" style={{ background: INK }} />
          Actual Revenue
        </p>
      </div>

      <div ref={wrap} className="relative h-[280px] w-full min-w-0 overflow-hidden">
        <svg width={width} height={HEIGHT} className="block" role="img" aria-label="Revenue over the last 12 months">
          {Array.from({ length: STEPS + 1 }, (_, i) => {
            const v = step * i;
            return (
              <g key={v}>
                {i > 0 && <line x1={LEFT} x2={right} y1={y(v)} y2={y(v)} stroke="#f1f5f9" strokeWidth={1} />}
                <text x={LEFT - 4} y={y(v)} dy="0.32em" textAnchor="end" fontSize={10} fill="#94a3b8">
                  {compactMoney(v)}
                </text>
              </g>
            );
          })}
          <path d={area} fill={INK} fillOpacity={0.04} />
          <path d={line} fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          {data.map((d, i) => (
            <text key={d.label} x={x(i)} y={BOTTOM + 13} textAnchor="middle" fontSize={10} fill="#94a3b8">
              {d.month}
            </text>
          ))}
          {hover !== null && (
            <g pointerEvents="none">
              <line x1={x(hover)} x2={x(hover)} y1={TOP} y2={BOTTOM} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="3 3" />
              <circle cx={x(hover)} cy={y(data[hover].revenue)} r={5} fill={INK} stroke="#fff" strokeWidth={2} />
            </g>
          )}
          {/* Hit area larger than the line so hovering anywhere in the plot works. */}
          <rect
            x={LEFT}
            y={TOP}
            width={Math.max(right - LEFT, 0)}
            height={BOTTOM - TOP}
            fill="transparent"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>

        {active && hover !== null && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-[12px] shadow-lg"
            style={{ left: Math.min(Math.max(x(hover), 70), width - 70), top: y(active.revenue) - 10 }}
          >
            <p className="font-medium text-[#64748b]">{active.label}</p>
            <p className="mt-0.5 text-[14px] font-bold text-[#0f172a]">{formatMoney(active.revenue)}</p>
          </div>
        )}

        <table className="sr-only">
          <caption>Revenue by month, last 12 months</caption>
          <thead>
            <tr>
              <th>Month</th>
              <th>Revenue</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label}>
                <td>{d.label}</td>
                <td>{formatMoney(d.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
