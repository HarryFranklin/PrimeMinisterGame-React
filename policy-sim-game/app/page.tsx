"use client";

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
    for (let p = 0; p < 3; p++) {
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

  // --- Tutorial & Onboarding States ---
  const [showIntro, setShowIntro] = useState(true);
  const [isTutorialActive, setIsTutorialActive] = useState(false);

  // --- NEW MASTER TUTORIAL STATES ---
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialVisitedTabs, setTutorialVisitedTabs] = useState<string[]>(['dashboard']);

  useEffect(() => {
    if (isTutorialActive) {
      setTutorialStep(0);
      setTutorialVisitedTabs(['dashboard']);
      setActiveTab('dashboard'); // Force back to start
    }
  }, [isTutorialActive]);

  // Track tab clicks during step 3
  useEffect(() => {
    if (isTutorialActive && tutorialStep === 3) {
      if (!tutorialVisitedTabs.includes(activeTab)) {
        setTutorialVisitedTabs(prev => [...prev, activeTab]);
      }
    }
  }, [activeTab, isTutorialActive, tutorialStep]);

  // Define steps with dynamic positioning
  const tutorialStepsData = [
    { title: 'Data & Demographics', text: 'This section visualises the life satisfaction of your electorate. Use the bottom tool to explore demographic breakdowns.', pos: 'bottom-10 right-10' },
    { title: 'The Cabinet & Public Approval', text: 'Your ministers represent key voting blocs. Their reactions predict policy impacts. (Notice how this tooltip moved out of the way!)', pos: 'bottom-10 left-10' },
    { title: 'Legislative Agenda', text: 'Here you select and enact policies. You can only pass one policy per turn, so choose carefully.', pos: 'bottom-10 left-10' },
    { title: 'Department Overviews', text: 'To finish your onboarding, click through each of the tabs at the top to explore them.', pos: 'top-24 left-1/2 -translate-x-1/2' }
  ];

  const handleStartGame = () => {
    setShowIntro(false);
    setIsTutorialActive(true); 
  };
  
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
      
      let status = 'neutral';
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

  const tabs = ['dashboard', 'electorate', 'ministers', 'graphs'];
  const activeTabIndex = tabs.indexOf(activeTab);

  return (
    <div className="flex flex-col h-screen bg-zinc-50 font-sans text-zinc-900 overflow-hidden relative">
      {showIntro && <IntroductionModal onStart={handleStartGame} />}

      {/* --- MASTER TUTORIAL OVERLAY --- */}
      {isTutorialActive && (
        <>
          <div className="fixed inset-0 z-[60] bg-zinc-900/60 backdrop-blur-[2px] transition-all duration-500" />
          
          <div className={`fixed z-[80] bg-white rounded-2xl shadow-2xl p-6 md:p-8 border-2 border-pink-200 max-w-lg w-full flex flex-col gap-4 animate-in fade-in duration-500 transition-all ${tutorialStepsData[tutorialStep].pos}`}>
            <div>
              <h3 className="text-2xl font-black text-pink-600 tracking-tight">{tutorialStepsData[tutorialStep].title}</h3>
              <p className="text-zinc-700 mt-2 leading-relaxed">{tutorialStepsData[tutorialStep].text}</p>
            </div>
            
            {/* Step 3: Tab Checklist */}
            {tutorialStep === 3 && (
              <div className="flex gap-2 mt-2">
                {tabs.map(t => (
                  <span key={t} className={`text-[10px] font-bold uppercase px-2 py-1 rounded transition-colors ${tutorialVisitedTabs.includes(t) ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-400'}`}>
                    {t} {tutorialVisitedTabs.includes(t) && '✓'}
                  </span>
                ))}
              </div>
            )}
            
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-zinc-100">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                Step {tutorialStep + 1} of {tutorialStepsData.length}
              </span>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsTutorialActive(false)} 
                  className="px-4 py-2 text-sm font-bold text-zinc-500 hover:text-zinc-800 transition-colors"
                >
                  Skip
                </button>
                <button 
                  disabled={tutorialStep === 3 && tutorialVisitedTabs.length < tabs.length}
                  onClick={() => {
                    if (tutorialStep === tutorialStepsData.length - 1) {
                      setIsTutorialActive(false);
                      setActiveTab('dashboard'); // Return to dashboard upon finishing
                    } else {
                      setTutorialStep(s => s + 1);
                    }
                  }} 
                  className="px-6 py-2 bg-pink-600 text-white text-sm font-bold rounded-xl hover:bg-pink-700 shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {tutorialStep === tutorialStepsData.length - 1 ? 'Finish Onboarding' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Dynamically boost Header Z-Index during Step 3 */}
      <header className={`bg-white border-b border-zinc-200 px-6 py-4 flex justify-between items-center shrink-0 shadow-sm transition-all duration-500 ${isTutorialActive && tutorialStep === 3 ? 'relative z-[70] ring-4 ring-pink-500/20' : 'relative z-10'}`}><div>
          <h1 className="text-xl font-bold">Policy Simulator</h1>
          <p className="text-xs font-bold text-pink-600 uppercase">
            {FRAMEWORK_RULES[currentCycle].frameworkTitle}
          </p>
        </div>
        
        {/* TAB BAR */}
        <nav className="bg-zinc-100 p-1 rounded-lg w-full max-w-3xl"> 
          <div className="relative grid grid-cols-4 gap-1">
            <div 
              className="absolute top-0 bottom-0 left-0 bg-white rounded-md shadow-sm transition-all duration-300 ease-out"
              style={{
                width: `calc((100% - 12px) / 4)`, 
                transform: `translateX(calc(${activeTabIndex * 100}% + ${activeTabIndex * 4}px))`
              }}
            />
            {tabs.map((t) => (
              <button 
                key={t} 
                onClick={() => setActiveTab(t as any)} 
                className={`relative z-10 w-full py-1.5 text-xs font-bold uppercase rounded-md transition-colors duration-300 ${
                  activeTab === t ? 'text-pink-600' : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </nav>
        
        {/* Tutorial Toggle Button */}
        <div className="flex items-center gap-6 text-right">
          <button 
            onClick={() => setIsTutorialActive(!isTutorialActive)}
            className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase transition-colors border shadow-sm ${
              isTutorialActive 
                ? 'bg-pink-100 text-pink-700 border-pink-300' 
                : 'bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            {isTutorialActive ? 'Tutorial: ON' : 'Tutorial: OFF'}
          </button>

          <div>
            <p className="text-xs font-bold text-zinc-400 uppercase">Election In</p>
            <p className="text-lg font-mono font-bold">{TURNS_PER_CYCLE - currentTurn + 1} Turns</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden p-6 flex flex-col">
        {activeTab === 'dashboard' && (
          <DashboardTab 
            isTutorialActive={isTutorialActive}
            tutorialStep={tutorialStep}
            setActiveTab={setActiveTab} 
            currentCycle={currentCycle} 
            currentChartData={currentChartData}
            previewChartData={previewChartData}
            currentHistogramData={currentHistogramData}
            previewHistogramData={previewHistogramData}
            ministers={ministers} 
            setSelectedMinister={setSelectedMinister} 
            selectedPolicy={selectedPolicy} 
            currentMetricScore={currentMetricScore} 
            initialMetricScore={initialMetricScore}
            turnMetricScore={turnMetricScore}
            currentDeck={currentDeck} 
            setSelectedPolicy={setSelectedPolicy} 
            handleApplyPolicy={handleApplyPolicy} 
            cycleMAO={cycleMAO}
            approvalRating={turnApprovalRating}
            population={population}
            previewPopulation={previewPopulation}
          />
        )}
        {activeTab === 'ministers' && <MinistersTab ministers={ministers} selectedMinister={selectedMinister} selectedPolicy={selectedPolicy}/>}
        {activeTab === 'graphs' && (
          <GraphsTab
            setActiveTab={setActiveTab} 
            currentCycle={currentCycle} 
            currentChartData={currentChartData} 
            previewChartData={previewChartData} 
            selectedPolicy={selectedPolicy}
            currentHistogramData={currentHistogramData} 
            previewHistogramData={previewHistogramData} 
            currentMetricScore={currentMetricScore}
            initialMetricScore={initialMetricScore} 
            turnMetricScore={turnMetricScore}
            ministers={ministers}
          />
        )}
        {activeTab === 'electorate' && (
          <ElectorateTab 
            initialPopulation={initialPopulation}
            previewPopulation={previewPopulation}
            currentCycle={currentCycle}
            approvalRating={turnApprovalRating}
          />
        )}
      </main>

      {showElection && (
        <ElectionModal 
          currentMetricScore={turnMetricScore} 
          currentCycle={currentCycle} 
          approvalRating={turnApprovalRating}
          cycleAttempts={cycleAttempts}
          onNextCycle={handleShowNarrative}
          onReset={handleResetCycle} 
          onFinish={handleFinishSimulation}
        />
      )}

      {showNarrative && (
        <NarrativeModal 
          completedCycle={currentCycle}
          population={population}
          onProceed={handleProceedFromNarrative}
        />
      )}

      {showFinalDebrief && (
        <FinalDebriefModal 
          baselinePopulation={baselinePopulation}
          finalPopulation={population}
        />
      )}

      <button 
        onClick={() => setDevMode(!devMode)} 
        className="fixed bottom-4 left-4 z-50 bg-zinc-800/80 backdrop-blur-sm text-zinc-400 text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full hover:bg-zinc-700 hover:text-white transition-colors border border-zinc-600 shadow-lg"
      >
        Dev Mode {devMode ? 'ON' : 'OFF'}
      </button>

      {devMode && (
        <div className="fixed bottom-14 left-4 z-50 bg-zinc-900/95 backdrop-blur-md text-white p-5 rounded-2xl shadow-2xl border border-zinc-700 w-72 text-sm flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4">
          <h3 className="font-bold text-pink-500 uppercase tracking-widest text-xs border-b border-zinc-800 pb-2">Developer Panel</h3>
          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-2">Jump to Cycle</span>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => jumpToCycle(ElectionCycle.Benthamite)} className="bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg text-xs font-bold transition-colors">1. Benthamite</button>
              <button onClick={() => jumpToCycle(ElectionCycle.Rawlsian)} className="bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg text-xs font-bold transition-colors">2. Rawlsian</button>
              <button onClick={() => jumpToCycle(ElectionCycle.PersonalUtility)} className="bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg text-xs font-bold transition-colors">3. Personal</button>
              <button onClick={() => jumpToCycle(ElectionCycle.SocietalUtility)} className="bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg text-xs font-bold transition-colors">4. Societal</button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-2">Time Controls</span>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setCurrentTurn(prev => Math.min(TURNS_PER_CYCLE, prev + 1))} className="bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg text-xs font-bold transition-colors">Skip 1 Turn</button>
              <button onClick={() => setCurrentTurn(TURNS_PER_CYCLE)} className="bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg text-xs font-bold transition-colors">Jump to End</button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-2">Cheat Codes</span>
            <div className="grid grid-cols-1 gap-2">
              <button 
                onClick={() => setShowOptimalPath(!showOptimalPath)} 
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${showOptimalPath ? 'bg-pink-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700'}`}
              >
                {showOptimalPath ? 'Hide Optimal Path' : 'Show Optimal Path'}
              </button>
            </div>
          </div>

          {/* --- OPTIMAL PATH DEV WIDGET --- */}
          {devMode && showOptimalPath && optimalPath.length > 0 && (
            <div className="fixed bottom-14 left-80 z-50 bg-zinc-900/95 backdrop-blur-md text-white p-5 rounded-2xl shadow-2xl border border-zinc-700 w-72 animate-in fade-in slide-in-from-left-4">
              <h3 className="font-bold text-pink-500 uppercase tracking-widest text-xs border-b border-zinc-800 pb-2 mb-3">
                Optimal Path (MAO: {cycleMAO.toFixed(2)})
              </h3>
              <ol className="flex flex-col gap-3 text-sm">
                {optimalPath.map((policy, index) => {
                  const isPast = index + 1 < currentTurn;
                  const isCurrent = index + 1 === currentTurn;
                  return (
                    <li key={index} className={`flex items-start gap-3 transition-colors ${isPast ? 'opacity-30 line-through' : isCurrent ? 'text-emerald-400 font-bold' : 'text-zinc-400'}`}>
                      <span className="font-mono text-xs mt-0.5">{index + 1}.</span>
                      <span className="leading-tight">{policy.policyName}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}