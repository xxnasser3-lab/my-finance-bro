import { useMemo } from 'preact/hooks';
import { t, fmtDay } from '../i18n';
import { getData, useData } from '../store/store';
import { Icon, Chev } from '../components/Icon';
import { TopBar, Money, Collapse, catName, fmt, num } from '../components/ui';
import { HBars } from '../components/charts';
import { catById } from '../logic/finance';
import { forecastNext, type Forecast as F } from '../logic/forecast';

function Insights({ f }: { f: F }) {
  const lines: { icon: string; text: string; tone: 'pos' | 'neg' | 'muted'; href?: string }[] = [];
  if (f.result < 0) lines.push({ icon: 'alert', text: t('fc.deficit', { v: fmt(-f.result), d: fmt(-f.perDay) }), tone: 'neg', href: '/bills' });
  else if (f.save > 0 && f.result > 0) lines.push({ icon: 'check', text: f.result >= f.save ? t('fc.afterSave', { s: fmt(f.save), r: fmt(f.result - f.save) }) : t('fc.saveShort', { s: fmt(f.save), r: fmt(f.result) }), tone: f.result >= f.save ? 'pos' : 'muted' });
  if (f.bonus > 0) lines.push({ icon: 'gift', text: t('fc.bonus', { v: fmt(f.bonus) }), tone: 'pos' });
  if (f.fromHistory && f.living > f.livingBudget * 1.05) lines.push({ icon: 'trend', text: t('fc.livingOver', { v: fmt(f.living), b: fmt(f.livingBudget) }), tone: 'neg', href: '/reports' });
  if (f.fromHistory && f.living < f.livingBudget * 0.95) lines.push({ icon: 'check', text: t('fc.livingUnder', { v: fmt(f.living), b: fmt(f.livingBudget) }), tone: 'pos' });
  if (f.irregular > 0) lines.push({ icon: 'info', text: t('fc.irregular', { v: fmt(f.irregular) }), tone: 'muted' });
  if (!lines.length) return null;
  return (
    <div class="card pad-x">
      {lines.map((l) => {
        const body = (
          <>
            <span class={l.tone} style="margin-top:2px"><Icon name={l.icon} size={17} /></span>
            <span class="grow small" style="line-height:1.7">{l.text}</span>
            {l.href && <Chev dir="fwd" size={14} />}
          </>
        );
        return l.href ? <a class="row" style="align-items:flex-start" href={'#' + l.href}>{body}</a> : <div class="row" style="align-items:flex-start">{body}</div>;
      })}
    </div>
  );
}

/** Compact next-month summary for the plan screen. */
export function ForecastCard() {
  const d = getData();
  const f = useMemo(() => forecastNext(d), [d]);
  const short = f.result < 0;
  return (
    <a href="#/forecast" class="card pad col gap10" style={{ color: 'var(--text)', borderColor: short ? 'var(--danger-line)' : undefined }}>
      <div class="between">
        <span class="row-flex h2" style="gap:8px"><Icon name="forecast" size={18} />{t('fc.title')}</span>
        <span class="row-flex xs semi" style="gap:4px;color:var(--accent-text)">{t('fc.details')}<Chev dir="fwd" size={14} /></span>
      </div>
      <div class="between" style="align-items:flex-end">
        <div class="col gap4">
          <span class="xs muted">{short ? t('fc.expectedShort') : t('fc.expectedLeft')}</span>
          <span style="font-size:24px"><Money v={Math.abs(f.result)} class={'bold ' + (short ? 'neg' : 'pos')} /></span>
        </div>
        <span class="xs muted" style="text-align:end">{t('fc.range', { a: fmtDay(f.cycle.start), b: fmtDay(f.cycle.end) })}</span>
      </div>
      <div class="grid2 xs muted">
        <span>{t('fc.in')}: <Money v={f.income} class="text2 semi" /></span>
        <span>{t('fc.out')}: <Money v={f.outflow} class="text2 semi" /></span>
      </div>
    </a>
  );
}

export function Forecast() {
  const d = useData();
  const f = forecastNext(d);
  const short = f.result < 0;
  const outRows = [
    { label: t('fc.fixed'), v: f.fixed, color: 'var(--sand)' },
    { label: t('fc.subs'), v: f.subs, color: 'var(--accent)' },
    { label: t('fc.daily'), v: f.daily, color: 'var(--gold)' },
    { label: t('fc.debts'), v: f.debts, color: 'var(--blue)' },
    { label: t('fc.cards'), v: f.cards, color: 'var(--blue)' },
    { label: f.fromHistory ? t('fc.livingAvg') : t('fc.livingBudget'), v: f.living, color: 'var(--pri-3)' },
    { label: t('fc.trips'), v: f.trips, color: 'var(--gold)' }
  ].filter((r) => r.v > 0);
  return (
    <div class="screen no-nav">
      <TopBar back title={t('fc.title')} fallback="/plan" />

      <div class={'card col gap12 ' + (short ? 'danger-card' : 'hero')} style="padding:18px">
        <div class="between">
          <span class="small text2">{short ? t('fc.expectedShort') : t('fc.expectedLeft')}</span>
          <span class="pill">{t('fc.range', { a: fmtDay(f.cycle.start), b: fmtDay(f.cycle.end) })}</span>
        </div>
        <span style="font-size:34px;line-height:1.1"><Money v={Math.abs(f.result)} class={'bold ' + (short ? 'neg' : 'pos')} /></span>
        <span class="small" style={{ color: short ? 'var(--danger)' : 'var(--green-text)' }}>{t('adv.perDay', { v: num(f.perDay), n: f.cycle.days })}</span>
        <div class="col">
          <div class="row small" style="padding:9px 0"><span class="grow">{t('adv.salary')}</span><Money v={f.salary} class="semi" /></div>
          {f.bonus > 0 && <div class="row small" style="padding:9px 0"><span class="grow">{t('set.bonus')}</span><Money v={f.bonus} signed class="semi pos" /></div>}
          <div class="row small" style="padding:9px 0"><span class="grow">{t('fc.out')}</span><Money v={-f.outflow} signed class="semi" /></div>
          <div class="row small" style="padding:9px 0"><span class="grow semi">{short ? t('fc.expectedShort') : t('fc.expectedLeft')}</span><Money v={f.result} signed class={'bold ' + (short ? 'neg' : 'pos')} /></div>
        </div>
      </div>

      <Insights f={f} />

      <div class="card pad col gap6">
        <div class="between" style="padding-bottom:4px"><span class="h2">{t('fc.where')}</span><Money v={f.outflow} class="bold" /></div>
        <HBars rows={outRows} max={Math.max(1, ...outRows.map((r) => r.v))} />
        {f.fromHistory && <span class="xs faint" style="line-height:1.7;padding-top:6px">{t('fc.livingNote', { b: fmt(f.livingBudget) })}</span>}
      </div>

      {f.topCats.length > 0 && (
        <Collapse open title={t('fc.topCats')}>
          {f.topCats.map((c) => (
            <div class="row small">
              <span class="grow">{catName(catById(d, c.id))}</span>
              <span class="xs faint">{t('fc.avg')}</span>
              <Money v={c.avg} class="semi" />
            </div>
          ))}
        </Collapse>
      )}

      <Collapse title={t('fc.bills')} right={<span class="xs faint n">{f.bills.length}</span>}>
        {f.bills.length === 0 && <div class="empty">{t('empty')}</div>}
        {f.bills.map((b) => (
          <div class="row small">
            <span class="grow col gap4" style="min-width:0">
              <span class="semi ellipsis">{b.label}</span>
              <span class="xs faint">{fmtDay(b.date, true)} · {t(('fcKind.' + b.kind) as 'fcKind.fixed')}</span>
            </span>
            <Money v={b.amount} class="semi" />
          </div>
        ))}
      </Collapse>
      <span class="xs faint" style="line-height:1.7;padding:0 4px">{t('fc.note')}</span>
    </div>
  );
}
