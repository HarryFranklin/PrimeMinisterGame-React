import React, { useEffect, useMemo, useState } from 'react';
import { ElectionCycle, Respondent } from '../../../utils/types';
import { availablePolicies } from '../../../data/policies';
import { DPMMessage } from '../SharedModalComponents';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PolicyRef {
  id: string;
  name: string;
}

interface VoterSentiment {
  emoji: string;
  kind: 'very_negative' | 'negative' | 'neutral_mixed' | 'neutral' | 'positive' | 'very_positive';
  bestPolicy: PolicyRef | null;
  worstPolicy: PolicyRef | null;
}

// ---------------------------------------------------------------------------
// Pure helpers (no JSX)
// ---------------------------------------------------------------------------

function getVoterSentiment(citizen: any, cycle: ElectionCycle): VoterSentiment {
  const cycleLedger = citizen.historicalLedger?.find((l: any) => l.cycle === cycle);

  if (!cycleLedger || cycleLedger.turns.length < 2) {
    return { emoji: '😐', kind: 'neutral', bestPolicy: null, worstPolicy: null };
  }

  let bestTurn = { name: '', id: null as string | null, delta: -Infinity };
  let worstTurn = { name: '', id: null as string | null, delta: Infinity };

  for (let i = 1; i < cycleLedger.turns.length; i++) {
    const delta = cycleLedger.turns[i].ls - cycleLedger.turns[i - 1].ls;
    const policyName: string = cycleLedger.turns[i].policyName || '';
    const policyId: string | null = cycleLedger.turns[i].policyId ?? null;

    if (delta > bestTurn.delta) bestTurn = { name: policyName, id: policyId, delta };
    if (delta < worstTurn.delta) worstTurn = { name: policyName, id: policyId, delta };
  }

  const bestPolicy: PolicyRef | null =
    bestTurn.id && bestTurn.name ? { id: bestTurn.id, name: bestTurn.name } : null;
  const worstPolicy: PolicyRef | null =
    worstTurn.id && worstTurn.name ? { id: worstTurn.id, name: worstTurn.name } : null;

  const totalDiff: number = citizen.lsDiff ?? 0;
  const hasBoth = bestPolicy && worstPolicy && Math.abs(bestTurn.delta) > 0.1 && Math.abs(worstTurn.delta) > 0.1;

  if (totalDiff <= -1.5) return { emoji: '😡', kind: 'very_negative', bestPolicy, worstPolicy };
  if (totalDiff < -0.1) return { emoji: '😟', kind: 'negative', bestPolicy, worstPolicy };
  if (totalDiff < 0.1) return { emoji: '😐', kind: hasBoth ? 'neutral_mixed' : 'neutral', bestPolicy, worstPolicy };
  if (totalDiff < 1.5) return { emoji: '🙂', kind: 'positive', bestPolicy, worstPolicy };
  return { emoji: '😄', kind: 'very_positive', bestPolicy, worstPolicy };
}

// ---------------------------------------------------------------------------
// VoterQuote — renders the sentiment sentence with interactive policy spans
// ---------------------------------------------------------------------------

interface VoterQuoteProps {
  sentiment: VoterSentiment;
  onHoverPolicy: (id: string | null) => void;
}

function PolicySpan({
  policy,
  onHoverPolicy,
}: {
  policy: PolicyRef;
  onHoverPolicy: (id: string | null) => void;
}) {
  return (
    <span
      className="font-bold underline decoration-pink-300 decoration-2 underline-offset-2 text-pink-700 hover:text-pink-900 transition-colors cursor-pointer"
      onMouseEnter={() => onHoverPolicy(policy.id)}
      onMouseLeave={() => onHoverPolicy(null)}
    >
      {policy.name}
    </span>
  );
}

function VoterQuote({ sentiment, onHoverPolicy }: VoterQuoteProps) {
  const { kind, bestPolicy, worstPolicy } = sentiment;

  switch (kind) {
    case 'very_negative':
      return (
        <>
          Since this government took office, things have gotten really tough.{' '}
          {worstPolicy ? (
            <>
              Having the <PolicySpan policy={worstPolicy} onHoverPolicy={onHoverPolicy} /> pass made it so much harder to
              get by.
            </>
          ) : (
            'The policies completely ignored my needs.'
          )}
        </>
      );
    case 'negative':
      return (
        <>
          I'm definitely worse off than I was.{' '}
          {worstPolicy ? (
            <>
              The <PolicySpan policy={worstPolicy} onHoverPolicy={onHoverPolicy} /> really didn't help matters.
            </>
          ) : (
            "The agenda just didn't work for me."
          )}
        </>
      );
    case 'neutral_mixed':
      return (
        <>
          Honestly, I haven't noticed much difference overall.{' '}
          {bestPolicy && (
            <>
              The <PolicySpan policy={bestPolicy} onHoverPolicy={onHoverPolicy} /> helped a bit,{' '}
            </>
          )}
          {worstPolicy && (
            <>
              but the <PolicySpan policy={worstPolicy} onHoverPolicy={onHoverPolicy} /> set me back just as much.
            </>
          )}
        </>
      );
    case 'neutral':
      return <>Honestly, my life hasn't changed much at all. The politicians' arguments haven't really affected my day-to-day.</>;
    case 'positive':
      return (
        <>
          Things are looking up a bit.{' '}
          {bestPolicy ? (
            <>
              The <PolicySpan policy={bestPolicy} onHoverPolicy={onHoverPolicy} /> actually made things easier for me.
            </>
          ) : (
            'The agenda seems to be heading in a good direction.'
          )}
        </>
      );
    case 'very_positive':
      return (
        <>
          I've seen a huge difference!{' '}
          {bestPolicy ? (
            <>
              The <PolicySpan policy={bestPolicy} onHoverPolicy={onHoverPolicy} /> really helped me out and turned things
              around.
            </>
          ) : (
            'The agenda directly enhanced my quality of life.'
          )}
        </>
      );
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface StageElectorateFeedbackProps {
  initialPopulation: Respondent[];
  baselinePopulation: Respondent[];
  finalPopulation: Respondent[];
  currentCycle: ElectionCycle;
  onReady: () => void;
}

export default function StageElectorateFeedback({
  initialPopulation,
  baselinePopulation,
  finalPopulation,
  currentCycle,
  onReady,
}: StageElectorateFeedbackProps) {
  const [hoveredPolicyId, setHoveredPolicyId] = useState<string | null>(null);

  useEffect(() => {
    onReady();
  }, [onReady]);

  // Pick 3 representative citizens: most-declined, most-neutral, most-improved
  const voxPops = useMemo(() => {
    const enriched = finalPopulation.map((p, i) => {
      const baseline = baselinePopulation.find(b => b.id === p.id) ?? initialPopulation[i];
      return {
        ...p,
        baselineLS: baseline.currentLS,
        finalLS: p.currentLS,
        lsDiff: p.currentLS - baseline.currentLS,
      };
    });

    const sorted = [...enriched].sort((a, b) => a.lsDiff - b.lsDiff);
    const worst = sorted[0];
    const best = sorted[sorted.length - 1];

    const mid =
      sorted
        .filter(s => s.id !== worst.id && s.id !== best.id)
        .sort((a, b) => Math.abs(a.lsDiff) - Math.abs(b.lsDiff))[0] ?? sorted[Math.floor(sorted.length / 2)];

    return [worst, mid, best];
  }, [finalPopulation, initialPopulation, baselinePopulation]);

  // Derive sentiments
  const voterData = useMemo(
    () =>
      voxPops.map(vp => ({
        ...vp,
        sentiment: getVoterSentiment(vp, currentCycle),
      })),
    [voxPops, currentCycle]
  );

  // Collect ONLY the policies that are actually rendered in the current quote
  const referencedPolicyIds = useMemo(() => {
    const ids = new Set<string>();
    voterData.forEach(({ sentiment }) => {
      const { kind, bestPolicy, worstPolicy } = sentiment;
      
      if (['very_negative', 'negative', 'neutral_mixed'].includes(kind) && worstPolicy?.id) {
        ids.add(worstPolicy.id);
      }
      if (['positive', 'very_positive', 'neutral_mixed'].includes(kind) && bestPolicy?.id) {
        ids.add(bestPolicy.id);
      }
    });
    return Array.from(ids);
  }, [voterData]);

  return (
    <div className="flex gap-6 w-full animate-in fade-in h-full">
      {/* Left: voter cards */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <DPMMessage title="Voter Sentiment">
          We've tracked how your policies impacted individual voters. Hover over policy names to review the enacted
          legislation.
        </DPMMessage>

        <div className="flex flex-col gap-3 w-full">
          {voterData.map((vp, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-zinc-200 bg-zinc-50 flex flex-col sm:flex-row gap-4 items-center w-full shadow-sm"
            >
              <div className="flex flex-col items-center justify-center bg-white border border-zinc-200 rounded-full w-14 h-14 shrink-0 shadow-sm">
                <span className="text-2xl">{vp.sentiment.emoji}</span>
              </div>

              <div className="flex-1 w-full min-w-0">
                <div className="flex items-center justify-between mb-2 w-full">
                  <h4 className="font-bold text-zinc-900 text-base truncate pr-2">{vp.name}</h4>
                  
                  {/* Dynamic LS Badge colors restored */}
                  <div className={`flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-md border shadow-sm shrink-0 ${
                    vp.lsDiff > 0.05 ? 'border-emerald-200' : vp.lsDiff < -0.05 ? 'border-rose-200' : 'border-zinc-200'
                  }`}>
                    <span className="text-xs font-bold text-zinc-500">LS: {vp.baselineLS.toFixed(1)}</span>
                    <span className="text-xs text-zinc-300 font-black">→</span>
                    <span className={`text-xs font-black ${
                      vp.lsDiff > 0.05 ? 'text-emerald-600' : vp.lsDiff < -0.05 ? 'text-rose-600' : 'text-zinc-600'
                    }`}>
                      {vp.finalLS.toFixed(1)}
                    </span>
                  </div>

                </div>
                <p className="text-sm text-zinc-600 italic leading-snug">
                  "
                  <VoterQuote sentiment={vp.sentiment} onHoverPolicy={setHoveredPolicyId} />
                  "
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: legislation panel - widened to 360px with larger text */}
      <div className="w-[360px] shrink-0 border-l border-zinc-200 pl-6 flex flex-col">
        <h4 className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4">Referenced Legislation</h4>
        <div className="flex flex-col gap-4 overflow-y-auto pr-1">
          {referencedPolicyIds.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 text-center">
              <span className="text-xs font-bold text-zinc-400">No specific policies referenced by these citizens.</span>
            </div>
          ) : (
            referencedPolicyIds.map(id => {
              const policy = availablePolicies.find(p => p.id === id);
              if (!policy) return null;
              const isHovered = hoveredPolicyId === id;

              return (
                <div
                  key={id}
                  className={`p-4 rounded-xl border transition-all duration-300 ${
                    isHovered
                      ? 'bg-pink-50 border-pink-400 shadow-md scale-[1.02]'
                      : 'bg-white border-zinc-200 shadow-sm opacity-80'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest text-pink-500 block mb-1">Enacted</span>
                  <p className="font-bold text-base text-zinc-900 mb-1.5">{policy.policyName}</p>
                  <p className="text-sm text-zinc-700 leading-relaxed line-clamp-3">{policy.description}</p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}