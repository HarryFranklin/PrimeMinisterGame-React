"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Respondent, AxisVariable, Policy, ElectionCycle } from "./utils/types";
import { loadPopulation } from "./utils/dataLoader";
import { WelfareMetrics } from "./utils/WelfareMetrics";
import { availablePolicies } from "./data/policies";
import { PolicyEngine } from "./utils/PolicyEngine";
import D3Chart from "./components/D3Chart";
import ElectionModal from "./components/ElectionModal";

const totalTurns = 20;

export default function Home() {
  const [population, setPopulation] = useState<Respondent[]>([]);
  const [initialPopulation, setInitialPopulation] = useState<Respondent[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);

  const [currentTurn, setCurrentTurn] = useState(1);
  const [politicalCapital, setPoliticalCapital] = useState(40);
  
  const [currentCycle, setCurrentCycle] = useState<ElectionCycle>(ElectionCycle.Utilitarian);
  const [showElection, setShowElection] = useState(false);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'demographics' | 'ministers' | 'graphs'>('dashboard');
  const [selectedMinister, setSelectedMinister] = useState<any | null>(null);

  const [usedPolicies, setUsedPolicies] = useState<Set<string>>(new Set());
  const [currentDeck, setCurrentDeck] = useState<Policy[]>([]);

  // --- INDEPENDENT GRAPH STATES ---
  const [g1PlotType, setG1PlotType] = useState<'1D' | '2D'>('1D');
  const [g1XAxis, setG1XAxis] = useState<AxisVariable>(AxisVariable.LifeSatisfaction);
  const [g1YAxis, setG1YAxis] = useState<AxisVariable>(AxisVariable.PersonalUtility);

  const [g2PlotType, setG2PlotType] = useState<'1D' | '2D'>('2D');
  const [g2XAxis, setG2XAxis] = useState<AxisVariable>(AxisVariable.LifeSatisfaction);
  const [g2YAxis, setG2YAxis] = useState<AxisVariable>(AxisVariable.PersonalUtility);

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

      return {
        name,
        status: currentStatus,
        color: currentStatus === 'happy' ? "bg-green-100 text-green-700" : currentStatus === 'neutral' ? "bg-zinc-100 text-zinc-700" : "bg-red-100 text-red-700",
        supportLevel,
        delta: delta, 
        baseScore,
        projScore,
        quote: dynamicQuote
      };
    };

    return [
      // Economy is middle-class and wealthy
      evaluateMinister("Economy", r => r.demographics.wealth === 'Middle' || r.demographics.wealth === 'Wealthy'),

      // Equality is poor
      evaluateMinister("Equality", r => r.demographics.wealth === 'Poor'),

      // Youth is young people, students, parents
      evaluateMinister("Youth", r => r.demographics.age === 'Youth' || r.demographics.isStudent || r.demographics.isParent),

      // Health is elderly and people of LS < 4
      evaluateMinister("Health", r => r.demographics.age === 'Elderly' || r.currentLS < 4),

      // Environment is environmentalists
      evaluateMinister("Environment", r => r.demographics.isEnvironmentalist),

      // Transport is commuters
      evaluateMinister("Transport", r => r.demographics.isCommuter)
    ];
  }, [initialPopulation, population, previewPopulation, currentCycle]);

  const demoStats = useMemo(() => {
    if (previewPopulation.length === 0) return null;
    const total = previewPopulation.length;
    const getStat = (filterFn: (r: Respondent) => boolean) => {
      const group = previewPopulation.filter(filterFn);
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
  }, [previewPopulation]);


  const handleApplyPolicy = () => {
    if (!selectedPolicy) return;
    if (politicalCapital < selectedPolicy.politicalCost) {
      alert("Not enough Political Capital!");
      return;
    }

    setPopulation(previewPopulation);
    setPoliticalCapital((prev) => prev - selectedPolicy.politicalCost);
    
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
    setShowElection(false);
  };

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
          
          <nav className="flex gap-1 bg-zinc-100 p-1 rounded-lg border border-zinc-200">
            {['dashboard', 'demographics', 'ministers', 'graphs'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-1.5 text-xs font-bold uppercase rounded-md transition-colors ${
                  activeTab === tab ? 'bg-white shadow-sm text-pink-600' : 'text-zinc-500 hover:text-zinc-700'
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
        {activeTab === 'demographics' && demoStats && (
          <div className="h-full overflow-y-auto custom-scrollbar pr-2 pb-6 flex flex-col gap-6 animate-in fade-in duration-300">
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

            <div className="grid grid-cols-2 gap-6 shrink-0">
              <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-800 mb-6">Wealth Distribution</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Wealthy (Top 10%)', data: demoStats.wealth.wealthy, color: 'bg-emerald-500' },
                    { label: 'Middle Class', data: demoStats.wealth.middle, color: 'bg-blue-500' },
                    { label: 'Poor (Relative Poverty)', data: demoStats.wealth.poor, color: 'bg-red-500' }
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-bold text-zinc-700">{item.label}</span>
                        <span className="text-zinc-500">Avg LS: <strong className="text-zinc-800">{item.data.ls}</strong></span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-3 bg-zinc-100 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color}`} style={{ width: `${item.data.pct}%` }} />
                        </div>
                        <span className="text-xs font-bold w-12 text-right">{item.data.pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-800 mb-6">Age Distribution (18+)</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Elderly (65+)', data: demoStats.age.elderly, color: 'bg-indigo-500' },
                    { label: 'Adults (30-64)', data: demoStats.age.adult, color: 'bg-violet-500' },
                    { label: 'Youth (18-29)', data: demoStats.age.youth, color: 'bg-fuchsia-500' }
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-bold text-zinc-700">{item.label}</span>
                        <span className="text-zinc-500">Avg LS: <strong className="text-zinc-800">{item.data.ls}</strong></span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-3 bg-zinc-100 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color}`} style={{ width: `${item.data.pct}%` }} />
                        </div>
                        <span className="text-xs font-bold w-12 text-right">{item.data.pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm shrink-0">
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-800 mb-6">Key Voting Blocks</h3>
              <div className="grid grid-cols-4 gap-4">
                {[
                  { label: 'Commuters', data: demoStats.traits.commuters, icon: '🚗' },
                  { label: 'Parents', data: demoStats.traits.parents, icon: '👨‍👩‍👧' },
                  { label: 'Environmentalists', data: demoStats.traits.environmentalists, icon: '🌱' },
                  { label: 'Students', data: demoStats.traits.students, icon: '🎓' }
                ].map((item, i) => (
                  <div key={i} className="p-4 bg-zinc-50 rounded-lg border border-zinc-100 flex flex-col items-center text-center">
                    <span className="text-2xl mb-2">{item.icon}</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">{item.label}</span>
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
          <div className="h-full overflow-y-auto custom-scrollbar pr-2 pb-6 animate-in fade-in duration-300">
             <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm mb-6 flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-zinc-800">The Cabinet Room</h2>
                  <p className="text-sm text-zinc-500">Detailed breakdown of ministerial approval and underlying demographic utility.</p>
                </div>
             </div>

             <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 shrink-0">
                {ministers.map((m, i) => (
                   <div key={i} className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col h-full">
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center ${m.color} text-2xl shrink-0`}>
                           {m.status === 'happy' && '😊'}
                           {m.status === 'neutral' && '😐'}
                           {m.status === 'angry' && '😠'}
                        </div>
                        <div>
                          <h4 className="font-bold text-zinc-800 text-lg">Min. for {m.name}</h4>
                          <p className="text-xs uppercase tracking-widest text-zinc-400 font-bold">
                            Status: <span className={m.status === 'angry' ? 'text-red-500' : ''}>{m.status}</span>
                          </p>
                        </div>
                      </div>
                      
                      <p className="text-zinc-600 text-sm italic border-l-2 border-zinc-200 pl-3 py-1 mb-6 flex-1">
                        "{m.quote}"
                      </p>

                      <div className="bg-zinc-50 rounded-lg border border-zinc-100 p-4 space-y-2 text-sm">
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
                           <span className="font-bold text-zinc-700">Trajectory (Δ):</span>
                           <span className={`font-black ${m.delta < -0.0001 ? 'text-red-500' : m.delta > 0.0001 ? 'text-green-500' : 'text-zinc-500'}`}>
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
                
                {/* Independent Controls for Graph 1 */}
                <div className="p-3 border-b border-zinc-100 bg-zinc-50 flex gap-3 items-center shrink-0 flex-wrap">
                  <select 
                    value={g1PlotType} 
                    onChange={(e) => setG1PlotType(e.target.value as any)} 
                    className="bg-white border border-zinc-200 rounded px-2 py-1 text-xs font-bold text-zinc-700 focus:outline-none focus:border-pink-500 cursor-pointer"
                  >
                    <option value="1D">1D Histogram</option>
                    <option value="2D">2D Scatter</option>
                  </select>
                  <div className="w-px h-4 bg-zinc-300" />
                  <span className="text-[10px] font-bold uppercase text-zinc-400">X:</span>
                  <select 
                    value={g1XAxis} 
                    onChange={(e) => setG1XAxis(Number(e.target.value))} 
                    className="bg-white border border-zinc-200 rounded px-2 py-1 text-xs font-medium text-zinc-700 focus:outline-none focus:border-pink-500 cursor-pointer min-w-0 flex-1"
                  >
                    <option value={AxisVariable.LifeSatisfaction}>Life Satisfaction</option>
                    <option value={AxisVariable.PersonalUtility}>Personal Utility</option>
                    <option value={AxisVariable.SocietalFairness}>Societal Fairness</option>
                  </select>
                  {g1PlotType === '2D' && (
                    <>
                      <div className="w-px h-4 bg-zinc-300" />
                      <span className="text-[10px] font-bold uppercase text-zinc-400">Y:</span>
                      <select 
                        value={g1YAxis} 
                        onChange={(e) => setG1YAxis(Number(e.target.value))} 
                        className="bg-white border border-zinc-200 rounded px-2 py-1 text-xs font-medium text-zinc-700 focus:outline-none focus:border-pink-500 cursor-pointer min-w-0 flex-1"
                      >
                        <option value={AxisVariable.LifeSatisfaction}>Life Satisfaction</option>
                        <option value={AxisVariable.PersonalUtility}>Personal Utility</option>
                        <option value={AxisVariable.SocietalFairness}>Societal Fairness</option>
                      </select>
                    </>
                  )}
                </div>

                {/* Graph Container */}
                <div className="flex-1 p-4 min-h-0 relative">
                  <D3Chart plotType={g1PlotType} chartData={g1ChartData} histogramData={g1HistogramData} xAxisType={g1XAxis} yAxisType={g1YAxis} />
                </div>
             </div>

             {/* GRAPH 2 (Right) */}
             <div className="flex-1 bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col min-w-0">
                
                {/* Independent Controls for Graph 2 */}
                <div className="p-3 border-b border-zinc-100 bg-zinc-50 flex gap-3 items-center shrink-0 flex-wrap">
                  <select 
                    value={g2PlotType} 
                    onChange={(e) => setG2PlotType(e.target.value as any)} 
                    className="bg-white border border-zinc-200 rounded px-2 py-1 text-xs font-bold text-zinc-700 focus:outline-none focus:border-pink-500 cursor-pointer"
                  >
                    <option value="1D">1D Histogram</option>
                    <option value="2D">2D Scatter</option>
                  </select>
                  <div className="w-px h-4 bg-zinc-300" />
                  <span className="text-[10px] font-bold uppercase text-zinc-400">X:</span>
                  <select 
                    value={g2XAxis} 
                    onChange={(e) => setG2XAxis(Number(e.target.value))} 
                    className="bg-white border border-zinc-200 rounded px-2 py-1 text-xs font-medium text-zinc-700 focus:outline-none focus:border-pink-500 cursor-pointer min-w-0 flex-1"
                  >
                    <option value={AxisVariable.LifeSatisfaction}>Life Satisfaction</option>
                    <option value={AxisVariable.PersonalUtility}>Personal Utility</option>
                    <option value={AxisVariable.SocietalFairness}>Societal Fairness</option>
                  </select>
                  {g2PlotType === '2D' && (
                    <>
                      <div className="w-px h-4 bg-zinc-300" />
                      <span className="text-[10px] font-bold uppercase text-zinc-400">Y:</span>
                      <select 
                        value={g2YAxis} 
                        onChange={(e) => setG2YAxis(Number(e.target.value))} 
                        className="bg-white border border-zinc-200 rounded px-2 py-1 text-xs font-medium text-zinc-700 focus:outline-none focus:border-pink-500 cursor-pointer min-w-0 flex-1"
                      >
                        <option value={AxisVariable.LifeSatisfaction}>Life Satisfaction</option>
                        <option value={AxisVariable.PersonalUtility}>Personal Utility</option>
                        <option value={AxisVariable.SocietalFairness}>Societal Fairness</option>
                      </select>
                    </>
                  )}
                </div>

                {/* Graph Container */}
                <div className="flex-1 p-4 min-h-0 relative">
                  <D3Chart plotType={g2PlotType} chartData={g2ChartData} histogramData={g2HistogramData} xAxisType={g2XAxis} yAxisType={g2YAxis} />
                </div>
             </div>

          </div>
        )}

        {/* VIEW 4: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-12 gap-6 h-full animate-in fade-in duration-300">
            
            <div className="col-span-4 flex flex-col gap-6 overflow-y-auto pr-2 pb-6 custom-scrollbar">
              <div onClick={() => setActiveTab('graphs')} className="bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col h-[300px] shrink-0 cursor-pointer hover:border-zinc-300 hover:shadow-md transition-all group">
                <div className="p-3 border-b border-zinc-100 bg-zinc-50/50 rounded-t-xl flex justify-between items-center">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 group-hover:text-pink-600 transition-colors">Life Satisfaction Distribution</h3>
                  <span className="text-zinc-300 group-hover:text-pink-500 font-bold">↗</span>
                </div>
                <div className="flex-1 p-2">
                  <D3Chart plotType="1D" chartData={dashboardChartData} histogramData={dashboardHistogramData} xAxisType={AxisVariable.LifeSatisfaction} yAxisType={AxisVariable.PersonalUtility} />
                </div>
              </div>

              <div onClick={() => setActiveTab('graphs')} className="bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col h-[300px] shrink-0 cursor-pointer hover:border-zinc-300 hover:shadow-md transition-all group">
                <div className="p-3 border-b border-zinc-100 bg-zinc-50/50 rounded-t-xl flex justify-between items-center">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 group-hover:text-pink-600 transition-colors">
                    {currentCycle === ElectionCycle.Utilitarian ? "Personal Utility Scatter" : "Societal Fairness Scatter"}
                  </h3>
                  <span className="text-zinc-300 group-hover:text-pink-500 font-bold">↗</span>
                </div>
                <div className="flex-1 p-2">
                  <D3Chart plotType="2D" chartData={dashboardChartData} xAxisType={AxisVariable.LifeSatisfaction} yAxisType={currentCycle === ElectionCycle.Utilitarian ? AxisVariable.PersonalUtility : AxisVariable.SocietalFairness} />
                </div>
              </div>
            </div>

            <div className="col-span-4 flex flex-col gap-6">
              
              <div onClick={() => setActiveTab('ministers')} className="bg-white rounded-xl border border-zinc-200 shadow-sm flex-1 flex flex-col cursor-pointer hover:border-zinc-300 hover:shadow-md transition-all group">
                <div className="p-4 border-b border-zinc-100 flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-800 group-hover:text-pink-600 transition-colors">The Cabinet</h3>
                    <p className="text-xs text-zinc-500 mt-1">Ministerial reaction to selected policy proposal.</p>
                  </div>
                </div>
                <div className="p-4 grid grid-cols-3 gap-4 flex-1 content-start relative">
                  {ministers.map((minister, i) => (
                    <div 
                      key={i} 
                      onClick={(e) => { e.stopPropagation(); setSelectedMinister(minister); }}
                      className="flex flex-col items-center justify-center p-3 rounded-lg border border-zinc-100 bg-zinc-50 cursor-pointer hover:bg-zinc-200 hover:border-zinc-300 transition-all active:scale-95 relative"
                    >
                      {selectedPolicy && minister.supportLevel === 'supports' && (
                        <div className="absolute top-1 right-1 text-green-700 bg-green-200 rounded-md px-1.5 py-0.5 text-[9px] font-black tracking-widest uppercase shadow-sm">+ For</div>
                      )}
                      {selectedPolicy && minister.supportLevel === 'opposes' && (
                        <div className="absolute top-1 right-1 text-red-700 bg-red-200 rounded-md px-1.5 py-0.5 text-[9px] font-black tracking-widest uppercase shadow-sm">- Against</div>
                      )}

                      <div className={`w-12 h-12 rounded-full mb-2 mt-2 flex items-center justify-center ${minister.color} border-2 border-white shadow-sm text-xl transition-colors`}>
                         {minister.status === 'happy' && '😊'}
                         {minister.status === 'neutral' && '😐'}
                         {minister.status === 'angry' && '😠'}
                      </div>
                      <p className="text-[11px] font-bold text-zinc-800 uppercase text-center leading-tight">
                        Min. for<br/>{minister.name}
                      </p>
                      <p className={`text-[10px] font-bold mt-1 ${minister.delta < -0.0001 ? 'text-red-500' : minister.delta > 0.0001 ? 'text-green-500' : 'text-zinc-400'}`}>
                        Δ {(minister.delta * 100).toFixed(1)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-zinc-900 rounded-xl shadow-lg p-6 flex flex-col items-center justify-center shrink-0 relative overflow-hidden">
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

            <div className="col-span-4 flex flex-col bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-zinc-100 bg-zinc-50/50">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-800">Legislative Agenda</h3>
                <p className="text-xs text-zinc-500 mt-1">Select one of this turn's available policies to enact.</p>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                      {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-pink-500" />}
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <p className={`font-bold text-sm leading-tight ${isSelected ? 'text-pink-900' : 'text-zinc-800'}`}>{policy.policyName}</p>
                        <span className={`text-xs font-bold px-2 py-1 rounded-md shrink-0 border ${
                          isAusterity ? 'bg-green-50 text-green-700 border-green-200' : isAffordable || isSelected ? 'bg-zinc-100 text-zinc-600 border-zinc-200' : 'bg-red-50 text-red-600 border-red-100'
                        }`}>
                          {isAusterity ? '+' : '-'}{Math.abs(policy.politicalCost)}
                        </span>
                      </div>
                      <p className={`text-xs line-clamp-2 ${isSelected ? 'text-pink-700/80' : 'text-zinc-500'}`}>{policy.description}</p>
                    </button>
                  );
                })}
              </div>

              <div className="p-4 border-t border-zinc-100 bg-zinc-50">
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
          className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-900/20 backdrop-blur-sm"
          onClick={() => setSelectedMinister(null)}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6 border border-zinc-200 transform scale-100 transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${selectedMinister.color} text-2xl`}>
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
                 selectedMinister.delta > 0.0001 ? 'text-green-500' : 
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
    </div>
  );
}