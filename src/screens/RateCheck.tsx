import { useState } from 'preact/hooks';
import { t } from '../i18n';
import { useData } from '../store/store';
import { TopBar, Field, NumInput, Seg } from '../components/ui';
import { RateCalc, RateVerdict } from '../components/RateCheck';
import type { RateKind } from '../logic/rates';
import { creditAccounts, debtRemaining, oweDebts } from '../logic/finance';

/** Standalone "is this rate good?" check for an offer, before taking it. */
export function RateCheck() {
  const d = useData();
  const [kind, setKind] = useState<RateKind>('personal');
  const [apr, setApr] = useState<number | undefined>();
  const [monthly, setMonthly] = useState<number | undefined>();
  const effective = kind === 'card' ? (monthly !== undefined && !Number.isNaN(monthly) ? monthly * 12 : undefined) : apr;
  const mine = [
    ...oweDebts(d).filter((x) => (x.annualRate ?? 0) > 0 && debtRemaining(d, x) > 0).map((x) => ({ name: x.name, apr: x.annualRate! })),
    ...creditAccounts(d).filter((a) => a.credit).map((a) => ({ name: a.name, apr: a.credit!.monthlyRate * 12 }))
  ].sort((a, b) => b.apr - a.apr);
  return (
    <div class="screen no-nav">
      <TopBar back title={t('rate.title')} fallback="/debts" />
      <span class="small text2" style="line-height:1.7">{t('rate.intro')}</span>
      <Seg<RateKind> value={kind} onChange={setKind} options={[['personal', t('rate.kindS.personal')], ['car', t('rate.kindS.car')], ['mortgage', t('rate.kindS.mortgage')], ['card', t('rate.kindS.card')]]} />
      <div class="card pad col gap12">
        {kind === 'card' ? (
          <Field label={t('acc.rate')}><NumInput value={monthly} onInput={setMonthly} placeholder="2.25" /></Field>
        ) : (
          <Field label={t('rate.aprIn')} hint={t('rate.aprHint')}><NumInput value={apr} onInput={setApr} /></Field>
        )}
        {effective !== undefined && !Number.isNaN(effective) && effective >= 0 && <RateVerdict kind={kind} apr={effective} />}
      </div>
      {kind !== 'card' && (
        <div class="card pad col gap10">
          <div class="col gap4"><span class="h2">{t('rate.calc')}</span><span class="xs muted" style="line-height:1.6">{t('rate.calcSub')}</span></div>
          <RateCalc onApr={setApr} />
        </div>
      )}
      {mine.length > 0 && (
        <div class="card pad-x">
          <div class="h2" style="padding:14px 0 4px">{t('rate.yours')}</div>
          {mine.map((m) => (
            <div class="row small"><span class="grow">{m.name}</span><span class="n semi">{m.apr.toFixed(1)}%</span></div>
          ))}
          <div class="xs faint" style="padding:8px 0 14px;line-height:1.7">{t('rate.yoursNote')}</div>
        </div>
      )}
      <span class="xs faint" style="line-height:1.7;padding:0 4px">{t('rate.disclaimer')}</span>
    </div>
  );
}
