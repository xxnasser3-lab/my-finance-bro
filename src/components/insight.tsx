import { useState } from 'preact/hooks';
import { t, fmtDay } from '../i18n';
import { getData, update } from '../store/store';
import { Icon } from './Icon';
import { Seg, fmt } from './ui';
import { LineChart } from './charts';
import type { PriceHistoryPoint, PricesFile, StockStats } from '../logic/investments';
import { PERIODS, type Insight, type Period } from '../logic/market';

export type DispCur = 'SAR' | 'USD';

export function dispCur(): DispCur {
  return getData().settings.invCurrency ?? 'SAR';
}

/** SAR amount → the currency investments are displayed in. */
export function toDisp(sar: number, prices: PricesFile, cur: DispCur = dispCur()): number {
  return cur === 'USD' ? sar / prices.usdSar : sar;
}

export function curLabel(cur: DispCur = dispCur()): string {
  return cur === 'USD' ? '$' : t('cur');
}

export function CurToggle() {
  const cur = dispCur();
  return (
    <div class="seg" style="width:104px;flex-shrink:0" role="tablist" aria-label={t('inv.showIn')}>
      {(['SAR', 'USD'] as DispCur[]).map((c) => (
        <button type="button" role="tab" aria-selected={cur === c} class={cur === c ? 'on' : ''} style="height:30px;font-size:12px" onClick={() => update((x) => ({ ...x, settings: { ...x.settings, invCurrency: c } }))}>
          {c === 'USD' ? '$' : t('cur')}
        </button>
      ))}
    </div>
  );
}

export function pct(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined) return '—';
  return '⁦' + (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(digits) + '%⁩';
}

const tone = (v: number | null | undefined) => (v === null || v === undefined ? 'muted' : v >= 0 ? 'pos' : 'neg');

type Range = '1m' | '3m' | '6m' | '1y';

/** Price chart with 1M / 3M / 6M / 1Y tabs. `scale` converts stored values for display. */
export function PriceChart({ history, weekly, scale = 1, unit }: { history: PriceHistoryPoint[]; weekly?: PriceHistoryPoint[]; scale?: number; unit?: string }) {
  const [range, setRange] = useState<Range>(history.length >= 63 ? '3m' : '1m');
  const pts = range === '1y' && weekly && weekly.length > 1 ? weekly : history.slice(-({ '1m': 22, '3m': 64, '6m': 130, '1y': 130 } as const)[range]);
  if (pts.length < 2) return null;
  const vals = pts.map((p) => p.v * scale);
  const up = vals[vals.length - 1] >= vals[0];
  const color = up ? 'var(--green)' : 'var(--accent)';
  const change = (vals[vals.length - 1] / vals[0] - 1) * 100;
  const ranges: [Range, string][] = [['1m', t('rng.1m')], ['3m', t('rng.3m')], ['6m', t('rng.6m')]];
  if (weekly && weekly.length > 1) ranges.push(['1y', t('rng.1y')]);
  return (
    <div class="col gap10">
      <Seg<Range> value={range} onChange={setRange} options={ranges} />
      <LineChart
        fit
        count={vals.length}
        height={120}
        initial={vals.length - 1}
        series={[{ values: vals, color, fill: true }]}
        xLabels={[fmtDay(pts[0].date), fmtDay(pts[Math.floor(pts.length / 2)].date), fmtDay(pts[pts.length - 1].date)]}
        tip={(i) => <span>{fmtDay(pts[i].date)} · {fmt(vals[i], vals[i] < 100 ? 2 : 0)}{unit ? ' ' + unit : ''}</span>}
      />
      <span class={'xs ' + tone(change)}>{t('ins.rangeChange', { p: pct(change) })}</span>
    </div>
  );
}

/** Where today's price sits between the 52-week low and high. */
export function RangeBar({ ins, price, scale = 1, digits = 2 }: { ins: Insight; price: number; scale?: number; digits?: number }) {
  const s = ins.stats;
  return (
    <div class="col gap8">
      <div class="between xs muted" dir="ltr"><span>{t('ins.low52')}</span><span>{t('ins.high52')}</span></div>
      <div style="position:relative;height:10px;border-radius:999px;background:linear-gradient(90deg,var(--accent-soft),var(--green-soft));border:1px solid var(--line)" dir="ltr">
        <span style={{ position: 'absolute', top: '-5px', left: `calc(${ins.rangePos}% - 9px)`, width: '18px', height: '18px', borderRadius: '999px', background: 'var(--text)', border: '3px solid var(--surface)', boxShadow: '0 1px 4px rgba(0,0,0,.35)' }} />
      </div>
      <div class="between small n" dir="ltr"><span class="semi">{fmt(s.l52 * scale, digits)}</span><span class="bold" style="color:var(--text)">{fmt(price * scale, digits)}</span><span class="semi">{fmt(s.h52 * scale, digits)}</span></div>
      <span class="xs text2" style="line-height:1.7">{t('ins.rangeText', { h: Math.abs(ins.fromHigh).toFixed(1) + '%', l: Math.abs(ins.fromLow).toFixed(1) + '%', p: Math.round(ins.rangePos) })}</span>
    </div>
  );
}

export function PerfGrid({ stats }: { stats: StockStats }) {
  return (
    <div class="grid4" style="gap:6px">
      {PERIODS.map((p) => (
        <div class="inset col gap4" style="padding:8px;align-items:center">
          <span class="xs faint">{t(('per.' + p) as 'per.r1d')}</span>
          <span class={'small bold n ' + tone(stats[p])}>{pct(stats[p])}</span>
        </div>
      ))}
    </div>
  );
}

/** Plain-language comparison lines. No verdict, just where it stands. */
export function InsightLines({ ins, price }: { ins: Insight; price: number }) {
  const s = ins.stats;
  const lines: { icon: string; text: string }[] = [];
  if (ins.trend) {
    const k = ins.trend === 'up' ? 'ins.trendUp' : ins.trend === 'down' ? 'ins.trendDown' : 'ins.trendMixed';
    lines.push({ icon: 'trend', text: t(k, { a: pct(s.ma50 ? (price / s.ma50 - 1) * 100 : null), b: pct(s.ma200 ? (price / s.ma200 - 1) * 100 : null) }) });
  }
  if (ins.volLevel && s.vol !== null) {
    // volPct = share of stocks that are calmer; for a calm stock say how many it's calmer than
    const p = ins.volLevel === 'low' ? 100 - (ins.volPct ?? 0) : ins.volPct ?? 0;
    lines.push({ icon: 'bolt', text: t(('ins.vol.' + ins.volLevel) as 'ins.vol.low', { v: s.vol, p }) });
  }
  for (const m of ins.vsMarket) {
    lines.push({ icon: 'reports', text: t(m.diff >= 0 ? 'ins.beatMarket' : 'ins.lagMarket', { per: t(('perL.' + m.period) as 'perL.r1m'), a: pct(m.stock), b: pct(m.market), d: Math.abs(m.diff).toFixed(1) }) });
  }
  if (ins.sector) {
    const sec = t(('sec.' + ins.sector.key) as 'sec.tech');
    const r = ins.sector.r1y ?? ins.sector.r3m;
    const per: Period = ins.sector.r1y ? 'r1y' : 'r3m';
    if (r) lines.push({ icon: 'grid', text: t('ins.sectorRank', { r: r.rank, n: r.count, s: sec, per: t(('perL.' + per) as 'perL.r1m'), avg: pct(r.avg) }) });
  }
  if (ins.beat) lines.push({ icon: 'people', text: t('ins.beatAll', { p: ins.beat.pct, per: t(('perL.' + ins.beat.period) as 'perL.r1m') }) });
  return (
    <div class="col">
      {lines.map((l) => (
        <div class="row small" style="align-items:flex-start;line-height:1.7">
          <span class="muted" style="margin-top:3px"><Icon name={l.icon} size={16} /></span>
          <span class="grow">{l.text}</span>
        </div>
      ))}
    </div>
  );
}

export function Disclaimer() {
  return (
    <div class="row-flex xs faint" style="align-items:flex-start;line-height:1.7;padding:0 4px">
      <Icon name="info" size={15} style="margin-top:2px" />
      <span>{t('ins.disclaimer')}</span>
    </div>
  );
}
