'use client';
import React from 'react';

// ============================================================================
// Chart for the questionnaire's "society" questions – one face = one person.
//
// Drawn here (not with the apps' game chart) so both groups see exactly the
// same picture with no hover tooltips. Faces stack two per row in each life
// satisfaction column; the number of people is written above each column and
// the y-axis counts people, so the charts can be read exactly.
// Colours and faces match the game (red = low LS, green = high).
// ============================================================================

/** d3.interpolateRdYlGn(ls / 10) and a darker outline, for LS 0–10. */
const FACE_COLOURS: [string, string][] = [
  ['#a50026', '#8a0020'], ['#d4322c', '#b12a25'], ['#f16e43', '#ca5c38'], ['#fcac63', '#d39053'],
  ['#fedd8d', '#d5b976'], ['#f9f7ae', '#d0cf92'], ['#d7ee8e', '#b4c777'], ['#a4d86e', '#89b55c'],
  ['#64bc61', '#549d51'], ['#22964f', '#1c7d42'], ['#006837', '#00572e'],
];

const FACE = 11; // face size (SVG units)
const M = { top: 18, right: 6, bottom: 36, left: 36 };

/** perRow: faces side by side in each column (2 when charts sit side by side,
 * 4 when they are stacked full width). */
export function QuestionChart({ id, counts, yMax, perRow = 2 }: { id: string; counts: number[]; yMax: number; perRow?: number }) {
  const PER_ROW = perRow;
  const COL_W = PER_ROW * FACE + 6; // column width incl. gap
  const rows = Math.ceil(yMax / PER_ROW);
  const plotW = counts.length * COL_W;
  const plotH = rows * FACE;
  const W = M.left + plotW + M.right;
  const H = M.top + plotH + M.bottom;
  const ticks = Array.from({ length: Math.floor(yMax / 10) + 1 }, (_, i) => i * 10);
  const y = (people: number) => M.top + plotH - (people / PER_ROW) * FACE;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Number of people at each life satisfaction score: ${counts.join(', ')}`}>
      <defs>
        {FACE_COLOURS.map(([fill, dark], ls) => (
          <symbol key={ls} id={`qf-${id}-${ls}`} viewBox="0 0 100 100">
            <circle cx={50} cy={50} r={46} fill={fill} stroke={dark} strokeWidth={6} />
            <circle cx={34} cy={40} r={8} fill="#1f2937" />
            <circle cx={66} cy={40} r={8} fill="#1f2937" />
            <path d={`M 28 65 Q 50 ${45 + (ls / 10) * 40} 72 65`} stroke="#1f2937" strokeWidth={7} fill="none" strokeLinecap="round" />
          </symbol>
        ))}
      </defs>

      {/* y-axis: number of people, with light gridlines */}
      {ticks.map((t) => (
        <g key={t}>
          <line x1={M.left} x2={M.left + plotW} y1={y(t)} y2={y(t)} stroke="#3f3f46" strokeWidth={t === 0 ? 1.2 : 0.6} />
          <text x={M.left - 5} y={y(t) + 3.5} fontSize={11} fill="#d4d4d8" textAnchor="end">{t}</text>
        </g>
      ))}
      <text transform={`translate(10 ${M.top + plotH / 2}) rotate(-90)`} fontSize={11} fill="#a1a1aa" textAnchor="middle">People</text>

      {/* columns of faces, with the count above each */}
      {counts.map((n, ls) => {
        const x0 = M.left + ls * COL_W + (COL_W - PER_ROW * FACE) / 2;
        return (
          <g key={ls}>
            {Array.from({ length: n }, (_, k) => (
              <use
                key={k}
                href={`#qf-${id}-${ls}`}
                x={x0 + (k % PER_ROW) * FACE}
                y={M.top + plotH - (Math.floor(k / PER_ROW) + 1) * FACE}
                width={FACE}
                height={FACE}
              />
            ))}
            {n > 0 && (
              <text x={M.left + ls * COL_W + COL_W / 2} y={M.top + plotH - Math.ceil(n / PER_ROW) * FACE - 4} fontSize={10.5} fontWeight={700} fill="#f4f4f5" textAnchor="middle">{n}</text>
            )}
            <text x={M.left + ls * COL_W + COL_W / 2} y={M.top + plotH + 14} fontSize={11} fontWeight={700} fill="#e4e4e7" textAnchor="middle">{ls}</text>
          </g>
        );
      })}
      <text x={M.left + plotW / 2} y={H - 4} fontSize={11.5} fontWeight={700} fill="#d4d4d8" textAnchor="middle">Life satisfaction (0–10)</text>
    </svg>
  );
}
