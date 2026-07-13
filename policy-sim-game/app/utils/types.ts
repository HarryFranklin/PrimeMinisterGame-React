export enum AxisVariable {
  LifeSatisfaction,
  PersonalUtility,
  SocietalFairness,
}

export interface TurnLedger {
  turn: number;
  policyId: string | null;
  policyName: string | null;
  ls: number;
  personalUtility: number;
  societalUtility: number;
}

export interface CycleLedger {
  cycle: ElectionCycle;
  turns: TurnLedger[];
}

export interface Respondent {
  id: number;
  name: string;
  personalUtilities: number[];
  societalUtilities: number[];
  currentLS: number;
  historicalLedger: CycleLedger[];
}

export interface PolicyRule {
  note: string;
  minLS?: number;
  maxLS?: number;
  affectEveryone: boolean;
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
  SocietalUtility,
  PersonalUtility
}

export interface TurnHistory {
  turn: number;
  enactedPolicyId: string | null;
  enactedPolicyName: string | null;
  lsAverage: number;
}

// Stores the complete outcome of a specific cycle
export interface CompletedRun {
  cycle: ElectionCycle;
  finalPopulation: Respondent[];
  finalScore: number;
  targetScore: number;
  approvalRating: number;
  enactedLegislation: TurnHistory[];
}

export enum GamePhase {
  Welcome = 'welcome',
  LevelSelect = 'levelSelect',
  Briefing = 'briefing',
  Playing = 'playing',
  Election = 'election',
  Debrief = 'debrief'
}