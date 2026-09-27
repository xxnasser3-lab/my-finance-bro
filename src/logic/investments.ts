// Reads the price file the GitHub Actions robot publishes (see scripts/fetch-prices.mjs)
// and turns it, plus the user's own buy/sell log, into holdings, value and gain/loss.
// Nothing here ever sends the user's holdings anywhere — it only reads a public,
// generic price list and does the math on-device.
import type { AppData, ID, Investment } from '../store/types';
import { round2 } from './finance';
import { today } from './dates';

export interface PriceHistoryPoint {
  date: string;
  v: number;
}

export interface StockStats {
  h52: number;
  l52: number;
  r1d: number | null;
  r1w: number | null;
  r1m: number | null;
  r3m: number | null;
  r6m: number | null;
  r1y: number | null;
  ytd: number | null;
  /** annualized volatility, % */
  vol: number | null;
  ma50: number | null;
  ma200: number | null;
}

export interface StockPrice {
  price: number;
  currency: string;
  /** daily closes, about the last 6 months */
  history: PriceHistoryPoint[];
  /** every 5th trading day over the last year */
  weekly: PriceHistoryPoint[];
  name?: string;
  sector?: string;
  prevClose?: number;
  stats?: StockStats;
}

export interface PricesFile {
  updatedAt: string | null;
  usdSar: number;
  stocks: Record<string, StockPrice>;
  gold: { sarPerGram?: Record<string, number>; usdPerOunce?: number; history?: PriceHistoryPoint[]; stats?: StockStats };
  failures?: string[];
}

const EMPTY_PRICES: PricesFile = { updatedAt: null, usdSar: 3.75, stocks: {}, gold: {} };

interface RawV2 {
  v: 2;
  updatedAt: string | null;
  usdSar: number;
  dates: string[];
  stocks: Record<string, { p: number; cur: string; n?: string; sec?: string; pc?: number; end: string; c: number[]; w: number[]; s?: StockStats }>;
  gold: { sarPerGram?: Record<string, number>; usdPerOunce?: number; history?: PriceHistoryPoint[]; s?: StockStats };
  failures?: string[];
}

/** Expand the compact file the robot writes (closes aligned to a shared trading calendar). */
export function normalizePrices(raw: unknown): PricesFile {
  const r = raw as Partial<RawV2> & Partial<PricesFile>;
  if (!r || typeof r !== 'object' || !r.stocks) return EMPTY_PRICES;
  if (r.v !== 2) {
    const stocks: Record<string, StockPrice> = {};
    for (const [k, e] of Object.entries(r.stocks as Record<string, StockPrice>)) stocks[k] = { ...e, history: e.history ?? [], weekly: e.weekly ?? [] };
    return { ...EMPTY_PRICES, ...(r as PricesFile), stocks };
  }
  const dates = r.dates ?? [];
  const index = new Map(dates.map((d, i) => [d, i]));
  const stocks: Record<string, StockPrice> = {};
  for (const [sym, e] of Object.entries(r.stocks)) {
    const end = index.get(e.end) ?? dates.length - 1;
    const history = e.c.map((v, i) => ({ date: dates[end - (e.c.length - 1 - i)], v })).filter((p) => p.date);
    const weekly = e.w.map((v, i) => ({ date: dates[end - (e.w.length - 1 - i) * 5], v })).filter((p) => p.date);
    stocks[sym] = { price: e.p, currency: e.cur, history, weekly, name: e.n, sector: e.sec, prevClose: e.pc, stats: e.s };
  }
  const g = r.gold ?? {};
  return { updatedAt: r.updatedAt ?? null, usdSar: r.usdSar ?? 3.75, stocks, gold: { sarPerGram: g.sarPerGram, usdPerOunce: g.usdPerOunce, history: g.history, stats: g.s }, failures: r.failures };
}

let cache: PricesFile | null = null;
let cachePromise: Promise<PricesFile> | null = null;

/** Fetches prices.json (network-first via the service worker), cached for this session. */
export async function loadPrices(force = false): Promise<PricesFile> {
  if (cache && !force) return cache;
  if (cachePromise && !force) return cachePromise;
  const base = import.meta.env.BASE_URL ?? '/';
  cachePromise = fetch(`${base}prices.json?h=${Math.floor(Date.now() / 3600000)}`, { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : EMPTY_PRICES))
    .catch(() => EMPTY_PRICES)
    .then((raw) => {
      cache = normalizePrices(raw);
      return cache;
    });
  return cachePromise;
}

export function pricesLoaded(): PricesFile {
  return cache ?? EMPTY_PRICES;
}

export function stalePricesDays(prices: PricesFile): number | null {
  if (!prices.updatedAt) return null;
  return Math.floor((Date.now() - new Date(prices.updatedAt).getTime()) / 86400000);
}

// ---------------- holdings from the buy/sell log ----------------

export interface Holding {
  investment: Investment;
  quantity: number;
  avgCost: number;
  costBasis: number;
}

/**
 * Weighted-average cost, tracked in SAR (the currency real cash moves in) so it stays
 * exact regardless of what currency the investment is priced in. `tx.amount` on every
 * buy/sell is always the real SAR that left or entered the funding account (see
 * InvestmentDetail's trade sheet, which converts from the investment's own currency at
 * today's rate before saving) — so summing it here never needs a conversion.
 * `avgCost` is then only *derived back* into the investment's own currency for display,
 * using the current USD/SAR rate as an approximation for older trades (there is no stored
 * historical rate) — the exact SAR cost basis and gain are unaffected by that.
 */
export function holding(d: AppData, inv: Investment, usdSar = 3.75): Holding {
  const fx = inv.currency === 'USD' ? usdSar : 1;
  let qty = inv.quantity;
  let costSAR = round2(inv.quantity * inv.avgCost * fx);
  const txs = d.txs
    .filter((x) => x.investmentId === inv.id && x.qty)
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
  for (const tx of txs) {
    const q = tx.qty ?? 0;
    if (tx.type === 'expense') {
      costSAR += tx.amount;
      qty += q;
    } else if (tx.type === 'income') {
      if (qty > 0) costSAR -= (costSAR / qty) * Math.min(q, qty);
      qty = Math.max(0, round2(qty - q));
    }
  }
  costSAR = round2(costSAR);
  const avgCost = qty > 0 ? round2(costSAR / qty / fx) : inv.avgCost;
  return { investment: inv, quantity: round2(qty), avgCost, costBasis: costSAR };
}

export function holdings(d: AppData, usdSar = 3.75): Holding[] {
  return d.investments.filter((x) => !x.archived).map((inv) => holding(d, inv, usdSar));
}

// ---------------- pricing ----------------

/** Current price per unit in SAR (per share for stocks, per gram for gold). */
export function unitPriceSAR(inv: Investment, prices: PricesFile): number | null {
  if (inv.kind === 'gold') {
    return prices.gold.sarPerGram?.[String(inv.purity ?? 24)] ?? null;
  }
  if (inv.kind === 'stock' && inv.symbol) {
    const s = prices.stocks[inv.symbol.toUpperCase()];
    if (!s) return null;
    return s.currency === 'SAR' ? s.price : round2(s.price * prices.usdSar);
  }
  return null; // 'other': valued at cost, no live price
}

/** costBasis on a Holding is already in SAR — this is just the per-unit fallback for a
 *  symbol with no live price yet (used to value it "at cost" until one arrives). */
export function costPerUnitSAR(h: Holding): number {
  return h.quantity > 0 ? round2(h.costBasis / h.quantity) : 0;
}

export interface HoldingValue {
  holding: Holding;
  price: number | null;
  value: number;
  costBasis: number;
  gain: number;
  gainPct: number;
  hasPrice: boolean;
}

export function valueOf(h: Holding, prices: PricesFile): HoldingValue {
  const price = unitPriceSAR(h.investment, prices);
  const costBasis = h.costBasis;
  const value = price !== null ? round2(h.quantity * price) : costBasis;
  const gain = round2(value - costBasis);
  return { holding: h, price, value, costBasis, gain, gainPct: costBasis > 0 ? round2((gain / costBasis) * 100) : 0, hasPrice: price !== null };
}

export interface Portfolio {
  rows: HoldingValue[];
  totalValue: number;
  totalCost: number;
  totalGain: number;
  totalGainPct: number;
  byKind: { kind: Investment['kind']; value: number }[];
}

export function portfolio(d: AppData, prices: PricesFile): Portfolio {
  const rows = holdings(d, prices.usdSar).map((h) => valueOf(h, prices));
  const totalValue = round2(rows.reduce((s, r) => s + r.value, 0));
  const totalCost = round2(rows.reduce((s, r) => s + r.costBasis, 0));
  const byKindMap = new Map<Investment['kind'], number>();
  for (const r of rows) byKindMap.set(r.holding.investment.kind, round2((byKindMap.get(r.holding.investment.kind) ?? 0) + r.value));
  return {
    rows,
    totalValue,
    totalCost,
    totalGain: round2(totalValue - totalCost),
    totalGainPct: totalCost > 0 ? round2(((totalValue - totalCost) / totalCost) * 100) : 0,
    byKind: [...byKindMap.entries()].map(([kind, value]) => ({ kind, value })).sort((a, b) => b.value - a.value)
  };
}

/** Approximate portfolio value over the last `days`, holding today's quantities constant
 *  and replaying each symbol's historical price. Good enough for a trend line, not exact
 *  for periods where quantities actually changed. */
export function portfolioHistory(d: AppData, prices: PricesFile, days = 30): PriceHistoryPoint[] {
  const rows = holdings(d, prices.usdSar);
  if (!rows.length) return [];
  const dateSet = new Set<string>();
  for (const h of rows) {
    const hist = h.investment.kind === 'gold' ? prices.gold.history : h.investment.kind === 'stock' ? prices.stocks[h.investment.symbol?.toUpperCase() ?? '']?.history : undefined;
    hist?.slice(-days).forEach((p) => dateSet.add(p.date));
  }
  dateSet.add(today());
  const dates = [...dateSet].sort().slice(-days);
  return dates.map((date) => {
    let v = 0;
    for (const h of rows) {
      const hist = h.investment.kind === 'gold' ? prices.gold.history : h.investment.kind === 'stock' ? prices.stocks[h.investment.symbol?.toUpperCase() ?? '']?.history : undefined;
      const point = hist?.slice().reverse().find((p) => p.date <= date);
      const price = date === today() ? unitPriceSAR(h.investment, prices) : point?.v ?? null;
      v += h.quantity * (price ?? costPerUnitSAR(h));
    }
    return { date, v: round2(v) };
  });
}

export function findInvestment(d: AppData, id: ID): Investment | undefined {
  return d.investments.find((x) => x.id === id);
}
