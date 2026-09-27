// Reads a bank's own PDF statement entirely on-device (pdf.js runs in the browser,
// nothing is uploaded anywhere) and turns it into a proposed account update, a list of
// transactions, and installment plans — all shown to the user to review and edit before
// anything is saved. Nothing here talks to a server.
import type { CreditPolicy, ID, InstallmentPlan, Network, Tx } from '../store/types';
import { round2 } from './finance';

export interface Item {
  str: string;
  x: number;
  y: number;
}

// ---------------- pdf.js extraction (browser only) ----------------

let pdfjs: typeof import('pdfjs-dist') | null = null;

async function getPdfjs() {
  if (pdfjs) return pdfjs;
  const lib = await import('pdfjs-dist');
  lib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
  pdfjs = lib;
  return lib;
}

export async function loadPdfPages(file: File): Promise<Item[][]> {
  const lib = await getPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await lib.getDocument({ data }).promise;
  const pages: Item[][] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((it) => ('str' in it ? { str: it.str, x: Math.round(it.transform[4]), y: Math.round(it.transform[5]) } : null))
        .filter((it): it is Item => !!it && it.str.trim().length > 0)
    );
    await page.cleanup();
  }
  await doc.cleanup();
  return pages;
}

// ---------------- generic helpers over positioned text items ----------------

const isArabic = (s: string) => /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/.test(s);
/** Drop RTL label text — every value we need also has a plain English/numeric item. */
const latinItems = (items: Item[]) => items.filter((it) => !isArabic(it.str));

/** The nearest item below-and-near a label, e.g. a value printed just under its heading. */
function valueBelow(items: Item[], label: string, xTol = 45, dyMin = 4, dyMax = 22): Item | undefined {
  const lbl = items.find((it) => it.str.trim() === label);
  if (!lbl) return undefined;
  let best: Item | undefined;
  let bestDist = Infinity;
  for (const it of items) {
    if (it.str.trim() === label) continue;
    const dy = lbl.y - it.y;
    if (dy < dyMin || dy > dyMax) continue;
    const dx = Math.abs(it.x - lbl.x);
    if (dx > xTol) continue;
    const dist = dy + dx / 4;
    if (dist < bestDist) {
      best = it;
      bestDist = dist;
    }
  }
  return best;
}

function numFrom(item: Item | undefined): number {
  if (!item) return 0;
  const n = parseFloat(item.str.replace(/^CR\s*/i, '').replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

const MONTHS: Record<string, number> = {
  JANUARY: 1, FEBRUARY: 2, MARCH: 3, APRIL: 4, MAY: 5, JUNE: 6, JULY: 7, AUGUST: 8, SEPTEMBER: 9, OCTOBER: 10, NOVEMBER: 11, DECEMBER: 12
};

/** DD/MM/YY or DD/MM/YYYY -> YYYY-MM-DD */
function isoFromSlash(s: string): string | undefined {
  const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (!m) return undefined;
  const [, d, mo, yRaw] = m;
  const y = yRaw.length === 2 ? 2000 + +yRaw : +yRaw;
  return `${y}-${String(+mo).padStart(2, '0')}-${String(+d).padStart(2, '0')}`;
}

// ---------------- Al Rajhi statement shape ----------------

export type TxRowKind = 'purchase' | 'payment' | 'planMove' | 'murabahaProfit' | 'murabahaRefund';

export interface ParsedTxRow {
  txDate: string;
  postingDate: string;
  merchant: string;
  description: string;
  txnAmount: number;
  txnCurrency: string;
  otherFees: number;
  billingAmount: number;
  isCredit: boolean;
  kind: TxRowKind;
}

export interface ParsedInstallmentRow {
  merchant: string;
  txDate: string;
  txnAmount: number;
  installmentAmount: number;
  feeAmount: number;
  remainingInstallments: number;
  remainingAmount: number;
  /** derived, not printed directly on the statement */
  totalInstallments: number;
  paidInstallments: number;
}

export interface ParsedCardStatement {
  bank: 'alrajhi';
  statementMonth: string;
  card: { last4: string; name: string; network: Network; cashLimit?: number; creditLimit: number };
  dueDate?: string;
  minimumDue: number;
  totalDue: number;
  balance: { fees: number; profit: number; totalSpend: number; opening: number; closing: number; otherCredits: number; totalPayments: number };
  transactions: ParsedTxRow[];
  installmentPlans: ParsedInstallmentRow[];
  warnings: string[];
}

function networkFromCardName(name: string): Network {
  const n = name.toUpperCase();
  if (n.includes('VISA')) return 'visa';
  if (n.includes('MASTERCARD') || n.includes('MASTER CARD')) return 'mastercard';
  if (n.includes('AMEX') || n.includes('AMERICAN EXPRESS')) return 'amex';
  if (n.includes('MADA')) return 'mada';
  return 'none';
}

function rowKind(description: string): TxRowKind {
  const d = description.toUpperCase();
  if (d.startsWith('ADVANCE PAYMENT') || d.startsWith('PAYMENT')) return 'payment';
  if (d.startsWith('MOVE TO PAYMENT PLAN')) return 'planMove';
  if (d.startsWith('MURABAHA PROFIT') || d.startsWith('MURABHA PROFIT')) return 'murabahaProfit';
  if (d.startsWith('MURABAHA REFUND') || d.startsWith('MURABHA REFUND')) return 'murabahaRefund';
  return 'purchase';
}

function parseCardDetailsPage(items: Item[]): Pick<ParsedCardStatement, 'card' | 'dueDate' | 'minimumDue' | 'totalDue' | 'balance'> {
  const L = latinItems(items);
  const cardNumber = valueBelow(L, 'Card Number')?.str ?? '';
  const last4 = cardNumber.replace(/[^0-9]/g, '').slice(-4);
  const cardName = valueBelow(L, 'Card Name')?.str ?? '';
  return {
    card: {
      last4,
      name: cardName,
      network: networkFromCardName(cardName),
      cashLimit: numFrom(valueBelow(L, 'Cash Limit')) || undefined,
      creditLimit: numFrom(valueBelow(L, 'Credit Limit'))
    },
    dueDate: isoFromSlash(valueBelow(L, 'Payment Due Date')?.str ?? ''),
    minimumDue: numFrom(valueBelow(L, 'Minimum Amount Due')),
    totalDue: numFrom(valueBelow(L, 'Total Amount Due')),
    balance: {
      fees: numFrom(valueBelow(L, 'Fees')),
      profit: numFrom(valueBelow(L, 'Profit')),
      totalSpend: numFrom(valueBelow(L, 'Total Spend')),
      opening: numFrom(valueBelow(L, 'Opening Balance')),
      closing: numFrom(valueBelow(L, 'Closing Balance')),
      otherCredits: numFrom(valueBelow(L, 'Other Credits')),
      totalPayments: numFrom(valueBelow(L, 'Total Payments'))
    }
  };
}

function statementMonthOf(items: Item[]): string {
  for (const it of items) {
    const m = it.str.match(/^([A-Z]+),?\s*(\d{4})$/i);
    if (m && MONTHS[m[1].toUpperCase()]) return `${m[2]}-${String(MONTHS[m[1].toUpperCase()]).padStart(2, '0')}`;
  }
  return '';
}

/** One page's worth of transaction rows. Must run per-page: row anchors and their
 *  multi-line descriptions are positioned in page-relative coordinates, so comparing
 *  y across pages would match unrelated rows together (a real bug caught in testing). */
function parseTransactionRowsOnPage(items: Item[]): ParsedTxRow[] {
  const L = latinItems(items);
  const dateRe = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
  const posting = L.filter((it) => it.x >= 405 && it.x <= 470 && dateRe.test(it.str));
  const txnDate = L.filter((it) => it.x >= 480 && it.x <= 535 && dateRe.test(it.str));
  const rows: (ParsedTxRow & { anchorY: number })[] = [];
  for (const p of posting) {
    const t = txnDate.find((it) => it.y === p.y);
    if (!t) continue;
    const billing = L.find((it) => it.y === p.y && it.x >= 50 && it.x <= 120 && /^(CR\s*)?[\d,]+\.\d{2}$/.test(it.str));
    const fees = L.find((it) => it.y === p.y && it.x >= 145 && it.x <= 180 && /^[\d,]+\.\d{2}$/.test(it.str));
    const amt = L.find((it) => it.y === p.y && it.x >= 330 && it.x <= 390 && /^[\d,]+\.\d{2}\s*[A-Z]{3}$/.test(it.str));
    if (!billing || !amt) continue;
    const [amount, currency] = amt.str.split(/\s+/);
    rows.push({
      anchorY: p.y,
      postingDate: isoFromSlash(p.str) ?? '',
      txDate: isoFromSlash(t.str) ?? '',
      merchant: '',
      description: '',
      txnAmount: parseFloat(amount.replace(/,/g, '')),
      txnCurrency: currency,
      otherFees: numFrom(fees),
      billingAmount: numFrom(billing),
      isCredit: /^CR/i.test(billing.str),
      kind: 'purchase'
    });
  }
  if (!rows.length) return [];
  // description column: every remaining latin item in that x-band on THIS page, matched
  // to the row whose anchor is closest in y — but never past halfway to the next anchor,
  // so a block that spills onto the next page's top can't get glued to this page's first row.
  const sorted = [...rows].sort((a, b) => b.anchorY - a.anchorY);
  const descItems = L.filter((it) => it.x >= 195 && it.x <= 332);
  const byRow = new Map<(typeof rows)[number], Item[]>();
  for (const it of descItems) {
    let best: (typeof rows)[number] | undefined;
    let bestDist = Infinity;
    for (let i = 0; i < sorted.length; i++) {
      const a = sorted[i];
      const limitAbove = i > 0 ? (sorted[i - 1].anchorY + a.anchorY) / 2 : a.anchorY + 35;
      const limitBelow = i < sorted.length - 1 ? (a.anchorY + sorted[i + 1].anchorY) / 2 : a.anchorY - 40;
      if (it.y > limitAbove || it.y < limitBelow) continue;
      const dist = Math.abs(it.y - a.anchorY);
      if (dist < bestDist) {
        best = a;
        bestDist = dist;
      }
    }
    if (!best) continue;
    (byRow.get(best) ?? byRow.set(best, []).get(best)!).push(it);
  }
  for (const r of rows) {
    const desc = (byRow.get(r) ?? []).sort((a, b) => b.y - a.y || a.x - b.x);
    const lines: string[] = [];
    let cur = '';
    let curY: number | undefined;
    for (const it of desc) {
      if (curY !== undefined && Math.abs(it.y - curY) > 3) {
        lines.push(cur.trim());
        cur = '';
      }
      cur += (cur ? ' ' : '') + it.str;
      curY = it.y;
    }
    if (cur) lines.push(cur.trim());
    r.description = lines.join(' | ');
    r.merchant = lines[0] ?? '';
    r.kind = rowKind(r.merchant);
  }
  return rows;
}

function parseTransactionRows(pages: Item[][]): ParsedTxRow[] {
  return pages.flatMap(parseTransactionRowsOnPage);
}

/** Tasaheel program rows are single-line; anchor on the Transaction Date column. */
function parseInstallmentRowsOnPage(items: Item[]): ParsedInstallmentRow[] {
  const L = latinItems(items);
  const dateRe = /^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
  const dateItems = L.filter((it) => it.x >= 460 && it.x <= 520 && dateRe.test(it.str));
  const near = (a: number, b: number) => Math.abs(a - b) <= 8;
  const rows: ParsedInstallmentRow[] = [];
  for (const d of dateItems) {
    const merchant = L.filter((it) => near(it.y, d.y) && it.x >= 418 && it.x < 462).sort((a, b) => b.y - a.y || a.x - b.x).map((it) => it.str).join(' ');
    const txnAmount = L.find((it) => near(it.y, d.y) && it.x >= 375 && it.x < 418);
    const installmentAmount = L.find((it) => near(it.y, d.y) && it.x >= 315 && it.x < 375);
    const feeAmount = L.find((it) => near(it.y, d.y) && it.x >= 245 && it.x < 315);
    const remainingInstallments = L.find((it) => near(it.y, d.y) && it.x >= 100 && it.x < 165 && /^\d+$/.test(it.str));
    const remainingAmount = L.find((it) => near(it.y, d.y) && it.x >= 50 && it.x < 100);
    const inst = numFrom(installmentAmount);
    const txn = numFrom(txnAmount);
    const total = inst > 0 ? Math.round(txn / inst) : 0;
    const remaining = remainingInstallments ? +remainingInstallments.str : 0;
    rows.push({
      merchant,
      txDate: isoFromSlash(d.str) ?? '',
      txnAmount: txn,
      installmentAmount: inst,
      feeAmount: numFrom(feeAmount),
      remainingInstallments: remaining,
      remainingAmount: numFrom(remainingAmount),
      totalInstallments: total,
      paidInstallments: Math.max(0, total - remaining)
    });
  }
  return rows;
}

function parseInstallmentRows(pages: Item[][]): ParsedInstallmentRow[] {
  return pages.flatMap(parseInstallmentRowsOnPage);
}

export function parseAlRajhiCardStatement(pages: Item[][]): ParsedCardStatement | { error: string } {
  const flat = pages.flat();
  if (!flat.some((it) => it.str.includes('credit card statement'))) return { error: 'not-alrajhi-card' };
  const page1 = pages[0] ?? [];
  const details = parseCardDetailsPage(page1);
  const warnings: string[] = [];
  if (!details.card.last4) warnings.push('card-number');
  if (!details.card.creditLimit) warnings.push('credit-limit');

  const txPages: Item[][] = [];
  const instPages: Item[][] = [];
  let section: 'none' | 'tx' | 'inst' = 'none';
  for (const page of pages) {
    if (page.some((it) => it.str.includes('Transaction Details of the Primary Card'))) section = 'tx';
    else if (page.some((it) => it.str.includes('Tasaheel Program Details'))) section = 'inst';
    else if (page.some((it) => it.str === 'Definitions' || it.str.includes('illustrative example'))) section = 'none';
    if (section === 'tx') txPages.push(page);
    else if (section === 'inst') instPages.push(page);
  }

  return {
    bank: 'alrajhi',
    statementMonth: statementMonthOf(page1),
    ...details,
    transactions: parseTransactionRows(txPages),
    installmentPlans: parseInstallmentRows(instPages),
    warnings
  };
}

// ---------------- mapping a parsed statement onto the app's own data ----------------

const MERCHANT_CATEGORY: [RegExp, string][] = [
  [/APPLE\.COM|ITUNES|GOOGLE\s*(PLAY|YOUTUBE)|SPOTIFY|NETFLIX|ANGHAMI|SHAHID|OPENAI|MICROSOFT|ADOBE/i, 'c-subs'],
  [/AMAZON|NOON|SALLA|SHEIN|SHOPIFY|EXTRA|JARIR|IKEA/i, 'c-shop'],
  [/CAREEM|UBER/i, 'c-other'],
  [/HUNGERSTATION|JAHEZ|MRSOOL|TOYOU|KEETA/i, 'c-food-deliv'],
  [/PANDA|CARREFOUR|LULU|TAMIMI|DANUBE/i, 'c-groc'],
  [/ADCB|STC|MOBILY|ZAIN/i, 'c-bills']
];

export function guessCategory(merchant: string): string | undefined {
  for (const [re, cat] of MERCHANT_CATEGORY) if (re.test(merchant)) return cat;
  return undefined;
}

export interface AccountPatch {
  last4: string;
  network: Network;
  cardNameGuess: string;
  credit: Pick<CreditPolicy, 'limit' | 'cashLimit'>;
  dueDate?: string;
  minimumDue: number;
  totalDue: number;
  closingBalance: number;
}

export function toAccountPatch(p: ParsedCardStatement): AccountPatch {
  return {
    last4: p.card.last4,
    network: p.card.network,
    cardNameGuess: p.card.name,
    credit: { limit: p.card.creditLimit, cashLimit: p.card.cashLimit },
    dueDate: p.dueDate,
    minimumDue: p.minimumDue,
    totalDue: p.totalDue,
    closingBalance: p.balance.closing
  };
}

export interface TxProposal {
  id: ID;
  include: boolean;
  tx: Omit<Tx, 'id' | 'createdAt'> & { createdAt?: string };
  needsFundingAccount: boolean;
  kind: TxRowKind;
}

/** A stable id from the statement's own fields, so re-importing the same statement
 *  updates the same rows instead of duplicating them. */
function txId(accountId: ID, row: ParsedTxRow, index: number): ID {
  const key = `${accountId}|${row.postingDate}|${row.billingAmount}|${row.isCredit}|${index}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return 'st-' + h.toString(36);
}

export function toTxProposals(p: ParsedCardStatement, accountId: ID): TxProposal[] {
  return p.transactions
    .filter((r) => r.kind !== 'planMove')
    .map((row, i) => {
      const id = txId(accountId, row, i);
      const base = { date: row.txDate || row.postingDate, note: row.merchant || undefined, createdAt: undefined as string | undefined };
      if (row.kind === 'payment') {
        return { id, include: true, needsFundingAccount: true, kind: row.kind, tx: { ...base, type: 'transfer' as const, toAccountId: accountId, amount: row.billingAmount } };
      }
      if (row.kind === 'murabahaProfit') {
        return { id, include: true, needsFundingAccount: false, kind: row.kind, tx: { ...base, type: 'expense' as const, accountId, categoryId: 'c-fees', amount: row.billingAmount } };
      }
      if (row.kind === 'murabahaRefund') {
        return { id, include: true, needsFundingAccount: false, kind: row.kind, tx: { ...base, type: 'income' as const, accountId, categoryId: 'i-refund', amount: row.billingAmount } };
      }
      if (row.isCredit) {
        return { id, include: true, needsFundingAccount: false, kind: row.kind, tx: { ...base, type: 'income' as const, accountId, categoryId: 'i-refund', amount: row.billingAmount } };
      }
      return { id, include: true, needsFundingAccount: false, kind: row.kind, tx: { ...base, type: 'expense' as const, accountId, categoryId: guessCategory(row.merchant) ?? 'c-other', amount: row.billingAmount } };
    });
}

export function toInstallmentPlans(p: ParsedCardStatement): Omit<InstallmentPlan, 'id'>[] {
  return p.installmentPlans.map((row) => ({
    merchant: row.merchant || 'installment plan',
    purchaseDate: row.txDate || undefined,
    principal: row.txnAmount,
    installmentAmount: row.installmentAmount,
    conversionFee: row.feeAmount > 0 ? round2(row.feeAmount) : undefined,
    totalInstallments: row.totalInstallments,
    paidInstallments: row.paidInstallments,
    hasMurabaha: row.totalInstallments > 3
  }));
}
