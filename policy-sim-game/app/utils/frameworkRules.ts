import { ElectionCycle, AxisVariable } from "./types";

export interface FrameworkRule {
  frameworkTitle: string;
  graphTitle: string;
  targetMetricName: string;
  metricTarget: number;
  targetDirection?: 'maximize' | 'minimize';
  plotType: '1D' | '2D';
  yAxisType: AxisVariable;
  graphColor: string;
  winThresholdScalar: number; // Defines what % of the MAO constitutes a win (51% approval)
}

export const FRAMEWORK_RULES: Record<ElectionCycle, FrameworkRule> = {
  [ElectionCycle.Benthamite]: {
    frameworkTitle: "Benthamite Framework",
    graphTitle: "Life Satisfaction Distribution",
    targetMetricName: "Average Life Satisfaction",
    metricTarget: 5.5,
    targetDirection: 'maximize',
    plotType: '1D',
    yAxisType: AxisVariable.LifeSatisfaction,
    graphColor: "#ec4899",
    winThresholdScalar: 0.965,
  },
  [ElectionCycle.Rawlsian]: {
    frameworkTitle: "Rawlsian Framework",
    graphTitle: "Life Satisfaction Distribution",
    targetMetricName: "Societal Floor (Minimum LS)",
    metricTarget: 0,
    targetDirection: 'maximize',
    plotType: '1D',
    yAxisType: AxisVariable.LifeSatisfaction,
    graphColor: "#3b82f6",
    winThresholdScalar: 0.73,
  },
  [ElectionCycle.SocietalUtility]: {
    frameworkTitle: "Societal Utility Framework",
    graphTitle: "Societal Utility Distribution",
    targetMetricName: "Average Societal Fairness",
    metricTarget: 6.5,
    targetDirection: 'maximize',
    plotType: '1D',
    yAxisType: AxisVariable.SocietalFairness,
    graphColor: "#10b981",
    winThresholdScalar: 0.99,
  },
  [ElectionCycle.PersonalUtility]: {
    frameworkTitle: "Personal Utility Framework",
    graphTitle: "Personal Utility Distribution",
    targetMetricName: "Average Personal Utility",
    metricTarget: 6.5,
    targetDirection: 'maximize',
    plotType: '1D',
    yAxisType: AxisVariable.PersonalUtility,
    graphColor: "#8b5cf6",
    winThresholdScalar: 0.985,
  }
};