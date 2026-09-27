import { useEffect, useState } from 'preact/hooks';
import { t, setLang, fmtDay } from '../i18n';
import { useData, update, getData } from '../store/store';
import type { Lang, Settings as S } from '../store/types';
import { Icon } from '../components/Icon';
import { TopBar, Field, NumInput, Switch, Stepper, Sheet, toast, catName, confirmDo } from '../components/ui';
import { bioEnabled, bioSupported, changePassword, disableBio, enableBio, lock, wipeAll } from '../store/vault';
import { exportBackup, driveBackup, driveFetchLatest, parseBackupFile, restoreBackup, downloadText } from '../sync/backup';
import { pickFile } from '../components/image';
import { toCSV, catById } from '../logic/finance';
import { navigate } from '../router';
import type { BackupFile } from '../store/crypto';

export function RestoreSheet({ onClose, onDone, initial }: { onClose: () => void; onDone: () => void; initial?: BackupFile }) {
  const [file, setFile] = useState<BackupFile | undefined>(initial);
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const choose = async () => {
    const f = await pickFile('application/json,.json');
    if (!f) return;
    try {
      setFile(await parseBackupFile(f));
    } catch {
      toast(t('set.restoreFail'));
    }
  };
  const go = async () => {
    if (!file) return;
    setBusy(true);
    try {
      await restoreBackup(file, pass);
      toast(t('set.restored'));
      onDone();
    } catch {
      toast(t('set.restoreFail'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet onClose={onClose} title={t('set.restore')}>
      <button class="btn outline" onClick={choose}><Icon name="upload" size={16} />{file ? fmtDay(file.createdAt.slice(0, 10), false, true) : t('set.restore')}</button>
      {file && (
        <>
          <Field label={t('set.restorePass')}><input class="input" type="password" autoComplete="current-password" value={pass} onInput={(e) => setPass((e.target as HTMLInputElement).value)} /></Field>
          <button class="btn" disabled={busy || !pass} onClick={go}>{busy ? '…' : t('set.restore')}</button>
        </>
      )}
    </Sheet>
  );
}

function PasswordSheet({ onClose }: { onClose: () => void }) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (b.length < 6) return toast(t('ob.short'));
    setBusy(true);
    try {
      await changePassword(a, b, getData());
      toast(t('set.passChanged'));
      onClose();
    } catch {
      toast(t('lock.wrong'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet onClose={onClose} title={t('set.changePass')}>
      <Field label={t('set.oldPass')}><input class="input" type="password" autoComplete="current-password" value={a} onInput={(e) => setA((e.target as HTMLInputElement).value)} /></Field>
      <Field label={t('set.newPass')} hint={t('ob.passHint')}><input class="input" type="password" autoComplete="new-password" value={b} onInput={(e) => setB((e.target as HTMLInputElement).value)} /></Field>
      <button class="btn" disabled={busy} onClick={go}>{t('save')}</button>
    </Sheet>
  );
}

export function Settings({ onLock }: { onLock: () => void }) {
  const d = useData();
  const s = d.settings;
  const [bio, setBio] = useState(false);
  const [sheet, setSheet] = useState<'restore' | 'pass' | null>(null);
  const [driveBusy, setDriveBusy] = useState(false);
  const [driveRestore, setDriveRestore] = useState<BackupFile | undefined>();
  useEffect(() => {
    bioEnabled().then(setBio);
  }, []);
  const set = (p: Partial<S>) => update((x) => ({ ...x, settings: { ...x.settings, ...p } }));
  const setLangAll = (l: Lang) => {
    setLang(l);
    set({ lang: l });
  };
  const toggleBio = async (on: boolean) => {
    try {
      if (on) await enableBio(s.name || 'me');
      else await disableBio();
      setBio(await bioEnabled());
    } catch {
      toast(t('set.bioNA'));
    }
  };
  const drive = async () => {
    if (!s.driveClientId) return toast(t('set.driveNeed'));
    setDriveBusy(true);
    try {
      await driveBackup();
      toast(t('set.driveDone'));
    } catch (e) {
      toast('Google Drive: ' + (e as Error).message);
    } finally {
      setDriveBusy(false);
    }
  };
  const driveGet = async () => {
    if (!s.driveClientId) return toast(t('set.driveNeed'));
    setDriveBusy(true);
    try {
      const f = await driveFetchLatest(s.driveClientId);
      if (!f) return toast(t('empty'));
      setDriveRestore(f);
      setSheet('restore');
    } catch (e) {
      toast('Google Drive: ' + (e as Error).message);
    } finally {
      setDriveBusy(false);
    }
  };
  const accounts = d.accounts.filter((a) => !a.archived);
  const liquid = accounts.filter((a) => a.kind !== 'credit');

  return (
    <div class="screen no-nav">
      <TopBar back title={t('set.title')} />

      <span class="sec-title">{t('set.lang')}</span>
      <div class="card pad col gap10">
        <div class="grid2">
          {(['ar', 'en'] as Lang[]).map((l) => (
            <button class="col" style={{ height: '62px', borderRadius: '13px', alignItems: 'center', justifyContent: 'center', gap: '2px', border: '1px solid ' + (s.lang === l ? 'var(--accent)' : 'var(--line)'), background: s.lang === l ? 'var(--accent-soft)' : 'var(--bg)' }} onClick={() => setLangAll(l)}>
              <span style={{ fontFamily: l === 'ar' ? 'var(--font-ar)' : 'var(--font-num)', fontSize: '16px', fontWeight: 700 }}>{l === 'ar' ? 'العربية' : 'English'}</span>
              <span class="xs muted" style={{ fontFamily: l === 'ar' ? 'var(--font-ar)' : 'var(--font-num)' }}>{l === 'ar' ? 'من اليمين لليسار' : 'Left to right'}</span>
            </button>
          ))}
        </div>
        <span class="xs faint" style="line-height:1.7">{t('set.langNote')}</span>
      </div>

      <span class="sec-title">{t('set.income')}</span>
      <div class="card pad col gap12">
        <Field label={t('set.name')}><input class="input" value={s.name} onInput={(e) => set({ name: (e.target as HTMLInputElement).value })} /></Field>
        <div class="grid2">
          <Field label={t('set.salary')}><NumInput value={s.salary} onInput={(v) => set({ salary: v || 0 })} /></Field>
          <Field label={t('set.salaryAcc')}>
            <select class="select" value={s.salaryAccountId ?? ''} onChange={(e) => set({ salaryAccountId: (e.target as HTMLSelectElement).value || undefined })}>
              <option value="">—</option>
              {liquid.map((a) => <option value={a.id}>{a.name}</option>)}
            </select>
          </Field>
        </div>
        <div class="between"><span class="col gap4"><span class="semi">{t('set.payday')}</span><span class="xs faint">{t('set.paydaySub')}</span></span><Stepper value={s.payday} min={1} max={31} onChange={(v) => set({ payday: v })} /></div>
      </div>

      <div class="card pad col gap12">
        <div class="between"><span class="semi">{t('set.bonusOn')}</span><Switch on={s.bonus.enabled} onChange={(v) => set({ bonus: { ...s.bonus, enabled: v } })} label={t('set.bonusOn')} /></div>
        {s.bonus.enabled && (
          <>
            <div class="grid2">
              <Field label={t('set.bonusAmount')}><NumInput value={s.bonus.amount} onInput={(v) => set({ bonus: { ...s.bonus, amount: v || 0 } })} /></Field>
              <Field label={t('set.bonusEvery')}><NumInput value={s.bonus.everyMonths} onInput={(v) => set({ bonus: { ...s.bonus, everyMonths: Math.max(1, Math.round(v || 1)) } })} /></Field>
            </div>
            <Field label={t('set.bonusNext')}><input class="input n" type="date" value={s.bonus.nextDate} onInput={(e) => set({ bonus: { ...s.bonus, nextDate: (e.target as HTMLInputElement).value } })} /></Field>
            <Field label={t('set.bonusSplit')}>
              <div class="grid2">
                <NumInput value={s.bonus.toDebt} onInput={(v) => set({ bonus: { ...s.bonus, toDebt: Math.min(100, Math.max(0, v || 0)) } })} />
                <NumInput value={s.bonus.toSavings} onInput={(v) => set({ bonus: { ...s.bonus, toSavings: Math.min(100 - s.bonus.toDebt, Math.max(0, v || 0)) } })} />
              </div>
            </Field>
          </>
        )}
      </div>

      <span class="sec-title">{t('set.plan')}</span>
      <div class="card pad col gap12">
        <div class="grid2">
          <Field label={t('set.living')}><NumInput value={s.livingBudget} onInput={(v) => set({ livingBudget: v || 0 })} /></Field>
          <Field label={t('set.saveMonthly')}><NumInput value={s.saveMonthly} onInput={(v) => set({ saveMonthly: v || 0 })} /></Field>
          <Field label={t('set.emergencyTarget')}><NumInput value={s.emergencyTarget} onInput={(v) => set({ emergencyTarget: v || 0 })} /></Field>
          <Field label={t('set.emergencyAcc')}>
            <select class="select" value={s.emergencyAccountId ?? ''} onChange={(e) => set({ emergencyAccountId: (e.target as HTMLSelectElement).value || undefined })}>
              <option value="">—</option>
              {liquid.map((a) => <option value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          <Field label={t('set.remind')}><NumInput value={s.remindDays} onInput={(v) => set({ remindDays: Math.max(0, Math.round(v || 0)) })} /></Field>
          <Field label={t('set.subsCard')}>
            <select class="select" value={s.subscriptionsAccountId ?? ''} onChange={(e) => set({ subscriptionsAccountId: (e.target as HTMLSelectElement).value || undefined })}>
              <option value="">—</option>
              {accounts.map((a) => <option value={a.id}>{a.name}</option>)}
            </select>
          </Field>
        </div>
      </div>

      <span class="sec-title">{t('set.manage')}</span>
      <div class="card pad-x">
        {[
          ['/categories', 'grid', t('qa.cats')],
          ['/bills', 'repeat', t('qa.bills')],
          ['/trips', 'plane', t('qa.trips')],
          ['/txs', 'list', t('qa.txs')]
        ].map(([href, icon, label]) => (
          <a class="row" href={'#' + href}><span class="ib"><Icon name={icon} size={17} /></span><span class="grow semi">{label}</span></a>
        ))}
      </div>

      <span class="sec-title">{t('set.security')}</span>
      <div class="card pad-x">
        <div class="row">
          <span class="ib" style="color:var(--green-text);background:var(--green-soft);border-color:transparent"><Icon name="face" size={17} /></span>
          <span class="grow col gap4"><span class="semi">{t('set.bio')}</span><span class="xs faint">{bioSupported() ? t('set.bioSub') : t('set.bioNA')}</span></span>
          {bioSupported() && <Switch on={bio} onChange={toggleBio} label={t('set.bio')} />}
        </div>
        <div class="row">
          <span class="ib"><Icon name="eye" size={17} /></span>
          <span class="grow semi">{t('set.hide')}</span>
          <Switch on={s.hideAmounts} onChange={(v) => set({ hideAmounts: v })} label={t('set.hide')} />
        </div>
        <button class="row" onClick={() => setSheet('pass')}><span class="ib"><Icon name="key" size={17} /></span><span class="grow semi">{t('set.changePass')}</span></button>
        <button class="row" onClick={() => { lock(); onLock(); }}><span class="ib"><Icon name="lock" size={17} /></span><span class="grow semi">{t('set.lockNow')}</span></button>
      </div>

      <span class="sec-title">{t('set.data')}</span>
      <div class="card pad col gap12">
        <span class="small text2" style="line-height:1.7">{t('set.dataNote')}</span>
        <span class="xs muted">{s.lastBackupAt ? t('set.lastBackup', { d: fmtDay(s.lastBackupAt.slice(0, 10)) + ' ' + s.lastBackupAt.slice(11, 16) }) : t('set.never')}</span>
        <button class="btn" onClick={() => exportBackup().catch((e) => toast(String(e)))}><Icon name="download" size={17} />{t('set.backupNow')}</button>
        <span class="xs faint center" style="margin-top:-6px">{t('set.backupSub')}</span>
        <div class="grid2">
          <button class="btn ghost" onClick={() => { setDriveRestore(undefined); setSheet('restore'); }}>{t('set.restore')}</button>
          <button class="btn ghost" onClick={() => downloadText(`transactions-${new Date().toISOString().slice(0, 10)}.csv`, toCSV(d, (c) => (c ? catName(catById(d, c.id)) : '')))}>CSV</button>
        </div>
      </div>

      <div class="card pad col gap12">
        <div class="row-flex"><Icon name="cloud" size={20} /><span class="grow col gap4"><span class="semi">{t('set.drive')}</span><span class="xs faint">{t('set.driveSub')}</span></span></div>
        <Field label={t('set.driveClient')}>
          <input class="input num" style="font-size:12px" placeholder="xxxxxxxx.apps.googleusercontent.com" value={s.driveClientId ?? ''} onInput={(e) => set({ driveClientId: (e.target as HTMLInputElement).value.trim() || undefined })} />
        </Field>
        {s.lastDriveBackupAt && <span class="xs muted">{t('set.driveLast', { d: fmtDay(s.lastDriveBackupAt.slice(0, 10)) + ' ' + s.lastDriveBackupAt.slice(11, 16) })}</span>}
        <div class="grid2">
          <button class="btn sm" disabled={driveBusy} onClick={drive}>{t('set.driveConnect')}</button>
          <button class="btn sm ghost" disabled={driveBusy} onClick={driveGet}>{t('set.driveRestore')}</button>
        </div>
      </div>

      <button class="btn danger" onClick={async () => {
        if (!confirmDo(t('set.wipeConfirm'))) return;
        await wipeAll();
        location.reload();
      }}>{t('set.wipe')}</button>
      <span class="xs faint center">{t('set.installHint')}</span>
      <span class="xs faint center n">v{__APP_VERSION__}</span>

      {sheet === 'restore' && <RestoreSheet initial={driveRestore} onClose={() => setSheet(null)} onDone={() => { setSheet(null); navigate('/', true); }} />}
      {sheet === 'pass' && <PasswordSheet onClose={() => setSheet(null)} />}
    </div>
  );
}
