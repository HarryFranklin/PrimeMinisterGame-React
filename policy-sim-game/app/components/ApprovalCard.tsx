import React from 'react';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber';

interface ApprovalCardProps {
  approvalRating: number;
  isParliamentDissolved: boolean;
  accentColor: string;
}

/**
 * The "Public Approval" readout in the dashboard's middle column. Extracted
 * from DashboardTab; the number-tweening behavior now lives in
 * useAnimatedNumber so it isn't tied to this one readout anymore.
 */
export default function ApprovalCard({ approvalRating, isParliamentDissolved, accentColor }: ApprovalCardProps) {
  const displayApproval = useAnimatedNumber(approvalRating);

  return (
    <div className="bg-zinc-900 rounded-xl shadow-lg p-5 flex flex-col items-center justify-center shrink-0 h-36 lg:h-40 relative overflow-hidden transition-all">
      <div className="absolute top-0 left-0 w-full h-1.5" style={{ backgroundColor: accentColor }} />
      <p className="text-xs lg:text-sm font-bold uppercase tracking-widest text-zinc-400 mb-1">Public Approval</p>

      {isParliamentDissolved ? (
        <p className="text-3xl lg:text-4xl font-black tracking-widest text-zinc-500 mt-2">UNCLEAR</p>
      ) : (
        <>
          <p
            className={`text-5xl lg:text-6xl font-black tracking-tighter transition-colors duration-500 ${
              approvalRating >= 51 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {displayApproval.toFixed(1)}%
          </p>
          <p className="text-sm text-zinc-500 mt-2 text-center px-4">
            Requirement: <strong className="text-zinc-300">51.0%</strong>
          </p>
        </>
      )}
    </div>
  );
}
