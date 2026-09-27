import { useEffect, useState } from 'preact/hooks';
import { t } from '../i18n';
import { getData, uid, update, upsert, removeById } from '../store/store';
import type { GoldPurity, Investment, InvestmentKind } from '../store/types';
import { Icon } from '../components/Icon';
import { TopBar, Seg, Field, NumInput, fmt, toast, confirmDo } from '../components/ui';
import { curLabel, dispCur, toDisp, type DispCur } from '../components/insight';
import { goBack, navigate } from '../router';
import { holding, loadPrices, type PricesFile } from '../logic/investments';

const symbolsUrl = () => `https://github.com/${__REPO__}/edit/${__BRANCH__}/scripts/symbols.json`;

export function InvestmentForm({ id, preset }: { id?: string; preset?: string }) {
  const d = getData();
  const existing = id ? d.investments.find((x) => x.id === id) : undefined;
  const [prices, setPrices] = useState<PricesFile | null>(null);
  useEffect(() => {
    loadPrices().then(setPrices);
  }, []);
  const [x, setX] = useState<Investment>(
    existing
      ? structuredClone(existing)
      : { id: uid(), kind: 'stock', name: '', symbol: preset ? decodeURIComponent(preset).toUpperCase() : '', currency: 'USD', quantity: 0, avgCost: 0, accountId: d.settings.salaryAccountId, createdAt: new Date().toISOString() }
  );
  const [entryCur, setEntryCur] = useState<DispCur>(x.currency === 'USD' ? 'USD' : 'SAR');
  const [avgIn, setAvgIn] = useState<number | undefined>(undefined);
  const set = (p: Partial<Investment>) => setX((v) => ({ ...v, ...p }));
  const fx = prices?.usdSar ?? 3.75;
  const sym = x.symbol?.trim().toUpperCase() ?? '';
  const quote = x.kind === 'stock' && sym ? prices?.stocks[sym] : undefined;
  const untracked = x.kind === 'stock' && !!prices && sym.length >= 1 && !quote && Object.keys(prices.stocks).length > 0;

  const onKind = (k: InvestmentKind) => {
    set({ kind: k, currency: k === 'gold' ? 'SAR' : k === 'stock' ? 'USD' : x.currency, purity: k === 'gold' ? 21 : undefined, symbol: k === 'stock' ? x.symbol : undefined });
    setEntryCur(k === 'gold' ? 'SAR' : 'USD');
  };

  const save = () => {
    const name = x.name.trim() || (x.kind === 'stock' ? quote?.name ?? sym : x.kind === 'gold' ? t('kindI.gold') + (x.purity ? ' ' + x.purity + 'k' : '') : '') || '';
    if (!name) return toast(t('name'));
    if (x.kind === 'stock' && !sym) return toast(t('inv.symbol'));
    let avgCost = x.avgCost;
    if (!existing && avgIn !== undefined && !Number.isNaN(avgIn)) {
      avgCost = entryCur === x.currency ? avgIn : entryCur === 'SAR' ? avgIn / fx : avgIn * fx;
    }
    const inv: Investment = { ...x, name, symbol: sym || undefined, avgCost: Math.round(avgCost * 10000) / 10000 };
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
  const h = existing && prices ? holding(d, existing, prices.usdSar) : undefined;
  const cur = dispCur();

  return (
    <div class="screen no-nav">
      <TopBar back title={existing ? x.name : t('inv.new')} fallback="/investments" />
      {!existing && <Seg<InvestmentKind> value={x.kind} onChange={onKind} options={kinds} />}

      <div class="card pad col gap12">
        {x.kind === 'stock' && (
          <Field label={t('inv.symbol')} hint={t('inv.symbolHint')}>
            <input class="input num" dir="ltr" style="text-transform:uppercase" placeholder="AAPL" autoCapitalize="characters" value={x.symbol ?? ''} onInput={(e) => set({ symbol: (e.target as HTMLInputElement).value })} />
          </Field>
        )}
        {quote && (
          <div class="row-flex small" style="gap:8px;color:var(--green-text)">
            <Icon name="check" size={16} stroke={2.2} />
            <span class="grow ellipsis">{quote.name ?? sym}</span>
            <span class="n semi" dir="ltr">${fmt(quote.price, 2)}</span>
          </div>
        )}
        {untracked && (
          <div class="inset col gap6" style="border-color:var(--accent);line-height:1.7">
            <span class="small">{t('inv.notTracked', { s: sym })}</span>
            <a class="small semi" href={symbolsUrl()} target="_blank" rel="noopener">{t('inv.addTicker')}</a>
          </div>
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
        <Field label={t('name')}><input class="input" placeholder={quote?.name ?? (x.kind === 'stock' ? 'Apple Inc.' : '')} value={x.name} onInput={(e) => set({ name: (e.target as HTMLInputElement).value })} /></Field>
        {existing ? (
          <div class="inset col gap4">
            <span class="xs faint">{unit} · {t('inv.avgCost')}</span>
            <span class="semi n">{h ? fmt(h.quantity, h.quantity % 1 ? 4 : 0) : x.quantity} · {h && prices && h.quantity > 0 ? fmt(toDisp(h.costBasis / h.quantity, prices, cur), 2) + ' ' + curLabel(cur) : '—'}</span>
            <span class="xs faint" style="line-height:1.6">{t('inv.editHint')}</span>
          </div>
        ) : (
          <>
            <Field label={t('inv.enterIn')}>
              <Seg<DispCur> value={entryCur} onChange={setEntryCur} options={[['USD', t('inv.usd')], ['SAR', t('inv.sar')]]} />
            </Field>
            <div class="grid2">
              <Field label={unit}><NumInput value={x.quantity || undefined} onInput={(v) => set({ quantity: v || 0 })} /></Field>
              <Field label={t('inv.avgCost') + ' (' + curLabel(entryCur) + ')'} hint={t('inv.avgCostHint')}><NumInput value={avgIn} onInput={setAvgIn} /></Field>
            </div>
            {x.quantity > 0 && avgIn ? (
              <span class="xs faint n" dir="ltr" style="text-align:start">
                {t('inv.openingTotal')}: {entryCur === 'USD' ? '$' + fmt(x.quantity * avgIn, 2) + ' ≈ ' + fmt(x.quantity * avgIn * fx) + ' SAR' : fmt(x.quantity * avgIn) + ' SAR ≈ $' + fmt((x.quantity * avgIn) / fx, 2)}
              </span>
            ) : null}
            <span class="xs faint" style="line-height:1.6">{t('inv.openingHint')}</span>
          </>
        )}
        <div class="grid2">
          {x.kind === 'other' && !existing && (
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
    </div>
  );
}
