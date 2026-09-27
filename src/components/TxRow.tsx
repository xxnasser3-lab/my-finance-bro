import { getData } from '../store/store';
import type { Tx } from '../store/types';
import { catById } from '../logic/finance';
import { catName, CatBadge, Money } from './ui';
import { Icon } from './Icon';
import { openTx } from '../sheets';
import { t, isRTL } from '../i18n';

export function TxRow({ tx, showDate }: { tx: Tx; showDate?: string }) {
  const d = getData();
  const c = catById(d, tx.categoryId);
  const acc = d.accounts.find((a) => a.id === tx.accountId);
  const to = d.accounts.find((a) => a.id === tx.toAccountId);
  const trip = d.trips.find((x) => x.id === tx.tripId);
  const debt = d.debts.find((x) => x.id === tx.debtId);
  const inv = tx.investmentId ? d.investments.find((x) => x.id === tx.investmentId) : undefined;
  const title = inv
    ? (tx.type === 'expense' ? t('inv.buy') : t('inv.sell')) + ' · ' + inv.name
    : tx.note && (!c || tx.type === 'transfer') ? tx.note : tx.type === 'transfer' ? t('tx.transfer') : c ? catName(c) : t(tx.type === 'income' ? 'tx.income' : 'tx.expense');
  const bits = [tx.type === 'transfer' ? `${acc?.name ?? ''} ${isRTL() ? '←' : '→'} ${to?.name ?? ''}` : acc?.name, trip?.name, debt?.name, showDate ?? tx.time].filter(Boolean);
  const sign = tx.type === 'income' ? 1 : tx.type === 'expense' ? -1 : 0;
  return (
    <button class="row" onClick={() => openTx({ id: tx.id })}>
      {inv ? (
        <span class="ib" style="background:var(--blue-soft);border-color:transparent;color:var(--blue)"><Icon name={inv.kind === 'gold' ? 'star' : 'up'} size={17} /></span>
      ) : tx.type === 'transfer' ? (
        <span class="ib"><Icon name="transfer" size={17} /></span>
      ) : tx.type === 'income' ? (
        <span class="ib" style="background:var(--green-soft);border-color:transparent;color:var(--green-text)"><Icon name={c?.icon ?? 'up'} size={17} /></span>
      ) : (
        <CatBadge c={c} />
      )}
      <span class="grow col gap4" style="min-width:0">
        <span class="semi ellipsis" style="font-size:14px">{title}{inv ? (tx.qty ? <span class="faint xs n"> · {tx.qty}</span> : null) : tx.note && c && tx.type !== 'transfer' ? <span class="faint xs"> · {tx.note}</span> : null}</span>
        <span class="xs faint ellipsis">{bits.join(' · ')}</span>
      </span>
      <Money v={sign * tx.amount} signed={sign !== 0} class={'bold' + (sign > 0 ? ' pos' : '')} />
    </button>
  );
}
