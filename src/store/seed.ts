import type { AppData, Category, Settings } from './types';
import { addMonths, clampDay, today } from '../logic/dates';

const c = (id: string, kind: Category['kind'], key: string, name: string, icon: string, color: string, living: boolean, parentId?: string): Category => ({
  id, kind, key, name, icon, color, living, parentId
});

/** Built-in categories. Names are Arabic fallbacks; `key` picks the translation. */
export function defaultCategories(): Category[] {
  return [
    c('c-food', 'expense', 'food', 'أكل ومطاعم', 'food', '#DD6220', true),
    c('c-food-rest', 'expense', 'restaurants', 'مطاعم', 'food', '#DD6220', true, 'c-food'),
    c('c-food-deliv', 'expense', 'delivery', 'توصيل', 'bag', '#DD6220', true, 'c-food'),
    c('c-coffee', 'expense', 'coffee', 'قهوة', 'coffee', '#B07A52', true),
    c('c-groc', 'expense', 'groceries', 'بقالة', 'cart', '#6CC49A', true),
    c('c-fuel', 'expense', 'car', 'بنزين وسيارة', 'fuel', '#5B8FD0', true),
    c('c-fuel-gas', 'expense', 'fuel', 'بنزين', 'fuel', '#5B8FD0', true, 'c-fuel'),
    c('c-fuel-maint', 'expense', 'maintenance', 'صيانة وغسيل', 'tool', '#5B8FD0', true, 'c-fuel'),
    c('c-shop', 'expense', 'shopping', 'مشتريات', 'bag', '#C9B8E8', true),
    c('c-shop-clothes', 'expense', 'clothes', 'ملابس', 'bag', '#C9B8E8', true, 'c-shop'),
    c('c-shop-elec', 'expense', 'electronics', 'إلكترونيات', 'device', '#C9B8E8', true, 'c-shop'),
    c('c-fun', 'expense', 'fun', 'ترفيه', 'game', '#8C9BAE', true),
    c('c-health', 'expense', 'health', 'صحة', 'heart', '#F2878A', true),
    c('c-care', 'expense', 'care', 'عناية شخصية', 'star', '#E9A0C8', true),
    c('c-gifts', 'expense', 'gifts', 'هدايا ومناسبات', 'gift', '#E9A0C8', true),
    c('c-charity', 'expense', 'charity', 'صدقة وزكاة', 'hands', '#6CC49A', true),
    c('c-home', 'expense', 'home', 'البيت', 'home', '#A8998C', true),
    c('c-edu', 'expense', 'education', 'تعليم وكتب', 'book', '#E8B64C', true),
    c('c-kids', 'expense', 'kids', 'أطفال وعائلة', 'kid', '#F0C9A0', true),
    c('c-daily', 'expense', 'dailyHabits', 'مصاريف يومية ثابتة', 'repeat', '#B07A52', false),
    c('c-travel', 'expense', 'travel', 'سفر ورحلات', 'plane', '#E8B64C', false),
    c('c-rent', 'expense', 'rent', 'إيجار وسكن', 'home', '#8C7564', false),
    c('c-bills', 'expense', 'bills', 'فواتير', 'bolt', '#8C7564', false),
    c('c-subs', 'expense', 'subscriptions', 'اشتراكات', 'repeat', '#DD6220', false),
    c('c-debtpay', 'expense', 'debtPayments', 'سداد ديون', 'card', '#8C7564', false),
    c('c-fees', 'expense', 'fees', 'رسوم بنكية', 'bank', '#8C7564', false),
    c('c-other', 'expense', 'other', 'أخرى', 'dots', '#8C7564', true),
    c('i-salary', 'income', 'salary', 'راتب', 'up', '#DD6220', false),
    c('i-bonus', 'income', 'bonus', 'بونص', 'star', '#F0C9A0', false),
    c('i-sale', 'income', 'sale', 'بيع غرض', 'tag', '#6CC49A', false),
    c('i-repaid', 'income', 'loanRepaid', 'سداد سلفة', 'people', '#5B8FD0', false),
    c('i-workers', 'income', 'workers', 'تحويل من العمال', 'people', '#E8B64C', false),
    c('i-gift', 'income', 'giftIn', 'هدية', 'gift', '#E9A0C8', false),
    c('i-refund', 'income', 'refund', 'استرجاع مبلغ', 'undo', '#8C9BAE', false),
    c('i-borrowed', 'income', 'borrowed', 'سلفة استلمتها', 'people', '#8C7564', false),
    c('i-other', 'income', 'otherIn', 'دخل آخر', 'dots', '#8C7564', false)
  ];
}

export function defaultSettings(partial: Partial<Settings> = {}): Settings {
  const now = today();
  const [y, m] = now.split('-').map(Number);
  const payday = partial.payday ?? 27;
  return {
    lang: 'ar',
    name: '',
    payday,
    salary: 0,
    bonus: { enabled: false, amount: 0, everyMonths: 3, nextDate: addMonths(clampDay(y, m - 1, payday), 1), toDebt: 70, toSavings: 20 },
    livingBudget: 3000,
    strategy: 'avalanche',
    saveMonthly: 500,
    emergencyTarget: 15000,
    hideAmounts: false,
    remindDays: 2,
    ...partial
  };
}

export function emptyData(settings: Partial<Settings>): AppData {
  return {
    version: 1,
    settings: defaultSettings(settings),
    accounts: [],
    txs: [],
    categories: defaultCategories(),
    commitments: [],
    debts: [],
    trips: [],
    investments: []
  };
}

/** Bring older saved data up to date (new built-in categories, fields added later, etc.). */
export function migrate(d: AppData): AppData {
  const have = new Set(d.categories.map((c) => c.id));
  const missing = defaultCategories().filter((c) => !have.has(c.id));
  const next = missing.length ? { ...d, categories: [...d.categories, ...missing] } : d;
  return next.investments ? next : { ...next, investments: [] };
}

export const catKeysAr: Record<string, string> = {
  food: 'أكل ومطاعم', restaurants: 'مطاعم', delivery: 'توصيل', coffee: 'قهوة', groceries: 'بقالة', car: 'بنزين وسيارة', fuel: 'بنزين', maintenance: 'صيانة وغسيل',
  shopping: 'مشتريات', clothes: 'ملابس', electronics: 'إلكترونيات', fun: 'ترفيه', health: 'صحة', care: 'عناية شخصية', gifts: 'هدايا ومناسبات', charity: 'صدقة وزكاة',
  home: 'البيت', education: 'تعليم وكتب', kids: 'أطفال وعائلة', travel: 'سفر ورحلات', rent: 'إيجار وسكن', bills: 'فواتير', subscriptions: 'اشتراكات', debtPayments: 'سداد ديون',
  fees: 'رسوم بنكية', other: 'أخرى', dailyHabits: 'مصاريف يومية ثابتة', salary: 'راتب', bonus: 'بونص', sale: 'بيع غرض', loanRepaid: 'سداد سلفة', workers: 'تحويل من العمال', giftIn: 'هدية',
  refund: 'استرجاع مبلغ', borrowed: 'سلفة استلمتها', otherIn: 'دخل آخر'
};

export const catKeysEn: Record<string, string> = {
  food: 'Food & dining', restaurants: 'Restaurants', delivery: 'Delivery', coffee: 'Coffee', groceries: 'Groceries', car: 'Fuel & car', fuel: 'Fuel', maintenance: 'Maintenance & wash',
  shopping: 'Shopping', clothes: 'Clothes', electronics: 'Electronics', fun: 'Entertainment', health: 'Health', care: 'Personal care', gifts: 'Gifts & occasions', charity: 'Charity & zakat',
  home: 'Home', education: 'Education & books', kids: 'Kids & family', travel: 'Travel & trips', rent: 'Rent & housing', bills: 'Bills', subscriptions: 'Subscriptions', debtPayments: 'Debt payments',
  fees: 'Bank fees', other: 'Other', dailyHabits: 'Daily fixed expenses', salary: 'Salary', bonus: 'Bonus', sale: 'Sold an item', loanRepaid: 'Loan repaid to me', workers: 'Transfer from workers', giftIn: 'Gift',
  refund: 'Refund', borrowed: 'Borrowed money', otherIn: 'Other income'
};
