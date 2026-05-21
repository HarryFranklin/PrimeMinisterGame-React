"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { ElectionCycle, Policy, Respondent, Minister } from '../utils/types';

export interface GameState {
  isTutorialActive: boolean;
  tutorialStep: number;
  setActiveTab: (tab: any) => void;
  currentCycle: ElectionCycle;
  currentChartData: any[];
  previewChartData: any[];
  currentHistogramData: any[];
  previewHistogramData: any[];
  ministers: Minister[];
  selectedMinister: Minister | string | null;
  setSelectedMinister: (m: Minister | string | null) => void;
  presentedPolicies: Policy[];
  selectedPolicy: Policy | null;
  setSelectedPolicy: (p: Policy | null) => void;
  currentMetricScore: number;
  initialMetricScore: number;
  turnMetricScore: number;
  currentDeck: Policy[];
  handleApplyPolicy: () => void;
  cycleMAO: number;
  approvalRating: number;
  population: Respondent[];
  previewPopulation: Respondent[];
  pulsePolicy: boolean;
  initialPopulation: Respondent[];
  onNavigateToPolicy: () => void;
}

const GameStateContext = createContext<GameState | undefined>(undefined);

export function GameStateProvider({ children, value }: { children: ReactNode; value: GameState }) {
  return (
    <GameStateContext.Provider value={value}>
      {children}
    </GameStateContext.Provider>
  );
}

export function useGameState() {
  const context = useContext(GameStateContext);
  if (context === undefined) {
    throw new Error('useGameState must be used within a GameStateProvider');
  }
  return context;
}