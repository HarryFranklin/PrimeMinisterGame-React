import { ElectionCycle } from './types';
import { FRAMEWORK_RULES } from './frameworkRules';

/**
 * The Deputy PM's advice for this turn. Shared by the desk (the note on the
 * folder) and the old DPMCard. Wording unchanged from DPMCard, except the
 * "a bill is open" lines, which now point at the desk instead of the old
 * "details panel" and "forecast".
 */
export function dpmAdvisory({
  currentCycle,
  currentTurn,
  selectedPolicy,
  cycleMAO,
  currentMetricScore,
}: {
  currentCycle: ElectionCycle;
  currentTurn: number;
  /** Is a bill open? */
  selectedPolicy: boolean;
  cycleMAO: number;
  currentMetricScore: number;
}): string {
  const rule = FRAMEWORK_RULES[currentCycle];
  const target = cycleMAO * rule.winThresholdScalar;
  const progressRatio = target > 0 ? Math.min(currentMetricScore / target, 1) : 0;
  const isBehind = progressRatio < 0.7;
  const isLate = currentTurn >= 4;

  if (selectedPolicy) {
    switch (currentCycle) {
      case ElectionCycle.SocietalUtility:
        return "The strips under the chart show who this bill affects. Check whether it widens or narrows the gap between the top and the bottom.";
      case ElectionCycle.PersonalUtility:
        return "The strips under the chart show who this bill targets. Compare them with the \"What a +1 in Life Satisfaction is worth\" bars to see how much it will really count.";
      default:
        return "Review the bill's impact before you sign it.";
    }
  }

  switch (currentCycle) {
    case ElectionCycle.Benthamite:
      return "We need to boost the national average. Prioritise policies that deliver widespread gains, as total numbers are all that matter right now.";
    case ElectionCycle.Rawlsian:
      return "The public is watching how we treat the most vulnerable. Focus your political capital entirely on raising the baseline for those worst-off.";
    case ElectionCycle.SocietalUtility: {
      if (currentTurn <= 2) return "Citizens are not just evaluating their own score here — they are evaluating the shape of the entire distribution. A rising average that widens inequality will cost you votes. Compression matters as much as growth.";
      if (isBehind && !isLate) return "We are behind. The score is dragged down when citizens observe a widening gap. Prioritise policies that either raise the floor or reduce the spread — even modest gains at the bottom count double here.";
      if (isBehind && isLate) return "We are running out of time. Enact policies that visibly compress the distribution. Citizens with inequality-averse preferences — the majority — will not forgive a rising tide that lifts only some boats.";
      return "We are on track. But beware of complacency — any policy that concentrates gains at the top can undo progress quickly. The societal score is sensitive to visible inequality.";
    }
    case ElectionCycle.PersonalUtility: {
      if (currentTurn <= 2) return "Personal utility is not linear. A citizen already at LS 8 gains almost nothing from another point upward — their curve has flattened. The real score gains come from lifting those in the LS 2-4 range, where the curve is steepest. Look at the \"What a +1 in Life Satisfaction is worth\" bars.";
      if (isBehind && !isLate) return "We are behind target. Focus on the columns with the tallest \"What a +1 in Life Satisfaction is worth\" bars — those are the high-yield zones. Moving citizens into those columns is worth more than spreading gains evenly.";
      if (isBehind && isLate) return "Time is short and we are behind. Every remaining policy must target citizens in the steepest part of the utility curve. Gains at the top end are almost worthless — gains in the middle are not.";
      return "We are on track. Stay disciplined — avoid policies that look good for LS averages but push people into flat parts of the utility curve. The bars under the chart tell you what actually counts.";
    }
    default:
      return "";
  }
}
