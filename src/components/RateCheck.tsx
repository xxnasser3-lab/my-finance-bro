import { useState } from 'preact/hooks';
import { t } from '../i18n';
import { Icon } from './Icon';
import { Field, NumInput, Seg, fmt } from './ui';
import { BANDS, aprFromFlat, aprFromInstallments, costPer1000, interestLeft, profitInSchedule, rateLevel, type RateKind, type RateLevel } from '../logic/rates';

export const LEVEL_COLOR: Record<RateLevel, string> = { good: 'var(--green)', typical: 'var(--blue)', high: 'var(--gold)', veryHigh: 'var(--danger)' };

/** Where `apr` falls on the good → very high scale for this kind of debt. */
export function RateVerdict({ kind, apr, balance, payment, fixedSchedule }: { kind: RateKind; apr: number; balance?: number; payment?: number; fixedSchedule?: boolean }) {
  const level = rateLevel(kind, apr);
  const [g, ty, h] = BANDS[kind];
  const max = Math.max(h * 1.35, apr * 1.08);
  const segs: [RateLevel, number, number][] = [['good', 0, g], ['typical', g, ty], ['high', ty, h], ['veryHigh', h, max]];
  const left = balance && payment ? (fixedSchedule ? profitInSchedule(balance, payment, apr) : interestLeft(balance, payment, apr)) : undefined;
  return (
    <div class="col gap10">
      <div class="between" style="align-items:baseline">
        <span class="row-flex" style="gap:8px;align-items:baseline">
          <span class="n bold" style="font-size:26px">{apr.toFixed(apr < 10 ? 2 : 1)}%</span>
          <span class="xs muted">{t('rate.apr')}</span>
        </span>
        <span class="pill" style={{ color: LEVEL_COLOR[level], background: 'var(--surface-3)', fontSize: '11px' }}>{t(('rate.lvl.' + level) as 'rate.lvl.good')}</span>
      </div>
      <div dir="ltr" style="position:relative;display:flex;gap:2px;height:8px">
        {segs.map(([l, a, b]) => <span style={{ flex: `${Math.max(0.001, b - a)} 1 0`, background: LEVEL_COLOR[l], opacity: l === level ? 1 : 0.35, borderRadius: '2px' }} />)}
        <span style={{ position: 'absolute', top: '-5px', left: `calc(${Math.min(100, (apr / max) * 100)}% - 2px)`, width: '4px', height: '18px', borderRadius: '2px', background: 'var(--text)' }} />
      </div>
      <div dir="ltr" class="xs faint n" style="position:relative;height:14px">
        {[0, g, ty, h].map((v, i) => <span style={{ position: 'absolute', left: (v / max) * 100 + '%', transform: i ? 'translateX(-50%)' : 'none' }}>{v}%</span>)}
      </div>
      <span class="small text2" style="line-height:1.7">{t(('rate.msg.' + level) as 'rate.msg.good', { k: t(('rate.kind.' + kind) as 'rate.kind.personal'), g: String(g), t: String(ty) })}</span>
      <div class="grid2">
        <div class="inset col gap4"><span class="xs faint">{t('rate.per1000')}</span><span class="semi n">{fmt(costPer1000(apr))}</span></div>
        {left !== undefined && <div class="inset col gap4"><span class="xs faint">{t('rate.left')}</span><span class="semi n">{left === null ? '∞' : fmt(left)}</span></div>}
      </div>
    </div>
  );
}

type Mode = 'flat' | 'inst';

/** Turn how an offer is quoted (flat rate, or installments) into its real APR. */
export function RateCalc({ onApr, initial }: { onApr?: (apr: number) => void; initial?: { amount?: number; payment?: number; n?: number } }) {
  const [mode, setMode] = useState<Mode>(initial?.payment ? 'inst' : 'flat');
  const [flat, setFlat] = useState<number | undefined>();
  const [months, setMonths] = useState<number | undefined>(initial?.n ?? 60);
  const [amount, setAmount] = useState<number | undefined>(initial?.amount);
  const [payment, setPayment] = useState<number | undefined>(initial?.payment);
  const apr =
    mode === 'flat'
      ? flat !== undefined && !Number.isNaN(flat) && months ? aprFromFlat(flat, Math.round(months)) : null
      : amount && payment && months ? aprFromInstallments(amount, payment, Math.round(months)) : null;
  const total = mode === 'inst' && payment && months ? payment * months : amount && flat !== undefined && months ? amount * (1 + (flat / 100) * (months / 12)) : null;
  return (
    <div class="col gap10">
      <Seg<Mode> value={mode} onChange={setMode} options={[['flat', t('rate.fromFlat')], ['inst', t('rate.fromInst')]]} />
      {mode === 'flat' ? (
        <div class="grid2">
          <Field label={t('rate.flat')}><NumInput value={flat} onInput={setFlat} placeholder="4" /></Field>
          <Field label={t('rate.months')}><NumInput value={months} onInput={setMonths} /></Field>
        </div>
      ) : (
        <>
          <Field label={t('rate.received')} hint={t('rate.receivedHint')}><NumInput value={amount} onInput={setAmount} /></Field>
          <div class="grid2">
            <Field label={t('debt.installment')}><NumInput value={payment} onInput={setPayment} /></Field>
            <Field label={t('rate.months')}><NumInput value={months} onInput={setMonths} /></Field>
          </div>
        </>
      )}
      {apr !== null && (
        <div class="inset col gap6">
          <div class="between"><span class="small">{t('rate.real')}</span><span class="n bold" style="font-size:18px">{apr.toFixed(2)}%</span></div>
          {mode === 'flat' && flat ? <span class="xs faint" style="line-height:1.6">{t('rate.flatNote', { f: String(flat), a: apr.toFixed(1) })}</span> : null}
          {total && amount ? <span class="xs faint">{t('rate.totalPay', { v: fmt(total), p: fmt(total - amount) })}</span> : null}
          {onApr && <button class="btn sm outline" onClick={() => onApr(apr)}><Icon name="check" size={15} />{t('rate.use')}</button>}
        </div>
      )}
      {mode === 'inst' && amount && payment && months && apr === null ? <span class="xs neg">{t('rate.badInst')}</span> : null}
    </div>
  );
}
