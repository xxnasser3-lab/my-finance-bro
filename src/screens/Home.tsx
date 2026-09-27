import { t, fmtDay, dayName } from '../i18n';
import { useData, update } from '../store/store';
import { Avatar } from '../components/Avatar';
import { Icon, Chev } from '../components/Icon';
import { Money, fmt, Collapse, Bar } from '../components/ui';
import { LineChart } from '../components/charts';
import { TxRow } from '../components/TxRow';
import { balance, budgetView, liquidAccounts, netWorth, simulate, totalLiquid, upcoming } from '../logic/finance';
import { addDays, diffDays, parseISO, today } from '../logic/dates';
import { SKINS } from '../components/CardViz';

export function Home() {
  const d = useData();
  const s = d.settings;
  const bv = budgetView(d);
  const plan = simulate(d, s.strategy);
  const up = upcoming(d, undefined, plan.firstMonth.perDebt);
  const recent = [...d.txs].sort((a, b) => (b.date + (b.time ?? '')).localeCompare(a.date + (a.time ?? ''))).slice(0, 5);
  const accs = liquidAccounts(d);
  const cyc = bv.cycle;
  const pace = Array.from({ length: cyc.days }, (_, i) => (bv.budget * (i + 1)) / cyc.days);
  const actual: (number | null)[] = Array.from({ length: cyc.days }, (_, i) => (i <= cyc.dayIndex ? bv.cumulative[i] : null));
  const forecast: (number | null)[] = Array.from({ length: cyc.days }, (_, i) =>
    i < cyc.dayIndex ? null : bv.cumulative[cyc.dayIndex] + ((bv.projected - bv.cumulative[cyc.dayIndex]) * (i - cyc.dayIndex)) / Math.max(1, cyc.days - 1 - cyc.dayIndex)
  );
  const over = bv.projected - bv.budget;
  const cutPerDay = over > 0 ? Math.ceil(over / Math.max(1, cyc.daysLeft)) : 0;
  const t0 = today();
  const wd = parseISO(t0).getDay();
  const bonusSoon = s.bonus.enabled && s.bonus.amount > 0 && diffDays(t0, s.bonus.nextDate) >= 0 && diffDays(t0, s.bonus.nextDate) <= 35;
  const backupAge = s.lastBackupAt ? diffDays(s.lastBackupAt.slice(0, 10), t0) : null;
  const hide = s.hideAmounts;

  return (
    <div class="screen page-glow">
      <div class="row-flex" style="gap:12px">
        <Avatar kind="ghutra" size={42} />
        <div class="grow col">
          <span class="small muted">{dayName(wd)}، {fmtDay(t0)}</span>
          <span style="font-size:16px;font-weight:600">{s.name ? t('home.hello', { name: s.name }) : t('appName')}</span>
        </div>
        <button class="icon-btn" aria-label={t('set.hide')} onClick={() => update((x) => ({ ...x, settings: { ...x.settings, hideAmounts: !hide } }))}>
          <Icon name={hide ? 'eyeOff' : 'eye'} size={19} stroke={1.7} />
        </button>
        <a class="icon-btn" href="#/settings" aria-label={t('set.title')}><Icon name="settings" size={19} stroke={1.7} /></a>
      </div>

      {backupAge !== null && backupAge >= 7 && (
        <a href="#/settings" class="card pad row-flex" style="padding:12px 14px;border-color:rgba(221,98,32,.35);background:rgba(221,98,32,.07);color:var(--text)">
          <Icon name="cloud" size={18} />
          <span class="grow small">{t('home.backup', { n: backupAge })}</span>
          <span class="link-btn">{t('home.backupNow')}</span>
        </a>
      )}

      <a href="#/wallet" class="card hero col gap14" style="padding:18px;color:var(--text)">
        <div class="between">
          <span class="small text2">{t('home.total')}</span>
          <span class="row-flex small semi" style="color:var(--accent-text);gap:4px">{t('nav.wallet')}<Chev dir="fwd" size={14} /></span>
        </div>
        <div class="row-flex" style="align-items:baseline;gap:8px">
          <span style="font-size:36px;letter-spacing:-0.02em;line-height:1"><Money v={totalLiquid(d)} decimals={2} class="bold" /></span>
          <span class="small muted">{t('cur')}</span>
        </div>
        {accs.length > 0 && (
          <div class="grid4" style="gap:6px">
            {accs.slice(0, 4).map((a) => (
              <div class="col gap6" style="padding:9px 8px;border-radius:11px;background:rgba(255,240,225,.04);border:1px solid #2e241d;min-width:0">
                <span class="row-flex xs text2" style="gap:5px"><span class="dot" style={{ background: SKINS[a.skin % SKINS.length].border }} /><span class="ellipsis">{a.bank ?? a.name}</span></span>
                <Money v={balance(d, a)} class="bold" />
              </div>
            ))}
          </div>
        )}
        <div class="between small muted" style="padding-top:12px;border-top:1px solid #2e241d">
          <span>{t('home.netWorth')}</span>
          <Money v={netWorth(d)} class="text2 semi" />
        </div>
      </a>

      <div class="card pad col gap12">
        <div class="between">
          <span class="small text2">{t('home.available')}</span>
          <span class="pill accent">{t('home.daysLeft', { n: cyc.daysLeft })}</span>
        </div>
        <div class="row-flex" style="align-items:baseline;gap:8px">
          <span style="font-size:30px;line-height:1"><Money v={bv.available} decimals={2} class={'bold' + (bv.available < 0 ? ' neg' : '')} /></span>
          <span class="xs muted">{t('cur')}</span>
        </div>
        <Bar pct={(bv.spentCycle / Math.max(1, bv.budget)) * 100} color={bv.spentCycle > bv.budget ? '#E5484D' : undefined} />
        <div class="grid3">
          <div class="col gap4"><span class="xs muted">{t('home.todayBudget')}</span><Money v={bv.todayBudget} class="bold" /></div>
          <div class="col gap4"><span class="xs muted">{t('home.spentToday')}</span><Money v={bv.spentToday} class="bold" /></div>
          <div class="col gap4"><span class="xs muted">{t('home.spentCycle')}</span><Money v={bv.spentCycle} class="bold" /></div>
        </div>
      </div>

      <div class="grid4">
        {[
          ['/reports', 'reports', t('qa.reports')],
          ['/bills', 'repeat', t('qa.bills')],
          ['/trips', 'plane', t('qa.trips')],
          ['/txs', 'list', t('qa.txs')]
        ].map(([href, icon, label]) => (
          <a href={'#' + href} class="tile" style="align-items:center;gap:7px;padding:12px 4px;color:#e9d8c4;font-size:11px;font-weight:600">
            <span style="color:var(--accent-text)"><Icon name={icon} size={22} stroke={1.7} /></span>
            {label}
          </a>
        ))}
      </div>

      <div class="card pad col gap12">
        <div class="between" style="align-items:flex-start">
          <div class="col gap4">
            <span class="h2">{t('home.chart')}</span>
            <span class="xs muted">{t('home.chartSub', { d: fmtDay(cyc.start) })}</span>
          </div>
          <a href="#/reports" class="xs semi">{t('more')}</a>
        </div>
        <div class="legend">
          <span><i style="width:14px;height:2px;background:#DD6220;display:inline-block" />{t('home.actual')}</span>
          <span><i style="width:14px;border-top:2px dashed #7A6A5E;display:inline-block" />{t('home.pace')}</span>
          <span><i style="width:14px;border-top:2px dotted #DD6220;display:inline-block" />{t('home.forecast')}</span>
        </div>
        <LineChart
          count={cyc.days}
          height={140}
          initial={cyc.dayIndex}
          series={[
            { values: pace, color: '#7A6A5E', width: 1.5, dash: '4 4', marker: false },
            { values: forecast, color: '#DD6220', width: 2, dash: '1 4', marker: false },
            { values: actual, color: '#DD6220', width: 2, fill: true }
          ]}
          xLabels={[fmtDay(cyc.start), fmtDay(addDays(cyc.start, Math.floor(cyc.days / 3))), fmtDay(addDays(cyc.start, Math.floor((2 * cyc.days) / 3))), fmtDay(cyc.end)]}
          tip={(i) => (
            <span>
              {fmtDay(addDays(cyc.start, i))} · {actual[i] !== null ? fmt(actual[i] as number) : '~' + fmt(forecast[i] ?? pace[i])}
            </span>
          )}
        />
        {bv.spentCycle > 0 && cyc.dayIndex >= 2 && !hide && (
          <div class="row-flex small" style={{ alignItems: 'flex-start', padding: '11px 12px', borderRadius: '12px', lineHeight: 1.7, color: '#e9d8c4', background: over > 0 ? 'rgba(221,98,32,.07)' : 'var(--green-soft)', border: '1px solid ' + (over > 0 ? 'rgba(221,98,32,.22)' : 'rgba(108,196,154,.25)') }}>
            <span style={{ color: over > 0 ? 'var(--accent-text)' : 'var(--green-text)', marginTop: '3px' }}><Icon name={over > 0 ? 'alert' : 'check'} size={17} /></span>
            <span>{over > 0 ? t('home.over', { v: fmt(bv.projected), o: fmt(over), d: fmt(cutPerDay) }) : t('home.under', { v: fmt(bv.projected), o: fmt(Math.max(0, -over)) })}</span>
          </div>
        )}
      </div>

      <Collapse title={t('home.upcoming')} open right={<span class="n small text2">{hide ? '••••' : fmt(up.reduce((a, u) => a + u.amount, 0))}</span>}>
        {up.length === 0 && <div class="empty">{t('home.noUpcoming')}</div>}
        {up.slice(0, 6).map((u) => {
          const days = diffDays(t0, u.date);
          const href = u.kind === 'card' ? `/account/${u.refId}` : u.kind === 'installment' || u.kind === 'person' ? `/debt/${u.refId}` : '/bills';
          return (
            <a class="row" href={'#' + href}>
              {u.kind === 'person' ? <Avatar kind={u.avatar ?? 'initial'} photo={u.photo} name={u.title} size={38} /> : <span class="ib"><Icon name={u.icon} size={18} /></span>}
              <span class="grow col gap4" style="min-width:0">
                <span class="semi ellipsis" style="font-size:14px">{u.title}</span>
                <span class="xs faint">{fmtDay(u.date, true)}{u.kind === 'card' && u.sub ? ' · ' + t('acc.min') + ' ' + fmt(+u.sub) : ''}</span>
              </span>
              <span class="col" style="align-items:flex-end;gap:4px">
                <Money v={u.amount} class="bold" />
                <span class={'pill' + (days <= s.remindDays ? ' accent' : '')}>{days === 0 ? t('today') : days + ' ' + t('days')}</span>
              </span>
            </a>
          );
        })}
      </Collapse>

      <Collapse title={t('home.recent')} open right={<a href="#/txs" class="xs semi" onClick={(e) => e.stopPropagation()}>{t('seeAll')}</a>}>
        {recent.length === 0 && <div class="empty">{t('empty')}</div>}
        {recent.map((tx) => <TxRow tx={tx} showDate={tx.date === t0 ? tx.time : fmtDay(tx.date)} />)}
      </Collapse>

      {bonusSoon && (
        <a href="#/plan" class="card warm row-flex" style="padding:14px 16px;gap:14px;color:var(--text)">
          <span class="icon-btn accent" style="width:42px;height:42px"><Icon name="gift" size={21} /></span>
          <span class="grow col gap4">
            <span class="semi" style="font-size:14px">{t('home.bonus', { d: fmtDay(s.bonus.nextDate) })}</span>
            <span class="small text2">{t('home.bonusSub')}</span>
          </span>
          <Chev dir="fwd" />
        </a>
      )}
    </div>
  );
}
