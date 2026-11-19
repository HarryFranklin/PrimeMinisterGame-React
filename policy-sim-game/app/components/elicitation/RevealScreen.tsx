import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { track } from '../../client/telemetry';
import { WelfareMetrics } from '../../utils/WelfareMetrics';
import { CYCLE_COLORS } from '../../utils/uiHelpers';
import { ElectionCycle } from '../../utils/types';
import { CurvePoint, compareCurves, curveAt, riskAttitude } from '../../utils/ElicitationEngine';
import { REVEAL_TEXT, SOCIAL_REVEAL_TEXT } from './elicitationText';
import { GambleBlock } from '../../utils/ElicitationEngine';

/** The public's reference curves, on the same 2 = 0, 10 = 1 scale as the
 * player's. (getUtility returns points, i.e. utility x 10.) */
const publicCurve = (type: 'societal' | 'personal'): CurvePoint[] =>
  [2, 4, 6, 8, 10].map((ls) => ({ ls, u: WelfareMetrics.getUtility(ls, type) / 10 }));

const PUBLIC_SOCIAL = publicCurve('societal');
const PUBLIC_PERSONAL = publicCurve('personal');

/** The 2-point rises the player can compare, lowest first. */
const STEPS: [number, number][] = [[2, 4], [4, 6], [6, 8], [8, 10]];
/** Bar heights are out of 10 points, the most any one rise can be worth. */
const MAX_POINTS = 10;
/** Every point equal (Level 1): any 2-point rise is worth 2/8 of 10 points. */
const EQUAL_POINTS = 2.5;

/** Points for lifting one person from `from` to `to`, or null without a curve. */
const risePoints = (curve: CurvePoint[] | null, from: number, to: number) =>
  (curve ? (curveAt(curve, to) - curveAt(curve, from)) * 10 : null);

/** One labelled horizontal bar: "Public ████ 7.2". Bar lengths are out of
 * MAX_POINTS; the dashed mark is where every point counts the same. */
function Bar({ label, value, color, solid }: { label: string; value: number | null; color: string; solid: boolean }) {
  const pct = value === null ? 0 : Math.max(0, Math.min(1, value / MAX_POINTS)) * 100;
  return (
    <div className="grid grid-cols-[56px_1fr_36px] items-center gap-3">
      <span className="text-xs font-bold text-zinc-400">{label}</span>
      <div className="relative h-7 rounded-md bg-zinc-800/70">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-md"
          style={{
            backgroundColor: solid ? color : `${color}55`,
            border: solid ? undefined : `2px solid ${color}`,
          }}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        />
        <div
          className="absolute -inset-y-1 border-l-2 border-dashed border-zinc-400 pointer-events-none"
          style={{ left: `${(EQUAL_POINTS / MAX_POINTS) * 100}%` }}
        />
      </div>
      <span className="text-sm font-black text-white tabular-nums text-right">
        {value === null ? '–' : value.toFixed(1)}
      </span>
    </div>
  );
}

interface RevealScreenProps {
  /** 'social': after the Level 3 gambles, the player's answers for others
   * against the public's. 'personal': after the Level 4 gambles, both. */
  block: GambleBlock;
  social: CurvePoint[] | null;
  personal: CurvePoint[] | null;
  onContinue: () => void;
}

export default function RevealScreen({ block, social, personal, onContinue }: RevealScreenProps) {
  const t = REVEAL_TEXT;
  const st = SOCIAL_REVEAL_TEXT;
  const socialOnly = block === 'social';
  const c = t.chart;
  const [stepIndex, setStepIndex] = useState(0);
  const stepsViewed = useRef(new Set([0]));
  const openedAt = useRef(Date.now());

  const socialAttitude = social ? riskAttitude(social) : null;
  const personalAttitude = personal ? riskAttitude(personal) : null;
  // 'lower' = less cautious for yourself than for others (the usual pattern).
  const direction = social && personal ? compareCurves(personal, social).direction : null;
  // Social reveal only: 'higher' = more cautious for others than the public is.
  const vsPublic = socialOnly && social ? compareCurves(social, PUBLIC_SOCIAL).direction : null;

  useEffect(() => {
    track('elicitation_reveal_opened', {
      block, social_attitude: socialAttitude, personal_attitude: personalAttitude,
      direction: socialOnly ? vsPublic : direction,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectStep = (i: number) => {
    setStepIndex(i);
    stepsViewed.current.add(i);
    track('elicitation_reveal_step_selected', { block, from: STEPS[i][0], to: STEPS[i][1] });
  };

  const handleContinue = () => {
    track('elicitation_reveal_closed', {
      block,
      dwell_ms: Date.now() - openedAt.current,
      steps_viewed: stepsViewed.current.size,
    });
    onContinue();
  };

  const [from, to] = STEPS[stepIndex];
  const othersColor = CYCLE_COLORS[ElectionCycle.SocietalUtility];
  const selfColor = CYCLE_COLORS[ElectionCycle.PersonalUtility];
  const groups = [
    { label: c.others, scored: c.othersScored, color: othersColor, pub: risePoints(PUBLIC_SOCIAL, from, to), you: risePoints(social, from, to) },
    { label: c.self, scored: c.selfScored, color: selfColor, pub: risePoints(PUBLIC_PERSONAL, from, to), you: risePoints(personal, from, to) },
  ].slice(0, socialOnly ? 1 : 2);

  const callout = direction === 'lower' ? t.publicMatch
    : direction === 'higher' ? { title: t.publicOther.title, body: t.publicOther.opposite }
      : t.publicOther;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col gap-5 max-w-2xl mx-auto">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-bold text-pink-500">{socialOnly ? st.kicker : t.kicker}</span>
        <h1 className="text-2xl md:text-3xl font-black text-white">{socialOnly ? st.title : t.title}</h1>
      </div>

      <div className="flex flex-col gap-4 text-base text-zinc-300 leading-relaxed">
        {socialAttitude && (
          <p><strong className="text-white">{t.socialLabel}</strong>, {t.social[socialAttitude]}</p>
        )}
        {direction && (
          <p><strong className="text-white">{t.personalLabel}</strong>, {t.comparison[direction]}</p>
        )}
        {vsPublic && (
          <p><strong className="text-white">{st.vsPublicLabel}</strong>, {st.vsPublic[vsPublic]}</p>
        )}
      </div>

      {/* The headline finding, shown whenever both blocks were answered */}
      {direction && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="rounded-xl border-2 border-pink-500/70 bg-pink-500/10 p-4 md:p-5 flex gap-4 items-start"
        >
          <span className="text-3xl leading-none" aria-hidden>👥</span>
          <div className="flex flex-col gap-1">
            <p className="text-lg md:text-xl font-black text-white">{callout.title}</p>
            <p className="text-base md:text-lg font-semibold text-pink-100 leading-snug">{callout.body}</p>
          </div>
        </motion.div>
      )}

      {/* Bar chart: points for lifting one person by 2 levels */}
      <div className="rounded-xl bg-zinc-950/60 border border-zinc-800 p-4 md:p-5 flex flex-col gap-4">
        <p className="text-sm md:text-base font-bold text-white">{c.title(from, to)}</p>

        <div className="flex flex-wrap gap-2" role="tablist">
          {STEPS.map(([a, b], i) => (
            <button
              key={a}
              type="button"
              role="tab"
              aria-selected={i === stepIndex}
              onClick={() => selectStep(i)}
              className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                i === stepIndex
                  ? 'bg-pink-600 border-pink-600 text-white'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {a} → {b}
            </button>
          ))}
        </div>

        {/* One group per perspective, each a labelled pair of bars (out of MAX_POINTS) */}
        <div className="flex flex-col gap-4">
          {groups.map((g) => (
            <div key={g.label} className="flex flex-col gap-1.5 border-l-4 pl-3" style={{ borderColor: g.color }}>
              <div className="flex flex-col">
                <span className="text-sm font-black" style={{ color: g.color }}>{g.label}</span>
                <span className="text-xs text-zinc-400">{g.scored}</span>
              </div>
              <Bar label={c.you} value={g.you} color={g.color} solid={false} />
              <Bar label={c.public} value={g.pub} color={g.color} solid />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="h-4 border-l-2 border-dashed border-zinc-400" aria-hidden />
          {c.equalLine}
        </div>

        <p className="text-xs text-zinc-500 leading-relaxed">{c.note}</p>
      </div>

      <p className="text-base text-zinc-300 leading-relaxed">
        <strong className="text-white">{socialOnly ? st.bridge.title : t.bridge.title}</strong> {socialOnly ? st.bridge.body : t.bridge.body}
      </p>

      <button
        type="button"
        onClick={handleContinue}
        className="self-end mt-1 px-8 py-3 rounded-xl font-black bg-pink-600 hover:bg-pink-500 text-white transition-colors cursor-pointer"
      >
        {socialOnly ? st.button : t.button}
      </button>
    </div>
  );
}