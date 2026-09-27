import { useState } from 'preact/hooks';
import { t, fmtDay, monthName, getLang } from '../i18n';
import { useData } from '../store/store';
import type { AppData, Debt } from '../store/types';
import { Icon } from '../components/Icon';
import { Avatar } from '../components/Avatar';
import { TopBar, Money, Collapse, Bar, fmt, Seg } from '../components/ui';
import { LineChart, HBars } from '../components/charts';
import { SKINS } from '../components/CardViz';
import { balance, balanceAt, creditAccounts, debtRemaining, installmentsPaid, monthFromNow, nextInstallmentDate, simulate, sixMonths, totalDebt } from '../logic/finance';
import { today } from '../logic/dates';
import { navigate } from '../router';

export const PROVIDER_COLORS: Record<string, string> = { tabby: '#3A2F4E', tamara: '#4A3A1C', tasaheel: '#1F3A52', other: '#2A221C' };

function remainingAt(d: AppData, debt: Debt, date: string): number {
  let r = debt.opening;
  for (const tx of d.txs) {
    if (tx.debtId !== debt.id || tx.date > date) continue;
    r += tx.type === 'expense' ? -tx.amount : tx.amount;
  }
  return Math.max(0, r);
}

export function providerShort(p: string): string {
  const label = t(('prov.' + p) as 'prov.tabby');
  return getLang() === 'en' ? label.slice(0, 3).toUpperCase() : label;
}

export function freeLabel(idx: number): string {
  if (!Number.isFinite(idx) || idx > 60) return t('plan.never');
  const { y, m0 } = monthFromNow(idx);
  return monthName(m0) + ' ' + y;
}

export function DebtRow({ debt }: { debt: Debt }) {
  const d = useData();
  const rem = debtRemaining(d, debt);
  const paid = installmentsPaid(d, debt);
  const next = nextInstallmentDate(d, debt);
  const provider = debt.provider ?? 'other';
  return (
    <a class="row" href={'#/debt/' + debt.id} style={{ opacity: rem <= 0 ? 0.55 : 1 }}>
      {debt.kind === 'bnpl' ? (
        <span class="ib" style={{ background: PROVIDER_COLORS[provider], fontSize: provider === 'tasaheel' && getLang() === 'ar' ? '9px' : '11px' }}>{providerShort(provider)}</span>
      ) : (
        <span class="ib"><Icon name="bank" size={19} /></span>
      )}
      <span class="grow col gap6" style="min-width:0">
        <span class="between"><span class="semi ellipsis" style="font-size:14px">{debt.name}</span><Money v={rem} class="bold" /></span>
        {debt.installmentsTotal ? (
          debt.installmentsTotal <= 6 ? (
            <span class="row-flex" style="gap:3px">
              {Array.from({ length: debt.installmentsTotal }, (_, i) => <span style={{ flex: '1 1 0', height: '5px', borderRadius: '2px', background: i < paid ? '#CDBEB0' : '#3A2E25' }} />)}
            </span>
          ) : (
            <Bar pct={(paid / debt.installmentsTotal) * 100} color="#CDBEB0" />
          )
        ) : null}
        <span class="xs faint">
          {debt.installmentsTotal ? t('debt.paid', { p: paid, t: debt.installmentsTotal }) : ''}
          {next ? ' · ' + t('debt.next', { d: fmtDay(next) }) + (debt.installment ? ' · ' + fmt(Math.min(rem, debt.installment)) : '') : ''}
        </span>
      </span>
    </a>
  );
}

export function Debts() {
  const d = useData();
  const [filter, setFilter] = useState<'all' | 'card' | 'bnpl' | 'loan' | 'person'>('all');
  const [dir, setDir] = useState<'owe' | 'owed'>('owe');
  const plan = simulate(d, d.settings.strategy);
  const total = totalDebt(d);
  const cards = creditAccounts(d).filter((a) => balance(d, a) > 0 || filter === 'card');
  const active = d.debts.filter((x) => !x.closed);
  const bnpl = active.filter((x) => x.kind === 'bnpl');
  const loans = active.filter((x) => x.kind === 'loan');
  const people = active.filter((x) => x.kind === 'person' && (x.person?.direction ?? 'owe') === dir);
  const months = sixMonths();
  const t0 = today();
  const hist = months.map((m) => {
    const end = m.end < t0 ? m.end : t0;
    return d.debts.filter((x) => x.kind !== 'person' || x.person?.direction !== 'owed').reduce((s, x) => s + remainingAt(d, x, end), 0) + creditAccounts(d).reduce((s, a) => s + Math.max(0, balanceAt(d, a, end)), 0);
  });
  const year = t0.slice(0, 4);
  const creditIds = new Set(creditAccounts(d).map((a) => a.id));
  const paidYear = d.txs.filter((x) => x.date.startsWith(year) && ((x.debtId && x.type === 'expense' && d.debts.find((y) => y.id === x.debtId)?.person?.direction !== 'owed') || (x.type === 'transfer' && x.toAccountId && creditIds.has(x.toAccountId)))).reduce((s, x) => s + x.amount, 0);
  const sum = (list: Debt[]) => list.reduce((s, x) => s + debtRemaining(d, x), 0);
  const cardTotal = cards.reduce((s, a) => s + Math.max(0, balance(d, a)), 0);
  const peopleOwe = active.filter((x) => x.kind === 'person' && x.person?.direction !== 'owed');
  const mix = [
    { label: t('debt.loans'), v: sum(loans) },
    { label: t('debt.cards'), v: cardTotal },
    { label: t('debt.bnpl'), v: sum(bnpl) },
    { label: t('debt.people'), v: sum(peopleOwe) }
  ].filter((x) => x.v > 0).sort((a, b) => b.v - a.v).map((x) => ({ ...x, sub: Math.round((x.v / Math.max(1, total)) * 100) + '%' }));
  const show = (k: typeof filter) => filter === 'all' || filter === k;

  return (
    <div class="screen">
      <TopBar title={t('debt.title')}>
        <button class="btn sm" onClick={() => navigate('/debt/new')}><Icon name="plus" size={16} stroke={2.4} />{t('debt.new')}</button>
      </TopBar>

      <div class="card hero col gap14" style="padding:18px">
        <div class="between" style="align-items:flex-start">
          <div class="col gap6">
            <span class="small text2">{t('debt.remaining')}</span>
            <span style="font-size:34px;line-height:1;letter-spacing:-.02em"><Money v={total} class="bold" /></span>
          </div>
          <div class="col" style="align-items:flex-end;gap:4px">
            <span class="xs muted">{t('debt.freeIn')}</span>
            <span class="semi" style="color:var(--accent-text)">{total > 0 ? freeLabel(plan.freeIdx) : '—'}</span>
          </div>
        </div>
        <LineChart count={6} height={72} initial={5} series={[{ values: hist, color: '#DD6220', fill: true }]} xLabels={months.map((m) => monthName(m.m0, true))} tip={(i) => <span>{monthName(months[i].m0)} · {fmt(hist[i])}</span>} />
        <div class="between small text2" style="padding-top:12px;border-top:1px solid #2e241d">
          <span>{t('debt.paidYear')} <Money v={paidYear} class="bold" /></span>
        </div>
      </div>

      {mix.length > 1 && (
        <div class="card pad col">
          <span class="h2" style="padding-bottom:4px">{t('debt.mix')}</span>
          <HBars rows={mix} />
        </div>
      )}

      <div class="chips scroll">
        {([['all', t('txs.all')], ['card', t('debt.cards')], ['bnpl', t('debt.bnpl')], ['loan', t('debt.loans')], ['person', t('debt.people')]] as [typeof filter, string][]).map(([k, l]) => (
          <button class={'chip solid' + (filter === k ? ' on' : '')} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>

      {show('card') && cards.length > 0 && (
        <Collapse open title={t('debt.cards')} right={<Money v={cardTotal} class="small neg" />}>
          {cards.map((a) => {
            const b = balance(d, a);
            const lim = a.credit?.limit ?? 0;
            return (
              <a class="row" href={'#/account/' + a.id} style="flex-direction:column;align-items:stretch;gap:10px">
                <span class="row-flex" style="gap:12px">
                  <span style={{ width: '50px', height: '34px', borderRadius: '7px', background: SKINS[a.skin % SKINS.length].bg, border: '1px solid ' + SKINS[a.skin % SKINS.length].border, flexShrink: 0 }} />
                  <span class="grow col gap4"><span class="semi">{a.name}</span><span class="xs faint">{a.credit ? `${a.credit.monthlyRate}% · ${t('acc.statementDay')} ${a.credit.statementDay}` : ''}</span></span>
                  <Money v={b} class="bold" />
                </span>
                {lim > 0 && <Bar pct={(b / lim) * 100} />}
              </a>
            );
          })}
        </Collapse>
      )}

      {show('bnpl') && bnpl.length > 0 && (
        <Collapse open title={t('debt.bnpl')} right={<Money v={sum(bnpl)} class="small text2" />}>
          {bnpl.map((x) => <DebtRow debt={x} />)}
        </Collapse>
      )}

      {show('loan') && loans.length > 0 && (
        <Collapse open title={t('debt.loans')} right={<Money v={sum(loans)} class="small text2" />}>
          {loans.map((x) => <DebtRow debt={x} />)}
        </Collapse>
      )}

      {show('person') && (
        <div class="col gap10">
          <div class="between">
            <span class="sec-title" style="padding:0">{t('debt.people')}</span>
            <div style="width:210px"><Seg<'owe' | 'owed'> value={dir} onChange={setDir} options={[['owe', t('debt.iOwe')], ['owed', t('debt.owedMe')]]} /></div>
          </div>
          <div class="grid4">
            {people.map((x) => (
              <a href={'#/debt/' + x.id} class="tile" style="align-items:center;gap:6px;padding:12px 4px;color:var(--text)">
                <Avatar kind={x.person?.avatar ?? 'initial'} photo={x.person?.photo} name={x.name} size={48} />
                <span class="semi small ellipsis" style="max-width:100%">{x.name}</span>
                <Money v={debtRemaining(d, x)} class={'small bold ' + (dir === 'owe' ? 'neg' : 'pos')} />
              </a>
            ))}
            <button class="tile" style="align-items:center;justify-content:center;gap:6px;border-style:dashed;border-color:#4a3b31;background:transparent;color:var(--muted);font-size:12px;font-weight:600;min-height:112px" onClick={() => navigate('/debt/new/person')}>
              <Icon name="plus" size={22} />
              {t('kindD.person')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
