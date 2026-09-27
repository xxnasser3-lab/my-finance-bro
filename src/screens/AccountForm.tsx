import { useState } from 'preact/hooks';
import { t, getLang } from '../i18n';
import { getData, uid, update, upsert } from '../store/store';
import type { Account, AccountKind, CreditPolicy } from '../store/types';
import { Icon, Chev } from '../components/Icon';
import { TopBar, Seg, Field, NumInput, toast, confirmDo } from '../components/ui';
import { CardViz, SKINS, NETWORKS, BANKS_AR, BANKS_EN } from '../components/CardViz';
import { readImage, pickFile } from '../components/image';
import { goBack, navigate } from '../router';
import { balance } from '../logic/finance';

const defaultPolicy: CreditPolicy = { limit: 10000, monthlyRate: 2.25, minPercent: 5, minAmount: 300, statementDay: 15, dueDays: 25, lateFee: 100 };

export function AccountForm({ id, kind }: { id?: string; kind?: AccountKind }) {
  const d = getData();
  const existing = id ? d.accounts.find((a) => a.id === id) : undefined;
  const [a, setA] = useState<Account>(
    existing
      ? structuredClone(existing)
      : { id: uid(), kind: kind ?? 'bank', name: '', network: kind === 'credit' ? 'visa' : 'mada', skin: kind === 'credit' ? 0 : 1, opening: 0, secrets: {}, credit: kind === 'credit' ? defaultPolicy : undefined, createdAt: new Date().toISOString() }
  );
  const hasSecrets = !!existing && Object.values(existing.secrets).some(Boolean);
  // editing: show the current balance, and shift `opening` by the difference on save
  const current = existing ? balance(d, existing) : a.opening;
  const [bal, setBal] = useState<number>(current);
  const set = (patch: Partial<Account>) => setA((x) => ({ ...x, ...patch }));
  const setSecret = (k: keyof Account['secrets'], v: string) => setA((x) => ({ ...x, secrets: { ...x.secrets, [k]: v || undefined } }));
  const setPolicy = (patch: Partial<CreditPolicy>) => setA((x) => ({ ...x, credit: { ...(x.credit ?? defaultPolicy), ...patch } }));
  const banks = getLang() === 'ar' ? BANKS_AR : BANKS_EN;

  const save = () => {
    const name = a.name.trim() || (a.bank ? a.bank + ' · ' + t(('kind.' + a.kind) as 'kind.bank') : t(('kind.' + a.kind) as 'kind.bank'));
    const opening = (a.opening ?? 0) + ((Number.isNaN(bal) ? 0 : bal) - current);
    const acc: Account = { ...a, name, opening, credit: a.kind === 'credit' ? a.credit ?? defaultPolicy : undefined, last4: a.last4 || (a.secrets.number ? a.secrets.number.replace(/\s/g, '').slice(-4) : undefined) };
    update((x) => ({ ...x, accounts: upsert(x.accounts, acc) }));
    toast(t('done'));
    if (existing) goBack(`/account/${acc.id}`);
    else navigate(`/account/${acc.id}`, true);
  };

  const archive = () => {
    if (!existing || !confirmDo(t('confirmDelete'))) return;
    const used = d.txs.some((x) => x.accountId === a.id || x.toAccountId === a.id);
    update((x) => ({ ...x, accounts: used ? upsert(x.accounts, { ...a, archived: true }) : x.accounts.filter((y) => y.id !== a.id) }));
    navigate('/wallet', true);
  };

  const photo = async () => {
    const f = await pickFile('image/*');
    if (f) set({ photo: await readImage(f, 700) });
  };

  const p = a.credit ?? defaultPolicy;
  const kinds: [AccountKind, string][] = [['bank', t('kindS.bank')], ['credit', t('kindS.credit')], ['wallet', t('kindS.wallet')], ['cash', t('kind.cash')]];

  return (
    <div class="screen no-nav">
      <TopBar back title={existing ? t('acc.editTitle') : t('acc.new')} fallback="/wallet" />
      <CardViz acc={{ ...a, name: a.name || t(('kind.' + a.kind) as 'kind.bank') }} balance={Number.isNaN(bal) ? 0 : bal} height={176} />

      <Seg<AccountKind> value={a.kind} options={kinds} onChange={(k) => set({ kind: k, network: k === 'credit' ? 'visa' : k === 'bank' ? 'mada' : 'none', credit: k === 'credit' ? a.credit ?? defaultPolicy : a.credit })} />

      <div class="card pad col gap12">
        {(a.kind === 'bank' || a.kind === 'credit') && (
          <Field label={t('acc.bank')}>
            <div class="chips">
              {banks.map((b) => (
                <button type="button" class={'chip solid' + (a.bank === b ? ' on' : '')} onClick={() => set({ bank: a.bank === b ? undefined : b })}>{b}</button>
              ))}
            </div>
          </Field>
        )}
        <Field label={t('name')}>
          <input class="input" value={a.name} placeholder={a.kind === 'credit' ? 'Platinum' : ''} onInput={(e) => set({ name: (e.target as HTMLInputElement).value })} />
        </Field>
        <div class="grid2">
          <Field label={a.kind === 'credit' ? t('acc.openingCredit') : t('acc.opening')}>
            <NumInput value={bal} onInput={setBal} />
          </Field>
          <Field label={t('acc.last4')}>
            <input class="input num" inputMode="numeric" maxLength={4} value={a.last4 ?? ''} onInput={(e) => set({ last4: (e.target as HTMLInputElement).value.replace(/\D/g, '') })} />
          </Field>
        </div>
        {a.kind !== 'cash' && (
          <Field label={t('acc.network')}>
            <div class="chips">
              {NETWORKS.map(([k, label]) => (
                <button type="button" class={'chip' + (a.network === k ? ' on' : '')} onClick={() => set({ network: k })}><span class="n">{label}</span></button>
              ))}
            </div>
          </Field>
        )}
        <Field label={t('acc.skin')}>
          <div class="row-flex" style="flex-wrap:wrap;gap:8px">
            {SKINS.map((s, i) => (
              <button type="button" aria-label={'skin ' + (i + 1)} onClick={() => set({ skin: i })} style={{ width: '40px', height: '26px', borderRadius: '6px', padding: 0, background: s.bg, border: '2px solid ' + (a.skin === i && !a.photo ? '#F5EEE6' : 'transparent') }} />
            ))}
            <span class="grow" />
            {a.photo ? (
              <button type="button" class="btn sm outline" style="height:30px;font-size:11px" onClick={() => set({ photo: undefined })}>{t('acc.removePhoto')}</button>
            ) : (
              <button type="button" class="btn sm outline" style="height:30px;font-size:11px;border-style:dashed" onClick={photo}><Icon name="camera" size={14} />{t('acc.photo')}</button>
            )}
          </div>
        </Field>
      </div>

      {/* Card numbers are optional: collapsed unless already filled in */}
      <details class="card pad-x" open={hasSecrets}>
        <summary>
          <span class="sum-title col gap4">
            <span>{t('acc.secretsOpt')}</span>
            <span class="xs faint" style="font-weight:400;line-height:1.6">{t('acc.secretsWhy')}</span>
          </span>
          <Chev dir="down" />
        </summary>
        <div class="col gap12" style="padding-bottom:16px">
        <Field label={t('acc.holder')}><input class="input" dir="ltr" autoComplete="off" value={a.secrets.holder ?? ''} onInput={(e) => setSecret('holder', (e.target as HTMLInputElement).value)} /></Field>
        {a.kind !== 'cash' && (
          <>
            <Field label={t('acc.number')}><input class="input num" inputMode="numeric" autoComplete="off" value={a.secrets.number ?? ''} onInput={(e) => setSecret('number', (e.target as HTMLInputElement).value)} /></Field>
            <div class="grid2">
              <Field label={t('acc.expiry')}><input class="input num" placeholder="MM/YY" autoComplete="off" value={a.secrets.expiry ?? ''} onInput={(e) => setSecret('expiry', (e.target as HTMLInputElement).value)} /></Field>
              <Field label={t('acc.cvv')}><input class="input num" inputMode="numeric" maxLength={4} autoComplete="off" value={a.secrets.cvv ?? ''} onInput={(e) => setSecret('cvv', (e.target as HTMLInputElement).value)} /></Field>
            </div>
            <Field label={t('acc.iban')}><input class="input num" autoComplete="off" value={a.secrets.iban ?? ''} onInput={(e) => setSecret('iban', (e.target as HTMLInputElement).value.toUpperCase())} /></Field>
            <Field label={t('acc.accNumber')}><input class="input num" inputMode="numeric" autoComplete="off" value={a.secrets.accountNumber ?? ''} onInput={(e) => setSecret('accountNumber', (e.target as HTMLInputElement).value)} /></Field>
          </>
        )}
        <Field label={t('note')}><input class="input" value={a.secrets.notes ?? ''} onInput={(e) => setSecret('notes', (e.target as HTMLInputElement).value)} /></Field>
        <span class="xs faint" style="line-height:1.7">{t('acc.secureNote')}</span>
        </div>
      </details>

      {a.kind === 'credit' && (
        <div class="card pad col gap12">
          <span class="semi">{t('acc.policy')}</span>
          <div class="grid2">
            <Field label={t('acc.limit')}><NumInput value={p.limit} onInput={(v) => setPolicy({ limit: v || 0 })} /></Field>
            <Field label={t('acc.rate')}><NumInput value={p.monthlyRate} onInput={(v) => setPolicy({ monthlyRate: v || 0 })} /></Field>
            <Field label={t('acc.minPct')}><NumInput value={p.minPercent} onInput={(v) => setPolicy({ minPercent: v || 0 })} /></Field>
            <Field label={t('acc.minAmt')}><NumInput value={p.minAmount} onInput={(v) => setPolicy({ minAmount: v || 0 })} /></Field>
            <Field label={t('acc.statementDay')}><NumInput value={p.statementDay} onInput={(v) => setPolicy({ statementDay: Math.min(31, Math.max(1, Math.round(v || 1))) })} /></Field>
            <Field label={t('acc.dueDays')}><NumInput value={p.dueDays} onInput={(v) => setPolicy({ dueDays: Math.max(0, Math.round(v || 0)) })} /></Field>
          </div>
          <span class="xs faint" style="line-height:1.6">{t('acc.policyHint')}</span>
          <details>
            <summary><span class="sum-title small">{t('acc.policyMore')}</span><Chev dir="down" /></summary>
            <div class="col gap12">
          <div class="grid2">
            <Field label={t('acc.lateFee')}><NumInput value={p.lateFee} onInput={(v) => setPolicy({ lateFee: v })} /></Field>
            <Field label={t('acc.cashback')}><input class="input" value={p.cashback ?? ''} onInput={(e) => setPolicy({ cashback: (e.target as HTMLInputElement).value })} /></Field>
          </div>
          <Field label={t('acc.cashFee')}><input class="input" value={p.cashFee ?? ''} onInput={(e) => setPolicy({ cashFee: (e.target as HTMLInputElement).value })} /></Field>
          <Field label={t('acc.annualFee')}><input class="input" value={p.annualFee ?? ''} onInput={(e) => setPolicy({ annualFee: (e.target as HTMLInputElement).value })} /></Field>
          <Field label={t('acc.grace')}><input class="input" value={p.graceNote ?? ''} onInput={(e) => setPolicy({ graceNote: (e.target as HTMLInputElement).value })} /></Field>
            </div>
          </details>
        </div>
      )}

      <div class="row-flex">
        {existing && <button class="btn danger" onClick={archive} aria-label={t('delete')}><Icon name="trash" size={18} /></button>}
        <button class="btn grow" onClick={save}>{t('save')}</button>
      </div>
    </div>
  );
}
