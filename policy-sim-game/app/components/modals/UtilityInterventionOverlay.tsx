import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../../context/GameStateContext';
import { track } from '../../client/telemetry';

// Simple linear interpolation to blend between two numbers
const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

const getContinuousDetails = (ls: number) => {
  if (ls <= 2) {
    return {
      emoji: '😭',
      label: 'Massive Impact',
      desc: 'Heating their home, paying rent, or affording three meals a day.',
    };
  }
  if (ls <= 4) {
    return {
      emoji: '🙁',
      label: 'High Impact',
      desc: 'Paying off urgent debt or affording new clothes for their family.',
    };
  }
  if (ls <= 6) {
    return {
      emoji: '😐',
      label: 'Moderate Impact',
      desc: 'Going on a modest family holiday or eating out occasionally.',
    };
  }
  if (ls <= 8) {
    return {
      emoji: '🙂',
      label: 'Low Impact',
      desc: 'Upgrading to a slightly nicer car or adding to their savings.',
    };
  }
  return {
    emoji: '😁',
    label: 'Minimal Impact',
    desc: 'Adding marginally to an already overflowing luxury savings account.',
  };
};

// Calculate face color: Red (0) -> Yellow (5) -> Green (10)
const getFaceColor = (ls: number) => {
  const t = ls / 10;
  if (t < 0.5) {
    const factor = t * 2;
    const r = Math.round(lerp(244, 234, factor)); // Rose-500 to Yellow-500
    const g = Math.round(lerp(63, 179, factor));
    const b = Math.round(lerp(94, 8, factor));
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const factor = (t - 0.5) * 2;
    const r = Math.round(lerp(234, 34, factor)); // Yellow-500 to Emerald-500
    const g = Math.round(lerp(179, 197, factor));
    const b = Math.round(lerp(8, 94, factor));
    return `rgb(${r}, ${g}, ${b})`;
  }
};

// Calculate impact color: Pink (high impact) -> Grey (low impact)
const getImpactColor = (ls: number) => {
  const t = ls / 10;
  const r = Math.round(lerp(236, 113, t)); // Pink-500 to Zinc-500
  const g = Math.round(lerp(72, 113, t));
  const b = Math.round(lerp(153, 122, t));
  return `rgb(${r}, ${g}, ${b})`;
};

export default function UtilityInterventionOverlay() {
  const { currentCycle, setHasSeenUtilityIntervention, startCycle } = useGame();

  const [lsValue, setLsValue] = useState<number>(1.0);
  const [hasInteracted, setHasInteracted] = useState(false);
  
  const openedAt = useRef(Date.now());
  const hasClosedRef = useRef(false);

  useEffect(() => {
    track('utility_intervention_opened', { after_cycle: 'Rawlsian' });
  }, []);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLsValue(parseFloat(e.target.value));
    if (!hasInteracted) setHasInteracted(true);
  };

  const handleComplete = () => {
    if (!hasClosedRef.current) {
      hasClosedRef.current = true;
      track('utility_intervention_completed', { 
        total_scenarios: 1, 
        dwell_ms: Date.now() - openedAt.current,
      });
      track('utility_resume_clicked', { ts: Date.now() });
    }
    setHasSeenUtilityIntervention(true);
    startCycle(currentCycle);
  };

  const details = useMemo(() => getContinuousDetails(lsValue), [lsValue]);
  
  const impactPercentage = 10 + 90 * Math.pow(1 - (lsValue / 10), 2);
  const faceColor = getFaceColor(lsValue);
  const impactColor = getImpactColor(lsValue);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      className="fixed inset-0 z-[9999] bg-zinc-950 text-zinc-200 flex flex-col p-6 md:p-12 overflow-y-auto"
    >
      <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col justify-center mt-4">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-2 mb-8"
        >
          <h2 className="text-pink-500 font-black uppercase tracking-widest text-sm mb-1">
            Simulation Paused
          </h2>
          <h1 className="text-2xl md:text-4xl font-black text-white mb-2">
            A Shift In Perspective
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed">
            The public no longer cares about raw numbers; they care about <strong>actual happiness</strong>. 
            A £100 boost changes a struggling person's life, but is just pocket change to someone wealthy. 
            Use the slider below to see how the exact same <strong className="text-zinc-200">+1 Life Satisfaction</strong> affects different citizens.
          </p>
        </motion.div>

        {/* The Interactive Playground */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 md:p-10 flex flex-col gap-10 relative overflow-hidden"
        >
          
          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 w-full">
            
            {/* Face Box */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Citizen</span>
              
              <div
                className="w-28 h-28 rounded-full flex items-center justify-center text-7xl shadow-inner border-4 transition-colors duration-75"
                style={{ 
                  borderColor: faceColor, 
                  backgroundColor: `${faceColor.replace('rgb', 'rgba').replace(')', ', 0.15)')}` 
                }}
              >
                {details.emoji}
              </div>
              
              {/* Added whitespace-nowrap and slightly wider min-width to prevent LS: 10.0 wrapping */}
              <span className="text-2xl font-black text-white mt-1 tabular-nums text-center whitespace-nowrap min-w-[110px]">
                LS: {lsValue.toFixed(1)}
              </span>
            </div>

            {/* Impact Meter & Metaphor */}
            <div className="flex-1 w-full flex flex-col gap-4">
              <div className="flex justify-between items-end">
                <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Value of +1 Boost</span>
                <span 
                  className="text-sm font-black uppercase tracking-widest transition-colors duration-75"
                  style={{ color: impactColor }}
                >
                  {details.label}
                </span>
              </div>
              
              {/* Dynamic Bar */}
              <div className="w-full h-8 bg-zinc-950 rounded-full overflow-hidden shadow-inner relative border border-zinc-800">
                <motion.div 
                  className="absolute top-0 left-0 bottom-0 rounded-full shadow-[2px_0_10px_rgba(0,0,0,0.5)]"
                  animate={{ 
                    width: `${impactPercentage}%`, 
                    backgroundColor: impactColor 
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              </div>
              
              {/* Metaphor Text */}
              <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 min-h-[5rem] flex flex-col justify-center">
                <span className="font-bold text-zinc-200 mb-1">Meaning:</span>
                <p className="text-base font-medium text-zinc-400 leading-snug">
                  {details.desc}
                </p>
              </div>
            </div>

          </div>

          {/* The Slider Control */}
          <div className="w-full flex flex-col gap-3 pt-4 border-t border-zinc-800">
            <div className="flex justify-between text-xs font-black text-zinc-500 uppercase tracking-widest px-1">
              <span>Struggling (0)</span>
              <span>Wealthy (10)</span>
            </div>
            
            <input 
              type="range" 
              min="0" 
              max="10" 
              step="0.1"
              value={lsValue}
              onChange={handleSliderChange}
              className="w-full accent-pink-500 cursor-pointer h-3 bg-zinc-800 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
            />
          </div>

        </motion.div>

        {/* Continue Button */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-8 flex justify-end"
        >
          <button
            onClick={handleComplete}
            disabled={!hasInteracted}
            className={`px-8 py-4 rounded-xl font-black uppercase tracking-widest transition-all duration-300 ${
              hasInteracted 
                ? 'bg-pink-600 hover:bg-pink-500 text-white shadow-xl cursor-pointer' 
                : 'bg-zinc-800 text-zinc-600 border border-zinc-700 cursor-not-allowed'
            }`}
          >
            {hasInteracted ? "I Understand, Resume Simulation \u2192" : "Drag the slider to continue"}
          </button>
        </motion.div>

      </div>
    </motion.div>
  );
}