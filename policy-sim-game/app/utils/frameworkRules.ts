import { ElectionCycle, AxisVariable } from "./types";

export interface FrameworkRule {
  frameworkTitle: string;
  graphTitle: string;
  targetMetricName: string;
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
    targetDirection: 'maximize',
    plotType: '1D',
    yAxisType: AxisVariable.LifeSatisfaction,
    graphColor: "#ec4899",
    winThresholdScalar: 0.855,
    briefingText: "Your directive is to increase the total amount of happiness in the country. You must enact policies that raise the national average, even if it leaves a minority of people behind.",
  },
  [ElectionCycle.Rawlsian]: {
    frameworkTitle: "Rawlsian Framework",
    graphTitle: "Life Satisfaction Distribution",
    targetMetricName: "Quality of Life for the Poorest",
    targetDirection: 'maximize',
    plotType: '1D',
    yAxisType: AxisVariable.LifeSatisfaction,
    graphColor: "#3b82f6",
    winThresholdScalar: 0.83,
    briefingText: "Your directive is to protect the most vulnerable people in society. You must enact policies that improve the lives of the absolute worst-off, even if it brings down the national average.",
  },
  [ElectionCycle.SocietalUtility]: {
    frameworkTitle: "Societal Utility Framework",
    graphTitle: "Societal Utility Distribution",
    targetMetricName: "Public Sense of Fairness",
    targetDirection: 'maximize',
    plotType: '1D',
    yAxisType: AxisVariable.SocietalFairness,
    graphColor: "#10b981",
    winThresholdScalar: 0.97,
    briefingText: "The public is angry about wellbeing inequality. You must balance economic progress with the electorate's demand for fairness. A wealthy but highly unequal society will vote you out.",
  },
  [ElectionCycle.PersonalUtility]: {
    frameworkTitle: "Personal Utility Framework",
    graphTitle: "Personal Utility Distribution",
    targetMetricName: "Voter Self-Interest",
    targetDirection: 'maximize',
    plotType: '1D',
    yAxisType: AxisVariable.PersonalUtility,
    graphColor: "#8b5cf6",
    winThresholdScalar: 0.98,
    briefingText: "Voters have become deeply selfish. They will fiercely protect their own wealth and quality of life. You must navigate their self-interest and avoid policies that make the middle class feel like they are losing out.",
  }
};