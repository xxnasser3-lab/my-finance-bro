// "Is this rate good?" — compares a loan's or card's real yearly rate (APR) with rough
// typical ranges in the Saudi market, and converts the way offers are usually quoted
// (a flat rate, or just the installment) into the real rate.

export type RateKind = 'personal' | 'car' | 'mortgage' | 'card' | 'bnpl';
export type RateLevel = 'good' | 'typical' | 'high' | 'veryHigh';

/** Upper bounds of good / typical / high, APR %. Rough market ranges, not quotes. */
export const BANDS: Record<RateKind, [number, number, number]> = {
  personal: [7, 11, 16],
  car: [6.5, 10, 14],
  mortgage: [5, 6.5, 8],
  card: [18, 30, 36],
  bnpl: [0.01, 5, 15]
};

export function rateLevel(kind: RateKind, apr: number): RateLevel {
  const [g, t, h] = BANDS[kind];
  return apr <= g ? 'good' : apr <= t ? 'typical' : apr <= h ? 'high' : 'veryHigh';
}

/** Monthly rate r such that `payment` for `n` months repays `principal` (bisection). */
export function impliedMonthlyRate(principal: number, payment: number, n: number): number | null {
  if (principal <= 0 || payment <= 0 || n <= 0 || payment * n < principal - 0.01) return null;
  if (payment * n <= principal + 0.01) return 0;
  const pv = (r: number) => (r === 0 ? payment * n : (payment * (1 - Math.pow(1 + r, -n))) / r);
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (pv(mid) > principal) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** APR % from the amount received, the monthly installment and how many there are. */
export function aprFromInstallments(principal: number, payment: number, n: number): number | null {
  const r = impliedMonthlyRate(principal, payment, n);
  return r === null ? null : Math.round(r * 1200 * 100) / 100;
}

/** Banks often quote a flat yearly rate on the original amount; this is the real APR. */
export function aprFromFlat(flatPct: number, months: number): number | null {
  if (flatPct < 0 || months <= 0) return null;
  const principal = 1000;
  const payment = (principal * (1 + (flatPct / 100) * (months / 12))) / months;
  return aprFromInstallments(principal, payment, months);
}

/** Profit left to pay on a balance with a fixed monthly payment at `apr`. */
export function interestLeft(balance: number, payment: number, apr: number): number | null {
  const r = apr / 1200;
  if (balance <= 0) return 0;
  if (payment <= balance * r) return null;
  let b = balance;
  let paid = 0;
  for (let m = 0; m < 600 && b > 0.5; m++) {
    const i = b * r;
    paid += i;
    b = b + i - Math.min(payment, b + i);
  }
  return Math.round(paid);
}

/** Profit built into what's left of a fixed-installment loan: what's still owed minus
 *  its value at `apr` today (roughly what an early settlement would save). */
export function profitInSchedule(remaining: number, payment: number, apr: number): number | null {
  if (remaining <= 0) return 0;
  if (payment <= 0) return null;
  const r = apr / 1200;
  const n = Math.ceil(remaining / payment - 1e-9);
  const pv = r === 0 ? remaining : (payment * (1 - Math.pow(1 + r, -n))) / r;
  return Math.max(0, Math.round(remaining - Math.min(pv, remaining)));
}

/** Profit per 1,000 over one year at `apr`, paid down evenly (simple view). */
export const costPer1000 = (apr: number) => Math.round(apr * 10);
