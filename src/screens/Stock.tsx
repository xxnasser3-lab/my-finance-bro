import { useEffect, useState } from 'preact/hooks';
import { t } from '../i18n';
import { useData } from '../store/store';
import { Icon } from '../components/Icon';
import { TopBar, Money, Empty, fmt } from '../components/ui';
import { CurToggle, Disclaimer, InsightLines, PerfGrid, PriceChart, RangeBar, curLabel, dispCur, pct, toDisp } from '../components/insight';
import { holding, loadPrices, type PricesFile } from '../logic/investments';
import { insight } from '../logic/market';
import { navigate } from '../router';

export function Stock({ sym }: { sym: string }) {
  const d = useData();
  const [prices, setPrices] = useState<PricesFile | null>(null);
  useEffect(() => {
    loadPrices().then(setPrices);
  }, []);
  const symbol = decodeURIComponent(sym ?? '').toUpperCase();
  if (!prices) return <div class="screen no-nav"><TopBar back title={symbol} fallback="/market" /></div>;
  const s = prices.stocks[symbol];
  const ins = insight(prices, symbol);
  if (!s) return <div class="screen no-nav"><TopBar back title={symbol} fallback="/market" /><Empty k="mkt.unknown" /></div>;

  const cur = dispCur();
  const scale = cur === 'USD' ? 1 : prices.usdSar;
  const owned = d.investments.filter((x) => !x.archived && x.kind === 'stock' && x.symbol?.toUpperCase() === symbol);
  const h = owned.map((x) => holding(d, x, prices.usdSar));
  const qty = h.reduce((a, x) => a + x.quantity, 0);
  const cost = h.reduce((a, x) => a + x.costBasis, 0);
  const valueSar = qty * s.price * prices.usdSar;
  const r1d = s.stats?.r1d ?? null;

  return (
    <div class="screen no-nav">
      <TopBar back title={symbol} fallback="/market"><CurToggle /></TopBar>

      <div class="card hero col gap10" style="padding:18px">
        <div class="between" style="align-items:flex-start">
          <span class="col gap4" style="min-width:0">
            <span class="semi ellipsis">{s.name ?? symbol}</span>
            {s.sector && <span class="xs faint">{t(('sec.' + s.sector) as 'sec.tech')}</span>}
          </span>
          <span class={'pill ' + (r1d === null ? '' : r1d >= 0 ? 'green' : 'accent')}>{t('per.r1d')} {pct(r1d)}</span>
        </div>
        <div class="row-flex" style="align-items:baseline;gap:8px">
          <span style="font-size:34px;line-height:1"><Money v={s.price * scale} decimals={2} class="bold" hideable={false} /></span>
          <span class="small muted">{curLabel(cur)}</span>
        </div>
        <span class="xs faint n" dir="ltr" style="text-align:start">{cur === 'USD' ? '≈ ' + fmt(s.price * prices.usdSar, 2) + ' SAR' : '$' + fmt(s.price, 2)}</span>
        <PriceChart history={s.history} weekly={s.weekly} scale={scale} unit={curLabel(cur)} />
      </div>

      {ins && (
        <>
          <div class="card pad col gap10">
            <span class="h2">{t('ins.where')}</span>
            <RangeBar ins={ins} price={s.price} scale={scale} />
          </div>
          <div class="card pad col gap10">
            <span class="h2">{t('ins.perf')}</span>
            <PerfGrid stats={ins.stats} />
          </div>
          <div class="card pad-x">
            <div class="h2" style="padding:14px 0 4px">{t('ins.compare')}</div>
            <InsightLines ins={ins} price={s.price} />
          </div>
        </>
      )}

      {qty > 0 ? (
        <a href={'#/investment/' + owned[0].id} class="card pad col gap8" style="color:var(--text)">
          <div class="between"><span class="h2">{t('ins.yours')}</span><span class="pill">{fmt(qty, qty % 1 ? 2 : 0)} {t('inv.units.stock')}</span></div>
          <div class="between small">
            <span class="text2">{t('inv.value')} <Money v={toDisp(valueSar, prices)} class="semi" /></span>
            <span class={valueSar >= cost ? 'pos' : 'neg'}><Money v={toDisp(valueSar - cost, prices)} signed class="bold" /> ({pct(cost > 0 ? (valueSar / cost - 1) * 100 : 0)})</span>
          </div>
        </a>
      ) : (
        <button class="btn outline" onClick={() => navigate('/investment/new/' + encodeURIComponent(symbol))}><Icon name="plus" size={16} />{t('mkt.addHolding')}</button>
      )}

      <Disclaimer />
    </div>
  );
}
