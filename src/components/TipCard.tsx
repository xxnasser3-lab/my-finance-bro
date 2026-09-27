import { t, fmtDay, getLang } from '../i18n';
import type { Tip } from '../logic/advisor';
import { catKeysAr, catKeysEn } from '../store/seed';
import { fmt } from './ui';
import { Icon } from './Icon';

const LOOK: Record<Tip['level'], { color: string; bg: string; border: string; icon: string }> = {
  danger: { color: '#F2878A', bg: 'rgba(229,72,77,.08)', border: 'rgba(229,72,77,.3)', icon: 'alert' },
  warn: { color: '#F08A4B', bg: 'rgba(221,98,32,.07)', border: 'rgba(221,98,32,.25)', icon: 'alert' },
  good: { color: '#8FD6B2', bg: 'rgba(108,196,154,.08)', border: 'rgba(108,196,154,.25)', icon: 'check' },
  info: { color: '#CDBEB0', bg: 'var(--surface)', border: 'var(--line)', icon: 'star' }
};

export function tipText(tip: Tip): string {
  const label = tip.kind === 'catOver' && tip.label ? (getLang() === 'ar' ? catKeysAr : catKeysEn)[tip.label] ?? tip.label : tip.label ?? '';
  return t(('tip.' + tip.kind) as 'tip.deficit', {
    v: fmt(tip.v ?? 0),
    w: fmt(tip.w ?? 0),
    x: fmt(tip.x ?? 0),
    label,
    date: tip.date ? fmtDay(tip.date) : ''
  });
}

export function TipCard({ tip }: { tip: Tip }) {
  const l = LOOK[tip.level];
  return (
    <a href={'#' + tip.href} class="row-flex small" style={{ alignItems: 'flex-start', padding: '12px 13px', borderRadius: '13px', lineHeight: 1.7, color: '#e9d8c4', background: l.bg, border: '1px solid ' + l.border }}>
      <span style={{ color: l.color, marginTop: '3px' }}><Icon name={tip.kind === 'dailyCost' ? 'repeat' : tip.kind === 'cardDue' ? 'card' : tip.kind === 'extraIncome' ? 'up' : l.icon} size={17} /></span>
      <span class="grow">{tipText(tip)}</span>
    </a>
  );
}
