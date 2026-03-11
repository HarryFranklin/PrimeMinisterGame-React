// lib/types.ts

export interface Respondent {
  id: number;
  personalUtilities: number[]; 
  societalUtilities: number[]; 
  currentLS: number;
}

export enum AxisVariable {
  LifeSatisfaction,
  PersonalUtility,
  SocietalFairness,
  DeltaPersonalUtility,
  DeltaSocietalFairness
}

// Representing the 3 frameworks
export enum ElectionCycle {
  Utilitarian, // Cycle 1: Votes based on Personal Utility
  Empathetic,  // Cycle 2: Votes based on Societal Fairness
  PlayerChoice // Cycle 3: Votes based on player's chosen ratio
}

export interface PolicyRule {
  note: string;
  minLS: number;
  maxLS: number;
  affectEveryone: boolean;
  proportion: number;
  impact: number;
}

export interface Policy {
  id: string;
  policyName: string;
  description: string;
  politicalCost: number;
  specificRules: PolicyRule[]; 
}