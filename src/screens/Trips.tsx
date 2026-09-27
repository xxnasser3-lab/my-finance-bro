import { useState } from 'preact/hooks';
import { t, fmtDay, dayName } from '../i18n';
import { useData, update, upsert, uid, removeById } from '../store/store';
import type { Trip } from '../store/types';
import { Icon } from '../components/Icon';
import { TopBar, Sheet, Field, NumInput, Money, Collapse, Bar, catName, fmt, toast, confirmDo, Empty } from '../components/ui';
import { BarChart, HBars } from '../components/charts';
import { TxRow } from '../components/TxRow';
import { catById, rootCat, tripSpent } from '../logic/finance';
import { addDays, diffDays, parseISO, today } from '../logic/dates';
import { navigate } from '../router';
import { openTx } from '../sheets';

function TripSheet({ item, onClose }: { item?: Trip; onClose: () => void }) {
  const [tr, setTr] = useState<Trip>(item ? { ...item } : { id: uid(), name: '', start: today(), end: addDays(today(), 3) });
  const set = (p: Partial<Trip>) => setTr((x) => ({ ...x, ...p }));
  const save = () => {
    if (!tr.name.trim()) return toast(t('name'));
    update((x) => ({ ...x, trips: upsert(x.trips, { ...tr, name: tr.name.trim() }) }));
    onClose();
    if (!item) navigate('/trip/' + tr.id);
  };
  const del = () => {
    if (!item || !confirmDo(t('confirmDelete'))) return;
    update((x) => ({ ...x, trips: removeById(x.trips, item.id), txs: x.txs.map((tx) => (tx.tripId === item.id ? { ...tx, tripId: undefined } : tx)) }));
    onClose();
    navigate('/trips', true);
  };
  return (
    <Sheet onClose={onClose} title={item ? item.name : t('trip.new')}>
      <Field label={t('name')}><input class="input" value={tr.name} onInput={(e) => set({ name: (e.target as HTMLInputElement).value })} /></Field>
      <div class="grid2">
        <Field label={t('trip.start')}><input class="input n" type="date" value={tr.start} onInput={(e) => set({ start: (e.target as HTMLInputElement).value })} /></Field>
        <Field label={t('trip.end')}><input class="input n" type="date" value={tr.end ?? ''} onInput={(e) => set({ end: (e.target as HTMLInputElement).value || undefined })} /></Field>
      </div>
      <Field label={t('trip.budget')}><NumInput value={tr.budget} onInput={(v) => set({ budget: v || undefined })} placeholder={t('optional')} /></Field>
      <div class="row-flex">
        {item && <button class="btn danger" onClick={del} aria-label={t('delete')}><Icon name="trash" size={18} /></button>}
        <button class="btn grow" onClick={save}>{t('save')}</button>
      </div>
    </Sheet>
  );
}

export function Trips() {
  const d = useData();
  const [edit, setEdit] = useState<Trip | null | undefined>(undefined);
  const trips = [...d.trips].sort((a, b) => b.start.localeCompare(a.start));
  const t0 = today();
  return (
    <div class="screen no-nav">
      <TopBar back title={t('trip.title')}>
        <button class="btn sm" onClick={() => setEdit(null)}><Icon name="plus" size={16} stroke={2.4} />{t('trip.new')}</button>
      </TopBar>
      {trips.length === 0 && <Empty />}
      {trips.map((tr) => {
        const spent = tripSpent(d, tr.id);
        const active = t0 >= tr.start && t0 <= (tr.end ?? tr.start);
        return (
          <a href={'#/trip/' + tr.id} class="card pad col gap10" style="color:var(--text)">
            <div class="between">
              <span class="col gap4"><span class="semi" style="font-size:15px">{tr.name}</span><span class="xs faint">{fmtDay(tr.start, false, true)}{tr.end ? ' – ' + fmtDay(tr.end) : ''}</span></span>
              <span class={'pill' + (active ? ' accent' : '')}>{active ? t('trip.active') : t('trip.ended')}</span>
            </div>
            <div class="between"><Money v={spent} class="bold" />{tr.budget ? <span class="xs muted">{t('trip.spent', { b: fmt(tr.budget) })}</span> : null}</div>
            {tr.budget ? <Bar pct={(spent / tr.budget) * 100} color={spent > tr.budget ? '#E5484D' : '#E8B64C'} /> : null}
          </a>
        );
      })}
      {edit !== undefined && <TripSheet item={edit ?? undefined} onClose={() => setEdit(undefined)} />}
    </div>
  );
}

export function TripDetail({ id }: { id: string }) {
  const d = useData();
  const [edit, setEdit] = useState(false);
  const tr = d.trips.find((x) => x.id === id);
  if (!tr) return <div class="screen no-nav"><TopBar back title="" fallback="/trips" /><Empty /></div>;
  const txs = d.txs.filter((x) => x.tripId === id && x.type === 'expense').sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? '')));
  const spent = tripSpent(d, id);
  const end = tr.end ?? txs[txs.length - 1]?.date ?? tr.start;
  const nDays = Math.max(1, diffDays(tr.start, end) + 1);
  const byDay = Array.from({ length: nDays }, (_, i) => txs.filter((x) => x.date === addDays(tr.start, i)).reduce((s, x) => s + x.amount, 0));
  const cats = new Map<string, number>();
  txs.forEach((x) => {
    const k = rootCat(d, x.categoryId)?.id ?? 'c-other';
    cats.set(k, (cats.get(k) ?? 0) + x.amount);
  });
  const catRows = [...cats.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: catName(catById(d, k)), v, sub: Math.round((v / Math.max(1, spent)) * 100) + '%', color: undefined as string | undefined }));
  catRows.forEach((r, i) => (r.color = i === 0 ? '#E8B64C' : '#8C7564'));
  const t0 = today();
  const active = t0 >= tr.start && t0 <= end;
  const dayGroups = byDay.map((v, i) => ({ date: addDays(tr.start, i), v })).filter((g) => g.v > 0);
  return (
    <div class="screen no-nav">
      <TopBar back title={t('trip.title')} fallback="/trips">
        <button class="icon-btn" aria-label={t('edit')} onClick={() => setEdit(true)}><Icon name="edit" size={17} /></button>
      </TopBar>
      <div class="col gap14" style="position:relative;border-radius:18px;overflow:hidden;background:linear-gradient(160deg,#5a3a1c 0%,#2a1a10 50%,var(--surface) 100%);border:1px solid #4a3122;padding:18px">
        <svg width="100%" height="80" viewBox="0 0 390 90" preserveAspectRatio="none" style="position:absolute;left:0;bottom:0;opacity:.18" aria-hidden="true"><path d="M0 90 L0 60 L40 38 L70 52 L110 20 L150 48 L190 30 L230 56 L270 26 L320 50 L360 34 L390 46 L390 90 Z" fill="#E8B64C" /></svg>
        <div class="between" style="position:relative;align-items:flex-start">
          <div class="col gap4"><span style="font-size:22px;font-weight:700">{tr.name}</span><span class="small" style="color:#e9d8c4">{fmtDay(tr.start)} – {fmtDay(end)} · {nDays} {t('days')}</span></div>
          <span class="pill" style="background:rgba(245,238,230,.1);color:var(--text)">{active ? t('trip.active') : t('trip.ended')}</span>
        </div>
        <div class="row-flex" style="position:relative;align-items:baseline;gap:8px">
          <span style="font-size:32px;line-height:1"><Money v={spent} class="bold" /></span>
          {tr.budget ? <span class="small" style="color:#e9d8c4">{t('trip.spent', { b: fmt(tr.budget) })}</span> : null}
        </div>
        {tr.budget ? <div style="position:relative"><Bar pct={(spent / tr.budget) * 100} color={spent > tr.budget ? '#E5484D' : '#E8B64C'} /></div> : null}
        <div class="grid3" style="position:relative;color:#e9d8c4;font-size:11px">
          <div class="col gap4"><span>{t('trip.left')}</span><Money v={(tr.budget ?? 0) - spent} class="bold" /></div>
          <div class="col gap4"><span>{t('trip.avg')}</span><Money v={spent / nDays} class="bold" /></div>
          <div class="col gap4"><span>{t('trip.count')}</span><span class="n bold">{txs.length}</span></div>
        </div>
      </div>

      {txs.length > 0 && (
        <div class="card pad col gap12">
          <span class="h2">{t('trip.byDay')}</span>
          <BarChart data={byDay.map((v, i) => ({ label: dayName(parseISO(addDays(tr.start, i)).getDay(), true), v }))} height={120} showValue highlight={byDay.indexOf(Math.max(...byDay))} tip={(i) => <span>{fmtDay(addDays(tr.start, i), true)} · {fmt(byDay[i])}</span>} />
        </div>
      )}
      {catRows.length > 0 && (
        <div class="card pad col">
          <span class="h2" style="padding-bottom:4px">{t('trip.byCat')}</span>
          <HBars rows={catRows} />
        </div>
      )}
      {dayGroups.map((g, i) => (
        <Collapse open={i === dayGroups.length - 1} title={fmtDay(g.date, true)} right={<Money v={g.v} class="small text2" />}>
          {txs.filter((x) => x.date === g.date).map((x) => <TxRow tx={x} />)}
        </Collapse>
      ))}
      {txs.length === 0 && <Empty />}
      <button class="btn outline" onClick={() => openTx({ type: 'expense', tripId: tr.id })}><Icon name="plus" size={16} stroke={2.2} />{t('nav.add')}</button>
      {edit && <TripSheet item={tr} onClose={() => setEdit(false)} />}
    </div>
  );
}
