import { useState } from 'preact/hooks';
import { t, fmtDay, fmtMonth } from '../i18n';
import { getData, removeById, uid, update, upsert, useData } from '../store/store';
import type { Goal } from '../store/types';
import { Icon } from '../components/Icon';
import { TopBar, Money, Bar, Sheet, Field, NumInput, Switch, fmt, toast, confirmDo } from '../components/ui';
import { goalStatuses, type GoalStatus } from '../logic/goals';
import { liquidAccounts } from '../logic/finance';
import { addMonths, today } from '../logic/dates';
import { openTx } from '../sheets';

export const monthOf = (iso: string) => fmtMonth(+iso.slice(0, 4), +iso.slice(5, 7) - 1);

function GoalSheet({ item, onClose }: { item?: Goal; onClose: () => void }) {
  const d = getData();
  const [g, setG] = useState<Goal>(item ? { ...item } : { id: uid(), name: '', targetAmount: 0, createdAt: new Date().toISOString() });
  const set = (p: Partial<Goal>) => setG((x) => ({ ...x, ...p }));
  const save = () => {
    if (!g.name.trim() || !(g.targetAmount > 0)) return toast(t('name') + ' · ' + t('goal.target'));
    update((x) => ({ ...x, goals: upsert(x.goals, { ...g, name: g.name.trim() }) }));
    onClose();
  };
  const del = () => {
    if (!item || !confirmDo(t('confirmDelete'))) return;
    update((x) => ({ ...x, goals: removeById(x.goals, item.id) }));
    onClose();
  };
  return (
    <Sheet onClose={onClose} title={item ? item.name : t('goal.new')}>
      <Field label={t('goal.name')}><input class="input" value={g.name} placeholder={t('goal.namePh')} onInput={(e) => set({ name: (e.target as HTMLInputElement).value })} /></Field>
      <Field label={t('goal.target')}><NumInput value={g.targetAmount || undefined} onInput={(v) => set({ targetAmount: v || 0 })} /></Field>
      <div class="between small">
        <span class="col gap4"><span>{t('goal.hasDate')}</span><span class="xs faint">{t('goal.hasDateHint')}</span></span>
        <Switch on={!!g.targetDate} onChange={(v) => set({ targetDate: v ? addMonths(today(), 12) : undefined })} label={t('goal.hasDate')} />
      </div>
      {g.targetDate && <Field label={t('goal.date')}><input class="input n" type="date" min={today()} value={g.targetDate} onInput={(e) => set({ targetDate: (e.target as HTMLInputElement).value || undefined })} /></Field>}
      <Field label={t('goal.track')} hint={t('goal.trackHint')}>
        <select class="select" value={g.accountId ?? ''} onChange={(e) => set({ accountId: (e.target as HTMLSelectElement).value || undefined })}>
          <option value="">{t('goal.allSavings')}</option>
          {liquidAccounts(d).map((a) => <option value={a.id}>{a.name}</option>)}
        </select>
      </Field>
      <div class="row-flex">
        {item && <button class="btn danger" onClick={del} aria-label={t('delete')}><Icon name="trash" size={18} /></button>}
        <button class="btn grow" onClick={save}>{t('save')}</button>
      </div>
    </Sheet>
  );
}

function statusLine(s: GoalStatus): { text: string; tone: 'pos' | 'neg' | 'muted' } {
  if (s.achieved) return { text: t('goal.done'), tone: 'pos' };
  if (s.goal.targetDate) {
    if (s.overdue) return { text: t('goal.overdue', { v: fmt(s.remaining) }), tone: 'neg' };
    if (s.onTrack) return { text: t('goal.onTrack', { v: fmt(s.needed ?? 0) }), tone: 'pos' };
    const gap = Math.max(0, (s.needed ?? 0) - Math.max(0, s.rate ?? 0));
    return { text: t('goal.behind', { v: fmt(s.needed ?? 0), g: fmt(gap) }), tone: 'neg' };
  }
  if (s.eta) return { text: s.etaFromPlan ? t('goal.etaPlan', { d: monthOf(s.eta) }) : t('goal.eta', { d: monthOf(s.eta), r: fmt(s.rate ?? 0) }), tone: 'muted' };
  return { text: t('goal.noPace'), tone: 'neg' };
}

export function GoalCard({ s, onEdit, compact }: { s: GoalStatus; onEdit?: () => void; compact?: boolean }) {
  const d = getData();
  const acc = s.goal.accountId ? d.accounts.find((a) => a.id === s.goal.accountId) : undefined;
  const line = statusLine(s);
  const color = s.achieved ? 'var(--green)' : s.goal.targetDate && !s.onTrack ? 'var(--accent)' : 'var(--blue)';
  return (
    <div class="card pad col gap10">
      <div class="between" style="align-items:flex-start">
        <span class="row-flex" style="gap:10px;min-width:0">
          <span class="ib" style={{ color, background: 'var(--surface-2)' }}><Icon name={s.achieved ? 'check' : 'target'} size={18} /></span>
          <span class="col gap4" style="min-width:0">
            <span class="semi ellipsis" style="font-size:14px">{s.goal.name}</span>
            <span class="xs faint">{acc ? acc.name : t('goal.allSavings')}{s.goal.targetDate ? ' · ' + fmtDay(s.goal.targetDate, false, true) : ' · ' + t('goal.noDate')}</span>
          </span>
        </span>
        {onEdit && <button class="icon-btn" style="width:34px;height:34px" aria-label={t('edit')} onClick={onEdit}><Icon name="edit" size={15} /></button>}
      </div>
      <div class="between" style="align-items:baseline">
        <span><Money v={s.current} class="bold" /> <span class="xs muted">/ <Money v={s.goal.targetAmount} /></span></span>
        <span class="small semi n" style={{ color }}>{Math.floor(s.pct)}%</span>
      </div>
      <Bar pct={s.pct} color={color} tall />
      <span class={'xs ' + (line.tone === 'pos' ? 'pos' : line.tone === 'neg' ? 'neg' : 'muted')} style="line-height:1.6">{line.text}</span>
      {!compact && !s.achieved && s.realistic && <span class="xs muted" style="line-height:1.6">{t('goal.realistic', { c: fmt(s.capacity), d: monthOf(s.realistic) })}</span>}
      {!compact && !s.achieved && s.goal.targetDate && (s.needed ?? 0) > 0 && !s.overdue && (
        <div class="grid2">
          <div class="inset col gap4"><span class="xs faint">{t('goal.perMonth')}</span><Money v={s.needed ?? 0} class="semi" /></div>
          <div class="inset col gap4"><span class="xs faint">{t('goal.perDay')}</span><Money v={(s.needed ?? 0) / 30.44} class="semi" /></div>
        </div>
      )}
      {!compact && !s.achieved && acc && (
        <button class="btn sm ghost" onClick={() => openTx({ type: 'transfer', toAccountId: acc.id, note: s.goal.name })}><Icon name="plus" size={15} />{t('goal.addMoney')}</button>
      )}
    </div>
  );
}

export function Goals() {
  const d = useData();
  const [edit, setEdit] = useState<{ item?: Goal } | undefined>();
  const list = goalStatuses(d);
  return (
    <div class="screen no-nav">
      <TopBar back title={t('goal.title')} fallback="/plan">
        <button class="icon-btn accent" aria-label={t('add')} onClick={() => setEdit({})}><Icon name="plus" size={18} stroke={2.4} /></button>
      </TopBar>
      {list.length === 0 && (
        <button class="card pad col gap8" style="align-items:center;border-style:dashed;color:var(--muted)" onClick={() => setEdit({})}>
          <Icon name="target" size={28} />
          <span>{t('goal.addFirst')}</span>
          <span class="xs faint" style="line-height:1.6">{t('goal.addFirstSub')}</span>
        </button>
      )}
      {list.map((s) => <GoalCard s={s} onEdit={() => setEdit({ item: s.goal })} />)}
      {list.length > 0 && <span class="xs faint" style="line-height:1.7;padding:0 4px">{t('goal.note')}</span>}
      {edit && <GoalSheet item={edit.item} onClose={() => setEdit(undefined)} />}
    </div>
  );
}
