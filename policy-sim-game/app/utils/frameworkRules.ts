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
    targetMetricName: "Average Life Satisfaction",
    targetDirection: 'maximize',
    plotType: '1D',
    yAxisType: AxisVariable.LifeSatisfaction,
    graphColor: "#ec4899",
    winThresholdScalar: 0.855,
    briefingText: "Your directive is to increase the total sum of happiness. You must enact policies that maximise the average life satisfaction across the population, regardless of how that happiness is distributed.",
  },
  [ElectionCycle.Rawlsian]: {
    frameworkTitle: "Rawlsian Framework",
    graphTitle: "Life Satisfaction Distribution",
    targetMetricName: "Societal Floor (Minimum LS)",
    targetDirection: 'maximize',
    plotType: '1D',
    yAxisType: AxisVariable.LifeSatisfaction,
    graphColor: "#3b82f6",
    winThresholdScalar: 0.83,
    briefingText: "Your directive is to protect the worst-off in society. You must enact policies that raise the societal floor—the minimum standard of living—even if it means reducing the overall average.",
  },
  [ElectionCycle.SocietalUtility]: {
    frameworkTitle: "Societal Utility Framework",
    graphTitle: "Societal Utility Distribution",
    targetMetricName: "Average Societal Fairness",
    targetDirection: 'maximize',
    plotType: '1D',
    yAxisType: AxisVariable.SocietalFairness,
    graphColor: "#10b981",
    winThresholdScalar: 0.97,
    briefingText: "Your directive is to balance progress with the electorate's demand for fairness. You must enact policies taking into account that citizens now evaluate outcomes based on empathy and their ideal vision of a fair society.",
  },
  [ElectionCycle.PersonalUtility]: {
    frameworkTitle: "Personal Utility Framework",
    graphTitle: "Personal Utility Distribution",
    targetMetricName: "Average Personal Utility",
    targetDirection: 'maximize',
    plotType: '1D',
    yAxisType: AxisVariable.PersonalUtility,
    graphColor: "#8b5cf6",
    winThresholdScalar: 0.98,
    briefingText: "Your directive is to navigate the self-interest of your citizens. You must enact policies keeping in mind that individuals will fiercely guard their current wealth and evaluate outcomes based strictly on their own personal risk and reward.",
  }
};