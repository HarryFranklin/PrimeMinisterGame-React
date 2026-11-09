import React from 'react';
import { ElectionCycle } from '../../../utils/types';
import { PM_TONES } from '../../desk/deskTheme';
import { PM_LOOKS } from './PressScene';

interface PMFigureProps {
  cycle: ElectionCycle;
  /** 1 = 90 × 180 px. */
  scale: number;
  /** Arms down, or both up in celebration. */
  pose?: 'standing' | 'cheering';
  /** Show legs (full figure) or stop at the waist. */
  legs?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const abs = (s: React.CSSProperties): React.CSSProperties => ({ position: 'absolute', ...s });

/** The PM, drawn the same way as on the posters and at the lectern. */
export default function PMFigure({ cycle, scale: s, pose = 'standing', legs = false, className, style }: PMFigureProps) {
  const look = PM_LOOKS[cycle];
  const tone = PM_TONES[cycle];
  const w = 90 * s, headD = 38 * s, bodyW = 56 * s, bodyH = 78 * s, bodyTop = 34 * s;
  const bodyL = (w - bodyW) / 2, armW = 13 * s, armH = 70 * s, legW = 19 * s, legH = 62 * s;
  const headL = (w - headD) / 2;
  const hair: React.CSSProperties =
    look.style === 'long'
      ? { left: headL - 3 * s, top: -2 * s, width: headD + 6 * s, height: 30 * s, borderRadius: `${headD}px ${headD}px ${8 * s}px ${8 * s}px` }
      : { left: headL, top: 0, width: headD, height: (look.style === 'bun' ? 15 : 13) * s, borderRadius: `${headD}px ${headD}px 0 0` };
  const armRot = pose === 'cheering' ? 160 : 8;

  return (
    <div className={className} style={{ position: 'relative', width: w, height: 180 * s, ...style }} aria-hidden="true">
      {legs && (
        <>
          <div style={abs({ left: w / 2 - 21 * s, top: bodyTop + bodyH - 4 * s, width: legW, height: legH, background: '#1f2937', borderRadius: 6 })} />
          <div style={abs({ left: w / 2 + 2 * s, top: bodyTop + bodyH - 4 * s, width: legW, height: legH, background: '#1f2937', borderRadius: 6 })} />
        </>
      )}
      <div style={abs({ left: bodyL - armW + 4 * s, top: bodyTop + 4 * s, width: armW, height: armH, background: '#1e293b', borderRadius: 12, transformOrigin: '50% 6%', transform: `rotate(${armRot}deg)` })} />
      <div style={abs({ left: bodyL + bodyW - 4 * s, top: bodyTop + 4 * s, width: armW, height: armH, background: '#1e293b', borderRadius: 12, transformOrigin: '50% 6%', transform: `rotate(${-armRot}deg)` })} />
      <div style={abs({ left: bodyL, top: bodyTop, width: bodyW, height: bodyH, background: '#1e293b', borderRadius: `${20 * s}px ${20 * s}px 8px 8px` })} />
      <div style={abs({ left: w / 2 - 8 * s, top: bodyTop, width: 16 * s, height: 20 * s, background: '#f1f5f9', clipPath: 'polygon(0 0, 100% 0, 50% 100%)' })} />
      <div style={abs({ left: bodyL + bodyW * 0.62, top: bodyTop + 16 * s, width: 14 * s, height: 14 * s, borderRadius: '50%', background: tone.color, boxShadow: '0 0 0 3px #ffffff' })} />
      {look.style === 'bun' && (
        <div style={abs({ left: (w - 18 * s) / 2, top: -11 * s, width: 18 * s, height: 18 * s, borderRadius: '50%', background: look.hair })} />
      )}
      <div style={abs({ left: headL, top: 0, width: headD, height: headD, borderRadius: '50%', background: look.skin })} />
      <div style={abs({ ...hair, background: look.hair })} />
    </div>
  );
}