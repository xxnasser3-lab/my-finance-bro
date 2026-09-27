import { useEffect, useState } from 'preact/hooks';
import { t, fmtDay } from '../i18n';
import { getData, uid, update, useData } from '../store/store';
import type { Investment } from '../store/types';
import { Icon } from '../components/Icon';
import { TopBar, Money, Collapse, Sheet, Field, NumInput, fmt, toast, confirmDo, Empty } from '../components/ui';
import { LineChart } from '../components/charts';
import { TxRow } from '../components/TxRow';
import { holding, loadPrices, unitPriceSAR, valueOf, type PricesFile } from '../logic/investments';
import { round2 } from '../logic/finance';
import { nowTime, today } from '../logic/dates';
import { navigate } from '../router';

function TradeSheet({ inv, mode, maxQty, unitLabel, priceHint, usdSar, onClose }: { inv: Investment; mode: 'buy' | 'sell'; maxQty: number; unitLabel: string; priceHint: number | null; usdSar: number; onClose: () => void }) {
  const d = getData();
  const [qty, setQty] = useState<number | undefined>(undefined);
  const [price, setPrice] = useState<number | undefined>(priceHint ?? (inv.avgCost || undefined));
  const [accountId, setAccountId] = useState(inv.accountId ?? d.settings.salaryAccountId);
  const amount = (qty ?? 0) * (price ?? 0);
  const fx = inv.currency === 'USD' ? usdSar : 1;
  const sarAmount = round2(amount * fx);
  const save = () => {
    if (!qty || qty <= 0) return toast(t('inv.qty'));
    if (!price || price <= 0) return toast(t('inv.price'));
    if (mode === 'sell' && qty > maxQty) return toast(t('inv.notEnough'));
    update((v) => ({
      ...v,
      txs: [
        ...v.txs,
        {
          id: uid(),
          type: mode === 'buy' ? 'expense' : 'income',
          amount: sarAmount,
          date: today(),
          time: nowTime(),
          categoryId: mode === 'buy' ? 'c-other' : 'i-sale',
          accountId,
          investmentId: inv.id,
          qty,
          note: (mode === 'buy' ? t('inv.buy') : t('inv.sell')) + ' ' + inv.name,
          createdAt: new Date().toISOString()
        }
      ]
    }));
    toast(t('done'));
    onClose();
  };
  return (
    <Sheet onClose={onClose} title={(mode === 'buy' ? t('inv.buy') : t('inv.sell')) + ' · ' + inv.name}>
      <div class="grid2">
        <Field label={unitLabel}><NumInput value={qty} onInput={setQty} /></Field>
        <Field label={t('inv.price')} hint={t('inv.priceHint')}><NumInput value={price} onInput={setPrice} /></Field>
      </div>
      {mode === 'sell' && <span class="xs faint">{t('inv.qtyLeft', { n: maxQty })}</span>}
      {amount > 0 && <div class="inset row-flex"><span class="grow xs muted">{t('amount')}</span><Money v={sarAmount} class="bold" /></div>}
      <Field label={mode === 'buy' ? t('tx.from') : t('tx.to')}>
        <select class="select" value={accountId ?? ''} onChange={(e) => setAccountId((e.target as HTMLSelectElement).value || undefined)}>
          <option value="">—</option>
          {d.accounts.filter((a) => !a.archived && a.kind !== 'credit').map((a) => <option value={a.id}>{a.name}</option>)}
        </select>
      </Field>
      <button class="btn" onClick={save}>{t('save')}</button>
    </Sheet>
  );
}

export function InvestmentDetail({ id }: { id: string }) {
  const d = useData();
  const [prices, setPrices] = useState<PricesFile | null>(null);
  const [trade, setTrade] = useState<'buy' | 'sell' | null>(null);
  useEffect(() => {
    loadPrices().then(setPrices);
  }, []);
  const inv = d.investments.find((x) => x.id === id);
  if (!inv) return <div class="screen no-nav"><TopBar back title="" fallback="/investments" /><Empty /></div>;
  if (!prices) return <div class="screen no-nav"><TopBar back title={inv.name} fallback="/investments" /></div>;

  const h = holding(d, inv, prices.usdSar);
  const v = valueOf(h, prices);
  const unit = t(('inv.units.' + inv.kind) as 'inv.units.stock');
  const price = unitPriceSAR(inv, prices);
  const hist = inv.kind === 'gold' ? prices.gold.history : inv.kind === 'stock' ? prices.stocks[inv.symbol?.toUpperCase() ?? '']?.history : undefined;
  const history = d.txs.filter((x) => x.investmentId === id).sort((a, b) => (b.date + (b.time ?? '')).localeCompare(a.date + (a.time ?? '')));

  const close = () => {
    if (!confirmDo(t('inv.closeConfirm'))) return;
    update((x) => ({ ...x, investments: x.investments.map((y) => (y.id === id ? { ...y, archived: true } : y)) }));
    navigate('/investments', true);
  };

  return (
    <div class="screen no-nav">
      <TopBar back title={inv.name} fallback="/investments">
        <button class="icon-btn" aria-label={t('edit')} onClick={() => navigate(`/investment/${id}/edit`)}><Icon name="edit" size={17} /></button>
      </TopBar>

      <div class="card hero col gap12" style="padding:18px">
        <div class="between">
          <span class="row-flex xs semi text2" style="gap:6px">{inv.symbol && <span class="n">{inv.symbol}</span>}{inv.purity && <span>{inv.purity}k</span>}</span>
          <span class="pill">{h.quantity} {unit}</span>
        </div>
        <div class="row-flex" style="align-items:baseline;gap:8px">
          <span style="font-size:32px;line-height:1"><Money v={v.value} class="bold" /></span>
          <span class="small muted">{t('cur')}</span>
        </div>
        <div class="between small">
          <span class="text2">{t('inv.cost')} <Money v={v.costBasis} class="semi" /></span>
          <span class={v.gain >= 0 ? 'pos' : 'neg'}><Money v={v.gain} signed class="bold" /> ({v.gainPct >= 0 ? '+' : ''}{v.gainPct}%)</span>
        </div>
        {!v.hasPrice && <span class="xs" style="color:var(--accent-text)">{t('inv.noPrice')}</span>}
      </div>

      {price !== null && (
        <div class="grid2">
          <div class="tile"><span class="xs muted">{t('inv.price')}</span><span class="semi"><Money v={price} class="bold" /> <span class="xs muted">/{inv.kind === 'gold' ? t('inv.perGram') : t('inv.perShare')}</span></span></div>
          <div class="tile"><span class="xs muted">{t('inv.avgCost')}</span><span class="semi"><Money v={h.avgCost} class="bold" /></span></div>
        </div>
      )}

      {hist && hist.length > 1 && (
        <div class="card pad col gap10">
          <span class="h2">{t('inv.price')} · 30 {t('days')}</span>
          <LineChart
            count={Math.min(30, hist.length)}
            height={90}
            initial={Math.min(30, hist.length) - 1}
            series={[{ values: hist.slice(-30).map((p) => (inv.kind === 'stock' ? p.v * prices.usdSar : p.v)), color: '#5B8FD0', fill: true }]}
            xLabels={[fmtDay(hist.slice(-30)[0].date), fmtDay(hist[hist.length - 1].date)]}
            tip={(i) => <span>{fmtDay(hist.slice(-30)[i].date)} · {fmt((inv.kind === 'stock' ? hist.slice(-30)[i].v * prices.usdSar : hist.slice(-30)[i].v))}</span>}
          />
        </div>
      )}

      <div class="grid2">
        <button class="btn" onClick={() => setTrade('buy')}>{t('inv.buyMore')}</button>
        <button class="btn ghost" onClick={() => setTrade('sell')} disabled={h.quantity <= 0}>{t('inv.sellSome')}</button>
      </div>

      <Collapse open title={t('inv.history')} right={<span class="xs faint n">{history.length}</span>}>
        {history.length === 0 && <div class="empty">{t('empty')}</div>}
        {history.map((tx) => <TxRow tx={tx} showDate={fmtDay(tx.date)} />)}
      </Collapse>

      {h.quantity <= 0.0001 && <button class="btn outline" onClick={close}>{t('inv.close')}</button>}

      {trade && (
        <TradeSheet
          inv={inv}
          mode={trade}
          maxQty={h.quantity}
          unitLabel={inv.kind === 'gold' ? t('inv.qtyGrams') : inv.kind === 'stock' ? t('inv.qtyShares') : t('inv.qty')}
          priceHint={price !== null ? (inv.currency === 'USD' ? Math.round((price / prices.usdSar) * 100) / 100 : price) : null}
          usdSar={prices.usdSar}
          onClose={() => setTrade(null)}
        />
      )}
    </div>
  );
}
