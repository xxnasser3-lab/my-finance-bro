import { useState } from 'preact/hooks';
import { t } from '../i18n';
import { useData, getData, update, upsert, uid } from '../store/store';
import type { Category, CategoryKind } from '../store/types';
import { Icon, CAT_ICONS, Chev } from '../components/Icon';
import { TopBar, Seg, Sheet, Field, NumInput, Switch, catName, CatBadge, Money, hexA, toast, confirmDo } from '../components/ui';
import { periodStats } from '../logic/finance';
import { monthRange } from '../logic/dates';

const COLORS = ['#DD6220', '#E8B64C', '#6CC49A', '#5B8FD0', '#C9B8E8', '#E9A0C8', '#F2878A', '#B07A52', '#8C9BAE', '#F0C9A0', '#8C7564', '#4FB3BF'];

function CategorySheet({ item, kind, parentId, onClose }: { item?: Category; kind: CategoryKind; parentId?: string; onClose: () => void }) {
  const d = getData();
  const [c, setC] = useState<Category>(item ? { ...item, name: catName(item) } : { id: uid(), kind, name: '', icon: 'tag', color: COLORS[0], living: kind === 'expense', parentId });
  const set = (p: Partial<Category>) => setC((x) => ({ ...x, ...p }));
  const parents = d.categories.filter((x) => x.kind === c.kind && !x.parentId && x.id !== c.id && !x.archived);
  const save = () => {
    const name = c.name.trim();
    if (!name) return toast(t('name'));
    const renamed = item && name !== catName(item);
    update((x) => ({ ...x, categories: upsert(x.categories, { ...c, name, key: renamed ? undefined : c.key }) }));
    onClose();
  };
  const remove = () => {
    if (!item || !confirmDo(t('confirmDelete'))) return;
    update((x) => ({ ...x, categories: x.categories.map((y) => (y.id === item.id || y.parentId === item.id ? { ...y, archived: true } : y)) }));
    onClose();
  };
  return (
    <Sheet onClose={onClose} title={item ? catName(item) : t('cat.new')}>
      <div class="row-flex" style="gap:12px">
        <span class="ib" style={{ width: '46px', height: '46px', background: hexA(c.color, 0.16), borderColor: 'transparent', color: c.color }}><Icon name={c.icon} size={22} /></span>
        <input class="input grow" placeholder={t('name')} value={c.name} onInput={(e) => set({ name: (e.target as HTMLInputElement).value })} />
      </div>
      <Field label={t('cat.icon')}>
        <div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px">
          {CAT_ICONS.map((ic) => (
            <button type="button" aria-label={ic} onClick={() => set({ icon: ic })} style={{ height: '38px', borderRadius: '10px', border: '1px solid ' + (c.icon === ic ? 'var(--accent)' : 'var(--line)'), background: c.icon === ic ? 'var(--accent-soft)' : 'var(--bg)', color: '#E9D8C4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
              <Icon name={ic} size={17} />
            </button>
          ))}
        </div>
      </Field>
      <Field label={t('cat.color')}>
        <div class="row-flex" style="flex-wrap:wrap;gap:8px">
          {COLORS.map((col) => (
            <button type="button" aria-label={col} onClick={() => set({ color: col })} style={{ width: '30px', height: '30px', borderRadius: '999px', padding: 0, background: col, border: '2px solid ' + (c.color === col ? '#F5EEE6' : 'transparent'), boxShadow: 'inset 0 0 0 2px #15110E' }} />
          ))}
        </div>
      </Field>
      <div class="grid2">
        <Field label={t('cat.parent')}>
          <select class="select" value={c.parentId ?? ''} onChange={(e) => set({ parentId: (e.target as HTMLSelectElement).value || undefined })}>
            <option value="">{t('cat.main')}</option>
            {parents.map((p) => <option value={p.id}>{catName(p)}</option>)}
          </select>
        </Field>
        {c.kind === 'expense' && <Field label={t('cat.budget')}><NumInput value={c.monthlyBudget} onInput={(v) => set({ monthlyBudget: v || undefined })} placeholder={t('optional')} /></Field>}
      </div>
      {c.kind === 'expense' && (
        <div class="between small"><span style="line-height:1.5">{t('cat.living')}</span><Switch on={c.living} onChange={(v) => set({ living: v })} label={t('cat.living')} /></div>
      )}
      <div class="row-flex">
        {item && <button class="btn danger" onClick={remove} aria-label={t('delete')}><Icon name="trash" size={18} /></button>}
        <button class="btn grow" onClick={save}>{t('save')}</button>
      </div>
    </Sheet>
  );
}

export function Categories() {
  const d = useData();
  const [kind, setKind] = useState<CategoryKind>('expense');
  const [edit, setEdit] = useState<{ item?: Category; parentId?: string } | null>(null);
  const n = new Date();
  const r = monthRange(n.getFullYear(), n.getMonth());
  const st = periodStats(d, r.start, r.end);
  const totals = new Map([...st.byCat, ...st.sources].map((x) => [x.id, x.total]));
  const roots = d.categories.filter((c) => c.kind === kind && !c.parentId && !c.archived);
  const count = (k: CategoryKind) => d.categories.filter((c) => c.kind === k && !c.archived).length;
  return (
    <div class="screen no-nav">
      <TopBar back title={t('cat.title')}>
        <button class="icon-btn accent" aria-label={t('cat.new')} onClick={() => setEdit({})}><Icon name="plus" size={18} stroke={2.4} /></button>
      </TopBar>
      <Seg<CategoryKind> value={kind} onChange={setKind} options={[['expense', `${t('cat.expense')} · ${count('expense')}`], ['income', `${t('cat.income')} · ${count('income')}`]]} />
      <div class="card" style="padding:0 14px">
        {roots.map((c) => {
          const subs = d.categories.filter((x) => x.parentId === c.id && !x.archived);
          const total = totals.get(c.id) ?? 0;
          return (
            <details style="border-bottom:1px solid var(--sep)">
              <summary style="gap:12px;padding:11px 0">
                <CatBadge c={c} />
                <span class="grow col gap4" style="min-width:0">
                  <span class="semi ellipsis" style="font-size:14px">{catName(c)}</span>
                  <span class="xs faint">
                    {c.monthlyBudget ? t('cat.budget') + ' ' + c.monthlyBudget.toLocaleString('en-US') : subs.length ? t('cat.subs', { n: subs.length }) : t('cat.thisMonth')}
                  </span>
                </span>
                <Money v={total} class="small bold" />
                <Chev dir="down" size={16} />
              </summary>
              <div class="chips" style="padding:0 0 12px;padding-inline-start:50px">
                {subs.map((s) => <button class="chip" onClick={() => setEdit({ item: s })}>{catName(s)}</button>)}
                <button class="chip dashed" onClick={() => setEdit({ parentId: c.id })}>+ {t('cat.sub')}</button>
                <button class="chip" onClick={() => setEdit({ item: c })}><Icon name="edit" size={13} />{t('edit')}</button>
              </div>
            </details>
          );
        })}
      </div>
      {edit && <CategorySheet item={edit.item} kind={edit.item?.kind ?? kind} parentId={edit.parentId} onClose={() => setEdit(null)} />}
    </div>
  );
}
