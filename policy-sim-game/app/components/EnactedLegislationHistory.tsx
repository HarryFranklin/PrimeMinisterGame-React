import React, { useState } from 'react';
import { Policy, TurnHistory } from '../utils/types';
import { PolicyRuleList } from './PolicyRuleCard';

interface EnactedLegEntry extends TurnHistory {
  description?: string;
}

interface EnactedLegislationHistoryProps {
  enactedLegislation: EnactedLegEntry[];
  availablePolicies: Policy[];
  hoveredEnactedId: string | null;
  onHover: (policyId: string | null, turn: number | null) => void;
}

export default function EnactedLegislationHistory({
  enactedLegislation,
  availablePolicies,
  hoveredEnactedId,
  onHover,
}: EnactedLegislationHistoryProps) {
  const [dynamicMaxHeight, setDynamicMaxHeight] = useState<number | null>(null);

  const handleMouseEnter = (e: React.MouseEvent, leg: EnactedLegEntry, index: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const buffer = 60; // Extra space for header/footer padding
    
    // Calculate available space based on whether the modal pops up (index >= 3) or down
    if (index >= 3) {
      // Pops UP: available space is the distance from the top of the item to the screen top
      setDynamicMaxHeight(rect.top - buffer);
    } else {
      // Pops DOWN: available space is the distance from the bottom of the item to the screen bottom
      setDynamicMaxHeight(window.innerHeight - rect.bottom - buffer);
    }
    
    onHover(leg.enactedPolicyId, leg.turn);
  };

  return (
    <div className="flex flex-col gap-2 h-full min-h-0 overflow-visible justify-start relative">
      {enactedLegislation.map((leg, index) => {
        const isHovered = hoveredEnactedId !== null && hoveredEnactedId === leg.enactedPolicyId;
        const fullPolicy = availablePolicies.find((p) => p.id === leg.enactedPolicyId);

        return (
          <div
            key={index}
            onMouseEnter={(e) => handleMouseEnter(e, leg, index)}
            onMouseLeave={() => { setDynamicMaxHeight(null); onHover(null, null); }}
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
                className={`absolute left-0 right-0 bg-white/95 backdrop-blur-md border border-pink-300 shadow-2xl rounded-xl p-4 flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200 cursor-auto z-[9999] before:absolute before:-inset-y-4 before:inset-x-0 before:-z-10 ${
                  index >= 3 ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]'
                }`}
                style={{ maxHeight: dynamicMaxHeight ? `${dynamicMaxHeight}px` : '60vh' }}
              >
                <span className="text-sm font-black uppercase tracking-widest text-pink-500">Details</span>
                <p className="text-sm text-zinc-600 leading-relaxed mb-1">{leg.description}</p>
                
                {/* Scroll container */}
                <div className="flex-1 min-h-0 overflow-y-auto pr-1.5 overscroll-contain pb-2">
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