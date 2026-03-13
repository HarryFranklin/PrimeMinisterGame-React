// app/utils/types.ts

export enum AxisVariable {
  LifeSatisfaction,
  PersonalUtility,
  SocietalFairness,
  DeltaPersonalUtility,
  DeltaSocietalFairness
}

export interface Demographics {
  wealth: 'Poor' | 'Middle' | 'Wealthy';
  age: 'Youth' | 'Adult' | 'Elderly';
  isStudent: boolean;
  isParent: boolean;
  isEnvironmentalist: boolean;
  isCommuter: boolean;
}

export interface Respondent {
  id: number;
  personalUtilities: number[]; 
  societalUtilities: number[]; 
  currentLS: number;
  demographics: Demographics; // Added demographic traits
}

export interface PolicyRule {
  note: string;
  minLS?: number;
  maxLS?: number;
  affectEveryone?: boolean;
  proportion: number;
  impact: number;
  targetDemographic?: Partial<Demographics>; // Allows for highly targeted policies later
}

export interface Policy {
  id: string;
  policyName: string;
  description: string;
  specificRules: PolicyRule[];
  politicalCost: number;
}

// Personal, Societal, PlayerChoice Mechanics
export enum ElectionCycle {
  Utilitarian,
  Empathetic,
  PlayerChoice
}