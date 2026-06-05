"use client";
import { UIProvider, GameProvider } from "./context/GameStateContext";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Modals & Layout
import BriefingModal from "./components/modals/BriefingModal";
import ElectionModal from "./components/modals/ElectionModal";
import FinalDebriefModal from "./components/modals/FinalDebriefModal";
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
        <GameProvider value={{
          currentCycle: game.currentCycle, 
          currentTurn: game.currentTurn,
          currentChartData: game.currentChartData, 
          previewChartData: game.previewChartData, 
          currentHistogramData: game.currentHistogramData, 
          previewHistogramData: game.previewHistogramData,
          selectedPolicy: game.selectedPolicy, 
          setSelectedPolicy: game.setSelectedPolicy,
          currentMetricScore: game.currentMetricScore, 
          initialMetricScore: game.initialMetricScore, 
          turnMetricScore: game.turnMetricScore, 
          currentDeck: game.currentDeck, 
          handleApplyPolicy: game.handleApplyPolicy, 
          cycleMAO: game.cycleMAO, 
          approvalRating: game.turnApprovalRating, 
          population: game.population, 
          previewPopulation: game.previewPopulation, 
          initialPopulation: game.initialPopulation,
          isAgendaUnlocked: game.isAgendaUnlocked,
          setIsAgendaUnlocked: game.setIsAgendaUnlocked,
          yAxisMax: game.yAxisMax,
          isParliamentDissolved: game.isParliamentDissolved,
          handleFaceElectorate: game.handleFaceElectorate
        }}>
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
        </GameProvider>
      </UIProvider>

      {/* Modals */}
      {!game.isAgendaUnlocked && (
        <BriefingModal 
          currentCycle={game.currentCycle} 
          onAcknowledge={() => game.setIsAgendaUnlocked(true)} 
        />
      )}

      {game.showElection && (
        <ElectionModal
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
          baselinePopulation={game.baselinePopulation}
          finalPopulation={game.population}
          yAxisMax={game.yAxisMax}
        />
      )}

      <DevPanel 
        devMode={devMode} setDevMode={setDevMode} jumpToCycle={game.jumpToCycle}
        setCurrentTurn={game.setCurrentTurn} currentTurn={game.currentTurn} turnsPerCycle={game.TURNS_PER_CYCLE}
        showOptimalPath={showOptimalPath} setShowOptimalPath={setShowOptimalPath}
        optimalPath={game.optimalPath} cycleMAO={game.cycleMAO}
      />
    </div>
  );
}