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
  demographics: Demographics;
}

export interface PolicyRule {
  note: string;
  minLS?: number;
  maxLS?: number;
  affectEveryone?: boolean;
  proportion: number;
  impact: number;
  targetDemographic?: Partial<Demographics>;
}

export interface Policy {
  id: string;
  policyName: string;
  description: string;
  specificRules: PolicyRule[];
  politicalCost: number;
}

export enum ElectionCycle {
  Utilitarian,
  Empathetic,
  PlayerChoice
}

export interface DemographicAverages {
  national: number;
  wealth: { poor: number; middle: number; wealthy: number };
  age: { youth: number; adult: number; elderly: number };
  traits: { students: number; parents: number; commuters: number; environmentalists: number };
}

export interface TurnHistory {
  turn: number;
  enactedPolicyId: string | null;
  enactedPolicyName: string | null;
  lsAverages: DemographicAverages;
}