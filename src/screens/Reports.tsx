import { useState } from 'preact/hooks';
import { t, fmtDay, fmtMonth, monthName, dayName } from '../i18n';
import { useData } from '../store/store';
import { Icon, Chev } from '../components/Icon';
import { TopBar, Seg, Money, Collapse, catName, fmt, Empty } from '../components/ui';
import { BarChart, HBars } from '../components/charts';
import { catById, periodStats, tripSpent } from '../logic/finance';
import { addDays, monthRange, today, weekRange } from '../logic/dates';

type Mode = 'w' | 'm';

function range(mode: Mode, offset: number) {
  if (mode === 'w') {
    const r = weekRange(addDays(today(), offset * 7));
    return { ...r, label: t('rep.week') + ' · ' + fmtDay(r.start), sub: fmtDay(r.start) + ' – ' + fmtDay(r.end) };
  }
  const n = new Date();
  const m = new Date(n.getFullYear(), n.getMonth() + offset, 1);
  const r = monthRange(m.getFullYear(), m.getMonth());
  return { ...r, label: fmtMonth(m.getFullYear(), m.getMonth()), sub: fmtDay(r.start) + ' – ' + fmtDay(r.end), y: m.getFullYear(), m0: m.getMonth() };
}

export function Reports() {
  const d = useData();
  const [mode, setMode] = useState<Mode>('m');
  const [offset, setOffset] = useState(0);
  const r = range(mode, offset);
  const prev = range(mode, offset - 1);
  const st = periodStats(d, r.start, r.end);
  const pst = periodStats(d, prev.start, prev.end);
  const net = st.income - st.expense;
  const diff = pst.expense > 0 ? Math.round(((st.expense - pst.expense) / pst.expense) * 100) : 0;
  const days = mode === 'w' ? 7 : Math.min(new Date().getDate(), 31);
  const elapsed = offset === 0 ? (mode === 'w' ? new Date().getDay() + 1 : days) : mode === 'w' ? 7 : st.daily.length;

  const chartData =
    mode === 'm'
      ? Array.from({ length: 6 }, (_, i) => {
          const rr = range('m', offset - 5 + i) as ReturnType<typeof range> & { m0: number };
          const s = periodStats(d, rr.start, rr.end);
          return { label: monthName(rr.m0, true), v: s.expense, v2: s.income, color: 'var(--accent)', color2: 'var(--blue)', full: rr.label };
        })
      : st.daily.map((v, i) => ({ label: dayName(i, true), v, full: fmtDay(addDays(r.start, i)) }));

  const cats = st.byCat.map((c) => ({ label: c.id === 'c-debtpay' ? t('rep.debtPay') : catName(catById(d, c.id)), v: c.total, sub: Math.round((c.total / Math.max(1, st.expense)) * 100) + '%', color: catById(d, c.id)?.color }));
  const top = cats.slice(0, 5);
  const rest = cats.slice(5);
  const max = cats[0]?.v ?? 1;
  const trips = d.trips.filter((tr) => st.tripIds.includes(tr.id));

  const exportCSV = () => {
    const rows = [['category', 'amount']].concat(cats.map((c) => [String(c.label), String(c.v)]));
    const blob = new Blob(['﻿' + rows.map((x) => x.join(',')).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `report-${r.start}.csv`;
    a.click();
  };

  return (
    <div class="screen no-nav">
      <TopBar back title={t('rep.title')}>
        <button class="icon-btn" aria-label={t('rep.export')} onClick={exportCSV}><Icon name="download" size={18} /></button>
      </TopBar>
      <Seg<Mode> value={mode} onChange={(m) => { setMode(m); setOffset(0); }} options={[['w', t('rep.weekly')], ['m', t('rep.monthly')]]} />
      <div class="row-flex">
        <button class="icon-btn" aria-label="prev" onClick={() => setOffset((o) => o - 1)}><Chev dir="back" /></button>
        <div class="grow col center" style="align-items:center;gap:1px">
          <span style="font-size:16px;font-weight:700">{r.label}</span>
          <span class="xs faint">{r.sub}</span>
        </div>
        <button class="icon-btn" aria-label="next" style={{ opacity: offset >= 0 ? 0.35 : 1 }} disabled={offset >= 0} onClick={() => setOffset((o) => Math.min(0, o + 1))}><Chev dir="fwd" /></button>
      </div>

      <div class="grid2">
        <div class="tile"><span class="xs muted">{t('rep.income')}</span><span style="font-size:20px"><Money v={st.income} class="bold" /></span></div>
        <div class="tile">
          <span class="xs muted">{t('rep.expense')}</span>
          <span style="font-size:20px"><Money v={st.expense} class="bold" /></span>
          {pst.expense > 0 && <span class="xs" style={{ color: diff <= 0 ? 'var(--green-text)' : 'var(--accent-text)' }}>{t('rep.vsPrev', { d: diff <= 0 ? t('rep.less', { p: -diff }) : t('rep.moreP', { p: diff }) })}</span>}
        </div>
        <div class="tile"><span class="xs muted">{t('rep.net')}</span><span style="font-size:20px"><Money v={net} signed class={'bold ' + (net >= 0 ? 'pos' : 'neg')} /></span></div>
        <div class="tile">
          <span class="xs muted">{mode === 'm' ? t('rep.saveRate') : t('rep.avgDay')}</span>
          <span class="n bold" style="font-size:20px">{mode === 'm' ? (st.income > 0 ? Math.round((net / st.income) * 100) + '%' : '—') : fmt(st.expense / Math.max(1, elapsed))}</span>
          {mode === 'm' && <span class="xs faint">{t('rep.ofIncome')}</span>}
        </div>
      </div>

      <div class="card pad col gap12">
        <span class="h2">{mode === 'm' ? t('rep.chartM') : t('rep.chartW')}</span>
        {mode === 'm' && (
          <div class="legend">
            <span><i class="dot" style="background:var(--blue)" />{t('rep.income')}</span>
            <span><i class="dot" style="background:var(--accent)" />{t('rep.expense')}</span>
          </div>
        )}
        <BarChart
          data={chartData}
          height={140}
          highlight={mode === 'm' ? 5 : undefined}
          showValue={mode === 'w'}
          tip={(i) => {
            const x = chartData[i] as (typeof chartData)[number] & { v2?: number; full: string };
            return mode === 'm' ? <span>{x.full} · {t('rep.income')} {fmt(x.v2 ?? 0)} · {t('rep.expense')} {fmt(x.v)}</span> : <span>{x.full} · {fmt(x.v)}</span>;
          }}
        />
      </div>

      <div class="card pad col" style="padding-bottom:6px">
        <div class="between" style="padding-bottom:4px"><span class="h2">{t('rep.byCat')}</span></div>
        {cats.length === 0 ? <Empty /> : <HBars rows={top} max={max} />}
        {rest.length > 0 && (
          <details>
            <summary style="justify-content:center;color:var(--accent-text);font-size:12px;font-weight:600;padding:10px 0">
              {t('rep.showMore', { n: rest.length })}
              <Chev dir="down" size={15} />
            </summary>
            <HBars rows={rest.map((x) => ({ ...x, color: 'var(--sand)' }))} max={max} />
          </details>
        )}
      </div>

      {st.sources.length > 0 && (
        <Collapse title={t('rep.sources')} right={<Money v={st.income} class="small pos" />}>
          {st.sources.map((s) => (
            <div class="row small" style="padding:11px 0"><span class="grow">{catName(catById(d, s.id))}</span><Money v={s.total} class="semi" /></div>
          ))}
        </Collapse>
      )}

      {trips.length > 0 && (
        <div class="col gap8">
          <span class="sec-title">{t('rep.trips')}</span>
          {trips.map((tr) => (
            <a href={'#/trip/' + tr.id} class="card row-flex" style="padding:14px 16px;gap:12px;color:var(--text)">
              <span class="ib" style="background:var(--gold-soft);border-color:transparent;color:var(--gold)"><Icon name="plane" size={18} /></span>
              <span class="grow col gap4"><span class="semi">{tr.name}</span><span class="xs faint">{fmtDay(tr.start)}{tr.end ? ' – ' + fmtDay(tr.end) : ''}</span></span>
              <Money v={tripSpent(d, tr.id)} class="bold" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
