// Savings goals: how far along each one is, how fast the tracked money is actually
// growing, and — with or without a target date — when it'll be reached.
import type { AppData, Goal } from '../store/types';
import { balance, balanceAt, liquidAccounts, round2 } from './finance';
import { monthlyPicture } from './advisor';
import { addDays, diffDays, today } from './dates';

const DAYS_PER_MONTH = 30.44;

export interface GoalStatus {
  goal: Goal;
  current: number;
  remaining: number;
  pct: number;
  achieved: boolean;
  /** observed average growth per month of the tracked money; null when there's too little history */
  rate: number | null;
  /** when it's reached at the observed rate (or the planned monthly saving when there's no history) */
  eta?: string;
  etaFromPlan: boolean;
  monthsLeft?: number;
  /** needed per month to hit the target date */
  needed?: number;
  onTrack?: boolean;
  overdue: boolean;
  /** what's left over each month after bills, installments and living — the realistic ceiling */
  capacity: number;
  /** a date that fits the monthly capacity, when the chosen date doesn't */
  realistic?: string;
}

function trackedAt(d: AppData, g: Goal, on?: string): number {
  const acc = g.accountId ? d.accounts.find((a) => a.id === g.accountId) : undefined;
  if (acc) return on ? balanceAt(d, acc, on) : balance(d, acc);
  return round2(liquidAccounts(d).reduce((s, a) => s + (on ? balanceAt(d, a, on) : balance(d, a)), 0));
}

const monthsToDate = (months: number) => addDays(today(), Math.ceil(months * DAYS_PER_MONTH));

export function goalStatus(d: AppData, g: Goal): GoalStatus {
  const t = today();
  const current = trackedAt(d, g);
  const remaining = round2(Math.max(0, g.targetAmount - current));
  const achieved = remaining <= 0;
  const pct = g.targetAmount > 0 ? Math.min(100, Math.max(0, (current / g.targetAmount) * 100)) : 0;

  const firstTx = d.txs.reduce((m, x) => (x.date < m ? x.date : m), t);
  const window = Math.min(90, diffDays(firstTx, t));
  const rate = window >= 20 ? round2((current - trackedAt(d, g, addDays(t, -window))) / (window / DAYS_PER_MONTH)) : null;

  const mp = monthlyPicture(d);
  const capacity = round2(Math.max(0, mp.gap));
  const pace = rate !== null && rate > 0 ? rate : d.settings.saveMonthly > 0 ? d.settings.saveMonthly : 0;
  const etaFromPlan = !(rate !== null && rate > 0);
  const eta = !achieved && pace > 0 ? monthsToDate(remaining / pace) : undefined;

  const s: GoalStatus = { goal: g, current, remaining, pct, achieved, rate, eta, etaFromPlan, overdue: false, capacity };
  if (g.targetDate && !achieved) {
    const days = diffDays(t, g.targetDate);
    s.overdue = days < 0;
    s.monthsLeft = Math.max(0, days / DAYS_PER_MONTH);
    s.needed = round2(s.monthsLeft >= 1 ? remaining / s.monthsLeft : remaining);
    s.onTrack = rate !== null && rate >= s.needed * 0.98;
    if (!s.onTrack && capacity > 0 && s.needed > capacity) s.realistic = monthsToDate(remaining / capacity);
  }
  return s;
}

export function goalStatuses(d: AppData): GoalStatus[] {
  return d.goals.filter((g) => !g.archived).map((g) => goalStatus(d, g));
}
