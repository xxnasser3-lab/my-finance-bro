import { useState } from 'preact/hooks';
import { t, fmtMonth, dayName, monthName } from '../i18n';
import { useData, getData, update, upsert, uid, removeById } from '../store/store';
import type { Commitment, CommitmentKind } from '../store/types';
import { Icon, Chev } from '../components/Icon';
import { TopBar, Money, Collapse, Sheet, Seg, Field, NumInput, Switch, catName, fmt, toast, confirmDo } from '../components/ui';
import { commitmentDueIn, commitmentPaid, commitmentsMonthly, nextInstallmentDate, oweDebts, creditAccounts, cardStatement } from '../logic/finance';
import { clampDay, daysInMonth, nowTime, today } from '../logic/dates';

function CommitmentSheet({ item, onClose }: { item?: Commitment; onClose: () => void }) {
  const d = getData();
  const [c, setC] = useState<Commitment>(
    item ? { ...item } : { id: uid(), kind: 'subscription', name: '', amount: 0, dayOfMonth: 1, cycle: 'monthly', accountId: d.settings.subscriptionsAccountId, categoryId: 'c-subs', active: true }
  );
  const set = (p: Partial<Commitment>) => setC((x) => ({ ...x, ...p }));
  const save = () => {
    if (!c.name.trim() || !(c.amount > 0)) return toast(t('name') + ' · ' + t('amount'));
    update((x) => ({ ...x, commitments: upsert(x.commitments, { ...c, name: c.name.trim() }) }));
    onClose();
  };
  const del = () => {
    if (!item || !confirmDo(t('confirmDelete'))) return;
    update((x) => ({ ...x, commitments: removeById(x.commitments, item.id) }));
    onClose();
  };
  return (
    <Sheet onClose={onClose} title={item ? item.name : t('com.new')}>
      <Seg<CommitmentKind> value={c.kind} onChange={(k) => set({ kind: k, categoryId: k === 'subscription' ? 'c-subs' : 'c-bills', accountId: k === 'subscription' ? d.settings.subscriptionsAccountId ?? c.accountId : c.accountId })} options={[['fixed', t('com.fixed')], ['subscription', t('com.subs')]]} />
      <Field label={t('name')}><input class="input" value={c.name} onInput={(e) => set({ name: (e.target as HTMLInputElement).value })} /></Field>
      <div class="grid2">
        <Field label={t('amount')}><NumInput value={c.amount || undefined} onInput={(v) => set({ amount: v || 0 })} /></Field>
        <Field label={t('com.day')}><NumInput value={c.dayOfMonth} onInput={(v) => set({ dayOfMonth: Math.min(31, Math.max(1, Math.round(v || 1))) })} /></Field>
      </div>
      <Seg<'monthly' | 'yearly'> value={c.cycle} onChange={(v) => set({ cycle: v, month: v === 'yearly' ? c.month ?? new Date().getMonth() + 1 : undefined })} options={[['monthly', t('com.monthlyC')], ['yearly', t('com.yearlyC')]]} />
      {c.cycle === 'yearly' && (
        <Field label={t('com.month')}>
          <select class="select" value={c.month} onChange={(e) => set({ month: +(e.target as HTMLSelectElement).value })}>
            {Array.from({ length: 12 }, (_, i) => <option value={i + 1}>{monthName(i)}</option>)}
          </select>
        </Field>
      )}
      <div class="grid2">
        <Field label={t('com.payFrom')}>
          <select class="select" value={c.accountId ?? ''} onChange={(e) => set({ accountId: (e.target as HTMLSelectElement).value || undefined })}>
            <option value="">—</option>
            {d.accounts.filter((a) => !a.archived).map((a) => <option value={a.id}>{a.name}</option>)}
          </select>
        </Field>
        <Field label={t('tx.category')}>
          <select class="select" value={c.categoryId ?? ''} onChange={(e) => set({ categoryId: (e.target as HTMLSelectElement).value || undefined })}>
            {d.categories.filter((x) => x.kind === 'expense' && !x.archived).map((x) => <option value={x.id}>{catName(x)}</option>)}
          </select>
        </Field>
      </div>
      <div class="between small"><span>{t('com.variable')}</span><Switch on={!!c.variable} onChange={(v) => set({ variable: v })} label={t('com.variable')} /></div>
      <div class="row-flex">
        {item && <button class="btn danger" onClick={del} aria-label={t('delete')}><Icon name="trash" size={18} /></button>}
        <button class="btn grow" onClick={save}>{t('save')}</button>
      </div>
    </Sheet>
  );
}

export function Commitments() {
  const d = useData();
  const [edit, setEdit] = useState<Commitment | null | undefined>(undefined);
  const [off, setOff] = useState(0);
  const n = new Date();
  const md = new Date(n.getFullYear(), n.getMonth() + off, 1);
  const y = md.getFullYear();
  const m0 = md.getMonth();
  const t0 = today();
  const fixed = d.commitments.filter((c) => c.kind === 'fixed');
  const subs = d.commitments.filter((c) => c.kind === 'subscription');
  const monthly = commitmentsMonthly(d);
  const subsMonthly = commitmentsMonthly(d, 'subscription');

  const dots = new Map<number, string>();
  for (const c of d.commitments) {
    if (!c.active) continue;
    const due = commitmentDueIn(c, y, m0);
    if (due) dots.set(+due.slice(8), c.kind === 'subscription' ? '#DD6220' : dots.get(+due.slice(8)) ?? '#CDBEB0');
  }
  for (const debt of oweDebts(d)) {
    const due = nextInstallmentDate(d, debt);
    if (due && due.slice(0, 7) === clampDay(y, m0, 1).slice(0, 7) && !dots.has(+due.slice(8))) dots.set(+due.slice(8), '#5B8FD0');
  }
  for (const acc of creditAccounts(d)) {
    const st = cardStatement(d, acc);
    if (st && st.dueDate.slice(0, 7) === clampDay(y, m0, 1).slice(0, 7) && !dots.has(+st.dueDate.slice(8))) dots.set(+st.dueDate.slice(8), '#5B8FD0');
  }
  const blanks = new Date(y, m0, 1).getDay();
  const dim = daysInMonth(y, m0);

  const markPaid = (c: Commitment) => {
    const due = commitmentDueIn(c, n.getFullYear(), n.getMonth()) ?? t0;
    update((x) => ({ ...x, txs: [...x.txs, { id: uid(), type: 'expense', amount: c.amount, date: due > t0 ? t0 : due, time: nowTime(), categoryId: c.categoryId, accountId: c.accountId, commitmentId: c.id, note: c.name, createdAt: new Date().toISOString() }] }));
    toast(t('com.paid'));
  };

  const row = (c: Commitment) => {
    const due = commitmentDueIn(c, n.getFullYear(), n.getMonth());
    const paid = due ? commitmentPaid(d, c, due) : false;
    const acc = d.accounts.find((a) => a.id === c.accountId);
    return (
      <div class="row" style={{ opacity: c.active ? 1 : 0.5 }}>
        <button class="ib" style="font-size:12px;font-weight:800" onClick={() => setEdit(c)}>{c.name.slice(0, 2)}</button>
        <button class="grow col gap4" style="min-width:0;background:none;border:0;padding:0;text-align:start" onClick={() => setEdit(c)}>
          <span class="semi ellipsis" style="font-size:14px">{c.name}</span>
          <span class="row-flex xs faint" style="gap:6px">
            {t('day')} {c.dayOfMonth} · {c.cycle === 'yearly' ? t('com.yearlyC') + ' ' + monthName((c.month ?? 1) - 1) : t('com.monthlyC')}
            {acc && <span class="tag">{acc.name}</span>}
          </span>
        </button>
        <span class="col" style="align-items:flex-end;gap:4px">
          <span class="n bold">{c.variable ? '~' : ''}{fmt(c.amount)}</span>
          {due && (paid ? <span class="pill green">{t('com.paid')}</span> : <button class="pill accent" style="border:0" onClick={() => markPaid(c)}>{t('com.markPaid')}</button>)}
        </span>
      </div>
    );
  };

  return (
    <div class="screen no-nav">
      <TopBar back title={t('com.title')}>
        <button class="icon-btn accent" aria-label={t('add')} onClick={() => setEdit(null)}><Icon name="plus" size={18} stroke={2.4} /></button>
      </TopBar>

      <div class="card pad col gap14">
        <div class="grid3">
          <div class="col gap4"><span class="xs muted">{t('com.monthly')}</span><span style="font-size:22px"><Money v={monthly} class="bold" /></span></div>
          <div class="col gap4"><span class="xs muted">{t('com.fixed')}</span><span style="font-size:22px"><Money v={monthly - subsMonthly} class="bold text2" /></span></div>
          <div class="col gap4"><span class="xs muted">{t('com.subs')}</span><span style="font-size:22px"><Money v={subsMonthly} class="bold neg" /></span></div>
        </div>
        <div class="bar tall" style="gap:2px">
          <div style={{ width: ((monthly - subsMonthly) / Math.max(1, monthly)) * 100 + '%', background: '#8C7564', borderRadius: 0 }} />
          <div style={{ width: (subsMonthly / Math.max(1, monthly)) * 100 + '%', borderRadius: 0 }} />
        </div>
        <span class="small muted">{t('com.yearly', { v: fmt(subsMonthly * 12) })}</span>
      </div>

      <div class="card pad col gap10">
        <div class="between">
          <button class="icon-btn" style="width:32px;height:32px" aria-label="prev" onClick={() => setOff((o) => o - 1)}><Chev dir="back" size={15} /></button>
          <span class="semi">{fmtMonth(y, m0)}</span>
          <button class="icon-btn" style="width:32px;height:32px" aria-label="next" onClick={() => setOff((o) => o + 1)}><Chev dir="fwd" size={15} /></button>
        </div>
        <div class="cal">
          {Array.from({ length: 7 }, (_, i) => <span class="xs faint">{dayName(i, true)}</span>)}
          {Array.from({ length: blanks }, () => <span />)}
          {Array.from({ length: dim }, (_, i) => {
            const iso = clampDay(y, m0, i + 1);
            return (
              <div class={'d' + (iso === t0 ? ' today' : iso < t0 ? ' past' : '')}>
                {i + 1}
                <i style={{ background: dots.get(i + 1) ?? 'transparent' }} />
              </div>
            );
          })}
        </div>
        <div class="legend" style="font-size:10px">
          <span><i class="dot" style="background:#CDBEB0;border-radius:99px" />{t('com.legendFixed')}</span>
          <span><i class="dot" style="background:#DD6220;border-radius:99px" />{t('com.legendSub')}</span>
          <span><i class="dot" style="background:#5B8FD0;border-radius:99px" />{t('com.legendInst')}</span>
        </div>
      </div>

      <div class="card row-flex" style="padding:12px 14px;gap:12px;border-color:#3a2a1f">
        <Icon name="card" size={20} />
        <div class="grow col gap4">
          <span class="xs muted">{t('com.defaultCard')}</span>
          <select class="select" style="height:38px;font-size:13px" value={d.settings.subscriptionsAccountId ?? ''} onChange={(e) => update((x) => ({ ...x, settings: { ...x.settings, subscriptionsAccountId: (e.target as HTMLSelectElement).value || undefined } }))}>
            <option value="">—</option>
            {d.accounts.filter((a) => !a.archived).map((a) => <option value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>

      <Collapse open title={t('com.fixed')} right={<Money v={commitmentsMonthly(d, 'fixed')} class="small text2" />}>
        {fixed.length === 0 && <div class="empty">{t('empty')}</div>}
        {fixed.map(row)}
      </Collapse>
      <Collapse open title={t('com.subs')} right={<Money v={subsMonthly} class="small neg" />}>
        {subs.length === 0 && <div class="empty">{t('empty')}</div>}
        {subs.map(row)}
      </Collapse>

      {edit !== undefined && <CommitmentSheet item={edit ?? undefined} onClose={() => setEdit(undefined)} />}
    </div>
  );
}
