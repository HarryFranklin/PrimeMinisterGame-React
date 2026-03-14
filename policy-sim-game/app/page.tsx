"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Respondent, AxisVariable, Policy, ElectionCycle, TurnHistory, DemographicAverages } from "./utils/types";
import { loadPopulation } from "./utils/dataLoader";
import { WelfareMetrics } from "./utils/WelfareMetrics";
import { availablePolicies } from "./data/policies";
import { PolicyEngine } from "./utils/PolicyEngine";
import D3Chart from "./components/D3Chart";
import ElectionModal from "./components/ElectionModal";

const totalTurns = 20;

// Helper to extract averages at a given point in time
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
    },
    traits: {
      students: getAvg(r => r.demographics.isStudent),
      parents: getAvg(r => r.demographics.isParent),
      commuters: getAvg(r => r.demographics.isCommuter),
      environmentalists: getAvg(r => r.demographics.isEnvironmentalist)
    }
  };
};

const GRAPH_PRESETS = [
  { label: 'Custom', plotType: '1D', xAxis: AxisVariable.LifeSatisfaction, yAxis: AxisVariable.PersonalUtility }, 
  { label: 'Life Satisfaction Distribution', plotType: '1D', xAxis: AxisVariable.LifeSatisfaction, yAxis: AxisVariable.PersonalUtility },
  { label: 'Personal Utility vs LS', plotType: '2D', xAxis: AxisVariable.LifeSatisfaction, yAxis: AxisVariable.PersonalUtility },
  { label: 'Societal Fairness vs LS', plotType: '2D', xAxis: AxisVariable.LifeSatisfaction, yAxis: AxisVariable.SocietalFairness }
];

export default function Home() {
  const [population, setPopulation] = useState<Respondent[]>([]);
  const [initialPopulation, setInitialPopulation] = useState<Respondent[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);

  const [currentTurn, setCurrentTurn] = useState(1);
  const [politicalCapital, setPoliticalCapital] = useState(40);
  
  const [currentCycle, setCurrentCycle] = useState<ElectionCycle>(ElectionCycle.Utilitarian);
  const [showElection, setShowElection] = useState(false);

  // --- History State ---
  const [history, setHistory] = useState<TurnHistory[]>([]);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'demographics' | 'ministers' | 'graphs'>('dashboard');
  const [selectedMinister, setSelectedMinister] = useState<any | null>(null);

  const [usedPolicies, setUsedPolicies] = useState<Set<string>>(new Set());
  const [currentDeck, setCurrentDeck] = useState<Policy[]>([]);

  // --- INDEPENDENT GRAPH STATES ---
  const [g1Preset, setG1Preset] = useState<string>('Life Satisfaction Distribution');
  const [g1PlotType, setG1PlotType] = useState<'1D' | '2D'>('1D');
  const [g1XAxis, setG1XAxis] = useState<AxisVariable>(AxisVariable.LifeSatisfaction);
  const [g1YAxis, setG1YAxis] = useState<AxisVariable>(AxisVariable.PersonalUtility);

  const [g2Preset, setG2Preset] = useState<string>('Personal Utility vs LS');
  const [g2PlotType, setG2PlotType] = useState<'1D' | '2D'>('2D');
  const [g2XAxis, setG2XAxis] = useState<AxisVariable>(AxisVariable.LifeSatisfaction);
  const [g2YAxis, setG2YAxis] = useState<AxisVariable>(AxisVariable.PersonalUtility);

  // Handlers to link presets and custom fallbacks
  const handleG1Change = (type: 'preset'|'plot'|'x'|'y', val: any) => {
    if (type === 'preset') {
      setG1Preset(val);
      const preset = GRAPH_PRESETS.find(p => p.label === val);
      if (preset && val !== 'Custom') {
        setG1PlotType(preset.plotType as any);
        setG1XAxis(preset.xAxis);
        setG1YAxis(preset.yAxis);
      }
    } else {
      setG1Preset('Custom');
      if (type === 'plot') setG1PlotType(val);
      if (type === 'x') setG1XAxis(val);
      if (type === 'y') setG1YAxis(val);
    }
  };

  const handleG2Change = (type: 'preset'|'plot'|'x'|'y', val: any) => {
    if (type === 'preset') {
      setG2Preset(val);
      const preset = GRAPH_PRESETS.find(p => p.label === val);
      if (preset && val !== 'Custom') {
        setG2PlotType(preset.plotType as any);
        setG2XAxis(preset.xAxis);
        setG2YAxis(preset.yAxis);
      }
    } else {
      setG2Preset('Custom');
      if (type === 'plot') setG2PlotType(val);
      if (type === 'x') setG2XAxis(val);
      if (type === 'y') setG2YAxis(val);
    }
  };

  const drawDeck = useCallback((used: Set<string>) => {
    let available = availablePolicies.filter(p => !used.has(p.id));
    if (available.length < 4) {
      available = availablePolicies;
      setUsedPolicies(new Set()); 
    }

    const austerity = available.filter(p => p.politicalCost < 0);
    const low = available.filter(p => p.politicalCost >= 0 && p.politicalCost <= 10);
    const med = available.filter(p => p.politicalCost > 10 && p.politicalCost <= 15);
    const high = available.filter(p => p.politicalCost > 15);

    // Pick random policies and add to deck
    const pickRandom = (arr: Policy[]) => arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null;

    const deck: Policy[] = [];
    const add = (p: Policy | null) => { if (p && !deck.find(d => d.id === p.id)) deck.push(p); };

    // Pick austerity, low, med and high policies
    add(pickRandom(austerity));
    add(pickRandom(low));
    add(pickRandom(med));
    add(pickRandom(high));

    while (deck.length < 4 && available.length > deck.length) {
      add(pickRandom(available));
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

  const previewPopulation = useMemo(() => {
    if (!selectedPolicy) return population;
    return PolicyEngine.applyPolicy(population, selectedPolicy);
  }, [population, selectedPolicy]);

  // --- DATA FOR MAIN DASHBOARD ---
  const dashboardChartData = useMemo(() => {
    if (previewPopulation.length === 0) return [];
    const allLS = previewPopulation.map(p => p.currentLS);
    return previewPopulation.map((r) => {
      const yValue = currentCycle === ElectionCycle.Utilitarian 
        ? WelfareMetrics.getUtilityForPerson(r.currentLS, r.personalUtilities)
        : WelfareMetrics.evaluateDistribution(allLS, r.societalUtilities);
      return { id: r.id, x: r.currentLS, y: yValue };
    });
  }, [previewPopulation, currentCycle]);

  const dashboardHistogramData = useMemo(() => {
    if (previewPopulation.length === 0) return [];
    const bins = Array(11).fill(0).map((_, i) => ({ name: i, count: 0 }));
    previewPopulation.forEach((r) => {
      let binIndex = Math.round(r.currentLS);
      binIndex = Math.max(0, Math.min(binIndex, 10));
      if(bins[binIndex]) bins[binIndex].count++;
    });
    return bins;
  }, [previewPopulation]);

  // --- DATA GENERATION FOR GRAPHS TAB ---
  const getAxisValue = useCallback((r: Respondent, axis: AxisVariable, allLS: number[]) => {
    if (axis === AxisVariable.LifeSatisfaction) return r.currentLS;
    if (axis === AxisVariable.PersonalUtility) return WelfareMetrics.getUtilityForPerson(r.currentLS, r.personalUtilities);
    if (axis === AxisVariable.SocietalFairness) return WelfareMetrics.evaluateDistribution(allLS, r.societalUtilities);
    return 0;
  }, []);

  const generateChartData = useCallback((xAxis: AxisVariable, yAxis: AxisVariable) => {
    if (previewPopulation.length === 0) return [];
    const allLS = previewPopulation.map(p => p.currentLS);
    return previewPopulation.map((r) => ({
      id: r.id,
      x: getAxisValue(r, xAxis, allLS),
      y: getAxisValue(r, yAxis, allLS)
    }));
  }, [previewPopulation, getAxisValue]);

  const generateHistogramData = useCallback((xAxis: AxisVariable) => {
    if (previewPopulation.length === 0) return [];
    const allLS = previewPopulation.map(p => p.currentLS);
    const isLS = xAxis === AxisVariable.LifeSatisfaction;
    const bins = Array(11).fill(0).map((_, i) => ({
      name: isLS ? i : (i / 10).toFixed(1),
      count: 0
    }));

    previewPopulation.forEach((r) => {
      let val = getAxisValue(r, xAxis, allLS);
      let binIndex = isLS ? Math.round(val) : Math.round(val * 10);
      binIndex = Math.max(0, Math.min(binIndex, 10));
      if (bins[binIndex]) bins[binIndex].count++;
    });
    return bins;
  }, [previewPopulation, getAxisValue]);

  // 2 Graphs that are shown
  const g1ChartData = useMemo(() => generateChartData(g1XAxis, g1YAxis), [generateChartData, g1XAxis, g1YAxis]);
  const g1HistogramData = useMemo(() => generateHistogramData(g1XAxis), [generateHistogramData, g1XAxis]);
  
  const g2ChartData = useMemo(() => generateChartData(g2XAxis, g2YAxis), [generateChartData, g2XAxis, g2YAxis]);
  const g2HistogramData = useMemo(() => generateHistogramData(g2XAxis), [generateHistogramData, g2XAxis]);

  // --- APPROVAL & DEMOGRAPHICS ---
  const currentApproval = useMemo(() => {
    if (previewPopulation.length === 0 || initialPopulation.length === 0) return 0;
    const allInitialLS = initialPopulation.map(p => p.currentLS);
    const allPreviewLS = previewPopulation.map(p => p.currentLS);

    let approvingVoters = 0;

    previewPopulation.forEach((r, i) => {
      let initialUtil = 0;
      let currentUtil = 0;

      if (currentCycle === ElectionCycle.Utilitarian) {
        initialUtil = WelfareMetrics.getUtilityForPerson(initialPopulation[i].currentLS, r.personalUtilities);
        currentUtil = WelfareMetrics.getUtilityForPerson(r.currentLS, r.personalUtilities);
      } else {
        initialUtil = WelfareMetrics.evaluateDistribution(allInitialLS, r.societalUtilities);
        currentUtil = WelfareMetrics.evaluateDistribution(allPreviewLS, r.societalUtilities);
      }

      const delta = currentUtil - initialUtil;
      const multiplier = delta < 0 ? 2.5 : 1.2;
      const perceivedScore = currentUtil + (delta * multiplier);

      if (perceivedScore >= 0.65) {
        approvingVoters++;
      }
    });

    return (approvingVoters / previewPopulation.length) * 100;
  }, [initialPopulation, previewPopulation, currentCycle]);

  const ministers = useMemo(() => {
    if (initialPopulation.length === 0 || previewPopulation.length === 0) return [];
    
    const allInitialLS = initialPopulation.map(p => p.currentLS);
    const allCurrentLS = population.map(p => p.currentLS);
    const allPreviewLS = previewPopulation.map(p => p.currentLS);

    const getGroupUtility = (pop: Respondent[], allLS: number[], filterFn: (r: Respondent) => boolean) => {
      const group = pop.filter(filterFn);
      if (group.length === 0) return 0;
      const total = group.reduce((sum, r) => {
        if (currentCycle === ElectionCycle.Utilitarian) {
          return sum + WelfareMetrics.getUtilityForPerson(r.currentLS, r.personalUtilities);
        } else {
          return sum + WelfareMetrics.evaluateDistribution(allLS, r.societalUtilities);
        }
      }, 0);
      return total / group.length;
    };

    const getStatus = (score: number, ministerName: string): 'happy' | 'neutral' | 'angry' => {
      let happyThreshold = 0.85;
      let neutralThreshold = 0.70;
      
      // Different thresholds for equality and environment
      if (ministerName === "Equality" || ministerName === "Environment") {
        happyThreshold = 0.88;
        neutralThreshold = 0.75;
      }

      if (score >= happyThreshold) return 'happy';
      if (score >= neutralThreshold) return 'neutral';
      return 'angry';
    };

    const evaluateMinister = (name: string, filterFn: (r: Respondent) => boolean) => {
      const baseScore = getGroupUtility(initialPopulation, allInitialLS, filterFn);
      const projScore = getGroupUtility(previewPopulation, allPreviewLS, filterFn);
      
      const delta = projScore - baseScore; 
      const lossAversionMultiplier = delta < 0 ? 2.5 : 1.2;
      const perceivedScore = projScore + (delta * lossAversionMultiplier);
      
      const currentStatus = getStatus(perceivedScore, name);
      
      let supportLevel = 'neutral';
      const prePolicyScore = getGroupUtility(population, allCurrentLS, filterFn);
      const policyDelta = projScore - prePolicyScore;
      
      // Threshold for deltas
      if (policyDelta > 0.005) supportLevel = 'supports';
      if (policyDelta < -0.005) supportLevel = 'opposes';

      // Create response strings based on status
      let dynamicQuote = "";
      if (currentStatus === 'happy') {
        dynamicQuote = `${name} demographics are highly satisfied with our trajectory.`;
      } else if (currentStatus === 'neutral') {
        dynamicQuote = delta < -0.01 
          ? `${name} demographics are stable, but frustrated by recent losses.`
          : `${name} demographics are relatively stable, but watching closely.`;
      } else { 
        if (delta < -0.001) {
          dynamicQuote = `"We are worse off than when you started!" - The ${name} demographic.`;
        } else if (delta > 0.001) {
          dynamicQuote = `"Any progress is too slow. The ${name} demographic demands radical action!"`;
        } else {
          dynamicQuote = `"We are suffering from systemic neglect. We need immediate support."`;
        }
      }

      // FIX: Upgraded colours to solid bold values so they jump out clearly
      return {
        name,
        status: currentStatus,
        color: currentStatus === 'happy' ? "bg-emerald-500 text-white shadow-emerald-200" : currentStatus === 'neutral' ? "bg-amber-400 text-white shadow-amber-200" : "bg-rose-500 text-white shadow-rose-200",
        supportLevel,
        delta: delta,
        policyDelta: policyDelta, 
        baseScore,
        projScore,
        quote: dynamicQuote
      };
    };

    return [
      evaluateMinister("Economy", r => r.demographics.wealth === 'Middle' || r.demographics.wealth === 'Wealthy'),
      evaluateMinister("Equality", r => r.demographics.wealth === 'Poor'),
      evaluateMinister("Youth", r => r.demographics.age === 'Youth' || r.demographics.isStudent || r.demographics.isParent),
      evaluateMinister("Health", r => r.demographics.age === 'Elderly' || r.currentLS < 4),
      evaluateMinister("Environment", r => r.demographics.isEnvironmentalist),
      evaluateMinister("Transport", r => r.demographics.isCommuter)
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
      traits: { students: getStat(r => r.demographics.isStudent), parents: getStat(r => r.demographics.isParent), commuters: getStat(r => r.demographics.isCommuter), environmentalists: getStat(r => r.demographics.isEnvironmentalist) }
    };
  }, []);

  const demoStats = useMemo(() => getDemoStats(previewPopulation), [previewPopulation, getDemoStats]);
  const initialDemoStats = useMemo(() => getDemoStats(initialPopulation), [initialPopulation, getDemoStats]);

  const handleApplyPolicy = () => {
    if (!selectedPolicy) return;
    if (politicalCapital < selectedPolicy.politicalCost) {
      alert("Not enough Political Capital!");
      return;
    }

    setPoliticalCapital((prev) => prev - selectedPolicy.politicalCost);
    
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

  const handleResetCycle = () => {
    const data = loadPopulation();
    setPopulation(data);
    setInitialPopulation(data);
    setCurrentTurn(1);
    setPoliticalCapital(40);
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
    setPoliticalCapital(40);
    setCurrentCycle(ElectionCycle.Empathetic);
    setUsedPolicies(new Set());
    setCurrentDeck(drawDeck(new Set()));
    setHistory([{ turn: 1, enactedPolicyId: null, enactedPolicyName: 'Took Office', lsAverages: calculateAverages(data) }]);
    setShowElection(false);
  };

  // --- TAB NAVIGATION HELPERS ---
  const tabs = ['dashboard', 'demographics', 'ministers', 'graphs'];
  const activeTabIndex = tabs.indexOf(activeTab);

  // #region VISUALS
  return (
    <div className="flex flex-col h-screen bg-zinc-50 font-sans text-zinc-900 overflow-hidden relative">
      
      {/* TOP NAVIGATION BAR */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex justify-between items-center shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-8">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-800 leading-tight">Policy Simulator</h1>
            <p className="text-xs font-bold text-pink-600 uppercase tracking-widest">
              {currentCycle === ElectionCycle.Utilitarian ? "Cycle 1: Utilitarian" : "Cycle 2: Empathetic"}
            </p>
          </div>
          
          <nav className="relative flex gap-1 bg-zinc-100 p-1 rounded-lg border border-zinc-200">
            <div 
              className="absolute top-1 bottom-1 w-32 bg-white rounded-md shadow-sm transition-transform duration-300 ease-out"
              style={{ transform: `translateX(calc(${activeTabIndex * 100}% + ${activeTabIndex * 4}px))` }}
            />
            {tabs.map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`relative z-10 w-32 py-1.5 text-xs font-bold uppercase rounded-md transition-colors duration-300 ${
                  activeTab === tab ? 'text-pink-600' : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs font-bold uppercase text-zinc-400">Time to Election</p>
            <p className="text-lg font-mono font-bold text-zinc-700">Turn {currentTurn} / {totalTurns}</p>
          </div>
          <div className="w-px h-8 bg-zinc-200" />
          <div className="text-right">
            <p className="text-xs font-bold uppercase text-zinc-400">Pol. Capital</p>
            <p className={`text-xl font-black ${politicalCapital < 10 ? 'text-red-600' : 'text-pink-600'}`}>
              {politicalCapital}
            </p>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-hidden p-6 flex flex-col">
        
        {/* VIEW 1: DEMOGRAPHICS */}
        {activeTab === 'demographics' && demoStats && initialDemoStats && (
          <div className="h-full flex flex-col gap-6 animate-in fade-in duration-300 min-h-0">
            <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-bold text-zinc-800">National Demographics</h2>
                <p className="text-sm text-zinc-500">Breakdown of the electorate and their current average Life Satisfaction (LS).</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Total Population</p>
                <p className="text-3xl font-black text-pink-600">{demoStats.total.toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
              {/* WEALTH DISTRIBUTION (With Ghost Bars) */}
              <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col">
                <div className="flex justify-between items-end mb-6 shrink-0">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-800">Wealth Distribution</h3>
                  <p className="text-[10px] font-bold uppercase text-zinc-400">Compared to the start of your term</p>                
                </div>
                <div className="flex-1 space-y-6 flex flex-col justify-center">
                  {[
                    { label: 'Wealthy (Top 10%)', key: 'wealthy', data: demoStats.wealth.wealthy, initData: initialDemoStats.wealth.wealthy, color: 'bg-emerald-500' },
                    { label: 'Middle Class', key: 'middle', data: demoStats.wealth.middle, initData: initialDemoStats.wealth.middle, color: 'bg-blue-500' },
                    { label: 'Poor (Relative Poverty)', key: 'poor', data: demoStats.wealth.poor, initData: initialDemoStats.wealth.poor, color: 'bg-red-500' }
                  ].map((item, i) => (
                    <div 
                      key={i}
                      // FIX: Made wealth items clickable to display in history graph
                      onClick={() => currentTurn >= 5 ? setSelectedHistoryGroup({ label: item.label, category: 'wealth', key: item.key }) : null}
                      className={`group p-2 -mx-2 rounded-lg transition-colors relative ${currentTurn >= 5 ? 'hover:bg-zinc-50 cursor-pointer' : 'cursor-not-allowed'}`}
                    >
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-zinc-400 text-xs transition-opacity" title={currentTurn < 5 ? "Unlocks after Turn 5" : "View History"}>
                        {currentTurn >= 5 ? '⤢' : '🔒'}
                      </div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className={`font-bold text-zinc-700 transition-colors ${currentTurn >= 5 ? 'group-hover:text-pink-600' : ''}`}>{item.label}</span>
                        <span className="text-zinc-500 mr-4">Avg LS: <strong className="text-zinc-800">{item.data.ls}</strong></span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="relative flex-1 h-3 bg-zinc-100 rounded-full overflow-hidden">
                          <div className={`absolute top-0 left-0 h-full ${item.color} opacity-30`} style={{ width: `${item.initData.pct}%` }} />
                          <div className={`absolute top-0 left-0 h-full ${item.color} shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)]`} style={{ width: `${item.data.pct}%` }} />
                        </div>
                        <span className="text-xs font-bold w-12 text-right mr-4">{item.data.pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* AGE DISTRIBUTION (Clickable) */}
              <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-800 mb-6 shrink-0">Age Distribution (18+)</h3>
                <div className="flex-1 space-y-4 flex flex-col justify-center">
                  {[
                    { label: 'Elderly (65+)', key: 'elderly', data: demoStats.age.elderly, color: 'bg-indigo-500' },
                    { label: 'Adults (30-64)', key: 'adult', data: demoStats.age.adult, color: 'bg-violet-500' },
                    { label: 'Youth (18-29)', key: 'youth', data: demoStats.age.youth, color: 'bg-fuchsia-500' }
                  ].map((item, i) => (
                    <div 
                      key={i} 
                      onClick={() => currentTurn >= 5 ? setSelectedHistoryGroup({ label: item.label, category: 'age', key: item.key }) : null}
                      className={`group p-2 -mx-2 rounded-lg transition-colors relative ${currentTurn >= 5 ? 'hover:bg-zinc-50 cursor-pointer' : 'cursor-not-allowed'}`}
                    >
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-zinc-400 text-xs transition-opacity" title={currentTurn < 5 ? "Unlocks after Turn 5" : "View History"}>
                        {currentTurn >= 5 ? '⤢' : '🔒'}
                      </div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className={`font-bold text-zinc-700 transition-colors ${currentTurn >= 5 ? 'group-hover:text-pink-600' : ''}`}>{item.label}</span>
                        <span className="text-zinc-500 mr-4">Avg LS: <strong className="text-zinc-800">{item.data.ls}</strong></span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-3 bg-zinc-100 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color}`} style={{ width: `${item.data.pct}%` }} />
                        </div>
                        <span className="text-xs font-bold w-12 text-right mr-4">{item.data.pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* KEY VOTING BLOCKS (Clickable) */}
            <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm shrink-0">
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-800 mb-6">Key Voting Blocks</h3>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Commuters', key: 'commuters', data: demoStats.traits.commuters, icon: '🚗' },
                  { label: 'Parents', key: 'parents', data: demoStats.traits.parents, icon: '👨‍👩‍👧' },
                  { label: 'Environmentalists', key: 'environmentalists', data: demoStats.traits.environmentalists, icon: '🌱' },
                  { label: 'Students', key: 'students', data: demoStats.traits.students, icon: '🎓' }
                ].map((item, i) => (
                  <div 
                    key={i} 
                    onClick={() => currentTurn >= 5 ? setSelectedHistoryGroup({ label: item.label, category: 'traits', key: item.key }) : null}
                    className={`p-4 bg-zinc-50 rounded-lg border border-zinc-100 flex flex-col items-center text-center justify-center transition-all group relative ${currentTurn >= 5 ? 'cursor-pointer hover:border-pink-300 hover:shadow-md hover:bg-white' : 'cursor-not-allowed opacity-90'}`}
                  >
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-zinc-400 text-xs transition-opacity" title={currentTurn < 5 ? "Unlocks after Turn 5" : "View History"}>
                      {currentTurn >= 5 ? '⤢' : '🔒'}
                    </div>
                    <span className={`text-2xl mb-2 transition-transform ${currentTurn >= 5 ? 'group-hover:scale-110' : ''}`}>{item.icon}</span>
                    <span className={`text-xs font-bold uppercase tracking-wider text-zinc-500 transition-colors ${currentTurn >= 5 ? 'group-hover:text-pink-600' : ''}`}>{item.label}</span>
                    <span className="text-2xl font-black text-zinc-800 my-1">{item.data.pct}%</span>
                    <span className="text-xs text-zinc-500">Avg LS: <strong className="text-pink-600">{item.data.ls}</strong></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: THE MINISTERS TAB */}
        {activeTab === 'ministers' && (
          <div className="h-full flex flex-col gap-6 animate-in fade-in duration-300 min-h-0">
             <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-zinc-800">The Cabinet Room</h2>
                  <p className="text-sm text-zinc-500">Detailed breakdown of ministerial approval and underlying demographic utility.</p>
                </div>
             </div>

             <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                {ministers.map((m, i) => (
                   <div key={i} className="bg-white p-4 lg:p-5 rounded-xl border border-zinc-200 shadow-sm flex flex-col h-full overflow-hidden">
                      <div className="flex items-center gap-4 mb-4 shrink-0">
                        {/* FIX: Larger, solid color faces for Ministers */}
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${m.color} border-4 border-white shadow-md text-3xl shrink-0`}>
                           {m.status === 'happy' && '😊'}
                           {m.status === 'neutral' && '😐'}
                           {m.status === 'angry' && '😠'}
                        </div>
                        <div>
                          {/* Changed Min. to Minister */}
                          <h4 className="font-bold text-zinc-800 text-lg">Minister for {m.name}</h4>
                          <p className="text-xs uppercase tracking-widest text-zinc-400 font-bold">
                            Status: <span className={m.status === 'angry' ? 'text-red-500' : ''}>{m.status}</span>
                          </p>
                        </div>
                      </div>
                      
                      <p className="text-zinc-600 text-sm italic border-l-2 border-zinc-200 pl-3 py-1 mb-4 line-clamp-3">
                        "{m.quote}"
                      </p>

                      <div className="bg-zinc-50 rounded-lg border border-zinc-100 p-4 space-y-2 text-sm shrink-0 mt-auto">
                         <div className="flex justify-between">
                           <span className="text-zinc-500">Base Utility (Turn 1):</span>
                           <span className="font-mono text-zinc-700">{m.baseScore.toFixed(3)}</span>
                         </div>
                         <div className="flex justify-between">
                           <span className="text-zinc-500">Current Utility:</span>
                           <span className="font-mono text-zinc-700">{m.projScore.toFixed(3)}</span>
                         </div>
                         <div className="w-full h-px bg-zinc-200 my-1" />
                         <div className="flex justify-between items-center">
                           <span className="font-bold text-zinc-700">Trajectory (Since Turn 1):</span>
                           <span className={`font-black ${m.delta < -0.0001 ? 'text-red-500' : m.delta > 0.0001 ? 'text-emerald-500' : 'text-zinc-500'}`}>
                             {m.delta > 0.0001 ? '+' : ''}{(m.delta * 100).toFixed(2)}%
                           </span>
                         </div>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        )}

        {/* VIEW 3: GRAPHS TAB (SIDE-BY-SIDE) */}
        {activeTab === 'graphs' && (
          <div className="flex gap-6 h-full w-full animate-in fade-in duration-300 overflow-hidden">
             
             {/* GRAPH 1 (Left) */}
             <div className="flex-1 bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col min-w-0">
                {/* TOP: Preset Configuration */}
                <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center shrink-0">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-800">Primary Visualisation</h3>
                  <select 
                    value={g1Preset} 
                    onChange={(e) => handleG1Change('preset', e.target.value)} 
                    className={`bg-white border rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-pink-500 cursor-pointer shadow-sm ${g1Preset === 'Custom' ? 'border-amber-400 text-amber-700' : 'border-zinc-200 text-zinc-700'}`}
                  >
                    {GRAPH_PRESETS.map(p => (
                      <option key={p.label} value={p.label}>{p.label}</option>
                    ))}
                  </select>
                </div>

                {/* MIDDLE: Graph Container */}
                <div className="flex-1 p-4 min-h-0 relative">
                  <D3Chart plotType={g1PlotType} chartData={g1ChartData} histogramData={g1HistogramData} xAxisType={g1XAxis} yAxisType={g1YAxis} />
                </div>

                {/* BOTTOM: Manual Controls (Fallback to Custom) */}
                <div className="p-3 border-t border-zinc-100 bg-zinc-50 flex gap-3 items-center shrink-0 flex-wrap justify-center">
                  <select 
                    value={g1PlotType} 
                    onChange={(e) => handleG1Change('plot', e.target.value)} 
                    className="bg-white border border-zinc-200 rounded px-2 py-1 text-xs font-bold text-zinc-600 focus:outline-none focus:border-pink-500 cursor-pointer"
                  >
                    <option value="1D">1D Histogram</option>
                    <option value="2D">2D Scatter</option>
                  </select>
                  <div className="w-px h-4 bg-zinc-300" />
                  <span className="text-[10px] font-bold uppercase text-zinc-400">X-Axis:</span>
                  <select 
                    value={g1XAxis} 
                    onChange={(e) => handleG1Change('x', Number(e.target.value))} 
                    className="bg-white border border-zinc-200 rounded px-2 py-1 text-xs font-medium text-zinc-600 focus:outline-none focus:border-pink-500 cursor-pointer"
                  >
                    <option value={AxisVariable.LifeSatisfaction}>Life Satisfaction</option>
                    <option value={AxisVariable.PersonalUtility}>Personal Utility</option>
                    <option value={AxisVariable.SocietalFairness}>Societal Fairness</option>
                  </select>
                  {g1PlotType === '2D' && (
                    <>
                      <div className="w-px h-4 bg-zinc-300" />
                      <span className="text-[10px] font-bold uppercase text-zinc-400">Y-Axis:</span>
                      <select 
                        value={g1YAxis} 
                        onChange={(e) => handleG1Change('y', Number(e.target.value))} 
                        className="bg-white border border-zinc-200 rounded px-2 py-1 text-xs font-medium text-zinc-600 focus:outline-none focus:border-pink-500 cursor-pointer"
                      >
                        <option value={AxisVariable.LifeSatisfaction}>Life Satisfaction</option>
                        <option value={AxisVariable.PersonalUtility}>Personal Utility</option>
                        <option value={AxisVariable.SocietalFairness}>Societal Fairness</option>
                      </select>
                    </>
                  )}
                </div>
             </div>

             {/* GRAPH 2 (Right) */}
             <div className="flex-1 bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col min-w-0">
                {/* TOP: Preset Configuration */}
                <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 flex justify-between items-center shrink-0">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-800">Secondary Visualisation</h3>
                  <select 
                    value={g2Preset} 
                    onChange={(e) => handleG2Change('preset', e.target.value)} 
                    className={`bg-white border rounded-lg px-3 py-1.5 text-xs font-bold focus:outline-none focus:border-pink-500 cursor-pointer shadow-sm ${g2Preset === 'Custom' ? 'border-amber-400 text-amber-700' : 'border-zinc-200 text-zinc-700'}`}
                  >
                    {GRAPH_PRESETS.map(p => (
                      <option key={p.label} value={p.label}>{p.label}</option>
                    ))}
                  </select>
                </div>

                {/* MIDDLE: Graph Container */}
                <div className="flex-1 p-4 min-h-0 relative">
                  <D3Chart plotType={g2PlotType} chartData={g2ChartData} histogramData={g2HistogramData} xAxisType={g2XAxis} yAxisType={g2YAxis} />
                </div>

                {/* BOTTOM: Manual Controls (Fallback to Custom) */}
                <div className="p-3 border-t border-zinc-100 bg-zinc-50 flex gap-3 items-center shrink-0 flex-wrap justify-center">
                  <select 
                    value={g2PlotType} 
                    onChange={(e) => handleG2Change('plot', e.target.value)} 
                    className="bg-white border border-zinc-200 rounded px-2 py-1 text-xs font-bold text-zinc-600 focus:outline-none focus:border-pink-500 cursor-pointer"
                  >
                    <option value="1D">1D Histogram</option>
                    <option value="2D">2D Scatter</option>
                  </select>
                  <div className="w-px h-4 bg-zinc-300" />
                  <span className="text-[10px] font-bold uppercase text-zinc-400">X-Axis:</span>
                  <select 
                    value={g2XAxis} 
                    onChange={(e) => handleG2Change('x', Number(e.target.value))} 
                    className="bg-white border border-zinc-200 rounded px-2 py-1 text-xs font-medium text-zinc-600 focus:outline-none focus:border-pink-500 cursor-pointer"
                  >
                    <option value={AxisVariable.LifeSatisfaction}>Life Satisfaction</option>
                    <option value={AxisVariable.PersonalUtility}>Personal Utility</option>
                    <option value={AxisVariable.SocietalFairness}>Societal Fairness</option>
                  </select>
                  {g2PlotType === '2D' && (
                    <>
                      <div className="w-px h-4 bg-zinc-300" />
                      <span className="text-[10px] font-bold uppercase text-zinc-400">Y-Axis:</span>
                      <select 
                        value={g2YAxis} 
                        onChange={(e) => handleG2Change('y', Number(e.target.value))} 
                        className="bg-white border border-zinc-200 rounded px-2 py-1 text-xs font-medium text-zinc-600 focus:outline-none focus:border-pink-500 cursor-pointer"
                      >
                        <option value={AxisVariable.LifeSatisfaction}>Life Satisfaction</option>
                        <option value={AxisVariable.PersonalUtility}>Personal Utility</option>
                        <option value={AxisVariable.SocietalFairness}>Societal Fairness</option>
                      </select>
                    </>
                  )}
                </div>
             </div>

          </div>
        )}

        {/* VIEW 4: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-12 gap-6 h-full min-h-0 animate-in fade-in duration-300">
            
            <div className="col-span-4 flex flex-col gap-6 h-full min-h-0">
              <div onClick={() => setActiveTab('graphs')} className="bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col flex-1 min-h-0 cursor-pointer hover:border-zinc-300 hover:shadow-md transition-all group">
                <div className="p-3 border-b border-zinc-100 bg-zinc-50/50 rounded-t-xl flex justify-between items-center shrink-0 group-hover:bg-zinc-100/50 transition-colors">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 group-hover:text-pink-600 transition-colors">Life Satisfaction Distribution</h3>
                  <span className="text-zinc-300 group-hover:text-pink-500 font-bold text-lg leading-none">↗</span>
                </div>
                <div className="flex-1 p-2 min-h-0">
                  <D3Chart plotType="1D" chartData={dashboardChartData} histogramData={dashboardHistogramData} xAxisType={AxisVariable.LifeSatisfaction} yAxisType={AxisVariable.PersonalUtility} />
                </div>
              </div>

              <div onClick={() => setActiveTab('graphs')} className="bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col flex-1 min-h-0 cursor-pointer hover:border-zinc-300 hover:shadow-md transition-all group">
                <div className="p-3 border-b border-zinc-100 bg-zinc-50/50 rounded-t-xl flex justify-between items-center shrink-0 group-hover:bg-zinc-100/50 transition-colors">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 group-hover:text-pink-600 transition-colors">
                    {currentCycle === ElectionCycle.Utilitarian ? "Personal Utility Scatter" : "Societal Fairness Scatter"}
                  </h3>
                  <span className="text-zinc-300 group-hover:text-pink-500 font-bold text-lg leading-none">↗</span>
                </div>
                <div className="flex-1 p-2 min-h-0">
                  <D3Chart plotType="2D" chartData={dashboardChartData} xAxisType={AxisVariable.LifeSatisfaction} yAxisType={currentCycle === ElectionCycle.Utilitarian ? AxisVariable.PersonalUtility : AxisVariable.SocietalFairness} />
                </div>
              </div>
            </div>

            <div className="col-span-4 flex flex-col gap-6 h-full min-h-0">
              <div onClick={() => setActiveTab('ministers')} className="bg-white rounded-xl border border-zinc-200 shadow-sm flex-1 flex flex-col cursor-pointer hover:border-zinc-300 hover:shadow-md transition-all group min-h-0">
                <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 rounded-t-xl flex justify-between items-start shrink-0 group-hover:bg-zinc-100/50 transition-colors">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-800 group-hover:text-pink-600 transition-colors">The Cabinet</h3>
                    <p className="text-xs text-zinc-500 mt-1">Ministerial reaction to selected policy proposal.</p>
                  </div>
                  <span className="text-zinc-300 group-hover:text-pink-500 font-bold text-xl leading-none mt-1">↗</span>
                </div>
                <div className="p-4 grid grid-cols-3 gap-4 flex-1 content-start relative overflow-y-auto custom-scrollbar">
                  {ministers.map((minister, i) => (
                    <div 
                      key={i} 
                      onClick={(e) => { e.stopPropagation(); setSelectedMinister(minister); }}
                      className="flex flex-col items-center justify-center p-3 rounded-lg border border-zinc-100 bg-zinc-50 cursor-pointer hover:bg-zinc-200 hover:border-zinc-300 transition-all active:scale-95 relative group/minister"
                    >
                      <div className="absolute top-1 left-1.5 opacity-0 group-hover/minister:opacity-100 text-zinc-400 font-black text-xs transition-opacity">⤢</div>

                      <div className={`w-16 h-16 rounded-full flex items-center justify-center ${minister.color} border-4 border-white shadow-md text-3xl transition-colors`}>
                         {minister.status === 'happy' && '😊'}
                         {minister.status === 'neutral' && '😐'}
                         {minister.status === 'angry' && '😠'}
                      </div>
                      <p className="text-[11px] font-bold text-zinc-800 uppercase text-center leading-tight mt-2">
                        Min. for<br/>{minister.name}
                      </p>

                               Only shows if a policy is actively selected, hiding the clutter otherwise */}
                      <div className="h-6 flex items-center justify-center mt-1">
                        {selectedPolicy && Math.abs(minister.policyDelta) > 0.0005 ? (
                          <span className={`text-[11px] font-black px-2 py-0.5 rounded-full shadow-sm ${minister.policyDelta > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {minister.policyDelta > 0 ? '↑' : '↓'} {(Math.abs(minister.policyDelta) * 100).toFixed(1)}%
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-zinc-900 rounded-xl shadow-lg p-6 flex flex-col items-center justify-center shrink-0 h-48 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-pink-500" />
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-2">Projected Voter Share</p>
                <p className={`text-6xl font-black tracking-tighter transition-colors duration-500 ${currentApproval >= 60 ? 'text-white' : 'text-red-400'}`}>
                  {currentApproval.toFixed(1)}%
                </p>
                <p className="text-sm text-zinc-500 mt-2 text-center px-4">
                  Target: 60% of population approves of their <strong className="text-zinc-300">{currentCycle === ElectionCycle.Utilitarian ? 'Personal Utility' : 'Societal Fairness'}</strong> trajectory.
                </p>
              </div>
            </div>

            <div className="col-span-4 flex flex-col bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden h-full min-h-0">
              <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 shrink-0">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-800">Legislative Agenda</h3>
                <p className="text-xs text-zinc-500 mt-1">Select one of this turn's available policies to enact.</p>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {currentDeck.map((policy) => {
                  const isSelected = selectedPolicy?.id === policy.id;
                  const isAffordable = politicalCapital >= policy.politicalCost;
                  const isAusterity = policy.politicalCost < 0;

                  return (
                    <button
                      key={policy.id}
                      onClick={() => setSelectedPolicy(prev => prev?.id === policy.id ? null : policy)}
                      className={`relative w-full text-left p-4 rounded-xl border transition-all duration-200 group ${
                        isSelected ? 'border-pink-500 bg-pink-50 ring-2 ring-pink-500/20 shadow-md' : 'border-zinc-200 hover:border-zinc-300 hover:shadow-sm bg-white'
                      } ${!isAffordable && !isSelected ? 'opacity-60 grayscale-[0.5]' : ''}`}
                    >
                      {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-pink-500 rounded-l-xl" />}
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <p className={`font-bold text-sm leading-tight ${isSelected ? 'text-pink-900' : 'text-zinc-800'}`}>{policy.policyName}</p>
                        <span className={`text-xs font-bold px-2 py-1 rounded-md shrink-0 border ${
                          isAusterity ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : isAffordable || isSelected ? 'bg-zinc-100 text-zinc-600 border-zinc-200' : 'bg-rose-50 text-rose-600 border-rose-100'
                        }`}>
                          {isAusterity ? '+' : '-'}{Math.abs(policy.politicalCost)}
                        </span>
                      </div>
                      <p className={`text-xs line-clamp-2 ${isSelected ? 'text-pink-700/80' : 'text-zinc-500'}`}>{policy.description}</p>
                    </button>
                  );
                })}
              </div>

              <div className="p-4 border-t border-zinc-100 bg-zinc-50 shrink-0">
                <button 
                  onClick={handleApplyPolicy}
                  disabled={!selectedPolicy || (selectedPolicy && politicalCapital < selectedPolicy.politicalCost)}
                  className="w-full py-4 bg-zinc-900 text-white font-bold rounded-xl hover:bg-black disabled:bg-zinc-300 disabled:cursor-not-allowed transition-all shadow-lg"
                >
                  {selectedPolicy && politicalCapital < selectedPolicy.politicalCost ? "Cannot Afford" : "Enact Policy"}
                </button>
              </div>
            </div>

          </div>
        )}
      </main>

      {/* MINISTER OVERLAY MODAL */}
      {selectedMinister && (
        <div 
          className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-900/20 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedMinister(null)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border border-zinc-200 transform scale-100 transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${selectedMinister.color} border-4 border-white shadow-md text-3xl`}>
                 {selectedMinister.status === 'happy' && '😊'}
                 {selectedMinister.status === 'neutral' && '😐'}
                 {selectedMinister.status === 'angry' && '😠'}
              </div>
              <div>
                <h4 className="font-bold text-zinc-800">Minister for {selectedMinister.name}</h4>
                <p className="text-xs uppercase tracking-widest text-zinc-400 font-bold">
                  Status: {selectedMinister.status}
                </p>
              </div>
            </div>
            <p className="text-zinc-600 italic border-l-2 border-zinc-200 pl-4 py-1 mb-4">
              "{selectedMinister.quote}"
            </p>
            <div className="bg-zinc-50 p-3 rounded-lg border border-zinc-100 text-sm">
               <span className="font-bold text-zinc-700">Trajectory (Since Turn 1): </span>
               <span className={`font-black ${
                 selectedMinister.delta < -0.0001 ? 'text-red-500' : 
                 selectedMinister.delta > 0.0001 ? 'text-emerald-500' : 
                 'text-zinc-500'
               }`}>
                 {selectedMinister.delta > 0.0001 ? '+' : ''}{(selectedMinister.delta * 100).toFixed(2)}%
               </span>
            </div>
            <button 
              onClick={() => setSelectedMinister(null)}
              className="mt-4 w-full py-2 bg-zinc-100 text-zinc-600 font-bold rounded-lg hover:bg-zinc-200 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* POPUP / MODAL RENDERING */}
      {showElection && (
        <ElectionModal 
          approvalRating={currentApproval} 
          currentCycle={currentCycle}
          onNextCycle={handleNextCycle}
          onReset={handleResetCycle} 
        />
      )}

      {/* HISTORICAL TREND MODAL */}
      {selectedHistoryGroup && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/30 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedHistoryGroup(null)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 border border-zinc-200 transform scale-100 transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-xl font-bold text-zinc-800">{selectedHistoryGroup.label}</h3>
                <p className="text-sm text-zinc-500 uppercase tracking-widest font-bold">Historical Life Satisfaction</p>
              </div>
              <button 
                onClick={() => setSelectedHistoryGroup(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 transition-colors font-bold"
              >
                ✕
              </button>
            </div>

            {/* Custom SVG Line Graph (Percentage-based coordinate mapping to fix circle distortion) */}
            {/* Custom SVG Line Graph */}
            <div className="w-full h-80 relative bg-zinc-50 rounded-lg border border-zinc-100 p-4">
              <svg className="w-full h-full overflow-visible">
                {/* Gridlines */}
                {[0, 2, 4, 6, 8, 10].map(y => (
                  <line key={y} x1="0%" y1={`${((10 - y) / 10) * 100}%`} x2="100%" y2={`${((10 - y) / 10) * 100}%`} stroke="#e4e4e7" strokeWidth="1" />
                ))}

                {/* The Line (Drawn segment by segment to use percentages) */}
                {/* The Line */}
                {history.map((h, i) => {
                  if (i === 0) return null;
                  const prev = history[i - 1];
                  const maxTurns = Math.max(20, history.length - 1);
                  
                  // @ts-ignore
                  const prevLs = prev.lsAverages[selectedHistoryGroup.category][selectedHistoryGroup.key];
                  // @ts-ignore
                  const currentLs = h.lsAverages[selectedHistoryGroup.category][selectedHistoryGroup.key];

                  return (
                    <line
                      key={`line-${i}`}
                      x1={`${(prev.turn / maxTurns) * 100}%`}
                      y1={`${((10 - prevLs) / 10) * 100}%`}
                      x2={`${(h.turn / maxTurns) * 100}%`}
                      y2={`${((10 - currentLs) / 10) * 100}%`}
                      stroke="#ec4899"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  );
                })}

                {/* Data Points (Interactive) */}
                {/* Data Points */}
                {history.map((h, i) => {
                  const maxTurns = Math.max(20, history.length - 1);
                  // @ts-ignore
                  const ls = h.lsAverages[selectedHistoryGroup.category][selectedHistoryGroup.key];
                  const xPos = `${(h.turn / maxTurns) * 100}%`;
                  const yPos = `${((10 - ls) / 10) * 100}%`;

                  return (
                    <g key={`point-${i}`} className="group/point cursor-crosshair">
                      <circle cx={xPos} cy={yPos} r="5" fill="#ffffff" stroke="#ec4899" strokeWidth="2" className="group-hover/point:stroke-[#be185d] transition-colors" />
                      
                      {/* Tooltip (Hover) */}
                      <g className="opacity-0 group-hover/point:opacity-100 transition-opacity pointer-events-none z-50">
                        <g transform={`translate(${h.turn > 15 ? -60 : h.turn < 5 ? 10 : -40}, -50)`}>
                           <rect x="0" y="0" width="100" height="40" rx="4" fill="#27272a" className="shadow-lg" />
                           <text x="50" y="14" fill="#ffffff" fontSize="10" textAnchor="middle" fontWeight="bold">Turn {h.turn}</text>
                           <text x="50" y="26" fill="#a1a1aa" fontSize="9" textAnchor="middle">Avg LS: {ls.toFixed(2)}</text>
                           {h.enactedPolicyName && (
                             <text x="50" y="36" fill="#f472b6" fontSize="8" textAnchor="middle">"{h.enactedPolicyName}"</text>
                           )}
                        </g>
                      </g>
                    </g>
                  );
                })}
              </svg>

              <div className="absolute left-0 top-4 bottom-4 w-6 flex flex-col justify-between items-end pr-2 pointer-events-none text-[9px] font-bold text-zinc-400">
                <span>10</span><span>8</span><span>6</span><span>4</span><span>2</span><span>0</span>
              </div>
            </div>

            <p className="text-xs text-zinc-400 mt-4 text-center">Hover over points to see the policy enacted that turn.</p>
          </div>
        </div>
      )}
    </div>
  );
}