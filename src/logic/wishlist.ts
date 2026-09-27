// Wishlist: for each thing the user wants, how buying it right now would feel —
// comfortable, half-and-half, tight, or not possible — given the money that's really
// free until payday, and what to do about it given how important the item is.
import type { AppData, Priority, WishItem } from '../store/types';
import { balance, creditAccounts, round2 } from './finance';
import { cashflow, monthlyPicture } from './advisor';
import { addDays, today } from './dates';

export type Afford = 'comfortable' | 'half' | 'tight' | 'no';
export type WishAdvice = 'buy' | 'buyCareful' | 'wait' | 'dont' | 'save';

export interface WishStatus {
  item: WishItem;
  tier: Afford;
  advice: WishAdvice;
  /** money free until payday after bills and the rest of the living budget */
  spare: number;
  /** free money per day until payday, before and after buying it */
  perDayNow: number;
  perDayAfter: number;
  daysLeft: number;
  /** months of monthly surplus needed before it's a comfortable buy */
  waitMonths?: number;
  waitDate?: string;
  /** highest card profit rate (monthly %) when a card carries a balance */
  cardRate?: number;
}

const essentialish = (p: Priority) => p === 'essential' || p === 'important';
const droppable = (p: Priority) => p === 'optional' || p === 'luxury';

function adviceFor(tier: Afford, p: Priority): WishAdvice {
  if (tier === 'comfortable') return 'buy';
  if (tier === 'half') return essentialish(p) ? 'buy' : droppable(p) ? 'wait' : 'buyCareful';
  if (tier === 'tight') return p === 'essential' ? 'buyCareful' : droppable(p) ? 'dont' : 'wait';
  return 'save';
}

interface Ctx {
  cf: ReturnType<typeof cashflow>;
  capacity: number;
  cardRate?: number;
}

function context(d: AppData): Ctx {
  const owedCards = creditAccounts(d).filter((a) => balance(d, a) > 0);
  return {
    cf: cashflow(d),
    capacity: Math.max(0, monthlyPicture(d).gap),
    cardRate: owedCards.length ? Math.max(...owedCards.map((a) => a.credit?.monthlyRate ?? 0)) : undefined
  };
}

export function wishStatus(d: AppData, item: WishItem, ctx: Ctx = context(d)): WishStatus {
  const { cf, capacity } = ctx;
  const spare = cf.result;
  const price = item.price;
  // "tight" = only possible by trimming day-to-day spending until payday
  const squeeze = spare + cf.livingLeft * 0.3;
  const tier: Afford =
    spare > 0 && price <= spare * 0.4 ? 'comfortable' : spare > 0 && price <= spare * 0.75 ? 'half' : price <= squeeze && price <= cf.cash ? 'tight' : 'no';
  const s: WishStatus = {
    item,
    tier,
    advice: adviceFor(tier, item.priority),
    spare,
    daysLeft: cf.daysLeft,
    perDayNow: round2(spare / Math.max(1, cf.daysLeft)),
    perDayAfter: round2((spare - price) / Math.max(1, cf.daysLeft))
  };
  if (tier !== 'comfortable') {
    const short = price - Math.max(0, spare) * 0.4;
    if (capacity > 0) {
      s.waitMonths = Math.max(1, Math.ceil(short / capacity));
      s.waitDate = addDays(today(), Math.round(s.waitMonths * 30.44));
    }
  }
  if (ctx.cardRate && !essentialish(item.priority)) s.cardRate = ctx.cardRate;
  return s;
}

const PRI_ORDER: Record<Priority, number> = { essential: 0, important: 1, flexible: 2, optional: 3, luxury: 4 };
const TIER_ORDER: Record<Afford, number> = { comfortable: 0, half: 1, tight: 2, no: 3 };

/** Open wishes, most sensible to buy first: importance, then affordability, then price. */
export function wishStatuses(d: AppData): WishStatus[] {
  const ctx = context(d);
  return d.wishlist
    .filter((w) => !w.bought)
    .map((w) => wishStatus(d, w, ctx))
    .sort((a, b) => PRI_ORDER[a.item.priority] - PRI_ORDER[b.item.priority] || TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.item.price - b.item.price);
}
