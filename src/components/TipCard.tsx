import { t, fmtDay, getLang } from '../i18n';
import type { Tip } from '../logic/advisor';
import { catKeysAr, catKeysEn } from '../store/seed';
import { fmt } from './ui';
import { Icon } from './Icon';

const LOOK: Record<Tip['level'], { color: string; bg: string; border: string; icon: string }> = {
  danger: { color: 'var(--danger)', bg: 'var(--danger-soft)', border: 'var(--danger-line)', icon: 'alert' },
  warn: { color: 'var(--accent-text)', bg: 'var(--accent-soft)', border: 'var(--accent-line)', icon: 'alert' },
  good: { color: 'var(--green-text)', bg: 'var(--green-soft)', border: 'var(--green-line)', icon: 'check' },
  info: { color: 'var(--text-2)', bg: 'var(--surface)', border: 'var(--line)', icon: 'star' }
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
    <a href={'#' + tip.href} class="row-flex small" style={{ alignItems: 'flex-start', padding: '12px 13px', borderRadius: '13px', lineHeight: 1.7, color: 'var(--text-2)', background: l.bg, border: '1px solid ' + l.border }}>
      <span style={{ color: l.color, marginTop: '3px' }}><Icon name={tip.kind === 'dailyCost' ? 'repeat' : tip.kind === 'cardDue' ? 'card' : tip.kind === 'extraIncome' ? 'up' : l.icon} size={17} /></span>
      <span class="grow">{tipText(tip)}</span>
    </a>
  );
}
