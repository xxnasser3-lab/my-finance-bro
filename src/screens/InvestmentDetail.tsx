import { useEffect, useState } from 'preact/hooks';
import { t, fmtDay } from '../i18n';
import { getData, uid, update, useData } from '../store/store';
import type { Investment } from '../store/types';
import { Icon, Chev } from '../components/Icon';
import { TopBar, Money, Collapse, Sheet, Seg, Field, NumInput, fmt, toast, confirmDo, Empty } from '../components/ui';
import { TxRow } from '../components/TxRow';
import { CurToggle, Disclaimer, InsightLines, PerfGrid, PriceChart, RangeBar, curLabel, dispCur, pct, toDisp, type DispCur } from '../components/insight';
import { holding, loadPrices, unitPriceSAR, valueOf, type PricesFile } from '../logic/investments';
import { insight, insightFor } from '../logic/market';
import { round2 } from '../logic/finance';
import { nowTime, today } from '../logic/dates';
import { navigate } from '../router';

const PURITY_FACTOR = (p?: number) => (p ?? 24) / 24;

function TradeSheet({ inv, mode, maxQty, unitLabel, priceSar, prices, onClose }: { inv: Investment; mode: 'buy' | 'sell'; maxQty: number; unitLabel: string; priceSar: number | null; prices: PricesFile; onClose: () => void }) {
  const d = getData();
  const [cur, setCur] = useState<DispCur>(inv.currency === 'USD' ? 'USD' : 'SAR');
  const fx = prices.usdSar;
  const hint = (c: DispCur) => (priceSar === null ? undefined : round2(c === 'USD' ? priceSar / fx : priceSar));
  const [qty, setQty] = useState<number | undefined>(undefined);
  const [price, setPrice] = useState<number | undefined>(hint(cur));
  const [charged, setCharged] = useState<number | undefined>(undefined);
  const [accountId, setAccountId] = useState(inv.accountId ?? d.settings.salaryAccountId);
  const switchCur = (c: DispCur) => {
    if (c === cur) return;
    setPrice(price === undefined ? hint(c) : round2(c === 'USD' ? price / fx : price * fx));
    setCur(c);
  };
  const total = (qty ?? 0) * (price ?? 0);
  const totalSar = round2(cur === 'USD' ? total * fx : total);
  const amountSar = charged && charged > 0 ? round2(charged) : totalSar;
  const save = () => {
    if (!qty || qty <= 0) return toast(t('inv.qty'));
    if (!price || price <= 0) return toast(t('inv.price'));
    if (mode === 'sell' && qty > maxQty + 1e-9) return toast(t('inv.notEnough'));
    update((v) => ({
      ...v,
      txs: [
        ...v.txs,
        {
          id: uid(),
          type: mode === 'buy' ? 'expense' : 'income',
          amount: amountSar,
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
      <Field label={t('inv.enterIn')}>
        <Seg<DispCur> value={cur} onChange={switchCur} options={[['USD', t('inv.usd')], ['SAR', t('inv.sar')]]} />
      </Field>
      <div class="grid2">
        <Field label={unitLabel}><NumInput value={qty} onInput={setQty} /></Field>
        <Field label={t('inv.priceIn', { c: curLabel(cur) })} hint={t('inv.priceHint')}><NumInput value={price} onInput={setPrice} /></Field>
      </div>
      {mode === 'sell' && <span class="xs faint">{t('inv.qtyLeft', { n: fmt(maxQty, maxQty % 1 ? 4 : 0) })}</span>}
      {total > 0 && (
        <div class="inset col gap6">
          <div class="between small"><span class="muted">{t('amount')}</span><span class="n bold" dir="ltr">{cur === 'USD' ? '$' + fmt(total, 2) + ' ≈ ' : ''}{fmt(totalSar, 2)} SAR</span></div>
          <span class="xs faint">{t('inv.fxUsed', { r: fx.toFixed(4) })}</span>
        </div>
      )}
      <details>
        <summary class="small muted">{mode === 'buy' ? t('inv.chargedQ') : t('inv.receivedQ')}</summary>
        <Field label={(mode === 'buy' ? t('inv.charged') : t('inv.received')) + ' (' + t('cur') + ')'} hint={t('inv.chargedHint')}>
          <NumInput value={charged} placeholder={totalSar ? fmt(totalSar, 2) : ''} onInput={(v) => setCharged(Number.isNaN(v) ? undefined : v)} />
        </Field>
      </details>
      <Field label={mode === 'buy' ? t('tx.from') : t('tx.to')}>
        <select class="select" value={accountId ?? ''} onChange={(e) => setAccountId((e.target as HTMLSelectElement).value || undefined)}>
          <option value="">—</option>
          {d.accounts.filter((a) => !a.archived && a.kind !== 'credit').map((a) => <option value={a.id}>{a.name}</option>)}
        </select>
      </Field>
      <button class="btn" onClick={save}>{t('save')}{amountSar > 0 ? ' · ' + fmt(amountSar) + ' ' + t('cur') : ''}</button>
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

  const cur = dispCur();
  const disp = (sar: number) => toDisp(sar, prices, cur);
  const h = holding(d, inv, prices.usdSar);
  const v = valueOf(h, prices);
  const unit = t(('inv.units.' + inv.kind) as 'inv.units.stock');
  const price = unitPriceSAR(inv, prices);
  const avgSar = h.quantity > 0 ? h.costBasis / h.quantity : 0;
  const sym = inv.symbol?.toUpperCase() ?? '';
  const stock = inv.kind === 'stock' ? prices.stocks[sym] : undefined;
  const pf = PURITY_FACTOR(inv.purity);
  // chart values: stock history is in USD, gold history is SAR per gram of 24k
  const chartScale = inv.kind === 'stock' ? (cur === 'USD' ? 1 : prices.usdSar) : pf * (cur === 'USD' ? 1 / prices.usdSar : 1);
  const ins = inv.kind === 'stock' ? insight(prices, sym) : inv.kind === 'gold' && prices.gold.stats && price !== null ? insightFor(prices, prices.gold.stats, price / pf) : null;
  const history = d.txs.filter((x) => x.investmentId === id).sort((a, b) => (b.date + (b.time ?? '')).localeCompare(a.date + (a.time ?? '')));

  const close = () => {
    if (!confirmDo(t('inv.closeConfirm'))) return;
    update((x) => ({ ...x, investments: x.investments.map((y) => (y.id === id ? { ...y, archived: true } : y)) }));
    navigate('/investments', true);
  };

  return (
    <div class="screen no-nav">
      <TopBar back title={inv.name} fallback="/investments">
        <CurToggle />
        <button class="icon-btn" aria-label={t('edit')} onClick={() => navigate(`/investment/${id}/edit`)}><Icon name="edit" size={17} /></button>
      </TopBar>

      <div class="card hero col gap12" style="padding:18px">
        <div class="between">
          <span class="row-flex xs semi text2" style="gap:6px">{sym && <span class="n">{sym}</span>}{inv.purity && <span>{inv.purity}k</span>}{stock?.stats && <span class={(stock.stats.r1d ?? 0) >= 0 ? 'pos' : 'neg'}>{t('per.r1d')} {pct(stock.stats.r1d)}</span>}</span>
          <span class="pill">{fmt(h.quantity, h.quantity % 1 ? 4 : 0)} {unit}</span>
        </div>
        <div class="row-flex" style="align-items:baseline;gap:8px">
          <span style="font-size:32px;line-height:1"><Money v={disp(v.value)} class="bold" /></span>
          <span class="small muted">{curLabel(cur)}</span>
        </div>
        <div class="between small">
          <span class="text2">{t('inv.cost')} <Money v={disp(v.costBasis)} class="semi" /></span>
          <span class={v.gain >= 0 ? 'pos' : 'neg'}><Money v={disp(v.gain)} signed class="bold" /> ({pct(v.gainPct)})</span>
        </div>
        {!v.hasPrice && <span class="xs" style="color:var(--accent-text);line-height:1.6">{inv.kind === 'stock' ? t('inv.notTracked', { s: sym }) : t('inv.noPrice')}</span>}
        {(stock || inv.kind === 'gold') && (
          <PriceChart history={stock ? stock.history : prices.gold.history ?? []} weekly={stock?.weekly} scale={chartScale} unit={curLabel(cur)} />
        )}
      </div>

      {price !== null && (
        <div class="grid2">
          <div class="tile"><span class="xs muted">{t('inv.price')} · {inv.kind === 'gold' ? t('inv.perGram') : t('inv.perShare')}</span><Money v={disp(price)} decimals={2} class="bold" hideable={false} /></div>
          <div class="tile"><span class="xs muted">{t('inv.avgCost')}</span><Money v={disp(avgSar)} decimals={2} class="bold" /></div>
        </div>
      )}

      {ins && (
        <div class="card pad col gap12">
          <div class="between">
            <span class="h2">{t('ins.where')}</span>
            {stock && <a href={'#/stock/' + encodeURIComponent(sym)} class="row-flex xs semi" style="gap:4px">{t('ins.full')}<Chev dir="fwd" size={14} /></a>}
          </div>
          <RangeBar ins={ins} price={price !== null ? (inv.kind === 'stock' ? price / prices.usdSar : price / pf) : 0} scale={inv.kind === 'stock' ? (cur === 'USD' ? 1 : prices.usdSar) : pf * (cur === 'USD' ? 1 / prices.usdSar : 1)} />
          <PerfGrid stats={ins.stats} />
          <InsightLines ins={ins} price={inv.kind === 'stock' && price !== null ? price / prices.usdSar : (price ?? 0) / pf} />
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
      {ins && <Disclaimer />}

      {trade && (
        <TradeSheet
          inv={inv}
          mode={trade}
          maxQty={h.quantity}
          unitLabel={inv.kind === 'gold' ? t('inv.qtyGrams') : inv.kind === 'stock' ? t('inv.qtyShares') : t('inv.qty')}
          priceSar={price}
          prices={prices}
          onClose={() => setTrade(null)}
        />
      )}
    </div>
  );
}
