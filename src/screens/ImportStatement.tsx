import { useState } from 'preact/hooks';
import { t, fmtDay } from '../i18n';
import { getData, update, uid, upsert } from '../store/store';
import { txEffect, round2 } from '../logic/finance';
import type { Account, Debt, InstallmentPlan, Tx } from '../store/types';
import { Icon } from '../components/Icon';
import { TopBar, Field, Money, toast, Collapse, catName } from '../components/ui';
import {
  loadPdfPages, parseAlRajhiCardStatement, toAccountPatch, toInstallmentPlans, toTxProposals,
  type ParsedCardStatement, type TxProposal
} from '../logic/statementImport';
import { parseQuickImport, type QuickImportResult } from '../logic/quickImport';
import { pickFile } from '../components/image';

type Stage = 'idle' | 'busy' | { parsed: ParsedCardStatement } | { quick: QuickImportResult } | { error: string };

const CAT_OPTIONS = ['c-shop', 'c-subs', 'c-food-rest', 'c-food-deliv', 'c-groc', 'c-fuel-gas', 'c-fun', 'c-health', 'c-bills', 'c-other'];

function mergePlans(existing: InstallmentPlan[] | undefined, incoming: Omit<InstallmentPlan, 'id'>[]): InstallmentPlan[] {
  const list = existing ? [...existing] : [];
  for (const p of incoming) {
    const i = list.findIndex((x) => x.merchant === p.merchant && Math.abs(x.principal - p.principal) < 1);
    if (i >= 0) list[i] = { ...list[i], ...p };
    else list.push({ ...p, id: uid() });
  }
  return list;
}

export function ImportStatement() {
  const d = getData();
  const [stage, setStage] = useState<Stage>('idle');
  const [proposals, setProposals] = useState<TxProposal[]>([]);
  const [targetId, setTargetId] = useState<string>('');
  const [newName, setNewName] = useState('');
  const [fundingId, setFundingId] = useState<string | undefined>(d.settings.salaryAccountId);
  const [done, setDone] = useState(false);
  const [quickLoans, setQuickLoans] = useState<(Debt & { include: boolean })[]>([]);
  const [quickCards, setQuickCards] = useState<(Account & { include: boolean })[]>([]);

  const creditAccounts = d.accounts.filter((a) => a.kind === 'credit' && !a.archived);
  const liquidAccounts = d.accounts.filter((a) => a.kind !== 'credit' && !a.archived);

  const choose = async () => {
    const f = await pickFile('application/pdf,.pdf,application/json,.json');
    if (!f) return;
    setStage('busy');
    const isJson = f.type === 'application/json' || f.name.toLowerCase().endsWith('.json');
    try {
      if (isJson) {
        const result = parseQuickImport(await f.text());
        if (result.loans.length === 0 && result.cards.length === 0) return setStage({ error: 'read-failed' });
        setStage({ quick: result });
        setQuickLoans(result.loans.map((l) => ({ ...l, include: true })));
        setQuickCards(result.cards.map((c) => ({ ...c, include: true })));
        return;
      }
      const pages = await loadPdfPages(f);
      const parsed = parseAlRajhiCardStatement(pages);
      if ('error' in parsed) return setStage({ error: parsed.error });
      setStage({ parsed });
      setProposals(toTxProposals(parsed, 'pending'));
      const match = d.accounts.find((a) => a.kind === 'credit' && a.last4 === parsed.card.last4);
      setTargetId(match?.id ?? 'new');
      setNewName(parsed.card.name);
    } catch {
      setStage({ error: 'read-failed' });
    }
  };

  const commitQuick = () => {
    const loans = quickLoans.filter((l) => l.include).map(({ include, ...rest }) => rest);
    const cards = quickCards.filter((c) => c.include).map(({ include, ...rest }) => rest);
    update((x) => ({
      ...x,
      debts: loans.reduce((list, l) => upsert(list, l), x.debts),
      accounts: cards.reduce((list, c) => upsert(list, c), x.accounts)
    }));
    setDone(true);
    toast(t('done'));
  };

  if (stage === 'idle' || stage === 'busy') {
    return (
      <div class="screen no-nav">
        <TopBar back title={t('imp.title')} fallback="/settings" />
        <span class="small text2" style="line-height:1.8">{t('imp.intro')}</span>
        <button class="card pad col gap10" style="align-items:center;border-style:dashed;color:var(--muted)" onClick={choose} disabled={stage === 'busy'}>
          <Icon name="upload" size={28} />
          <span class="semi" style="color:var(--text)">{stage === 'busy' ? '…' : t('imp.choose')}</span>
          <span class="xs faint">{t('imp.supported')}</span>
        </button>
        <span class="xs faint" style="line-height:1.7">{t('imp.privacy')}</span>
      </div>
    );
  }
  if ('error' in stage) {
    return (
      <div class="screen no-nav">
        <TopBar back title={t('imp.title')} fallback="/settings" />
        <div class="card pad col gap8" style="align-items:center;padding:28px">
          <Icon name="alert" size={28} />
          <span class="semi">{t('imp.notRecognized')}</span>
          <span class="xs faint center" style="line-height:1.7">{t('imp.notRecognizedSub')}</span>
        </div>
        <button class="btn outline" onClick={() => setStage('idle')}>{t('imp.tryAgain')}</button>
      </div>
    );
  }

  if ('quick' in stage) {
    if (done) {
      const firstLoan = quickLoans.find((l) => l.include);
      const firstCard = quickCards.find((c) => c.include);
      const href = firstLoan ? '/debt/' + firstLoan.id : firstCard ? '/account/' + firstCard.id : '/debts';
      return (
        <div class="screen no-nav">
          <TopBar back title={t('imp.title')} fallback="/settings" />
          <div class="card pad col gap10" style="align-items:center;padding:28px">
            <Icon name="check" size={30} />
            <span class="semi">{t('imp.doneTitle')}</span>
          </div>
          <div class="grid2">
            <a href={'#' + href} class="btn outline">{t('imp.viewItem')}</a>
            <button class="btn" onClick={() => { setStage('idle'); setDone(false); }}>{t('imp.importMore')}</button>
          </div>
        </div>
      );
    }
    const setLoan = (id: string, patchL: Partial<Debt> & { include?: boolean }) => setQuickLoans((list) => list.map((l) => (l.id === id ? { ...l, ...patchL } : l)));
    const setCard = (id: string, patchC: Partial<Account> & { include?: boolean }) => setQuickCards((list) => list.map((c) => (c.id === id ? { ...c, ...patchC } : c)));
    return (
      <div class="screen no-nav">
        <TopBar back title={t('imp.title')} fallback="/settings" />
        {stage.quick.errors.length > 0 && (
          <div class="row-flex small" style="align-items:flex-start;padding:11px 12px;border-radius:12px;background:var(--accent-soft);color:var(--accent-text);line-height:1.6">
            <Icon name="alert" size={16} />
            <span>{t('imp.warnings', { n: stage.quick.errors.length })}</span>
          </div>
        )}
        {quickLoans.length > 0 && (
          <Collapse open title={t('imp.loans')} right={<span class="xs faint n">{quickLoans.filter((l) => l.include).length}</span>}>
            {quickLoans.map((l) => (
              <div class="row" style={{ opacity: l.include ? 1 : 0.45 }}>
                <input type="checkbox" checked={l.include} onChange={(e) => setLoan(l.id, { include: (e.target as HTMLInputElement).checked })} style="width:18px;height:18px;flex-shrink:0" />
                <span class="grow col gap4" style="min-width:0">
                  <input class="input" style="height:32px;font-size:13px" value={l.name} onInput={(e) => setLoan(l.id, { name: (e.target as HTMLInputElement).value })} />
                  {l.installmentsTotal && l.installment ? <span class="xs faint">{t('imp.paidOf', { p: Math.max(0, Math.round((l.principal - l.opening) / l.installment)), t: l.installmentsTotal })}</span> : null}
                </span>
                <Money v={l.opening} class="bold" />
              </div>
            ))}
          </Collapse>
        )}
        {quickCards.length > 0 && (
          <Collapse open title={t('imp.cards')} right={<span class="xs faint n">{quickCards.filter((c) => c.include).length}</span>}>
            {quickCards.map((c) => (
              <div class="row" style={{ opacity: c.include ? 1 : 0.45 }}>
                <input type="checkbox" checked={c.include} onChange={(e) => setCard(c.id, { include: (e.target as HTMLInputElement).checked })} style="width:18px;height:18px;flex-shrink:0" />
                <span class="grow col gap4" style="min-width:0">
                  <input class="input" style="height:32px;font-size:13px" value={c.name} onInput={(e) => setCard(c.id, { name: (e.target as HTMLInputElement).value })} />
                  <span class="xs faint">{c.last4 ? '•• ' + c.last4 : ''}</span>
                </span>
                <Money v={c.opening} class="bold" />
              </div>
            ))}
          </Collapse>
        )}
        <button class="btn" onClick={commitQuick}>{t('imp.commit')}</button>
        <span class="xs faint" style="line-height:1.7;padding:0 4px">{t('imp.commitNote')}</span>
      </div>
    );
  }

  const { parsed } = stage;
  const patch = toAccountPatch(parsed);
  const target = targetId === 'new' ? undefined : d.accounts.find((a) => a.id === targetId);
  const paymentsNeedFunding = proposals.some((p) => p.needsFundingAccount && p.include);
  const totalOut = proposals.filter((p) => p.include && p.tx.type === 'expense').reduce((s, p) => s + p.tx.amount, 0);
  const totalIn = proposals.filter((p) => p.include && p.tx.type !== 'expense').reduce((s, p) => s + p.tx.amount, 0);

  const setProp = (id: string, patchP: Partial<TxProposal['tx']> & { include?: boolean }) => {
    setProposals((list) => list.map((p) => (p.id === id ? { ...p, include: patchP.include ?? p.include, tx: { ...p.tx, ...patchP } } : p)));
  };

  const commit = () => {
    if (paymentsNeedFunding && !fundingId) return toast(t('imp.pickFunding'));
    let acc: Account;
    const isNew = !target;
    const accId = target?.id ?? uid();
    if (target) {
      acc = { ...target, credit: { ...target.credit!, limit: patch.credit.limit || target.credit!.limit, cashLimit: patch.credit.cashLimit ?? target.credit!.cashLimit } };
    } else {
      acc = {
        id: accId, kind: 'credit', name: newName.trim() || patch.cardNameGuess, bank: 'Al Rajhi', network: patch.network, skin: 0,
        last4: patch.last4, opening: 0, secrets: {},
        credit: { limit: patch.credit.limit, cashLimit: patch.credit.cashLimit, monthlyRate: 2.25, minPercent: 5, minAmount: 100, statementDay: 1, dueDays: 24 },
        createdAt: new Date().toISOString()
      };
    }
    const included = proposals.filter((p) => p.include);
    const txs: Tx[] = included.map((p) => ({
      ...p.tx,
      id: p.id,
      accountId: p.tx.type === 'transfer' ? fundingId : accId,
      toAccountId: p.tx.type === 'transfer' ? accId : undefined,
      createdAt: p.tx.createdAt ?? new Date().toISOString()
    }));
    if (isNew) {
      // brand-new account: back-solve the opening balance so it lands exactly on the
      // statement's own closing balance once these transactions are applied
      const net = txs.reduce((s, tx) => s + txEffect(acc, tx), 0);
      acc.opening = round2(patch.closingBalance - net);
    }
    acc.installmentPlans = mergePlans(acc.installmentPlans, toInstallmentPlans(parsed));
    update((x) => ({ ...x, accounts: upsert(x.accounts, acc), txs: txs.reduce((list, tx) => upsert(list, tx), x.txs) }));
    setDone(true);
    toast(t('done'));
  };

  if (done) {
    return (
      <div class="screen no-nav">
        <TopBar back title={t('imp.title')} fallback="/settings" />
        <div class="card pad col gap10" style="align-items:center;padding:28px">
          <Icon name="check" size={30} />
          <span class="semi">{t('imp.doneTitle')}</span>
        </div>
        <div class="grid2">
          <a href={'#/account/' + (target?.id ?? d.accounts.find((a) => a.last4 === patch.last4)?.id ?? '')} class="btn outline">{t('imp.viewAccount')}</a>
          <button class="btn" onClick={() => { setStage('idle'); setDone(false); }}>{t('imp.importAnother')}</button>
        </div>
      </div>
    );
  }

  return (
    <div class="screen no-nav">
      <TopBar back title={t('imp.title')} fallback="/settings" />

      <div class="card pad col gap10">
        <div class="between"><span class="h2">{patch.cardNameGuess}</span><span class="n xs faint">•••• {patch.last4}</span></div>
        <div class="grid2">
          <div class="tile"><span class="xs muted">{t('imp.closing')}</span><Money v={patch.closingBalance} class="bold" /></div>
          <div class="tile"><span class="xs muted">{t('acc.limit')}</span><Money v={patch.credit.limit} class="bold" /></div>
          <div class="tile"><span class="xs muted">{t('imp.minDue')}</span><Money v={patch.minimumDue} class="bold" /></div>
          <div class="tile"><span class="xs muted">{t('imp.totalDue')}</span><Money v={patch.totalDue} class="bold" /></div>
        </div>
        {patch.dueDate && <span class="xs faint">{t('acc.due')}: {fmtDay(patch.dueDate, true)}</span>}
      </div>

      <div class="card pad col gap10">
        <span class="semi">{t('imp.target')}</span>
        <select class="select" value={targetId} onChange={(e) => setTargetId((e.target as HTMLSelectElement).value)}>
          <option value="new">{t('imp.newAccount')}</option>
          {creditAccounts.map((a) => <option value={a.id}>{a.name} {a.last4 ? '•• ' + a.last4 : ''}</option>)}
        </select>
        {targetId === 'new' && <Field label={t('name')}><input class="input" value={newName} onInput={(e) => setNewName((e.target as HTMLInputElement).value)} /></Field>}
        {target && <span class="xs faint" style="line-height:1.6">{t('imp.existingNote')}</span>}
      </div>

      {paymentsNeedFunding && (
        <div class="card pad col gap10" style="border-color:var(--accent-line)">
          <span class="semi">{t('imp.fundingQ')}</span>
          <select class="select" value={fundingId ?? ''} onChange={(e) => setFundingId((e.target as HTMLSelectElement).value || undefined)}>
            <option value="">—</option>
            {liquidAccounts.map((a) => <option value={a.id}>{a.name}</option>)}
          </select>
          <span class="xs faint" style="line-height:1.6">{t('imp.fundingHint')}</span>
        </div>
      )}

      <Collapse open title={t('imp.transactions')} right={<span class="xs faint n">{proposals.filter((p) => p.include).length}</span>}>
        <div class="between small" style="padding:8px 0"><span class="text2">{t('imp.out')} <Money v={totalOut} class="semi" /></span><span class="text2">{t('imp.in')} <Money v={totalIn} class="semi" /></span></div>
        {proposals.map((p) => (
          <div class="row" style={{ opacity: p.include ? 1 : 0.45 }}>
            <input type="checkbox" checked={p.include} onChange={(e) => setProp(p.id, { include: (e.target as HTMLInputElement).checked })} style="width:18px;height:18px;flex-shrink:0" />
            <span class="grow col gap4" style="min-width:0">
              <span class="semi ellipsis" style="font-size:13.5px">{p.tx.note || t(('impKind.' + p.kind) as 'impKind.purchase')}</span>
              <span class="xs faint">{p.tx.date}</span>
              {p.tx.type === 'expense' && (
                <select class="select" style="height:32px;font-size:11.5px;margin-top:2px" value={p.tx.categoryId ?? 'c-other'} onChange={(e) => setProp(p.id, { categoryId: (e.target as HTMLSelectElement).value })}>
                  {CAT_OPTIONS.map((cid) => <option value={cid}>{catName(d.categories.find((c) => c.id === cid))}</option>)}
                </select>
              )}
            </span>
            <Money v={p.tx.amount} class={'bold' + (p.tx.type === 'expense' ? '' : ' pos')} />
          </div>
        ))}
      </Collapse>

      {parsed.installmentPlans.length > 0 && (
        <Collapse title={t('imp.plans')} right={<span class="xs faint n">{parsed.installmentPlans.length}</span>}>
          {parsed.installmentPlans.map((p) => (
            <div class="row small">
              <span class="grow col gap4"><span class="semi ellipsis">{p.merchant || t('imp.plan')}</span><span class="xs faint">{t('imp.paidOf', { p: p.paidInstallments, t: p.totalInstallments })}{p.totalInstallments > 3 ? ' · ' + t('imp.hasMurabaha') : ''}</span></span>
              <Money v={p.remainingAmount} class="semi" />
            </div>
          ))}
        </Collapse>
      )}

      {parsed.warnings.length > 0 && (
        <div class="row-flex small" style="align-items:flex-start;padding:11px 12px;border-radius:12px;background:var(--accent-soft);color:var(--accent-text);line-height:1.6">
          <Icon name="alert" size={16} />
          <span>{t('imp.warnings', { n: parsed.warnings.length })}</span>
        </div>
      )}

      <button class="btn" onClick={commit}>{t('imp.commit')}</button>
      <span class="xs faint" style="line-height:1.7;padding:0 4px">{t('imp.commitNote')}</span>
    </div>
  );
}
