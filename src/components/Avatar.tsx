import { Icon } from './Icon';

// Flat illustrated avatars for people you lend to / borrow from.

const SH = 'M6 66 C8 53 19 48 32 48 C45 48 56 53 58 66 Z';
const HAIR_SHORT = 'M22.4 29 C21.8 18.5 26.6 15.4 32 15.4 C37.6 15.4 42.4 18.6 41.6 29 C40.6 23.6 37.4 21.6 32 21.6 C26.8 21.6 23.4 23.4 22.4 29 Z';
const BEARD = 'M22.6 31.5 C22.8 41.5 27 46 32 46 C37 46 41.2 41.5 41.4 31.5 C40.4 35.6 37.4 36.6 35 36.4 C33.6 35.6 30.4 35.6 29 36.4 C26.6 36.6 23.6 35.6 22.6 31.5 Z';
const DRAPE = 'M19.6 27 C19.6 14.2 25.4 9.6 32 9.6 C38.6 9.6 44.4 14.2 44.4 27 L47.6 55 C45 53.6 42.4 51.6 41 49.4 L41.4 29 C41.4 23.6 37.6 21 32 21 C26.4 21 22.6 23.6 22.6 29 L23 49.4 C21.6 51.6 19 53.6 16.4 55 Z';
const EDGE = 'M23 49.4 L22.6 29 C22.6 23.6 26.4 21 32 21 C37.6 21 41.4 23.6 41.4 29 L41 49.4';

interface Look {
  bg: string; shoulders: string; shirt: string; shirtLine: string; shirtLineC: string; drape: string; drapeC: string; neckY: number; earsOp: number; earY: number;
  faceY: number; faceRx: number; faceRy: number; skin: string; skinShade: string; hair: string; hairC: string; beard: string; beardC: string; dy: number;
  browC: string; mouthC: string; mouthOp: number; glassesOp: number; edge: string; edgeC: string; agalOp: number; cap: string; capC: string; brim: string; brimC: string;
}

const base: Look = {
  bg: '#2A221C', shoulders: SH, shirt: '#EDE7DC', shirtLine: 'M32 49 V58', shirtLineC: '#CFC6B8', drape: '', drapeC: 'none', neckY: 39, earsOp: 1, earY: 31,
  faceY: 31, faceRx: 9.6, faceRy: 11.6, skin: '#C98E63', skinShade: '#A8714A', hair: '', hairC: 'none', beard: '', beardC: 'none', dy: 0,
  browC: '#1C1410', mouthC: '#8A4E36', mouthOp: 1, glassesOp: 0, edge: '', edgeC: 'none', agalOp: 0, cap: '', capC: 'none', brim: '', brimC: 'none'
};

const KINDS: Record<string, Partial<Look>> = {
  ghutra: { bg: '#3A2A1F', drape: DRAPE, drapeC: '#B7343C', edge: EDGE, edgeC: '#F1ECE4', earsOp: 0, agalOp: 1, beard: BEARD, beardC: '#221710', mouthC: '#C99A80', mouthOp: 0.9 },
  white: { bg: '#2C3A52', skin: '#D9A27A', skinShade: '#B98159', drape: DRAPE, drapeC: '#F2EFE8', edge: EDGE, edgeC: '#D2CBBE', earsOp: 0, agalOp: 1, beard: BEARD, beardC: '#2B1D14', mouthC: '#D8AE92', mouthOp: 0.9 },
  beard: { bg: '#2A3A30', skin: '#B97A50', skinShade: '#99603C', hair: HAIR_SHORT, hairC: '#17110D', beard: BEARD, beardC: '#17110D', mouthC: '#C08A6E', mouthOp: 0.9 },
  young: { bg: '#3A2633', skin: '#E2B08A', skinShade: '#C48E68', shirt: '#DD6220', shirtLine: 'M24 49 Q32 56 40 49', shirtLineC: '#A8471A', hair: 'M22 29.5 C20.8 17 27 12.6 33.4 13.2 C39.6 13.8 43.4 18.4 42 28.6 C40.8 23.4 38.2 21.6 35.2 20.8 C31.2 22.2 27 22.2 24 23 C22.9 25 22.4 27.2 22 29.5 Z', hairC: '#2A1C14' },
  glasses: { bg: '#33302A', skin: '#D09A70', skinShade: '#B07A52', hair: HAIR_SHORT, hairC: '#9A948C', beard: 'M24 36.5 C25 42.5 28 45.6 32 45.6 C36 45.6 39 42.5 40 36.5 C38 38 35.6 37.6 32 37.6 C28.4 37.6 26 38 24 36.5 Z', beardC: '#7B766F', browC: '#6E6A64', glassesOp: 1, mouthOp: 0 },
  hijab: { bg: '#3B2A2E', skin: '#E0AC84', skinShade: '#C28D66', shoulders: 'M4 66 C6 52 17 47 32 47 C47 47 58 52 60 66 Z', shirt: '#6A3E4E', shirtLine: '', drape: 'M18.6 32 C18.6 16.8 24.8 10.6 32 10.6 C39.2 10.6 45.4 16.8 45.4 32 C45.4 40 44.2 46 48 56 L16 56 C19.8 46 18.6 40 18.6 32 Z', drapeC: '#7A4A5A', edge: 'M22.4 40 C21.6 36 21.8 26 24 23.4 C26.2 21 29 20.4 32 20.4 C35 20.4 37.8 21 40 23.4 C42.2 26 42.4 36 41.6 40', edgeC: '#8E5A6B', earsOp: 0, browC: '#3A2418', mouthC: '#B0604E' },
  cap: { bg: '#1F3340', skin: '#A86F48', skinShade: '#8A5634', shirt: '#3A5F7A', shirtLine: 'M24 49 Q32 55 40 49', shirtLineC: '#2C4A60', beard: 'M23.2 34 C23.8 41.6 27.4 45.4 32 45.4 C36.6 45.4 40.2 41.6 40.8 34 C39.6 37.4 36.8 38.4 32 38.4 C27.2 38.4 24.4 37.4 23.2 34 Z', beardC: '#3A2A20', mouthC: '#C08A6E', cap: 'M21.4 25.6 C21.4 16.4 26 12.8 32 12.8 C38 12.8 42.6 16.4 42.6 25.6 Z', capC: '#DD6220', brim: 'M21 24.6 H44.6 C47 24.6 47.6 26.6 45.6 27.4 H22.6 C21.4 27.4 20.8 25.6 21 24.6 Z', brimC: '#A8471A' },
  kid: { bg: '#3A3520', skin: '#EDC09A', skinShade: '#CF9E78', shirt: '#5B8FD0', shirtLine: 'M25 49 Q32 54 39 49', shirtLineC: '#3F6FA8', faceY: 33, faceRx: 10.4, faceRy: 11.4, earY: 33, neckY: 41, dy: 2, hair: 'M21.4 31 C20.8 20.4 26 16 32 16 C38 16 43.2 20.4 42.6 31 C40.4 25.6 36.4 23.8 32 24.2 C27.6 23.8 23.6 25.6 21.4 31 Z', hairC: '#3A2616' }
};

export const AVATAR_KINDS = ['ghutra', 'white', 'beard', 'glasses', 'young', 'cap', 'hijab', 'kid', 'initial', 'photo'];

// ---------- custom avatars: "c:top.hair.hairColor.beard.skin.glasses.outfit.bg.kid" ----------

export type Top = 'none' | 'shemagh' | 'ghutra' | 'cap' | 'hijab';
export type Hair = 'bald' | 'short' | 'fade' | 'curly';
export type Beard = 'none' | 'mustache' | 'goatee' | 'short' | 'full';

export interface AvatarSpec {
  top: Top;
  hair: Hair;
  hairColor: number;
  beard: Beard;
  skin: number;
  glasses: boolean;
  outfit: number;
  bg: number;
  kid: boolean;
}

export const TOPS: Top[] = ['none', 'shemagh', 'ghutra', 'cap', 'hijab'];
export const HAIRS: Hair[] = ['bald', 'short', 'fade', 'curly'];
export const BEARDS: Beard[] = ['none', 'mustache', 'goatee', 'short', 'full'];
export const SKINS_TONE = ['#F2CDA8', '#E6B48E', '#D6A078', '#C98E63', '#B37648', '#8C5A36'];
export const HAIR_COLORS = ['#17110D', '#2E1E14', '#5A3A22', '#8A5A2E', '#9A948C', '#E3DED6'];
export const OUTFITS = ['#EDE7DC', '#DD6220', '#3A5F7A', '#5B8FD0', '#6A3E4E', '#2F7A5E', '#2A2A2A', '#C9A227'];
export const BGS = ['#2A221C', '#3A2A1F', '#2C3A52', '#2A3A30', '#3A2633', '#1F3340', '#3A3520', '#E9DDD0', '#D8E6F2', '#E3F0E8'];

const HAIR_PATHS: Record<Hair, string> = {
  bald: '',
  short: HAIR_SHORT,
  fade: 'M22 29.5 C20.8 17 27 12.6 33.4 13.2 C39.6 13.8 43.4 18.4 42 28.6 C40.8 23.4 38.2 21.6 35.2 20.8 C31.2 22.2 27 22.2 24 23 C22.9 25 22.4 27.2 22 29.5 Z',
  curly: 'M21.6 29 C20.4 19 25 14.2 28 14.6 C29 12.8 31.6 12.6 33 13.8 C34.8 12.6 37.6 13.2 38.4 15 C41.4 15.4 43.6 19.6 42.4 29 C41.2 24 38.4 22 35 21.8 C33 22.6 30.6 22.6 28.8 21.8 C25.4 22 22.8 24 21.6 29 Z'
};
const BEARD_PATHS: Record<Beard, string> = {
  none: '',
  mustache: 'M28.2 36.2 C29.6 35.2 31 35.4 32 36 C33 35.4 34.4 35.2 35.8 36.2 C34.6 37 33.2 37 32 36.6 C30.8 37 29.4 37 28.2 36.2 Z',
  goatee: 'M28.2 36.2 C29.6 35.2 31 35.4 32 36 C33 35.4 34.4 35.2 35.8 36.2 C34.6 37 33.2 37 32 36.6 C30.8 37 29.4 37 28.2 36.2 Z M29 38.8 C29.4 42.6 30.6 44.6 32 44.6 C33.4 44.6 34.6 42.6 35 38.8 C34 39.6 33 39.8 32 39.8 C31 39.8 30 39.6 29 38.8 Z',
  short: 'M24 36.5 C25 42.5 28 45.6 32 45.6 C36 45.6 39 42.5 40 36.5 C38 38 35.6 37.6 32 37.6 C28.4 37.6 26 38 24 36.5 Z',
  full: BEARD
};

function shade(hex: string, f: number): string {
  const h = hex.replace('#', '');
  const c = [0, 2, 4].map((i) => Math.max(0, Math.min(255, Math.round(parseInt(h.slice(i, i + 2), 16) * f))));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

export const DEFAULT_SPEC: AvatarSpec = { top: 'shemagh', hair: 'short', hairColor: 0, beard: 'full', skin: 3, glasses: false, outfit: 0, bg: 1, kid: false };

export function encodeSpec(s: AvatarSpec): string {
  return 'c:' + [s.top, s.hair, s.hairColor, s.beard, s.skin, s.glasses ? 1 : 0, s.outfit, s.bg, s.kid ? 1 : 0].join('.');
}

export function decodeSpec(v?: string): AvatarSpec | null {
  if (!v?.startsWith('c:')) return null;
  const [top, hair, hairColor, beard, skin, glasses, outfit, bg, kid] = v.slice(2).split('.');
  const pick = <T,>(list: T[], x: string, d: T) => (list.includes(x as T) ? (x as T) : d);
  const num = (x: string, max: number, d: number) => (Number.isInteger(+x) && +x >= 0 && +x < max ? +x : d);
  return {
    top: pick(TOPS, top, 'none'), hair: pick(HAIRS, hair, 'short'), hairColor: num(hairColor, HAIR_COLORS.length, 0), beard: pick(BEARDS, beard, 'none'),
    skin: num(skin, SKINS_TONE.length, 3), glasses: glasses === '1', outfit: num(outfit, OUTFITS.length, 0), bg: num(bg, BGS.length, 1), kid: kid === '1'
  };
}

/** A starting point in the editor for each ready-made avatar. */
export function presetSpec(kind: string): AvatarSpec {
  const custom = decodeSpec(kind);
  if (custom) return custom;
  const p: Record<string, Partial<AvatarSpec>> = {
    ghutra: { top: 'shemagh', beard: 'full', skin: 3, bg: 1 },
    white: { top: 'ghutra', beard: 'full', skin: 2, bg: 2 },
    beard: { top: 'none', hair: 'short', beard: 'full', skin: 4, bg: 3 },
    glasses: { top: 'none', hair: 'short', hairColor: 4, beard: 'short', skin: 2, glasses: true, bg: 0 },
    young: { top: 'none', hair: 'fade', hairColor: 1, beard: 'none', skin: 1, outfit: 1, bg: 4 },
    cap: { top: 'cap', hair: 'short', beard: 'short', skin: 4, outfit: 1, bg: 5 },
    hijab: { top: 'hijab', beard: 'none', skin: 1, outfit: 4, bg: 4 },
    kid: { top: 'none', hair: 'short', hairColor: 1, beard: 'none', skin: 0, outfit: 3, bg: 6, kid: true }
  };
  return { ...DEFAULT_SPEC, ...(p[kind] ?? {}) };
}

function lookFromSpec(s: AvatarSpec): Look {
  const skin = SKINS_TONE[s.skin];
  const hairC = HAIR_COLORS[s.hairColor];
  const outfit = OUTFITS[s.outfit];
  const covered = s.top === 'shemagh' || s.top === 'ghutra' || s.top === 'hijab';
  const beard = s.kid || s.top === 'hijab' ? 'none' : s.beard;
  const l: Look = {
    ...base,
    bg: BGS[s.bg],
    skin,
    skinShade: shade(skin, 0.84),
    shirt: outfit,
    shirtLine: s.outfit === 0 ? 'M32 49 V58' : 'M24 49 Q32 55 40 49',
    shirtLineC: shade(outfit, 0.78),
    hair: covered || s.top === 'cap' ? '' : HAIR_PATHS[s.hair],
    hairC,
    beard: BEARD_PATHS[beard],
    beardC: hairC,
    browC: s.hairColor >= 4 ? shade(hairC, 0.7) : '#1C1410',
    mouthC: beard === 'full' || beard === 'short' ? shade(skin, 1.08) : '#8A4E36',
    mouthOp: beard === 'short' ? 0 : 0.9,
    glassesOp: s.glasses ? 1 : 0
  };
  if (s.kid) Object.assign(l, { faceY: 33, faceRx: 10.4, faceRy: 11.4, earY: 33, neckY: 41, dy: 2 });
  if (s.top === 'shemagh' || s.top === 'ghutra') {
    Object.assign(l, { drape: DRAPE, drapeC: s.top === 'shemagh' ? '#B7343C' : '#F2EFE8', edge: EDGE, edgeC: s.top === 'shemagh' ? '#F1ECE4' : '#D2CBBE', earsOp: 0, agalOp: 1 });
  } else if (s.top === 'hijab') {
    Object.assign(l, KINDS.hijab, { bg: BGS[s.bg], skin, skinShade: shade(skin, 0.84), shirt: outfit, drapeC: shade(outfit, 1.12), edgeC: shade(outfit, 1.3), glassesOp: s.glasses ? 1 : 0 });
  } else if (s.top === 'cap') {
    Object.assign(l, { cap: KINDS.cap.cap, capC: outfit === '#EDE7DC' ? '#DD6220' : outfit, brim: KINDS.cap.brim, brimC: shade(outfit === '#EDE7DC' ? '#DD6220' : outfit, 0.75) });
  }
  return l;
}

export function Avatar({ kind, size = 44, name = '', photo }: { kind: string; size?: number; name?: string; photo?: string }) {
  const box = { width: size + 'px', height: size + 'px', borderRadius: '999px', overflow: 'hidden', position: 'relative' as const, flexShrink: 0, display: 'inline-block' };
  if (kind === 'photo' && photo) return <span style={box}><img src={photo} alt="" style="width:100%;height:100%;object-fit:cover" /></span>;
  const custom = decodeSpec(kind);
  if (kind === 'initial' || (!KINDS[kind] && !custom)) {
    return (
      <span style={{ ...box, background: '#3A2A1F', color: '#F0C9A0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: Math.round(size * 0.4) + 'px' }}>
        {kind === 'photo' ? <Icon name="camera" size={Math.round(size * 0.45)} /> : (name.trim()[0] ?? '؟')}
      </span>
    );
  }
  const a = custom ? lookFromSpec(custom) : { ...base, ...KINDS[kind] };
  return (
    <span style={{ ...box, background: a.bg }}>
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
        <path d={a.shoulders} fill={a.shirt} />
        {a.shirtLine && <path d={a.shirtLine} fill="none" stroke={a.shirtLineC} stroke-width="1.2" stroke-linecap="round" />}
        {a.drape && <path d={a.drape} fill={a.drapeC} />}
        <rect x="28" y={a.neckY} width="8" height="8" rx="3" fill={a.skinShade} />
        {a.earsOp > 0 && (
          <g>
            <ellipse cx="22.4" cy={a.earY} rx="1.8" ry="2.8" fill={a.skinShade} />
            <ellipse cx="41.6" cy={a.earY} rx="1.8" ry="2.8" fill={a.skinShade} />
          </g>
        )}
        <ellipse cx="32" cy={a.faceY} rx={a.faceRx} ry={a.faceRy} fill={a.skin} />
        {a.hair && <path d={a.hair} fill={a.hairC} />}
        {a.beard && <path d={a.beard} fill={a.beardC} />}
        <g transform={`translate(0 ${a.dy})`}>
          <path d="M26.4 27.4 Q28.4 26.3 30.4 27.1 M33.6 27.1 Q35.6 26.3 37.6 27.4" fill="none" stroke={a.browC} stroke-width="1.3" stroke-linecap="round" />
          <ellipse cx="28.6" cy="30.6" rx="1.15" ry="1.35" fill="#22160F" />
          <ellipse cx="35.4" cy="30.6" rx="1.15" ry="1.35" fill="#22160F" />
          <path d="M32 31.5 Q31.3 34 32.6 34.4" fill="none" stroke={a.skinShade} stroke-width="1.1" stroke-linecap="round" />
          <path d="M29.6 37.4 Q32 39.2 34.4 37.4" fill="none" stroke={a.mouthC} stroke-width="1.3" stroke-linecap="round" opacity={a.mouthOp} />
          {a.glassesOp > 0 && (
            <g fill="none" stroke="#1B1714" stroke-width="1.3">
              <rect x="24.8" y="28" width="7" height="5.4" rx="2" />
              <rect x="32.2" y="28" width="7" height="5.4" rx="2" />
              <path d="M31.8 30h.4" />
            </g>
          )}
        </g>
        {a.edge && <path d={a.edge} fill="none" stroke={a.edgeC} stroke-width="1.4" stroke-linejoin="round" />}
        {a.agalOp > 0 && (
          <g fill="none" stroke="#141210" stroke-linecap="round">
            <path d="M20.8 16.6 Q32 11.4 43.2 16.6" stroke-width="2.6" />
            <path d="M21.4 19.6 Q32 14.6 42.6 19.6" stroke-width="2.2" />
          </g>
        )}
        {a.cap && <path d={a.cap} fill={a.capC} />}
        {a.brim && <path d={a.brim} fill={a.brimC} />}
      </svg>
    </span>
  );
}
