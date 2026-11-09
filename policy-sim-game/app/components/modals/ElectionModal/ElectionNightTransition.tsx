import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * From the press conference to election night.
  * 'flash': a few soft camera flashes as the screen dips to the studio's dark blue; the studio fades in.
  * (No white-out: full-screen white was too harsh.)
 * The time skip is used when camera flashes are off (title screen option, or reduced motion).
 * onMidpoint fires while the screen is fully covered: switch to election night then.
 */
export type NightTransitionKind = 'flash' | 'timeskip';

// All timings in ms from the click
const TIMING = {
  flash: { total: 1900, midpoint: 1000 },
  timeskip: { total: 2900, midpoint: 2250 },
} as const;

// Where the flashes go off (% of the screen) and when (s)
const FLASHES = [
  [22, 70, 0.0], [76, 78, 0.12], [40, 86, 0.24], [90, 62, 0.34], [10, 86, 0.42], [58, 72, 0.5], [30, 60, 0.58],
] as const;

/** Piecewise-linear value at time t from [time, value] points. */
function at(t: number, pts: [number, number][]): number {
  if (t <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [t1, v1] = pts[i];
    const [t0, v0] = pts[i - 1];
    if (t <= t1) return v0 + ((t - t0) / (t1 - t0)) * (v1 - v0);
  }
  return pts[pts.length - 1][1];
}

export default function ElectionNightTransition({ kind, onMidpoint, onDone }: { kind: NightTransitionKind; onMidpoint: () => void; onDone: () => void }) {
  const timing = TIMING[kind];
  const midpoint = useRef(onMidpoint);
  const done = useRef(onDone);
  const [t, setT] = useState(0);

  // One clock drives everything, so the cover is always complete when the scene changes underneath
  useEffect(() => {
    let raf = 0;
    let mid = false;
    const t0 = performance.now();
    const tick = (now: number) => {
      const el = now - t0;
      setT(el);
      if (!mid && el >= timing.midpoint) { mid = true; midpoint.current(); }
      if (el >= timing.total) { done.current(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [timing.midpoint, timing.total]);

  // Time skip: black by 0.4 s; the card shows 0.45–2.25 s, its clock running 18:00 → 22:00 over 0.7–1.7 s
  const black = at(t, [[0, 0], [400, 1], [2300, 1], [2900, 0]]);
  const card = at(t, [[450, 0], [700, 1], [2000, 1], [2250, 0]]);
  const mins = Math.round(at(t, [[700, 18 * 60], [1700, 22 * 60]]));
  const closed = t >= 1750;
  // Flash: soft flashes while the screen dips to dark blue by 0.95 s, held, then the studio fades in
  const dip = at(t, [[0, 0], [300, 0], [950, 1], [1100, 1], [1900, 0]]);
  const clock = `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

  return createPortal(
    <div className="fixed inset-0 z-[10000] overflow-hidden" aria-hidden="true">
      {kind === 'flash' ? (
        <>
          {FLASHES.map(([x, y, d], i) => (
            <div
              key={i}
              className="election-flash absolute w-[22vmax] h-[22vmax] -ml-[11vmax] -mt-[11vmax] rounded-full pointer-events-none"
              style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${d}s`, background: 'radial-gradient(circle, rgba(255,255,255,.9) 0, rgba(255,255,255,.5) 16%, rgba(255,255,255,0) 60%)' }}
            />
          ))}
          {/* Dark blue by the midpoint, held briefly, then the studio fades in */}
          <div className="absolute inset-0 bg-[#0b1020]" style={{ opacity: dip }} />
        </>
      ) : (
        <>
          <div className="absolute inset-0 bg-black" style={{ opacity: black }} />
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-slate-50"
            style={{ opacity: card, transform: `translateY(${(1 - Math.min(1, card)) * 10}px)` }}
          >
            <span className="text-[13px] font-extrabold tracking-[.16em] uppercase text-slate-400">Polling day</span>
            <span className="font-display font-black text-[clamp(72px,11vw,150px)] leading-[.85] tabular-nums">{clock}</span>
            <span className="font-display italic font-bold text-[clamp(24px,3vw,40px)] min-h-[1.3em]" style={{ opacity: closed ? 1 : 0, transition: 'opacity .3s' }}>Polls have closed</span>
          </div>
        </>
      )}
    </div>,
    document.body,
  );
}