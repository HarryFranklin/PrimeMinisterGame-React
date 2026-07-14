import { ElectionCycle, AxisVariable } from "./types";
import { CYCLE_COLORS } from "./uiHelpers";

export interface FrameworkRule {
  frameworkTitle: string;
  graphTitle: string;
  targetMetricName: string;
  targetMetricAbbreviation: string;
  targetMetricDescription: string;
  targetDirection?: 'maximize' | 'minimize';
  plotType: '1D' | '2D';
  yAxisType: AxisVariable;
  graphColor: string;
  winThresholdScalar: number; 
  briefingText: string;
}

export const FRAMEWORK_RULES: Record<ElectionCycle, FrameworkRule> = {
  [ElectionCycle.Benthamite]: {
    frameworkTitle: "Benthamite Framework",
    graphTitle: "Life Satisfaction Distribution",
    targetMetricName: "National Average Happiness",
    targetMetricAbbreviation: "NAH",
    targetMetricDescription: "Calculated by adding up the life satisfaction of every citizen and dividing it by the total population.",
    targetDirection: 'maximize',
    plotType: '1D',
    yAxisType: AxisVariable.LifeSatisfaction,
    graphColor: CYCLE_COLORS[ElectionCycle.Benthamite],
    winThresholdScalar: 0.905,
    briefingText: "Your goal is to increase the total amount of happiness in the country. You must enact policies that raise the national average, even if it leaves a minority of people behind.",
  },
  [ElectionCycle.Rawlsian]: {
    frameworkTitle: "Rawlsian Framework",
    graphTitle: "Life Satisfaction Distribution",
    targetMetricName: "Minimum Wellbeing Baseline",
    targetMetricAbbreviation: "MWB",
    targetMetricDescription: "Calculated by identifying the single lowest life satisfaction score currently held by any citizen.",
    targetDirection: 'maximize',
    plotType: '1D',
    yAxisType: AxisVariable.LifeSatisfaction,
    graphColor: CYCLE_COLORS[ElectionCycle.Rawlsian],
    winThresholdScalar: 0.625,
    briefingText: "Your goal is to protect the most vulnerable people in society. You must enact policies that improve the lives of the absolute worst-off, even if it brings down the national average.",
  },
  [ElectionCycle.PersonalUtility]: {
    frameworkTitle: "Personal Utility Framework",
    graphTitle: "Personal Utility Distribution",
    targetMetricName: "National Personal Satisfaction",
    targetMetricAbbreviation: "NPS",
    targetMetricDescription: "The average of each citizen's personal utility at their current life satisfaction score. Utility is non-linear — gains at the top of the LS scale are worth far less than equivalent gains in the middle.",
    targetDirection: 'maximize',
    plotType: '1D',
    yAxisType: AxisVariable.PersonalUtility,
    graphColor: CYCLE_COLORS[ElectionCycle.PersonalUtility],
    winThresholdScalar: 0.97,
    briefingText: "Not every improvement counts the same. Helping someone who is already comfortable barely moves the needle — they are doing fine. But helping someone who is struggling makes a real difference to how they feel. Your job is to find those people and lift them, not to keep adding to the lives of those who need it least.",
  },
  [ElectionCycle.SocietalUtility]: {
    frameworkTitle: "Societal Utility Framework",
    graphTitle: "Societal Utility Distribution",
    targetMetricName: "National Fairness Index",
    targetMetricAbbreviation: "NFI",
    targetMetricDescription: "The average of how each citizen evaluates the entire LS distribution — not just their own score. Citizens who observe a highly unequal society report lower utility regardless of their personal situation.",
    targetDirection: 'maximize',
    plotType: '1D',
    yAxisType: AxisVariable.SocietalFairness,
    graphColor: CYCLE_COLORS[ElectionCycle.SocietalUtility],
    winThresholdScalar: 0.9675,
    briefingText: "Voters are not just tracking their own lives — they are watching everyone else's too. A rising national average that leaves the bottom behind will cost you votes from citizens who find inequality itself distressing, even if they are personally unaffected. Your task is to grow wellbeing in a way the whole country can see as fair. Visible gaps are politically fatal here.",
  },
};