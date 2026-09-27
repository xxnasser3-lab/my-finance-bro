import { useEffect, useState } from 'preact/hooks';
import { t, fmtDay } from '../i18n';
import { useData } from '../store/store';
import { Icon } from '../components/Icon';
import { TopBar, Money, fmt } from '../components/ui';
import { LineChart } from '../components/charts';
import { loadPrices, portfolio, portfolioHistory, stalePricesDays, type PricesFile } from '../logic/investments';
import { navigate } from '../router';

const KIND_COLOR: Record<string, string> = { stock: '#5B8FD0', gold: '#E8B64C', other: '#8C7564' };

export function Investments() {
  const d = useData();
  const [prices, setPrices] = useState<PricesFile | null>(null);
  useEffect(() => {
    loadPrices().then(setPrices);
  }, []);
  if (!prices) return <div class="screen no-nav"><TopBar back title={t('inv.title')} /></div>;

  const p = portfolio(d, prices);
  const stale = stalePricesDays(prices);
  const hist = portfolioHistory(d, prices, 30);

  return (
    <div class="screen no-nav">
      <TopBar back title={t('inv.title')}>
        <button class="btn sm" onClick={() => navigate('/investment/new')}><Icon name="plus" size={16} stroke={2.4} />{t('inv.new')}</button>
      </TopBar>

      {p.rows.length === 0 ? (
        <button class="card pad col gap8" style="align-items:center;border-style:dashed;color:var(--muted)" onClick={() => navigate('/investment/new')}>
          <Icon name="up" size={28} />
          <span>{t('inv.addFirst')}</span>
        </button>
      ) : (
        <>
          <div class="card hero col gap14" style="padding:18px">
            <span class="small text2">{t('inv.value')}</span>
            <div class="row-flex" style="align-items:baseline;gap:8px">
              <span style="font-size:34px;line-height:1;letter-spacing:-.02em"><Money v={p.totalValue} class="bold" /></span>
              <span class="small muted">{t('cur')}</span>
            </div>
            <div class="between small">
              <span class="text2">{t('inv.cost')} <Money v={p.totalCost} class="semi" /></span>
              <span class={p.totalGain >= 0 ? 'pos' : 'neg'}>
                <Money v={p.totalGain} signed class="bold" /> ({p.totalGainPct >= 0 ? '+' : ''}{p.totalGainPct}%)
              </span>
            </div>
            {hist.length > 1 && (
              <LineChart
                count={hist.length}
                height={90}
                initial={hist.length - 1}
                series={[{ values: hist.map((h) => h.v), color: p.totalGain >= 0 ? '#6CC49A' : '#DD6220', fill: true }]}
                xLabels={[fmtDay(hist[0].date), fmtDay(hist[Math.floor(hist.length / 2)].date), fmtDay(hist[hist.length - 1].date)]}
                tip={(i) => <span>{fmtDay(hist[i].date)} · {fmt(hist[i].v)}</span>}
              />
            )}
            <span class="xs faint">{t('inv.chartSub', { n: hist.length })}</span>
          </div>

          {p.byKind.length > 1 && (
            <div class="bar tall" style="gap:2px">
              {p.byKind.map((k) => <div style={{ width: (k.value / Math.max(1, p.totalValue)) * 100 + '%', background: KIND_COLOR[k.kind], borderRadius: 0 }} />)}
            </div>
          )}

          <div class="card pad-x">
            {p.rows.map((r) => {
              const inv = r.holding.investment;
              const unit = t(('inv.units.' + inv.kind) as 'inv.units.stock');
              return (
                <a class="row" href={'#/investment/' + inv.id}>
                  <span class="ib" style={{ background: KIND_COLOR[inv.kind] + '22', borderColor: 'transparent', color: KIND_COLOR[inv.kind] }}>
                    <Icon name={inv.kind === 'gold' ? 'star' : inv.kind === 'stock' ? 'up' : 'dots'} size={18} />
                  </span>
                  <span class="grow col gap4" style="min-width:0">
                    <span class="semi ellipsis" style="font-size:14px">{inv.name}{inv.symbol ? <span class="xs faint"> · {inv.symbol}</span> : null}</span>
                    <span class="xs faint">{r.holding.quantity} {unit}{!r.hasPrice ? ' · ' + t('inv.noPrice') : ''}</span>
                  </span>
                  <span class="col" style="align-items:flex-end;gap:2px">
                    <Money v={r.value} class="bold" />
                    <span class={'xs ' + (r.gain >= 0 ? 'pos' : 'neg')}>{r.gain >= 0 ? '+' : ''}{r.gainPct}%</span>
                  </span>
                </a>
              );
            })}
          </div>
        </>
      )}

      <div class="row-flex small" style="align-items:flex-start;padding:12px 13px;border-radius:13px;line-height:1.7;color:var(--text-2);background:var(--surface);border:1px solid var(--line)">
        <Icon name="repeat" size={17} style="margin-top:2px;flex-shrink:0" />
        <span class="grow">
          {t('inv.autoNote')}<br />
          {prices.updatedAt ? (stale !== null && stale > 0 ? t('inv.stale', { n: stale }) : t('inv.updated') + ': ' + fmtDay(prices.updatedAt.slice(0, 10), false, true)) : t('inv.neverUpdated')}
        </span>
      </div>
    </div>
  );
}
