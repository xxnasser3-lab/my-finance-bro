import type { Account, AppData, Tx } from './types';
import { emptyData } from './seed';
import { addDays, addMonths, clampDay, parseISO, salaryCycle, today } from '../logic/dates';
import { balance, debtRemaining } from '../logic/finance';

/** Realistic demo data relative to today, so every screen has something to show. */
export function sampleData(lang: 'ar' | 'en'): AppData {
  const ar = lang === 'ar';
  const d = emptyData({ lang, name: ar ? 'ناصر' : 'Nasser', salary: 14000, payday: 27, livingBudget: 3000 });
  const t = today();
  const now = new Date().toISOString();
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  let n = 0;
  const id = (p: string) => p + '-' + (++n).toString(36);

  const acc = (a: Partial<Account> & Pick<Account, 'id' | 'kind' | 'name'>): Account => ({ network: 'none', skin: 0, opening: 0, secrets: {}, createdAt: now, ...a });
  d.accounts = [
    acc({ id: 'a-rajhi', kind: 'bank', name: ar ? 'الراجحي · جاري' : 'Al Rajhi · Current', bank: ar ? 'الراجحي' : 'Al Rajhi', network: 'mada', skin: 1, last4: '4410', secrets: { holder: '[NAME]', iban: 'SA00 0000 0000 0000 0000 4410', accountNumber: '000000000004410' } }),
    acc({ id: 'a-ahli', kind: 'bank', name: ar ? 'الأهلي · توفير' : 'SNB · Savings', bank: ar ? 'الأهلي' : 'SNB', network: 'mada', skin: 2, last4: '0927' }),
    acc({ id: 'a-stc', kind: 'wallet', name: 'STC Pay', skin: 5 }),
    acc({ id: 'a-cash', kind: 'cash', name: ar ? 'كاش' : 'Cash', skin: 3 }),
    acc({
      id: 'a-plat', kind: 'credit', name: ar ? 'البلاتينيوم' : 'Platinum', network: 'visa', skin: 0, last4: '4821',
      credit: { limit: 15000, monthlyRate: 2.25, minPercent: 5, minAmount: 300, statementDay: 15, dueDays: 25, lateFee: 100, cashFee: ar ? '3% أو 75، الأعلى' : '3% or 75, whichever is higher', annualFee: ar ? 'مجانية' : 'Free', cashback: '1%', graceNote: ar ? 'بدون أرباح إذا سددت الكشف كامل' : 'No profit if the statement is paid in full' }
    })
  ];
  d.settings.salaryAccountId = 'a-rajhi';
  d.settings.emergencyAccountId = 'a-ahli';
  d.settings.subscriptionsAccountId = 'a-plat';
  const cyc = salaryCycle(27, t);
  d.settings.bonus = { enabled: true, amount: 6000, everyMonths: 3, nextDate: cyc.next, toDebt: 70, toSavings: 25 };

  const tx = (x: Omit<Tx, 'id' | 'createdAt'>) => d.txs.push({ id: id('t'), createdAt: now, ...x });

  d.commitments = [
    { id: 'm-rent', kind: 'fixed', name: ar ? 'الإيجار' : 'Rent', amount: 3500, dayOfMonth: 1, cycle: 'monthly', accountId: 'a-rajhi', categoryId: 'c-rent', active: true },
    { id: 'm-net', kind: 'fixed', name: ar ? 'الإنترنت' : 'Internet', amount: 230, dayOfMonth: 5, cycle: 'monthly', accountId: 'a-rajhi', categoryId: 'c-bills', active: true },
    { id: 'm-elec', kind: 'fixed', name: ar ? 'الكهرباء' : 'Electricity', amount: 350, variable: true, dayOfMonth: 15, cycle: 'monthly', accountId: 'a-rajhi', categoryId: 'c-bills', active: true },
    { id: 'm-mob', kind: 'fixed', name: ar ? 'الجوال' : 'Mobile', amount: 70, dayOfMonth: 20, cycle: 'monthly', accountId: 'a-rajhi', categoryId: 'c-bills', active: true },
    { id: 'm-gym', kind: 'subscription', name: ar ? 'النادي الرياضي' : 'Gym', amount: 250, dayOfMonth: 1, cycle: 'monthly', accountId: 'a-rajhi', categoryId: 'c-subs', active: true, priority: 'important' },
    { id: 'm-nfx', kind: 'subscription', name: ar ? 'نتفليكس' : 'Netflix', amount: 45, dayOfMonth: 8, cycle: 'monthly', accountId: 'a-plat', categoryId: 'c-subs', active: true },
    { id: 'm-shd', kind: 'subscription', name: ar ? 'شاهد VIP' : 'Shahid VIP', amount: 30, dayOfMonth: 12, cycle: 'monthly', accountId: 'a-plat', categoryId: 'c-subs', active: true },
    { id: 'm-icl', kind: 'subscription', name: ar ? 'آي كلاود' : 'iCloud', amount: 12, dayOfMonth: 18, cycle: 'monthly', accountId: 'a-plat', categoryId: 'c-subs', active: true, priority: 'important' },
    { id: 'm-smoke', kind: 'daily', name: ar ? 'دخان' : 'Cigarettes', amount: 23, dayOfMonth: 1, cycle: 'monthly', accountId: 'a-rajhi', categoryId: 'c-daily', active: true, auto: true, priority: 'optional', lastPosted: t },
    { id: 'm-spt', kind: 'subscription', name: ar ? 'سبوتيفاي' : 'Spotify', amount: 22, dayOfMonth: 22, cycle: 'monthly', accountId: 'a-plat', categoryId: 'c-subs', active: true },
    { id: 'm-ggl', kind: 'subscription', name: ar ? 'جوجل ون' : 'Google One', amount: 8, dayOfMonth: 25, cycle: 'monthly', accountId: 'a-plat', categoryId: 'c-subs', active: true }
  ];

  const nextOn = (day: number) => {
    const [y, m] = t.split('-').map(Number);
    const x = clampDay(y, m - 1, day);
    return x >= t ? x : addMonths(x, 1, day);
  };
  d.debts = [
    { id: 'd-loan', kind: 'loan', name: ar ? 'قرض شخصي' : 'Personal loan', principal: 66600, opening: 40250, installment: 1850, installmentsTotal: 36, dueDay: 27, annualRate: 0, createdAt: now },
    { id: 'd-tabby', kind: 'bnpl', provider: 'tabby', name: ar ? 'سماعات' : 'Headphones', principal: 1400, opening: 700, installment: 350, installmentsTotal: 4, frequency: 'monthly', startDate: addMonths(nextOn(12), -2, 12), createdAt: now },
    { id: 'd-tamara', kind: 'bnpl', provider: 'tamara', name: ar ? 'إلكترونيات' : 'Electronics', principal: 1600, opening: 1200, installment: 400, installmentsTotal: 4, frequency: 'monthly', startDate: addMonths(nextOn(5), -1, 5), createdAt: now },
    { id: 'd-tas', kind: 'bnpl', provider: 'tasaheel', name: ar ? 'غسالة' : 'Washing machine', principal: 6240, opening: 3120, installment: 520, installmentsTotal: 12, frequency: 'monthly', startDate: addMonths(nextOn(20), -6, 20), createdAt: now },
    { id: 'd-khalid', kind: 'person', name: ar ? 'خالد' : 'Khalid', principal: 3000, opening: 1500, person: { avatar: 'white', direction: 'owe', agreement: ar ? 'مرن، بدون موعد' : 'Flexible' }, createdAt: now },
    { id: 'd-fahad', kind: 'person', name: ar ? 'أبو فهد' : 'Abu Fahad', principal: 2500, opening: 2500, monthly: 500, person: { avatar: 'ghutra', direction: 'owe', agreement: ar ? '500 كل راتب' : '500 every payday' }, createdAt: now },
    { id: 'd-abdullah', kind: 'person', name: ar ? 'عبدالله' : 'Abdullah', principal: 800, opening: 800, person: { avatar: 'beard', direction: 'owe' }, createdAt: now },
    { id: 'd-saad', kind: 'person', name: ar ? 'سعد' : 'Saad', principal: 1500, opening: 1500, person: { avatar: 'young', direction: 'owed', agreement: ar ? 'يرجعها على دفعات' : 'Paying back in parts' }, createdAt: now }
  ];

  // Trip ~2 weeks ago
  const tripStart = addDays(t, -16);
  d.trips = [
    { id: 'tr-ula', name: ar ? 'رحلة العلا' : 'AlUla trip', start: tripStart, end: addDays(tripStart, 3), budget: 3000 },
    { id: 'tr-taif', name: ar ? 'رحلة الطائف' : 'Taif trip', start: addDays(t, -80), end: addDays(t, -77), budget: 3500 }
  ];

  // History: 4 months back
  const start = addDays(t, -120);
  const living: [string, number, number, string][] = [
    ['c-coffee', 0.8, 18, 'a-rajhi'], ['c-food-rest', 0.35, 95, 'a-rajhi'], ['c-food-deliv', 0.25, 60, 'a-plat'], ['c-groc', 0.25, 120, 'a-cash'],
    ['c-fuel-gas', 0.3, 70, 'a-plat'], ['c-shop', 0.08, 180, 'a-plat'], ['c-fun', 0.07, 90, 'a-stc'], ['c-health', 0.03, 120, 'a-rajhi'], ['c-care', 0.04, 60, 'a-rajhi']
  ];
  for (let day = start; day <= t; day = addDays(day, 1)) {
    const onTrip = d.trips.find((tr) => day >= tr.start && day <= (tr.end ?? tr.start));
    if (!onTrip) {
      for (const [cat, p, avg, a] of living) {
        if (rnd() < p) tx({ type: 'expense', amount: Math.round(avg * (0.6 + rnd() * 0.8)), date: day, time: `${10 + Math.floor(rnd() * 11)}:${rnd() < 0.5 ? '15' : '40'}`, categoryId: cat, accountId: a });
      }
    }
    const pd = parseISO(day);
    const dd = pd.getDate();
    if (day === clampDay(pd.getFullYear(), pd.getMonth(), 27)) {
      tx({ type: 'income', amount: 14000, date: day, time: '06:00', categoryId: 'i-salary', accountId: 'a-rajhi' });
    }
    if (day === clampDay(pd.getFullYear(), pd.getMonth(), 27)) {
      tx({ type: 'expense', amount: 1850, date: day, time: '07:00', categoryId: 'c-debtpay', accountId: 'a-rajhi', debtId: 'd-loan' });
      tx({ type: 'transfer', amount: 2400, date: day, time: '07:10', accountId: 'a-rajhi', toAccountId: 'a-plat' });
    }
    if (dd === 20 && day < t) tx({ type: 'expense', amount: 520, date: day, categoryId: 'c-debtpay', accountId: 'a-rajhi', debtId: 'd-tas' });
    for (const c of d.commitments) {
      if (c.kind === 'daily') {
        tx({ type: 'expense', amount: c.amount, date: day, time: '09:00', categoryId: c.categoryId, accountId: c.accountId, commitmentId: c.id, note: c.name, auto: true });
        continue;
      }
      if (dd === c.dayOfMonth && day < t) tx({ type: 'expense', amount: c.variable ? Math.round(c.amount * (0.8 + rnd() * 0.4)) : c.amount, date: day, categoryId: c.categoryId, accountId: c.accountId, commitmentId: c.id });
    }
  }
  // trip spending
  for (const tr of d.trips) {
    const plan: [number, string, number, string][] = [
      [0, 'c-travel', 1200, 'a-plat'], [0, 'c-fuel-gas', 140, 'a-rajhi'], [0, 'c-food-rest', 80, 'a-rajhi'], [1, 'c-fun', 400, 'a-plat'],
      [1, 'c-food-rest', 210, 'a-rajhi'], [2, 'c-food-rest', 190, 'a-rajhi'], [3, 'c-fuel-gas', 140, 'a-rajhi'], [3, 'c-gifts', 140, 'a-cash'], [3, 'c-coffee', 140, 'a-rajhi']
    ];
    for (const [off, cat, amt, a] of plan) tx({ type: 'expense', amount: tr.id === 'tr-taif' ? Math.round(amt * 1.2) : amt, date: addDays(tr.start, off), categoryId: cat, accountId: a, tripId: tr.id, note: cat === 'c-travel' ? (ar ? 'فندق' : 'Hotel') : undefined });
  }
  // unexpected income + debt activity
  tx({ type: 'income', amount: 1200, date: addDays(t, -12), categoryId: 'i-sale', accountId: 'a-rajhi', note: ar ? 'بعت جوال قديم' : 'Sold an old phone' });
  tx({ type: 'income', amount: 500, date: addDays(t, -2), categoryId: 'i-repaid', accountId: 'a-rajhi', debtId: 'd-saad', note: ar ? 'سعد رجّع جزء من السلفة' : 'Saad paid back part' });
  tx({ type: 'income', amount: 2000, date: addDays(t, -40), categoryId: 'i-workers', accountId: 'a-stc', note: ar ? 'تحويل من العمال' : 'From workers' });
  tx({ type: 'transfer', amount: 1600, date: addDays(t, -38), accountId: 'a-stc', toAccountId: 'a-rajhi' });
  tx({ type: 'transfer', amount: 2500, date: addDays(t, -20), accountId: 'a-rajhi', toAccountId: 'a-plat', note: ar ? 'سداد البطاقة' : 'Card payment' });
  tx({ type: 'transfer', amount: 500, date: addDays(t, -60), accountId: 'a-rajhi', toAccountId: 'a-ahli' });

  // Set opening balances so today's balances look like the design
  const target: Record<string, number> = { 'a-rajhi': 6240, 'a-ahli': 1500, 'a-stc': 380, 'a-cash': 220, 'a-plat': 7850 };
  for (const a of d.accounts) {
    a.opening = 0;
    a.opening = Math.round(target[a.id] - balance(d, a));
  }
  // Keep today's remaining debt amounts after adding the payment history
  for (const debt of d.debts) {
    const target = debt.opening;
    debt.opening = target + (target - debtRemaining(d, debt));
  }
  d.txs.sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? '')));
  return d;
}
