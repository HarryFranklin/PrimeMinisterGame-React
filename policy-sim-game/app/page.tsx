"use client";

import { UIProvider, GameProvider } from "./context/GameStateContext";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DevPanel from "./components/DevPanel";

// Modals
import BriefingModal from "./components/modals/BriefingModal";
import ElectionModal from "./components/modals/ElectionModal";
import FinalDebriefModal from "./components/modals/FinalDebriefModal";
import WelcomeModal from "./components/modals/WelcomeModal";
import { ModalOverlay } from "./components/modals/SharedModalComponents";

import GameHeader from "./components/GameHeader";
import DashboardTab from "./components/tabs/DashboardTab";
import { useGameEngine } from "./hooks/useGameEngine";
import { GamePhase } from "./utils/types";

export default function Home() {
  const [devMode, setDevMode] = useState(false);
  const [showOptimalPath, setShowOptimalPath] = useState(false);
  const [isUnsupportedScreen, setIsUnsupportedScreen] = useState(false);

  useEffect(() => {
    const evaluateViewport = () => {
      // Rely strictly on viewport dimensions to avoid DevTools / User-Agent spoofing bugs
      const isLowResolution = window.innerWidth < 1024 || window.innerHeight < 600;
      setIsUnsupportedScreen(isLowResolution);
    };

    evaluateViewport();
    window.addEventListener('resize', evaluateViewport);
    return () => window.removeEventListener('resize', evaluateViewport);
  }, []);

  const game = useGameEngine();

  return (
    <div className="flex flex-col h-screen bg-zinc-50 font-sans text-zinc-900 overflow-hidden relative">
      <AnimatePresence>
        {isUnsupportedScreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-zinc-950/95 flex flex-col items-center justify-center p-6 text-center select-none backdrop-blur-md"
          >
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md shadow-2xl flex flex-col items-center gap-4">
              <h2 className="text-xl font-black tracking-tight text-white uppercase tracking-wider">Desktop Display Required</h2>
              <p className="text-zinc-400 text-sm leading-relaxed font-medium">This game requires a larger screen.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <GameHeader 
        currentCycle={game.currentCycle}
        currentTurn={game.currentTurn}
        turnsPerCycle={game.TURNS_PER_CYCLE}
        isParliamentDissolved={game.isParliamentDissolved}
      />

      <UIProvider value={{
        setActiveTab: () => {}, 
        pulsePolicy: game.pulsePolicy, 
        onNavigateToPolicy: game.handleNavigateToPolicy
      }}>
        <GameProvider value={game}>
          <main className="flex-1 overflow-hidden p-6 flex flex-col relative">
            <DashboardTab />
          </main>

          <AnimatePresence mode="wait">
            {game.gamePhase !== GamePhase.Playing && (
              <ModalOverlay exitDelay={0.6}>
                <AnimatePresence mode="wait">
                  {game.gamePhase === GamePhase.Welcome && (
                    <WelcomeModal 
                      key="welcome" 
                      onAcknowledge={() => game.setGamePhase(GamePhase.Briefing)} 
                    />
                  )}
                  
                  {game.gamePhase === GamePhase.Briefing && (
                    <BriefingModal 
                      key="briefing" 
                      currentCycle={game.currentCycle} 
                      onAcknowledge={() => game.setGamePhase(GamePhase.Playing)} 
                    />
                  )}

                  {game.gamePhase === GamePhase.Election && (
                    <ElectionModal
                      key="election"
                      currentMetricScore={game.turnMetricScore}
                      currentCycle={game.currentCycle}
                      approvalRating={game.turnApprovalRating}
                      cycleAttempts={game.cycleAttempts}
                      initialPopulation={game.initialPopulation}
                      baselinePopulation={game.baselinePopulation}
                      finalPopulation={game.population}
                      yAxisMax={game.yAxisMax}
                      onNextCycle={game.handleProceedFromNarrative}
                      onReset={game.handleResetCycle}
                      onFinish={() => game.setGamePhase(GamePhase.Debrief)}
                    />
                  )}

                  {game.gamePhase === GamePhase.Debrief && (
                    <FinalDebriefModal
                      key="debrief"
                      baselinePopulation={game.baselinePopulation}
                      finalPopulation={game.population}
                      yAxisMax={game.yAxisMax}
                    />
                  )}
                </AnimatePresence>
              </ModalOverlay>
            )}
          </AnimatePresence>
        </GameProvider>
      </UIProvider>

      <DevPanel 
        devMode={devMode} 
        setDevMode={setDevMode} 
        jumpToCycle={game.jumpToCycle}
        setCurrentTurn={game.setCurrentTurn} 
        currentTurn={game.currentTurn} 
        turnsPerCycle={game.TURNS_PER_CYCLE}
        showOptimalPath={showOptimalPath} 
        setShowOptimalPath={setShowOptimalPath}
        optimalPath={game.optimalPath} 
        cycleMAO={game.cycleMAO}
      />
    </div>
  );
}