import { t, fmtDay } from '../i18n';
import { useData } from '../store/store';
import type { Priority } from '../store/types';
import { Icon } from '../components/Icon';
import { TopBar, Money, Collapse, fmt, num } from '../components/ui';
import { TipCard } from '../components/TipCard';
import { cashflow, deficitSteps, monthlyPicture, tips, type Step } from '../logic/advisor';

const PRI_COLOR: Record<Priority, string> = { essential: '#CDBEB0', important: '#5B8FD0', optional: '#DD6220' };

function stepText(s: Step): { title: string; sub: string } {
  const vars = { label: s.label, a: fmt(s.a ?? 0), b: fmt(s.b ?? 0) };
  switch (s.kind) {
    case 'trimDaily':
      return { title: s.amount >= (s.a ?? 0) * 0.99 && s.a ? t('step.stopDaily', vars) : t('step.trimDaily', vars), sub: t('adv.saves', { v: fmt(s.amount) }) };
    case 'cardMin':
      return { title: t('step.cardMin', vars), sub: t('adv.saves', { v: fmt(s.amount) }) + ' · ' + t('step.cardMinSub', vars) };
    default:
      return { title: t(('step.' + s.kind) as 'step.pauseSub', vars), sub: t('adv.saves', { v: fmt(s.amount) }) };
  }
}

export function Advice() {
  const d = useData();
  const cf = cashflow(d);
  const steps = deficitSteps(d, cf);
  const mp = monthlyPicture(d);
  const all = tips(d).filter((x) => x.kind !== 'deficit');
  const short = cf.result < 0;
  const leftAfter = steps.length ? steps[steps.length - 1].remaining : -cf.result;
  const segs = [
    { v: Math.min(cf.cash, cf.obligationsTotal), c: '#8C7564' },
    { v: Math.max(0, Math.min(cf.cash - cf.obligationsTotal, cf.livingLeft)), c: '#DD6220' },
    { v: Math.max(0, cf.result), c: '#6CC49A' }
  ];
  const total = Math.max(1, cf.cash, cf.obligationsTotal + cf.livingLeft);

  return (
    <div class="screen no-nav">
      <TopBar back title={t('adv.title')} />

      <div class={'card pad col gap12 ' + (short ? '' : 'hero')} style={short ? 'border-color:rgba(229,72,77,.35);background:linear-gradient(165deg,#2a1414 0%,var(--surface) 65%)' : ''}>
        <div class="between">
          <span class="h2">{t('adv.untilPay')}</span>
          <span class="pill">{t('adv.payOn', { d: fmtDay(cf.nextPay) })}</span>
        </div>
        <div class="col gap4">
          <span class="small muted">{short ? t('adv.shortfall') : t('adv.result')}</span>
          <span style="font-size:34px;line-height:1.1"><Money v={Math.abs(cf.result)} class={'bold ' + (short ? '' : 'pos')} /></span>
          <span class="small" style={{ color: short ? '#F2878A' : 'var(--green-text)' }}>
            {t('adv.perDay', { v: fmt(Math.abs(cf.result) / Math.max(1, cf.daysLeft)), n: cf.daysLeft })}
          </span>
        </div>
        <div class="bar tall" style="gap:2px">
          {segs.map((s) => <div style={{ width: (s.v / total) * 100 + '%', background: s.c, borderRadius: 0 }} />)}
          {short && <div style={{ width: (-cf.result / total) * 100 + '%', background: '#E5484D', borderRadius: 0 }} />}
        </div>
        <div class="col">
          <div class="row small" style="padding:9px 0"><span class="grow">{t('adv.cash')} <span class="xs faint">({t('adv.noEmergency')})</span></span><Money v={cf.cash} class="bold" /></div>
          <div class="row small" style="padding:9px 0"><span class="grow"><i class="dot" style="background:#8C7564;display:inline-block;margin-inline-end:6px" />{t('adv.bills')}</span><Money v={-cf.obligationsTotal} signed class="semi" /></div>
          <div class="row small" style="padding:9px 0"><span class="grow"><i class="dot" style="background:#DD6220;display:inline-block;margin-inline-end:6px" />{t('adv.living')}</span><Money v={-cf.livingLeft} signed class="semi" /></div>
          <div class="row small" style="padding:9px 0"><span class="grow semi">{short ? t('adv.shortfall') : t('adv.result')}</span><Money v={cf.result} signed class={'bold ' + (short ? 'neg' : 'pos')} /></div>
        </div>
        <div class="inset col gap4">
          <span class="xs faint">{t('adv.freePerDay')}</span>
          <span class="semi" style={{ color: cf.freePerDay < 0 ? '#F2878A' : undefined }}>{t('adv.perDay', { v: num(cf.freePerDay), n: cf.daysLeft })}</span>
        </div>
      </div>

      {short && (
        <div class="card pad col gap10">
          <div class="col gap4"><span class="h2">{t('adv.plan')}</span><span class="xs muted">{t('adv.planSub')}</span></div>
          {steps.map((s, i) => {
            const txt = stepText(s);
            return (
              <div class="row" style="align-items:flex-start">
                <span class="n" style={{ width: '26px', height: '26px', borderRadius: '8px', background: i === 0 ? '#DD6220' : 'var(--surface-3)', color: i === 0 ? '#fff' : 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
                <span class="grow col gap4">
                  <span class="semi" style="font-size:14px">{txt.title}</span>
                  <span class="xs muted">{txt.sub}</span>
                </span>
                <span class="col" style="align-items:flex-end;gap:2px">
                  <Money v={s.amount} class="bold pos" />
                  <span class="xs" style={{ color: s.remaining > 0 ? 'var(--faint)' : 'var(--green-text)' }}>{s.remaining > 0 ? t('adv.left', { v: fmt(s.remaining) }) : t('adv.covered')}</span>
                </span>
              </div>
            );
          })}
          {leftAfter > 0 && (
            <div class="row-flex small" style="padding:11px 12px;border-radius:12px;background:var(--danger-soft);border:1px solid rgba(229,72,77,.3);color:var(--danger);line-height:1.6">
              <Icon name="alert" size={17} />
              <span>{t('adv.still', { v: fmt(leftAfter) })}</span>
            </div>
          )}
          <a href="#/bills" class="btn sm outline">{t('adv.setPriorities')}</a>
        </div>
      )}

      {(short || mp.gap < 0) && (
        <Collapse open title={t('adv.dont')}>
          {(['dont.cash', 'dont.bnpl', 'dont.min', 'dont.loan'] as const).map((k) => (
            <div class="row small" style="align-items:flex-start;line-height:1.6">
              <span style="color:var(--danger);margin-top:2px"><Icon name="x" size={16} stroke={2.2} /></span>
              <span class="grow">{t(k)}</span>
            </div>
          ))}
        </Collapse>
      )}

      <Collapse open={short} title={t('adv.billsList')} right={<Money v={cf.obligationsTotal} class="small text2" />}>
        {cf.obligations.length === 0 && <div class="empty">{t('home.noUpcoming')}</div>}
        {cf.obligations.sort((a, b) => a.date.localeCompare(b.date)).map((o) => (
          <div class="row">
            <span class="grow col gap4" style="min-width:0">
              <span class="semi ellipsis" style="font-size:14px">{o.label}{o.count ? <span class="xs faint"> · {o.count}×</span> : null}</span>
              <span class="xs faint">{fmtDay(o.date, true)}</span>
            </span>
            <span class="pill" style={{ color: PRI_COLOR[o.priority], background: 'var(--surface-3)' }}>{t(('pri.' + o.priority) as 'pri.essential')}</span>
            <Money v={o.amount} class="bold" />
          </div>
        ))}
      </Collapse>

      {mp.salary > 0 && (
        <Collapse title={t('adv.monthly')} open={mp.gap < 0} right={<Money v={mp.gap} signed class={'small ' + (mp.gap < 0 ? 'neg' : 'pos')} />}>
          {([
            [t('adv.salary'), mp.salary],
            [t('adv.fixed'), -mp.fixed],
            [t('adv.daily'), -mp.daily],
            [t('adv.mins'), -mp.mins],
            [t('adv.livingB'), -mp.living]
          ] as [string, number][]).map(([k, v]) => (
            <div class="row small" style="padding:10px 0"><span class="grow">{k}</span><Money v={v} signed={v < 0} class="semi" /></div>
          ))}
          <div class="row small" style="padding:10px 0"><span class="grow semi">{t('adv.gap')}</span><Money v={mp.gap} signed class={'bold ' + (mp.gap < 0 ? 'neg' : 'pos')} /></div>
        </Collapse>
      )}

      <div class="col gap8">
        <span class="sec-title">{t('adv.tips')}</span>
        {all.length === 0 && <div class="card empty">{t('adv.noTips')}</div>}
        {all.map((tip) => <TipCard tip={tip} />)}
      </div>
    </div>
  );
}
