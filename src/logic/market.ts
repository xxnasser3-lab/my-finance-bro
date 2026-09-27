// Where a stock stands: its 52-week range, trend, volatility, and how it compares with
// the S&P 500, its sector and every other tracked stock. Facts only — no buy/sell call.
import type { PricesFile, StockPrice, StockStats } from './investments';

export type Period = 'r1d' | 'r1w' | 'r1m' | 'r3m' | 'r6m' | 'ytd' | 'r1y';
export const PERIODS: Period[] = ['r1d', 'r1w', 'r1m', 'r3m', 'r6m', 'ytd', 'r1y'];
export const MARKET = 'SPY';
const FUNDS = new Set(['etf', 'shariah']);

export interface Rank {
  rank: number;
  count: number;
  avg: number;
}

export interface Insight {
  stats: StockStats;
  /** 0 = at the 52-week low, 100 = at the high */
  rangePos: number;
  fromHigh: number;
  fromLow: number;
  trend: 'up' | 'down' | 'mixed' | null;
  volLevel: 'low' | 'mid' | 'high' | null;
  /** share of tracked stocks that are less volatile, % */
  volPct: number | null;
  vsMarket: { period: Period; stock: number; market: number; diff: number }[];
  sector?: { key: string; r3m?: Rank; r1y?: Rank };
  /** share of tracked stocks this one beat over the year (or 3 months when a year isn't available) */
  beat?: { period: Period; pct: number };
}

const isFund = (s?: StockPrice) => !!s?.sector && FUNDS.has(s.sector);

function rankIn(list: StockPrice[], self: StockPrice, key: Period): Rank | undefined {
  const vals = list.map((x) => x.stats?.[key]).filter((v): v is number => typeof v === 'number');
  const mine = self.stats?.[key];
  if (typeof mine !== 'number' || vals.length < 2) return undefined;
  return { rank: vals.filter((v) => v > mine).length + 1, count: vals.length, avg: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 };
}

function percentBelow(values: number[], v: number): number {
  if (!values.length) return 0;
  return Math.round((values.filter((x) => x < v).length / values.length) * 100);
}

export function insight(prices: PricesFile, sym: string): Insight | null {
  const s = prices.stocks[sym];
  return s?.stats ? insightFor(prices, s.stats, s.price, s) : null;
}

/** Works for a stock (with peers) or for gold (stats only). */
export function insightFor(prices: PricesFile, stats: StockStats, price: number, self?: StockPrice): Insight {
  const span = Math.max(1e-9, stats.h52 - stats.l52);
  const rangePos = Math.min(100, Math.max(0, ((price - stats.l52) / span) * 100));
  const trend =
    stats.ma50 === null || stats.ma200 === null ? null : price > stats.ma50 && price > stats.ma200 && stats.ma50 >= stats.ma200 ? 'up' : price < stats.ma50 && price < stats.ma200 ? 'down' : 'mixed';
  const equities = Object.values(prices.stocks).filter((x) => x.stats && !isFund(x));
  const vols = equities.map((x) => x.stats!.vol).filter((v): v is number => typeof v === 'number');
  const volPct = stats.vol === null ? null : percentBelow(vols, stats.vol);
  const volLevel = stats.vol === null ? null : stats.vol < 20 ? 'low' : stats.vol < 40 ? 'mid' : 'high';

  const market = prices.stocks[MARKET]?.stats;
  const vsMarket: Insight['vsMarket'] = [];
  if (market && self !== prices.stocks[MARKET]) {
    for (const p of ['r1m', 'r3m', 'r1y'] as Period[]) {
      const a = stats[p];
      const b = market[p];
      if (typeof a === 'number' && typeof b === 'number') vsMarket.push({ period: p, stock: a, market: b, diff: Math.round((a - b) * 10) / 10 });
    }
  }

  const out: Insight = { stats, rangePos, fromHigh: Math.round((price / stats.h52 - 1) * 1000) / 10, fromLow: Math.round((price / stats.l52 - 1) * 1000) / 10, trend, volLevel, volPct, vsMarket };
  if (self?.sector) {
    const peers = Object.values(prices.stocks).filter((x) => x.sector === self.sector && x.stats);
    out.sector = { key: self.sector, r3m: rankIn(peers, self, 'r3m'), r1y: rankIn(peers, self, 'r1y') };
  }
  if (self && !isFund(self)) {
    const period: Period = typeof stats.r1y === 'number' ? 'r1y' : 'r3m';
    const mine = stats[period];
    if (typeof mine === 'number') {
      const others = equities.filter((x) => x !== self).map((x) => x.stats![period]).filter((v): v is number => typeof v === 'number');
      if (others.length >= 5) out.beat = { period, pct: percentBelow(others, mine) };
    }
  }
  return out;
}

export interface MarketRow {
  sym: string;
  s: StockPrice;
  change: number | null;
}

export function marketRows(prices: PricesFile, opts: { q?: string; sector?: string; sort: Period | 'name' }): MarketRow[] {
  const q = opts.q?.trim().toUpperCase();
  return Object.entries(prices.stocks)
    .filter(([sym, s]) => (!opts.sector || s.sector === opts.sector) && (!q || sym.includes(q) || (s.name ?? '').toUpperCase().includes(q)))
    .map(([sym, s]) => ({ sym, s, change: opts.sort === 'name' ? s.stats?.r1d ?? null : s.stats?.[opts.sort] ?? null }))
    .sort((a, b) => (opts.sort === 'name' ? a.sym.localeCompare(b.sym) : (b.change ?? -Infinity) - (a.change ?? -Infinity)));
}

export function sectors(prices: PricesFile): string[] {
  const order = ['tech', 'comm', 'consumer', 'staples', 'health', 'fin', 'energy', 'industrial', 'materials', 'utilities', 'realestate', 'etf', 'shariah'];
  const have = new Set(Object.values(prices.stocks).map((s) => s.sector).filter((x): x is string => !!x));
  return order.filter((k) => have.has(k));
}
