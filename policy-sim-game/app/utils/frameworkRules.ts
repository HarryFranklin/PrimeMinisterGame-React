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
    targetMetricName: "National Average Life Satisfaction",
    targetMetricAbbreviation: "NALS",
    targetMetricDescription: "The average Life Satisfaction of all citizens.",
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
    targetMetricDescription: "The average of each citizen's personal utility: how they value their own life satisfaction. Gains at the bottom of the scale count for more than gains at the top.",
    targetDirection: 'maximize',
    plotType: '1D',
    yAxisType: AxisVariable.PersonalUtility,
    graphColor: CYCLE_COLORS[ElectionCycle.PersonalUtility],
    winThresholdScalar: 0.92,
    briefingText: "In Level 3 you were judged by how people value other people's lives. Now each citizen judges by how they value their own. People are less cautious with their own lives than with others', so helping the worst-off still counts for more, but by less than before. Personal utility respects the choices people make for their own lives.",
  },
  [ElectionCycle.SocietalUtility]: {
    frameworkTitle: "Societal Utility Framework",
    graphTitle: "Societal Utility Distribution",
    targetMetricName: "National Fairness Index",
    targetMetricAbbreviation: "NFI",
    targetMetricDescription: "The average of how each citizen judges the whole country's LS distribution, using the values they hold when deciding for others. Gains for the worst-off count for much more than gains at the top.",
    targetDirection: 'maximize',
    plotType: '1D',
    yAxisType: AxisVariable.SocietalFairness,
    graphColor: CYCLE_COLORS[ElectionCycle.SocietalUtility],
    winThresholdScalar: 0.9775,
    briefingText: "Your citizens have told us how they would judge outcomes when deciding for others. Each of them now judges the whole country that way. Lifting the worst-off counts for much more than adding to those already doing well. Social utility reflects what people endorse when they are responsible for others.",
  },
};