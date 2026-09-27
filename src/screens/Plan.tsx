import { useState } from 'preact/hooks';
import { t, fmtDay, monthName } from '../i18n';
import { useData, update } from '../store/store';
import { Icon } from '../components/Icon';
import { TopBar, Seg, Money, Bar, fmt, Empty } from '../components/ui';
import { LineChart, HBars } from '../components/charts';
import { balance, monthFromNow, planDebts, simulate } from '../logic/finance';
import { freeLabel } from './Debts';

export function Plan() {
  const d = useData();
  const s = d.settings;
  const [living, setLiving] = useState(s.livingBudget);
  const strategy = s.strategy;
  const base = simulate(d, strategy);
  const cur = simulate(d, strategy, living);
  const ava = simulate(d, 'avalanche', living);
  const snow = simulate(d, 'snowball', living);
  const debts = planDebts(d);
  const diff = Number.isFinite(cur.freeIdx) && Number.isFinite(base.freeIdx) ? cur.freeIdx - base.freeIdx : 0;
  const horizon = Math.min(60, Math.max(6, Number.isFinite(Math.max(ava.freeIdx, snow.freeIdx)) ? Math.max(ava.freeIdx, snow.freeIdx) + 1 : 36));
  const pad = (arr: number[]) => Array.from({ length: horizon + 1 }, (_, i) => arr[i] ?? 0);
  const avaS = pad(ava.totals);
  const snowS = pad(snow.totals);
  const label = (i: number) => {
    const { y, m0 } = monthFromNow(i);
    return monthName(m0, true) + ' ' + String(y).slice(2);
  };
  const fm = cur.firstMonth;
  const alloc = [
    { label: t('plan.fixed'), v: fm.fixed, color: '#8C7564' },
    { label: t('plan.mins'), v: fm.mins, color: '#8C7564' },
    { label: t('plan.living'), v: fm.living, color: '#8C7564' },
    { label: fm.save ? t('plan.save') : t('plan.savePaused'), v: fm.save, color: '#5B8FD0' },
    { label: t('plan.extra'), v: fm.extra, color: '#DD6220' }
  ];
  const eAcc = d.accounts.find((a) => a.id === s.emergencyAccountId);
  const eBal = eAcc ? balance(d, eAcc) : 0;
  const bonus = s.bonus;
  const bDebt = (bonus.amount * bonus.toDebt) / 100;
  const bSave = (bonus.amount * bonus.toSavings) / 100;
  const bYou = Math.max(0, bonus.amount - bDebt - bSave);
  const interestGap = Math.abs(snow.interest - ava.interest);

  return (
    <div class="screen">
      <TopBar title={t('plan.title')}>
        <span class="pill green" style="padding:5px 10px"><i class="dot" style="background:var(--green);border-radius:99px" />{t('plan.live')}</span>
      </TopBar>

      {debts.length === 0 ? (
        <div class="card pad col gap8" style="align-items:center;padding:28px"><Icon name="check" size={30} /><span class="semi">{t('plan.noDebts')}</span></div>
      ) : (
        <div class="card hero col gap6" style="padding:20px 18px">
          <span class="small text2">{t('plan.freeIn')}</span>
          <span style="font-size:32px;font-weight:700;line-height:1.2">{freeLabel(cur.freeIdx)}</span>
          <span class="small" style={{ color: diff < 0 ? 'var(--green-text)' : diff > 0 ? 'var(--accent-text)' : 'var(--muted)' }}>
            {diff === 0 ? t('plan.onTrack') : diff < 0 ? t('plan.earlier', { n: -diff, v: fmt(living) }) : t('plan.later', { n: diff, v: fmt(living) })}
          </span>
        </div>
      )}

      {cur.deficit && (
        <div class="card row-flex small" style="padding:12px 14px;border-color:rgba(229,72,77,.35);background:var(--danger-soft);color:var(--danger)">
          <Icon name="alert" size={18} />
          <span>{t('plan.deficit')}</span>
        </div>
      )}

      {debts.length > 0 && (
        <>
          <Seg<'avalanche' | 'snowball'> value={strategy} onChange={(v) => update((x) => ({ ...x, settings: { ...x.settings, strategy: v } }))} options={[['avalanche', t('plan.avalanche')], ['snowball', t('plan.snowball')]]} />
          <span class="small muted" style="margin-top:-6px;line-height:1.7">
            {strategy === 'avalanche' ? t('plan.avaNote') : t('plan.snowNote')} {interestGap > 1 ? t('plan.interestSaved', { v: fmt(interestGap) }) : ''}
          </span>

          <div class="card pad col gap12">
            <div class="col gap4"><span class="h2">{t('plan.chart')}</span><span class="xs muted">{t('plan.chartSub')}</span></div>
            <div class="legend">
              <span><i style="width:14px;height:2px;background:#DD6220;display:inline-block" />{t('plan.avalanche')}</span>
              <span><i style="width:14px;height:2px;background:#5B8FD0;display:inline-block" />{t('plan.snowball')}</span>
            </div>
            <LineChart
              count={horizon + 1}
              height={150}
              initial={Math.min(horizon, 6)}
              series={[
                { values: snowS, color: '#5B8FD0', width: strategy === 'snowball' ? 2.5 : 1.5, opacity: strategy === 'snowball' ? 1 : 0.6 },
                { values: avaS, color: '#DD6220', width: strategy === 'avalanche' ? 2.5 : 1.5, opacity: strategy === 'avalanche' ? 1 : 0.6 }
              ]}
              xLabels={[0, Math.round(horizon / 3), Math.round((2 * horizon) / 3), horizon].map(label)}
              tip={(i) => (
                <span class="col" style="display:flex;flex-direction:column">
                  <b>{label(i)}</b>
                  <span><i class="dot" style="background:#DD6220;display:inline-block" /> {fmt(avaS[i])}</span>
                  <span><i class="dot" style="background:#5B8FD0;display:inline-block" /> {fmt(snowS[i])}</span>
                </span>
              )}
            />
          </div>
        </>
      )}

      <div class="card pad col gap12">
        <div class="between"><span class="h2">{t('plan.whatIf')}</span><span class="xs muted">{t('plan.slide')}</span></div>
        <label class="between small text2">
          <span>{t('plan.livingBudget')}</span>
          <span class="n bold" style="color:var(--text)">{fmt(living)}</span>
        </label>
        <input type="range" min={Math.round(s.livingBudget * 0.4 / 100) * 100} max={Math.round(s.livingBudget * 1.8 / 100) * 100 || 5000} step={100} value={living} onInput={(e) => setLiving(+(e.target as HTMLInputElement).value)} style="width:100%;accent-color:#DD6220" />
        {living !== s.livingBudget && (
          <button class="btn sm outline" onClick={() => update((x) => ({ ...x, settings: { ...x.settings, livingBudget: living } }))}>{t('save')} · {t('set.living')} {fmt(living)}</button>
        )}
      </div>

      <div class="card pad col">
        <div class="between" style="padding-bottom:4px"><span class="h2">{t('plan.alloc')}</span><Money v={fm.salary} class="bold" /></div>
        <HBars rows={alloc} max={Math.max(...alloc.map((a) => a.v), 1)} />
      </div>

      {debts.length > 0 && (
        <div class="card pad-x">
          <div style="padding:14px 0 6px" class="h2">{t('plan.order')}</div>
          {cur.order.map((id, i) => {
            const x = debts.find((y) => y.id === id)!;
            const href = x.kind === 'card' ? '/account/' + id : '/debt/' + id;
            return (
              <a class="row" href={'#' + href}>
                <span class="n" style={{ width: '26px', height: '26px', borderRadius: '8px', background: i === 0 ? '#DD6220' : 'var(--surface-3)', color: i === 0 ? '#fff' : 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
                <span class="grow col gap4" style="min-width:0">
                  <span class="semi ellipsis" style="font-size:14px">{x.name}</span>
                  <span class="xs faint">{t(('kindD.' + x.kind) as 'kindD.loan')}{x.rate > 0 ? ' · ' + +(x.rate * 1200).toFixed(1) + '%' : ''} · <span class="n">{fmt(x.balance)}</span></span>
                </span>
                <span class="small semi text2">{cur.payoff[id] !== undefined ? freeLabel(cur.payoff[id]) : '—'}</span>
              </a>
            );
          })}
          <div class="xs faint" style="padding:10px 0 14px;line-height:1.7">{t('plan.bnplNote')}</div>
        </div>
      )}

      {bonus.enabled && bonus.amount > 0 && (
        <div class="card warm pad col gap12">
          <div class="row-flex">
            <Icon name="gift" size={20} />
            <span class="grow h2">{t('plan.bonus', { d: fmtDay(bonus.nextDate) })}</span>
            <Money v={bonus.amount} class="bold" />
          </div>
          <div class="bar tall" style="gap:2px">
            <div style={{ width: bonus.toDebt + '%', borderRadius: 0 }} />
            <div style={{ width: bonus.toSavings + '%', background: '#5B8FD0', borderRadius: 0 }} />
            <div style={{ width: 100 - bonus.toDebt - bonus.toSavings + '%', background: '#CDBEB0', borderRadius: 0 }} />
          </div>
          {[
            [t('plan.bonusDebt'), bDebt, '#DD6220'],
            [t('plan.bonusSave'), bSave, '#5B8FD0'],
            [t('plan.bonusYou'), bYou, '#CDBEB0']
          ].map(([l, v, c]) => (
            <div class="row-flex small"><i class="dot" style={{ background: c as string }} /><span class="grow text2">{l}</span><Money v={v as number} class="bold" /></div>
          ))}
          <a href="#/settings" class="btn sm outline">{t('edit')}</a>
        </div>
      )}

      <div class="card pad col gap10">
        <div class="between"><span class="h2">{t('plan.emergency')}</span><span class="small muted"><Money v={eBal} class="bold" /> / <span class="n">{fmt(s.emergencyTarget)}</span></span></div>
        <Bar pct={(eBal / Math.max(1, s.emergencyTarget)) * 100} color="#5B8FD0" />
        <span class="xs muted" style="line-height:1.7">{t('plan.emergencyNote')}</span>
      </div>
      {debts.length === 0 && !bonus.enabled && <Empty />}
    </div>
  );
}
