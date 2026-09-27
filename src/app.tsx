import { useEffect, useState } from 'preact/hooks';
import { setLang } from './i18n';
import { hasData, setData, update, useData } from './store/store';
import type { AppData, Tx } from './store/types';
import { hasVault, isUnlocked, lock } from './store/vault';
import { navigate, useRoute } from './router';
import { registerTxOpener } from './sheets';
import { Nav } from './components/Nav';
import { ToastHost } from './components/ui';
import { Home } from './screens/Home';
import { Wallet } from './screens/Wallet';
import { AccountDetail } from './screens/AccountDetail';
import { AccountForm } from './screens/AccountForm';
import { Transactions } from './screens/Transactions';
import { Reports } from './screens/Reports';
import { Commitments } from './screens/Commitments';
import { Categories } from './screens/Categories';
import { Trips, TripDetail } from './screens/Trips';
import { Debts } from './screens/Debts';
import { DebtDetail } from './screens/DebtDetail';
import { DebtForm } from './screens/DebtForm';
import { Plan } from './screens/Plan';
import { Settings } from './screens/Settings';
import { TxSheet } from './screens/TxSheet';
import { Onboarding, Unlock } from './screens/Lock';
import { Advice } from './screens/Advice';
import { Investments } from './screens/Investments';
import { InvestmentDetail } from './screens/InvestmentDetail';
import { InvestmentForm } from './screens/InvestmentForm';
import { autoPost } from './logic/autopost';
import { migrate } from './store/seed';

const AUTO_LOCK_MS = 5 * 60 * 1000;

function Main({ onLock }: { onLock: () => void }) {
  const d = useData();
  const r = useRoute();
  const [tx, setTx] = useState<Partial<Tx> | null>(null);
  useEffect(() => registerTxOpener((p) => setTx(p ?? {})), []);
  useEffect(() => {
    setLang(d.settings.lang);
    try {
      localStorage.setItem('lang', d.settings.lang);
    } catch {
      /* private mode */
    }
  }, [d.settings.lang]);
  // log daily fixed expenses (on open, when they change, and when the app comes back the next day)
  useEffect(() => {
    const run = () => update((x) => autoPost(x) ?? x);
    if (autoPost(d)) run();
    const onVis = () => !document.hidden && autoPost(d) && run();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [d.commitments]);

  let screen;
  let tab = '';
  const [a, b, c] = r;
  if (!a) { screen = <Home />; tab = 'home'; }
  else if (a === 'wallet') { screen = <Wallet />; tab = 'wallet'; }
  else if (a === 'account' && b === 'new') screen = <AccountForm key={'new' + (c ?? '')} kind={c === 'credit' ? 'credit' : undefined} />;
  else if (a === 'account' && c === 'edit') screen = <AccountForm key={b} id={b} />;
  else if (a === 'account') screen = <AccountDetail id={b} />;
  else if (a === 'txs') screen = <Transactions />;
  else if (a === 'reports') screen = <Reports />;
  else if (a === 'bills') screen = <Commitments />;
  else if (a === 'categories') screen = <Categories />;
  else if (a === 'trips') screen = <Trips />;
  else if (a === 'trip') screen = <TripDetail id={b} />;
  else if (a === 'debts') { screen = <Debts />; tab = 'debts'; }
  else if (a === 'debt' && b === 'new') screen = <DebtForm key={'new' + (c ?? '')} preset={c} />;
  else if (a === 'debt' && c === 'edit') screen = <DebtForm key={b} id={b} />;
  else if (a === 'debt') screen = <DebtDetail id={b} />;
  else if (a === 'plan') { screen = <Plan />; tab = 'plan'; }
  else if (a === 'settings') screen = <Settings onLock={onLock} />;
  else if (a === 'advice') screen = <Advice />;
  else if (a === 'investments') screen = <Investments />;
  else if (a === 'investment' && b === 'new') screen = <InvestmentForm key="new" />;
  else if (a === 'investment' && c === 'edit') screen = <InvestmentForm key={b} id={b} />;
  else if (a === 'investment') screen = <InvestmentDetail id={b} />;
  else { screen = <Home />; tab = 'home'; }

  return (
    <>
      {screen}
      {tab && <Nav active={tab} onAdd={() => setTx({})} />}
      {tx && <TxSheet key={tx.id ?? JSON.stringify(tx)} preset={tx} onClose={() => setTx(null)} />}
    </>
  );
}

export function App() {
  const [state, setState] = useState<'loading' | 'onboard' | 'locked' | 'open'>('loading');

  useEffect(() => {
    hasVault().then((v) => setState(v ? 'locked' : 'onboard'));
    const saved = localStorage.getItem('lang');
    if (saved === 'en' || saved === 'ar') setLang(saved);
    // lock after the app has been in the background for a while
    let hiddenAt = 0;
    const onVis = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > AUTO_LOCK_MS && isUnlocked()) {
        lock();
        setData(null);
        setState('locked');
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const open = (d: AppData) => {
    setData(migrate(d), true);
    setLang(d.settings.lang);
    if (location.hash && location.hash !== '#/') navigate('/', true);
    try {
      localStorage.setItem('lang', d.settings.lang);
    } catch {
      /* private mode */
    }
    setState('open');
  };

  const doLock = () => {
    lock();
    setData(null);
    setState('locked');
  };

  return (
    <>
      {state === 'onboard' && <Onboarding onDone={open} />}
      {state === 'locked' && <Unlock onUnlocked={open} />}
      {state === 'open' && hasData() && <Main onLock={doLock} />}
      <ToastHost />
    </>
  );
}
