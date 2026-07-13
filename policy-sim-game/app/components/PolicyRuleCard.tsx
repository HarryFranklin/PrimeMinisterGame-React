import React from 'react';
import { PolicyRule, Respondent } from '../utils/types';
import { IMPACT_COLORS } from '../utils/uiHelpers';

/**
 * Renders a single policy rule's impact: note, +/- LS impact, affected LS
 * range, and (optionally) what share of the population it currently covers.
 *
 * This exact card previously existed as two independent copies inside
 * DashboardTab.tsx — one for the selectable policy deck's "View Details"
 * popup, one for the "Enacted Legislation" history popup — which had already
 * drifted apart slightly (the deck version showed a coverage %, the history
 * version didn't). Consolidating them here means a future style or formula
 * change only needs to happen once, and `showCoverage` makes the one real
 * difference between the two call sites an explicit, intentional prop
 * instead of an accident of copy-pasting.
 */
export const PolicyRuleCard = ({
  rule,
  population,
  showCoverage = false,
}: {
  rule: PolicyRule;
  /** Required only when showCoverage is true, to compute eligible-population %. */
  population?: Respondent[];
  showCoverage?: boolean;
}) => {
  const minStr = rule.minLS !== undefined ? rule.minLS : 0;
  const maxStr = rule.maxLS !== undefined ? rule.maxLS : 10;
  const lsRange = `LS ${minStr} to ${maxStr}`;
  const isPositive = rule.impact > 0;
  const ruleColor = isPositive ? IMPACT_COLORS['Will improve'] : IMPACT_COLORS['Will worsen'];
  const ruleBg = isPositive ? 'rgba(59,130,246,0.04)' : 'rgba(245,158,11,0.04)';

  let coveragePercentage: number | null = null;
  if (showCoverage && population) {
    const eligible = population.filter(
      (p) => (rule.minLS === undefined || p.currentLS >= rule.minLS) && (rule.maxLS === undefined || p.currentLS <= rule.maxLS)
    ).length;
    const coverage = Math.round(eligible * rule.proportion);
    coveragePercentage = population.length > 0 ? Math.round((coverage / population.length) * 100) : 0;
  }

  return (
    <div
      className="rounded-lg border border-zinc-100 overflow-hidden shadow-sm border-l-4 p-2.5 shrink-0"
      style={{ borderLeftColor: ruleColor, backgroundColor: ruleBg }}
    >
      <div className="flex justify-between items-center gap-2">
        <span className="font-bold text-[13px] text-zinc-800 leading-snug">{rule.note}</span>
        <span className="font-black text-[13px] shrink-0" style={{ color: ruleColor }}>
          {isPositive ? '+' : ''}
          {rule.impact} LS
        </span>
      </div>
      <div className="flex gap-2 pt-1.5 items-center">
        <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Range</span>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ruleColor }} />
          <span className="text-[11px] font-bold text-zinc-600">{lsRange}</span>
        </div>
        {coveragePercentage !== null && (
          <>
            <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400 ml-auto">Coverage</span>
            <span className="text-[11px] font-bold text-zinc-600">~{coveragePercentage}%</span>
          </>
        )}
      </div>
    </div>
  );
};

/** A vertical list of PolicyRuleCards with the divider rule already applied. */
export const PolicyRuleList = ({
  rules,
  population,
  showCoverage = false,
  className = '',
}: {
  rules: PolicyRule[];
  population?: Respondent[];
  showCoverage?: boolean;
  className?: string;
}) => (
  <div className={`flex flex-col gap-2 ${className}`}>
    {rules.map((rule, idx) => (
      <React.Fragment key={idx}>
        {idx > 0 && <div className="h-px w-full bg-pink-200/50 my-1 rounded-full shrink-0" />}
        <PolicyRuleCard rule={rule} population={population} showCoverage={showCoverage} />
      </React.Fragment>
    ))}
  </div>
);
