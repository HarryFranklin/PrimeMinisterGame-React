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
}

export interface Respondent {
  id: number;
  personalUtilities: number[]; 
  societalUtilities: number[]; 
  currentLS: number;
  demographics: Demographics;
}

export interface Minister {
  name: string;
  mandate: string;
  status: 'happy' | 'neutral' | 'angry';
  color: string;
  currentScore?: number;
  projectedScore?: number;
  policyDelta?: number;
  quote?: string;
  emoji?: string;
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
}

export enum ElectionCycle {
  Benthamite,
  Rawlsian,
  SocietalUtility,
  PersonalUtility
}

export interface DemographicAverages {
  national: number;
  wealth: { poor: number; middle: number; wealthy: number };
  age: { youth: number; adult: number; elderly: number };
}

export interface TurnHistory {
  turn: number;
  enactedPolicyId: string | null;
  enactedPolicyName: string | null;
  lsAverages: DemographicAverages;
}