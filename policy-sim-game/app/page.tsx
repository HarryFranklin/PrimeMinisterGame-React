"use client";
import { UIProvider, GameProvider } from "./context/GameStateContext";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DevPanel from "./components/DevPanel";

// Modals
import BriefingModal from "./components/modals/BriefingModal";
import ElectionModal from "./components/modals/ElectionModal";
import FinalDebriefModal from "./components/modals/FinalDebriefModal";
import WelcomeModal from "./components/modals/WelcomeModal";

import GameHeader from "./components/GameHeader";
import DashboardTab from "./components/tabs/DashboardTab";

// Custom Hooks
import { useGameEngine } from "./hooks/useGameEngine";

export default function Home() {
  const [devMode, setDevMode] = useState(false);
  const [showOptimalPath, setShowOptimalPath] = useState(false);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);
  
  // State for mobile/low-resolution check
  const [isUnsupportedScreen, setIsUnsupportedScreen] = useState(false);

  // Responsive device and low-resolution detection hook
  useEffect(() => {
    const evaluateViewport = () => {
      const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isLowResolution = window.innerWidth < 1024;
      setIsUnsupportedScreen(isMobileDevice || isLowResolution);
    };
    evaluateViewport();
    window.addEventListener('resize', evaluateViewport);
    return () => window.removeEventListener('resize', evaluateViewport);
  }, []);

  const game = useGameEngine();

  return (
    <div className="flex flex-col h-screen bg-zinc-50 font-sans text-zinc-900 overflow-hidden relative">
      
      {/* TOP LEVEL SCREEN GUARD OVERLAY */}
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
              <p className="text-zinc-400 text-sm leading-relaxed font-medium">This academic policy simulation requires a larger screen.</p>
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
        setActiveTab: () => {}, // No-op as tabs are removed
        pulsePolicy: game.pulsePolicy, 
        onNavigateToPolicy: game.handleNavigateToPolicy
      }}>
        <GameProvider value={game}>
          <main className="flex-1 overflow-hidden p-6 flex flex-col relative">
            <DashboardTab />
          </main>

          {/* Main Modal Sequence Container */}
          <AnimatePresence mode="wait">
            {(!hasSeenWelcome || !game.isAgendaUnlocked || game.showElection || game.showFinalDebrief) && (
              <motion.div
                key="overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.5, delay: 0.6 } }}
                className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/80 backdrop-blur-md p-4"
              >
                <AnimatePresence mode="wait">
                  {!hasSeenWelcome ? (
                    <WelcomeModal key="welcome" onAcknowledge={() => setHasSeenWelcome(true)} />
                  ) 
                  : !game.isAgendaUnlocked ? (
                    <BriefingModal 
                      key="briefing" 
                      currentCycle={game.currentCycle} 
                      onAcknowledge={() => game.setIsAgendaUnlocked(true)} 
                    />
                  ) 
                  : game.showElection ? (
                    <ElectionModal
                      key="election"
                      currentMetricScore={game.turnMetricScore}
                      currentCycle={game.currentCycle}
                      approvalRating={game.turnApprovalRating}
                      cycleAttempts={game.cycleAttempts}
                      initialPopulation={game.initialPopulation}
                      finalPopulation={game.population}
                      yAxisMax={game.yAxisMax}
                      onNextCycle={game.handleProceedFromNarrative}
                      onReset={game.handleResetCycle}
                      onFinish={() => { game.setShowElection(false); game.setShowFinalDebrief(true); }}
                    />
                  ) 
                  : game.showFinalDebrief ? (
                    <FinalDebriefModal
                      key="debrief"
                      baselinePopulation={game.baselinePopulation}
                      finalPopulation={game.population}
                      yAxisMax={game.yAxisMax}
                    />
                  ) : null}
                </AnimatePresence>
              </motion.div>
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