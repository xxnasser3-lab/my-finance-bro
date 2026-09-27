// Price robot: runs on a GitHub Actions schedule (see .github/workflows/prices.yml),
// fetches free delayed quotes from Yahoo Finance for a broad list of US tickers plus
// gold and the USD/SAR rate, and writes public/prices.json. The app reads that file;
// nothing here ever talks to the user's phone or knows what they actually hold.
import { readFile, writeFile } from 'node:fs/promises';

const GRAMS_PER_OZT = 31.1034768;
const PURITIES = { 24: 1, 22: 22 / 24, 21: 21 / 24, 18: 18 / 24 };
const HISTORY_DAYS = 200;
const OUT_PATH = new URL('../public/prices.json', import.meta.url);
const SYMBOLS_PATH = new URL('./symbols.json', import.meta.url);

async function fetchChart(symbol) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=10d`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; my-finance-bro price robot)' } });
  if (!res.ok) throw new Error(`${symbol}: HTTP ${res.status}`);
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(`${symbol}: no data (${json?.chart?.error?.description ?? 'unknown'})`);
  const price = result.meta?.regularMarketPrice;
  if (typeof price !== 'number') throw new Error(`${symbol}: no price`);
  const timestamps = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const days = timestamps
    .map((ts, i) => ({ date: new Date(ts * 1000).toISOString().slice(0, 10), close: closes[i] }))
    .filter((d) => typeof d.close === 'number');
  return { price, currency: result.meta?.currency ?? 'USD', days };
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

function mergeHistory(existing, days) {
  const byDate = new Map((existing ?? []).map((d) => [d.date, d.v]));
  for (const d of days) byDate.set(d.date, d.close);
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-HISTORY_DAYS)
    .map(([date, v]) => ({ date, v }));
}

async function main() {
  const { symbols } = JSON.parse(await readFile(SYMBOLS_PATH, 'utf-8'));
  let previous = { stocks: {}, gold: {}, usdSar: 3.75, updatedAt: null };
  try {
    previous = JSON.parse(await readFile(OUT_PATH, 'utf-8'));
  } catch {
    // first run: no existing file yet
  }

  const results = await mapLimit(symbols, 8, fetchChart);
  const stocks = {};
  const failures = [];
  symbols.forEach((sym, i) => {
    const r = results[i];
    if (!r.ok) {
      failures.push(`${sym}: ${r.error}`);
      const kept = previous.stocks?.[sym];
      if (kept) stocks[sym] = kept; // keep the last known price rather than dropping it
      return;
    }
    stocks[sym] = { price: r.value.price, currency: r.value.currency, history: mergeHistory(previous.stocks?.[sym]?.history, r.value.days) };
  });

  let usdSar = previous.usdSar ?? 3.75;
  try {
    const fx = await fetchChart('USDSAR=X');
    usdSar = fx.price;
  } catch (e) {
    failures.push(`USDSAR=X: ${e.message}`);
  }

  const gold = { ...previous.gold };
  try {
    const xau = await fetchChart('GC=F'); // USD per troy ounce
    const usdPerGram24k = xau.price / GRAMS_PER_OZT;
    const sarPerGram = {};
    for (const [k, factor] of Object.entries(PURITIES)) sarPerGram[k] = Math.round(usdPerGram24k * factor * usdSar * 100) / 100;
    gold.sarPerGram = sarPerGram;
    gold.usdPerOunce = xau.price;
    gold.history = mergeHistory(previous.gold?.history, xau.days.map((d) => ({ date: d.date, close: (d.close / GRAMS_PER_OZT) * usdSar })));
  } catch (e) {
    failures.push(`GC=F: ${e.message}`);
  }

  const out = { updatedAt: new Date().toISOString(), usdSar, stocks, gold, failures };
  await writeFile(OUT_PATH, JSON.stringify(out));
  console.log(`Wrote ${Object.keys(stocks).length} symbols, gold, USDSAR=${usdSar}.`);
  if (failures.length) console.warn('Failures:', failures.join('; '));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
