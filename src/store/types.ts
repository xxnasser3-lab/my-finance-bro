export type ID = string;
export type Lang = 'ar' | 'en';

export type AccountKind = 'bank' | 'wallet' | 'cash' | 'credit';
export type Network = 'mada' | 'visa' | 'mastercard' | 'amex' | 'none';

export interface CardSecrets {
  holder?: string;
  number?: string;
  expiry?: string;
  cvv?: string;
  iban?: string;
  accountNumber?: string;
  notes?: string;
}

export interface CreditPolicy {
  limit: number;
  /** profit/interest rate per month, in percent (e.g. 2.25) */
  monthlyRate: number;
  minPercent: number;
  minAmount: number;
  statementDay: number;
  dueDays: number;
  lateFee?: number;
  cashFee?: string;
  annualFee?: string;
  cashback?: string;
  graceNote?: string;
}

export interface Account {
  id: ID;
  kind: AccountKind;
  name: string;
  bank?: string;
  network: Network;
  skin: number;
  last4?: string;
  /** opening balance. For credit accounts: amount owed at creation */
  opening: number;
  secrets: CardSecrets;
  credit?: CreditPolicy;
  /** optional photo of the card (data URL, resized) */
  photo?: string;
  archived?: boolean;
  createdAt: string;
}

export type TxType = 'expense' | 'income' | 'transfer';

export interface Tx {
  id: ID;
  type: TxType;
  amount: number;
  /** local date YYYY-MM-DD */
  date: string;
  /** HH:mm */
  time?: string;
  categoryId?: ID;
  accountId?: ID;
  toAccountId?: ID;
  tripId?: ID;
  debtId?: ID;
  commitmentId?: ID;
  note?: string;
  /** logged automatically from a daily expense */
  auto?: boolean;
  /** buy/sell of an investment (expense = buy, income = sell): excluded from budget/reports */
  investmentId?: ID;
  /** shares (stock) or grams (gold) bought/sold in this transaction */
  qty?: number;
  createdAt: string;
}

export type CategoryKind = 'expense' | 'income';

export interface Category {
  id: ID;
  kind: CategoryKind;
  name: string;
  /** translation key for built-in categories */
  key?: string;
  icon: string;
  color: string;
  parentId?: ID;
  monthlyBudget?: number;
  /** living = counts against the daily spending budget */
  living: boolean;
  archived?: boolean;
}

export type CommitmentKind = 'fixed' | 'subscription' | 'daily';

/** How much it hurts to drop it when money is short, worst-to-cut-first last */
export type Priority = 'essential' | 'important' | 'flexible' | 'optional' | 'luxury';

export interface Commitment {
  id: ID;
  kind: CommitmentKind;
  name: string;
  amount: number;
  variable?: boolean;
  dayOfMonth: number;
  cycle: 'monthly' | 'yearly';
  /** 1-12 for yearly */
  month?: number;
  accountId?: ID;
  categoryId?: ID;
  active: boolean;
  priority?: Priority;
  /** daily expenses: weekdays it applies to (0 = Sunday); empty = every day */
  weekdays?: number[];
  /** daily expenses: log automatically each day */
  auto?: boolean;
  /** daily expenses: last day already logged */
  lastPosted?: string;
}

export type DebtKind = 'loan' | 'card' | 'bnpl' | 'person';
export type BnplProvider = 'tabby' | 'tamara' | 'tasaheel' | 'other';

export interface PersonInfo {
  avatar: string;
  photo?: string;
  direction: 'owe' | 'owed';
  agreement?: string;
}

export interface Debt {
  id: ID;
  kind: DebtKind;
  name: string;
  provider?: BnplProvider;
  /** credit account the card debt is read from */
  accountId?: ID;
  /** original amount */
  principal: number;
  /** remaining when the debt was added */
  opening: number;
  installment?: number;
  installmentsTotal?: number;
  frequency?: 'monthly' | 'biweekly';
  /** first (or next) due date YYYY-MM-DD */
  startDate?: string;
  dueDay?: number;
  annualRate?: number;
  /** agreed monthly payment for people */
  monthly?: number;
  person?: PersonInfo;
  note?: string;
  closed?: boolean;
  createdAt: string;
}

export type InvestmentKind = 'stock' | 'gold' | 'other';
export type GoldPurity = 24 | 22 | 21 | 18;

export interface Investment {
  id: ID;
  kind: InvestmentKind;
  name: string;
  /** ticker for stocks, e.g. AAPL (matched against public/prices.json) */
  symbol?: string;
  currency: 'USD' | 'SAR';
  /** shares for stocks, grams for gold */
  quantity: number;
  /** average cost per unit, in `currency` */
  avgCost: number;
  purity?: GoldPurity;
  accountId?: ID;
  note?: string;
  archived?: boolean;
  createdAt: string;
}

export interface Trip {
  id: ID;
  name: string;
  start: string;
  end?: string;
  budget?: number;
  note?: string;
}

export interface Goal {
  id: ID;
  name: string;
  targetAmount: number;
  /** optional target date YYYY-MM-DD; without one, we just project when it'll be reached */
  targetDate?: string;
  /** track this account's balance toward the goal; unset = total liquid savings */
  accountId?: ID;
  archived?: boolean;
  createdAt: string;
}

export interface WishItem {
  id: ID;
  name: string;
  price: number;
  priority: Priority;
  note?: string;
  bought?: boolean;
  createdAt: string;
}

export interface Settings {
  lang: Lang;
  name: string;
  payday: number;
  salary: number;
  salaryAccountId?: ID;
  bonus: { enabled: boolean; amount: number; everyMonths: number; nextDate: string; toDebt: number; toSavings: number };
  livingBudget: number;
  strategy: 'avalanche' | 'snowball';
  saveMonthly: number;
  emergencyTarget: number;
  emergencyAccountId?: ID;
  subscriptionsAccountId?: ID;
  hideAmounts: boolean;
  theme?: 'ember' | 'oasis' | 'sea' | 'night';
  mode?: 'dark' | 'light' | 'auto';
  /** the user's own avatar on the home screen */
  avatar?: string;
  /** currency investments are shown in */
  invCurrency?: 'SAR' | 'USD';
  remindDays: number;
  driveClientId?: string;
  lastBackupAt?: string;
  lastDriveBackupAt?: string;
}

export interface AppData {
  version: 1;
  settings: Settings;
  accounts: Account[];
  txs: Tx[];
  categories: Category[];
  commitments: Commitment[];
  debts: Debt[];
  trips: Trip[];
  investments: Investment[];
  goals: Goal[];
  wishlist: WishItem[];
}
