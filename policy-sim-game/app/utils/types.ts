export enum AxisVariable {
  LifeSatisfaction,
  PersonalUtility,
  SocietalFairness,
  DeltaPersonalUtility,
  DeltaSocietalFairness
}

export interface Respondent {
  id: number;
  personalUtilities: number[];
  societalUtilities: number[];
  currentLS: number;
}

export interface PolicyRule {
  note: string;
  minLS?: number;
  maxLS?: number;
  affectEveryone?: boolean;
  proportion: number;
  impact: number;
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
  PersonalUtility,
  SocietalUtility
}

export interface TurnHistory {
  turn: number;
  enactedPolicyId: string | null;
  enactedPolicyName: string | null;
  lsAverage: number;
}

export enum GamePhase {
  Welcome = 'welcome',
  Briefing = 'briefing',
  Playing = 'playing',
  Election = 'election',
  Debrief = 'debrief'
}