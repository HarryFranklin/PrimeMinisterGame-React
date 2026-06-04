"use client";
import { createContext, ReactNode, useContext } from 'react';
import { ElectionCycle, Policy, Respondent } from '../utils/types';

// ==========================================
// 1. UI CONTEXT (Lightweight, stable state)
// ==========================================

export interface UIState {
  isTutorialActive: boolean;
  tutorialStep: number;
  setActiveTab: (tab: any) => void;
  pulsePolicy: boolean;
  onNavigateToPolicy: () => void;
}

const UIContext = createContext<UIState | undefined>(undefined);

export function UIProvider({ children, value }: { children: ReactNode; value: UIState }) {
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const context = useContext(UIContext);
  if (context === undefined) throw new Error('useUI must be used within a UIProvider');
  return context;
}

// ==========================================
// 2. GAME CONTEXT (Heavy simulation data)
// ==========================================

export interface GameState {
  currentCycle: ElectionCycle;
  currentChartData: any[];
  previewChartData: any[];
  currentHistogramData: any[];
  previewHistogramData: any[];
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
  initialPopulation: Respondent[];
}

const GameContext = createContext<GameState | undefined>(undefined);

export function GameProvider({ children, value }: { children: ReactNode; value: GameState }) {
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) throw new Error('useGame must be used within a GameProvider');
  return context;
}