"use client";
import { createContext, ReactNode, useContext } from 'react';
import { useGameEngine } from '../hooks/useGameEngine';

export interface UIState {
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

export type GameState = ReturnType<typeof useGameEngine>;

const GameContext = createContext<GameState | undefined>(undefined);

export function GameProvider({ children, value }: { children: ReactNode; value: GameState }) {
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) throw new Error('useGame must be used within a GameProvider');
  return context;
}