"use client";

import { GameStateProvider } from "./context/GameStateContext";
import { useTutorial } from "./hooks/useTutorial";
import TutorialOverlay from "./components/TutorialOverlay";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Respondent, AxisVariable, Policy, ElectionCycle, TurnHistory, DemographicAverages } from "./utils/types";
import { loadPopulation } from "./utils/dataLoader";
import { WelfareMetrics } from "./utils/WelfareMetrics";
import { availablePolicies } from "./data/policies";
import { PolicyEngine } from "./utils/PolicyEngine";
import { MAOEngine } from "./utils/MAOEngine";
import ElectionModal from "./components/modals/ElectionModal";
import NarrativeModal from "./components/modals/NarrativeModal";
import FinalDebriefModal from "./components/modals/FinalDebriefModal";
import IntroductionModal from "./components/modals/IntroductionModal";
import { FRAMEWORK_RULES } from "./utils/frameworkRules";
import DevPanel from "./components/DevPanel";
import GameHeader from "./components/GameHeader";

// Tab Imports
import DashboardTab from "./components/tabs/DashboardTab";
import MinistersTab from "./components/tabs/MinistersTab";
import GraphsTab from "./components/tabs/GraphsTab";
import ElectorateTab from "./components/tabs/ElectorateTab";

const TURNS_PER_CYCLE = 5;

// Reusable calculation for averages across different slices
const calculateAverages = (pop: Respondent[]): DemographicAverages => {
  const getAvg = (filterFn?: (r: Respondent) => boolean) => {
    const group = filterFn ? pop.filter(filterFn) : pop;
    return group.length > 0 ? group.reduce((sum, r) => sum + r.currentLS, 0) / group.length : 0;
  };

  return {
    national: getAvg(),
    wealth: {
      poor: getAvg(r => r.demographics.wealth === 'Poor'),
      middle: getAvg(r => r.demographics.wealth === 'Middle'),
      wealthy: getAvg(r => r.demographics.wealth === 'Wealthy')
    },
    age: {
      youth: getAvg(r => r.demographics.age === 'Youth'),
      adult: getAvg(r => r.demographics.age === 'Adult'),
      elderly: getAvg(r => r.demographics.age === 'Elderly')
    }
  };
};

// Deterministic Schedule Generator
const generateCycleSchedule = (cycle: ElectionCycle, available: Policy[]): Policy[][] => {
  const schedule: Policy[][] = [];
  let seed = cycle * 12345 + 1; 
  const pseudoRandom = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  let pool = [...available];

  for (let t = 0; t < TURNS_PER_CYCLE; t++) {
    const turnPolicies: Policy[] = [];
    for (let p = 0; p < 8; p++) { // <-- INCREASING THE DRAFT POOL TO 8
      if (pool.length === 0) pool = [...available]; 
      const index = Math.floor(pseudoRandom() * pool.length);
      turnPolicies.push(pool[index]);
      pool.splice(index, 1);
    }
    schedule.push(turnPolicies);
  }
  return schedule;
};

// Routing for Metrics
const getMetricScore = (pop: Respondent[], cycle: ElectionCycle) => {
  if (pop.length === 0) return 0;
  if (cycle === ElectionCycle.Benthamite) return pop.reduce((s, r) => s + r.currentLS, 0) / pop.length;
  if (cycle === ElectionCycle.Rawlsian) return WelfareMetrics.calculateSocietalFloor(pop);
  
  const allLS = pop.map(p => p.currentLS);
  if (cycle === ElectionCycle.SocietalUtility) return pop.reduce((s, r) => s + WelfareMetrics.evaluateDistribution(allLS, r.societalUtilities), 0) / pop.length;
  
  return pop.reduce((s, r) => s + WelfareMetrics.getUtilityForPerson(r.currentLS, r.personalUtilities), 0) / pop.length;
};

export default function Home() {
  const [population, setPopulation] = useState<Respondent[]>([]);
  const [initialPopulation, setInitialPopulation] = useState<Respondent[]>([]); 
  const [baselinePopulation, setBaselinePopulation] = useState<Respondent[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);

  const [pulsePolicy, setPulsePolicy] = useState(false);

  const [currentTurn, setCurrentTurn] = useState(1);
  const [currentCycle, setCurrentCycle] = useState<ElectionCycle>(ElectionCycle.Benthamite);
  const [cycleAttempts, setCycleAttempts] = useState(1);
  
  const [showElection, setShowElection] = useState(false);
  const [showNarrative, setShowNarrative] = useState(false);
  const [showFinalDebrief, setShowFinalDebrief] = useState(false);
  const [history, setHistory] = useState<TurnHistory[]>([]);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'demographics' | 'ministers' | 'graphs' | 'electorate'>('dashboard');
  const [selectedMinister, setSelectedMinister] = useState<any | null>(null);
  const [devMode, setDevMode] = useState(false);

  // MAO & Schedule State
  const [cycleSchedule, setCycleSchedule] = useState<Policy[][]>([]);
  const [cycleMAO, setCycleMAO] = useState<number>(0);
  const [currentDeck, setCurrentDeck] = useState<Policy[]>([]);

  const [optimalPath, setOptimalPath] = useState<Policy[]>([]); 
  const [showOptimalPath, setShowOptimalPath] = useState(false);

  // Tabs
  const tabs = ['dashboard', 'electorate', 'ministers', 'graphs'] as const;
  const activeTabIndex = tabs.indexOf(activeTab as any);

  const {
    showIntro, isTutorialActive, setIsTutorialActive, tutorialStep, setTutorialStep,
    tutorialVisitedTabs, setTutorialVisitedTabs, currentTutorialSequence, safeTutorialStep,
    currentStepData, isLastTutorialStep, targetNextTab, handleStartGame
  } = useTutorial(activeTab, tabs, setActiveTab);

  const handleNavigateToPolicy = useCallback(() => {
    setActiveTab('dashboard');
    setPulsePolicy(true);
    setTimeout(() => setPulsePolicy(false), 1500); // Clear pulse after 1.5s
  }, []);
  
  const startCycle = useCallback((cycle: ElectionCycle, pop: Respondent[]) => {
    const schedule = generateCycleSchedule(cycle, availablePolicies);
    setCycleSchedule(schedule);
    
    // Calculate Absolute Maximum Score possible with this specific schedule
    const maoResult = MAOEngine.calculateMAO(pop, schedule, cycle, getMetricScore);
    setCycleMAO(maoResult.maxScore);
    setOptimalPath(maoResult.optimalPath);
    
    setCurrentDeck(schedule[0]);
    setCurrentTurn(1);
    setCurrentCycle(cycle);
    setHistory([{ turn: 1, enactedPolicyId: null, enactedPolicyName: 'Took Office', lsAverages: calculateAverages(pop) }]);
    setShowElection(false);
    setSelectedPolicy(null);
    setSelectedMinister(null);
  }, []);

  useEffect(() => {
    const data = loadPopulation();
    setPopulation(data);
    setInitialPopulation(data);
    setBaselinePopulation(data);
    startCycle(ElectionCycle.Benthamite, data);
    setCycleAttempts(1);
  }, [startCycle]);

  const previewPopulation = useMemo(() => {
    if (!selectedPolicy) return population;
    return PolicyEngine.applyPolicy(population, selectedPolicy);
  }, [population, selectedPolicy]);

  // Metric Calculations
  const initialMetricScore = useMemo(() => getMetricScore(initialPopulation, currentCycle), [initialPopulation, currentCycle]);
  const turnMetricScore = useMemo(() => getMetricScore(population, currentCycle), [population, currentCycle]);
  const currentMetricScore = useMemo(() => getMetricScore(previewPopulation, currentCycle), [previewPopulation, currentCycle]);
  
  // Convert Score to Approval Rating
  const turnApprovalRating = useMemo(() => WelfareMetrics.calculateApprovalRating(turnMetricScore, cycleMAO), [turnMetricScore, cycleMAO]);

  // 2D Charts & Histograms
  const currentChartData = useMemo(() => {
    if (population.length === 0) return [];
    const allLS = population.map(p => p.currentLS);
    return population.map(r => {
      let yVal = r.currentLS; 
      if (currentCycle === ElectionCycle.SocietalUtility) yVal = WelfareMetrics.evaluateDistribution(allLS, r.societalUtilities);
      else if (currentCycle === ElectionCycle.PersonalUtility) yVal = WelfareMetrics.getUtilityForPerson(r.currentLS, r.personalUtilities);
      return { id: r.id, x: r.currentLS, y: yVal };
    });
  }, [population, currentCycle]);

  const previewChartData = useMemo(() => {
    if (previewPopulation.length === 0) return [];
    const allLS = previewPopulation.map(p => p.currentLS);
    return previewPopulation.map(r => {
      let yVal = r.currentLS; 
      if (currentCycle === ElectionCycle.SocietalUtility) yVal = WelfareMetrics.evaluateDistribution(allLS, r.societalUtilities);
      else if (currentCycle === ElectionCycle.PersonalUtility) yVal = WelfareMetrics.getUtilityForPerson(r.currentLS, r.personalUtilities);
      return { id: r.id, x: r.currentLS, y: yVal };
    });
  }, [previewPopulation, currentCycle]);

  const generateHistogramData = useCallback((targetPopulation: Respondent[]) => {
    return Array.from({ length: 11 }, (_, i) => {
      const peopleInBar = targetPopulation.filter(r => Math.round(r.currentLS) === i);
      const total = peopleInBar.length;
      const getPct = (count: number) => (total > 0 ? (count / total) * 100 : 0);
      return {
        name: i,
        count: total,
        breakdown: {
          wealth: {
            Poor: getPct(peopleInBar.filter(p => p.demographics.wealth === 'Poor').length),
            Middle: getPct(peopleInBar.filter(p => p.demographics.wealth === 'Middle').length),
            Wealthy: getPct(peopleInBar.filter(p => p.demographics.wealth === 'Wealthy').length),
          },
          age: {
            Youth: getPct(peopleInBar.filter(p => p.demographics.age === 'Youth').length),
            Adult: getPct(peopleInBar.filter(p => p.demographics.age === 'Adult').length),
            Elderly: getPct(peopleInBar.filter(p => p.demographics.age === 'Elderly').length),
          },
        }
      };
    });
  }, []);

  const currentHistogramData = useMemo(() => generateHistogramData(population), [population, generateHistogramData]);
  const previewHistogramData = useMemo(() => generateHistogramData(previewPopulation), [previewPopulation, generateHistogramData]);

  // Dynamically filter the 8 drafted policies down to the 3 that best serve the selected minister
  const presentedPolicies = useMemo(() => {
    if (!selectedMinister) return [];

    const filterMap: Record<string, (r: Respondent) => boolean> = {
      "Welfare Secretary": r => r.demographics.wealth === 'Poor',
      "Home Secretary": r => r.demographics.wealth === 'Middle',
      "Chancellor": r => r.demographics.wealth === 'Wealthy',
      "Education Secretary": r => r.demographics.age === 'Youth',
      "Business Secretary": r => r.demographics.age === 'Adult',
      "Pensions Secretary": r => r.demographics.age === 'Elderly'
    };

    const filterFn = filterMap[selectedMinister];
    if (!filterFn) return currentDeck.slice(0, 3); // Fallback

    const scoredPolicies = currentDeck.map(policy => {
      // Simulate the policy to see its impact
      const testPop = PolicyEngine.applyPolicy(population, policy);
      const group = testPop.filter(filterFn);
      
      let score = 0;
      if (group.length > 0) {
        // Evaluate the outcome using the rules of the current cycle
        score = group.reduce((s, r) => s + (
          currentCycle === ElectionCycle.Benthamite || currentCycle === ElectionCycle.Rawlsian 
            ? r.currentLS 
            : currentCycle === ElectionCycle.PersonalUtility 
              ? WelfareMetrics.getUtilityForPerson(r.currentLS, r.personalUtilities) 
              : WelfareMetrics.evaluateDistribution(testPop.map(x => x.currentLS), r.societalUtilities)
        ), 0) / group.length;
      }
      return { policy, score };
    });

    // Sort descending by score and slice the top 3
    return scoredPolicies.sort((a, b) => b.score - a.score).slice(0, 3).map(sp => sp.policy);
  }, [selectedMinister, currentDeck, population, currentCycle]);

  const ministers = useMemo(() => {
    const evalMin = (n: string, mandate: string, f: (r: Respondent) => boolean) => {
      const avg = (p: Respondent[]) => {
        const g = p.filter(f); 
        if (g.length === 0) return 0;
        return g.reduce((s, r) => s + (
          currentCycle === ElectionCycle.Benthamite || currentCycle === ElectionCycle.Rawlsian 
            ? r.currentLS 
            : currentCycle === ElectionCycle.PersonalUtility 
              ? WelfareMetrics.getUtilityForPerson(r.currentLS, r.personalUtilities) 
              : WelfareMetrics.evaluateDistribution(p.map(x => x.currentLS), r.societalUtilities)
        ), 0) / g.length;
      };
      
      const proj = avg(previewPopulation);
      const base = avg(initialPopulation);
      const current = avg(population); 
      const delta = proj - base;
      const policyDelta = proj - current;
      
      let status: 'happy' | 'neutral' | 'angry' = 'neutral';
      if (policyDelta > 0.05) status = 'happy';
      else if (policyDelta < -0.05) status = 'angry';
      
      return { 
        name: n, mandate, status, 
        color: status === 'happy' ? "bg-emerald-500" : status === 'neutral' ? "bg-amber-400" : "bg-rose-500", 
        delta, policyDelta, currentScore: current, projectedScore: proj 
      };
    };

    return [
        evalMin("Welfare Secretary", "Low Income", r => r.demographics.wealth === 'Poor'),
        evalMin("Home Secretary", "Middle Class", r => r.demographics.wealth === 'Middle'),
        evalMin("Chancellor", "High Earners", r => r.demographics.wealth === 'Wealthy'),
        evalMin("Education Secretary", "Youth", r => r.demographics.age === 'Youth'),
        evalMin("Business Secretary", "Working Adults", r => r.demographics.age === 'Adult'),
        evalMin("Pensions Secretary", "Elderly", r => r.demographics.age === 'Elderly')
    ];
  }, [initialPopulation, population, previewPopulation, currentCycle]);

  const handleApplyPolicy = () => {
    if (!selectedPolicy) return;
    
    setPopulation(previewPopulation);
    setHistory(prev => [...prev, {
      turn: currentTurn + 1,
      enactedPolicyId: selectedPolicy.id,
      enactedPolicyName: selectedPolicy.policyName,
      lsAverages: calculateAverages(previewPopulation)
    }]);
    
    if (currentTurn < TURNS_PER_CYCLE) {
      setCurrentDeck(cycleSchedule[currentTurn]); 
      setCurrentTurn(prev => prev + 1);
    } else {
      setShowElection(true);
    }
    setSelectedPolicy(null);
    setSelectedMinister(null);
  };

  const handleResetCycle = () => {
    const data = loadPopulation();
    setPopulation(data);
    setInitialPopulation(data);
    startCycle(currentCycle, data);
    setCycleAttempts(prev => prev + 1);
  };

  const handleShowNarrative = () => {
    setShowElection(false);
    setShowNarrative(true);
  };

  const handleFinishSimulation = () => {
    setShowElection(false);
    setShowFinalDebrief(true);
  };

  // Triggered by the Narrative Modal's Proceed button
  const handleProceedFromNarrative = () => {
    // If we just finished the final cycle, route to the complexity debrief instead of restarting
    if (currentCycle === ElectionCycle.SocietalUtility) {
      setShowNarrative(false);
      setShowFinalDebrief(true);
      return;
    }

    const data = loadPopulation(); // Restarts population to 0
    setPopulation(data);
    setInitialPopulation(data);
    
    let nextCycle = ElectionCycle.Rawlsian;
    if (currentCycle === ElectionCycle.Benthamite) nextCycle = ElectionCycle.Rawlsian;
    else if (currentCycle === ElectionCycle.Rawlsian) nextCycle = ElectionCycle.PersonalUtility;
    else if (currentCycle === ElectionCycle.PersonalUtility) nextCycle = ElectionCycle.SocietalUtility;
    
    startCycle(nextCycle, data); // Restarts schedule & MAO tracking to 0
    setCycleAttempts(1);
    setShowNarrative(false);
  };

  const jumpToCycle = (cycle: ElectionCycle) => {
    const data = loadPopulation();
    setPopulation(data);
    setInitialPopulation(data);
    startCycle(cycle, data);
    setCycleAttempts(1);
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-50 font-sans text-zinc-900 overflow-hidden relative">
      {showIntro && <IntroductionModal onStart={handleStartGame} />}

      {/* --- MASTER TUTORIAL OVERLAY --- */}
      <TutorialOverlay 
        isTutorialActive={isTutorialActive}
        currentStepData={currentStepData}
        activeTab={activeTab}
        tutorialStep={tutorialStep}
        tabs={tabs}
        tutorialVisitedTabs={tutorialVisitedTabs}
        currentTutorialSequence={currentTutorialSequence}
        setIsTutorialActive={setIsTutorialActive}
        targetNextTab={targetNextTab}
        isLastTutorialStep={isLastTutorialStep}
        setTutorialVisitedTabs={setTutorialVisitedTabs}
        setActiveTab={setActiveTab}
        setTutorialStep={setTutorialStep}
      />

      {/* --- GAME HEADER --- */}      
      <GameHeader 
        currentCycle={currentCycle}
        isTutorialActive={isTutorialActive}
        setIsTutorialActive={setIsTutorialActive}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        targetNextTab={targetNextTab}
        tutorialVisitedTabs={tutorialVisitedTabs}
        setTutorialVisitedTabs={setTutorialVisitedTabs}
        setTutorialStep={setTutorialStep}
        currentTurn={currentTurn}
        turnsPerCycle={TURNS_PER_CYCLE}
        tabs={tabs}
      />

      <GameStateProvider value={{
        isTutorialActive, tutorialStep: safeTutorialStep, setActiveTab,
        currentCycle, currentChartData, previewChartData, currentHistogramData, previewHistogramData,
        ministers, selectedMinister, setSelectedMinister, presentedPolicies, selectedPolicy, setSelectedPolicy,
        currentMetricScore, initialMetricScore, turnMetricScore, currentDeck, handleApplyPolicy,
        cycleMAO, approvalRating: turnApprovalRating, population, previewPopulation, pulsePolicy,
        initialPopulation, onNavigateToPolicy: handleNavigateToPolicy
      }}>
        <main className="flex-1 overflow-hidden p-6 flex flex-col">
          {activeTab === 'dashboard' && <DashboardTab />}
          {activeTab === 'ministers' && <MinistersTab />}
          {activeTab === 'graphs' && <GraphsTab />}
          {activeTab === 'electorate' && <ElectorateTab />}
        </main>
      </GameStateProvider>

      {showElection && <ElectionModal currentMetricScore={turnMetricScore} currentCycle={currentCycle} approvalRating={turnApprovalRating} cycleAttempts={cycleAttempts} onNextCycle={handleShowNarrative} onReset={handleResetCycle} onFinish={handleFinishSimulation} />}
      {showNarrative && <NarrativeModal completedCycle={currentCycle} population={population} onProceed={handleProceedFromNarrative} />}
      {showFinalDebrief && <FinalDebriefModal baselinePopulation={baselinePopulation} finalPopulation={population} />}

      <DevPanel 
        devMode={devMode}
        setDevMode={setDevMode}
        jumpToCycle={jumpToCycle}
        setCurrentTurn={setCurrentTurn}
        currentTurn={currentTurn}
        turnsPerCycle={TURNS_PER_CYCLE}
        showOptimalPath={showOptimalPath}
        setShowOptimalPath={setShowOptimalPath}
        optimalPath={optimalPath}
        cycleMAO={cycleMAO}
      />
    </div>
  );
}