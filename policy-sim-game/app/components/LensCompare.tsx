import React, { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ElectionCycle } from '../utils/types';
import { CYCLE_COLORS } from '../utils/uiHelpers';
import { useGame } from '../context/GameStateContext';
import { averageUtilityAt } from './PointsStrip';
import { track } from '../client/telemetry';

/**
 * Level 4 only: "Compare with Level 3" – how personal utility (this term)
 * differs from social utility (last term). Both curves come from this
 * population's own answers (the same calculation the score and the
 * "What a +1 in Life Satisfaction is worth" bars use), rescaled 0–1 between
 * LS 2 and LS 10 so they can sit on one chart.
 */

const LS_POINTS = [2, 3, 4, 5, 6, 7, 8, 9, 10];
const TABLE_ROWS = [3, 5, 8];
const SOCIAL = ElectionCycle.SocietalUtility;
const PERSONAL = ElectionCycle.PersonalUtility;

export default function LensCompare() {
  const { population } = useGame();
  const [open, setOpen] = useState(false);
  const openedAt = useRef(0);

  const curves = useMemo(() => {
    const curveFor = (cycle: ElectionCycle) => {
      const raw = LS_POINTS.map((ls) => averageUtilityAt(cycle, ls, population));
      const lo = raw[0];
      const range = raw[raw.length - 1] - lo || 1;
      return raw.map((u) => (u - lo) / range);
    };
    return { social: curveFor(SOCIAL), personal: curveFor(PERSONAL) };
  }, [population]);

  const at = (curve: number[], ls: number) => curve[LS_POINTS.indexOf(ls)];
  const plusOne = (curve: number[], ls: number) => at(curve, ls + 1) - at(curve, ls);
  const bottomVsTop = (curve: number[]) => {
    const top = plusOne(curve, 8);
    return top > 1e-6 ? plusOne(curve, 3) / top : null;
  };
  const socialRatio = bottomVsTop(curves.social);
  const personalRatio = bottomVsTop(curves.personal);

  const show = () => {
    openedAt.current = Date.now();
    setOpen(true);
    track('lens_compare_opened', {});
  };
  const hide = () => {
    setOpen(false);
    track('lens_compare_closed', { dwell_ms: Date.now() - openedAt.current });
  };

  // Chart geometry (SVG units)
  const W = 420, H = 230, M = { l: 40, r: 12, t: 12, b: 34 };
  const x = (ls: number) => M.l + ((ls - 2) / 8) * (W - M.l - M.r);
  const y = (u: number) => M.t + (1 - u) * (H - M.t - M.b);
  const path = (curve: number[]) => LS_POINTS.map((ls, i) => `${i ? 'L' : 'M'}${x(ls).toFixed(1)},${y(curve[i]).toFixed(1)}`).join(' ');
  const fmt = (n: number) => `+${n.toFixed(2)}`;

  return (
    <>
      <button
        type="button"
        onClick={show}
        className="mt-2 self-start rounded-lg border border-purple-300 bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-800 hover:bg-purple-100 cursor-pointer"
      >
        Compare with Level 3: personal vs social utility
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9998] bg-black/60 flex items-center justify-center p-4" onClick={hide}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-xl font-black text-zinc-900">Personal vs social utility</h2>
              <button type="button" onClick={hide} className="text-zinc-500 hover:text-zinc-900 text-sm font-bold cursor-pointer">Close ✕</button>
            </div>

            <p className="text-sm text-zinc-700 leading-relaxed">
              <strong style={{ color: CYCLE_COLORS[SOCIAL] }}>Level 3 – social utility:</strong> how much people value gains for <em>others</em>, from the choices they make when they are responsible for them.{' '}
              <strong style={{ color: CYCLE_COLORS[PERSONAL] }}>Level 4 – personal utility:</strong> how much people value gains in their <em>own</em> life, from the choices they make for themselves.
            </p>

            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Social and personal utility curves">
              {[0, 0.25, 0.5, 0.75, 1].map((u) => (
                <g key={u}>
                  <line x1={M.l} x2={W - M.r} y1={y(u)} y2={y(u)} stroke="#e4e4e7" />
                  <text x={M.l - 6} y={y(u) + 3.5} fontSize={10} fill="#52525b" textAnchor="end">{u.toFixed(2)}</text>
                </g>
              ))}
              {LS_POINTS.map((ls) => (
                <text key={ls} x={x(ls)} y={H - M.b + 15} fontSize={10.5} fontWeight={700} fill="#3f3f46" textAnchor="middle">{ls}</text>
              ))}
              <text x={(M.l + W - M.r) / 2} y={H - 4} fontSize={11} fontWeight={700} fill="#3f3f46" textAnchor="middle">Life satisfaction</text>
              <text transform={`translate(11 ${(M.t + H - M.b) / 2}) rotate(-90)`} fontSize={11} fill="#52525b" textAnchor="middle">Utility</text>
              <path d={path(curves.social)} fill="none" stroke={CYCLE_COLORS[SOCIAL]} strokeWidth={3} />
              <path d={path(curves.personal)} fill="none" stroke={CYCLE_COLORS[PERSONAL]} strokeWidth={3} strokeDasharray="7 4" />
              <g fontSize={11} fontWeight={700}>
                <line x1={x(6.6)} x2={x(7.2)} y1={y(0.16)} y2={y(0.16)} stroke={CYCLE_COLORS[SOCIAL]} strokeWidth={3} />
                <text x={x(7.3)} y={y(0.16) + 4} fill={CYCLE_COLORS[SOCIAL]}>Social (Level 3)</text>
                <line x1={x(6.6)} x2={x(7.2)} y1={y(0.06)} y2={y(0.06)} stroke={CYCLE_COLORS[PERSONAL]} strokeWidth={3} strokeDasharray="7 4" />
                <text x={x(7.3)} y={y(0.06) + 4} fill={CYCLE_COLORS[PERSONAL]}>Personal (Level 4)</text>
              </g>
            </svg>

            <table className="text-sm text-zinc-800 border-collapse">
              <thead>
                <tr>
                  <th className="border border-zinc-200 bg-zinc-100 px-3 py-2 text-left">What a +1 is worth…</th>
                  <th className="border border-zinc-200 bg-zinc-100 px-3 py-2 text-left" style={{ color: CYCLE_COLORS[SOCIAL] }}>Social (Level 3)</th>
                  <th className="border border-zinc-200 bg-zinc-100 px-3 py-2 text-left" style={{ color: CYCLE_COLORS[PERSONAL] }}>Personal (Level 4)</th>
                </tr>
              </thead>
              <tbody>
                {TABLE_ROWS.map((ls) => (
                  <tr key={ls}>
                    <td className="border border-zinc-200 px-3 py-2">from {ls} to {ls + 1}</td>
                    <td className="border border-zinc-200 px-3 py-2 tabular-nums">{fmt(plusOne(curves.social, ls))}</td>
                    <td className="border border-zinc-200 px-3 py-2 tabular-nums">{fmt(plusOne(curves.personal, ls))}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {socialRatio !== null && personalRatio !== null && (
              <p className="text-sm text-zinc-700 leading-relaxed">
                Under social utility, a +1 from 3 to 4 is worth about <strong>{socialRatio.toFixed(1)}×</strong> a +1 from 8 to 9. Under personal utility it is worth about{' '}
                <strong>{personalRatio.toFixed(1)}×</strong>.{' '}
                {socialRatio > personalRatio
                  ? 'People are more cautious when deciding for others, so social utility puts more weight on lifting the worst-off; personal utility counts gains higher up for relatively more.'
                  : 'In this population the two lenses weigh the bottom similarly.'}
              </p>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
