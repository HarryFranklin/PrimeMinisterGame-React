import { ElectionCycle, AxisVariable } from "./types";

export interface FrameworkRule {
  id: ElectionCycle;
  name: string;
  frameworkTitle: string;
  graphTitle: string;
  graphColor: string;
  targetMetricName: string;
  description: string;
  
  // Math & Mechanics
  winThreshold: number;            // Aggregate % needed to win the election 
  voterTolerance: number;          // Individual utility threshold to "approve" (0.0 to 1.0)
  lossAversionMultiplier: number;  // Punishment multiplier when wellbeing drops
  gainMultiplier: number;          // Reward multiplier when wellbeing increases
  
  // Graph Config
  plotType: '1D' | '2D';
  yAxisType: AxisVariable;
  highlightRawlsianFloor?: boolean;
}

export const FRAMEWORK_RULES: Record<ElectionCycle, FrameworkRule> = {
  [ElectionCycle.Benthamite]: {
    id: ElectionCycle.Benthamite,
    name: "Benthamite",
    frameworkTitle: "Cycle 1: Benthamite",
    graphTitle: "Life Satisfaction Distribution",
    graphColor: "#ec4899", // Pink
    targetMetricName: "National Average Life Satisfaction",
    description: "The Benthamite framework focuses purely on the national mean. To win, move the 'Current' average past your 'Target' threshold. It only requires a simple majority to succeed.",
    winThreshold: 51, // 51% (Simple majority)
    voterTolerance: 0.51,
    lossAversionMultiplier: 2.0, // Standard punishment
    gainMultiplier: 1.0, 
    plotType: '1D',
    yAxisType: AxisVariable.PersonalUtility
  },
  [ElectionCycle.Rawlsian]: {
    id: ElectionCycle.Rawlsian,
    name: "Rawlsian",
    frameworkTitle: "Cycle 2: Rawlsian",
    graphTitle: "Life Satisfaction Distribution",
    graphColor: "#ef4444", 
    targetMetricName: "Least Well-Off Life Satisfaction",
    description: "The Rawlsian framework evaluates success based solely on the highlighted bottom demographic. Tolerance for inequality here is extremely low, requiring a much higher threshold to win.",
    winThreshold: 65, 
    voterTolerance: 0.65,
    lossAversionMultiplier: 3.0, 
    gainMultiplier: 1.2,
    plotType: '1D',
    yAxisType: AxisVariable.PersonalUtility,
    highlightRawlsianFloor: true
  },
  [ElectionCycle.SocietalUtility]: {
    id: ElectionCycle.SocietalUtility,
    name: "Societal",
    frameworkTitle: "Cycle 3: Societal",
    graphTitle: "Societal Fairness vs Life Satisfaction",
    graphColor: "#8b5cf6", // Purple
    targetMetricName: "Average Societal Utility",
    description: "This scatter plot maps actual Life Satisfaction against perceived Societal Fairness. It visualises how each citizen evaluates the current distribution of wellbeing across the nation.",
    winThreshold: 60,
    voterTolerance: 0.60,
    lossAversionMultiplier: 2.5,
    gainMultiplier: 1.2,
    plotType: '2D',
    yAxisType: AxisVariable.SocietalFairness
  },
  [ElectionCycle.PersonalUtility]: {
    id: ElectionCycle.PersonalUtility,
    name: "Personal",
    frameworkTitle: "Cycle 4: Personal",
    graphTitle: "Personal Utility vs Life Satisfaction",
    graphColor: "#3b82f6", // Blue
    targetMetricName: "Average Personal Utility",
    description: "This scatter plot maps Life Satisfaction against Personal Utility, demonstrating how individuals translate their general wellbeing into their own personal, subjective satisfaction.",
    winThreshold: 60,
    voterTolerance: 0.60,
    lossAversionMultiplier: 2.5,
    gainMultiplier: 1.2,
    plotType: '2D',
    yAxisType: AxisVariable.PersonalUtility
  }
};