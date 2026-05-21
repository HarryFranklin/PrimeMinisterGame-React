"use client";

import { UIProvider, GameProvider } from "./context/GameStateContext";
import { useState } from "react";

// Modals & Layout
import ElectionModal from "./components/modals/ElectionModal";
import NarrativeModal from "./components/modals/NarrativeModal";
import FinalDebriefModal from "./components/modals/FinalDebriefModal";
import IntroductionModal from "./components/modals/IntroductionModal";
import DevPanel from "./components/DevPanel";
import GameHeader from "./components/GameHeader";
import TutorialOverlay from "./components/TutorialOverlay";

// Tabs
import DashboardTab from "./components/tabs/DashboardTab";
import MinistersTab from "./components/tabs/MinistersTab";
import GraphsTab from "./components/tabs/GraphsTab";
import ElectorateTab from "./components/tabs/ElectorateTab";

// Custom Hooks
import { useTutorial } from "./hooks/useTutorial";
import { useGameEngine } from "./hooks/useGameEngine";

export default function Home() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'demographics' | 'ministers' | 'graphs' | 'electorate'>('dashboard');
  const [devMode, setDevMode] = useState(false);
  const [showOptimalPath, setShowOptimalPath] = useState(false);
  const tabs = ['dashboard', 'electorate', 'ministers', 'graphs'] as const;

  const tut = useTutorial(activeTab, tabs, setActiveTab);
  const game = useGameEngine(setActiveTab);

  return (
    <div className="flex flex-col h-screen bg-zinc-50 font-sans text-zinc-900 overflow-hidden relative">
      {tut.showIntro && <IntroductionModal onStart={tut.handleStartGame} />}

      <TutorialOverlay 
        isTutorialActive={tut.isTutorialActive}
        currentStepData={tut.currentStepData}
        activeTab={activeTab}
        tutorialStep={tut.tutorialStep}
        tabs={tabs}
        tutorialVisitedTabs={tut.tutorialVisitedTabs}
        currentTutorialSequence={tut.currentTutorialSequence}
        setIsTutorialActive={tut.setIsTutorialActive}
        targetNextTab={tut.targetNextTab}
        isLastTutorialStep={tut.isLastTutorialStep}
        setTutorialVisitedTabs={tut.setTutorialVisitedTabs}
        setActiveTab={setActiveTab}
        setTutorialStep={tut.setTutorialStep}
      />

      <GameHeader 
        currentCycle={game.currentCycle}
        isTutorialActive={tut.isTutorialActive}
        setIsTutorialActive={tut.setIsTutorialActive}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        targetNextTab={tut.targetNextTab}
        tutorialVisitedTabs={tut.tutorialVisitedTabs}
        setTutorialVisitedTabs={tut.setTutorialVisitedTabs}
        setTutorialStep={tut.setTutorialStep}
        currentTurn={game.currentTurn}
        turnsPerCycle={game.TURNS_PER_CYCLE}
        tabs={tabs}
      />

      <UIProvider value={{
        isTutorialActive: tut.isTutorialActive, 
        tutorialStep: tut.safeTutorialStep, 
        setActiveTab,
        pulsePolicy: game.pulsePolicy, 
        onNavigateToPolicy: game.handleNavigateToPolicy
      }}>
        <GameProvider value={{
          currentCycle: game.currentCycle, 
          currentChartData: game.currentChartData, 
          previewChartData: game.previewChartData, 
          currentHistogramData: game.currentHistogramData, 
          previewHistogramData: game.previewHistogramData,
          ministers: game.ministers, 
          selectedMinister: game.selectedMinister, 
          setSelectedMinister: game.setSelectedMinister, 
          presentedPolicies: game.presentedPolicies, 
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
          initialPopulation: game.initialPopulation // <-- Fixed here
        }}>
          <main className="flex-1 overflow-hidden p-6 flex flex-col">
            {activeTab === 'dashboard' && <DashboardTab />}
            {activeTab === 'ministers' && <MinistersTab />}
            {activeTab === 'graphs' && <GraphsTab />}
            {activeTab === 'electorate' && <ElectorateTab />}
          </main>
        </GameProvider>
      </UIProvider>

      {game.showElection && <ElectionModal currentMetricScore={game.turnMetricScore} currentCycle={game.currentCycle} approvalRating={game.turnApprovalRating} cycleAttempts={game.cycleAttempts} onNextCycle={() => { game.setShowElection(false); game.setShowNarrative(true); }} onReset={game.handleResetCycle} onFinish={() => { game.setShowElection(false); game.setShowFinalDebrief(true); }} />}
      {game.showNarrative && <NarrativeModal completedCycle={game.currentCycle} population={game.population} onProceed={game.handleProceedFromNarrative} />}
      {game.showFinalDebrief && <FinalDebriefModal baselinePopulation={game.baselinePopulation} finalPopulation={game.population} />}

      <DevPanel 
        devMode={devMode} setDevMode={setDevMode} jumpToCycle={game.jumpToCycle}
        setCurrentTurn={game.setCurrentTurn} currentTurn={game.currentTurn} turnsPerCycle={game.TURNS_PER_CYCLE}
        showOptimalPath={showOptimalPath} setShowOptimalPath={setShowOptimalPath}
        optimalPath={game.optimalPath} cycleMAO={game.cycleMAO}
      />
    </div>
  );
}