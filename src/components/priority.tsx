import { t } from '../i18n';
import type { Priority } from '../store/types';
import { PRIORITIES } from '../logic/advisor';

export const PRI_COLOR: Record<Priority, string> = {
  essential: 'var(--pri-1)',
  important: 'var(--pri-2)',
  flexible: 'var(--pri-3)',
  optional: 'var(--pri-4)',
  luxury: 'var(--pri-5)'
};

export function priLabel(p: Priority): string {
  return t(('pri.' + p) as 'pri.essential');
}

export function PriorityPill({ p }: { p: Priority }) {
  return <span class="pill" style={{ color: PRI_COLOR[p], background: 'var(--surface-3)' }}>{priLabel(p)}</span>;
}

export function PriorityPicker({ value, onChange }: { value: Priority; onChange: (p: Priority) => void }) {
  return (
    <div class="col gap6">
      <div class="seg tight" role="radiogroup">
        {PRIORITIES.map((p) => (
          <button type="button" role="radio" aria-checked={p === value} class={p === value ? 'on' : ''} style={p === value ? { background: PRI_COLOR[p], color: 'var(--on-pri)' } : undefined} onClick={() => onChange(p)}>
            {priLabel(p)}
          </button>
        ))}
      </div>
      <span class="xs faint">{t(('priHint.' + value) as 'priHint.essential')}</span>
    </div>
  );
}
