// Money advice: cash left until payday, a step-by-step plan when it falls short,
// and ongoing tips. Everything here is computed from the user's own data.
import type { AppData, Commitment, ID, Priority } from '../store/types';
import {
  balance, budgetView, cardStatement, catById, commitmentMonthly, commitmentsMonthly, creditAccounts, dailyCount, periodStats,
  round2, simulate, totalLiquid, upcoming, type Upcoming
} from './finance';
import { addDays, diffDays, monthRange, salaryCycle, today } from './dates';

export const defaultPriority = (c: Commitment): Priority => c.priority ?? (c.kind === 'subscription' ? 'optional' : c.kind === 'daily' ? 'important' : 'essential');

export interface Obligation {
  label: string;
  amount: number;
  date: string;
  kind: Upcoming['kind'] | 'daily';
  refId: ID;
  priority: Priority;
  count?: number;
}

export interface Cashflow {
  cash: number;
  emergency: number;
  obligations: Obligation[];
  obligationsTotal: number;
  livingLeft: number;
  afterObligations: number;
  /** what's left after bills and the planned living budget (negative = shortfall) */
  result: number;
  daysLeft: number;
  /** cash after bills, spread over the days left */
  freePerDay: number;
  nextPay: string;
}

export function cashflow(d: AppData): Cashflow {
  const t = today();
  const cycle = salaryCycle(d.settings.payday, t);
  const plan = simulate(d, d.settings.strategy);
  const eAcc = d.accounts.find((a) => a.id === d.settings.emergencyAccountId && a.kind !== 'credit');
  const emergency = eAcc ? Math.max(0, balance(d, eAcc)) : 0;
  const cash = round2(totalLiquid(d) - emergency);
  const obligations: Obligation[] = upcoming(d, cycle.end, plan.firstMonth.perDebt).map((u) => {
    const c = d.commitments.find((x) => x.id === u.refId);
    return { label: u.title, amount: u.amount, date: u.date, kind: u.kind, refId: u.refId, priority: c ? defaultPriority(c) : u.kind === 'person' ? 'important' : 'essential' };
  });
  for (const c of d.commitments) {
    if (!c.active || c.kind !== 'daily') continue;
    const from = c.auto !== false && (c.lastPosted ?? '') >= t ? addDays(t, 1) : t;
    const n = dailyCount(c, from, cycle.end);
    if (n > 0) obligations.push({ label: c.name, amount: round2(c.amount * n), date: from, kind: 'daily', refId: c.id, priority: defaultPriority(c), count: n });
  }
  const obligationsTotal = round2(obligations.reduce((s, o) => s + o.amount, 0));
  const bv = budgetView(d);
  const livingLeft = Math.max(0, round2(bv.budget - bv.spentCycle));
  const afterObligations = round2(cash - obligationsTotal);
  return {
    cash, emergency, obligations, obligationsTotal, livingLeft, afterObligations,
    result: round2(afterObligations - livingLeft),
    daysLeft: cycle.daysLeft,
    freePerDay: round2(afterObligations / Math.max(1, cycle.daysLeft)),
    nextPay: cycle.next
  };
}

export type StepKind = 'pauseSub' | 'trimDaily' | 'cutLiving' | 'cardMin' | 'askDelay' | 'dropImportant' | 'useEmergency';

export interface Step {
  kind: StepKind;
  label: string;
  amount: number;
  /** extra numbers for the message */
  a?: number;
  b?: number;
  refId?: ID;
  remaining: number;
}

/** Ordered actions that close a shortfall until payday: least painful first. */
export function deficitSteps(d: AppData, cf: Cashflow): Step[] {
  let gap = -cf.result;
  if (gap <= 0) return [];
  const steps: Step[] = [];
  const add = (s: Omit<Step, 'remaining'>) => {
    if (gap <= 0 || s.amount <= 0) return;
    gap = round2(gap - s.amount);
    steps.push({ ...s, remaining: Math.max(0, gap) });
  };
  const byAmount = (a: Obligation, b: Obligation) => b.amount - a.amount;
  // 1. things you can live without
  cf.obligations.filter((o) => o.priority === 'optional' && o.kind !== 'daily').sort(byAmount).forEach((o) => add({ kind: 'pauseSub', label: o.label, amount: o.amount, refId: o.refId }));
  cf.obligations.filter((o) => o.priority === 'optional' && o.kind === 'daily').sort(byAmount).forEach((o) => add({ kind: 'trimDaily', label: o.label, amount: o.amount, a: o.count, refId: o.refId }));
  // 2. spend a bit less day to day
  if (cf.livingLeft > 0 && gap > 0) {
    const cut = Math.min(gap, round2(cf.livingLeft * 0.3));
    const perDay = cf.livingLeft / Math.max(1, cf.daysLeft);
    add({ kind: 'cutLiving', label: '', amount: cut, a: Math.round(perDay), b: Math.round((cf.livingLeft - cut) / Math.max(1, cf.daysLeft)) });
  }
  // 3. halve important daily habits
  cf.obligations.filter((o) => o.priority === 'important' && o.kind === 'daily').sort(byAmount).forEach((o) => add({ kind: 'trimDaily', label: o.label, amount: round2(o.amount / 2), a: o.count, refId: o.refId }));
  // 4. pay only the card minimum this time
  for (const o of cf.obligations.filter((x) => x.kind === 'card')) {
    const acc = d.accounts.find((a) => a.id === o.refId);
    const st = acc ? cardStatement(d, acc) : undefined;
    if (!acc || !st || o.amount <= st.minimum) continue;
    const saved = round2(o.amount - st.minimum);
    add({ kind: 'cardMin', label: o.label, amount: saved, a: st.minimum, b: round2(saved * ((acc.credit?.monthlyRate ?? 0) / 100)), refId: o.refId });
  }
  // 5. ask people you owe for a short delay
  cf.obligations.filter((o) => o.kind === 'person').sort(byAmount).forEach((o) => add({ kind: 'askDelay', label: o.label, amount: o.amount, refId: o.refId }));
  // 6. important (non-daily) commitments
  cf.obligations.filter((o) => o.priority === 'important' && o.kind !== 'daily' && o.kind !== 'person').sort(byAmount).forEach((o) => add({ kind: 'dropImportant', label: o.label, amount: o.amount, refId: o.refId }));
  // 7. last resort
  if (gap > 0 && cf.emergency > 0) add({ kind: 'useEmergency', label: '', amount: Math.min(gap, cf.emergency) });
  return steps;
}

export interface MonthlyPicture {
  salary: number;
  fixed: number;
  subsOptional: number;
  daily: number;
  mins: number;
  living: number;
  gap: number;
}

/** Recurring monthly shortfall (independent of this cycle's timing). */
export function monthlyPicture(d: AppData): MonthlyPicture {
  const plan = simulate(d, d.settings.strategy);
  const active = d.commitments.filter((c) => c.active);
  const daily = round2(active.filter((c) => c.kind === 'daily').reduce((s, c) => s + commitmentMonthly(c), 0));
  const fixed = round2(commitmentsMonthly(d) - daily);
  const subsOptional = round2(active.filter((c) => c.kind !== 'daily' && defaultPriority(c) === 'optional').reduce((s, c) => s + commitmentMonthly(c), 0));
  const living = d.settings.livingBudget;
  const mins = round2(plan.firstMonth.mins);
  return { salary: d.settings.salary, fixed, subsOptional, daily, mins, living, gap: round2(d.settings.salary - fixed - daily - mins - living) };
}

export type TipLevel = 'danger' | 'warn' | 'good' | 'info';
export type TipKind =
  | 'deficit' | 'monthlyDeficit' | 'surplus' | 'catOver' | 'cardDue' | 'extraIncome' | 'emergencyLow' | 'dailyCost' | 'optionalSubs' | 'pace';

export interface Tip {
  kind: TipKind;
  level: TipLevel;
  v?: number;
  w?: number;
  x?: number;
  label?: string;
  date?: string;
  href: string;
}

export function tips(d: AppData): Tip[] {
  const out: Tip[] = [];
  const t = today();
  const cf = cashflow(d);
  const bv = budgetView(d);
  const mp = monthlyPicture(d);
  if (cf.result < 0) out.push({ kind: 'deficit', level: 'danger', v: -cf.result, w: Math.ceil(-cf.result / Math.max(1, cf.daysLeft)), href: '/advice' });
  if (mp.salary > 0 && mp.gap < 0) out.push({ kind: 'monthlyDeficit', level: 'danger', v: -mp.gap, href: '/advice' });
  // card statements due soon
  for (const acc of creditAccounts(d)) {
    const st = cardStatement(d, acc);
    if (!st || st.statementBalance <= 0 || st.paidSince >= st.statementBalance) continue;
    const days = diffDays(t, st.dueDate);
    if (days < 0 || days > 7) continue;
    const owed = st.statementBalance - st.paidSince;
    out.push({ kind: 'cardDue', level: days <= 2 ? 'warn' : 'info', label: acc.name, v: owed, w: round2(owed * ((acc.credit?.monthlyRate ?? 0) / 100)), x: st.minimum, date: st.dueDate, href: '/account/' + acc.id });
  }
  // categories over their monthly budget
  const n = new Date();
  const mr = monthRange(n.getFullYear(), n.getMonth());
  const ms = periodStats(d, mr.start, mr.end);
  for (const c of ms.byCat) {
    const cat = catById(d, c.id);
    if (cat?.monthlyBudget && c.total > cat.monthlyBudget) out.push({ kind: 'catOver', level: 'warn', label: cat.key ?? cat.name, v: c.total, w: cat.monthlyBudget, href: '/categories' });
  }
  // spending pace
  if (cf.result >= 0 && bv.cycle.dayIndex >= 2 && bv.projected > bv.budget * 1.05) out.push({ kind: 'pace', level: 'warn', v: Math.ceil((bv.projected - bv.budget) / Math.max(1, bv.cycle.daysLeft)), href: '/reports' });
  // unexpected income this cycle
  const extra = d.txs
    .filter((x) => x.type === 'income' && x.date >= bv.cycle.start && !['i-salary', 'i-bonus', 'i-borrowed'].includes(x.categoryId ?? ''))
    .reduce((s, x) => s + x.amount, 0);
  if (extra > 0) out.push({ kind: 'extraIncome', level: 'good', v: extra, w: Math.round((extra * d.settings.bonus.toDebt) / 100), x: Math.round((extra * d.settings.bonus.toSavings) / 100), href: '/plan' });
  // surplus until payday
  if (cf.result > 0 && cf.result > cf.livingLeft * 0.2 && cf.result > 300) out.push({ kind: 'surplus', level: 'good', v: cf.result, href: '/plan' });
  // optional subscriptions when money is tight
  if ((cf.result < 0 || mp.gap < 0) && mp.subsOptional > 0) out.push({ kind: 'optionalSubs', level: 'info', v: mp.subsOptional, w: mp.subsOptional * 12, href: '/bills' });
  // daily habits cost
  for (const c of d.commitments.filter((x) => x.active && x.kind === 'daily')) {
    const m = commitmentMonthly(c);
    out.push({ kind: 'dailyCost', level: 'info', label: c.name, v: Math.round(m), w: Math.round(m * 12), href: '/bills' });
  }
  // emergency fund
  const monthlyNeed = mp.fixed + mp.daily + mp.living;
  if (d.settings.emergencyAccountId && monthlyNeed > 0 && cf.emergency < monthlyNeed) out.push({ kind: 'emergencyLow', level: 'info', v: cf.emergency, w: Math.round(monthlyNeed), href: '/plan' });
  const rank: Record<TipLevel, number> = { danger: 0, warn: 1, good: 2, info: 3 };
  return out.sort((a, b) => rank[a.level] - rank[b.level]);
}
