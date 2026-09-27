import { t, fmtDay } from '../i18n';
import { useData, update } from '../store/store';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/Avatar';
import { TopBar, Money, Collapse, Bar, fmt, Empty, confirmDo } from '../components/ui';
import { TxRow } from '../components/TxRow';
import { debtPayment, debtRemaining, installmentsPaid, nextInstallmentDate, simulate } from '../logic/finance';
import { navigate } from '../router';
import { openTx } from '../sheets';
import { freeLabel, PROVIDER_COLORS, providerShort } from './Debts';
import { RateCalc, RateVerdict } from '../components/RateCheck';

export function DebtDetail({ id }: { id: string }) {
  const d = useData();
  const debt = d.debts.find((x) => x.id === id);
  if (!debt) return <div class="screen no-nav"><TopBar back title="" fallback="/debts" /><Empty /></div>;
  const rem = debtRemaining(d, debt);
  const owed = debt.kind === 'person' && debt.person?.direction === 'owed';
  const paid = installmentsPaid(d, debt);
  const next = nextInstallmentDate(d, debt);
  const plan = simulate(d, d.settings.strategy);
  const payoffIdx = plan.payoff[debt.id];
  const history = d.txs.filter((x) => x.debtId === id).sort((a, b) => (b.date + (b.time ?? '')).localeCompare(a.date + (a.time ?? '')));
  const pay = debtPayment(d, debt) || undefined;
  const payAcc = d.settings.salaryAccountId;
  const pct = debt.principal > 0 ? ((debt.principal - rem) / debt.principal) * 100 : 0;

  const actions = owed
    ? [
        { label: t('debt.received'), primary: true, fn: () => openTx({ type: 'income', debtId: id, categoryId: 'i-repaid', accountId: payAcc, note: debt.name }) },
        { label: t('debt.lend'), primary: false, fn: () => openTx({ type: 'expense', debtId: id, accountId: payAcc, categoryId: 'c-other', note: debt.name }) }
      ]
    : [
        { label: t('debt.pay'), primary: true, fn: () => openTx({ type: 'expense', debtId: id, categoryId: 'c-debtpay', accountId: payAcc, amount: pay, note: debt.name }) },
        ...(debt.kind === 'person' ? [{ label: t('debt.borrow'), primary: false, fn: () => openTx({ type: 'income', debtId: id, categoryId: 'i-borrowed', accountId: payAcc, note: debt.name }) }] : [])
      ];

  const close = () => {
    if (!confirmDo(t('debt.close') + '?')) return;
    update((x) => ({ ...x, debts: x.debts.map((y) => (y.id === id ? { ...y, closed: true } : y)) }));
    navigate('/debts', true);
  };

  return (
    <div class="screen no-nav">
      <TopBar back title={debt.kind === 'person' ? '' : debt.name} fallback="/debts">
        <button class="icon-btn" aria-label={t('edit')} onClick={() => navigate(`/debt/${id}/edit`)}><Icon name="edit" size={17} /></button>
      </TopBar>

      {debt.kind === 'person' ? (
        <div class="col gap8" style="align-items:center">
          <div style="padding:4px;border-radius:999px;border:1px solid var(--line-2)"><Avatar kind={debt.person?.avatar ?? 'initial'} photo={debt.person?.photo} name={debt.name} size={100} /></div>
          <span style="font-size:22px;font-weight:700">{debt.name}</span>
          <span class={'pill ' + (owed ? 'green' : 'accent')}>{owed ? t('debt.owedMe') : t('debt.iOwe')}</span>
        </div>
      ) : (
        <div class="row-flex" style="gap:12px">
          <span class="ib" style={{ width: '48px', height: '48px', background: debt.kind === 'bnpl' ? PROVIDER_COLORS[debt.provider ?? 'other'] : undefined, color: debt.kind === 'bnpl' ? '#F5EEE6' : undefined, fontSize: '12px' }}>
            {debt.kind === 'bnpl' ? providerShort(debt.provider ?? 'other') : <Icon name="bank" size={22} />}
          </span>
          <span class="col gap4"><span class="semi">{t(('kindD.' + debt.kind) as 'kindD.loan')}</span>{debt.note && <span class="xs faint">{debt.note}</span>}</span>
        </div>
      )}

      <div class="card pad col gap14">
        <div class="between" style="align-items:flex-end">
          <div class="col gap4"><span class="small muted">{t('debt.opening')}</span><span style="font-size:28px;line-height:1"><Money v={rem} class="bold" /></span></div>
          {debt.principal > 0 && <span class="small muted">{t('debt.principal')} <Money v={debt.principal} class="text2 bold" /></span>}
        </div>
        <Bar pct={pct} />
        {debt.installmentsTotal ? (
          <div class="row-flex" style="gap:3px">
            {Array.from({ length: debt.installmentsTotal }, (_, i) => <span style={{ flex: '1 1 0', height: '6px', borderRadius: '2px', background: i < paid ? 'var(--text-2)' : 'var(--line-2)' }} />)}
          </div>
        ) : null}
        <div class="grid2">
          <div class="inset col gap4">
            <span class="xs faint">{debt.kind === 'person' ? t('debt.agreement') : t('debt.installment')}</span>
            <span class="semi small">{debt.kind === 'person' ? debt.person?.agreement || (debt.monthly ? fmt(debt.monthly) + ' / ' + t('month') : t('debt.flexible')) : debt.installment ? fmt(debt.installment) + (debt.installmentsTotal ? ' · ' + t('debt.paid', { p: paid, t: debt.installmentsTotal }) : '') : '—'}</span>
          </div>
          <div class="inset col gap4">
            <span class="xs faint">{next ? t('debt.nextDue') : t('debt.inPlan')}</span>
            <span class="semi small">{rem <= 0 ? t('debt.paidOff') : next ? fmtDay(next, true) : payoffIdx !== undefined ? t('debt.ends', { d: freeLabel(payoffIdx) }) : '—'}</span>
          </div>
        </div>
        {!owed && payoffIdx !== undefined && next && <span class="xs muted">{t('debt.inPlan')}: {t('debt.ends', { d: freeLabel(payoffIdx) })}</span>}
      </div>

      {!owed && rem > 0 && (debt.kind !== 'person' || (debt.annualRate ?? 0) > 0) && (
        <div class="card pad col gap12">
          <span class="h2">{t('rate.q')}</span>
          {(debt.annualRate ?? 0) > 0 ? (
            <>
              <RateVerdict kind={debt.kind === 'bnpl' ? 'bnpl' : 'personal'} apr={debt.annualRate!} balance={rem} payment={(debt.installment ?? debt.monthly ?? 0) * (debt.frequency === 'biweekly' ? 2 : 1)} fixedSchedule={!!debt.installmentsTotal} />
              <details>
                <summary class="small muted">{t('rate.calc')}</summary>
                <RateCalc initial={{ payment: debt.installment, n: debt.installmentsTotal }} onApr={(apr) => update((x) => ({ ...x, debts: x.debts.map((y) => (y.id === id ? { ...y, annualRate: apr } : y)) }))} />
              </details>
            </>
          ) : debt.kind === 'bnpl' ? (
            <span class="small pos" style="line-height:1.7">{t('rate.bnplFree')}</span>
          ) : (
            <>
              <span class="small text2" style="line-height:1.7">{t('rate.noRate')}</span>
              <RateCalc initial={{ payment: debt.installment, n: debt.installmentsTotal }} onApr={(apr) => update((x) => ({ ...x, debts: x.debts.map((y) => (y.id === id ? { ...y, annualRate: apr } : y)) }))} />
            </>
          )}
        </div>
      )}

      <div class={actions.length > 1 ? 'grid2' : 'col'}>
        {actions.map((a) => <button class={'btn' + (a.primary ? '' : ' ghost')} onClick={a.fn}>{a.label}</button>)}
      </div>

      <Collapse open title={t('debt.history')} right={<span class="xs faint n">{history.length}</span>}>
        {history.length === 0 && <Empty />}
        {history.map((tx) => <TxRow tx={tx} showDate={fmtDay(tx.date)} />)}
      </Collapse>

      {rem <= 0 && <button class="btn outline" onClick={close}>{t('debt.close')}</button>}
    </div>
  );
}
