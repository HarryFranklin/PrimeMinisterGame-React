"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Respondent, AxisVariable, Policy, ElectionCycle, TurnHistory, DemographicAverages } from "./utils/types";
import { loadPopulation } from "./utils/dataLoader";
import { WelfareMetrics } from "./utils/WelfareMetrics";
import { availablePolicies } from "./data/policies";
import { PolicyEngine } from "./utils/PolicyEngine";
import { MAOEngine } from "./utils/MAOEngine";
import ElectionModal from "./components/ElectionModal";
import NarrativeModal from "./components/NarrativeModal";
import FinalDebriefModal from "./components/FinalDebriefModal";
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
  const [showElection, setShowElection] = useState(false);
  const [showNarrative, setShowNarrative] = useState(false);
  const [showFinalDebrief, setShowFinalDebrief] = useState(false);
  const [history, setHistory] = useState<TurnHistory[]>([]);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'demographics' | 'ministers' | 'graphs' | 'electorate'>('dashboard');
  const [selectedMinister, setSelectedMinister] = useState<any | null>(null);
  const [devMode, setDevMode] = useState(false);

  

  // New MAO & Schedule State
  const [cycleSchedule, setCycleSchedule] = useState<Policy[][]>([]);
  const [cycleMAO, setCycleMAO] = useState<number>(0);
  const [currentDeck, setCurrentDeck] = useState<Policy[]>([]);

  const [optimalPath, setOptimalPath] = useState<Policy[]>([]); 
  const [showOptimalPath, setShowOptimalPath] = useState(false);

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
      setCurrentDeck(cycleSchedule[currentTurn]); // currentTurn evaluates to next index (e.g., Turn 1 -> Index 1)
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
  };

  // 1. Triggered by the Election Modal's "Next Cycle" button
  const handleShowNarrative = () => {
    setShowElection(false);
    setShowNarrative(true);
  };

  const handleFinishSimulation = () => {
    setShowElection(false);
    setShowFinalDebrief(true);
  };

  // Triggered by the Narrative Modal's "Restart Simulation" button
  const handleProceedFromNarrative = () => {
    const data = loadPopulation(); // Restarts population to 0
    setPopulation(data);
    setInitialPopulation(data);
    
    let nextCycle = ElectionCycle.Rawlsian;
    if (currentCycle === ElectionCycle.Benthamite) nextCycle = ElectionCycle.Rawlsian;
    else if (currentCycle === ElectionCycle.Rawlsian) nextCycle = ElectionCycle.PersonalUtility;
    else if (currentCycle === ElectionCycle.PersonalUtility) nextCycle = ElectionCycle.SocietalUtility;
    
    startCycle(nextCycle, data); // Restarts schedule & MAO tracking to 0
    setShowNarrative(false);
  };

  const jumpToCycle = (cycle: ElectionCycle) => {
    const data = loadPopulation();
    setPopulation(data);
    setInitialPopulation(data);
    startCycle(cycle, data);
  };

  const tabs = ['dashboard', 'electorate', 'ministers', 'graphs'];
  const activeTabIndex = tabs.indexOf(activeTab);

  return (
    <div className="flex flex-col h-screen bg-zinc-50 font-sans text-zinc-900 overflow-hidden relative">
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex justify-between items-center shrink-0 shadow-sm z-10">
        <div>
          <h1 className="text-xl font-bold">Policy Simulator</h1>
          <p className="text-xs font-bold text-pink-600 uppercase">
            {FRAMEWORK_RULES[currentCycle].frameworkTitle}
          </p>
        </div>
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
        <div className="text-right">
          <p className="text-xs font-bold text-zinc-400 uppercase">Election In</p>
          <p className="text-lg font-mono font-bold">{TURNS_PER_CYCLE - currentTurn + 1} Turns</p>
        </div>
      </header>

      <main className="flex-1 overflow-hidden p-6 flex flex-col">
        {activeTab === 'dashboard' && (
          <DashboardTab 
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
            // I changed the className on this div right below:
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