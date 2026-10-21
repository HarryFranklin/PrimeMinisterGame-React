"use client";

import { UIProvider, GameProvider } from "./context/GameStateContext";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

import DevPanel from "./components/DevPanel";
import TelemetryDevPanel from "./client/TelemetryDevPanel";
import { initTelemetry, registerSink, endSession, track } from "./client/telemetry";
import { networkSink, flushOnExit, pingProgress } from "./client/networkSink";
import { startRawCapture } from "./client/rawcapture";
import { startDerivations } from "./client/derive";

// Modals & Tabs
import IntroModal from "./components/modals/IntroModal";
import BriefingModal from "./components/modals/BriefingModal";
import ElectionModal from "./components/modals/ElectionModal";
import UtilityInterventionOverlay from "./components/modals/UtilityInterventionOverlay";
import AcademicDebriefOverlay from "./components/modals/AcademicDebriefOverlay";
import FinalDebriefModal from "./components/modals/FinalDebriefModal";
import { ModalOverlay } from "./components/modals/SharedModalComponents";
import DashboardTab from "./components/tabs/DashboardTab";
import LevelSelectTab from "./components/tabs/LevelSelectTab";
import SetupTab from "./components/tabs/SetupTab";
import LifeSatisfactionTab from "./components/tabs/LifeSatisfactionTab";
import UtilityElicitationOverlay from "./components/modals/UtilityElicitationOverlay";

import { useGameEngine } from "./hooks/useGameEngine";
import { GamePhase, AxisVariable } from "./utils/types";
import { isTelemetryDebugEnabled } from "./client/telemetry";
import D3Chart from "./components/D3Chart";
import { StudyGate, isStudyTestMode, type RenderChart } from "@study";

// Build commit (set by Cloudflare Pages via next.config.ts), saved with every sync.
const APP_VERSION = (process.env.NEXT_PUBLIC_CF_PAGES_COMMIT_SHA ?? "dev").slice(0, 8);

// How question charts are drawn in the study screens – same faces as the game.
const renderChart: RenderChart = ({ counts, yMax }) => (
  <D3Chart
    plotType="1D"
    chartData={[]}
    histogramData={counts.map((count, name) => ({ name, count }))}
    xAxisType={AxisVariable.LifeSatisfaction}
    yAxisType={AxisVariable.LifeSatisfaction}
    color="#ec4899"
    visualStyle="faces"
    faceCols={1}
    yAxisMax={yMax}
    theme="dark"
  />
);

// Information sheet, consent and questions come first (StudyGate); the game
// itself only mounts once the participant reaches the activity stage.
export default function Home() {
  return (
    <StudyGate condition="game" accent="pink" appVersion={APP_VERSION} renderChart={renderChart} enforceMinScreen={false}>
      <GameApp />
    </StudyGate>
  );
}

function GameApp() {
  const [devMode, setDevMode] = useState(false);
  const [showOptimalPath, setShowOptimalPath] = useState(false);
  const [isUnsupportedScreen, setIsUnsupportedScreen] = useState(false);

  useEffect(() => {
    registerSink(networkSink);
    initTelemetry({ appVersion: APP_VERSION });
    startRawCapture();
    startDerivations();

    const start = Date.now();
    const onExit = () => {
      endSession(Date.now() - start);
      flushOnExit();
      pingProgress();
    };
    let progressPinged = false;
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden" && !progressPinged) {
        progressPinged = true;
        pingProgress();
      }
    };
    // The study's "Leave site?" prompt (refresh/close during the game): count
    // it. If they then really leave, pagehide records session_ended.
    const onLeaveWarning = () => track("leave_warning_shown", {});
    window.addEventListener("pagehide", onExit);
    window.addEventListener("study:leave-warning", onLeaveWarning);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("pagehide", onExit);
      window.removeEventListener("study:leave-warning", onLeaveWarning);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const evaluateViewport = () => {
      const isLowResolution = window.innerWidth < 1024 || window.innerHeight < 600;
      setIsUnsupportedScreen(isLowResolution);
    };
    evaluateViewport();
    window.addEventListener('resize', evaluateViewport);
    return () => window.removeEventListener('resize', evaluateViewport);
  }, []);

  const game = useGameEngine();
  // Developer tools: only on localhost, with ?telemetryDebug=1, or for test participants.
  const [showDevTools] = useState(() => isTelemetryDebugEnabled() || isStudyTestMode());

  return (
    <div className="flex flex-col h-screen bg-zinc-50 font-sans text-zinc-900 overflow-hidden relative">
      
      {/* Unsupported Screen Warning */}
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

      <UIProvider value={{
        setActiveTab: () => {}, 
        pulsePolicy: game.pulsePolicy, 
        onNavigateToPolicy: game.handleNavigateToPolicy
      }}>
        <GameProvider value={game}>
          
          {/* MAIN ROUTING */}
          <main className="flex-1 overflow-hidden p-4 flex flex-col relative">
            {game.gamePhase === GamePhase.Setup ? (
              <SetupTab onSubmit={game.handleSetupComplete} isCalculating={game.isCalculating} calcProgress={game.calcProgress} />
            ) : game.gamePhase === GamePhase.LifeSatisfaction ? (
              <LifeSatisfactionTab onSubmit={game.handleLifeSatisfactionSubmit} />
            ) : game.gamePhase === GamePhase.Intro || game.gamePhase === GamePhase.LevelSelect ? (
              <LevelSelectTab />
            ) : (
              <DashboardTab />
            )}
          </main>

          <AnimatePresence mode="wait">
            {game.gamePhase !== GamePhase.Playing && game.gamePhase !== GamePhase.LevelSelect && game.gamePhase !== GamePhase.Setup && game.gamePhase !== GamePhase.LifeSatisfaction && (
              <ModalOverlay exitDelay={0.6}>
                <AnimatePresence mode="wait">
                  
                  {game.gamePhase === GamePhase.Intro && (
                    <IntroModal 
                      key="intro" 
                      onAcknowledge={() => game.setGamePhase(GamePhase.LevelSelect)} 
                    />
                  )}
                  
                  {game.gamePhase === GamePhase.Briefing && (
                    <BriefingModal 
                      key="briefing" 
                      currentCycle={game.currentCycle} 
                      onAcknowledge={game.handleBriefingAcknowledged} 
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
                      history={game.history}
                      yAxisMax={game.yAxisMax}
                      onReset={game.handleResetCycle}
                      onRequestDebrief={game.requestAcademicDebrief}
                      onAnswerPressQuestion={game.applyPressConferenceDelta}
                    />
                  )}

                  {game.gamePhase === GamePhase.UtilityElicitation && (
                    <UtilityElicitationOverlay key="utility-elicitation" />
                  )}

                  {game.gamePhase === GamePhase.UtilityIntervention && (
                    <UtilityInterventionOverlay key="utility-intervention" />
                  )}

                  {game.gamePhase === GamePhase.AcademicDebrief && (
                    <AcademicDebriefOverlay key="academic-debrief" />
                  )}

                  {game.gamePhase === GamePhase.Debrief && (
                    <FinalDebriefModal key="debrief" />
                  )}
                  
                </AnimatePresence>
              </ModalOverlay>
            )}
          </AnimatePresence>
        </GameProvider>
      </UIProvider>

      {showDevTools && <DevPanel 
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
        difficultySeed={game.difficultySeed}
        jumpToElicitation={game.jumpToElicitation}
      />}
      
      {showDevTools && <TelemetryDevPanel />}
    </div>
  );
}