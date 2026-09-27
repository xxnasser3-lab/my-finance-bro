import type { ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { fmt } from './ui';

function useWidth<T extends HTMLElement>(): [preact.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(320);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(120, e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export function short(v: number): string {
  const a = Math.abs(v);
  const sign = v < 0 ? '−' : '';
  if (a >= 1000000) return sign + (a / 1000000).toFixed(a >= 10000000 ? 0 : 1).replace(/\.0$/, '') + 'm';
  if (a >= 1000) return sign + (a / 1000).toFixed(a >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k';
  return sign + String(Math.round(a));
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * p;
}

export interface Series {
  values: (number | null)[];
  color: string;
  width?: number;
  dash?: string;
  fill?: boolean;
  marker?: boolean;
  opacity?: number;
}

/** Multi-series line chart with a crosshair tooltip. Time always runs left→right. */
export function LineChart({
  series, count, height = 150, xLabels, tip, yMax, initial, badge
}: {
  series: Series[];
  count: number;
  height?: number;
  xLabels: string[];
  tip: (i: number) => ComponentChildren;
  yMax?: number;
  initial?: number;
  badge?: ComponentChildren;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hi, setHi] = useState<number | null>(initial ?? null);
  const axisW = 30;
  const pw = w - axisW;
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  // Scale covers negatives too (e.g. an overdrawn balance), with 0 as the fill baseline.
  const rawMin = Math.min(0, ...all);
  const rawMax = yMax ?? Math.max(1, ...all);
  const step = niceMax((rawMax - rawMin) / 4);
  const lo = rawMin < 0 ? Math.floor(rawMin / step) * step : 0;
  const max = Math.max(lo + step, Math.ceil(rawMax / step) * step);
  const span = max - lo;
  const ticks: number[] = [];
  for (let v = lo; v <= max + step / 1000; v += step) ticks.push(v);
  const x = (i: number) => (count <= 1 ? 0 : (i / (count - 1)) * pw);
  const y = (v: number) => height - ((Math.max(lo, Math.min(max, v)) - lo) / span) * height;
  const base = y(0);
  const path = (vals: (number | null)[]) => {
    let d = '';
    let pen = false;
    vals.forEach((v, i) => {
      if (v === null) {
        pen = false;
        return;
      }
      d += (pen ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1) + ' ';
      pen = true;
    });
    return d;
  };
  const onMove = (e: PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left) / pw) * (count - 1));
    setHi(Math.max(0, Math.min(count - 1, i)));
  };
  const hiY = hi !== null ? series.find((s) => s.marker !== false && s.values[hi] !== null && s.values[hi] !== undefined) : undefined;
  return (
    <div class="chart" ref={ref} style={{ height: height + 26 + 'px' }}>
      <svg width={pw} height={height} style="position:absolute;left:0;top:0;overflow:visible">
        {ticks.map((v) => (
          <line x1="0" x2={pw} y1={y(v)} y2={y(v)} stroke="#1F1814" />
        ))}
        <line x1="0" x2={pw} y1={base} y2={base} stroke="#3A2E25" />
        {hi !== null && <line x1={x(hi)} x2={x(hi)} y1="0" y2={height} stroke="#5A4A3F" stroke-dasharray="3 3" />}
        {series.map((s) => {
          if (!s.fill) return null;
          const idx = s.values.map((v, i) => (v === null ? -1 : i)).filter((i) => i >= 0);
          if (!idx.length) return null;
          return <path d={path(s.values) + `L${x(idx[idx.length - 1])} ${base} L${x(idx[0])} ${base} Z`} fill={s.color} opacity="0.15" />;
        })}
        {series.map((s) => (
          <path d={path(s.values)} fill="none" stroke={s.color} stroke-width={s.width ?? 2} stroke-dasharray={s.dash} stroke-linejoin="round" stroke-linecap="round" opacity={s.opacity ?? 1} />
        ))}
        {hi !== null &&
          series.map((s) =>
            s.marker !== false && s.values[hi] !== null && s.values[hi] !== undefined ? (
              <circle cx={x(hi)} cy={y(s.values[hi] as number)} r="4.5" fill={s.color} stroke="#16110E" stroke-width="2" />
            ) : null
          )}
      </svg>
      <div style={{ position: 'absolute', left: 0, top: 0, width: pw + 'px', height: height + 'px' }} onPointerMove={onMove} onPointerDown={onMove} />
      {ticks.map((v) => (
        <span class="axis n" style={{ position: 'absolute', right: 0, top: y(v) - 7 + 'px', lineHeight: '14px' }}>{short(v)}</span>
      ))}
      <div class="axis" style={{ position: 'absolute', left: 0, top: height + 8 + 'px', width: pw + 'px', display: 'flex', justifyContent: 'space-between', overflow: 'hidden', whiteSpace: 'nowrap', gap: '4px' }}>
        {xLabels.map((l) => (
          <span>{l}</span>
        ))}
      </div>
      {badge}
      {hi !== null && (
        <div class="tip" dir="auto" style={{ left: Math.min(Math.max(x(hi), 60), pw - 60) + 'px', top: (hiY ? y(hiY.values[hi] as number) : 20) + 'px' }}>
          {tip(hi)}
        </div>
      )}
    </div>
  );
}

export interface BarDatum {
  label: string;
  v: number;
  v2?: number;
  color?: string;
  color2?: string;
}

/** Vertical bars (single or paired) with tap/hover tooltip and optional reference line. */
export function BarChart({
  data, height = 130, tip, refLine, highlight, onSelect, showValue
}: {
  data: BarDatum[];
  height?: number;
  tip?: (i: number) => ComponentChildren;
  refLine?: number;
  highlight?: number;
  onSelect?: (i: number) => void;
  showValue?: boolean;
}) {
  const [hi, setHi] = useState<number | null>(highlight ?? null);
  useEffect(() => setHi(highlight ?? null), [highlight]);
  const max = niceMax(Math.max(1, refLine ?? 0, ...data.map((d) => Math.max(d.v, d.v2 ?? 0))) * 1.05);
  const paired = data.some((d) => d.v2 !== undefined);
  const h = (v: number) => (v / max) * height + 'px';
  return (
    <div class="chart" style={{ height: height + 24 + 'px' }}>
      <div style={{ position: 'absolute', left: 0, right: '30px', top: 0, height: height + 'px', borderBottom: '1px solid #2E241D', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around' }}>
        {refLine !== undefined && <div style={{ position: 'absolute', left: 0, right: 0, bottom: h(refLine), borderTop: '1px dashed #5A4A3F' }} />}
        {data.map((d, i) => {
          const on = hi === i;
          return (
            <div
              style={{ flex: '1 1 0', height: height + 'px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '3px', position: 'relative', opacity: hi === null || on || !paired ? 1 : 0.45 }}
              onPointerEnter={() => setHi(i)}
              onPointerDown={() => {
                setHi(i);
                onSelect?.(i);
              }}
            >
              {showValue && on && !paired && (
                <span class="n" style={{ position: 'absolute', bottom: `calc(${h(d.v)} + 4px)`, fontSize: '11px', fontWeight: 700 }}>{fmt(d.v)}</span>
              )}
              {d.v2 !== undefined && <div style={{ width: '13px', height: h(d.v2), borderRadius: '4px 4px 0 0', background: d.color2 ?? '#5B8FD0' }} />}
              <div style={{ width: paired ? '13px' : 'min(26px, 60%)', height: h(d.v), minHeight: d.v > 0 ? '2px' : 0, borderRadius: '4px 4px 0 0', background: d.color ?? (on && !paired ? '#DD6220' : '#8C7564') }} />
            </div>
          );
        })}
      </div>
      <div class="axis" style={{ position: 'absolute', right: 0, top: '-6px', height: height + 12 + 'px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <span class="n">{short(max)}</span>
        <span class="n">{short(max / 2)}</span>
        <span class="n">0</span>
      </div>
      <div class="axis" style={{ position: 'absolute', left: 0, right: '30px', top: height + 7 + 'px', display: 'flex', justifyContent: 'space-around' }}>
        {data.map((d, i) => (
          <span style={{ flex: '1 1 0', textAlign: 'center', color: hi === i ? '#F5EEE6' : undefined, fontWeight: hi === i ? 700 : 400 }}>{d.label}</span>
        ))}
      </div>
      {tip && hi !== null && (
        <div class="tip" dir="auto" style={{ left: `clamp(70px, calc(${((hi + 0.5) / data.length) * 100}% - ${((hi + 0.5) / data.length) * 30}px), calc(100% - 100px))`, top: '4px', transform: 'translate(-50%, 0)' }}>
          {tip(hi)}
        </div>
      )}
    </div>
  );
}

export function HBars({ rows, max, onRow }: { rows: { label: ComponentChildren; v: number; sub?: string; color?: string }[]; max?: number; onRow?: (i: number) => void }) {
  const m = max ?? Math.max(1, ...rows.map((r) => r.v));
  return (
    <div class="col">
      {rows.map((r, i) => (
        <div class="col gap6" style="padding:7px 0" onClick={onRow ? () => onRow(i) : undefined}>
          <div class="between small">
            <span class="ellipsis">{r.label}</span>
            <span style="white-space:nowrap">
              <span class="n bold">{fmt(r.v)}</span> {r.sub && <span class="n xs faint">{r.sub}</span>}
            </span>
          </div>
          <div class="bar">
            <div style={{ width: (r.v / m) * 100 + '%', background: r.color ?? (i === 0 ? '#DD6220' : '#8C7564') }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Gauge({ pct, size = 112 }: { pct: number; size?: number }) {
  const r = size / 2 - 8;
  const len = Math.PI * r;
  const p = Math.max(0, Math.min(1, pct));
  const h = size / 2 + 6;
  return (
    <div style={{ position: 'relative', width: size + 'px', height: h + 'px', flexShrink: 0 }}>
      <svg width={size} height={h} viewBox={`0 0 ${size} ${h}`}>
        <path d={`M8 ${size / 2} A${r} ${r} 0 0 1 ${size - 8} ${size / 2}`} fill="none" stroke="#2A211B" stroke-width="9" stroke-linecap="round" />
        <path d={`M8 ${size / 2} A${r} ${r} 0 0 1 ${size - 8} ${size / 2}`} fill="none" stroke={p > 0.7 ? '#E5484D' : '#DD6220'} stroke-width="9" stroke-linecap="round" stroke-dasharray={`${(len * p).toFixed(1)} ${len.toFixed(1)}`} />
      </svg>
      <span class="n bold" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, textAlign: 'center', fontSize: '18px' }}>{Math.round(p * 100)}%</span>
    </div>
  );
}
