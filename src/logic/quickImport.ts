// Manual "quick import" for debts/cards that don't come from a parseable bank PDF
// (e.g. a personal loan you can only see inside the bank's app). Reads a small,
// human-editable JSON file — entirely client-side, same as the statement importer —
// and turns it into real Debt/Account records ready for review before saving.
import { uid } from '../store/store';
import type { Account, BnplProvider, Debt, DebtKind, Network } from '../store/types';

export interface QuickImportLoanInput {
  kind?: 'loan' | 'bnpl' | 'person';
  name: string;
  /** total repayable amount: every installment added up, profit included */
  principal: number;
  /** how much of that total is still owed today */
  remaining: number;
  installment?: number;
  installmentsTotal?: number;
  /** loan: day of month the payment is due */
  dueDay?: number;
  /** bnpl: next/first installment date, YYYY-MM-DD */
  startDate?: string;
  frequency?: 'monthly' | 'biweekly';
  /** the profit/annual rate the bank reports, in percent */
  annualRate?: number;
  provider?: BnplProvider;
  note?: string;
}

export interface QuickImportCardInput {
  name: string;
  last4?: string;
  network?: Network;
  bank?: string;
  /** how much is currently owed on the card */
  balance: number;
  limit: number;
  cashLimit?: number;
  monthlyRate?: number;
  minPercent?: number;
  minAmount?: number;
  statementDay?: number;
  dueDays?: number;
  lateFee?: number;
  cashFee?: string;
  annualFee?: string;
  cashback?: string;
  fxFeePercent?: number;
}

export interface QuickImportFile {
  loans?: QuickImportLoanInput[];
  cards?: QuickImportCardInput[];
}

export interface QuickImportResult {
  loans: Debt[];
  cards: Account[];
  errors: string[];
}

export function parseQuickImport(raw: string): QuickImportResult {
  const errors: string[] = [];
  let data: QuickImportFile;
  try {
    data = JSON.parse(raw);
  } catch {
    return { loans: [], cards: [], errors: ['bad-json'] };
  }
  const now = new Date().toISOString();

  const loans: Debt[] = [];
  for (const [i, l] of (data.loans ?? []).entries()) {
    if (!l || typeof l.name !== 'string' || !l.name.trim() || !(l.principal > 0)) {
      errors.push(`loan #${i + 1}: missing name/principal`);
      continue;
    }
    loans.push({
      id: uid(),
      kind: (l.kind ?? 'loan') as DebtKind,
      name: l.name.trim(),
      provider: l.kind === 'bnpl' ? l.provider ?? 'other' : undefined,
      principal: l.principal,
      opening: Math.max(0, l.remaining ?? l.principal),
      installment: l.installment,
      installmentsTotal: l.installmentsTotal,
      frequency: l.frequency,
      startDate: l.startDate,
      dueDay: l.dueDay,
      annualRate: l.annualRate,
      note: l.note,
      createdAt: now
    });
  }

  const cards: Account[] = [];
  for (const [i, c] of (data.cards ?? []).entries()) {
    if (!c || typeof c.name !== 'string' || !c.name.trim() || !(c.limit > 0)) {
      errors.push(`card #${i + 1}: missing name/limit`);
      continue;
    }
    cards.push({
      id: uid(),
      kind: 'credit',
      name: c.name.trim(),
      bank: c.bank,
      network: c.network ?? 'mada',
      skin: 0,
      last4: c.last4,
      opening: Math.max(0, c.balance ?? 0),
      secrets: {},
      credit: {
        limit: c.limit,
        cashLimit: c.cashLimit,
        monthlyRate: c.monthlyRate ?? 0,
        minPercent: c.minPercent ?? 5,
        minAmount: c.minAmount ?? 100,
        statementDay: c.statementDay ?? 1,
        dueDays: c.dueDays ?? 21,
        lateFee: c.lateFee,
        cashFee: c.cashFee,
        annualFee: c.annualFee,
        cashback: c.cashback,
        fxFeePercent: c.fxFeePercent
      },
      createdAt: now
    });
  }

  return { loans, cards, errors };
}
