import React from 'react';
import { ElectionCycle } from '../../../utils/types';
import { getPMProfile } from '../../../utils/pmProfiles';
import { PM_TONES } from '../../desk/deskTheme';

/** The scene is drawn on a fixed 1440 × 900 stage and scaled to cover the screen. */
export const STAGE_W = 1440;
export const STAGE_H = 900;

/** The press pack, seen from behind: [x, y, size, camera flash delay (0 = holds a mic, no camera)]. */
export const CROWD_SPOTS: [number, number, number, number][] = [
  [-30, 660, 1.0, 0], [150, 690, 1.08, 1.3], [330, 650, 0.95, 0], [470, 700, 1.12, 0.2],
  [880, 690, 1.1, 0], [1050, 650, 0.95, 2.1], [1220, 680, 1.05, 0], [1350, 700, 1.0, 0.9],
  [60, 760, 1.25, 0], [300, 770, 1.3, 0], [1000, 770, 1.3, 0], [1240, 760, 1.25, 2.6],
];
/** Which crowd member asks when the question comes from the left / the right. */
export const ASKER_LEFT = 2;
export const ASKER_RIGHT = 6;

/** Centre of a crowd member's head, in stage coordinates. */
export function crowdHeadCentre(i: number): { x: number; y: number } {
  const [x, y, k] = CROWD_SPOTS[i];
  return { x: x + (170 * k) / 2, y: y + (74 * k) / 2 };
}

const COATS = ['#141418', '#1b1d24', '#16181d', '#1f1c1a', '#111317'];
const HAIRS = ['#0c0a09', '#1c1917', '#3f2a1d', '#27272a', '#57534e', '#2a1a10'];

/** How each PM is drawn (skin and hair), matching their emoji on the level select. */
const PM_LOOKS: Record<ElectionCycle, { skin: string; hair: string; style: 'long' | 'bun' | 'short' }> = {
  [ElectionCycle.Benthamite]: { skin: '#f3d2b8', hair: '#d6b25e', style: 'long' },
  [ElectionCycle.Rawlsian]: { skin: '#8d5524', hair: '#1c1917', style: 'bun' },
  [ElectionCycle.SocietalUtility]: { skin: '#c68642', hair: '#3f2a1d', style: 'long' },
  [ElectionCycle.PersonalUtility]: { skin: '#5c3a21', hair: '#0c0a09', style: 'short' },
};

interface PressSceneProps {
  cycle: ElectionCycle;
  /** Crowd index of whoever is asking (gets a name tag), or null. */
  askerIndex: number | null;
  askerName: string;
}

const abs = (s: React.CSSProperties): React.CSSProperties => ({ position: 'absolute', ...s });

/**
 * Downing Street at night: the door, the PM at a lectern in their colours,
 * and the press pack from behind with cameras going off. Purely visual.
 */
export default function PressScene({ cycle, askerIndex, askerName }: PressSceneProps) {
  const tone = PM_TONES[cycle];
  const profile = getPMProfile(cycle);
  const look = PM_LOOKS[cycle];
  const pmName = profile.name.replace(/^PM\s+/, '').toUpperCase();

  // The PM, behind the lectern (only the top half shows)
  const sc = 1.7;
  const w = 90 * sc, headD = 38 * sc, bodyW = 60 * sc, bodyTop = 34 * sc, bodyL = (w - bodyW) / 2;
  const headL = (w - headD) / 2;
  const hair: React.CSSProperties =
    look.style === 'long'
      ? { left: headL - 3 * sc, top: -2 * sc, width: headD + 6 * sc, height: 30 * sc, borderRadius: `${headD}px ${headD}px ${8 * sc}px ${8 * sc}px` }
      : { left: headL, top: 0, width: headD, height: (look.style === 'bun' ? 15 : 13) * sc, borderRadius: `${headD}px ${headD}px 0 0` };

  return (
    <div style={{ position: 'relative', width: STAGE_W, height: STAGE_H, overflow: 'hidden', background: '#0b0d12' }} aria-hidden="true">
      {/* Brick front, warm light from the door */}
      <div className="press-brick" style={abs({ left: 0, right: 0, top: 0, height: 640 })} />
      <div style={abs({ left: 0, right: 0, top: 0, height: 640, background: 'radial-gradient(ellipse at 50% 30%, rgba(253,230,138,.16), transparent 55%)' })} />

      {/* Door, fanlight, number, knocker, lantern */}
      <div style={abs({ left: 600, top: 40, width: 240, height: 120, background: '#e7e5e4', borderRadius: '120px 120px 0 0' })} />
      <div style={abs({ left: 616, top: 56, width: 208, height: 104, borderRadius: '104px 104px 0 0', background: 'repeating-conic-gradient(from -90deg at 50% 100%, #1f2937 0 3deg, #fde68a 3deg 22deg)', opacity: 0.85 })} />
      <div style={abs({ left: 600, top: 160, width: 240, height: 430, background: '#e7e5e4' })} />
      <div style={abs({ left: 616, top: 166, width: 208, height: 424, background: 'linear-gradient(180deg, #0f1115, #1a1d24)', boxShadow: 'inset 0 0 0 6px #0a0b0e' })} />
      <div style={abs({ left: 636, top: 196, width: 72, height: 150, boxShadow: 'inset 0 0 0 4px #24272f' })} />
      <div style={abs({ left: 732, top: 196, width: 72, height: 150, boxShadow: 'inset 0 0 0 4px #24272f' })} />
      <div className="font-display" style={abs({ left: 696, top: 368, width: 48, textAlign: 'center', fontWeight: 900, fontSize: 34, color: '#d6b25e' })}>10</div>
      <div style={abs({ left: 704, top: 418, width: 32, height: 32, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, #f5d77f, #9a7526)' })} />
      <div style={abs({ left: 712, top: 0, width: 16, height: 36, background: '#111' })} />
      <div style={abs({ left: 690, top: 18, width: 60, height: 24, background: '#111', borderRadius: '6px 6px 0 0' })} />

      {/* Windows either side */}
      <div style={abs({ left: 340, top: 120, width: 150, height: 230, background: 'linear-gradient(180deg, #3a3326, #1b1712)', boxShadow: 'inset 0 0 0 8px #e7e5e4, inset 0 0 0 12px #2a201b' })} />
      <div style={abs({ left: 950, top: 120, width: 150, height: 230, background: 'linear-gradient(180deg, #3a3326, #1b1712)', boxShadow: 'inset 0 0 0 8px #e7e5e4, inset 0 0 0 12px #2a201b' })} />

      {/* Railings and pavement */}
      <div style={abs({ left: 0, right: 0, top: 520, height: 4, background: '#111' })} />
      <div style={abs({ left: 0, width: 560, top: 520, height: 90, background: 'repeating-linear-gradient(90deg, #111 0 4px, transparent 4px 26px)' })} />
      <div style={abs({ left: 880, right: 0, top: 520, height: 90, background: 'repeating-linear-gradient(90deg, #111 0 4px, transparent 4px 26px)' })} />
      <div style={abs({ left: 0, right: 0, top: 600, bottom: 0, background: 'linear-gradient(180deg, #2b2d33, #121317)' })} />

      {/* The PM */}
      <div style={abs({ left: STAGE_W / 2 - w / 2, top: 300, width: w, height: 300 })}>
        <div style={abs({ left: bodyL, top: bodyTop, width: bodyW, height: 140, background: '#1e293b', borderRadius: `${20 * sc}px ${20 * sc}px 8px 8px` })} />
        <div style={abs({ left: w / 2 - 8 * sc, top: bodyTop, width: 16 * sc, height: 20 * sc, background: '#f1f5f9', clipPath: 'polygon(0 0, 100% 0, 50% 100%)' })} />
        <div style={abs({ left: bodyL + bodyW * 0.64, top: bodyTop + 16 * sc, width: 13 * sc, height: 13 * sc, borderRadius: '50%', background: tone.color, boxShadow: '0 0 0 3px #ffffff' })} />
        {look.style === 'bun' && (
          <div style={abs({ left: (w - 18 * sc) / 2, top: -11 * sc, width: 18 * sc, height: 18 * sc, borderRadius: '50%', background: look.hair })} />
        )}
        <div style={abs({ left: headL, top: 0, width: headD, height: headD, borderRadius: '50%', background: look.skin })} />
        <div style={abs({ ...hair, background: look.hair })} />
        <div style={abs({ left: bodyL - 2, top: 162, width: 13 * sc, height: 13 * sc, borderRadius: '50%', background: look.skin })} />
        <div style={abs({ left: bodyL + bodyW - 13 * sc + 2, top: 162, width: 13 * sc, height: 13 * sc, borderRadius: '50%', background: look.skin })} />
      </div>

      {/* Lectern: mics, top, front plate in the PM's colour */}
      <div style={abs({ left: 676, top: 410, width: 6, height: 70, background: '#27272a', transform: 'rotate(-14deg)', transformOrigin: '50% 100%' })} />
      <div style={abs({ left: 758, top: 410, width: 6, height: 70, background: '#27272a', transform: 'rotate(14deg)', transformOrigin: '50% 100%' })} />
      <div style={abs({ left: 664, top: 402, width: 18, height: 26, borderRadius: 9, background: '#18181b', transform: 'rotate(-14deg)' })} />
      <div style={abs({ left: 760, top: 402, width: 18, height: 26, borderRadius: 9, background: '#18181b', transform: 'rotate(14deg)' })} />
      <div style={abs({ left: 596, top: 474, width: 248, height: 22, background: '#2a1a10', borderRadius: 4, boxShadow: '0 4px 0 #1a0f08' })} />
      <div style={abs({ left: 614, top: 496, width: 212, height: 190, background: 'linear-gradient(90deg, #3a2414, #5a3a20 50%, #3a2414)', clipPath: 'polygon(0 0, 100% 0, 92% 100%, 8% 100%)' })} />
      <div style={abs({ left: 640, top: 520, width: 160, padding: '10px 6px', background: tone.dark, textAlign: 'center', boxShadow: `0 0 0 3px ${tone.light}` })}>
        <div style={{ fontWeight: 900, fontSize: 15, letterSpacing: '.08em', textTransform: 'uppercase', color: '#ffffff' }}>{profile.slogan}</div>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.14em', color: 'rgba(255,255,255,.8)', marginTop: 2 }}>{pmName}</div>
      </div>

      {/* Flashes wash over everything */}
      <div className="press-wash" style={abs({ inset: 0, background: '#ffffff', pointerEvents: 'none', animationDelay: '.4s' })} />

      {/* The press, from behind */}
      {CROWD_SPOTS.map(([x, y, k, fd], i) => {
        const pw = 170 * k, hd = 74 * k, camW = 84 * k, camH = 56 * k;
        const coat = COATS[i % COATS.length];
        return (
          <div key={i} style={abs({ left: x, top: y, width: pw, height: 300, zIndex: askerIndex === i ? 20 : undefined })}>
            {fd > 0 && (
              <>
                <div style={abs({ left: (pw - camW) / 2 + 4 * k, top: -40 * k, width: 22 * k, height: 92 * k, background: coat, borderRadius: 8, transform: 'rotate(-10deg)' })} />
                <div style={abs({ left: (pw + camW) / 2 - 2 * k, top: -40 * k, width: 22 * k, height: 92 * k, background: coat, borderRadius: 8, transform: 'rotate(10deg)' })} />
                <div style={abs({ left: (pw - camW) / 2 + 10 * k, top: -camH - 34 * k, width: camW, height: camH, background: '#18181b', borderRadius: 5, boxShadow: '0 0 0 2px #3f3f46' })}>
                  <div style={abs({ left: '18%', top: '22%', width: '64%', height: '56%', background: '#1e3a5f', borderRadius: 2, opacity: 0.8 })} />
                  <div style={abs({ right: 6, top: -12, width: 22, height: 12, background: '#52525b', borderRadius: '3px 3px 0 0' })} />
                  <div className="press-flash" style={abs({ right: -68, top: -96, width: 170, height: 170, borderRadius: '50%', background: 'radial-gradient(circle, #ffffff 0 8%, rgba(255,255,255,.75) 18%, transparent 68%)', animationDelay: `${fd}s`, pointerEvents: 'none' })} />
                </div>
              </>
            )}
            <div style={abs({ left: 0, top: hd * 0.78, width: pw, height: 220, background: coat, borderRadius: `${70 * k}px ${70 * k}px 0 0`, boxShadow: 'inset 0 3px 0 rgba(255,255,255,.07)' })} />
            <div style={abs({ left: (pw - hd) / 2, top: 0, width: hd, height: hd, borderRadius: '50%', background: HAIRS[(i * 5) % HAIRS.length], boxShadow: 'inset 0 3px 0 rgba(255,255,255,.08)' })} />
            {askerIndex === i && (
              <span className="press-bob" style={abs({ left: '50%', top: -34, whiteSpace: 'nowrap', background: '#fde68a', color: '#1c1917', fontSize: 12, fontWeight: 900, padding: '4px 9px', borderRadius: 6 })}>
                ▼ {askerName}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}