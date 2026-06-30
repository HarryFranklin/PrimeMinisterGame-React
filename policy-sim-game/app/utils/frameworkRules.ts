import { ElectionCycle, AxisVariable } from "./types";

export interface FrameworkRule {
  frameworkTitle: string;
  graphTitle: string;
  targetMetricName: string;
  targetMetricDescription: string;
  targetDirection?: 'maximize' | 'minimize';
  plotType: '1D' | '2D';
  yAxisType: AxisVariable;
  graphColor: string;
  winThresholdScalar: number; // Defines what % of the MAO constitutes a win (51% approval)
  briefingText: string;
}

export const FRAMEWORK_RULES: Record<ElectionCycle, FrameworkRule> = {
  [ElectionCycle.Benthamite]: {
    frameworkTitle: "Benthamite Framework",
    graphTitle: "Life Satisfaction Distribution",
    targetMetricName: "National Average Happiness",
    targetMetricDescription: "Calculated by adding up the life satisfaction of every citizen and dividing it by the total population.", 
    targetDirection: 'maximize',
    plotType: '1D',
    yAxisType: AxisVariable.LifeSatisfaction,
    graphColor: "#ec4899",
    winThresholdScalar: 0.89,
    briefingText: "Your goal is to increase the total amount of happiness in the country. You must enact policies that raise the national average, even if it leaves a minority of people behind.",
  },
  [ElectionCycle.Rawlsian]: {
    frameworkTitle: "Rawlsian Framework",
    graphTitle: "Life Satisfaction Distribution",
    targetMetricName: "Minimum Wellbeing Baseline", // Reflects a moving floor rather than "poverty"
    targetMetricDescription: "Calculated by identifying the single lowest life satisfaction score currently held by any citizen.",
    targetDirection: 'maximize',
    plotType: '1D',
    yAxisType: AxisVariable.LifeSatisfaction,
    graphColor: "#3b82f6",
    winThresholdScalar: 0.675,
    briefingText: "Your goal is to protect the most vulnerable people in society. You must enact policies that improve the lives of the absolute worst-off, even if it brings down the national average.",
  },
  [ElectionCycle.PersonalUtility]: {
    frameworkTitle: "Personal Utility Framework",
    graphTitle: "Personal Utility Distribution",
    targetMetricName: "National Personal Satisfaction", // Average of personal self-interest
    targetMetricDescription: "Calculated by averaging how each citizen values their own wellbeing, heavily penalizing personal financial loss.",
    targetDirection: 'maximize',
    plotType: '1D',
    yAxisType: AxisVariable.PersonalUtility,
    graphColor: "#8b5cf6",
    winThresholdScalar: 0.9575,
    briefingText: "Voters have become deeply selfish. They will protect their own wellbeing. You must navigate their self-interest and avoid policies that make the middle class feel like they are losing out.",
  },
  [ElectionCycle.SocietalUtility]: {
    frameworkTitle: "Societal Utility Framework",
    graphTitle: "Societal Utility Distribution",
    targetMetricName: "National Fairness Index", // Equity
    targetMetricDescription: "Calculated by averaging citizens' evaluation of society, balancing their own wellbeing against their desire for equality.",
    targetDirection: 'maximize',
    plotType: '1D',
    yAxisType: AxisVariable.SocietalFairness,
    graphColor: "#10b981",
    winThresholdScalar: 0.99,
    briefingText: "The public is angry about wellbeing inequality. You must balance economic progress with the electorate's demand for fairness. A society with high National Average Happiness that is highly unequal society will lead to you being voted out.",
  },
  
};