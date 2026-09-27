import type { Account } from '../store/types';
import { t } from '../i18n';
import { Money } from './ui';
import { Icon } from './Icon';

export const SKINS = [
  { bg: 'linear-gradient(135deg, #6A3413 0%, #1E130D 100%)', border: '#7A4220', fg: '#F7EDE4' },
  { bg: 'linear-gradient(135deg, #1F4E7A 0%, #10263D 100%)', border: '#2C5F8F', fg: '#F2F6FA' },
  { bg: 'linear-gradient(135deg, #16603F 0%, #0B2E1F 100%)', border: '#1F7A52', fg: '#EEF7F2' },
  { bg: 'linear-gradient(135deg, #2B2B2E 0%, #0C0C0D 100%)', border: '#3A3A3E', fg: '#F5F5F5' },
  { bg: 'linear-gradient(135deg, #C9B99A 0%, #8C7A5C 100%)', border: '#D6C8AC', fg: '#1A140C' },
  { bg: 'linear-gradient(135deg, #4A2B6E 0%, #1E1230 100%)', border: '#5C3A86', fg: '#F4EEFA' },
  { bg: 'linear-gradient(135deg, #7A1F2B 0%, #2A0D12 100%)', border: '#8E2B38', fg: '#FBEFF1' },
  { bg: 'linear-gradient(135deg, #0F5E63 0%, #07282A 100%)', border: '#16757B', fg: '#EAF8F8' }
];

export const NETWORKS: [Account['network'], string][] = [
  ['mada', 'mada'],
  ['visa', 'VISA'],
  ['mastercard', 'Mastercard'],
  ['amex', 'Amex'],
  ['none', '—']
];

export const BANKS_AR = ['الراجحي', 'الأهلي', 'الرياض', 'الإنماء', 'البلاد', 'ساب', 'الجزيرة', 'العربي', 'الفرنسي', 'الاستثمار', 'STC Bank', 'D360'];
export const BANKS_EN = ['Al Rajhi', 'SNB', 'Riyad Bank', 'Alinma', 'Albilad', 'SAB', 'Bank AlJazira', 'ANB', 'BSF', 'SAIB', 'STC Bank', 'D360'];

export function CardViz({ acc, balance, width = '100%', height = 176, photo }: { acc: Account; balance: number; width?: string; height?: number; photo?: string }) {
  const skin = SKINS[acc.skin % SKINS.length];
  const credit = acc.kind === 'credit';
  const net = NETWORKS.find(([k]) => k === acc.network)?.[1];
  const img = photo ?? acc.photo;
  return (
    <div class={'cardviz' + (img ? ' has-photo' : '')} style={{ width, height: height + 'px', background: skin.bg, border: `1px solid ${skin.border}`, color: skin.fg, flexShrink: 0 }}>
      {img && <img class="photo" src={img} alt="" />}
      <div class="between">
        <span style="font-size:14px;font-weight:700" class="ellipsis">{acc.bank ? acc.bank : acc.name}</span>
        <span style="font-size:11px;font-weight:600;opacity:.8">{acc.bank ? acc.name.replace(acc.bank, '').replace(/^\s*·\s*/, '') || t(('kind.' + acc.kind) as 'kind.bank') : t(('kind.' + acc.kind) as 'kind.bank')}</span>
      </div>
      {acc.kind === 'cash' ? <Icon name="cash" size={26} /> : <div style="width:36px;height:26px;border-radius:6px;background:linear-gradient(135deg,#D9B98A,#A7865A);opacity:.85" />}
      <div class="between" style="align-items:flex-end">
        <div class="col gap4">
          <span style="font-size:11px;opacity:.75">{credit ? t('acc.owed') : t('acc.balance')}</span>
          <span style="font-size:24px;line-height:1.1"><Money v={balance} class="bold" /></span>
          {acc.last4 && <span class="n" style="font-size:12px;letter-spacing:2px;opacity:.8;direction:ltr">•••• {acc.last4}</span>}
        </div>
        {net && net !== '—' && <span class="net" style="font-size:18px">{net}</span>}
      </div>
    </div>
  );
}
