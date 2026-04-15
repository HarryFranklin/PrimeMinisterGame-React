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
  },
  [ElectionCycle.Rawlsian]: {
    frameworkTitle: "Rawlsian Framework",
    graphTitle: "Life Satisfaction Distribution",
    targetMetricName: "Inequality Index (SD)",
    metricTarget: 2.0,
    targetDirection: 'minimize', 
    plotType: '1D',
    yAxisType: AxisVariable.LifeSatisfaction,
    graphColor: "#3b82f6", 
  },
  [ElectionCycle.SocietalUtility]: {
    frameworkTitle: "Societal Utility Framework",
    graphTitle: "Societal Fairness vs Life Satisfaction",
    targetMetricName: "Average Societal Fairness",
    metricTarget: 0.65, 
    targetDirection: 'maximize',
    plotType: '2D',
    yAxisType: AxisVariable.SocietalFairness,
    graphColor: "#10b981", 
  },
  [ElectionCycle.PersonalUtility]: {
    frameworkTitle: "Personal Utility Framework",
    graphTitle: "Personal Utility vs Life Satisfaction",
    targetMetricName: "Average Personal Utility",
    metricTarget: 0.65, 
    targetDirection: 'maximize',
    plotType: '2D',
    yAxisType: AxisVariable.PersonalUtility,
    graphColor: "#8b5cf6", 
  }
};