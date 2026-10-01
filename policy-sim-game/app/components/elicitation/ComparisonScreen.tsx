import React, { useRef, useState } from 'react';
import { CYCLE_COLORS } from '../../utils/uiHelpers';
import { ElectionCycle } from '../../utils/types';
import { CurveComparison, CurvePoint, linearCurve, stepValues } from '../../utils/ElicitationEngine';
import { COMPARISON as T } from './elicitationText';

const COLORS = {
  personal: CYCLE_COLORS[ElectionCycle.PersonalUtility],
  social: CYCLE_COLORS[ElectionCycle.SocietalUtility],
  direct: '#f59e0b',
  linear: CYCLE_COLORS[ElectionCycle.Benthamite],
};

const W = 640;
const H = 340;
const PAD = { top: 20, right: 24, bottom: 48, left: 56 };
const sx = (ls: number) => PAD.left + ((ls - 2) / 8) * (W - PAD.left - PAD.right);
const sy = (u: number) => PAD.top + (1 - u) * (H - PAD.top - PAD.bottom);
const path = (c: CurvePoint[]) => c.map((p, i) => `${i ? 'L' : 'M'}${sx(p.ls)},${sy(p.u)}`).join(' ');

interface Curves {
  personal: CurvePoint[];
  social: CurvePoint[];
  direct: CurvePoint[];
}

function Chart({ curves, playerLS }: { curves: Curves; playerLS: number | null }) {
  const lines: { key: keyof typeof COLORS; curve: CurvePoint[]; dashed?: boolean }[] = [
    { key: 'linear', curve: linearCurve(), dashed: true },
    { key: 'direct', curve: curves.direct },
    { key: 'social', curve: curves.social },
    { key: 'personal', curve: curves.personal },
  ];
  const showYou = playerLS !== null && playerLS >= 2 && playerLS <= 10;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img"
      aria-label="Your three utility curves compared with a straight line">
      {[0, 0.25, 0.5, 0.75, 1].map((y) => (
        <g key={y}>
          <line x1={PAD.left} x2={W - PAD.right} y1={sy(y)} y2={sy(y)} stroke="#27272a" />
          <text x={PAD.left - 10} y={sy(y) + 4} textAnchor="end" fontSize="12" fill="#a1a1aa">{y}</text>
        </g>
      ))}
      {[2, 4, 6, 8, 10].map((x) => (
        <text key={x} x={sx(x)} y={H - PAD.bottom + 20} textAnchor="middle" fontSize="12" fill="#a1a1aa">{x}</text>
      ))}
      <text x={(PAD.left + W - PAD.right) / 2} y={H - 8} textAnchor="middle" fontSize="13" fill="#d4d4d8">{T.axisX}</text>
      <text x={16} y={(PAD.top + H - PAD.bottom) / 2} textAnchor="middle" fontSize="13" fill="#d4d4d8"
        transform={`rotate(-90 16 ${(PAD.top + H - PAD.bottom) / 2})`}>{T.axisY}</text>

      {showYou && (
        <g>
          <line x1={sx(playerLS!)} x2={sx(playerLS!)} y1={PAD.top} y2={H - PAD.bottom}
            stroke="#f4f4f5" strokeOpacity={0.35} strokeDasharray="2 4" />
          <text x={sx(playerLS!)} y={PAD.top - 6} textAnchor="middle" fontSize="11" fill="#f4f4f5">{T.legend.you}</text>
        </g>
      )}

      {lines.map(({ key, curve, dashed }) => {
        // Lines run through the shared points (2, 4, 6, 8, 10). The own-LS
        // answer (always an odd score) is drawn as a hollow dot, so an
        // answer that doesn't fit its neighbours doesn't zigzag the line.
        const shared = curve.filter((p) => p.ls % 2 === 0);
        const extra = curve.filter((p) => p.ls % 2 !== 0);
        return (
          <g key={key}>
            <path d={path(shared)} fill="none" stroke={COLORS[key]} strokeWidth={dashed ? 2 : 3}
              strokeDasharray={dashed ? '6 6' : undefined} strokeLinejoin="round" />
            {!dashed && shared.map((p) => (
              <circle key={p.ls} cx={sx(p.ls)} cy={sy(p.u)} r={4} fill={COLORS[key]} />
            ))}
            {extra.map((p) => (
              <circle key={p.ls} cx={sx(p.ls)} cy={sy(p.u)} r={5} fill="#09090b" stroke={COLORS[key]} strokeWidth={2} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

function Table({ curves }: { curves: Curves }) {
  const cols: { key: keyof Curves; label: string }[] = [
    { key: 'personal', label: T.legend.personal },
    { key: 'social', label: T.legend.social },
    { key: 'direct', label: T.legend.direct },
  ];
  const values = Object.fromEntries(cols.map((c) => [c.key, stepValues(curves[c.key])])) as Record<keyof Curves, ReturnType<typeof stepValues>>;
  return (
    <div className="overflow-x-auto">
      <p className="text-sm text-zinc-400 mb-3">{T.tableIntro}</p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-700">
            <th className="text-left py-2 pr-4 font-bold text-zinc-300">Rise</th>
            {cols.map((c) => (
              <th key={c.key} className="text-right py-2 px-2 font-bold" style={{ color: COLORS[c.key] }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {values.personal.map((row, i) => (
            <tr key={row.step} className="border-b border-zinc-800">
              <td className="py-2 pr-4 font-bold text-zinc-200">{row.step}</td>
              {cols.map((c) => (
                <td key={c.key} className="text-right py-2 px-2 tabular-nums text-zinc-100">
                  {Math.round(values[c.key][i].value)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface ComparisonScreenProps {
  curves: Curves;
  personalVsSocial: CurveComparison;
  socialVsDirect: CurveComparison;
  playerLS: number | null;
  onView: (view: 'chart' | 'table', dwellMs: number) => void;
  onContinue: () => void;
}

export default function ComparisonScreen({
  curves, personalVsSocial, socialVsDirect, playerLS, onView, onContinue,
}: ComparisonScreenProps) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const viewSince = useRef(Date.now());

  const switchTo = (next: 'chart' | 'table') => {
    if (next === view) return;
    onView(view, Date.now() - viewSince.current);
    viewSince.current = Date.now();
    setView(next);
  };

  const handleContinue = () => {
    onView(view, Date.now() - viewSince.current);
    onContinue();
  };

  const legend: { key: keyof typeof COLORS; label: string; dashed?: boolean }[] = [
    { key: 'personal', label: T.legend.personal },
    { key: 'social', label: T.legend.social },
    { key: 'direct', label: T.legend.direct },
    { key: 'linear', label: T.legend.linear, dashed: true },
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col gap-5">
      <div>
        <span className="text-sm font-bold text-pink-500">{T.kicker}</span>
        <h1 className="text-2xl md:text-3xl font-black text-white mt-1">{T.title}</h1>
      </div>
      <p className="text-base text-zinc-300 leading-relaxed">{T.intro}</p>

      <div className="flex gap-2" role="tablist">
        {(['chart', 'table'] as const).map((v) => (
          <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => switchTo(v)}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold border transition-colors cursor-pointer ${
              view === v ? 'bg-zinc-100 text-zinc-900 border-zinc-100' : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
            }`}>
            {v === 'chart' ? T.chartTab : T.tableTab}
          </button>
        ))}
      </div>

      <div className="rounded-xl bg-zinc-950/60 border border-zinc-800 p-4">
        {view === 'chart' ? (
          <>
            <Chart curves={curves} playerLS={playerLS} />
            <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3">
              {legend.map((l) => (
                <span key={l.key} className="flex items-center gap-2 text-sm text-zinc-300">
                  <span className="w-5 h-0 border-t-[3px]" style={{ borderColor: COLORS[l.key], borderStyle: l.dashed ? 'dashed' : 'solid' }} />
                  {l.label}
                </span>
              ))}
            </div>
            <p className="text-sm text-zinc-400 mt-3 leading-relaxed">{T.howToRead}</p>
          </>
        ) : (
          <Table curves={curves} />
        )}
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-base text-zinc-200 leading-relaxed border-l-4 pl-4" style={{ borderColor: COLORS.social }}>
            {T.personalVsSocial(personalVsSocial.different, personalVsSocial.direction)}
        </p>
        <p className="text-base text-zinc-200 leading-relaxed border-l-4 pl-4" style={{ borderColor: COLORS.direct }}>
            {T.socialVsDirect(socialVsDirect.different, socialVsDirect.direction)}
        </p>
        <p className="text-base font-bold text-white leading-relaxed">{T.takeaway}</p>
        <p className="text-sm text-zinc-400 leading-relaxed">{T.citizens}</p>
      </div>

      <button type="button" onClick={handleContinue}
        className="self-end px-8 py-3 rounded-xl font-black bg-pink-600 hover:bg-pink-500 text-white transition-colors cursor-pointer">
        {T.button}
      </button>
    </div>
  );
}