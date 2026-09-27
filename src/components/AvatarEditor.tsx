import { useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { t } from '../i18n';
import { Icon } from './Icon';
import { Sheet, Switch } from './ui';
import {
  Avatar, AVATAR_KINDS, BEARDS, BGS, HAIRS, HAIR_COLORS, OUTFITS, SKINS_TONE, TOPS, encodeSpec, presetSpec, type AvatarSpec
} from './Avatar';

function Swatches({ colors, value, onPick }: { colors: string[]; value: number; onPick: (i: number) => void }) {
  return (
    <div class="chips">
      {colors.map((c, i) => (
        <button type="button" aria-label={c} aria-pressed={i === value} onClick={() => onPick(i)} style={{ width: '32px', height: '32px', borderRadius: '999px', background: c, border: '2px solid ' + (i === value ? 'var(--accent)' : 'var(--line-2)'), boxShadow: i === value ? '0 0 0 2px var(--bg) inset' : undefined, padding: 0 }} />
      ))}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ComponentChildren }) {
  return (
    <div class="col gap6">
      <span class="xs semi muted">{label}</span>
      {children}
    </div>
  );
}

/** Build your own avatar from parts; the result is a compact code stored like any other avatar. */
export function AvatarEditor({ value, name, onSave, onClose }: { value?: string; name?: string; onSave: (avatar: string) => void; onClose: () => void }) {
  const [s, setS] = useState<AvatarSpec>(presetSpec(value ?? 'ghutra'));
  const set = (p: Partial<AvatarSpec>) => setS((x) => ({ ...x, ...p }));
  const code = encodeSpec(s);
  const random = () => {
    const r = (n: number) => Math.floor(Math.random() * n);
    setS({ top: TOPS[r(TOPS.length)], hair: HAIRS[r(HAIRS.length)], hairColor: r(HAIR_COLORS.length), beard: BEARDS[r(BEARDS.length)], skin: r(SKINS_TONE.length), glasses: Math.random() < 0.25, outfit: r(OUTFITS.length), bg: r(BGS.length), kid: Math.random() < 0.1 });
  };
  const chips = <T extends string>(list: T[], v: T, on: (x: T) => void, key: string) => (
    <div class="chips">
      {list.map((x) => <button type="button" class={'chip solid' + (x === v ? ' on' : '')} onClick={() => on(x)}>{t((key + '.' + x) as 'av.top.none')}</button>)}
    </div>
  );
  return (
    <Sheet onClose={onClose} title={t('av.title')}>
      <div class="row-flex" style="gap:16px">
        <div style="padding:4px;border-radius:999px;border:1px solid var(--line-2)"><Avatar kind={code} name={name} size={96} /></div>
        <div class="col gap8 grow">
          <span class="xs muted" style="line-height:1.6">{t('av.sub')}</span>
          <button type="button" class="btn sm ghost" onClick={random}><Icon name="repeat" size={15} />{t('av.random')}</button>
        </div>
      </div>
      <Row label={t('av.start')}>
        <div class="chips scroll">
          {AVATAR_KINDS.filter((k) => k !== 'initial' && k !== 'photo').map((k) => (
            <button type="button" aria-label={k} onClick={() => setS(presetSpec(k))} style="padding:0;border:0;background:none;border-radius:999px"><Avatar kind={k} size={40} /></button>
          ))}
        </div>
      </Row>
      <Row label={t('av.topL')}>{chips(TOPS, s.top, (v) => set({ top: v }), 'av.top')}</Row>
      {(s.top === 'none') && <Row label={t('av.hairL')}>{chips(HAIRS, s.hair, (v) => set({ hair: v }), 'av.hair')}</Row>}
      {s.top !== 'hijab' && <Row label={t('av.hairColor')}><Swatches colors={HAIR_COLORS} value={s.hairColor} onPick={(i) => set({ hairColor: i })} /></Row>}
      {s.top !== 'hijab' && !s.kid && <Row label={t('av.beardL')}>{chips(BEARDS, s.beard, (v) => set({ beard: v }), 'av.beard')}</Row>}
      <Row label={t('av.skin')}><Swatches colors={SKINS_TONE} value={s.skin} onPick={(i) => set({ skin: i })} /></Row>
      <Row label={t('av.outfit')}><Swatches colors={OUTFITS} value={s.outfit} onPick={(i) => set({ outfit: i })} /></Row>
      <Row label={t('av.bg')}><Swatches colors={BGS} value={s.bg} onPick={(i) => set({ bg: i })} /></Row>
      <div class="between small"><span>{t('av.glasses')}</span><Switch on={s.glasses} onChange={(v) => set({ glasses: v })} label={t('av.glasses')} /></div>
      <div class="between small"><span>{t('av.kid')}</span><Switch on={s.kid} onChange={(v) => set({ kid: v })} label={t('av.kid')} /></div>
      <button class="btn" onClick={() => onSave(code)}>{t('save')}</button>
    </Sheet>
  );
}
