// Next month at a glance: what's expected to come in and go out during the next salary
// cycle, built from the user's own schedule (bills, installments, bonus) and habits
// (average living spend over the last few cycles).
import type { AppData, Debt, ID } from '../store/types';
import {
  balance, cardMin, commitmentDueIn, creditAccounts, dailyCount, debtRemaining, isLiving, nextInstallmentDate, oweDebts, rootCat, round2, tripSpent
} from './finance';
import { addDays, addMonths, inRange, parseISO, salaryCycle, today, type Cycle } from './dates';

export interface ForecastBill {
  label: string;
  amount: number;
  date: string;
  kind: 'fixed' | 'subscription' | 'installment' | 'person' | 'card' | 'trip';
  refId: ID;
}

export interface Forecast {
  cycle: Cycle;
  salary: number;
  bonus: number;
  /** average irregular income per cycle lately — shown, never counted on */
  irregular: number;
  fixed: number;
  subs: number;
  daily: number;
  debts: number;
  cards: number;
  living: number;
  livingBudget: number;
  /** living forecast comes from real spending history (vs. the budget when there's none) */
  fromHistory: boolean;
  trips: number;
  save: number;
  income: number;
  outflow: number;
  result: number;
  perDay: number;
  topCats: { id: ID; avg: number }[];
  bills: ForecastBill[];
}

/** The last `n` complete salary cycles before the current one, oldest first. */
export function pastCycles(payday: number, n: number): Cycle[] {
  const out: Cycle[] = [];
  let c = salaryCycle(payday, today());
  for (let i = 0; i < n; i++) {
    c = salaryCycle(payday, addDays(c.start, -1));
    out.unshift(c);
  }
  return out;
}

function stepDue(debt: Debt, date: string): string {
  if (debt.kind === 'bnpl') return debt.frequency === 'biweekly' ? addDays(date, 14) : addMonths(date, 1);
  return addMonths(date, 1, debt.dueDay ?? parseISO(date).getDate());
}

/** Scheduled payments for a debt that fall inside [start, end], given what's left now. */
export function debtPaymentsIn(d: AppData, debt: Debt, start: string, end: string): { date: string; amount: number }[] {
  const per = debt.kind === 'person' ? debt.monthly ?? 0 : debt.installment ?? 0;
  if (per <= 0) return [];
  let rem = debtRemaining(d, debt);
  let date = nextInstallmentDate(d, debt);
  const out: { date: string; amount: number }[] = [];
  for (let guard = 0; date && date <= end && rem > 0.5 && guard < 60; guard++) {
    const pay = Math.min(rem, per);
    if (date >= start) out.push({ date, amount: round2(pay) });
    rem -= pay;
    date = stepDue(debt, date);
  }
  return out;
}

export function forecastNext(d: AppData): Forecast {
  const s = d.settings;
  const cur = salaryCycle(s.payday, today());
  const cycle = salaryCycle(s.payday, cur.next);
  const { start, end } = cycle;
  const bills: ForecastBill[] = [];

  // bonus: any bonus date landing in the cycle
  let bonus = 0;
  if (s.bonus.enabled && s.bonus.amount > 0 && s.bonus.nextDate) {
    let bd = s.bonus.nextDate;
    for (let i = 0; i < 40 && bd <= end; i++) {
      if (bd >= start) bonus += s.bonus.amount;
      bd = addMonths(bd, Math.max(1, s.bonus.everyMonths));
    }
  }

  // bills and subscriptions due in the cycle
  let fixed = 0;
  let subs = 0;
  let daily = 0;
  const months = new Set<string>();
  for (let x = start; x <= end; x = addDays(x, 1)) months.add(x.slice(0, 7));
  for (const c of d.commitments) {
    if (!c.active) continue;
    if (c.kind === 'daily') {
      daily += dailyCount(c, start, end) * c.amount;
      continue;
    }
    for (const mk of months) {
      const [y, m] = mk.split('-').map(Number);
      const due = commitmentDueIn(c, y, m - 1);
      if (!due || !inRange(due, start, end)) continue;
      if (c.kind === 'subscription') subs += c.amount;
      else fixed += c.amount;
      bills.push({ label: c.name, amount: c.amount, date: due, kind: c.kind, refId: c.id });
    }
  }

  // installments and agreed payments to people
  let debts = 0;
  for (const debt of oweDebts(d)) {
    for (const p of debtPaymentsIn(d, debt, start, end)) {
      debts += p.amount;
      bills.push({ label: debt.name, amount: p.amount, date: p.date, kind: debt.kind === 'person' ? 'person' : 'installment', refId: debt.id });
    }
  }

  // credit cards: at least the minimum on what's owed now
  let cards = 0;
  for (const acc of creditAccounts(d)) {
    const min = cardMin(acc, balance(d, acc));
    if (min <= 0) continue;
    cards += min;
    const due = acc.credit ? addDays(addMonths(start, 0, acc.credit.statementDay), acc.credit.dueDays) : start;
    bills.push({ label: acc.name, amount: round2(min), date: inRange(due, start, end) ? due : start, kind: 'card', refId: acc.id });
  }

  // trips planned to start in the cycle
  let trips = 0;
  for (const tr of d.trips) {
    if (!tr.budget || !inRange(tr.start, start, end)) continue;
    const left = Math.max(0, tr.budget - tripSpent(d, tr.id));
    if (left <= 0) continue;
    trips += left;
    bills.push({ label: tr.name, amount: left, date: tr.start, kind: 'trip', refId: tr.id });
  }

  // living spend and irregular income from the last three cycles
  const past = pastCycles(s.payday, 3);
  const firstTx = d.txs.reduce((m, x) => (x.date < m ? x.date : m), today());
  const usable = past.filter((c) => c.start >= firstTx);
  const catTotals = new Map<ID, number>();
  let livingSum = 0;
  let irregularSum = 0;
  for (const c of usable) {
    for (const tx of d.txs) {
      if (!inRange(tx.date, c.start, c.end)) continue;
      if (isLiving(d, tx)) {
        livingSum += tx.amount;
        const k = rootCat(d, tx.categoryId)?.id ?? 'c-other';
        catTotals.set(k, (catTotals.get(k) ?? 0) + tx.amount);
      } else if (tx.type === 'income' && !tx.investmentId && !['i-salary', 'i-bonus', 'i-borrowed'].includes(tx.categoryId ?? '')) {
        irregularSum += tx.amount;
      }
    }
  }
  const n = usable.length;
  const fromHistory = n > 0 && livingSum > 0;
  const living = fromHistory ? round2(livingSum / n) : s.livingBudget;
  const irregular = n > 0 ? round2(irregularSum / n) : 0;
  const topCats = [...catTotals.entries()]
    .map(([id, total]) => ({ id, avg: round2(total / Math.max(1, n)) }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 4);

  const income = round2(s.salary + bonus);
  const outflow = round2(fixed + subs + daily + debts + cards + living + trips);
  const result = round2(income - outflow);
  return {
    cycle, salary: s.salary, bonus, irregular,
    fixed: round2(fixed), subs: round2(subs), daily: round2(daily), debts: round2(debts), cards: round2(cards),
    living, livingBudget: s.livingBudget, fromHistory, trips: round2(trips), save: s.saveMonthly,
    income, outflow, result, perDay: round2(result / Math.max(1, cycle.days)),
    topCats,
    bills: bills.sort((a, b) => a.date.localeCompare(b.date))
  };
}
