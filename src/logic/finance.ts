import type { Account, AppData, Category, Commitment, Debt, ID, Tx } from '../store/types';
import { addDays, addMonths, clampDay, diffDays, inRange, monthKey, parseISO, salaryCycle, today, toISO, type Cycle } from './dates';

// ---------------- accounts ----------------

function txEffect(acc: Account, tx: Tx): number {
  const credit = acc.kind === 'credit';
  let v = 0;
  if (tx.type === 'expense' && tx.accountId === acc.id) v -= tx.amount;
  if (tx.type === 'income' && tx.accountId === acc.id) v += tx.amount;
  if (tx.type === 'transfer') {
    if (tx.accountId === acc.id) v -= tx.amount;
    if (tx.toAccountId === acc.id) v += tx.amount;
  }
  // credit accounts track the amount owed, so money going out increases it
  return credit ? -v : v;
}

export function balanceAt(d: AppData, acc: Account, upTo?: string): number {
  let b = acc.opening;
  for (const tx of d.txs) if (!upTo || tx.date <= upTo) b += txEffect(acc, tx);
  return round2(b);
}

export function balance(d: AppData, acc: Account): number {
  return balanceAt(d, acc);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function liquidAccounts(d: AppData): Account[] {
  return d.accounts.filter((a) => a.kind !== 'credit' && !a.archived);
}

export function creditAccounts(d: AppData): Account[] {
  return d.accounts.filter((a) => a.kind === 'credit' && !a.archived);
}

export function totalLiquid(d: AppData): number {
  return round2(liquidAccounts(d).reduce((s, a) => s + balance(d, a), 0));
}

export function totalCreditOwed(d: AppData): number {
  return round2(creditAccounts(d).reduce((s, a) => s + Math.max(0, balance(d, a)), 0));
}

export function creditAvailable(d: AppData): number {
  return round2(creditAccounts(d).reduce((s, a) => s + Math.max(0, (a.credit?.limit ?? 0) - balance(d, a)), 0));
}

// ---------------- debts ----------------

export function debtRemaining(d: AppData, debt: Debt): number {
  let r = debt.opening;
  const owe = debt.kind !== 'person' || debt.person?.direction !== 'owed';
  for (const tx of d.txs) {
    if (tx.debtId !== debt.id) continue;
    if (tx.type === 'expense') r += owe ? -tx.amount : tx.amount;
    if (tx.type === 'income') r += owe ? tx.amount : -tx.amount;
  }
  return round2(Math.max(0, r));
}

export function activeDebts(d: AppData): Debt[] {
  return d.debts.filter((x) => !x.closed);
}

export function oweDebts(d: AppData): Debt[] {
  return activeDebts(d).filter((x) => x.kind !== 'person' || x.person?.direction !== 'owed');
}

export function owedToMe(d: AppData): number {
  return round2(activeDebts(d).filter((x) => x.kind === 'person' && x.person?.direction === 'owed').reduce((s, x) => s + debtRemaining(d, x), 0));
}

export function totalDebt(d: AppData): number {
  return round2(oweDebts(d).reduce((s, x) => s + debtRemaining(d, x), 0) + totalCreditOwed(d));
}

export function netWorth(d: AppData, investmentsValue = 0): number {
  return round2(totalLiquid(d) - totalDebt(d) + owedToMe(d) + investmentsValue);
}

export function installmentsPaid(d: AppData, debt: Debt): number {
  if (!debt.installment || !debt.installmentsTotal) return 0;
  const paidAmount = debt.principal - debtRemaining(d, debt);
  return Math.min(debt.installmentsTotal, Math.max(0, Math.round(paidAmount / debt.installment)));
}

export function nextInstallmentDate(d: AppData, debt: Debt): string | undefined {
  const remaining = debtRemaining(d, debt);
  if (remaining <= 0) return undefined;
  if (debt.kind === 'bnpl' && debt.startDate) {
    const paid = installmentsPaid(d, debt);
    return debt.frequency === 'biweekly' ? addDays(debt.startDate, paid * 14) : addMonths(debt.startDate, paid);
  }
  if ((debt.kind === 'loan' || (debt.kind === 'person' && debt.monthly)) && (debt.dueDay || debt.kind === 'person')) {
    const day = debt.dueDay ?? d.settings.payday;
    const t = today();
    const [y, m] = t.split('-').map(Number);
    let due = clampDay(y, m - 1, day);
    const paidThisMonth = d.txs.some((tx) => tx.debtId === debt.id && monthKey(tx.date) === monthKey(due) && tx.type === 'expense');
    if (due < t || paidThisMonth) due = addMonths(due, 1, day);
    return due;
  }
  return undefined;
}

/** Amount of the next regular payment for a debt. */
export function debtPayment(d: AppData, debt: Debt): number {
  const rem = debtRemaining(d, debt);
  if (debt.kind === 'person') return Math.min(rem, debt.monthly ?? 0);
  return Math.min(rem, debt.installment ?? 0);
}

// ---------------- credit cards ----------------

export interface Statement {
  statementDate: string;
  dueDate: string;
  statementBalance: number;
  minimum: number;
  paidSince: number;
  newSince: number;
}

export function cardStatement(d: AppData, acc: Account, on = today()): Statement | undefined {
  const p = acc.credit;
  if (!p) return undefined;
  const [y, m, dd] = on.split('-').map(Number);
  let st = clampDay(y, m - 1, p.statementDay);
  if (dd < p.statementDay) st = addMonths(st, -1, p.statementDay);
  const statementBalance = Math.max(0, balanceAt(d, acc, st));
  const minimum = statementBalance <= 0 ? 0 : Math.min(statementBalance, Math.max((statementBalance * p.minPercent) / 100, p.minAmount));
  let paidSince = 0;
  let newSince = 0;
  for (const tx of d.txs) {
    if (tx.date <= st) continue;
    if (tx.type === 'transfer' && tx.toAccountId === acc.id) paidSince += tx.amount;
    if ((tx.type === 'expense' || tx.type === 'transfer') && tx.accountId === acc.id) newSince += tx.amount;
  }
  return { statementDate: st, dueDate: addDays(st, p.dueDays), statementBalance: round2(statementBalance), minimum: round2(minimum), paidSince: round2(paidSince), newSince: round2(newSince) };
}

export function cardMin(acc: Account, bal: number): number {
  const p = acc.credit;
  if (!p || bal <= 0) return 0;
  return Math.min(bal, Math.max((bal * p.minPercent) / 100, p.minAmount));
}

/** Pay a card down with a fixed payment (or the minimum when `payment` is 'min'). */
export function cardPayoff(acc: Account, bal: number, payment: number | 'min'): { months: number; interest: number } {
  const rate = (acc.credit?.monthlyRate ?? 0) / 100;
  let b = bal;
  let interest = 0;
  let months = 0;
  while (b > 0.5 && months < 600) {
    const i = b * rate;
    interest += i;
    b += i;
    const pay = payment === 'min' ? cardMin(acc, b) : Math.min(b, payment);
    if (pay <= i && payment !== 'min') return { months: Infinity, interest: Infinity };
    b -= pay;
    months++;
  }
  return { months: months >= 600 ? Infinity : months, interest: round2(interest) };
}

// ---------------- categories ----------------

export function catById(d: AppData, id?: ID): Category | undefined {
  return id ? d.categories.find((c) => c.id === id) : undefined;
}

export function rootCat(d: AppData, id?: ID): Category | undefined {
  const c = catById(d, id);
  if (!c) return undefined;
  return c.parentId ? catById(d, c.parentId) ?? c : c;
}

// ---------------- living budget ----------------

export function isLiving(d: AppData, tx: Tx): boolean {
  if (tx.type !== 'expense' || tx.debtId || tx.commitmentId || tx.tripId || tx.investmentId) return false;
  const c = catById(d, tx.categoryId);
  return c ? c.living : true;
}

export interface BudgetView {
  cycle: Cycle;
  budget: number;
  spentCycle: number;
  available: number;
  todayBudget: number;
  spentToday: number;
  leftToday: number;
  /** cumulative living spend by cycle day index up to today */
  cumulative: number[];
  projected: number;
}

export function budgetView(d: AppData, budgetOverride?: number): BudgetView {
  const t = today();
  const cycle = salaryCycle(d.settings.payday, t);
  const budget = budgetOverride ?? d.settings.livingBudget;
  const daily = new Array(cycle.dayIndex + 1).fill(0);
  let spentToday = 0;
  for (const tx of d.txs) {
    if (!isLiving(d, tx) || !inRange(tx.date, cycle.start, t)) continue;
    daily[diffDays(cycle.start, tx.date)] += tx.amount;
    if (tx.date === t) spentToday += tx.amount;
  }
  let run = 0;
  const cumulative = daily.map((v) => (run += v));
  const spentCycle = run;
  const before = spentCycle - spentToday;
  const todayBudget = Math.max(0, (budget - before) / Math.max(1, cycle.daysLeft));
  const elapsed = cycle.dayIndex + 1;
  const projected = elapsed >= 3 ? (spentCycle / elapsed) * cycle.days : Math.max(spentCycle, budget);
  return {
    cycle,
    budget,
    spentCycle: round2(spentCycle),
    available: round2(budget - spentCycle),
    todayBudget: round2(todayBudget),
    spentToday: round2(spentToday),
    leftToday: round2(todayBudget - spentToday),
    cumulative,
    projected: round2(projected)
  };
}

// ---------------- commitments ----------------

/** How many times a daily expense happens between two dates (inclusive). */
export function dailyCount(c: Commitment, from: string, to: string): number {
  if (to < from) return 0;
  const days = diffDays(from, to) + 1;
  if (!c.weekdays || c.weekdays.length === 0 || c.weekdays.length === 7) return days;
  let n = 0;
  const start = parseISO(from).getDay();
  for (let i = 0; i < days; i++) if (c.weekdays.includes((start + i) % 7)) n++;
  return n;
}

export function commitmentMonthly(c: Commitment): number {
  if (c.kind === 'daily') return (c.amount * 365 * ((c.weekdays?.length || 7) / 7)) / 12;
  return c.cycle === 'yearly' ? c.amount / 12 : c.amount;
}

export function commitmentsMonthly(d: AppData, kind?: Commitment['kind']): number {
  return round2(d.commitments.filter((c) => c.active && (!kind || c.kind === kind)).reduce((s, c) => s + commitmentMonthly(c), 0));
}

export function commitmentDueIn(c: Commitment, y: number, m0: number): string | undefined {
  if (c.kind === 'daily') return undefined;
  if (c.cycle === 'yearly' && (c.month ?? 1) - 1 !== m0) return undefined;
  return clampDay(y, m0, c.dayOfMonth);
}

export function commitmentPaid(d: AppData, c: Commitment, due: string): boolean {
  return d.txs.some((tx) => tx.commitmentId === c.id && monthKey(tx.date) === monthKey(due));
}

// ---------------- upcoming payments ----------------

export interface Upcoming {
  date: string;
  kind: 'fixed' | 'subscription' | 'installment' | 'card' | 'person';
  title: string;
  amount: number;
  refId: ID;
  sub?: string;
  logo: string;
  icon: string;
  avatar?: string;
  photo?: string;
}

export function upcoming(d: AppData, until?: string, planCardPay?: Record<ID, number>): Upcoming[] {
  const t = today();
  const end = until ?? salaryCycle(d.settings.payday, t).end;
  const out: Upcoming[] = [];
  const start = parseISO(t);
  for (let i = 0; i < 3; i++) {
    const md = new Date(start.getFullYear(), start.getMonth() + i, 1);
    for (const c of d.commitments) {
      if (!c.active || c.kind === 'daily') continue;
      const due = commitmentDueIn(c, md.getFullYear(), md.getMonth());
      if (!due || due < t || due > end || commitmentPaid(d, c, due)) continue;
      out.push({ date: due, kind: c.kind as 'fixed' | 'subscription', title: c.name, amount: c.amount, refId: c.id, logo: c.name.slice(0, 2), icon: catById(d, c.categoryId)?.icon ?? (c.kind === 'subscription' ? 'repeat' : 'bolt') });
    }
  }
  for (const debt of oweDebts(d)) {
    const due = nextInstallmentDate(d, debt);
    if (!due || due > end) continue;
    const amt = debtPayment(d, debt);
    if (amt <= 0) continue;
    out.push({
      date: due < t ? t : due,
      kind: debt.kind === 'person' ? 'person' : 'installment',
      title: debt.name,
      amount: amt,
      refId: debt.id,
      logo: debt.kind === 'person' ? debt.name.slice(0, 1) : debt.name.slice(0, 2),
      icon: debt.kind === 'loan' ? 'bank' : 'card',
      avatar: debt.person?.avatar,
      photo: debt.person?.photo
    });
  }
  for (const acc of creditAccounts(d)) {
    const st = cardStatement(d, acc, t);
    if (!st || st.statementBalance <= 0 || st.paidSince >= st.minimum || st.dueDate < t || st.dueDate > end) continue;
    const planned = planCardPay?.[acc.id];
    out.push({ date: st.dueDate, kind: 'card', title: acc.name, amount: planned && planned > st.minimum ? planned : st.minimum, refId: acc.id, sub: String(st.minimum), logo: acc.network === 'none' ? acc.name.slice(0, 2) : acc.network.toUpperCase().slice(0, 4), icon: 'card' });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// ---------------- reports ----------------

export interface PeriodStats {
  income: number;
  expense: number;
  byCat: { id: ID; total: number }[];
  sources: { id: ID; total: number }[];
  daily: number[];
  tripIds: ID[];
  count: number;
}

export function periodStats(d: AppData, start: string, end: string): PeriodStats {
  const days = diffDays(start, end) + 1;
  const daily = new Array(Math.max(1, days)).fill(0);
  const cats = new Map<ID, number>();
  const srcs = new Map<ID, number>();
  const trips = new Set<ID>();
  let income = 0;
  let expense = 0;
  let count = 0;
  for (const tx of d.txs) {
    if (!inRange(tx.date, start, end) || tx.type === 'transfer' || tx.investmentId) continue;
    count++;
    if (tx.type === 'income') {
      income += tx.amount;
      const k = rootCat(d, tx.categoryId)?.id ?? 'i-other';
      srcs.set(k, (srcs.get(k) ?? 0) + tx.amount);
    } else {
      expense += tx.amount;
      daily[diffDays(start, tx.date)] += tx.amount;
      const k = tx.debtId ? 'c-debtpay' : rootCat(d, tx.categoryId)?.id ?? 'c-other';
      cats.set(k, (cats.get(k) ?? 0) + tx.amount);
      if (tx.tripId) trips.add(tx.tripId);
    }
  }
  const sort = (m: Map<ID, number>) => [...m.entries()].map(([id, total]) => ({ id, total: round2(total) })).sort((a, b) => b.total - a.total);
  return { income: round2(income), expense: round2(expense), byCat: sort(cats), sources: sort(srcs), daily, tripIds: [...trips], count };
}

export function tripSpent(d: AppData, tripId: ID): number {
  return round2(d.txs.filter((tx) => tx.tripId === tripId && tx.type === 'expense').reduce((s, tx) => s + tx.amount, 0));
}

export function toCSV(d: AppData, catName: (c?: Category) => string): string {
  const acc = (id?: ID) => d.accounts.find((a) => a.id === id)?.name ?? '';
  const rows = [['date', 'time', 'type', 'amount', 'category', 'account', 'to_account', 'trip', 'note']];
  for (const tx of [...d.txs].sort((a, b) => a.date.localeCompare(b.date))) {
    rows.push([tx.date, tx.time ?? '', tx.type, String(tx.amount), catName(catById(d, tx.categoryId)), acc(tx.accountId), acc(tx.toAccountId), d.trips.find((x) => x.id === tx.tripId)?.name ?? '', tx.note ?? '']);
  }
  return '﻿' + rows.map((r) => r.map((v) => (/[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v)).join(',')).join('\n');
}

// ---------------- payoff plan ----------------

export interface PlanDebt {
  id: ID;
  name: string;
  kind: Debt['kind'];
  balance: number;
  /** monthly rate, used to decide which debt to pay down first */
  rate: number;
  /** whether the balance grows with profit each month. False for fixed-schedule loans
   *  (murabaha / installments), where what's left to pay already includes the profit. */
  accrues: boolean;
  min: (bal: number) => number;
  noExtra: boolean;
}

export interface PlanResult {
  totals: number[];
  payoff: Record<ID, number>;
  freeIdx: number;
  interest: number;
  deficit: boolean;
  firstMonth: { fixed: number; mins: number; living: number; save: number; extra: number; salary: number; perDebt: Record<ID, number> };
  order: ID[];
}

export function planDebts(d: AppData): PlanDebt[] {
  const list: PlanDebt[] = [];
  for (const acc of creditAccounts(d)) {
    const bal = balance(d, acc);
    if (bal <= 0) continue;
    list.push({ id: acc.id, name: acc.name, kind: 'card', balance: bal, rate: (acc.credit?.monthlyRate ?? 0) / 100, accrues: true, min: (b) => cardMin(acc, b), noExtra: false });
  }
  for (const debt of oweDebts(d)) {
    const bal = debtRemaining(d, debt);
    if (bal <= 0) continue;
    const perMonth = debt.kind === 'person' ? debt.monthly ?? 0 : (debt.installment ?? 0) * (debt.frequency === 'biweekly' ? 2 : 1);
    list.push({
      id: debt.id,
      name: debt.name,
      kind: debt.kind,
      balance: bal,
      rate: (debt.annualRate ?? 0) / 1200,
      accrues: debt.kind !== 'bnpl' && !debt.installmentsTotal,
      min: (b) => Math.min(b, perMonth),
      noExtra: debt.kind === 'bnpl'
    });
  }
  return list;
}

const kindRank: Record<Debt['kind'], number> = { card: 0, loan: 1, person: 2, bnpl: 3 };

export function simulate(d: AppData, strategy: 'avalanche' | 'snowball', livingOverride?: number, horizon = 120): PlanResult {
  const s = d.settings;
  const debts = planDebts(d).map((x) => ({ ...x }));
  const living = livingOverride ?? s.livingBudget;
  const fixed = commitmentsMonthly(d);
  const t = today();
  const [ty, tm] = t.split('-').map(Number);
  const bonusIdx = new Set<number>();
  if (s.bonus.enabled && s.bonus.amount > 0) {
    let bd = s.bonus.nextDate;
    for (let i = 0; i < 40; i++) {
      const [by, bm] = bd.split('-').map(Number);
      const idx = (by - ty) * 12 + (bm - tm);
      if (idx >= 0 && idx < horizon) bonusIdx.add(idx);
      bd = addMonths(bd, Math.max(1, s.bonus.everyMonths));
    }
  }
  const order = (list: typeof debts) =>
    [...list]
      .filter((x) => x.balance > 0.5)
      .sort((a, b) =>
        strategy === 'snowball' ? a.balance - b.balance : b.rate - a.rate || kindRank[a.kind] - kindRank[b.kind] || a.balance - b.balance
      );
  const totals = [round2(debts.reduce((a, x) => a + x.balance, 0))];
  const payoff: Record<ID, number> = {};
  let interest = 0;
  let deficit = false;
  let firstMonth: PlanResult['firstMonth'] = { fixed, mins: 0, living, save: 0, extra: 0, salary: s.salary, perDebt: {} };
  const initialOrder = order(debts).map((x) => x.id);
  const eAcc = d.accounts.find((a) => a.id === s.emergencyAccountId);
  let emergency = eAcc ? balance(d, eAcc) : 0;
  for (let m = 1; m <= horizon; m++) {
    const active = debts.filter((x) => x.balance > 0.5);
    if (!active.length) break;
    let mins = 0;
    for (const x of active) {
      if (!x.accrues) continue;
      const i = x.balance * x.rate;
      interest += i;
      x.balance += i;
    }
    const minOf = new Map<ID, number>();
    for (const x of active) {
      const mn = x.min(x.balance);
      minOf.set(x.id, mn);
      mins += mn;
    }
    const surplus = s.salary - fixed - living - mins;
    const save = emergency < s.emergencyTarget && surplus - s.saveMonthly >= 1000 ? s.saveMonthly : 0;
    emergency += save;
    let pool = mins + Math.max(0, surplus - save);
    if (surplus < 0) deficit = m === 1 ? true : deficit;
    const bonus = bonusIdx.has(m - 1) ? (s.bonus.amount * s.bonus.toDebt) / 100 : 0;
    pool += bonus;
    const perDebt: Record<ID, number> = {};
    for (const x of active) {
      const pay = Math.min(x.balance, minOf.get(x.id)!);
      x.balance -= pay;
      pool -= pay;
      perDebt[x.id] = pay;
    }
    pool = Math.max(0, pool);
    const targets = order(active).filter((x) => !x.noExtra);
    const tail = order(active).filter((x) => x.noExtra);
    for (const x of [...targets, ...tail]) {
      if (pool <= 0) break;
      const pay = Math.min(x.balance, pool);
      x.balance -= pay;
      pool -= pay;
      perDebt[x.id] = (perDebt[x.id] ?? 0) + pay;
    }
    if (m === 1) firstMonth = { fixed, mins, living, save, extra: Math.max(0, surplus - save), salary: s.salary, perDebt };
    for (const x of active) if (x.balance <= 0.5 && payoff[x.id] === undefined) payoff[x.id] = m;
    totals.push(round2(debts.reduce((a, x) => a + Math.max(0, x.balance), 0)));
  }
  const freeIdx = totals.findIndex((v) => v <= 0.5);
  return { totals, payoff, freeIdx: freeIdx === -1 ? Infinity : freeIdx, interest: round2(interest), deficit, firstMonth, order: initialOrder };
}

/** Month offset from the current month → { y, m0 } */
export function monthFromNow(offset: number): { y: number; m0: number } {
  const n = new Date();
  const d = new Date(n.getFullYear(), n.getMonth() + offset, 1);
  return { y: d.getFullYear(), m0: d.getMonth() };
}

export function sixMonths(): { y: number; m0: number; start: string; end: string }[] {
  const out = [];
  for (let i = -5; i <= 0; i++) {
    const { y, m0 } = monthFromNow(i);
    out.push({ y, m0, start: toISO(new Date(y, m0, 1)), end: toISO(new Date(y, m0 + 1, 0)) });
  }
  return out;
}
