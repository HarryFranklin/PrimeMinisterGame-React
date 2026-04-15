"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Respondent, AxisVariable, Policy, ElectionCycle, TurnHistory, DemographicAverages } from "./utils/types";
import { loadPopulation } from "./utils/dataLoader";
import { WelfareMetrics } from "./utils/WelfareMetrics";
import { availablePolicies } from "./data/policies";
import { PolicyEngine } from "./utils/PolicyEngine";
import ElectionModal from "./components/ElectionModal";
import { FRAMEWORK_RULES } from "./utils/frameworkRules";

// Tab Imports
import DashboardTab from "./components/tabs/DashboardTab";
import MinistersTab from "./components/tabs/MinistersTab";
import GraphsTab from "./components/tabs/GraphsTab";
import ElectorateTab from "./components/tabs/ElectorateTab";

const totalTurns = 20;

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

export default function Home() {
  // #region Core Simulation State
  const [population, setPopulation] = useState<Respondent[]>([]);
  const [initialPopulation, setInitialPopulation] = useState<Respondent[]>([]); 
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);

  const [currentTurn, setCurrentTurn] = useState(1);
  
  const [currentCycle, setCurrentCycle] = useState<ElectionCycle>(ElectionCycle.Benthamite);
  const [showElection, setShowElection] = useState(false);

  const [history, setHistory] = useState<TurnHistory[]>([]);
  // #endregion

  // #region UI & Tab State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'demographics' | 'ministers' | 'graphs' | 'electorate'>('dashboard');
  const [selectedMinister, setSelectedMinister] = useState<any | null>(null);

  const [usedPolicies, setUsedPolicies] = useState<Set<string>>(new Set());
  const [currentDeck, setCurrentDeck] = useState<Policy[]>([]);
  // #endregion

  // #region Developer Mode State
  const [devMode, setDevMode] = useState(false);
  // #endregion

  // #region Deck Management
  
  // Draws 3 random policies from the deck, ensuring no duplicates from previous turns
  const drawDeck = useCallback((used: Set<string>) => {
    // 1. Filter out policies we've already enacted
    let available = availablePolicies.filter(p => !used.has(p.id));
    
    // 2. If we run out of cards, reshuffle the entire deck
    if (available.length < 3) {
      available = availablePolicies;
      setUsedPolicies(new Set()); 
    }

    const deck: Policy[] = [];
    
    // 3. Keep picking random cards until we have exactly 3
    while (deck.length < 3 && available.length > 0) {
      const randomIndex = Math.floor(Math.random() * available.length);
      const picked = available[randomIndex];
      
      // Add it to our hand and remove it from the available pool so we don't draw it twice in one turn
      deck.push(picked);
      available.splice(randomIndex, 1);
    }
    
    return deck;
  }, []);

  useEffect(() => {
    const data = loadPopulation();
    setPopulation(data);
    setInitialPopulation(data);
    setCurrentDeck(drawDeck(new Set()));
    setHistory([{ turn: 1, enactedPolicyId: null, enactedPolicyName: 'Took Office', lsAverages: calculateAverages(data) }]);
  }, [drawDeck]);
  // #endregion

  // #region Logic & Analytics
  const previewPopulation = useMemo(() => {
    if (!selectedPolicy) return population;
    return PolicyEngine.applyPolicy(population, selectedPolicy);
  }, [population, selectedPolicy]);

  // 1. The Single Source of Truth for Winning
  const currentMetricScore = useMemo(() => {
    if (previewPopulation.length === 0) return 0;
    if (currentCycle === ElectionCycle.Benthamite) return previewPopulation.reduce((s, r) => s + r.currentLS, 0) / previewPopulation.length;
    
    //  RAWLSIAN LOGIC
    if (currentCycle === ElectionCycle.Rawlsian) return WelfareMetrics.calculateInequalityIndex(previewPopulation);
    
    const allLS = previewPopulation.map(p => p.currentLS);
    if (currentCycle === ElectionCycle.SocietalUtility) return previewPopulation.reduce((s, r) => s + WelfareMetrics.evaluateDistribution(allLS, r.societalUtilities), 0) / previewPopulation.length;
    return previewPopulation.reduce((s, r) => s + WelfareMetrics.getUtilityForPerson(r.currentLS, r.personalUtilities), 0) / previewPopulation.length;
  }, [previewPopulation, currentCycle]);

  // === Calculate the Baseline Score ===
  const initialMetricScore = useMemo(() => {
    if (initialPopulation.length === 0) return 0;
    if (currentCycle === ElectionCycle.Benthamite) return initialPopulation.reduce((s, r) => s + r.currentLS, 0) / initialPopulation.length;
    
    //  RAWLSIAN LOGIC
    if (currentCycle === ElectionCycle.Rawlsian) return WelfareMetrics.calculateInequalityIndex(initialPopulation);
    
    const allLS = initialPopulation.map(p => p.currentLS);
    if (currentCycle === ElectionCycle.SocietalUtility) return initialPopulation.reduce((s, r) => s + WelfareMetrics.evaluateDistribution(allLS, r.societalUtilities), 0) / initialPopulation.length;
    return initialPopulation.reduce((s, r) => s + WelfareMetrics.getUtilityForPerson(r.currentLS, r.personalUtilities), 0) / initialPopulation.length;
  }, [initialPopulation, currentCycle]);

  // === Calculate the Score for the CURRENT Turn (Before Preview) ===
  const turnMetricScore = useMemo(() => {
    if (population.length === 0) return 0;
    if (currentCycle === ElectionCycle.Benthamite) return population.reduce((s, r) => s + r.currentLS, 0) / population.length;
    
    // RAWLSIAN: Uses the actual, confirmed population of this turn
    if (currentCycle === ElectionCycle.Rawlsian) return WelfareMetrics.calculateInequalityIndex(population);
    
    const allLS = population.map(p => p.currentLS);
    if (currentCycle === ElectionCycle.SocietalUtility) return population.reduce((s, r) => s + WelfareMetrics.evaluateDistribution(allLS, r.societalUtilities), 0) / population.length;
    return population.reduce((s, r) => s + WelfareMetrics.getUtilityForPerson(r.currentLS, r.personalUtilities), 0) / population.length;
  }, [population, currentCycle]);

  // 2. Properly map the Y-axis data depending on the active cycle's metric for the 2D Charts
  // The Before State (2D Scatter Data)
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

  // The After State (2D Scatter Data)
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

  // 3. Helper function to generate histogram data
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

  // 3a. Current Histogram Data (Before Policy)
  const currentHistogramData = useMemo(() => generateHistogramData(population), [population, generateHistogramData]);
  
  // 3b. Projected Histogram Data (After Policy)
  const previewHistogramData = useMemo(() => generateHistogramData(previewPopulation), [previewPopulation, generateHistogramData]);

  // Generates the cabinet of ministers, mapping each to a specific demographic slice
  const ministers = useMemo(() => {
    const activeRule = FRAMEWORK_RULES[currentCycle];
    
    // Evaluates a specific demographic slice's utility and returns a minister object
    const evalMin = (n: string, f: (r: Respondent) => boolean) => {
      const avg = (p: Respondent[]) => {
        const g = p.filter(f); 
        if (g.length === 0) return 0;
        
        // Use the appropriate metric evaluation depending on the current election cycle
        return g.reduce((s, r) => s + (
          currentCycle === ElectionCycle.Benthamite || currentCycle === ElectionCycle.Rawlsian 
            ? r.currentLS / 10 
            : currentCycle === ElectionCycle.PersonalUtility 
              ? WelfareMetrics.getUtilityForPerson(r.currentLS, r.personalUtilities) 
              : WelfareMetrics.evaluateDistribution(p.map(x => x.currentLS), r.societalUtilities)
        ), 0) / g.length;
      };
      
      const proj = avg(previewPopulation);
      const base = avg(initialPopulation);
      const current = avg(population); 
      const delta = proj - base;
      
      // Apply the framework's specific loss aversion multiplier
      const multiplier = delta < 0 ? activeRule.lossAversionMultiplier : activeRule.gainMultiplier;
      const score = proj + (delta * multiplier);
      
      // Calculate happiness thresholds
      const status = score >= 0.85 ? 'happy' : score >= 0.70 ? 'neutral' : 'angry';
      
      return { 
        name: n, 
        status, 
        color: status === 'happy' ? "bg-emerald-500" : status === 'neutral' ? "bg-amber-400" : "bg-rose-500", 
        delta, 
        policyDelta: proj - current, 
        currentScore: current, 
        projectedScore: proj, 
        quote: `${n} concerns reflected.` 
      };
    };

    // Return the 6 ministers mapped strictly to our 6 active demographic brackets
    return [
        evalMin("Welfare", r => r.demographics.wealth === 'Poor'), 
        evalMin("Home Office", r => r.demographics.wealth === 'Middle'), 
        evalMin("Treasury", r => r.demographics.wealth === 'Wealthy'),
        evalMin("Education", r => r.demographics.age === 'Youth'),
        evalMin("Work", r => r.demographics.age === 'Adult'),
        evalMin("Health", r => r.demographics.age === 'Elderly')
    ];
  }, [initialPopulation, population, previewPopulation, currentCycle]);

  const [selectedHistoryGroup, setSelectedHistoryGroup] = useState<{
    label: string;
    category: 'wealth' | 'age' | 'traits';
    key: string;
  } | null>(null);

  const getDemoStats = useCallback((pop: Respondent[]) => {
    if (pop.length === 0) return null;
    const total = pop.length;
    const getStat = (filterFn: (r: Respondent) => boolean) => {
      const group = pop.filter(filterFn);
      const pct = (group.length / total) * 100;
      const avgLS = group.length > 0 ? group.reduce((sum, r) => sum + r.currentLS, 0) / group.length : 0;
      return { pct: pct.toFixed(1), ls: avgLS.toFixed(1), count: group.length };
    };

    return {
      total,
      wealth: { poor: getStat(r => r.demographics.wealth === 'Poor'), middle: getStat(r => r.demographics.wealth === 'Middle'), wealthy: getStat(r => r.demographics.wealth === 'Wealthy') },
      age: { youth: getStat(r => r.demographics.age === 'Youth'), adult: getStat(r => r.demographics.age === 'Adult'), elderly: getStat(r => r.demographics.age === 'Elderly') },
    };
  }, []);

  const demoStats = useMemo(() => getDemoStats(previewPopulation), [previewPopulation, getDemoStats]);
  const initialDemoStats = useMemo(() => getDemoStats(initialPopulation), [initialPopulation, getDemoStats]);
  // #endregion

  // #region Apply Policy
  const handleApplyPolicy = () => {
    if (!selectedPolicy) return;
    
    setPopulation(previewPopulation);
    setHistory(prev => [...prev, {
      turn: currentTurn + 1,
      enactedPolicyId: selectedPolicy.id,
      enactedPolicyName: selectedPolicy.policyName,
      lsAverages: calculateAverages(previewPopulation)
    }]);
    
    const newUsed = new Set(usedPolicies);
    newUsed.add(selectedPolicy.id);
    setUsedPolicies(newUsed);
    setSelectedPolicy(null);

    if (currentTurn < totalTurns) {
      setCurrentTurn((prev) => prev + 1);
      setCurrentDeck(drawDeck(newUsed)); 
    } else {
      setShowElection(true);
    }
  };
  // #endregion

  const handleResetCycle = () => {
    const data = loadPopulation();
    setPopulation(data);
    setInitialPopulation(data);
    setCurrentTurn(1);
    setUsedPolicies(new Set());
    setCurrentDeck(drawDeck(new Set()));
    setHistory([{ turn: 1, enactedPolicyId: null, enactedPolicyName: 'Took Office', lsAverages: calculateAverages(data) }]);
    setShowElection(false);
  };

  const handleNextCycle = () => {
    const data = loadPopulation();
    setPopulation(data);
    setInitialPopulation(data);
    setCurrentTurn(1);
    
    // Determine the next cycle dynamically
    let nextCycle = ElectionCycle.Rawlsian;
    if (currentCycle === ElectionCycle.Benthamite) nextCycle = ElectionCycle.Rawlsian;
    else if (currentCycle === ElectionCycle.Rawlsian) nextCycle = ElectionCycle.SocietalUtility;
    else if (currentCycle === ElectionCycle.SocietalUtility) nextCycle = ElectionCycle.PersonalUtility;
    else nextCycle = ElectionCycle.Benthamite; // Loops back to start if won on final cycle
    
    setCurrentCycle(nextCycle);
    setUsedPolicies(new Set());
    setCurrentDeck(drawDeck(new Set()));
    setHistory([{ turn: 1, enactedPolicyId: null, enactedPolicyName: 'Took Office', lsAverages: calculateAverages(data) }]);
    setShowElection(false);
  };

  // #region Developer Tool Utilities
  const jumpToCycle = (cycle: ElectionCycle) => {
    const data = loadPopulation();
    setPopulation(data);
    setInitialPopulation(data);
    setCurrentTurn(1);
    setCurrentCycle(cycle);
    setUsedPolicies(new Set());
    setCurrentDeck(drawDeck(new Set()));
    setHistory([{ turn: 1, enactedPolicyId: null, enactedPolicyName: 'Took Office', lsAverages: calculateAverages(data) }]);
    setShowElection(false);
  };
  // #endregion

  // #region Main Render
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
            {/* Sliding Background Indicator */}
            <div 
              className="absolute top-0 bottom-0 left-0 bg-white rounded-md shadow-sm transition-all duration-300 ease-out"
              style={{
                // 3 gaps of 4px = 12px total gap space, divided by 4 tabs
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
          <p className="text-lg font-mono font-bold">{totalTurns - currentTurn + 1} Turns</p>
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
          />
        )}
        {activeTab === 'ministers' && <MinistersTab ministers={ministers} />}
        {activeTab === 'graphs' && (
          <GraphsTab
            setActiveTab={setActiveTab} 
            currentCycle={currentCycle} 
            currentChartData={currentChartData} 
            previewChartData={previewChartData} 
            currentHistogramData={currentHistogramData} 
            previewHistogramData={previewHistogramData} 
            currentMetricScore={currentMetricScore}
            initialMetricScore={initialMetricScore} 
          />
        )}
        {activeTab === 'electorate' && (
          <ElectorateTab 
            initialPopulation={initialPopulation}
            previewPopulation={previewPopulation}
            currentCycle={currentCycle}
          />
        )}
      </main>

      {/* --- MINI-MODALS & HISTORICAL CHART --- */}
      {selectedMinister && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-900/20 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedMinister(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border border-zinc-200 transform scale-100 transition-all" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${selectedMinister.color} border-4 border-white shadow-md text-3xl`}>
                 {selectedMinister.status === 'happy' ? '😊' : selectedMinister.status === 'neutral' ? '😐' : '😠'}
              </div>
              <div>
                <h4 className="font-bold text-zinc-800">Minister for {selectedMinister.name}</h4>
                <p className="text-xs uppercase tracking-widest text-zinc-400 font-bold">Status: {selectedMinister.status}</p>
              </div>
            </div>
            <p className="text-zinc-600 italic border-l-2 border-zinc-200 pl-4 py-1 mb-4">"{selectedMinister.quote}"</p>
            <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-100 text-sm">
               <span className="font-bold text-zinc-700">Trajectory (Since Turn 1): </span>
               <span className={`font-black ${selectedMinister.delta < -0.0001 ? 'text-red-500' : selectedMinister.delta > 0.0001 ? 'text-emerald-500' : 'text-zinc-500'}`}>
                 {selectedMinister.delta > 0.0001 ? '+' : ''}{(selectedMinister.delta * 100).toFixed(2)}%
               </span>
            </div>
            <button onClick={() => setSelectedMinister(null)} className="mt-4 w-full py-2 bg-zinc-100 text-zinc-600 font-bold rounded-lg hover:bg-zinc-200 transition-colors">Dismiss</button>
          </div>
        </div>
      )}

      {showElection && <ElectionModal currentMetricScore={currentMetricScore} currentCycle={currentCycle} onNextCycle={handleNextCycle} onReset={() => window.location.reload()} />}

      {selectedHistoryGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedHistoryGroup(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 border border-zinc-200 transform scale-100 transition-all" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-zinc-800">{selectedHistoryGroup.label}</h3>
                <p className="text-sm text-zinc-500 uppercase tracking-widest font-bold">Historical Life Satisfaction</p>
              </div>
              <button onClick={() => setSelectedHistoryGroup(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 transition-colors font-bold">✕</button>
            </div>
            <div className="w-full h-80 relative bg-zinc-50 rounded-lg border border-zinc-100 p-4">
              <svg className="w-full h-full overflow-visible">
                {[0, 2, 4, 6, 8, 10].map(y => (
                  <line key={y} x1="0%" y1={`${((10 - y) / 10) * 100}%`} x2="100%" y2={`${((10 - y) / 10) * 100}%`} stroke="#e4e4e7" strokeWidth="1" />
                ))}
                {history.map((h, i) => {
                  if (i === 0) return null;
                  const prev = history[i - 1];
                  const maxTurns = Math.max(20, history.length - 1);
                  // @ts-ignore
                  const prevLs = prev.lsAverages[selectedHistoryGroup.category][selectedHistoryGroup.key];
                  // @ts-ignore
                  const currentLs = h.lsAverages[selectedHistoryGroup.category][selectedHistoryGroup.key];
                  return (
                    <line key={`line-${i}`} x1={`${(prev.turn / maxTurns) * 100}%`} y1={`${((10 - prevLs) / 10) * 100}%`} x2={`${(h.turn / maxTurns) * 100}%`} y2={`${((10 - currentLs) / 10) * 100}%`} stroke="#ec4899" strokeWidth="3" strokeLinecap="round" />
                  );
                })}
                {history.map((h, i) => {
                  const maxTurns = Math.max(20, history.length - 1);
                  // @ts-ignore
                  const ls = h.lsAverages[selectedHistoryGroup.category][selectedHistoryGroup.key];
                  const xPos = `${(h.turn / maxTurns) * 100}%`;
                  const yPos = `${((10 - ls) / 10) * 100}%`;
                  return (
                    <g key={`point-${i}`} className="group/point cursor-crosshair">
                      <circle cx={xPos} cy={yPos} r="5" fill="#ffffff" stroke="#ec4899" strokeWidth="2" className="group-hover/point:stroke-[#be185d] transition-colors" />
                      <svg x={xPos} y={yPos} className="opacity-0 group-hover/point:opacity-100 transition-opacity pointer-events-none z-50 overflow-visible">
                        <g transform={`translate(${h.turn > 15 ? -100 : h.turn < 5 ? 10 : -50}, -60)`}>
                           <rect x="0" y="0" width="100" height="45" rx="4" fill="#27272a" className="shadow-lg" />
                           <text x="50" y="14" fill="#ffffff" fontSize="10" textAnchor="middle" fontWeight="bold">Turn {h.turn}</text>
                           <text x="50" y="26" fill="#a1a1aa" fontSize="9" textAnchor="middle">Avg LS: {ls.toFixed(2)}</text>
                           {h.enactedPolicyName && <text x="50" y="38" fill="#f472b6" fontSize="8" textAnchor="middle">"{h.enactedPolicyName}"</text>}
                        </g>
                      </svg>
                    </g>
                  );
                })}
              </svg>
              <div className="absolute left-0 top-4 bottom-4 w-6 flex flex-col justify-between items-end pr-2 pointer-events-none text-[9px] font-bold text-zinc-400">
                <span>10</span><span>8</span><span>6</span><span>4</span><span>2</span><span>0</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- DEV CONTROLS UI --- */}
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
              <button onClick={() => jumpToCycle(ElectionCycle.SocietalUtility)} className="bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg text-xs font-bold transition-colors">3. Societal</button>
              <button onClick={() => jumpToCycle(ElectionCycle.PersonalUtility)} className="bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg text-xs font-bold transition-colors">4. Personal</button>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest px-2">Time Controls</span>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setCurrentTurn(prev => Math.min(totalTurns, prev + 1))} className="bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg text-xs font-bold transition-colors">Skip 1 Turn</button>
              <button onClick={() => setCurrentTurn(totalTurns)} className="bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg text-xs font-bold transition-colors">Jump to End</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
  // #endregion
}