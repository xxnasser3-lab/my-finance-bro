import { useMemo, useState } from 'preact/hooks';
import { t, fmtDay } from '../i18n';
import { getData, removeById, uid, update, upsert } from '../store/store';
import type { Tx, TxType } from '../store/types';
import { Sheet, Seg, catName, num, toast, hexA, confirmDo } from '../components/ui';
import { Icon } from '../components/Icon';
import { budgetView, catById, isLiving } from '../logic/finance';
import { nowTime, today } from '../logic/dates';
import { navigate } from '../router';

export function TxSheet({ preset, onClose }: { preset?: Partial<Tx>; onClose: () => void }) {
  const d = getData();
  const editing = preset?.id ? d.txs.find((x) => x.id === preset.id) : undefined;
  const base: Partial<Tx> = editing ?? preset ?? {};
  const lastAcc = [...d.txs].reverse().find((x) => x.type === 'expense')?.accountId;
  const liquid = d.accounts.filter((a) => !a.archived);
  const [type, setType] = useState<TxType>(base.type ?? 'expense');
  const [amount, setAmount] = useState(base.amount ? String(base.amount) : '');
  const [catId, setCatId] = useState<string | undefined>(base.categoryId);
  const [accountId, setAccountId] = useState<string | undefined>(base.accountId ?? (type === 'income' ? d.settings.salaryAccountId : lastAcc) ?? liquid[0]?.id);
  const [toAccountId, setTo] = useState<string | undefined>(base.toAccountId);
  const [tripId, setTrip] = useState<string | undefined>(base.tripId ?? d.trips.find((tr) => today() >= tr.start && today() <= (tr.end ?? tr.start))?.id);
  const [debtId, setDebt] = useState<string | undefined>(base.debtId);
  const [date, setDate] = useState(base.date ?? today());
  const [note, setNote] = useState(base.note ?? '');
  const [more, setMore] = useState(!!(base.debtId || base.note));

  const roots = useMemo(() => {
    const kind = type === 'income' ? 'income' : 'expense';
    const counts = new Map<string, number>();
    d.txs.slice(-300).forEach((x) => x.categoryId && counts.set(x.categoryId, (counts.get(x.categoryId) ?? 0) + 1));
    const rootOf = (id: string) => d.categories.find((c) => c.id === id)?.parentId ?? id;
    const score = (id: string) => [...counts.entries()].filter(([k]) => rootOf(k) === id).reduce((s, [, v]) => s + v, 0);
    return d.categories.filter((c) => c.kind === kind && !c.parentId && !c.archived).sort((a, b) => score(b.id) - score(a.id));
  }, [type]);

  const selected = catById(d, catId);
  const selectedRoot = selected?.parentId ? catById(d, selected.parentId) : selected;
  const subs = selectedRoot ? d.categories.filter((c) => c.parentId === selectedRoot.id && !c.archived) : [];

  const press = (k: string) => {
    setAmount((a) => {
      if (k === 'back') return a.slice(0, -1);
      if (k === '.') return a.includes('.') ? a : (a || '0') + '.';
      if (a === '0') return k;
      if (a.includes('.') && a.split('.')[1].length >= 2) return a;
      return a.length >= 9 ? a : a + k;
    });
  };

  const amt = parseFloat(amount) || 0;
  const bv = budgetView(d);
  const acc = d.accounts.find((a) => a.id === accountId);
  const draft: Tx = { id: 'draft', type, amount: amt, date, categoryId: catId, accountId, createdAt: '', tripId, debtId };
  const living = type === 'expense' && isLiving(d, draft);
  const hint =
    type === 'income' ? t('tx.incomeNote')
    : type === 'transfer' ? t('tx.transferNote')
    : acc?.kind === 'credit' ? t('tx.creditNote')
    : living ? t('tx.leftToday', { n: num(bv.leftToday - (date === today() ? amt : 0)) })
    : '';

  const save = () => {
    if (amt <= 0) return toast(t('amount'));
    if (type === 'transfer' && (!accountId || !toAccountId || accountId === toAccountId)) return toast(t('tx.to'));
    const tx: Tx = {
      id: editing?.id ?? uid(),
      type,
      amount: amt,
      date,
      time: editing?.time ?? nowTime(),
      categoryId: type === 'transfer' ? undefined : catId ?? (type === 'income' ? 'i-other' : 'c-other'),
      accountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      tripId: type === 'expense' ? tripId : undefined,
      debtId: debtId || undefined,
      commitmentId: base.commitmentId,
      note: note.trim() || undefined,
      createdAt: editing?.createdAt ?? new Date().toISOString()
    };
    update((x) => ({ ...x, txs: upsert(x.txs, tx) }));
    toast(t('done'));
    onClose();
  };

  const remove = () => {
    if (!editing || !confirmDo(t('confirmDelete'))) return;
    update((x) => ({ ...x, txs: removeById(x.txs, editing.id) }));
    onClose();
  };

  const accOptions = (exclude?: string) => liquid.filter((a) => a.id !== exclude);

  return (
    <Sheet onClose={onClose}>
      <div class="row-flex">
        <div class="grow">
          <Seg<TxType> value={type} onChange={(v) => { setType(v); setCatId(undefined); }} options={[['expense', t('tx.expense')], ['income', t('tx.income')], ['transfer', t('tx.transfer')]]} />
        </div>
        <button class="icon-btn" aria-label={t('close')} onClick={onClose}><Icon name="x" size={16} stroke={2} /></button>
      </div>

      <div class="col" style="align-items:center;gap:2px;padding:4px 0">
        <div class="row-flex" style="align-items:baseline;gap:6px;direction:ltr">
          <span class="n" style={{ fontSize: '20px', fontWeight: 700, color: type === 'income' ? 'var(--green-text)' : type === 'expense' ? 'var(--accent-text)' : 'var(--muted)' }}>{type === 'income' ? '+' : type === 'expense' ? '−' : ''}</span>
          <span class="n" style="font-size:44px;font-weight:700;letter-spacing:-0.02em;line-height:1.05">{amount || '0'}</span>
          <span class="muted" style="font-size:14px">{t('cur')}</span>
        </div>
        {hint && <span class="xs muted center">{hint}</span>}
      </div>

      {type !== 'transfer' && (
        <div class="col gap8">
          <div class="between">
            <span class="xs semi muted">{type === 'income' ? t('tx.source') : t('tx.category')}</span>
            <button class="link-btn xs" onClick={() => { onClose(); navigate('/categories'); }}>{t('tx.manageCats')}</button>
          </div>
          <div class="chips scroll">
            {roots.map((c) => (
              <button type="button" class={'chip' + (selectedRoot?.id === c.id ? ' on' : '')} onClick={() => setCatId(c.id)}>
                <span class="dot" style={{ background: c.color }} />
                {catName(c)}
              </button>
            ))}
          </div>
          {subs.length > 0 && (
            <div class="chips scroll">
              {subs.map((c) => (
                <button type="button" class={'chip' + (catId === c.id ? ' on' : '')} style={{ background: catId === c.id ? hexA(c.color, 0.16) : undefined }} onClick={() => setCatId(catId === c.id ? selectedRoot!.id : c.id)}>
                  {catName(c)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div class="grid2">
        <label class="field">
          {type === 'income' ? t('tx.to') : t('tx.from')}
          <select class="select" value={accountId} onChange={(e) => setAccountId((e.target as HTMLSelectElement).value)}>
            {accOptions().map((a) => <option value={a.id}>{a.name}</option>)}
          </select>
        </label>
        {type === 'transfer' ? (
          <label class="field">
            {t('tx.to')}
            <select class="select" value={toAccountId ?? ''} onChange={(e) => setTo((e.target as HTMLSelectElement).value)}>
              <option value="">—</option>
              {accOptions(accountId).map((a) => <option value={a.id}>{a.name}</option>)}
            </select>
          </label>
        ) : type === 'expense' ? (
          <label class="field">
            {t('tx.trip')}
            <select class="select" value={tripId ?? ''} onChange={(e) => setTrip((e.target as HTMLSelectElement).value || undefined)}>
              <option value="">{t('tx.noTrip')}</option>
              {d.trips.map((tr) => <option value={tr.id}>{tr.name}</option>)}
            </select>
          </label>
        ) : (
          <label class="field">
            {t('date')}
            <input class="input n" type="date" value={date} onInput={(e) => setDate((e.target as HTMLInputElement).value || today())} />
          </label>
        )}
      </div>

      {!more ? (
        <button class="link-btn xs" style="align-self:flex-start" onClick={() => setMore(true)}>+ {t('date')} · {t('note')} · {t('tx.debt')}</button>
      ) : (
        <div class="col gap8">
          <div class="grid2">
            {type !== 'income' && (
              <label class="field">
                {t('date')}
                <input class="input n" type="date" value={date} onInput={(e) => setDate((e.target as HTMLInputElement).value || today())} />
              </label>
            )}
            <label class="field">
              {t('tx.debt')}
              <select class="select" value={debtId ?? ''} onChange={(e) => setDebt((e.target as HTMLSelectElement).value || undefined)}>
                <option value="">{t('none')}</option>
                {d.debts.filter((x) => !x.closed).map((x) => <option value={x.id}>{x.name}</option>)}
              </select>
            </label>
          </div>
          <input class="input" placeholder={t('note')} value={note} onInput={(e) => setNote((e.target as HTMLInputElement).value)} />
        </div>
      )}

      <div class="keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'].map((k) => (
          <button type="button" aria-label={k === 'back' ? 'delete' : k} onClick={() => press(k)}>
            {k === 'back' ? <Icon name="undo" size={20} /> : k}
          </button>
        ))}
      </div>

      <div class="row-flex">
        {editing && <button class="btn danger" onClick={remove} aria-label={t('delete')}><Icon name="trash" size={18} /></button>}
        <button class="btn grow" onClick={save}>{t('tx.save')}{date !== today() ? ' · ' + fmtDay(date) : ''}</button>
      </div>
    </Sheet>
  );
}
