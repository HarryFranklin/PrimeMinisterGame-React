// components/tabs/DashboardTab.tsx
import { useMemo, useState, useEffect, useLayoutEffect, useRef } from "react";
import React from "react";
import { useGame, useUI } from "../../context/GameStateContext";
import { FRAMEWORK_RULES } from "../../utils/frameworkRules";
import { AxisVariable, Respondent, ElectionCycle } from "../../utils/types";
import { IMPACT_COLORS } from "../../utils/uiHelpers";
import { availablePolicies } from "../../data/policies";
import D3Chart from "../D3Chart";
import DPMCard from "../DPMCard";
import UtilityTable from "../UtilityTable";

export default function DashboardTab() {
  const { pulsePolicy } = useUI();
  const {
    currentCycle, currentTurn, currentChartData, currentHistogramData,
    selectedPolicy, turnMetricScore, currentDeck, setSelectedPolicy, handleApplyPolicy, 
    turnApprovalRating: approvalRating, cycleMAO, isAgendaUnlocked, yAxisMax, isEnacting,
    population, previewPopulation, isParliamentDissolved, history, handleFaceElectorate
  } = useGame();

  const rule = FRAMEWORK_RULES[currentCycle];
  const targetScore = cycleMAO * rule.winThresholdScalar;
  const isUtilityCycle = currentCycle === ElectionCycle.PersonalUtility || currentCycle === ElectionCycle.SocietalUtility;

  const [displayApproval, setDisplayApproval] = useState(approvalRating);
  const [hoveredEnactedId, setHoveredEnactedId] = useState<string | null>(null);
  const [hoveredHistoryTurn, setHoveredHistoryTurn] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [scaleLevel, setScaleLevel] = useState(0);
  const agendaListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDetailsOpen(false);
  }, [selectedPolicy]);

  useEffect(() => {
    const handleResize = () => setScaleLevel(0);
    window.addEventListener('resize', handleResize);
    setScaleLevel(0);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentDeck, isParliamentDissolved]);

  useLayoutEffect(() => {
    const el = agendaListRef.current;
    if (!el) return;
    if (el.scrollHeight > el.clientHeight + 2 && scaleLevel < 4) {
      setScaleLevel(prev => prev + 1);
    }
  }, [scaleLevel, currentDeck, isParliamentDissolved]);

  const scaleConfigs = [
    { title: 'text-[15px] lg:text-base', body: 'text-[13px] lg:text-sm', pad: 'p-3.5', gap: 'mb-1' },
    { title: 'text-sm lg:text-[15px]', body: 'text-xs', pad: 'p-3', gap: 'mb-0.5' },
    { title: 'text-xs lg:text-sm', body: 'text-[11px]', pad: 'p-2.5', gap: 'mb-0.5' },
    { title: 'text-[11px] lg:text-xs', body: 'text-[10px]', pad: 'p-2', gap: 'mb-0' },
    { title: 'text-[10px] lg:text-[11px]', body: 'text-[9px]', pad: 'p-1.5', gap: 'mb-0' }
  ];
  const textScale = scaleConfigs[Math.min(scaleLevel, 4)];

  useEffect(() => {
    let animationFrameId: number;
    let startTime: number;
    const startValue = displayApproval;
    const change = approvalRating - startValue;
    
    if (Math.abs(change) < 0.01) {
      setDisplayApproval(approvalRating);
      return;
    }

    const duration = 1200; 
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3); 
      setDisplayApproval(startValue + change * easeProgress);
      
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setDisplayApproval(approvalRating);
      }
    };
    
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [approvalRating]);

  const activeMarkers = isParliamentDissolved && hoveredHistoryTurn !== null
    ? [] 
    : [
        { value: turnMetricScore, label: `CURRENT ${rule.targetMetricAbbreviation}`, color: "#3f3f46", dashed: false },
        { value: targetScore, label: `TARGET ${rule.targetMetricAbbreviation}`, color: rule.graphColor, dashed: true }
      ];

  const topHistogramData = useMemo(() => {
    if (isParliamentDissolved && hoveredHistoryTurn !== null) {
      return Array.from({ length: 11 }, (_, i) => {
        const count = population.filter((r: Respondent) => {
          const ledger = r.historicalLedger.find((l: any) => l.cycle === currentCycle);
          if (!ledger) return false;
          const turnData = ledger.turns.find((t: any) => t.turn === hoveredHistoryTurn - 1);
          return turnData && Math.min(10, Math.max(0, Math.round(turnData.ls))) === i;
        }).length;
        return { name: i, count };
      });
    }
    return currentHistogramData.map(d => ({ name: d.name, count: d.count }));
  }, [population, hoveredHistoryTurn, isParliamentDissolved, currentCycle, currentHistogramData]);

  const bottomHistogramData = useMemo(() => {
    if (isParliamentDissolved) {
      if (hoveredHistoryTurn === null) return []; 
      
      return Array.from({ length: 11 }, (_, i) => {
        const residentsInBinBefore = population.filter((r: Respondent) => {
          const ledger = r.historicalLedger.find((l: any) => l.cycle === currentCycle);
          if (!ledger) return false;
          const turnData = ledger.turns.find((t: any) => t.turn === hoveredHistoryTurn - 1);
          return turnData && Math.min(10, Math.max(0, Math.round(turnData.ls))) === i;
        });
        
        const binCount = residentsInBinBefore.length;
        const segments: any[] = [];
        
        const improveCount = residentsInBinBefore.filter((r: Respondent) => {
          const ledger = r.historicalLedger.find((l: any) => l.cycle === currentCycle)!;
          const before = ledger.turns.find((t: any) => t.turn === hoveredHistoryTurn - 1)!.ls;
          const after = ledger.turns.find((t: any) => t.turn === hoveredHistoryTurn)!.ls;
          return after - before > 0.05;
        }).length;
        
        const worsenCount = residentsInBinBefore.filter((r: Respondent) => {
          const ledger = r.historicalLedger.find((l: any) => l.cycle === currentCycle)!;
          const before = ledger.turns.find((t: any) => t.turn === hoveredHistoryTurn - 1)!.ls;
          const after = ledger.turns.find((t: any) => t.turn === hoveredHistoryTurn)!.ls;
          return after - before < -0.05;
        }).length;
        
        const stableCount = binCount - improveCount - worsenCount;
        
        if (improveCount > 0) segments.push({ label: 'Improved', value: improveCount, color: IMPACT_COLORS['Will improve'] });
        if (stableCount > 0) segments.push({ label: 'Stable', value: stableCount, color: IMPACT_COLORS['Will be stable'] });
        if (worsenCount > 0) segments.push({ label: 'Worsened', value: worsenCount, color: IMPACT_COLORS['Will worsen'] });

        return { name: i, count: binCount, segments };
      });
    } else {
      if (!selectedPolicy) return [];
      return Array.from({ length: 11 }, (_, i) => {
        const residentsProjectedToThisBin = previewPopulation.filter(r => Math.min(10, Math.max(0, Math.round(r.currentLS))) === i);
        const segments: any[] = [];
        
        const movements = residentsProjectedToThisBin.map(r => {
          const idx = previewPopulation.indexOf(r);
          return { before: population[idx].currentLS, after: r.currentLS };
        });

        const improve = movements.filter(m => m.after > m.before + 0.05).length;
        const worsen = movements.filter(m => m.after < m.before - 0.05).length;
        const stable = movements.length - improve - worsen;

        if (improve > 0) segments.push({ label: 'Improved', value: improve, color: IMPACT_COLORS['Will improve'] });
        if (stable > 0) segments.push({ label: 'Stable', value: stable, color: IMPACT_COLORS['Will be stable'] });
        if (worsen > 0) segments.push({ label: 'Worsened', value: worsen, color: IMPACT_COLORS['Will worsen'] });

        return { name: i, count: residentsProjectedToThisBin.length, segments };
      });
    }
  }, [population, hoveredHistoryTurn, isParliamentDissolved, currentCycle, selectedPolicy, previewPopulation]);

  const enactedLegislation = useMemo(() => {
    return history.filter(h => h.turn > 1).map(h => {
      const pDetails = availablePolicies.find(pol => pol.id === h.enactedPolicyId);
      return { ...h, description: pDetails?.description };
    });
  }, [history]);

  const highlightedBins = useMemo(() => {
    if (!selectedPolicy || !detailsOpen || isParliamentDissolved) return null;
    const bins = new Set<number>();
    selectedPolicy.specificRules.forEach(r => {
      const min = r.minLS !== undefined ? Math.round(r.minLS) : 0;
      const max = r.maxLS !== undefined ? Math.round(r.maxLS) : 10;
      for (let i = min; i <= max; i++) {
        if (i >= 0 && i <= 10) bins.add(i);
      }
    });
    return Array.from(bins);
  }, [selectedPolicy, detailsOpen, isParliamentDissolved]);

  const hoveredPolicyDetails = hoveredEnactedId ? availablePolicies.find(p => p.id === hoveredEnactedId) : null;
  const bottomChartTitle = isParliamentDissolved 
    ? (hoveredPolicyDetails ? `Historical Policy Impact (${hoveredPolicyDetails.policyName})` : "Historical Policy Impact")
    : "Projected Population";

  return (
    <div className="flex flex-col gap-4 lg:gap-6 h-full min-h-0 overflow-hidden animate-in fade-in duration-300">
      <div className="grid grid-cols-12 gap-4 lg:gap-6 flex-1 min-h-0 overflow-hidden">
        
        {/* LEFT COLUMN: Stacked Graphs OR Utility Table */}
        <div className="col-span-4 flex flex-col gap-4 lg:gap-6 h-full min-h-0 overflow-hidden">
          
          {isUtilityCycle ? (
            // --- UTILITY CYCLE VIEW (Cycles 3 & 4) ---
            <div className="flex flex-col gap-4 lg:gap-6 h-full min-h-0 overflow-hidden">
              <div className="bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden transition-all group">
                <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-100 rounded-t-xl flex justify-between items-center shrink-0">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-900">
                    {isParliamentDissolved 
                      ? (hoveredHistoryTurn !== null ? `Population at Turn ${hoveredHistoryTurn - 1}` : "Final Population") 
                      : "Current Population"}
                  </h3>
                </div>
                
                <div className="flex-1 p-3 min-h-0 relative pointer-events-none">
                  <D3Chart 
                    plotType="1D" 
                    chartData={currentChartData}
                    histogramData={topHistogramData} 
                    xAxisType={AxisVariable.LifeSatisfaction}
                    yAxisType={rule.yAxisType} 
                    color="#d4d4d8"
                    markers={activeMarkers} 
                    visualStyle={'faces'}
                    yAxisMax={yAxisMax}
                    faceCols={2}
                    activePolicyRules={detailsOpen && selectedPolicy && !isParliamentDissolved ? selectedPolicy.specificRules : null}
                  />
                </div>
              </div>

              <div className="bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden transition-all group relative">
                <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-100 rounded-t-xl flex justify-between items-center shrink-0">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-900">Utility Analysis</h3>
                </div>
                
                <div className="flex-1 p-3 min-h-0 overflow-y-auto relative">
                  <UtilityTable
                    population={population}
                    previewPopulation={selectedPolicy && !isParliamentDissolved ? previewPopulation : null}
                    cycle={currentCycle}
                    metricName={rule.targetMetricName}
                    forecastState={
                      isParliamentDissolved ? 'idle'
                      : !selectedPolicy     ? 'idle'
                      : 'previewing'
                    }
                    forecastsRemaining={1} 
                    onRunForecast={() => {}}
                  />
                  
                  {isParliamentDissolved && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px] rounded-b-xl z-10 animate-in fade-in duration-300 pointer-events-auto">
                      <div className="bg-white px-5 py-4 rounded-xl shadow-lg border border-zinc-200 text-center max-w-[280px]">
                        <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <span className="text-zinc-400 text-lg">⏳</span>
                        </div>
                        <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-widest mb-1">Select Legislation</h4>
                        <p className="text-sm text-zinc-500 font-medium">
                          Hover over a policy in your Enacted Legislation to review its historical impact on the population.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            // --- STANDARD CYCLE VIEW (Cycles 1 & 2) ---
            <>
              {/* TOP: Current Distribution */}
              <div className="bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden transition-all group">
                <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-100 rounded-t-xl flex justify-between items-center shrink-0">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-900">
                    {isParliamentDissolved 
                      ? (hoveredHistoryTurn !== null ? `Population at Turn ${hoveredHistoryTurn - 1}` : "Final Population") 
                      : "Current Population"}
                  </h3>
                </div>
                
                <div className="flex-1 p-3 min-h-0 relative pointer-events-none">
                  <D3Chart 
                    plotType="1D" 
                    chartData={currentChartData}
                    histogramData={topHistogramData} 
                    xAxisType={AxisVariable.LifeSatisfaction}
                    yAxisType={rule.yAxisType} 
                    color="#d4d4d8"
                    markers={activeMarkers} 
                    visualStyle={'faces'}
                    yAxisMax={yAxisMax}
                    faceCols={2}
                    activePolicyRules={detailsOpen && selectedPolicy && !isParliamentDissolved ? selectedPolicy.specificRules : null}
                  />
                </div>
              </div>

              {/* BOTTOM: Projected Distribution */}
              <div className="bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden transition-all group">
                <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-100 rounded-t-xl flex justify-between items-center shrink-0">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-900 truncate pr-2">
                    {bottomChartTitle}
                  </h3>
                </div>
                
                <div className="flex-1 p-3 pb-0 min-h-0 relative">
                  <div className="absolute inset-0 p-3 pb-0 pointer-events-none">
                    <D3Chart 
                      plotType="1D" 
                      chartData={[]}
                      histogramData={bottomHistogramData} 
                      xAxisType={AxisVariable.LifeSatisfaction}
                      yAxisType={rule.yAxisType} 
                      color="#ec4899"
                      visualStyle={isParliamentDissolved && hoveredHistoryTurn !== null ? 'faces-segmented' : 'faces'} 
                      yAxisMax={yAxisMax}
                    />
                  </div>
                  
                  {!selectedPolicy && !isParliamentDissolved && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px] rounded-b-xl z-10 animate-in fade-in duration-300 pointer-events-auto">
                      <div className="bg-white px-5 py-4 rounded-xl shadow-lg border border-zinc-200 text-center max-w-[250px]">
                        <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <span className="text-zinc-400 text-lg">💡</span>
                        </div>
                        <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-widest mb-1">Awaiting Policy</h4>
                        <p className="text-sm text-zinc-500 font-medium">
                          Select a policy from the Legislative Agenda to forecast its impact.
                        </p>
                      </div>
                    </div>
                  )}

                  {isParliamentDissolved && hoveredHistoryTurn === null && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px] rounded-b-xl z-10 animate-in fade-in duration-300 pointer-events-auto">
                      <div className="bg-white px-5 py-4 rounded-xl shadow-lg border border-zinc-200 text-center max-w-[280px]">
                        <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <span className="text-zinc-400 text-lg">⏳</span>
                        </div>
                        <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-widest mb-1">Select Legislation</h4>
                        <p className="text-sm text-zinc-500 font-medium">
                          Hover over a policy in your Enacted Legislation to review its historical impact on the population.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className={`px-4 pb-3 flex flex-wrap gap-4 justify-center border-t border-zinc-50 pt-2 shrink-0 transition-all duration-300 ${(hoveredHistoryTurn !== null || (selectedPolicy && !isParliamentDissolved)) ? 'opacity-100' : 'opacity-0 grayscale pointer-events-none hidden'}`}>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: IMPACT_COLORS['Will improve'] }} />
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight">Improved</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: IMPACT_COLORS['Will be stable'] }} />
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight">Stable</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: IMPACT_COLORS['Will worsen'] }} />
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight">Worsened</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* MIDDLE COLUMN: DPM & Approval */}
        <div className="col-span-4 flex flex-col gap-4 lg:gap-6 h-full min-h-0 overflow-hidden">
          <DPMCard 
            currentCycle={currentCycle}
            currentTurn={currentTurn}
            isParliamentDissolved={isParliamentDissolved}
            selectedPolicy={selectedPolicy}
            cycleMAO={cycleMAO}
            currentMetricScore={turnMetricScore}
          />

          <div className="bg-zinc-900 rounded-xl shadow-lg p-5 flex flex-col items-center justify-center shrink-0 h-36 lg:h-40 relative overflow-hidden transition-all">
            <div className="absolute top-0 left-0 w-full h-1.5" style={{backgroundColor: rule.graphColor}} />
            <p className="text-xs lg:text-sm font-bold uppercase tracking-widest text-zinc-400 mb-1">Public Approval</p>
            
            {isParliamentDissolved ? (
              <p className="text-3xl lg:text-4xl font-black tracking-widest text-zinc-500 mt-2">
                UNCLEAR
              </p>
            ) : (
              <>
                <p className={`text-5xl lg:text-6xl font-black tracking-tighter transition-colors duration-500 ${approvalRating >= 51 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {displayApproval.toFixed(1)}%
                </p>
                <p className="text-sm text-zinc-500 mt-2 text-center px-4">
                  Requirement: <strong className="text-zinc-300">51.0%</strong>
                </p>
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Legislative Agenda OR Enacted History */}
        <div className="col-span-4 flex flex-col bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden h-full min-h-0 relative">
          
          <div className="p-4 border-b border-zinc-200 bg-zinc-100 shrink-0 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-zinc-900 tracking-tight">
                {isParliamentDissolved ? "Enacted Legislation" : "Legislative Agenda"}
              </h3>
              <p className="text-sm text-zinc-600 mt-1">
                {isParliamentDissolved ? "The policies enacted during your term. Hover over to see their effects." : "Select a policy to review its details."}
              </p>
            </div>
          </div>
          
          <div ref={agendaListRef} className={`flex-1 flex flex-col gap-2 min-h-0 overflow-visible relative z-[60] ${isParliamentDissolved ? 'p-3' : 'p-2'}`}>
            
            {!isParliamentDissolved ? (
              currentDeck.slice(0, 4).map((policy, index) => {
                const isSelected = selectedPolicy?.id === policy.id;
                const isOtherSelectedAndOpen = selectedPolicy && !isSelected && detailsOpen;

                return (
                  <div 
                    key={policy.id} 
                    className={`relative flex w-full transition-all duration-300 ease-in-out ${isSelected ? 'flex-[2.5] z-[70]' : 'flex-1 z-10'} ${isOtherSelectedAndOpen ? 'blur-[2px] opacity-40' : ''}`}
                  >
                    <div 
                      className={`w-full flex rounded-xl border transition-all duration-300 overflow-hidden relative ${
                        isSelected ? 'border-pink-500 bg-pink-50 shadow-md' : 'border-zinc-200 hover:border-zinc-300 bg-white'
                      }`}
                    >
                      {/* Main Clickable Area*/}
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedPolicy(isSelected ? null : policy); setDetailsOpen(false); }}
                        className={`flex-col items-start text-left p-4 h-auto flex-grow-0 ${isSelected ? 'w-[85%]' : 'w-full'}`}
                      >
                        <p className={`font-bold text-base leading-tight ${isSelected ? 'text-pink-900' : 'text-zinc-900'}`}>
                          {policy.policyName}
                        </p>
                        <div className={`transition-all duration-300 overflow-hidden ${isSelected ? 'opacity-100 max-h-[120px] mt-2' : 'opacity-0 max-h-0'}`}>
                          <p className="text-sm text-pink-700/80 leading-relaxed">{policy.description}</p>
                        </div>
                      </button>

                      {/* View Details*/}
                      {isSelected && (
                        <div className="w-[15%] border-l border-pink-200 flex items-center justify-center cursor-pointer hover:bg-pink-100"
                            onClick={() => setDetailsOpen(!detailsOpen)}>
                          <span className="text-[10px] font-black uppercase text-pink-600">Details</span>
                        </div>
                      )}
                    </div>

                    {/* DETAILS POP-UP */}
                    {isSelected && detailsOpen && (
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className={`absolute left-0 right-0 bg-white/95 border border-pink-300 shadow-2xl rounded-xl p-3 z-[100] ${
                          index > 1 ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]'
                        }`}
                      >
                        {/* max-h-[25vh] + overflow-y-auto ensures it never spills off the bottom */}
                        <div className="flex flex-col gap-2 max-h-[25vh] overflow-y-auto pr-1">
                          {policy.specificRules.map((r: any, rIdx: number) => {
                            const minStr = r.minLS !== undefined ? r.minLS : 0;
                            const maxStr = r.maxLS !== undefined ? r.maxLS : 10;
                            const lsRange = `LS ${minStr} to ${maxStr}`;

                            const eligible = population.filter((p: any) => 
                              (r.minLS === undefined || p.currentLS >= r.minLS) &&
                              (r.maxLS === undefined || p.currentLS <= r.maxLS)
                            ).length;
                            
                            const coverage = Math.round(eligible * r.proportion);
                            const coveragePercentage = Math.round((coverage / population.length) * 100);

                            const isPositive = r.impact > 0;
                            const ruleColor = isPositive ? IMPACT_COLORS['Will improve'] : IMPACT_COLORS['Will worsen'];
                            const ruleBg = isPositive ? 'rgba(59,130,246,0.04)' : 'rgba(245,158,11,0.04)';

                            return (
                              <React.Fragment key={rIdx}>
                                {rIdx > 0 && <div className="h-px w-full bg-pink-200/50 my-1 rounded-full shrink-0" />}
                                <div className="rounded-lg border border-zinc-100 overflow-hidden shadow-sm border-l-4 p-2.5 shrink-0"
                                     style={{ borderLeftColor: ruleColor, backgroundColor: ruleBg }}>
                                  <div className="flex justify-between items-center gap-2">
                                    <span className="font-bold text-[13px] text-zinc-800 leading-snug">{r.note}</span>
                                    <span className="font-black text-[13px] shrink-0" style={{ color: ruleColor }}>
                                      {isPositive ? '+' : ''}{r.impact} LS
                                    </span>
                                  </div>
                                  <div className="flex gap-2 pt-1.5 items-center">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Range</span>
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ruleColor }} />
                                      <span className="text-[11px] font-bold text-zinc-600">{lsRange}</span>
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400 ml-auto">Coverage</span>
                                    <span className="text-[11px] font-bold text-zinc-600">~{coveragePercentage}%</span>
                                  </div>
                                </div>
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              // History View (When Parliament Dissolved)
              <div className="flex flex-col gap-1.5 h-full min-h-0 overflow-visible justify-between relative">
                {enactedLegislation.map((leg, index) => {
                  const isHovered = hoveredEnactedId !== null && hoveredEnactedId === leg.enactedPolicyId;
                  const fullPolicy = availablePolicies.find(p => p.id === leg.enactedPolicyId);
                  
                  return (
                    <div 
                      key={index} 
                      onMouseEnter={() => {
                        setHoveredEnactedId(leg.enactedPolicyId);
                        setHoveredHistoryTurn(leg.turn);
                      }}
                      onMouseLeave={() => {
                        setHoveredEnactedId(null);
                        setHoveredHistoryTurn(null);
                      }}
                      className={`relative flex flex-col justify-center bg-white ${textScale.pad} rounded-lg border border-zinc-200 shadow-sm cursor-pointer transition-colors shrink-0 ${isHovered ? 'z-50 ring-2 ring-pink-500/20' : 'z-10 hover:bg-zinc-50'}`}
                    >
                      <div className="flex gap-2 items-center min-w-0">
                        <div className="w-5 h-5 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`font-bold ${textScale.title} text-zinc-900 leading-tight mb-0.5`}>
                            {leg.enactedPolicyName}
                          </p>
                          <p className={`${textScale.body} text-zinc-500 leading-tight`}>
                            {leg.description}
                          </p>
                        </div>
                      </div>

                      {/* Detail Pop-up */}
                      {isHovered && fullPolicy && (
                        <div className={`absolute left-0 right-0 bg-white/95 backdrop-blur-md border border-pink-300 shadow-2xl rounded-xl p-4 flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200 pointer-events-none z-[100] ${
                          index > 1 ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]'
                        }`}>
                          <span className="text-[12px] font-black uppercase tracking-widest text-pink-500">Details</span>
                          
                          <div className="flex flex-col gap-1.5 max-h-[190px] overflow-y-auto pr-1.5">
                            {fullPolicy.specificRules.map((r: any, rIdx: number) => {
                              const isPositive = r.impact > 0;
                              const ruleColor = isPositive ? IMPACT_COLORS['Will improve'] : IMPACT_COLORS['Will worsen'];
                              const ruleBg = isPositive ? 'rgba(59,130,246,0.04)' : 'rgba(245,158,11,0.04)';
                              return (
                                <React.Fragment key={rIdx}>
                                  {rIdx > 0 && <div className="h-px w-full bg-pink-200/50 my-1 rounded-full shrink-0" />}
                                  <div className="rounded-lg border border-zinc-100 overflow-hidden shadow-sm border-l-4 p-2.5 shrink-0"
                                       style={{ borderLeftColor: ruleColor, backgroundColor: ruleBg }}>
                                    <div className="flex justify-between items-center gap-2">
                                      <span className="font-bold text-[13px] text-zinc-800 leading-snug">{r.note}</span>
                                      <span className="font-black text-[13px] shrink-0" style={{ color: ruleColor }}>
                                        {isPositive ? '+' : ''}{r.impact} LS
                                      </span>
                                    </div>
                                  </div>
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-zinc-100 bg-zinc-100 shrink-0 relative z-0">
            {isParliamentDissolved ? (
              <button 
                onClick={handleFaceElectorate}
                className="w-full py-4 bg-rose-600 text-white text-base font-black uppercase tracking-widest rounded-xl hover:bg-rose-700 transition-all shadow-lg animate-pulse cursor-pointer"
              >
                Face the Electorate
              </button>
            ) : (
              <button 
                onClick={handleApplyPolicy}
                disabled={!selectedPolicy || !isAgendaUnlocked || isEnacting}
                className={`w-full py-3 text-white text-sm font-bold rounded-xl transition-all shadow-md ${
                  isEnacting ? 'bg-pink-600 animate-pulse' : 'bg-zinc-900 hover:bg-black disabled:bg-zinc-300 disabled:cursor-not-allowed cursor-pointer'
                }`}
              >
                {isEnacting ? 'Enacting Legislation...' : 'Enact Policy'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}