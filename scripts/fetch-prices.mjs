// Price robot: runs inside the GitHub Pages deploy workflow (on every push, hourly
// during US market hours, and once a day), fetches free delayed quotes from Yahoo
// Finance for a broad list of US tickers plus gold and USD/SAR, and writes
// public/prices.json right before the app is built. Nothing is committed back to the
// repo, and nothing here knows what the user actually holds.
//
// File format (v2, compact): a shared trading calendar `dates`, and per symbol the
// closes ending at `end` (daily for ~6 months `c`, every 5th trading day for a year `w`)
// plus stats computed here from a full year of data.
import { readFile, writeFile } from 'node:fs/promises';

const GRAMS_PER_OZT = 31.1034768;
const PURITIES = { 24: 1, 22: 22 / 24, 21: 21 / 24, 18: 18 / 24 };
const DAILY_POINTS = 130;
const CALENDAR_POINTS = 260;
const OUT_PATH = new URL('../public/prices.json', import.meta.url);
const SYMBOLS_PATH = new URL('./symbols.json', import.meta.url);

const r2 = (n) => Math.round(n * 100) / 100;
const r1 = (n) => Math.round(n * 10) / 10;

async function fetchChart(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1y`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; my-finance-bro price robot)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`no data (${json?.chart?.error?.description ?? 'unknown'})`);
  const meta = result.meta ?? {};
  if (typeof meta.regularMarketPrice !== 'number') throw new Error('no price');
  const timestamps = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const days = timestamps
    .map((ts, i) => ({ date: new Date(ts * 1000).toISOString().slice(0, 10), close: closes[i] }))
    .filter((d) => typeof d.close === 'number' && d.close > 0);
  if (!days.length) throw new Error('no history');
  return { price: meta.regularMarketPrice, currency: meta.currency ?? 'USD', name: meta.shortName || meta.longName || symbol, meta, days };
}

/** Everything the app's stock panel shows, from a year of daily closes. */
function computeStats(days, price, meta = {}) {
  const c = days.map((d) => d.close);
  const n = c.length;
  const lastDate = days[n - 1].date;
  const marketDate = meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000).toISOString().slice(0, 10) : lastDate;
  // when the latest bar is today's live bar, the previous close is the bar before it
  const prev = lastDate === marketDate && n >= 2 ? c[n - 2] : c[n - 1];
  const back = (k) => (n > k ? c[n - 1 - k] : undefined);
  const ret = (base) => (base ? r1((price / base - 1) * 100) : null);
  const year = lastDate.slice(0, 4);
  const prevYear = days.filter((d) => d.date < `${year}-01-01`);
  const logs = [];
  for (let i = Math.max(1, n - 252); i < n; i++) logs.push(Math.log(c[i] / c[i - 1]));
  const mean = logs.reduce((a, b) => a + b, 0) / Math.max(1, logs.length);
  const variance = logs.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, logs.length - 1);
  const avg = (k) => (n >= k ? r2(c.slice(-k).reduce((a, b) => a + b, 0) / k) : null);
  const h52 = Math.max(meta.fiftyTwoWeekHigh ?? 0, ...c, price);
  const l52 = Math.min(meta.fiftyTwoWeekLow ?? Infinity, ...c, price);
  return {
    prev: r2(prev),
    s: {
      h52: r2(h52), l52: r2(l52),
      r1d: ret(prev), r1w: ret(back(5)), r1m: ret(back(21)), r3m: ret(back(63)), r6m: ret(back(126)), r1y: n >= 240 ? ret(c[0]) : null,
      ytd: prevYear.length ? ret(prevYear[prevYear.length - 1].close) : null,
      vol: logs.length >= 20 ? r1(Math.sqrt(variance) * Math.sqrt(252) * 100) : null,
      ma50: avg(50), ma200: avg(200)
    }
  };
}

function compact(days) {
  const c = days.slice(-DAILY_POINTS).map((d) => r2(d.close));
  const w = [];
  for (let i = days.length - 1; i >= 0; i -= 5) w.unshift(r2(days[i].close));
  return { end: days[days.length - 1].date, c, w };
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      try {
        out[idx] = { ok: true, value: await fn(items[idx]) };
      } catch (e) {
        out[idx] = { ok: false, error: String(e?.message ?? e) };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/** The copy currently live on the site (or the local one), used when a symbol fails. */
async function loadPrevious() {
  if (process.env.PREV_URL) {
    try {
      const res = await fetch(process.env.PREV_URL, { cache: 'no-store' });
      if (res.ok) return await res.json();
      console.warn(`previous prices: HTTP ${res.status}`);
    } catch (e) {
      console.warn('previous prices:', e.message);
    }
  }
  try {
    return JSON.parse(await readFile(OUT_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

/** Keep a previous entry for a symbol that failed this run (either file version). */
function carryOver(prev, sym, sector) {
  const e = prev.stocks?.[sym];
  if (!e) return undefined;
  if (prev.v === 2) return e;
  if (!e.history?.length) return undefined; // v1 entry: { price, currency, history: [{date, v}] }
  return { p: e.price, cur: e.currency, n: sym, sec: sector, end: e.history[e.history.length - 1].date, c: e.history.map((h) => r2(h.v)).slice(-DAILY_POINTS), w: [] };
}

async function main() {
  const { sectors } = JSON.parse(await readFile(SYMBOLS_PATH, 'utf-8'));
  const sectorOf = {};
  for (const [sec, list] of Object.entries(sectors)) for (const s of list) sectorOf[s] ??= sec;
  const symbols = Object.keys(sectorOf);
  const previous = await loadPrevious();

  const results = await mapLimit(symbols, 8, fetchChart);
  const stocks = {};
  const failures = [];
  let calendar = [];
  symbols.forEach((sym, i) => {
    const r = results[i];
    if (!r.ok) {
      failures.push(`${sym}: ${r.error}`);
      const kept = carryOver(previous, sym, sectorOf[sym]);
      if (kept) stocks[sym] = kept;
      return;
    }
    const { price, currency, name, meta, days } = r.value;
    if (days.length > calendar.length) calendar = days.map((d) => d.date);
    const { prev, s } = computeStats(days, price, meta);
    stocks[sym] = { p: r2(price), cur: currency, n: name, sec: sectorOf[sym], pc: prev, ...compact(days), s };
  });
  if (!calendar.length && previous.v === 2) calendar = previous.dates ?? [];

  let usdSar = previous.usdSar ?? 3.75;
  try {
    usdSar = (await fetchChart('USDSAR=X')).price;
  } catch (e) {
    failures.push(`USDSAR=X: ${e.message}`);
  }

  let gold = previous.gold ?? {};
  try {
    const xau = await fetchChart('GC=F'); // USD per troy ounce
    const toSarGram = (usdOz) => (usdOz / GRAMS_PER_OZT) * usdSar;
    const sarPerGram = {};
    for (const [k, factor] of Object.entries(PURITIES)) sarPerGram[k] = r2(toSarGram(xau.price) * factor);
    const days = xau.days.map((d) => ({ date: d.date, close: toSarGram(d.close) }));
    gold = {
      sarPerGram,
      usdPerOunce: r2(xau.price),
      history: days.slice(-DAILY_POINTS).map((d) => ({ date: d.date, v: r2(d.close) })),
      s: computeStats(days, toSarGram(xau.price), {}).s
    };
  } catch (e) {
    failures.push(`GC=F: ${e.message}`);
  }

  const out = { v: 2, updatedAt: new Date().toISOString(), usdSar: Math.round(usdSar * 10000) / 10000, dates: calendar.slice(-CALENDAR_POINTS), stocks, gold, failures };
  await writeFile(OUT_PATH, JSON.stringify(out));
  console.log(`Wrote ${Object.keys(stocks).length}/${symbols.length} symbols, gold, USDSAR=${out.usdSar}. ${failures.length} failures.`);
  if (failures.length) console.warn('Failures:', failures.join('; '));
  if (Object.keys(stocks).length === 0) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
