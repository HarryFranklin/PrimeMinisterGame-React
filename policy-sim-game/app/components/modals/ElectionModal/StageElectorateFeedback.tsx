import React, { useEffect, useMemo, useState } from 'react';
import { ElectionCycle, Respondent } from '../../../utils/types';
import { availablePolicies } from '../../../data/policies';
import { DPMMessage } from '../SharedModalComponents';
import { LSChangeBadge } from '../../ui';
import { PM_PROFILES } from '../../../utils/pmProfiles';
import { VOTER_QUOTES, VoterSentimentKind, PolicyRef } from '../../../content/voterQuotes';

interface VoterSentiment {
  emoji: string;
  kind: VoterSentimentKind;
  bestPolicy: PolicyRef | null;
  worstPolicy: PolicyRef | null;
}

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

  if (totalDiff <= -1.5) return { emoji: '😠', kind: 'very_negative', bestPolicy, worstPolicy };
  if (totalDiff < -0.1) return { emoji: '😟', kind: 'negative', bestPolicy, worstPolicy };
  if (totalDiff < 0.1) return { emoji: '🤔', kind: hasBoth ? 'neutral_mixed' : 'neutral', bestPolicy, worstPolicy };
  if (totalDiff < 1.5) return { emoji: '🙂', kind: 'positive', bestPolicy, worstPolicy };
  return { emoji: '😁', kind: 'very_positive', bestPolicy, worstPolicy };
}

function PolicySpan({
  policy,
  onHoverPolicy,
  onDefinitionToggle
}: {
  policy: PolicyRef;
  onHoverPolicy: (id: string | null) => void;
  onDefinitionToggle: (title: string, desc: string) => void;
}) {
  return (
    <span
      className="font-bold underline decoration-pink-300 decoration-2 underline-offset-2 text-pink-700 hover:text-pink-900 transition-colors cursor-pointer"
      onMouseEnter={() => onHoverPolicy(policy.id)}
      onMouseLeave={() => onHoverPolicy(null)}
      onClick={() => {
        // Find the full policy definition to show in the floating panel
        const fullPolicy = availablePolicies.find(p => p.id === policy.id);
        if (fullPolicy) {
          onDefinitionToggle(fullPolicy.policyName, fullPolicy.description);
        }
      }}
    >
      {policy.name}
    </span>
  );
}

/**
 * Interprets a VOTER_QUOTES template (see content/voterQuotes.ts) into
 * actual JSX for one voter. This is the "glue" logic — it doesn't contain
 * any of the actual words, and shouldn't need to change when the copy does.
 */
function renderVoterQuote(
  sentiment: VoterSentiment,
  pmName: string,
  altFormat: boolean,
  onHoverPolicy: (id: string | null) => void,
  onDefinitionToggle: (title: string, desc: string) => void
): React.ReactNode {
  const segments = VOTER_QUOTES[sentiment.kind][altFormat ? 'alt' : 'standard'];
  const interpolate = (s: string) => s.replace(/\{pmName\}/g, pmName);

  return segments.map((segment, i) => {
    if (segment.policyRef) {
      const policy = sentiment[segment.policyRef];

      if (policy && segment.withPolicy) {
        const [before, after] = interpolate(segment.withPolicy).split('{POLICY}');
        return (
          <React.Fragment key={i}>
            {before}
            <PolicySpan policy={policy} onHoverPolicy={onHoverPolicy} onDefinitionToggle={onDefinitionToggle} />
            {after}
          </React.Fragment>
        );
      }
      if (!policy && segment.withoutPolicy) {
        return <React.Fragment key={i}>{interpolate(segment.withoutPolicy)}</React.Fragment>;
      }
      return null; // no policy to reference and no fallback text — this segment is simply skipped
    }
    return <React.Fragment key={i}>{interpolate(segment.text || '')}</React.Fragment>;
  });
}

interface StageElectorateFeedbackProps {
  initialPopulation: Respondent[];
  baselinePopulation: Respondent[];
  finalPopulation: Respondent[];
  currentCycle: ElectionCycle;
  onReady: () => void;
  onDefinitionToggle: (title: string, desc: string) => void;
}

export default function StageElectorateFeedback({
  initialPopulation,
  baselinePopulation,
  finalPopulation,
  currentCycle,
  onReady,
  onDefinitionToggle
}: StageElectorateFeedbackProps) {
  const [hoveredPolicyId, setHoveredPolicyId] = useState<string | null>(null);

  useEffect(() => {
    onReady();
  }, [onReady]);

  // Find the current PM profile and extract the last word of the name string
  const currentPMProfile = PM_PROFILES.find((p) => p.cycle === currentCycle);
  const pmSurname = currentPMProfile?.name.split(' ').pop() || 'the Prime Minister';

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

    const uniquePool: typeof enriched = [];
    const seen = new Set<string>();
    for (const p of enriched) {
      const key = `${p.baselineLS.toFixed(1)}_${p.finalLS.toFixed(1)}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniquePool.push(p);
      }
    }

    const poolToUse = uniquePool.length >= 3 ? uniquePool : enriched;
    const sorted = [...poolToUse].sort((a, b) => a.lsDiff - b.lsDiff);
    
    const worst = sorted[0];
    const best = sorted[sorted.length - 1];
    let mid =
      sorted
        .filter(s => s.id !== worst.id && s.id !== best.id)
        .sort((a, b) => Math.abs(a.lsDiff) - Math.abs(b.lsDiff))[0];

    if (!mid && sorted.length > 2) mid = sorted[1];
    if (!mid) mid = worst;

    return Array.from(new Set([worst, mid, best]));
  }, [finalPopulation, initialPopulation, baselinePopulation]);

  const voterData = useMemo(
    () =>
      voxPops.map(vp => ({
        ...vp,
        sentiment: getVoterSentiment(vp, currentCycle),
      })),
    [voxPops, currentCycle]
  );

  return (
    <div className="flex flex-col gap-4 animate-in fade-in h-full min-h-0 overflow-hidden w-full">
      <DPMMessage title="Voter Sentiment">
        {`We've tracked how your policies impacted individual voters.\nClick the legislation referenced in their feedback to review its details.`}
      </DPMMessage>
      
      <div className="flex flex-col gap-3 w-full flex-1 min-h-0 overflow-y-auto pr-1 whitespace-pre-wrap">
        {voterData.map((vp, idx) => {
          return (
            <div key={idx} className="p-3 rounded-xl border border-zinc-200 bg-zinc-50 flex flex-col sm:flex-row gap-3 items-center w-full shadow-sm flex-1 min-h-0">
              <div className="flex flex-col items-center justify-center bg-white border border-zinc-200 rounded-full w-12 h-12 shrink-0 shadow-sm">
                <span className="text-3xl">{vp.sentiment.emoji}</span>
              </div>
              <div className="flex-1 w-full min-w-0">
                <div className="flex items-center justify-between mb-1 w-full">
                  <h4 className="font-bold text-zinc-900 text-sm truncate pr-2">{vp.name}</h4>
                  <LSChangeBadge startLS={vp.baselineLS} endLS={vp.finalLS} />
                </div>
                <p className="text-[12px] text-zinc-600 italic leading-snug line-clamp-3 whitespace-pre-wrap">
                  "{renderVoterQuote(vp.sentiment, pmSurname, idx % 2 === 0, setHoveredPolicyId, onDefinitionToggle)}"
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}