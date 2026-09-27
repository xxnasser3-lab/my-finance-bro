import { useState } from 'preact/hooks';
import { t } from '../i18n';
import { getData, uid, update, upsert, removeById } from '../store/store';
import type { GoldPurity, Investment, InvestmentKind } from '../store/types';
import { Icon } from '../components/Icon';
import { TopBar, Seg, Field, NumInput, toast, confirmDo } from '../components/ui';
import { goBack, navigate } from '../router';
import { holding } from '../logic/investments';

export function InvestmentForm({ id }: { id?: string }) {
  const d = getData();
  const existing = id ? d.investments.find((x) => x.id === id) : undefined;
  const h = existing ? holding(d, existing) : undefined;
  const [x, setX] = useState<Investment>(
    existing
      ? structuredClone(existing)
      : { id: uid(), kind: 'stock', name: '', symbol: '', currency: 'USD', quantity: 0, avgCost: 0, accountId: d.settings.salaryAccountId, createdAt: new Date().toISOString() }
  );
  const set = (p: Partial<Investment>) => setX((v) => ({ ...v, ...p }));

  const onKind = (k: InvestmentKind) => set({ kind: k, currency: k === 'gold' ? 'SAR' : 'USD', purity: k === 'gold' ? 21 : undefined, symbol: k === 'stock' ? x.symbol : undefined });

  const save = () => {
    const name = x.name.trim() || (x.kind === 'stock' ? x.symbol?.toUpperCase() : x.kind === 'gold' ? t('kindI.gold') : t('kindI.other')) || '';
    if (!name) return toast(t('name'));
    if (x.kind === 'stock' && !x.symbol?.trim()) return toast(t('inv.symbol'));
    const inv: Investment = { ...x, name, symbol: x.symbol?.trim().toUpperCase() || undefined };
    update((v) => ({ ...v, investments: upsert(v.investments, inv) }));
    toast(t('done'));
    if (existing) goBack('/investment/' + inv.id);
    else navigate('/investment/' + inv.id, true);
  };

  const del = () => {
    if (!existing || !confirmDo(t('confirmDelete'))) return;
    update((v) => ({ ...v, investments: removeById(v.investments, existing.id), txs: v.txs.map((tx) => (tx.investmentId === existing.id ? { ...tx, investmentId: undefined, qty: undefined } : tx)) }));
    navigate('/investments', true);
  };

  const kinds: [InvestmentKind, string][] = [['stock', t('kindI.stock')], ['gold', t('kindI.gold')], ['other', t('kindI.other')]];
  const unit = x.kind === 'gold' ? t('inv.qtyGrams') : x.kind === 'stock' ? t('inv.qtyShares') : t('inv.qty');

  return (
    <div class="screen no-nav">
      <TopBar back title={existing ? x.name : t('inv.new')} fallback="/investments" />
      {!existing && <Seg<InvestmentKind> value={x.kind} onChange={onKind} options={kinds} />}

      <div class="card pad col gap12">
        {x.kind === 'stock' && (
          <Field label={t('inv.symbol')} hint={t('inv.symbolHint')}>
            <input class="input num" dir="ltr" style="text-transform:uppercase" placeholder="AAPL" value={x.symbol ?? ''} onInput={(e) => set({ symbol: (e.target as HTMLInputElement).value })} />
          </Field>
        )}
        {x.kind === 'gold' && (
          <Field label={t('inv.purity')}>
            <div class="chips">
              {([24, 22, 21, 18] as GoldPurity[]).map((p) => (
                <button type="button" class={'chip solid' + (x.purity === p ? ' on' : '')} onClick={() => set({ purity: p })}>{p}k</button>
              ))}
            </div>
          </Field>
        )}
        <Field label={t('name')}><input class="input" placeholder={x.kind === 'stock' ? 'Apple Inc.' : ''} value={x.name} onInput={(e) => set({ name: (e.target as HTMLInputElement).value })} /></Field>
        {existing ? (
          <div class="inset col gap4">
            <span class="xs faint">{unit} · {t('inv.avgCost')}</span>
            <span class="semi">{h?.quantity ?? x.quantity} · {h?.avgCost ?? x.avgCost}</span>
            <span class="xs faint" style="line-height:1.6">{t('inv.editHint')}</span>
          </div>
        ) : (
          <div class="grid2">
            <Field label={unit}><NumInput value={x.quantity || undefined} onInput={(v) => set({ quantity: v || 0 })} /></Field>
            <Field label={t('inv.avgCost')} hint={t('inv.avgCostHint')}><NumInput value={x.avgCost || undefined} onInput={(v) => set({ avgCost: v || 0 })} /></Field>
          </div>
        )}
        <div class="grid2">
          {x.kind !== 'gold' && (
            <Field label={t('inv.currency')}>
              <Seg<'USD' | 'SAR'> value={x.currency} onChange={(c) => set({ currency: c })} options={[['USD', 'USD'], ['SAR', 'SAR']]} />
            </Field>
          )}
          <Field label={t('inv.fundedFrom')}>
            <select class="select" value={x.accountId ?? ''} onChange={(e) => set({ accountId: (e.target as HTMLSelectElement).value || undefined })}>
              <option value="">—</option>
              {d.accounts.filter((a) => !a.archived && a.kind !== 'credit').map((a) => <option value={a.id}>{a.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label={t('note')}><input class="input" value={x.note ?? ''} onInput={(e) => set({ note: (e.target as HTMLInputElement).value || undefined })} /></Field>
      </div>

      <div class="row-flex">
        {existing && <button class="btn danger" onClick={del} aria-label={t('delete')}><Icon name="trash" size={18} /></button>}
        <button class="btn grow" onClick={save}>{t('save')}</button>
      </div>
      {existing && h && h.quantity !== existing.quantity && (
        <span class="xs faint center">{t('inv.qty')}: {h.quantity} ({t('inv.buy')}/{t('inv.sell')} {t('adv.left', { v: '' }).split(':')[0]})</span>
      )}
    </div>
  );
}
