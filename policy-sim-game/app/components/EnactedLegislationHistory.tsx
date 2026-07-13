import React from 'react';
import { Policy } from '../utils/types';
import { PolicyRuleList } from './PolicyRuleCard';

interface EnactedLegEntry {
  turn: number;
  enactedPolicyId: string | null;
  enactedPolicyName: string | null;
  description?: string;
}

interface EnactedLegislationHistoryProps {
  enactedLegislation: EnactedLegEntry[];
  availablePolicies: Policy[];
  hoveredEnactedId: string | null;
  onHover: (policyId: string | null, turn: number | null) => void;
}

/**
 * The post-dissolution "Enacted Legislation" list, shown in place of
 * PolicyDeckList once parliament has dissolved. Hovering a row surfaces that
 * policy's rule breakdown via a shared PolicyRuleCard/PolicyRuleList — the
 * same component PolicyDeckList uses, so the two views can't drift apart
 * the way the old hand-duplicated JSX did.
 */
export default function EnactedLegislationHistory({
  enactedLegislation,
  availablePolicies,
  hoveredEnactedId,
  onHover,
}: EnactedLegislationHistoryProps) {
  return (
    <div className="flex flex-col gap-2 h-full min-h-0 overflow-visible justify-start relative">
      {enactedLegislation.map((leg, index) => {
        const isHovered = hoveredEnactedId !== null && hoveredEnactedId === leg.enactedPolicyId;
        const fullPolicy = availablePolicies.find((p) => p.id === leg.enactedPolicyId);

        return (
          <div
            key={index}
            onMouseEnter={() => onHover(leg.enactedPolicyId, leg.turn)}
            onMouseLeave={() => onHover(null, null)}
            className={`relative flex flex-col justify-center bg-white p-3 rounded-lg border border-zinc-200 shadow-sm cursor-pointer transition-colors shrink-0 ${
              isHovered ? 'z-50 ring-2 ring-pink-500/20' : 'z-10 hover:bg-zinc-50'
            }`}
          >
            <div className="flex gap-3 items-center min-w-0">
              <div className="w-7 h-7 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center text-sm font-black shrink-0">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-base text-zinc-900 leading-tight truncate">{leg.enactedPolicyName}</p>
              </div>
            </div>

            {isHovered && fullPolicy && (
              <div
                className={`absolute left-0 right-0 bg-white/95 backdrop-blur-md border border-pink-300 shadow-2xl rounded-xl p-4 flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200 pointer-events-none z-[100] ${
                  index >= 3 ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]'
                }`}
              >
                <span className="text-sm font-black uppercase tracking-widest text-pink-500">Details</span>
                <p className="text-sm text-zinc-600 leading-relaxed mb-1">{leg.description}</p>
                <div className="max-h-[190px] overflow-y-auto pr-1.5">
                  <PolicyRuleList rules={fullPolicy.specificRules} />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
