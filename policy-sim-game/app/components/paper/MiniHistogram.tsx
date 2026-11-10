import React from 'react';

/** A small newspaper-style bar chart: citizens at each LS score, the start of term as a faint outline. */
export default function MiniHistogram({ counts, ghost = null, max, colour, height = 112 }: { counts: number[]; ghost?: number[] | null; max: number; colour: string; height?: number }) {
  const W = 180, H = height, B = 13, bw = W / counts.length;
  const h = (c: number) => (c / max) * (H - B - 2);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Citizens at each life satisfaction score">
      {counts.map((c, i) => (
        <rect key={i} x={i * bw + 1.5} y={H - B - h(c)} width={bw - 3} height={h(c)} fill={colour} opacity={0.85} />
      ))}
      {ghost && ghost.map((c, i) => (
        <rect key={`g${i}`} x={i * bw + 1.5} y={H - B - h(c)} width={bw - 3} height={h(c)} fill="none" stroke="#1c1917" strokeOpacity={0.45} strokeWidth={1} strokeDasharray="2 2" />
      ))}
      <line x1={0} x2={W} y1={H - B} y2={H - B} stroke="#1c1917" strokeWidth={1} />
      {[0, 5, 10].map((v) => (
        <text key={v} x={v * bw + bw / 2} y={H - 2} textAnchor="middle" fontSize={9} fill="#44403c">{v}</text>
      ))}
    </svg>
  );
}