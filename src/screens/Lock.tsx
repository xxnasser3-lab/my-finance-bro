import { useEffect, useState } from 'preact/hooks';
import { t, setLang, getLang } from '../i18n';
import type { AppData, Lang } from '../store/types';
import { bioEnabled, createVault, unlockWithBio, unlockWithPassword, wipeAll } from '../store/vault';
import { emptyData } from '../store/seed';
import { sampleData } from '../store/sample';
import { Icon } from '../components/Icon';
import { Field, NumInput, Stepper, toast, confirmDo } from '../components/ui';
import { RestoreSheet } from './Settings';
import { getData } from '../store/store';

function Logo() {
  return (
    <div class="logo-mark">
      <Icon name="compass" size={36} stroke={1.8} />
    </div>
  );
}

function LangSwitch({ onChange }: { onChange: () => void }) {
  const l = getLang();
  return (
    <button class="chip" style="align-self:flex-end" onClick={() => { setLang(l === 'ar' ? 'en' : 'ar'); onChange(); }}>
      <Icon name="globe" size={14} />
      {l === 'ar' ? 'English' : 'العربية'}
    </button>
  );
}

export function Unlock({ onUnlocked }: { onUnlocked: (d: AppData) => void }) {
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [bio, setBio] = useState(false);
  const [err, setErr] = useState('');
  const [restore, setRestore] = useState(false);
  const [, rerender] = useState(0);
  useEffect(() => {
    bioEnabled().then((on) => {
      setBio(on);
      if (on) tryBio();
    });
  }, []);
  const tryBio = async () => {
    try {
      onUnlocked(await unlockWithBio());
    } catch {
      /* fall back to password */
    }
  };
  const go = async (e?: Event) => {
    e?.preventDefault();
    if (!pass) return;
    setBusy(true);
    setErr('');
    try {
      onUnlocked(await unlockWithPassword(pass));
    } catch {
      setErr(t('lock.wrong'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div class="lock-wrap">
      <LangSwitch onChange={() => rerender((n) => n + 1)} />
      <Logo />
      <h1 style="font-size:24px">{t('lock.title')}</h1>
      <form class="col gap12" onSubmit={go}>
        <Field label={t('lock.password')}>
          <input class="input" type="password" autoComplete="current-password" autoFocus value={pass} onInput={(e) => setPass((e.target as HTMLInputElement).value)} />
        </Field>
        {err && <span class="small" style="color:var(--danger)">{err}</span>}
        <button class="btn" type="submit" disabled={busy}>{busy ? '…' : t('lock.unlock')}</button>
        {bio && <button class="btn ghost" type="button" onClick={tryBio}><Icon name="face" size={18} />{t('lock.bio')}</button>}
      </form>
      <details>
        <summary class="small muted" style="justify-content:center">{t('lock.forgotQ')}</summary>
        <div class="col gap10">
          <span class="xs muted" style="line-height:1.7">{t('lock.forgot')}</span>
          <button class="btn outline sm" onClick={() => setRestore(true)}>{t('lock.restore')}</button>
          <button class="btn danger sm" onClick={async () => { if (confirmDo(t('set.wipeConfirm'))) { await wipeAll(); location.reload(); } }}>{t('lock.wipe')}</button>
        </div>
      </details>
      {restore && <RestoreSheet onClose={() => setRestore(false)} onDone={() => onUnlocked(getData())} />}
    </div>
  );
}

export function Onboarding({ onDone }: { onDone: (d: AppData) => void }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [salary, setSalary] = useState<number>(NaN);
  const [payday, setPayday] = useState(27);
  const [living, setLiving] = useState(3000);
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [sample, setSample] = useState(false);
  const [busy, setBusy] = useState(false);
  const [restore, setRestore] = useState(false);
  const [, rerender] = useState(0);
  const finish = async () => {
    if (p1.length < 6) return toast(t('ob.short'));
    if (p1 !== p2) return toast(t('ob.mismatch'));
    setBusy(true);
    const lang = getLang() as Lang;
    const data = sample ? sampleData(lang) : emptyData({ lang, name: name.trim(), salary: salary || 0, payday, livingBudget: living || 0 });
    if (!sample) data.settings.name = name.trim();
    await createVault(p1, data);
    onDone(data);
  };
  return (
    <div class="lock-wrap" style="justify-content:flex-start">
      <LangSwitch onChange={() => rerender((n) => n + 1)} />
      <Logo />
      {step === 0 ? (
        <>
          <h1 style="font-size:26px">{t('ob.welcome')}</h1>
          <p class="text2" style="margin:0;line-height:1.8">{t('ob.sub')}</p>
          <div class="card pad col gap12">
            <Field label={t('ob.yourName')}><input class="input" value={name} onInput={(e) => setName((e.target as HTMLInputElement).value)} /></Field>
            <Field label={t('ob.salary')}><NumInput value={salary} onInput={setSalary} /></Field>
            <div class="between"><span class="small muted">{t('ob.payday')}</span><Stepper value={payday} min={1} max={31} onChange={setPayday} /></div>
            <Field label={t('ob.living')} hint={t('ob.livingHint')}><NumInput value={living} onInput={setLiving} /></Field>
          </div>
          <label class="card row-flex" style="padding:14px 16px;gap:12px;cursor:pointer">
            <input type="checkbox" checked={sample} onChange={(e) => setSample((e.target as HTMLInputElement).checked)} style="width:20px;height:20px;accent-color:#DD6220" />
            <span class="col gap4"><span class="semi">{t('ob.sample')}</span><span class="xs faint">{t('ob.sampleHint')}</span></span>
          </label>
          <button class="btn" onClick={() => setStep(1)}>{t('ob.next')}</button>
          <button class="btn outline sm" onClick={() => setRestore(true)}>{t('lock.restore')}</button>
        </>
      ) : (
        <>
          <h1 style="font-size:22px">{t('ob.password')}</h1>
          <p class="small text2" style="margin:0;line-height:1.8">{t('ob.passHint')}</p>
          <div class="card pad col gap12">
            <Field label={t('ob.password')}><input class="input" type="password" autoComplete="new-password" value={p1} onInput={(e) => setP1((e.target as HTMLInputElement).value)} /></Field>
            <Field label={t('ob.password2')}><input class="input" type="password" autoComplete="new-password" value={p2} onInput={(e) => setP2((e.target as HTMLInputElement).value)} /></Field>
          </div>
          <button class="btn" disabled={busy} onClick={finish}>{busy ? '…' : t('ob.start')}</button>
          <button class="btn outline sm" onClick={() => setStep(0)}>{t('back')}</button>
        </>
      )}
      {restore && <RestoreSheet onClose={() => setRestore(false)} onDone={() => onDone(getData())} />}
    </div>
  );
}
