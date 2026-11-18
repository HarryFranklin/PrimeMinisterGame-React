import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { track } from '../../client/telemetry';
import { WelfareMetrics } from '../../utils/WelfareMetrics';
import { CYCLE_COLORS } from '../../utils/uiHelpers';
import { ElectionCycle } from '../../utils/types';
import {
  GambleBlock, LADDER_LABELS, acceptedLabel, compareCaution, publicAcceptedIndex,
} from '../../utils/ElicitationEngine';
import { REVEAL_TEXT } from './elicitationText';

/** Where the public would accept the gamble at LS 4, from their utility
 * curves (the ones that score Levels 3 and 4). */
const publicIndex = (type: 'societal' | 'personal') =>
  publicAcceptedIndex(WelfareMetrics.getUtility(2, type), WelfareMetrics.getUtility(4, type), WelfareMetrics.getUtility(6, type));
const PUBLIC_OTHERS = publicIndex('societal');
const PUBLIC_SELF = publicIndex('personal');

type Marker = { label: string; index: number; color: string; solid: boolean };

/** The risk ladder, 1 in 2 at the top down to "never", with a chip on the
 * step where each answer accepted the gamble. */
function Ladder({ markers }: { markers: Marker[] }) {
  const rows = [...LADDER_LABELS, REVEAL_TEXT.chart.never];
  return (
    <div className="flex flex-col">
      {rows.map((label, i) => {
        const here = markers.filter((m) => m.index === i);
        return (
          <div key={label} className="grid grid-cols-[110px_1fr] items-center gap-3 border-t border-zinc-800 first:border-t-0 min-h-[30px] py-1">
            <span className={`text-xs font-bold tabular-nums ${here.length ? 'text-white' : 'text-zinc-500'}`}>{label}</span>
            <div className="flex flex-wrap gap-1.5">
              {here.map((m) => (
                <motion.span
                  key={m.label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="px-2 py-0.5 rounded-md text-[11px] font-black"
                  style={m.solid
                    ? { backgroundColor: m.color, color: '#ffffff' }
                    : { border: `2px solid ${m.color}`, color: m.color, backgroundColor: `${m.color}22` }}
                >
                  {m.label}
                </motion.span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface RevealScreenProps {
  /** 'social': after the Level 3 gamble, the player's answer for others
   * against the public's. 'personal': after the Level 4 gamble, both. */
  block: GambleBlock;
  /** Ladder index where each gamble was accepted (LADDER.length = never), or null. */
  social: number | null;
  personal: number | null;
  onContinue: () => void;
}

export default function RevealScreen({ block, social, personal, onContinue }: RevealScreenProps) {
  const t = REVEAL_TEXT;
  const socialOnly = block === 'social';
  const openedAt = useRef(Date.now());

  const describe = (lines: typeof t.social, index: number) =>
    (index === 0 ? lines.first : index >= LADDER_LABELS.length ? lines.never : lines.at(LADDER_LABELS[index]));
  // Social reveal: 'higher' = more cautious for others than the public is.
  const vsPublic = socialOnly && social !== null ? compareCaution(social, PUBLIC_OTHERS) : null;
  // Personal reveal: 'lower' = less cautious for yourself than for others (the usual pattern).
  const direction = !socialOnly && social !== null && personal !== null ? compareCaution(personal, social) : null;

  useEffect(() => {
    track('elicitation_reveal_opened', {
      block,
      social_accepted_at: social === null ? null : acceptedLabel(social),
      personal_accepted_at: personal === null ? null : acceptedLabel(personal),
      direction: socialOnly ? vsPublic : direction,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContinue = () => {
    track('elicitation_reveal_closed', { block, dwell_ms: Date.now() - openedAt.current });
    onContinue();
  };

  const othersColor = CYCLE_COLORS[ElectionCycle.SocietalUtility];
  const selfColor = CYCLE_COLORS[ElectionCycle.PersonalUtility];
  const markers: Marker[] = [
    ...(social !== null ? [{ label: t.chart.youOthers, index: social, color: othersColor, solid: false }] : []),
    { label: t.chart.publicOthers, index: PUBLIC_OTHERS, color: othersColor, solid: true },
    ...(!socialOnly && personal !== null ? [{ label: t.chart.youSelf, index: personal, color: selfColor, solid: false }] : []),
    ...(!socialOnly ? [{ label: t.chart.publicSelf, index: PUBLIC_SELF, color: selfColor, solid: true }] : []),
  ];
  const bridge = socialOnly ? t.socialBridge : t.personalBridge;
  const pubLabel = (i: number) => acceptedLabel(i);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col gap-5 max-w-2xl mx-auto">
      <div className="flex flex-col gap-1">
        <span className="text-sm font-bold text-pink-500">{t.kicker}</span>
        <h1 className="text-2xl md:text-3xl font-black text-white">{t.title}</h1>
      </div>

      <div className="flex flex-col gap-4 text-base text-zinc-300 leading-relaxed">
        {social !== null && (
          <p><strong className="text-white">{t.social.label}</strong>, {describe(t.social, social)}</p>
        )}
        {vsPublic && (
          <p><strong className="text-white">{t.vsPublicLabel}</strong>, {t.vsPublic[vsPublic](pubLabel(PUBLIC_OTHERS))}</p>
        )}
        {!socialOnly && personal !== null && (
          <p>
            <strong className="text-white">{t.personal.label}</strong>, {describe(t.personal, personal)}
            {direction && <> {t.comparison[direction]}</>}
          </p>
        )}
      </div>

      {/* The headline finding, once both answers are in */}
      {direction && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="rounded-xl border-2 border-pink-500/70 bg-pink-500/10 p-4 md:p-5 flex gap-4 items-start"
        >
          <span className="text-3xl leading-none" aria-hidden>👥</span>
          <div className="flex flex-col gap-1">
            <p className="text-lg md:text-xl font-black text-white">{direction === 'lower' ? t.publicMatch.title : t.publicOther.title}</p>
            <p className="text-base md:text-lg font-semibold text-pink-100 leading-snug">{t.publicPattern(pubLabel(PUBLIC_SELF), pubLabel(PUBLIC_OTHERS))}</p>
          </div>
        </motion.div>
      )}

      {/* The ladder: where each answer accepted the gamble */}
      <div className="rounded-xl bg-zinc-950/60 border border-zinc-800 p-4 md:p-5 flex flex-col gap-3">
        <p className="text-sm md:text-base font-bold text-white">{t.chart.title}</p>
        <Ladder markers={markers} />
        <p className="text-xs text-zinc-500 leading-relaxed">{t.chart.note}</p>
      </div>

      <p className="text-base text-zinc-300 leading-relaxed">
        <strong className="text-white">{bridge.title}</strong> {bridge.body}
      </p>

      <button
        type="button"
        onClick={handleContinue}
        className="self-end mt-1 px-8 py-3 rounded-xl font-black bg-pink-600 hover:bg-pink-500 text-white transition-colors cursor-pointer"
      >
        {bridge.button}
      </button>
    </div>
  );
}
