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
  metricTarget: number;            // The sole condition to win the election
  lossAversionMultiplier: number;  // Used to calculate Minister/Electorate anger
  gainMultiplier: number;          
  voterTolerance: number;          // Baseline utility required for a voter to approve
  
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
    graphColor: "#ec4899", 
    targetMetricName: "National Average Life Satisfaction",
    description: "The Benthamite framework focuses purely on the national mean. To win, move the 'Current' average past your 'Target' threshold.",
    metricTarget: 5.5, 
    lossAversionMultiplier: 2.0, 
    gainMultiplier: 1.0, 
    voterTolerance: 0.5,           
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
    description: "The Rawlsian framework evaluates success based solely on the highlighted bottom demographic. Raise the floor to survive.",
    metricTarget: 5.0, 
    lossAversionMultiplier: 3.0, 
    gainMultiplier: 1.2,
    voterTolerance: 0.5,    
    plotType: '1D',
    yAxisType: AxisVariable.PersonalUtility,
    highlightRawlsianFloor: true
  },
  [ElectionCycle.SocietalUtility]: {
    id: ElectionCycle.SocietalUtility,
    name: "Societal",
    frameworkTitle: "Cycle 3: Societal",
    graphTitle: "Societal Fairness vs Life Satisfaction",
    graphColor: "#8b5cf6", 
    targetMetricName: "Average Societal Utility",
    description: "This scatter plot maps actual Life Satisfaction against perceived Societal Fairness.",
    metricTarget: 0.55, 
    lossAversionMultiplier: 2.5,
    gainMultiplier: 1.2,
    voterTolerance: 0.5,          
    plotType: '2D',
    yAxisType: AxisVariable.SocietalFairness
  },
  [ElectionCycle.PersonalUtility]: {
    id: ElectionCycle.PersonalUtility,
    name: "Personal",
    frameworkTitle: "Cycle 4: Personal",
    graphTitle: "Personal Utility vs Life Satisfaction",
    graphColor: "#3b82f6", 
    targetMetricName: "Average Personal Utility",
    description: "This scatter plot maps Life Satisfaction against Personal Utility.",
    metricTarget: 0.55, 
    lossAversionMultiplier: 2.5,
    gainMultiplier: 1.2,
    voterTolerance: 0.5,         
    plotType: '2D',
    yAxisType: AxisVariable.PersonalUtility
  }
};