"use client";
import { UIProvider, GameProvider } from "./context/GameStateContext";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Modals & Layout
import BriefingModal from "./components/modals/BriefingModal";
import ElectionModal from "./components/modals/ElectionModal";
import FinalDebriefModal from "./components/modals/FinalDebriefModal";
import WelcomeModal from "./components/modals/WelcomeModal";
import DevPanel from "./components/DevPanel";
import GameHeader from "./components/GameHeader";

// Tabs
import DashboardTab from "./components/tabs/DashboardTab";
import GraphsTab from "./components/tabs/GraphsTab";
import ElectorateTab from "./components/tabs/ElectorateTab";

// Custom Hooks
import { useGameEngine } from "./hooks/useGameEngine";

export default function Home() {
  const tabs = ['dashboard', 'electorate', 'graphs'] as const;
  type TabType = typeof tabs[number];
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [devMode, setDevMode] = useState(false);
  const [showOptimalPath, setShowOptimalPath] = useState(false);

  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlTab = params.get('tab') as TabType;
    if (urlTab && tabs.includes(urlTab)) {
      setActiveTab(urlTab);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get('tab') as TabType;
      setActiveTab((urlTab && tabs.includes(urlTab)) ? urlTab : 'dashboard');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ''; 
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    window.history.pushState(null, '', `/?tab=${tab}`);
  }, []);

  const game = useGameEngine(handleTabChange);

  return (
    <div className="flex flex-col h-screen bg-zinc-50 font-sans text-zinc-900 overflow-hidden relative">
      <GameHeader 
        currentCycle={game.currentCycle}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        currentTurn={game.currentTurn}
        turnsPerCycle={game.TURNS_PER_CYCLE}
        tabs={tabs}
        isParliamentDissolved={game.isParliamentDissolved}
      />

      <UIProvider value={{
        setActiveTab: handleTabChange,
        pulsePolicy: game.pulsePolicy, 
        onNavigateToPolicy: game.handleNavigateToPolicy
      }}>
        <GameProvider value={game}>
          <main className="flex-1 overflow-hidden p-6 flex flex-col relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="h-full flex flex-col w-full"
              >
                {activeTab === 'dashboard' && <DashboardTab />}
                {activeTab === 'graphs' && <GraphsTab />}
                {activeTab === 'electorate' && <ElectorateTab />}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Modals */}
          <AnimatePresence>
            {(!hasSeenWelcome || !game.isAgendaUnlocked || game.showElection || game.showFinalDebrief) && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/80 backdrop-blur-md p-2 md:p-4"
              >
                <AnimatePresence mode="wait">
                  {!hasSeenWelcome && (
                    <WelcomeModal key="welcome" onAcknowledge={() => setHasSeenWelcome(true)} />
                  )}

                  {hasSeenWelcome && !game.isAgendaUnlocked && (
                    <BriefingModal 
                      key="briefing"
                      currentCycle={game.currentCycle} 
                      onAcknowledge={() => game.setIsAgendaUnlocked(true)} 
                    />
                  )}

                  {game.showElection && (
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
                  )}

                  {game.showFinalDebrief && (
                    <FinalDebriefModal
                      key="debrief"
                      baselinePopulation={game.baselinePopulation}
                      finalPopulation={game.population}
                      yAxisMax={game.yAxisMax}
                    />
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          </GameProvider>
      </UIProvider>

      <DevPanel 
        devMode={devMode} setDevMode={setDevMode} jumpToCycle={game.jumpToCycle}
        setCurrentTurn={game.setCurrentTurn} currentTurn={game.currentTurn} turnsPerCycle={game.TURNS_PER_CYCLE}
        showOptimalPath={showOptimalPath} setShowOptimalPath={setShowOptimalPath}
        optimalPath={game.optimalPath} cycleMAO={game.cycleMAO}
      />
    </div>
  );
}