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

/** The citizens to choose from on the +1 page. */
const CITIZEN_LS = [2, 4, 6, 8];

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
      return 'Utility climbs quickly at low Life Satisfaction scores and flattens out near the top. Each extra point is worth a little less than the one before it.';
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

      <p className="mb-3 text-sm text-zinc-300 leading-relaxed">{describe(null)}</p>

      <UtilityCurveChart
        steps={steps}
        zones={ZONES}
        activeZoneIds={activeZoneIds}
        onZoneEnter={(id) => setHovered(id as Mode)}
        onZoneLeave={() => setHovered(null)}
        onZoneClick={(id) => toggle(id as Mode)}
        ariaLabel="Utility curve. Utility rises steeply between Life Satisfaction 2 and 4, then flattens out."
      />

      {/* The four explanations, always readable. Hovering (or tapping) one
          highlights that part of the curve. */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {[...ZONES.map((z) => ({ id: z.id as Mode, title: `${z.name} (${z.from} to ${z.to})`, color: z.color })), { id: 'compare' as Mode, title: 'Compare equal steps', color: '#a78bfa' }].map((c) => {
          const active = mode === c.id;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={selected === c.id}
              onClick={() => { toggle(c.id); track('utility_explanation_selected', { explanation: c.id }); }}
              onMouseEnter={() => setHovered(c.id)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(c.id)}
              onBlur={() => setHovered(null)}
              className={`text-left rounded-xl border p-3 transition-colors cursor-pointer ${active ? 'bg-zinc-800' : 'bg-zinc-950/60 hover:bg-zinc-800/60'}`}
              style={{ borderColor: active ? c.color : '#3f3f46' }}
            >
              <span className="flex items-center gap-2 text-sm font-black" style={{ color: c.color }}>
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                {c.title}
              </span>
              <span className="block mt-1 text-sm text-zinc-300 leading-relaxed">{describe(c.id).replace(/^[^:]+: (.)/, (_m, ch: string) => ch.toUpperCase())}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-zinc-400">Hover over or tap an explanation to see it on the curve.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------

export default function UtilityInterventionOverlay() {
    const { completeUtilityIntro } = useGame();

  const [lsValue, setLsValue] = useState<number>(2.0);
  /** Citizens looked at so far (by LS). Two are needed to continue. */
  const [visited, setVisited] = useState<number[]>([]);
  const hasInteracted = visited.length >= 2;
  /** "…but where do these come from?" clicked: the answer is showing. */
  const [askedSource, setAskedSource] = useState(false);

  const openedAt = useRef(Date.now());
  const hasClosedRef = useRef(false);

  useEffect(() => {
    track('utility_intervention_opened', { after_cycle: 'Rawlsian' });
  }, []);

  const selectCitizen = (ls: number) => {
    setLsValue(ls);
    setVisited((v) => (v.includes(ls) ? v : [...v, ls]));
    track('utility_citizen_selected', { ls });
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
    completeUtilityIntro();
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
            The public no longer judges you on raw numbers; from now on it&apos;s about <strong>scoring what matters more</strong>.
            A one-point rise in life satisfaction means something completely different depending on where someone started - profound for someone who's struggling, barely noticeable for someone who's already thriving.
            Explore the curve below, then pick citizens to see how the exact same <strong className="text-zinc-200">+1 Life Satisfaction</strong> boost affects different citizens.
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

          {/* Pick a citizen: the same +1 for each, worth very different amounts */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-black uppercase tracking-widest text-zinc-400">
              Give one of these citizens a +1 boost – try at least two
            </span>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {CITIZEN_LS.map((ls) => {
                const on = visited.length > 0 && lsValue === ls;
                const seen = visited.includes(ls);
                return (
                  <button
                    key={ls}
                    type="button"
                    onClick={() => selectCitizen(ls)}
                    className={`rounded-xl border-2 p-3 flex flex-col items-center gap-1 transition-colors cursor-pointer ${on ? 'border-pink-500 bg-pink-500/10' : 'border-zinc-700 bg-zinc-950/60 hover:border-zinc-500'}`}
                  >
                    <span className="text-4xl">{getContinuousDetails(ls).emoji}</span>
                    <span className="text-sm font-black text-white">LS {ls} → {ls + 1}</span>
                    <span className="text-xs text-zinc-400">{seen ? 'Looked at ✓' : 'Tap to see'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`flex flex-col md:flex-row items-center gap-8 md:gap-12 w-full transition-opacity ${visited.length ? 'opacity-100' : 'opacity-40'}`}>

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

        </motion.div>

        {/* Continue Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-wrap items-end justify-end gap-4 pb-6"
        >
          {askedSource && (
            <motion.div
              id="utility-source-answer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mr-auto max-w-xl rounded-xl border border-pink-500/40 bg-pink-500/10 p-5 text-zinc-200 leading-relaxed"
            >
              <p className="font-black text-white mb-1">Excellent question!</p>
              <p className="text-sm">
                We got these values by asking citizens questions like the ones your advisers are about to bring you: a choice between a sure outcome and a gamble.
                How much risk people will accept tells us how much each step up in life satisfaction is worth to them.
              </p>
            </motion.div>
          )}
          <button
            onClick={() => {
              if (askedSource) return handleComplete();
              setAskedSource(true);
              setTimeout(() => document.getElementById('utility-source-answer')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
              track('utility_source_question_clicked', { ms_since_open: Date.now() - openedAt.current });
            }}
            disabled={!hasInteracted}
            className={`px-8 py-4 rounded-xl font-black uppercase tracking-widest transition-all duration-300 ${
              hasInteracted
                ? 'bg-pink-600 hover:bg-pink-500 text-white shadow-xl cursor-pointer'
                : 'bg-zinc-800 text-zinc-600 border border-zinc-700 cursor-not-allowed'
            }`}
          >
            {!hasInteracted ? "Look at two citizens to continue" : askedSource ? "Show me \u2192" : "I understand \u2013 but where do these come from?"}
          </button>
        </motion.div>

      </div>
    </motion.div>
  );
}