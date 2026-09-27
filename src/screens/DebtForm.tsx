import { useState } from 'preact/hooks';
import { t } from '../i18n';
import { getData, uid, update, upsert, removeById } from '../store/store';
import type { BnplProvider, Debt, DebtKind } from '../store/types';
import { Icon } from '../components/Icon';
import { Avatar, AVATAR_KINDS } from '../components/Avatar';
import { TopBar, Seg, Field, NumInput, toast, confirmDo } from '../components/ui';
import { readImage, pickFile } from '../components/image';
import { goBack, navigate } from '../router';
import { debtRemaining } from '../logic/finance';
import { addMonths, today } from '../logic/dates';

export function DebtForm({ id, preset }: { id?: string; preset?: string }) {
  const d = getData();
  const existing = id ? d.debts.find((x) => x.id === id) : undefined;
  const [x, setX] = useState<Debt>(
    existing
      ? structuredClone(existing)
      : {
          id: uid(),
          kind: (preset as DebtKind) || 'bnpl',
          name: '',
          provider: 'tabby',
          principal: 0,
          opening: 0,
          frequency: 'monthly',
          startDate: addMonths(today(), 1),
          installmentsTotal: 4,
          person: { avatar: 'ghutra', direction: 'owe' },
          createdAt: new Date().toISOString()
        }
  );
  const current = existing ? debtRemaining(d, existing) : x.opening;
  const [rem, setRem] = useState<number>(current);
  const set = (p: Partial<Debt>) => setX((v) => ({ ...v, ...p }));
  const setPerson = (p: Partial<NonNullable<Debt['person']>>) => setX((v) => ({ ...v, person: { avatar: 'ghutra', direction: 'owe', ...v.person, ...p } }));

  const onKind = (k: DebtKind | 'card') => {
    if (k === 'card') return navigate('/account/new/credit');
    set({ kind: k, installmentsTotal: k === 'bnpl' ? 4 : k === 'loan' ? 60 : undefined });
  };

  // BNPL: typing the total auto-fills the installment
  const setPrincipal = (v: number) => {
    const p = v || 0;
    set({ principal: p, installment: x.kind === 'bnpl' && x.installmentsTotal ? Math.round((p / x.installmentsTotal) * 100) / 100 : x.installment });
    if (!existing) setRem(p);
  };

  const save = () => {
    const name = x.name.trim() || (x.kind === 'bnpl' ? t(('prov.' + (x.provider ?? 'other')) as 'prov.tabby') : '');
    if (!name) return toast(t('name'));
    const r = Number.isNaN(rem) ? 0 : rem;
    const opening = existing ? x.opening + (r - current) : r;
    const debt: Debt = { ...x, name, opening, principal: x.principal || r, person: x.kind === 'person' ? x.person : undefined, provider: x.kind === 'bnpl' ? x.provider : undefined };
    update((v) => ({ ...v, debts: upsert(v.debts, debt) }));
    toast(t('done'));
    if (existing) goBack('/debt/' + debt.id);
    else navigate('/debt/' + debt.id, true);
  };

  const del = () => {
    if (!existing || !confirmDo(t('confirmDelete'))) return;
    update((v) => ({ ...v, debts: removeById(v.debts, existing.id), txs: v.txs.map((tx) => (tx.debtId === existing.id ? { ...tx, debtId: undefined } : tx)) }));
    navigate('/debts', true);
  };

  const photo = async () => {
    const f = await pickFile('image/*');
    if (f) setPerson({ avatar: 'photo', photo: await readImage(f, 320) });
  };

  const kinds: [DebtKind | 'card', string][] = [['bnpl', t('kindD.bnpl')], ['loan', t('kindD.loan')], ['person', t('kindD.person')], ['card', t('kindD.card')]];

  return (
    <div class="screen no-nav">
      <TopBar back title={existing ? existing.name : t('debt.new')} fallback="/debts" />
      {!existing && (
        <div class="chips">
          {kinds.map(([k, l]) => <button class={'chip solid' + (x.kind === k ? ' on' : '')} onClick={() => onKind(k)}>{l}</button>)}
        </div>
      )}

      {x.kind === 'person' && (
        <div class="card pad col gap12">
          <div class="col" style="align-items:center;gap:8px">
            <Avatar kind={x.person?.avatar ?? 'initial'} photo={x.person?.photo} name={x.name} size={88} />
          </div>
          <span class="xs semi muted">{t('debt.avatar')}</span>
          <div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;justify-items:center">
            {AVATAR_KINDS.map((k) => (
              <button
                type="button"
                aria-label={k}
                onClick={() => (k === 'photo' ? photo() : setPerson({ avatar: k }))}
                style={{ padding: '2px', borderRadius: '999px', background: 'transparent', border: '2px solid ' + (x.person?.avatar === k ? 'var(--accent)' : 'transparent'), display: 'flex' }}
              >
                <Avatar kind={k} photo={k === 'photo' ? x.person?.photo : undefined} name={x.name || '؟'} size={46} />
              </button>
            ))}
          </div>
          <Seg<'owe' | 'owed'> value={x.person?.direction ?? 'owe'} onChange={(v) => setPerson({ direction: v })} options={[['owe', t('debt.iOwe')], ['owed', t('debt.owedMe')]]} />
        </div>
      )}

      <div class="card pad col gap12">
        {x.kind === 'bnpl' && (
          <Field label={t('debt.provider')}>
            <div class="chips">
              {(['tabby', 'tamara', 'tasaheel', 'other'] as BnplProvider[]).map((p) => (
                <button class={'chip solid' + (x.provider === p ? ' on' : '')} onClick={() => set({ provider: p })}>{t(('prov.' + p) as 'prov.tabby')}</button>
              ))}
            </div>
          </Field>
        )}
        <Field label={x.kind === 'bnpl' ? t('debt.for') : t('name')}>
          <input class="input" value={x.name} onInput={(e) => set({ name: (e.target as HTMLInputElement).value })} />
        </Field>
        <div class="grid2">
          <Field label={t('debt.principal')}><NumInput value={x.principal || undefined} onInput={setPrincipal} /></Field>
          <Field label={t('debt.opening')}><NumInput value={rem} onInput={setRem} /></Field>
        </div>

        {(x.kind === 'bnpl' || x.kind === 'loan') && (
          <>
            <div class="grid2">
              <Field label={t('debt.installments')}>
                <NumInput value={x.installmentsTotal} onInput={(v) => {
                  const n = Math.max(1, Math.round(v || 1));
                  set({ installmentsTotal: n, installment: x.kind === 'bnpl' && x.principal ? Math.round((x.principal / n) * 100) / 100 : x.installment });
                }} />
              </Field>
              <Field label={t('debt.installment')}><NumInput value={x.installment} onInput={(v) => set({ installment: v || undefined })} /></Field>
            </div>
            {x.kind === 'bnpl' ? (
              <div class="grid2">
                <Field label={t('debt.nextDue')}><input class="input n" type="date" value={x.startDate ?? ''} onInput={(e) => set({ startDate: (e.target as HTMLInputElement).value })} /></Field>
                <Field label={t('debt.frequency')}>
                  <select class="select" value={x.frequency ?? 'monthly'} onChange={(e) => set({ frequency: (e.target as HTMLSelectElement).value as 'monthly' | 'biweekly' })}>
                    <option value="monthly">{t('freq.monthly')}</option>
                    <option value="biweekly">{t('freq.biweekly')}</option>
                  </select>
                </Field>
              </div>
            ) : (
              <div class="grid2">
                <Field label={t('debt.dueDay')}><NumInput value={x.dueDay} onInput={(v) => set({ dueDay: v ? Math.min(31, Math.max(1, Math.round(v))) : undefined })} /></Field>
                <Field label={t('debt.rate')}><NumInput value={x.annualRate} onInput={(v) => set({ annualRate: v || undefined })} placeholder="0" /></Field>
              </div>
            )}
            {x.kind === 'bnpl' && x.startDate && existing === undefined && <span class="xs faint">{t('tx.bnplNote')}</span>}
          </>
        )}

        {x.kind === 'person' && (
          <>
            <div class="grid2">
              <Field label={t('debt.monthly')}><NumInput value={x.monthly} onInput={(v) => set({ monthly: v || undefined })} placeholder={t('optional')} /></Field>
              <Field label={t('debt.dueDay')}><NumInput value={x.dueDay} onInput={(v) => set({ dueDay: v ? Math.min(31, Math.max(1, Math.round(v))) : undefined })} placeholder={String(d.settings.payday)} /></Field>
            </div>
            <Field label={t('debt.agreement')}><input class="input" value={x.person?.agreement ?? ''} onInput={(e) => setPerson({ agreement: (e.target as HTMLInputElement).value })} /></Field>
          </>
        )}
        <Field label={t('note')}><input class="input" value={x.note ?? ''} onInput={(e) => set({ note: (e.target as HTMLInputElement).value || undefined })} /></Field>
      </div>

      <div class="row-flex">
        {existing && <button class="btn danger" onClick={del} aria-label={t('delete')}><Icon name="trash" size={18} /></button>}
        <button class="btn grow" onClick={save}>{t('save')}</button>
      </div>
    </div>
  );
}
