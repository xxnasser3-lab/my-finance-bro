import { t } from '../i18n';
import { Icon } from './Icon';

export function Nav({ active, onAdd }: { active: string; onAdd: () => void }) {
  const item = (key: string, href: string, icon: string, label: string) => (
    <a href={'#' + href} class={active === key ? 'on' : ''} aria-current={active === key ? 'page' : undefined}>
      <Icon name={icon} size={22} stroke={1.7} />
      {label}
    </a>
  );
  return (
    <nav class="nav" aria-label="nav">
      {item('home', '/', 'home', t('nav.home'))}
      {item('wallet', '/wallet', 'wallet', t('nav.wallet'))}
      <a
        href="#/"
        class="plus"
        aria-label={t('nav.add')}
        onClick={(e) => {
          e.preventDefault();
          onAdd();
        }}
      >
        <Icon name="plus" size={24} stroke={2.2} />
      </a>
      {item('debts', '/debts', 'debt', t('nav.debts'))}
      {item('plan', '/plan', 'plan', t('nav.plan'))}
    </nav>
  );
}
