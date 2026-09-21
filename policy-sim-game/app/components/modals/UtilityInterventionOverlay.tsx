import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGame } from '../../context/GameStateContext';
import { track } from '../../client/telemetry';
import UtilityCurveChart, { CurveStep, utilityAt } from '../UtilityCurveChart';

// Simple linear interpolation to blend between two numbers
const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

// ---------------------------------------------------------------------------
// Everything below mirrors the control group's wiki (UtilityCurveDiagram +
// UtilityInterventionWidget) so both conditions teach the same idea with the
// same chart, numbers, colours and wording.
// ---------------------------------------------------------------------------

// The biggest possible +1 step on the curve (2 -> 3). The meter is normalised
// against this so 100% means "the most valuable +1 shift there is".
const MAX_MARGINAL_GAIN = utilityAt(3) - utilityAt(2);

const fmt = (n: number) => n.toFixed(2);
const pct = (n: number) => `${Math.round(n * 100)}%`;

const getContinuousDetails = (ls: number) => {
  if (ls <= 3) return { emoji: '😭', label: 'Massive Impact', desc: 'Heating their home, paying rent, or affording three meals a day.' };
  if (ls <= 4) return { emoji: '🙁', label: 'High Impact', desc: 'Paying off urgent debt or affording new clothes for their family.' };
  if (ls <= 6) return { emoji: '😐', label: 'Moderate Impact', desc: 'Going on a modest family holiday or eating out occasionally.' };
  if (ls <= 8) return { emoji: '🙂', label: 'Low Impact', desc: 'Upgrading to a slightly nicer car or adding to their savings.' };
  return { emoji: '😁', label: 'Minimal Impact', desc: 'Adding marginally to an already overflowing luxury savings account.' };
};

// Face colour: Red (0) -> Yellow (5) -> Green (10)
const getFaceColor = (ls: number) => {
  const t = ls / 10;
  if (t < 0.5) {
    const f = t * 2;
    return `rgb(${Math.round(lerp(244, 234, f))}, ${Math.round(lerp(63, 179, f))}, ${Math.round(lerp(94, 8, f))})`;
  }
  const f = (t - 0.5) * 2;
  return `rgb(${Math.round(lerp(234, 34, f))}, ${Math.round(lerp(179, 197, f))}, ${Math.round(lerp(8, 94, f))})`;
};

// Impact colour: Pink (high impact) -> Grey (low impact)
const getImpactColor = (ls: number) => {
  const t = ls / 10;
  return `rgb(${Math.round(lerp(236, 113, t))}, ${Math.round(lerp(72, 113, t))}, ${Math.round(lerp(153, 122, t))})`;
};

// --- Zone diagram (equal-width steps, very different rises) -----------------

interface Zone {
  id: 'steep' | 'slowing' | 'flat';
  name: string;
  from: number;
  to: number;
  color: string;
}

const ZONES: Zone[] = [
  { id: 'steep',   name: 'Steep climb',  from: 2, to: 4,  color: '#34d399' },
  { id: 'slowing', name: 'Slowing down', from: 4, to: 8,  color: '#fbbf24' },
  { id: 'flat',    name: 'Flat top',     from: 8, to: 10, color: '#f87171' },
];

type Mode = Zone['id'] | 'compare';

const rise = (z: Zone) => utilityAt(z.to) - utilityAt(z.from);

const stepFor = (z: Zone): CurveStep => ({
  from: z.from,
  to: z.to,
  color: z.color,
  runLabel: `${z.to - z.from} points`,
  riseLabel: `+${fmt(rise(z))}`,
});

function describe(mode: Mode | null): string {
  const [steep, slowing, flat] = ZONES;
  switch (mode) {
    case 'steep':
      return `Steep climb: going from ${steep.from} to ${steep.to} adds ${fmt(rise(steep))} utility, about ${pct(rise(steep))} of all the utility there is, in just ${steep.to - steep.from} points.`;
    case 'slowing':
      return `Slowing down: going from ${slowing.from} to ${slowing.to} adds ${fmt(rise(slowing))} utility. That is ${slowing.to - slowing.from} points, but it adds less than the steep climb did in 2.`;
    case 'flat':
      return `Flat top: going from ${flat.from} to ${flat.to} adds only ${fmt(rise(flat))} utility, about ${pct(rise(flat))} of the total. It is the same ${flat.to - flat.from}-point step as the steep climb, but worth far less.`;
    case 'compare':
      return `Both steps are ${steep.to - steep.from} points wide. Going from ${steep.from} to ${steep.to} adds ${fmt(rise(steep))} utility. Going from ${flat.from} to ${flat.to} adds only ${fmt(rise(flat))}. The first step is worth about ${Math.round(rise(steep) / rise(flat))} times as much.`;
    default:
      return 'Utility climbs quickly at low Life Satisfaction scores and flattens out near the top. Each extra point is worth a little less than the one before it. Hover over or select a zone to see how much utility each step adds.';
  }
}

function CurveZoneDiagram() {
  const [selected, setSelected] = useState<Mode | null>(null);
  const [hovered, setHovered] = useState<Mode | null>(null);
  const mode = hovered ?? selected;

  const toggle = (m: Mode) => setSelected((cur) => (cur === m ? null : m));

  const steps: CurveStep[] =
    mode === 'compare'
      ? [stepFor(ZONES[0]), stepFor(ZONES[2])]
      : mode
        ? [stepFor(ZONES.find((z) => z.id === mode) as Zone)]
        : [];
  const activeZoneIds = mode === 'compare' ? ['steep', 'flat'] : mode ? [mode] : [];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col">
      <div className="mb-3 shrink-0">
        <span className="text-xs font-black uppercase tracking-widest text-pink-500">
          Why Each Extra Point of Satisfaction Matters Less
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {ZONES.map((z) => {
          const on = selected === z.id;
          return (
            <button
              key={z.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(z.id)}
              onMouseEnter={() => setHovered(z.id)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(z.id)}
              onBlur={() => setHovered(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                on ? 'text-zinc-950' : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
              }`}
              style={on ? { backgroundColor: z.color, borderColor: z.color } : undefined}
            >
              <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: on ? '#18181b' : z.color }} />
              {z.name} <span className="opacity-70 font-semibold">({z.from} to {z.to})</span>
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={selected === 'compare'}
          onClick={() => toggle('compare')}
          onMouseEnter={() => setHovered('compare')}
          onMouseLeave={() => setHovered(null)}
          onFocus={() => setHovered('compare')}
          onBlur={() => setHovered(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
            selected === 'compare'
              ? 'bg-violet-400 border-violet-400 text-zinc-950'
              : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
          }`}
        >
          Compare equal steps
        </button>
      </div>

      <UtilityCurveChart
        steps={steps}
        zones={ZONES}
        activeZoneIds={activeZoneIds}
        onZoneEnter={(id) => setHovered(id as Mode)}
        onZoneLeave={() => setHovered(null)}
        onZoneClick={(id) => toggle(id as Mode)}
        ariaLabel="Utility curve. Utility rises steeply between Life Satisfaction 2 and 4, then flattens out."
      />

      <p className="mt-3 text-sm text-zinc-400 leading-relaxed min-h-[4.5rem]">{describe(mode)}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function UtilityInterventionOverlay() {
  const { currentCycle, setHasSeenUtilityIntervention, startCycle } = useGame();

  const [lsValue, setLsValue] = useState<number>(2.0);
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

  // Real marginal utility of a +1 LS boost at this point on the curve,
  // normalised against the biggest possible +1 step (2 -> 3) so the meter
  // reads 0-100%.
  const stepTo = Math.min(lsValue + 1, 10);
  const gain = utilityAt(stepTo) - utilityAt(lsValue);
  const impactPercentage = Math.max(0, (gain / MAX_MARGINAL_GAIN) * 100);
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
      <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col gap-8 mt-4">

        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-2"
        >
          <h2 className="text-pink-500 font-black uppercase tracking-widest text-sm mb-1">
            Simulation Paused
          </h2>
          <h1 className="text-2xl md:text-4xl font-black text-white mb-2">
            A Shift In Perspective
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed">
            The public no longer cares about raw numbers; they care about <strong>actual happiness</strong>.
            A one-point rise in life satisfaction means something completely different depending on where someone started - profound for someone who's struggling, barely noticeable for someone who's already thriving.
            Explore the curve below, then use the slider to see how the exact same <strong className="text-zinc-200">+1 Life Satisfaction</strong> boost affects different citizens.
          </p>
        </motion.div>

        {/* Zone diagram: equal-width steps, very different rises */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <CurveZoneDiagram />
        </motion.div>

        {/* The Interactive Playground */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 md:p-10 flex flex-col gap-8 relative overflow-hidden"
        >

          <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 w-full">

            {/* Face Box */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Citizen Status</span>

              <div
                className="w-28 h-28 rounded-full flex items-center justify-center text-7xl shadow-inner border-4 transition-colors duration-75"
                style={{
                  borderColor: faceColor,
                  backgroundColor: `${faceColor.replace('rgb', 'rgba').replace(')', ', 0.15)')}`
                }}
              >
                {details.emoji}
              </div>

              <span className="text-2xl font-black text-white mt-1 tabular-nums text-center whitespace-nowrap min-w-[110px]">
                LS: {lsValue.toFixed(1)}
              </span>
            </div>

            {/* Impact Meter & Meaning */}
            <div className="flex-1 w-full flex flex-col gap-4">
              <div className="flex justify-between items-end">
                <span className="text-xs font-black uppercase tracking-widest text-zinc-500">Value of a +1 Boost</span>
                <span
                  className="text-sm font-black uppercase tracking-widest transition-colors duration-75"
                  style={{ color: impactColor }}
                >
                  {details.label}
                </span>
              </div>

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

              <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl p-4 min-h-[5rem] flex flex-col justify-center">
                <span className="font-bold text-zinc-200 mb-1">Meaning:</span>
                <p className="text-base font-medium text-zinc-400 leading-snug">
                  {details.desc}
                </p>
              </div>
            </div>

          </div>

          {/* Curve linked to the slider: same +1 run, changing rise */}
          <div className="w-full max-w-2xl mx-auto flex flex-col gap-2">
            <UtilityCurveChart
              marker={lsValue}
              markerColor={faceColor}
              steps={[{ from: lsValue, to: stepTo, color: impactColor, riseLabel: `+${gain.toFixed(2)}` }]}
              ariaLabel="The utility curve, with a marker at the citizen's Life Satisfaction and the +1 step highlighted"
            />
            <p className="text-xs text-zinc-500 text-center leading-snug">
              The same curve as the diagram above. The marker is where this citizen is now, and the highlighted step shows what a +1 boost adds from there.
            </p>
          </div>

          {/* The Slider Control */}
          <div className="w-full flex flex-col gap-3 pt-4 border-t border-zinc-800">
            <div className="flex justify-between text-xs font-black text-zinc-500 uppercase tracking-widest px-1">
              <span>Struggling (2)</span>
              <span>Thriving (9)</span>
            </div>

            <input
              type="range"
              min="2"
              max="9"
              step="0.1"
              aria-label="Starting Life Satisfaction"
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
          className="flex justify-end pb-6"
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