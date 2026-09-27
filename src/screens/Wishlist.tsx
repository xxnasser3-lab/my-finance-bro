import { useState } from 'preact/hooks';
import { t, fmtDay } from '../i18n';
import { getData, removeById, uid, update, upsert, useData } from '../store/store';
import type { WishItem } from '../store/types';
import { Icon } from '../components/Icon';
import { TopBar, Money, Sheet, Field, NumInput, Collapse, num, toast, confirmDo } from '../components/ui';
import { PriorityPicker, PriorityPill } from '../components/priority';
import { wishStatuses, type Afford, type WishStatus } from '../logic/wishlist';
import { nowTime, today } from '../logic/dates';
import { monthOf } from './Goals';

export const TIER_COLOR: Record<Afford, string> = { comfortable: 'var(--green)', half: 'var(--gold)', tight: 'var(--accent)', no: 'var(--danger)' };
const TIER_ICON: Record<Afford, string> = { comfortable: 'check', half: 'info', tight: 'alert', no: 'x' };

function WishSheet({ item, onClose }: { item?: WishItem; onClose: () => void }) {
  const [w, setW] = useState<WishItem>(item ? { ...item } : { id: uid(), name: '', price: 0, priority: 'optional', createdAt: new Date().toISOString() });
  const set = (p: Partial<WishItem>) => setW((x) => ({ ...x, ...p }));
  const save = () => {
    if (!w.name.trim() || !(w.price > 0)) return toast(t('name') + ' · ' + t('wish.price'));
    update((x) => ({ ...x, wishlist: upsert(x.wishlist, { ...w, name: w.name.trim() }) }));
    onClose();
  };
  const del = () => {
    if (!item || !confirmDo(t('confirmDelete'))) return;
    update((x) => ({ ...x, wishlist: removeById(x.wishlist, item.id) }));
    onClose();
  };
  return (
    <Sheet onClose={onClose} title={item ? item.name : t('wish.new')}>
      <Field label={t('wish.what')}><input class="input" value={w.name} placeholder={t('wish.whatPh')} onInput={(e) => set({ name: (e.target as HTMLInputElement).value })} /></Field>
      <Field label={t('wish.price')}><NumInput value={w.price || undefined} onInput={(v) => set({ price: v || 0 })} /></Field>
      <Field label={t('wish.importance')}><PriorityPicker value={w.priority} onChange={(p) => set({ priority: p })} /></Field>
      <Field label={t('note')}><input class="input" value={w.note ?? ''} placeholder={t('optional')} onInput={(e) => set({ note: (e.target as HTMLInputElement).value || undefined })} /></Field>
      <div class="row-flex">
        {item && <button class="btn danger" onClick={del} aria-label={t('delete')}><Icon name="trash" size={18} /></button>}
        <button class="btn grow" onClick={save}>{t('save')}</button>
      </div>
    </Sheet>
  );
}

function BuySheet({ s, onClose }: { s: WishStatus; onClose: () => void }) {
  const d = getData();
  const [price, setPrice] = useState<number | undefined>(s.item.price);
  const [accountId, setAccountId] = useState(d.settings.salaryAccountId ?? d.accounts.find((a) => !a.archived)?.id);
  const buy = () => {
    if (!price || price <= 0) return toast(t('wish.price'));
    update((x) => ({
      ...x,
      wishlist: x.wishlist.map((w) => (w.id === s.item.id ? { ...w, bought: true, price } : w)),
      txs: [...x.txs, { id: uid(), type: 'expense', amount: price, date: today(), time: nowTime(), categoryId: 'c-shop', accountId, note: s.item.name, createdAt: new Date().toISOString() }]
    }));
    toast(t('wish.bought'));
    onClose();
  };
  return (
    <Sheet onClose={onClose} title={t('wish.buyTitle', { label: s.item.name })}>
      <Field label={t('wish.paid')}><NumInput value={price} onInput={setPrice} /></Field>
      <Field label={t('tx.from')}>
        <select class="select" value={accountId ?? ''} onChange={(e) => setAccountId((e.target as HTMLSelectElement).value || undefined)}>
          {d.accounts.filter((a) => !a.archived).map((a) => <option value={a.id}>{a.name}</option>)}
        </select>
      </Field>
      <span class="xs faint">{t('wish.buyNote')}</span>
      <button class="btn" onClick={buy}>{t('wish.markBought')}</button>
    </Sheet>
  );
}

function WishCard({ s, onEdit, onBuy }: { s: WishStatus; onEdit: () => void; onBuy: () => void }) {
  const color = TIER_COLOR[s.tier];
  return (
    <div class="card pad col gap10" style={{ borderInlineStart: '3px solid ' + color }}>
      <div class="between" style="align-items:flex-start">
        <button class="col gap4" style="min-width:0;background:none;border:0;padding:0;text-align:start;color:var(--text)" onClick={onEdit}>
          <span class="semi" style="font-size:15px">{s.item.name}</span>
          <span class="row-flex" style="gap:6px"><PriorityPill p={s.item.priority} />{s.item.note && <span class="xs faint ellipsis">{s.item.note}</span>}</span>
        </button>
        <Money v={s.item.price} class="bold" />
      </div>
      <div class="row-flex small" style={{ gap: '8px', color, fontWeight: 700 }}>
        <Icon name={TIER_ICON[s.tier]} size={16} stroke={2.2} />
        <span>{t(('tier.' + s.tier) as 'tier.comfortable')}</span>
      </div>
      <span class="small text2" style="line-height:1.7">{t(('wadv.' + s.advice) as 'wadv.buy', { n: s.waitMonths ?? 0, d: s.waitDate ? monthOf(s.waitDate) : '' })}</span>
      {s.tier !== 'no' && s.spare > 0 && (
        <div class="grid2">
          <div class="inset col gap4"><span class="xs faint">{t('wish.perDayNow')}</span><span class="semi n">{num(s.perDayNow)}</span></div>
          <div class="inset col gap4"><span class="xs faint">{t('wish.perDayAfter')}</span><span class="semi n" style={{ color: s.perDayAfter < 0 ? 'var(--danger)' : undefined }}>{num(s.perDayAfter)}</span></div>
        </div>
      )}
      {s.cardRate ? <span class="xs muted" style="line-height:1.6">{t('wish.cardFirst', { r: s.cardRate })}</span> : null}
      <div class="grid2">
        <button class="btn sm ghost" onClick={onEdit}><Icon name="edit" size={15} />{t('edit')}</button>
        <button class="btn sm outline" onClick={onBuy}><Icon name="check" size={15} />{t('wish.markBought')}</button>
      </div>
    </div>
  );
}

export function Wishlist() {
  const d = useData();
  const [edit, setEdit] = useState<{ item?: WishItem } | undefined>();
  const [buying, setBuying] = useState<WishStatus | undefined>();
  const list = wishStatuses(d);
  const bought = d.wishlist.filter((w) => w.bought);
  const spare = list[0]?.spare;
  const total = list.reduce((a, s) => a + s.item.price, 0);
  return (
    <div class="screen no-nav">
      <TopBar back title={t('wish.title')} fallback="/plan">
        <button class="icon-btn accent" aria-label={t('add')} onClick={() => setEdit({})}><Icon name="plus" size={18} stroke={2.4} /></button>
      </TopBar>

      {list.length > 0 && spare !== undefined && (
        <div class="card pad col gap10">
          <div class="grid2">
            <div class="col gap4"><span class="xs muted">{t('wish.spare')}</span><span style="font-size:22px"><Money v={spare} class={'bold ' + (spare < 0 ? 'neg' : 'pos')} /></span></div>
            <div class="col gap4"><span class="xs muted">{t('wish.total', { n: list.length })}</span><span style="font-size:22px"><Money v={total} class="bold" /></span></div>
          </div>
          <span class="xs faint" style="line-height:1.7">{t('wish.how')}</span>
          <div class="legend" style="font-size:10px">
            {(['comfortable', 'half', 'tight', 'no'] as Afford[]).map((k) => <span><i class="dot" style={{ background: TIER_COLOR[k], borderRadius: '99px' }} />{t(('tier.' + k) as 'tier.comfortable')}</span>)}
          </div>
        </div>
      )}

      {list.length === 0 && (
        <button class="card pad col gap8" style="align-items:center;border-style:dashed;color:var(--muted)" onClick={() => setEdit({})}>
          <Icon name="wish" size={28} />
          <span>{t('wish.addFirst')}</span>
          <span class="xs faint" style="line-height:1.6">{t('wish.addFirstSub')}</span>
        </button>
      )}

      {list.map((s) => <WishCard s={s} onEdit={() => setEdit({ item: s.item })} onBuy={() => setBuying(s)} />)}

      {bought.length > 0 && (
        <Collapse title={t('wish.boughtList')} right={<span class="xs faint n">{bought.length}</span>}>
          {bought.map((w) => (
            <div class="row">
              <span class="ib" style="color:var(--green)"><Icon name="check" size={16} /></span>
              <span class="grow semi ellipsis">{w.name}</span>
              <Money v={w.price} class="semi text2" />
              <button class="icon-btn" style="width:32px;height:32px" aria-label={t('delete')} onClick={() => confirmDo(t('confirmDelete')) && update((x) => ({ ...x, wishlist: removeById(x.wishlist, w.id) }))}><Icon name="trash" size={14} /></button>
            </div>
          ))}
        </Collapse>
      )}

      {edit && <WishSheet item={edit.item} onClose={() => setEdit(undefined)} />}
      {buying && <BuySheet s={buying} onClose={() => setBuying(undefined)} />}
      <span class="xs faint center" style="line-height:1.7">{t('wish.basedOn', { d: fmtDay(today()) })}</span>
    </div>
  );
}
