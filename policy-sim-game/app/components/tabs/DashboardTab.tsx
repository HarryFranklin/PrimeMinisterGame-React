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

  const activeMarkers = isParliamentDissolved 
    ? [] 
    : [
        { value: turnMetricScore, label: `CURRENT ${rule.targetMetricAbbreviation}`, color: "#3f3f46", dashed: false },
        { value: targetScore, label: `TARGET ${rule.targetMetricAbbreviation}`, color: rule.graphColor, dashed: true }
      ];

  const historicalData = useMemo(() => {
    if (!isParliamentDissolved || hoveredHistoryTurn === null) return currentHistogramData;
    return Array.from({ length: 11 }, (_, i) => {
      const name = i.toString();
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
      
      if (improveCount > 0) segments.push({ label: 'Improved', value: improveCount, color: (IMPACT_COLORS as any)['Will improve'] });
      if (stableCount > 0) segments.push({ label: 'Stable', value: stableCount, color: (IMPACT_COLORS as any)['Will be stable'] });
      if (worsenCount > 0) segments.push({ label: 'Worsened', value: worsenCount, color: (IMPACT_COLORS as any)['Will be worsened'] });

      return { name, count: binCount, segments };
    });
  }, [population, hoveredHistoryTurn, isParliamentDissolved, currentCycle, currentHistogramData]);

  const forecastHistogramData = (selectedPolicy && !isParliamentDissolved)
    ? previewPopulation.reduce((acc, r) => {
        const bin = Math.min(10, Math.max(0, Math.round(r.currentLS)));
        acc[bin].count++;
        return acc;
      }, Array.from({ length: 11 }, (_, i) => ({ name: i, count: 0 })))
    : currentHistogramData.map(d => ({ name: d.name, count: d.count }));

  const enactedLegislation = useMemo(() => {
    return history.filter(h => h.turn > 1).map(h => {
      const pDetails = availablePolicies.find(pol => pol.id === h.enactedPolicyId);
      return { ...h, description: pDetails?.description };
    });
  }, [history]);

  // Determine highlighted bins for the Top graph
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
                    {isParliamentDissolved ? "Pre-Election Distribution" : "Current Distribution"}
                  </h3>
                </div>
                
                <div className="flex-1 p-3 min-h-0 relative pointer-events-none">
                  <D3Chart 
                    plotType="1D" 
                    chartData={currentChartData}
                    histogramData={currentHistogramData.map(d => ({ name: d.name, count: d.count }))} 
                    xAxisType={AxisVariable.LifeSatisfaction}
                    yAxisType={rule.yAxisType} 
                    color="#d4d4d8"
                    markers={activeMarkers} 
                    visualStyle={'faces'}
                    yAxisMax={yAxisMax}
                    faceCols={2}
                    highlightBins={highlightedBins}
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
                          Hover over a policy in your Enacted Legislation to review its historical impact on the distribution.
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
                    {isParliamentDissolved ? "Pre-Election Distribution" : "Current Distribution"}
                  </h3>
                </div>
                
                <div className="flex-1 p-3 min-h-0 relative pointer-events-none">
                  <D3Chart 
                    plotType="1D" 
                    chartData={currentChartData}
                    histogramData={isParliamentDissolved && hoveredHistoryTurn !== null ? historicalData : currentHistogramData.map(d => ({ name: d.name, count: d.count }))} 
                    xAxisType={AxisVariable.LifeSatisfaction}
                    yAxisType={rule.yAxisType} 
                    color="#d4d4d8"
                    markers={activeMarkers} 
                    visualStyle={isParliamentDissolved && hoveredHistoryTurn !== null ? 'solid' : 'faces'}
                    yAxisMax={yAxisMax}
                    faceCols={2}
                    highlightBins={highlightedBins}
                  />
                </div>
              </div>

              {/* BOTTOM: Projected Distribution */}
              <div className="bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden transition-all group">
                <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-100 rounded-t-xl flex justify-between items-center shrink-0">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-900 truncate pr-2">
                    {isParliamentDissolved ? "Historical Policy Impact" : "Projected Distribution"}
                  </h3>
                </div>
                
                <div className="flex-1 p-3 pb-0 min-h-0 relative">
                  <div className="absolute inset-0 p-3 pb-0 pointer-events-none">
                    <D3Chart 
                      plotType="1D" 
                      chartData={[]}
                      histogramData={isParliamentDissolved && hoveredHistoryTurn !== null ? historicalData : forecastHistogramData} 
                      xAxisType={AxisVariable.LifeSatisfaction}
                      yAxisType={rule.yAxisType} 
                      color="#ec4899"
                      visualStyle={isParliamentDissolved && hoveredHistoryTurn !== null ? 'solid' : 'faces'} 
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
                          Hover over a policy in your Enacted Legislation to review its historical impact on the distribution.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {isParliamentDissolved && (
                  <div className={`px-4 pb-3 flex flex-wrap gap-4 justify-center border-t border-zinc-50 pt-2 shrink-0 transition-all duration-300 ${(hoveredHistoryTurn !== null) ? 'opacity-100' : 'opacity-0 grayscale pointer-events-none hidden'}`}>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: (IMPACT_COLORS as any)['Will improve'] }} />
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight">Improved</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: (IMPACT_COLORS as any)['Will be stable'] }} />
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight">Stable</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: (IMPACT_COLORS as any)['Will be worsened'] }} />
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight">Worsened</span>
                    </div>
                  </div>
                )}
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
          
          <div ref={agendaListRef} className={`flex-1 flex flex-col gap-2 min-h-0 overflow-hidden relative ${isParliamentDissolved ? 'p-3' : 'p-2'}`}>
            
            {!isParliamentDissolved ? (
              currentDeck.slice(0, 4).map((policy, index) => {
                const isSelected = selectedPolicy?.id === policy.id;
                const isOtherSelectedAndOpen = selectedPolicy && !isSelected && detailsOpen;

                return (
                  <div key={policy.id} className={`relative flex w-full min-h-0 transition-all duration-500 ${isSelected ? 'flex-[1.4] z-50' : 'flex-1 z-10'} ${isOtherSelectedAndOpen ? 'blur-[2px] opacity-40' : ''}`}>
                    
                    <div 
                      className={`w-full h-full flex rounded-xl border transition-all duration-300 overflow-hidden relative ${
                        isSelected ? 'border-pink-500 bg-pink-50 shadow-md' : 'border-zinc-200 hover:border-zinc-300 hover:shadow-sm bg-white'
                      } ${
                        isSelected && pulsePolicy ? 'scale-[1.02] ring-4 ring-pink-500 animate-pulse' : isSelected ? 'ring-2 ring-pink-500/20' : ''
                      } ${isEnacting && 'opacity-50'}`}
                    >
                      {/* Left pink bar overlay */}
                      {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-pink-500" />}

                      {/* Main Clickable Area */}
                      <button 
                        disabled={!isAgendaUnlocked || isEnacting}
                        onClick={() => {
                          if (isOtherSelectedAndOpen) {
                            setDetailsOpen(false);
                            setSelectedPolicy(null);
                          } else {
                            setSelectedPolicy(isSelected ? null : policy);
                            setDetailsOpen(false); 
                          }
                        }}
                        className={`flex-1 flex flex-col justify-center items-start text-left ${textScale.pad} h-full cursor-pointer disabled:cursor-not-allowed ${isSelected ? 'pl-4' : ''} overflow-hidden w-full`}
                      >
                        {/* Top Section: Title & Optional Preview Tag */}
                        <div className={`w-full ${textScale.gap} ${isSelected ? 'pl-2' : ''} transition-all duration-300 shrink-0`}>
                          <div className="flex justify-between items-start w-full gap-2">
                            <p className={`font-bold ${textScale.title} leading-tight pr-2 ${isSelected ? 'text-pink-900' : 'text-zinc-800'} line-clamp-2`}>
                              {policy.policyName}
                            </p>
                          </div>
                        </div>

                        {/* Bottom Section: Description */}
                        <div className="flex-1 min-h-0 overflow-hidden w-full">
                          <p className={`w-full ${textScale.body} leading-relaxed ${isSelected ? 'line-clamp-4 md:line-clamp-none text-pink-700/80 pl-2' : 'line-clamp-2 text-zinc-500'} transition-all duration-300`}>
                            {policy.description}
                          </p>
                        </div>
                      </button>

                      {/* Right Action Side Panel */}
                      {isSelected && (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailsOpen(!detailsOpen);
                          }}
                          className={`w-[15%] min-w-[70px] border-l border-pink-200 flex flex-col justify-center items-center p-2 bg-pink-100/40 hover:bg-pink-100 cursor-pointer transition-colors text-center group/btn relative shrink-0`}
                        >
                          <span className="text-[10px] font-black uppercase tracking-wider text-pink-600 group-hover/btn:text-pink-800 selection:bg-transparent select-none leading-tight">
                            {detailsOpen ? 'Hide\nDetails' : 'View\nDetails'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* DETAILS POP-UP */}
                    {isSelected && detailsOpen && (
                      <div className={`absolute left-0 right-0 bg-white/95 backdrop-blur-md border border-pink-300 shadow-2xl rounded-xl p-4 flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200 z-[100] ${
                        index > 1 ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]'
                      }`}>
                        <span className="text-[10px] font-black uppercase tracking-widest text-pink-500">Policy Rules</span>
                        <div className="flex flex-col gap-2">
                          {policy.specificRules.map((r: any, rIdx: number) => {
                            const lsRange = r.affectEveryone 
                              ? 'All citizens' 
                              : r.minLS !== undefined && r.maxLS !== undefined 
                                ? `LS ${r.minLS} - ${r.maxLS}` 
                                : r.minLS !== undefined 
                                  ? `LS ≥ ${r.minLS}` 
                                  : r.maxLS !== undefined 
                                    ? `LS ≤ ${r.maxLS}` 
                                    : 'All citizens';

                            const eligible = population.filter((p: any) => 
                              (r.affectEveryone) || 
                              (
                                (r.minLS === undefined || p.currentLS >= r.minLS) &&
                                (r.maxLS === undefined || p.currentLS <= r.maxLS)
                              )
                            ).length;
                            
                            const coverage = Math.round(eligible * r.proportion);
                            const coveragePercentage = Math.round((coverage / population.length) * 100);

                            return (
                              <React.Fragment key={rIdx}>
                                {rIdx > 0 && <div className="h-px w-full bg-pink-200/50 my-1 rounded-full" />}
                                <div className="bg-zinc-50 rounded-lg border border-zinc-100 overflow-hidden shadow-sm">
                                  <div className="flex justify-between items-center gap-2 px-2.5 pt-2.5 pb-1.5">
                                    <span className="font-bold text-[11px] text-zinc-800 leading-snug">{r.note}</span>
                                    <span className={`font-black text-[11px] shrink-0 ${r.impact > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                      {r.impact > 0 ? '+' : ''}{r.impact} LS
                                    </span>
                                  </div>
                                  <div className="flex gap-2 px-2.5 pb-2 border-t border-zinc-100 pt-1.5">
                                    <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Range</span>
                                    <span className="text-[11px] font-bold text-zinc-600">{lsRange}</span>
                                    <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400 ml-auto">Coverage</span>
                                    <span className="text-[11px] font-bold text-zinc-600">~{coveragePercentage}% of the entire population</span>
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
                          index < 2 ? 'top-[calc(100%+8px)]' : 'bottom-[calc(100%+8px)]'
                        }`}>
                          <span className="text-[12px] font-black uppercase tracking-widest text-pink-500">Details</span>
                          
                          <div className="flex flex-col gap-1.5">
                            {fullPolicy.specificRules.map((r: any, rIdx: number) => (
                              <React.Fragment key={rIdx}>
                                {rIdx > 0 && <div className="h-px w-full bg-pink-200/50 my-1 rounded-full" />}
                                <div className="bg-zinc-50 p-2.5 rounded-lg border border-zinc-100 flex flex-col gap-1 shadow-sm">
                                  <div className="flex justify-between items-center gap-2">
                                    <span className="font-bold text-[13px] text-zinc-800 leading-snug">{r.note}</span>
                                    <span className={`font-black text-[13px] shrink-0 ${r.impact > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                      {r.impact > 0 ? '+' : ''}{r.impact} LS
                                    </span>
                                  </div>
                                </div>
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          <div className="p-4 border-t border-zinc-100 bg-zinc-100 shrink-0">
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