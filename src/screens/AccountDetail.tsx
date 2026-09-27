import { useState } from 'preact/hooks';
import { t, fmtDay } from '../i18n';
import { useData } from '../store/store';
import type { Account, CardSecrets } from '../store/types';
import { Icon } from '../components/Icon';
import { Money, TopBar, Collapse, copyText, fmt, Empty } from '../components/ui';
import { CardViz } from '../components/CardViz';
import { Gauge } from '../components/charts';
import { TxRow } from '../components/TxRow';
import { balance, cardPayoff, cardRevolving, cardStatement, round2, simulate } from '../logic/finance';
import { navigate } from '../router';
import { openTx } from '../sheets';
import { verifyUser } from '../store/vault';
import { RateVerdict } from '../components/RateCheck';

const SECRET_FIELDS: [keyof CardSecrets, 'acc.holder' | 'acc.number' | 'acc.expiry' | 'acc.cvv' | 'acc.iban' | 'acc.accNumber' | 'note'][] = [
  ['holder', 'acc.holder'],
  ['number', 'acc.number'],
  ['expiry', 'acc.expiry'],
  ['cvv', 'acc.cvv'],
  ['iban', 'acc.iban'],
  ['accountNumber', 'acc.accNumber'],
  ['notes', 'note']
];

function mask(k: keyof CardSecrets, v: string): string {
  const clean = v.replace(/\s+/g, '');
  if (k === 'holder' || k === 'notes') return v;
  if (k === 'cvv') return '•••';
  if (k === 'expiry') return '••/••';
  const tail = clean.slice(-4);
  return '•••• •••• ' + tail;
}

export function Secrets({ acc }: { acc: Account }) {
  const [shown, setShown] = useState(false);
  const fields = SECRET_FIELDS.filter(([k]) => acc.secrets[k]);
  if (!fields.length) return null;
  const toggle = async () => {
    if (shown) return setShown(false);
    if (await verifyUser()) setShown(true);
  };
  const copy = async (v: string) => {
    if (shown || (await verifyUser())) copyText(v);
  };
  const all = fields.map(([k, label]) => `${t(label)}: ${acc.secrets[k]}`).join('\n');
  return (
    <div class="card pad col gap10">
      <div class="between">
        <span class="semi">{t('acc.secrets')}</span>
        <button class="btn sm outline" style="height:32px;color:var(--green-text)" onClick={toggle}>
          <Icon name={shown ? 'eyeOff' : 'lock'} size={14} stroke={2} />
          {shown ? t('acc.hide') : t('acc.reveal')}
        </button>
      </div>
      {fields.map(([k, label]) => (
        <div class="inset row-flex">
          <div class="grow col gap4" style="min-width:0">
            <span class="xs faint">{t(label)}</span>
            <span class="n semi ellipsis" dir="ltr" style="font-size:13px;text-align:start">{shown ? acc.secrets[k] : mask(k, acc.secrets[k]!)}</span>
          </div>
          <button class="btn sm ghost" style="height:32px;padding:0 10px;font-size:11px" onClick={() => copy(acc.secrets[k]!)}>
            <Icon name="copy" size={13} stroke={2} />
            {t('copy')}
          </button>
        </div>
      ))}
      <button class="btn outline sm" onClick={() => copy(all)}>{t('acc.copyAll')}</button>
      <span class="xs faint" style="line-height:1.7">{t('acc.secureNote')}</span>
    </div>
  );
}

export function AccountDetail({ id }: { id: string }) {
  const d = useData();
  const acc = d.accounts.find((a) => a.id === id);
  const [pick, setPick] = useState<'min' | 'plan' | 'full'>('plan');
  if (!acc) return <div class="screen no-nav"><TopBar back title="" fallback="/wallet" /><Empty /></div>;
  const bal = balance(d, acc);
  const revolving = acc.kind === 'credit' ? cardRevolving(d, acc) : bal;
  const txs = d.txs.filter((x) => x.accountId === id || x.toAccountId === id).sort((a, b) => (b.date + (b.time ?? '')).localeCompare(a.date + (a.time ?? ''))).slice(0, 30);
  const credit = acc.kind === 'credit' && acc.credit;
  const st = credit ? cardStatement(d, acc) : undefined;
  const plan = credit ? simulate(d, d.settings.strategy) : undefined;
  const planPay = plan?.firstMonth.perDebt[acc.id] ?? 0;
  const subs = d.commitments.filter((c) => c.active && c.accountId === acc.id && c.kind === 'subscription');
  const activePlans = (acc.installmentPlans ?? []).filter((pl) => !pl.archived && pl.totalInstallments - pl.paidInstallments > 0);
  const options = credit
    ? ([
        ['min', t('acc.payMin'), 'min' as const, st?.minimum ?? 0],
        ['plan', t('acc.payPlan'), Math.max(planPay, 1), planPay],
        ['full', t('acc.payFull'), bal, bal]
      ] as const).map(([key, label, pay, show]) => {
        const r = key === 'full' ? { months: bal > 0 ? 1 : 0, interest: 0 } : cardPayoff(acc, revolving, pay);
        return { key, label, show, ...r };
      })
    : [];
  const maxInterest = Math.max(1, ...options.map((o) => (Number.isFinite(o.interest) ? o.interest : 0)));
  const p = acc.credit;

  return (
    <div class="screen no-nav">
      <TopBar back title={acc.name} fallback="/wallet">
        <button class="icon-btn" aria-label={t('edit')} onClick={() => navigate(`/account/${id}/edit`)}><Icon name="edit" size={17} /></button>
      </TopBar>
      <CardViz acc={acc} balance={bal} height={200} />

      {credit && st && p && (
        <>
          <div class="grid3">
            <div class="tile"><span class="xs muted">{t('acc.statement')}</span><Money v={st.statementBalance} class="bold" /></div>
            <div class="tile" style="border-color:var(--accent-line);background:var(--accent-soft)"><span class="xs" style="color:var(--accent-text)">{t('acc.min')}</span><Money v={st.minimum} class="bold" /></div>
            <div class="tile"><span class="xs muted">{t('acc.due')}</span><span class="semi" style="font-size:13px">{fmtDay(st.dueDate)}</span></div>
          </div>
          <div class="card pad row-flex" style="gap:14px">
            <Gauge pct={p.limit ? bal / p.limit : 0} />
            <div class="col gap4">
              <span class="semi">{t('acc.usage')}</span>
              <span class="xs muted" style="line-height:1.6">{t('acc.usageHint', { u: fmt(bal), l: fmt(p.limit) })}</span>
            </div>
          </div>
          {bal > 0 && (
            <div class="card pad col gap10">
              <span class="semi">{t('acc.howPay')}</span>
              {options.map((o) => (
                <button class="row-flex" style={{ gap: '12px', padding: '11px 13px', borderRadius: '13px', border: '1px solid ' + (pick === o.key ? 'var(--accent)' : 'var(--line)'), background: pick === o.key ? 'var(--accent-soft)' : 'var(--bg)', textAlign: 'start' }} onClick={() => setPick(o.key)}>
                  <span style={{ width: '18px', height: '18px', borderRadius: '999px', border: '2px solid ' + (pick === o.key ? 'var(--accent)' : 'var(--chart-cross)'), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {pick === o.key && <span style="width:8px;height:8px;border-radius:999px;background:var(--accent)" />}
                  </span>
                  <span class="grow col gap4">
                    <span class="semi" style="font-size:13px">{o.label}</span>
                    <span class="xs muted">{Number.isFinite(o.months) ? t('acc.months', { n: o.months }) : t('acc.never')}</span>
                  </span>
                  <Money v={o.show} class="bold" />
                </button>
              ))}
              <div class="col gap8" style="padding-top:10px;border-top:1px solid var(--sep)">
                <span class="small text2">{t('acc.interest')}</span>
                {options.map((o) => (
                  <div class="row-flex">
                    <span class="xs muted" style="width:84px;flex-shrink:0">{o.label}</span>
                    <div class="grow" style="height:14px;display:flex">
                      <div style={{ width: (Number.isFinite(o.interest) ? (o.interest / maxInterest) * 100 : 100) + '%', minWidth: '3px', borderRadius: '4px', background: pick === o.key ? 'var(--accent)' : 'var(--sand)' }} />
                    </div>
                    <span class="n xs bold" style="width:52px;text-align:end">{Number.isFinite(o.interest) ? fmt(o.interest) : '∞'}</span>
                  </div>
                ))}
              </div>
              <button class="btn" onClick={() => openTx({ type: 'transfer', toAccountId: acc.id, accountId: d.settings.salaryAccountId, amount: pick === 'min' ? st.minimum : pick === 'plan' ? Math.round(planPay) : bal })}>{t('acc.recordPay')}</button>
            </div>
          )}
          {p.monthlyRate > 0 && (
            <div class="card pad col gap10">
              <span class="h2">{t('rate.qCard')}</span>
              <RateVerdict kind="card" apr={p.monthlyRate * 12} balance={bal > 0 ? bal : undefined} payment={bal > 0 ? Math.max(planPay, st.minimum) : undefined} />
            </div>
          )}
          {activePlans.length > 0 && (
            <Collapse title={t('acc.plans')} right={<span class="xs faint n">{activePlans.length}</span>}>
              {activePlans.map((pl) => (
                <div class="row small" style="align-items:flex-start;padding:11px 0">
                  <span class="grow col gap4">
                    <span class="semi ellipsis">{pl.merchant || t('imp.plan')}</span>
                    <span class="xs faint">{t('imp.paidOf', { p: pl.paidInstallments, t: pl.totalInstallments })}{pl.hasMurabaha ? ' · ' + t('imp.hasMurabaha') : ''}</span>
                    {pl.nextDueDate && <span class="xs faint">{t('acc.planNext')}: {fmtDay(pl.nextDueDate)}</span>}
                  </span>
                  <span class="col gap4" style="align-items:flex-end">
                    <span class="xs muted">{t('acc.planRemaining')}</span>
                    <Money v={round2(pl.installmentAmount * (pl.totalInstallments - pl.paidInstallments))} class="bold" />
                  </span>
                </div>
              ))}
            </Collapse>
          )}
        </>
      )}

      <Secrets acc={acc} />

      {credit && p && (
        <Collapse title={t('acc.policy')}>
          {([
            [t('acc.limit'), fmt(p.limit)],
            [t('acc.rate'), p.monthlyRate + '% · ' + +(p.monthlyRate * 12).toFixed(2) + '%/y'],
            [t('acc.minPct'), `${p.minPercent}% / ${fmt(p.minAmount)}`],
            [t('acc.statementDay'), String(p.statementDay)],
            [t('acc.dueDays'), String(p.dueDays)],
            [t('acc.grace'), p.graceNote ?? '—'],
            [t('acc.lateFee'), p.lateFee !== undefined ? fmt(p.lateFee) : '—'],
            [t('acc.cashFee'), p.cashFee ?? '—'],
            [t('acc.annualFee'), p.annualFee ?? '—'],
            [t('acc.cashback'), p.cashback ?? '—']
          ] as [string, string][]).map(([k, v]) => (
            <div class="row small" style="padding:11px 0"><span class="grow muted">{k}</span><span class="semi" style="text-align:end">{v}</span></div>
          ))}
        </Collapse>
      )}

      {subs.length > 0 && (
        <Collapse title={t('acc.subs')} right={<Money v={subs.reduce((s, c) => s + c.amount, 0)} class="small text2" />}>
          {subs.map((c) => <div class="row small" style="padding:11px 0"><span class="grow">{c.name}</span><Money v={c.amount} class="semi" /></div>)}
        </Collapse>
      )}

      <Collapse title={t('acc.txs')} open={!credit}>
        {txs.length === 0 && <Empty />}
        {txs.map((tx) => <TxRow tx={tx} showDate={fmtDay(tx.date)} />)}
      </Collapse>

      {!credit && (
        <button class="btn outline" onClick={() => openTx({ type: 'expense', accountId: acc.id })}><Icon name="plus" size={16} stroke={2.2} />{t('nav.add')}</button>
      )}
    </div>
  );
}
