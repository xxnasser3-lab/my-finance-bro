import { useEffect, useState } from 'preact/hooks';
import { t, monthName } from '../i18n';
import { useData } from '../store/store';
import { Icon, Chev } from '../components/Icon';
import { Money, TopBar, Collapse } from '../components/ui';
import { CardViz, SKINS } from '../components/CardViz';
import { LineChart } from '../components/charts';
import { balance, balanceAt, creditAccounts, creditAvailable, liquidAccounts, sixMonths, totalLiquid } from '../logic/finance';
import { loadPrices, portfolio, type PricesFile } from '../logic/investments';
import { navigate } from '../router';
import { openTx } from '../sheets';
import { fmt } from '../components/ui';
import { today } from '../logic/dates';
import type { Account } from '../store/types';

export function Wallet() {
  const d = useData();
  const [prices, setPrices] = useState<PricesFile | null>(null);
  useEffect(() => {
    if (d.investments.length) loadPrices().then(setPrices);
  }, [d.investments.length]);
  const inv = prices ? portfolio(d, prices) : null;
  const liquid = liquidAccounts(d);
  const credit = creditAccounts(d);
  const months = sixMonths();
  const t0 = today();
  const history = months.map((m) => liquid.reduce((s, a) => s + balanceAt(d, a, m.end < t0 ? m.end : t0), 0));
  const groups: [string, Account[]][] = [
    [t('wallet.banks'), liquid.filter((a) => a.kind === 'bank')],
    [t('wallet.wallets'), liquid.filter((a) => a.kind === 'wallet' || a.kind === 'cash')],
    [t('wallet.credit'), credit]
  ];
  const all = [...liquid, ...credit];
  return (
    <div class="screen">
      <TopBar title={t('wallet.title')}>
        <button class="icon-btn" aria-label={t('wallet.transfer')} onClick={() => openTx({ type: 'transfer' })}><Icon name="transfer" size={19} stroke={1.7} /></button>
        <button class="btn sm" onClick={() => navigate('/account/new')}><Icon name="plus" size={16} stroke={2.4} />{t('wallet.add')}</button>
      </TopBar>

      <div class="card pad col gap14">
        <div class="grid2" style="gap:12px">
          <div class="col gap4"><span class="small muted">{t('wallet.total')}</span><span style="font-size:26px;line-height:1.1"><Money v={totalLiquid(d)} class="bold" /></span></div>
          <div class="col gap4"><span class="small muted">{t('wallet.creditAvail')}</span><span style="font-size:26px;line-height:1.1"><Money v={creditAvailable(d)} class="bold text2" /></span></div>
        </div>
        {liquid.length > 0 && (
          <div class="col gap6">
            <span class="xs muted">{t('wallet.history')}</span>
            <LineChart
              count={6}
              height={78}
              initial={5}
              series={[{ values: history, color: '#5B8FD0', fill: true }]}
              xLabels={months.map((m) => monthName(m.m0, true))}
              tip={(i) => <span>{monthName(months[i].m0)} · {fmt(history[i])}</span>}
            />
          </div>
        )}
      </div>

      {all.length > 0 && (
        <div class="hscroll">
          {all.map((a) => (
            <a href={'#/account/' + a.id} style="width:272px;flex-shrink:0">
              <CardViz acc={a} balance={balance(d, a)} height={166} />
            </a>
          ))}
        </div>
      )}

      {all.length === 0 && (
        <button class="card pad col gap8" style="align-items:center;border-style:dashed;color:var(--muted)" onClick={() => navigate('/account/new')}>
          <Icon name="card" size={28} />
          <span>{t('acc.new')}</span>
        </button>
      )}

      <a href="#/investments" class="card pad row-flex" style="gap:14px;color:var(--text)">
        <span class="ib" style="background:rgba(91,143,208,.14);border-color:transparent;color:#5B8FD0"><Icon name="up" size={19} /></span>
        <span class="grow col gap4">
          <span class="semi" style="font-size:14px">{t('inv.title')}</span>
          <span class="xs faint">{inv && inv.rows.length ? `${inv.rows.length} · ${inv.totalGainPct >= 0 ? '+' : ''}${inv.totalGainPct}%` : t('inv.noHoldings')}</span>
        </span>
        {inv && inv.rows.length > 0 ? <Money v={inv.totalValue} class="bold" /> : null}
        <Chev dir="fwd" size={16} />
      </a>

      {groups.map(([title, list]) =>
        list.length ? (
          <Collapse title={title} open right={<Money v={list.reduce((s, a) => s + balance(d, a), 0)} class={'small ' + (list[0].kind === 'credit' ? 'neg' : 'text2')} />}>
            {list.map((a) => (
              <a class="row" href={'#/account/' + a.id}>
                <span class="ib" style={{ background: SKINS[a.skin % SKINS.length].border, borderColor: 'transparent', color: '#fff' }}>
                  <Icon name={a.kind === 'cash' ? 'cash' : a.kind === 'wallet' ? 'phone' : a.kind === 'credit' ? 'card' : 'bank'} size={18} />
                </span>
                <span class="grow col gap4" style="min-width:0">
                  <span class="semi ellipsis" style="font-size:14px">{a.name}</span>
                  <span class="xs faint">{t(('kind.' + a.kind) as 'kind.bank')}{a.last4 ? ' · •• ' + a.last4 : ''}{d.settings.subscriptionsAccountId === a.id ? ' · ' + t('set.subsCard') : ''}</span>
                </span>
                <Money v={balance(d, a)} class={'bold' + (a.kind === 'credit' ? ' neg' : '')} />
              </a>
            ))}
          </Collapse>
        ) : null
      )}
    </div>
  );
}
