import { useEffect, useState } from 'preact/hooks';
import { t, fmtDay } from '../i18n';
import { useData } from '../store/store';
import { Icon } from '../components/Icon';
import { TopBar, Seg, fmt } from '../components/ui';
import { CurToggle, Disclaimer, curLabel, dispCur, pct } from '../components/insight';
import { loadPrices, type PricesFile } from '../logic/investments';
import { MARKET, marketRows, sectors, type Period } from '../logic/market';

type SortKey = 'r1d' | 'r1m' | 'r1y' | 'name';

export function Market() {
  const d = useData();
  const [prices, setPrices] = useState<PricesFile | null>(null);
  const [q, setQ] = useState('');
  const [sector, setSector] = useState<string | undefined>();
  const [sort, setSort] = useState<SortKey>('r1d');
  useEffect(() => {
    loadPrices().then(setPrices);
  }, []);
  if (!prices) return <div class="screen no-nav"><TopBar back title={t('mkt.title')} /></div>;
  const cur = dispCur();
  const scale = cur === 'USD' ? 1 : prices.usdSar;
  const mine = new Set(d.investments.filter((x) => !x.archived && x.symbol).map((x) => x.symbol!.toUpperCase()));
  const rows = marketRows(prices, { q, sector, sort: sort as Period | 'name' });
  const spy = prices.stocks[MARKET]?.stats;
  const secs = sectors(prices);

  return (
    <div class="screen no-nav">
      <TopBar back title={t('mkt.title')}><CurToggle /></TopBar>

      {spy && (
        <a href={'#/stock/' + MARKET} class="card pad col gap8" style="color:var(--text)">
          <div class="between"><span class="h2">{t('mkt.market')}</span><span class="xs faint">S&amp;P 500 · SPY</span></div>
          <div class="grid4" style="gap:6px">
            {(['r1d', 'r1m', 'ytd', 'r1y'] as Period[]).map((p) => (
              <div class="col gap4" style="align-items:center"><span class="xs faint">{t(('per.' + p) as 'per.r1d')}</span><span class={'small bold n ' + ((spy[p] ?? 0) >= 0 ? 'pos' : 'neg')}>{pct(spy[p])}</span></div>
            ))}
          </div>
        </a>
      )}

      <div class="row-flex" style="gap:8px;padding:0 12px;height:44px;border-radius:12px;border:1px solid var(--line-2);background:var(--bg)">
        <Icon name="search" size={17} class="muted" />
        <input class="grow" style="border:0;background:none;outline:none;height:100%;font-size:14px" dir="auto" placeholder={t('mkt.search')} value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} />
      </div>

      <div class="chips scroll">
        <button class={'chip solid' + (!sector ? ' on' : '')} onClick={() => setSector(undefined)}>{t('txs.all')}</button>
        {secs.map((k) => <button class={'chip solid' + (sector === k ? ' on' : '')} onClick={() => setSector(k)}>{t(('sec.' + k) as 'sec.tech')}</button>)}
      </div>

      <Seg<SortKey> value={sort} onChange={setSort} options={[['r1d', t('per.r1d')], ['r1m', t('per.r1m')], ['r1y', t('per.r1y')], ['name', 'A–Z']]} />

      <div class="card pad-x">
        {rows.length === 0 && <div class="empty">{t('mkt.none')}</div>}
        {rows.map((r) => (
          <a class="row" href={'#/stock/' + encodeURIComponent(r.sym)}>
            <span class="ib n" style={{ fontSize: r.sym.length > 4 ? '9px' : '10.5px', color: mine.has(r.sym) ? 'var(--accent-text)' : undefined, borderColor: mine.has(r.sym) ? 'var(--accent)' : undefined }}>{r.sym}</span>
            <span class="grow col gap4" style="min-width:0">
              <span class="semi ellipsis" style="font-size:13.5px">{r.s.name ?? r.sym}</span>
              <span class="xs faint">{r.s.sector ? t(('sec.' + r.s.sector) as 'sec.tech') : ''}{mine.has(r.sym) ? ' · ' + t('mkt.youOwn') : ''}</span>
            </span>
            <span class="col" style="align-items:flex-end;gap:2px">
              <span class="n bold small">{fmt(r.s.price * scale, 2)}</span>
              <span class={'xs n bold ' + ((r.change ?? 0) >= 0 ? 'pos' : 'neg')}>{pct(r.change)}</span>
            </span>
          </a>
        ))}
      </div>

      <span class="xs faint" style="line-height:1.7;padding:0 4px">{t('mkt.note', { n: Object.keys(prices.stocks).length, c: curLabel(cur) })}{prices.updatedAt ? ' · ' + t('inv.updated') + ': ' + fmtDay(prices.updatedAt.slice(0, 10)) + ' ' + new Date(prices.updatedAt).toTimeString().slice(0, 5) : ''}</span>
      <Disclaimer />
    </div>
  );
}
