import React, { useEffect, useMemo, useState } from 'react';
import { ElectionCycle, Respondent } from '../../../utils/types';
import { availablePolicies } from '../../../data/policies';
import { DPMMessage } from '../SharedModalComponents';
import { LSChangeBadge } from '../../ui';
import { PM_PROFILES } from '../../../utils/pmProfiles';

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

interface VoterQuoteProps {
  sentiment: VoterSentiment;
  onHoverPolicy: (id: string | null) => void;
  onDefinitionToggle: (title: string, desc: string) => void;
  pmName: string;
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

function VoterQuote({ sentiment, onHoverPolicy, onDefinitionToggle, pmName }: VoterQuoteProps) {
  const { kind, bestPolicy, worstPolicy } = sentiment;

  switch (kind) {
    case 'very_negative':
      return (
        <>
          Things have gotten really tough since this government took office.{' '}
          {worstPolicy ? (
            <>
              Having <PolicySpan policy={worstPolicy} onHoverPolicy={onHoverPolicy} onDefinitionToggle={onDefinitionToggle} /> pass made it so much harder to get by, not that {pmName} seems to care.
            </>
          ) : (
            `The policies completely ignored my needs, and ${pmName} has lost my trust entirely.`
          )}
        </>
      );
    case 'negative':
      return (
        <>
          I'm definitely worse off than I was.{' '}
          {worstPolicy ? (
            <>
              <PolicySpan policy={worstPolicy} onHoverPolicy={onHoverPolicy} onDefinitionToggle={onDefinitionToggle} /> really didn't help matters, and I honestly expected better from {pmName}'s administration.
            </>
          ) : (
            "The agenda just didn't work for me."
          )}
        </>
      );
    case 'neutral_mixed':
      return (
        <>
          I haven't noticed much difference overall.{' '}
          {bestPolicy && (
            <>
              <PolicySpan policy={bestPolicy} onHoverPolicy={onHoverPolicy} onDefinitionToggle={onDefinitionToggle} /> helped a bit,{' '}
            </>
          )}
          {worstPolicy && (
            <>
              but <PolicySpan policy={worstPolicy} onHoverPolicy={onHoverPolicy} onDefinitionToggle={onDefinitionToggle} /> set me back just as much.
            </>
          )}
        </>
      );
    case 'neutral':
      return (
        <>
          My life hasn't changed much at all. All the political noise from {pmName} hasn't really affected my day-to-day.
        </>
      );
    case 'positive':
      return (
        <>
          Things are looking up a bit.{' '}
          {bestPolicy ? (
            <>
              <PolicySpan policy={bestPolicy} onHoverPolicy={onHoverPolicy} onDefinitionToggle={onDefinitionToggle} /> actually made things easier for me, so I'm glad {pmName} finally delivered on that.
            </>
          ) : (
            `The agenda seems to be heading in a good direction.`
          )}
        </>
      );
    case 'very_positive':
      return (
        <>
          I've seen a huge difference!{' '}
          {bestPolicy ? (
            <>
              <PolicySpan policy={bestPolicy} onHoverPolicy={onHoverPolicy} onDefinitionToggle={onDefinitionToggle} /> really turned things around for me. {pmName} has definitely earned my vote.
            </>
          ) : (
            `The agenda directly enhanced my quality of life. ${pmName} has definitely earned my vote.`
          )}
        </>
      );
  }
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
                <span className="text-2xl">{vp.sentiment.emoji}</span>
              </div>
              <div className="flex-1 w-full min-w-0">
                <div className="flex items-center justify-between mb-1 w-full">
                  <h4 className="font-bold text-zinc-900 text-sm truncate pr-2">{vp.name}</h4>
                  <LSChangeBadge startLS={vp.baselineLS} endLS={vp.finalLS} />
                </div>
                <p className="text-[13px] text-zinc-600 italic leading-snug line-clamp-3 whitespace-pre-wrap">
                  "<VoterQuote 
                    sentiment={vp.sentiment} 
                    onHoverPolicy={setHoveredPolicyId} 
                    onDefinitionToggle={onDefinitionToggle} 
                    pmName={pmSurname} 
                  />"
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}