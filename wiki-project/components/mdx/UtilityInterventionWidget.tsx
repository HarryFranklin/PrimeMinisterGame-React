'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

const getContinuousDetails = (ls: number) => {
  if (ls <= 2) return { emoji: '😭', label: 'Massive Impact', desc: 'Heating their home, paying rent, or affording three meals a day.' };
  if (ls <= 4) return { emoji: '🙁', label: 'High Impact', desc: 'Paying off urgent debt or affording new clothes for their family.' };
  if (ls <= 6) return { emoji: '😐', label: 'Moderate Impact', desc: 'Going on a modest family holiday or eating out occasionally.' };
  if (ls <= 8) return { emoji: '🙂', label: 'Low Impact', desc: 'Upgrading to a slightly nicer car or adding to their savings.' };
  return { emoji: '😁', label: 'Minimal Impact', desc: 'Adding marginally to an already overflowing luxury savings account.' };
};

const getFaceColor = (ls: number) => {
  const t = ls / 10;
  if (t < 0.5) {
    const f = t * 2;
    return `rgb(${Math.round(lerp(244, 234, f))}, ${Math.round(lerp(63, 179, f))}, ${Math.round(lerp(94, 8, f))})`;
  } else {
    const f = (t - 0.5) * 2;
    return `rgb(${Math.round(lerp(234, 34, f))}, ${Math.round(lerp(179, 197, f))}, ${Math.round(lerp(8, 94, f))})`;
  }
};

const getImpactColor = (ls: number) => {
  const t = ls / 10;
  return `rgb(${Math.round(lerp(236, 113, t))}, ${Math.round(lerp(72, 113, t))}, ${Math.round(lerp(153, 122, t))})`;
};

export default function UtilityInterventionWidget() {
  const [lsValue, setLsValue] = useState<number>(1.0);
  const details = useMemo(() => getContinuousDetails(lsValue), [lsValue]);
  const impactPercentage = 10 + 90 * Math.pow(1 - (lsValue / 10), 2);
  const faceColor = getFaceColor(lsValue);
  const impactColor = getImpactColor(lsValue);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl p-6 md:p-8 flex flex-col gap-8 my-8 text-zinc-200 font-sans">
      <div className="flex flex-col md:flex-row items-center gap-8 w-full">
        {/* Face Box */}
        <div className="flex flex-col items-center gap-3 shrink-0">
          <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Citizen Status</span>
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center text-6xl shadow-inner border-4 transition-colors duration-75 bg-zinc-950"
            style={{ borderColor: faceColor, backgroundColor: `${faceColor.replace('rgb', 'rgba').replace(')', ', 0.15)')}` }}
          >
            {details.emoji}
          </div>
          <span className="text-xl font-black text-white mt-1 tabular-nums text-center whitespace-nowrap min-w-[110px]">
            LS: {lsValue.toFixed(1)}
          </span>
        </div>

        {/* Impact Meter */}
        <div className="flex-1 w-full flex flex-col gap-4">
          <div className="flex justify-between items-end">
            <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Value of a +1 Boost</span>
            <span className="text-sm font-black uppercase tracking-widest transition-colors duration-75" style={{ color: impactColor }}>
              {details.label}
            </span>
          </div>
          
          <div className="w-full h-6 bg-zinc-950 rounded-full overflow-hidden shadow-inner relative border border-zinc-800">
            <motion.div 
              className="absolute top-0 left-0 bottom-0 rounded-full"
              animate={{ width: `${impactPercentage}%`, backgroundColor: impactColor }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          </div>
          
          <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-3 min-h-[4.5rem] flex flex-col justify-center">
            <span className="font-bold text-zinc-300 text-sm mb-1">Meaning:</span>
            <p className="text-sm text-zinc-400 leading-snug">{details.desc}</p>
          </div>
        </div>
      </div>

      {/* Slider Control */}
      <div className="w-full flex flex-col gap-3 pt-4 border-t border-zinc-800">
        <div className="flex justify-between text-xs font-black text-zinc-500 uppercase tracking-widest px-1">
          <span>Struggling (0)</span>
          <span>Wealthy (10)</span>
        </div>
        <input 
          type="range" min="0" max="10" step="0.1"
          value={lsValue}
          onChange={(e) => setLsValue(parseFloat(e.target.value))}
          className="w-full accent-pink-500 cursor-pointer h-3 bg-zinc-800 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-pink-500"
        />
      </div>
    </div>
  );
}