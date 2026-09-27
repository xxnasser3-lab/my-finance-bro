import { useState } from 'preact/hooks';
import { t, fmtDay } from '../i18n';
import { useData } from '../store/store';
import type { TxType } from '../store/types';
import { Icon } from '../components/Icon';
import { TopBar, Collapse, Money, catName, Empty } from '../components/ui';
import { TxRow } from '../components/TxRow';
import { catById } from '../logic/finance';
import { addDays, today } from '../logic/dates';

export function Transactions() {
  const d = useData();
  const [q, setQ] = useState('');
  const [type, setType] = useState<TxType | 'all'>('all');
  const [limit, setLimit] = useState(60);
  const query = q.trim().toLowerCase();
  const list = [...d.txs]
    .filter((x) => type === 'all' || x.type === type)
    .filter((x) => {
      if (!query) return true;
      const hay = [x.note, catName(catById(d, x.categoryId)), d.accounts.find((a) => a.id === x.accountId)?.name, d.trips.find((tr) => tr.id === x.tripId)?.name, String(x.amount)].join(' ').toLowerCase();
      return hay.includes(query);
    })
    .sort((a, b) => (b.date + (b.time ?? '')).localeCompare(a.date + (a.time ?? '')));
  const days = new Map<string, typeof list>();
  for (const tx of list) {
    if (days.size >= limit && !days.has(tx.date)) break;
    days.set(tx.date, [...(days.get(tx.date) ?? []), tx]);
  }
  const t0 = today();
  const label = (date: string) => (date === t0 ? t('today') + ' · ' : date === addDays(t0, -1) ? t('yesterday') + ' · ' : '') + fmtDay(date, true);
  return (
    <div class="screen no-nav">
      <TopBar back title={t('txs.title')} />
      <label class="row-flex" style="height:46px;padding:0 14px;border-radius:14px;background:var(--surface);border:1px solid var(--line);color:var(--faint)">
        <Icon name="search" size={18} />
        <input type="search" class="grow" style="border:0;outline:0;background:transparent;color:var(--text);font-size:14px" placeholder={t('txs.search')} value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
      </label>
      <div class="chips">
        {([['all', t('txs.all')], ['expense', t('tx.expense')], ['income', t('tx.income')], ['transfer', t('tx.transfer')]] as [TxType | 'all', string][]).map(([k, l]) => (
          <button class={'chip solid' + (type === k ? ' on' : '')} onClick={() => setType(k)}>{l}</button>
        ))}
      </div>
      {list.length === 0 && <Empty />}
      {[...days.entries()].map(([date, txs], i) => {
        const out = txs.filter((x) => x.type === 'expense').reduce((s, x) => s + x.amount, 0);
        const inc = txs.filter((x) => x.type === 'income').reduce((s, x) => s + x.amount, 0);
        return (
          <Collapse open={i < 4} title={<span style="font-size:13px">{label(date)}</span>} right={<span class="small">{inc > 0 && <Money v={inc} signed class="pos" />} {out > 0 && <Money v={-out} signed class="text2" />}</span>}>
            {txs.map((tx) => <TxRow tx={tx} />)}
          </Collapse>
        );
      })}
      {list.length > 0 && days.size >= limit && (
        <button class="btn outline" onClick={() => setLimit((l) => l + 60)}>{t('more')}</button>
      )}
    </div>
  );
}
