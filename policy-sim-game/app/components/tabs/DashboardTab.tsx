import { useMemo, useState, useEffect, useLayoutEffect, useRef } from "react";
import { useGame, useUI } from "../../context/GameStateContext";
import { FRAMEWORK_RULES } from "../../utils/frameworkRules";
import { AxisVariable, Respondent } from "../../utils/types";
import { IMPACT_COLORS } from "../../utils/uiHelpers";
import { availablePolicies } from "../../data/policies";
import D3Chart from "../D3Chart";
import DPMCard from "../DPMCard";

// Component for the animated historical pop-up
const HistoricalImpactPopup = ({ turn, population, currentCycle, policyName, rule, yAxisMax }: any) => {
  const [showAfter, setShowAfter] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setShowAfter(prev => !prev);
    }, 1500); // Toggles between before/after every 1.5 seconds
    return () => clearInterval(interval);
  }, []);

  const histBefore = useMemo(() => {
    const popBefore = population.map((r: Respondent) => {
      const ledger = r.historicalLedger.find((l: any) => l.cycle === currentCycle);
      const tData = ledger?.turns.find((t: any) => t.turn === turn - 1);
      return { currentLS: tData ? tData.ls : r.currentLS };
    });
    return Array.from({ length: 11 }, (_, i) => ({
      name: i, count: popBefore.filter((r: { currentLS: number }) => Math.round(r.currentLS) === i).length
    }));
  }, [population, currentCycle, turn]);

  const histAfter = useMemo(() => {
    const popAfter = population.map((r: Respondent) => {
      const ledger = r.historicalLedger.find((l: any) => l.cycle === currentCycle);
      const tData = ledger?.turns.find((t: any) => t.turn === turn);
      return { currentLS: tData ? tData.ls : r.currentLS };
    });
    return Array.from({ length: 11 }, (_, i) => ({
      name: i, count: popAfter.filter((r: { currentLS: number }) => Math.round(r.currentLS) === i).length
    }));
  }, [population, currentCycle, turn]);

  return (
    <div className="absolute right-full mr-4 top-0 w-[360px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-zinc-200 p-5 z-[100] animate-in fade-in zoom-in-95 duration-200 overflow-hidden pointer-events-none">
      <div className="flex justify-between items-center mb-3">
         <h4 className="font-bold text-zinc-900 text-sm truncate pr-4">{policyName}</h4>
         <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md transition-colors shrink-0 ${showAfter ? 'bg-pink-100 text-pink-700' : 'bg-zinc-200 text-zinc-600'}`}>
            {showAfter ? 'After' : 'Before'}
         </span>
      </div>
      <div className="h-[220px]">
         <D3Chart
           plotType="1D" chartData={[]}
           histogramData={showAfter ? histAfter : histBefore}
           xAxisType={AxisVariable.LifeSatisfaction} yAxisType={rule.yAxisType}
           color={showAfter ? rule.graphColor : "#d4d4d8"}
           visualStyle="faces" yAxisMax={yAxisMax} faceCols={2}
         />
      </div>
    </div>
  );
}

export default function DashboardTab() {
  const { pulsePolicy } = useUI();
  const {
    currentCycle, currentTurn, currentChartData, previewChartData, currentHistogramData,
    selectedPolicy, turnMetricScore, currentDeck, setSelectedPolicy, handleApplyPolicy, 
    turnApprovalRating: approvalRating, cycleMAO, isAgendaUnlocked, yAxisMax, isEnacting,
    population, previewPopulation, isParliamentDissolved, history, handleFaceElectorate
  } = useGame();

  const rule = FRAMEWORK_RULES[currentCycle];
  const targetScore = cycleMAO * rule.winThresholdScalar;

  const [displayApproval, setDisplayApproval] = useState(approvalRating);
  const [hoveredHistoryTurn, setHoveredHistoryTurn] = useState<number | null>(null);

  const [forecastedPolicies, setForecastedPolicies] = useState<Set<string>>(new Set());
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Dynamic Scaling State & Ref
  const [scaleLevel, setScaleLevel] = useState(0);
  const agendaListRef = useRef<HTMLDivElement>(null);

  // Reset scale when policies change or window is resized
  useEffect(() => {
    const handleResize = () => setScaleLevel(0);
    window.addEventListener('resize', handleResize);
    setScaleLevel(0);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentDeck, isParliamentDissolved]);

  // Synchronous loop before browser paint to check if items overflow
  useLayoutEffect(() => {
    const el = agendaListRef.current;
    if (!el) return;

    // A 2px buffer accounts for browser calculation rounding errors
    if (el.scrollHeight > el.clientHeight + 2 && scaleLevel < 4) {
      setScaleLevel(prev => prev + 1);
    }
  }, [scaleLevel, currentDeck, isParliamentDissolved]);

  // Sizing tiers
  const scaleConfigs = [
    { title: 'text-base lg:text-lg', body: 'text-sm', pad: 'p-4', gap: 'mb-1' },     // Level 0 (Default)
    { title: 'text-sm lg:text-base', body: 'text-xs', pad: 'p-3', gap: 'mb-0.5' },   // Level 1
    { title: 'text-xs lg:text-sm', body: 'text-[11px]', pad: 'p-2.5', gap: 'mb-0.5' }, // Level 2
    { title: 'text-[11px] lg:text-xs', body: 'text-[10px]', pad: 'p-2', gap: 'mb-0' },   // Level 3
    { title: 'text-[10px] lg:text-[11px]', body: 'text-[9px]', pad: 'p-1.5', gap: 'mb-0' } // Level 4
  ];
  const textScale = scaleConfigs[Math.min(scaleLevel, 4)];

  useEffect(() => {
    setForecastedPolicies(new Set());
  }, [currentTurn, currentCycle]);

  const isForecasted = selectedPolicy ? forecastedPolicies.has(selectedPolicy.id) : false;
  const forecastsRemaining = 2 - forecastedPolicies.size;

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
        { value: turnMetricScore, label: "CURRENT", color: "#3f3f46", dashed: false },
        { value: targetScore, label: "TARGET", color: rule.graphColor, dashed: true }
      ];

  const stackedData = useMemo(() => {
    return Array.from({ length: 11 }, (_, i) => {
      const name = i.toString();
      let binCount = 0;
      const segments: any[] = [];

      // MODE A: Historical Hover Mode Restored Entirely
      if (isParliamentDissolved && hoveredHistoryTurn !== null) {
        const residentsInBinBefore = population.filter((r: Respondent) => {
          const ledger = r.historicalLedger.find((l: any) => l.cycle === currentCycle);
          if (!ledger) return false;
          const turnData = ledger.turns.find((t: any) => t.turn === hoveredHistoryTurn - 1);
          return turnData && Math.min(10, Math.max(0, Math.round(turnData.ls))) === i;
        });
        
        binCount = residentsInBinBefore.length;
        
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
      } 
      // MODE B: Standard Future Preview Mode
      else {
        const residentsInBin = population.filter((r: Respondent) => Math.min(10, Math.max(0, Math.round(r.currentLS))) === i);
        binCount = residentsInBin.length;

        if (selectedPolicy) {
          const improveCount = residentsInBin.filter((r: Respondent) => {
            const idx = population.indexOf(r);
            return previewPopulation[idx].currentLS - r.currentLS > 0.05;
          }).length;
          
          const worsenCount = residentsInBin.filter((r: Respondent) => {
            const idx = population.indexOf(r);
            return previewPopulation[idx].currentLS - r.currentLS < -0.05;
          }).length;
          
          const stableCount = binCount - improveCount - worsenCount;
          
          if (improveCount > 0) segments.push({ label: 'Will improve', value: improveCount, color: (IMPACT_COLORS as any)['Will improve'] });
          if (stableCount > 0) segments.push({ label: 'Will be stable', value: stableCount, color: (IMPACT_COLORS as any)['Will be stable'] });
          if (worsenCount > 0) segments.push({ label: 'Will be worsened', value: worsenCount, color: (IMPACT_COLORS as any)['Will be worsened'] });
        }
      }
      
      return { name, count: binCount, segments };
    });
  }, [population, previewPopulation, selectedPolicy, hoveredHistoryTurn, isParliamentDissolved, currentCycle]);

  // If a policy is selected but not forecasted, render the graph using current state in grey
  const displayStackedData = (selectedPolicy && !isForecasted && !isParliamentDissolved)
    ? currentHistogramData.map(d => ({ 
        name: d.name, 
        count: d.count, 
        segments: [{ label: 'Will be stable', value: d.count, color: (IMPACT_COLORS as any)['Will be stable'] }] 
      }))
    : stackedData;

  const enactedLegislation = useMemo(() => {
    return history.filter(h => h.turn > 1).map(h => {
      const pDetails = availablePolicies.find(pol => pol.id === h.enactedPolicyId);
      return { ...h, description: pDetails?.description };
    });
  }, [history]);

  const hoveredPolicyName = useMemo(() => {
    if (hoveredHistoryTurn === null) return null;
    return history.find(h => h.turn === hoveredHistoryTurn)?.enactedPolicyName;
  }, [hoveredHistoryTurn, history]);

  return (
    <div className="flex flex-col gap-4 lg:gap-6 h-full min-h-0 overflow-hidden animate-in fade-in duration-300">
      <div className="grid grid-cols-12 gap-4 lg:gap-6 flex-1 min-h-0 overflow-hidden">
        
        {/* LEFT COLUMN: Stacked Graphs */}
        <div className="col-span-4 flex flex-col gap-4 lg:gap-6 h-full min-h-0 overflow-hidden">
          
          {/* TOP: Current Distribution */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden transition-all group">
            <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-100 rounded-t-xl flex justify-between items-center shrink-0">
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-900">Current Distribution</h3>
            </div>
            
            <div className="flex-1 p-3 pb-0 min-h-0 relative pointer-events-none">
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
              />
            </div>
            
            <div className="px-4 pb-3 flex flex-wrap gap-3 justify-center border-t border-zinc-50 pt-2 shrink-0">
              {activeMarkers.map((marker, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <svg width="16" height="4" className="shrink-0">
                    <line x1="0" y1="2" x2="16" y2="2" stroke={marker.color || '#3f3f46'} strokeWidth="2" strokeDasharray={marker.dashed ? "4,2" : "none"} />
                  </svg>
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight">{marker.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* BOTTOM: Wellbeing Impact Forecast */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden transition-all group">
            <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-100 rounded-t-xl flex justify-between items-center shrink-0">
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-900 truncate pr-2">
                {hoveredPolicyName ? `Historical Impact: ${hoveredPolicyName}` : selectedPolicy ? "Wellbeing Impact Forecast" : "Wellbeing Forecast"}
              </h3>
            </div>
            
            <div className="flex-1 p-3 pb-0 min-h-0 relative">
              <div className="absolute inset-0 p-3 pb-0 pointer-events-none">
                <D3Chart 
                  plotType="1D" 
                  chartData={[]}
                  histogramData={displayStackedData} 
                  xAxisType={AxisVariable.LifeSatisfaction}
                  yAxisType={rule.yAxisType} 
                  color="#d4d4d8"
                  visualStyle={'solid'} 
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

              {/* FORECAST BUDGET OVERLAY */}
              {selectedPolicy && !isForecasted && !isParliamentDissolved && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-b-xl z-10 animate-in fade-in duration-300 pointer-events-auto">
                  <div className="bg-white px-5 py-4 rounded-xl shadow-xl border border-zinc-200 text-center max-w-[280px]">
                    <div className="w-10 h-10 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-2 border border-pink-100">
                      <span className="text-pink-500 text-lg">📊</span>
                    </div>
                    <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-widest mb-1">Impact Unknown</h4>
                    <p className="text-xs text-zinc-500 font-medium mb-4">
                      You have <strong className="text-pink-600">{forecastsRemaining}</strong> forecast{forecastsRemaining !== 1 ? 's' : ''} remaining this turn.
                    </p>
                    <button 
                      onClick={() => {
                        if (forecastsRemaining > 0 && selectedPolicy) {
                          setForecastedPolicies(prev => new Set(prev).add(selectedPolicy.id));
                        }
                      }}
                      disabled={forecastsRemaining === 0}
                      className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all shadow-md ${forecastsRemaining > 0 ? 'bg-pink-600 text-white hover:bg-pink-700 cursor-pointer' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'}`}
                    >
                      {forecastsRemaining > 0 ? 'Run Data Forecast' : 'Out of Forecasts'}
                    </button>
                  </div>
                </div>
              )}

              {isParliamentDissolved && hoveredHistoryTurn === null && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px] rounded-b-xl z-10 animate-in fade-in duration-300 pointer-events-auto">
                  <div className="bg-white px-5 py-4 rounded-xl shadow-lg border border-zinc-200 text-center max-w-[280px]">
                    <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-zinc-400 text-lg">⏳</span>
                    </div>
                    <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-widest mb-1">Interactive History</h4>
                    <p className="text-xs text-zinc-500 font-medium">
                      Hover over enacted legislation in the right panel to view its historical impact on the population.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Fade out the legend if the policy isn't forecasted yet */}
            <div className={`px-4 pb-3 flex flex-wrap gap-4 justify-center border-t border-zinc-50 pt-2 shrink-0 transition-all duration-300 ${((selectedPolicy && isForecasted) || hoveredHistoryTurn !== null) ? 'opacity-100' : 'opacity-30 grayscale'}`}>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: (IMPACT_COLORS as any)['Will improve'] }} />
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight">{hoveredHistoryTurn ? 'Improved' : 'Will Improve'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: (IMPACT_COLORS as any)['Will be stable'] }} />
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight">Stable</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: (IMPACT_COLORS as any)['Will be worsened'] }} />
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight">{hoveredHistoryTurn ? 'Worsened' : 'Will Worsen'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: DPM & Approval (Remains Unchanged) */}
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
          
          {hoveredHistoryTurn && isParliamentDissolved && (
            <HistoricalImpactPopup 
              turn={hoveredHistoryTurn} 
              population={population} 
              currentCycle={currentCycle} 
              policyName={hoveredPolicyName} 
              rule={rule} 
              yAxisMax={yAxisMax} 
            />
          )}

          <div className="p-4 border-b border-zinc-200 bg-zinc-100 shrink-0 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-zinc-900 tracking-tight">
                {isParliamentDissolved ? "Enacted Legislation" : "Legislative Agenda"}
              </h3>
              <p className="text-sm text-zinc-600 mt-1">
                {isParliamentDissolved ? "The policies enacted during your term." : "Select a policy to review its details."}
              </p>
            </div>
          </div>
          
          <div ref={agendaListRef} className={`flex-1 flex flex-col gap-2 min-h-0 overflow-hidden relative ${isParliamentDissolved ? 'p-3' : 'p-2'}`}>
            
            {!isParliamentDissolved ? (
              currentDeck.slice(0, 4).map((policy, index) => {
                const isSelected = selectedPolicy?.id === policy.id;
                const isPolForecasted = forecastedPolicies.has(policy.id);
                const isOtherSelectedAndOpen = selectedPolicy && !isSelected && detailsOpen;

                return (
                  <div key={policy.id} className={`relative flex flex-1 w-full min-h-0 transition-all duration-500 ${isSelected ? 'z-50' : 'z-10'} ${isOtherSelectedAndOpen ? 'blur-[2px] opacity-40 pointer-events-none' : ''}`}>
                    
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
                          setSelectedPolicy(isSelected ? null : policy);
                          setDetailsOpen(false); 
                        }}
                        className={`flex-1 flex flex-col justify-between items-start text-left ${textScale.pad} h-full cursor-pointer disabled:cursor-not-allowed ${isSelected ? 'pl-4' : ''}`}
                      >
                        {/* Top Section: Title & Optional Preview Tag */}
                        <div className={`w-full ${textScale.gap} ${isSelected ? 'pl-2' : ''} transition-all duration-300 shrink-0`}>
                          <div className="flex justify-between items-start w-full">
                            <p className={`font-bold ${textScale.title} leading-tight pr-4 ${isSelected ? 'text-pink-900' : 'text-zinc-800'}`}>
                              {policy.policyName}
                            </p>
                            {isPolForecasted && !isSelected && (
                              <span className="shrink-0 bg-pink-100 text-pink-600 text-[9px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-md border border-pink-200">
                                Preview Available
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bottom Section: Description */}
                        <p className={`w-full ${textScale.body} leading-relaxed mt-auto ${isSelected ? 'text-pink-700/80 pl-2 pb-2' : 'text-zinc-500 pb-1'} transition-all duration-300`}>
                          {policy.description}
                        </p>
                      </button>

                      {/* Right Action Side Panel (Exactly 15% width, visible only when selected) */}
                      {isSelected && (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailsOpen(!detailsOpen);
                          }}
                          className={`w-[15%] min-w-[70px] border-l border-pink-200 flex flex-col justify-center items-center p-2 bg-pink-100/40 hover:bg-pink-100 cursor-pointer transition-colors text-center group/btn relative`}
                        >
                          {/* absolute badge placement if it was active */}
                          {isPolForecasted && (
                            <span className="absolute top-2 right-2 left-2 bg-pink-200 text-pink-700 text-[8px] uppercase tracking-wider font-black py-0.5 rounded text-center truncate">
                              Previewed
                            </span>
                          )}
                          
                          <span className="text-[10px] font-black uppercase tracking-wider text-pink-600 group-hover/btn:text-pink-800 selection:bg-transparent select-none leading-tight">
                            {detailsOpen ? 'Hide\nDetails' : 'View\nDetails'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Absolute Details Pop-out Layout */}
                    {isSelected && detailsOpen && (
                      <div 
                        className={`absolute left-0 right-0 z-50 bg-white/95 backdrop-blur-md border border-pink-300 shadow-2xl rounded-xl p-5 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200 ${
                          index < 2 ? 'top-[calc(100%+8px)]' : 'bottom-[calc(100%+8px)]'
                        }`}
                      >
                        <span className="text-xs font-black uppercase tracking-widest text-pink-500 mb-1">Details</span>
                        
                        {policy.specificRules.map((r, rIdx) => (
                          <div key={rIdx} className="bg-white p-3 rounded-lg border border-pink-100 flex flex-col gap-1.5 shadow-sm">
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-bold text-sm text-zinc-800 leading-snug">{r.note}</span>
                              <span className={`font-black text-sm shrink-0 ${r.impact > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {r.impact > 0 ? '+' : ''}{r.impact} LS
                              </span>
                            </div>
                            
                            <div className="text-xs text-zinc-600 flex flex-wrap gap-1 items-center mt-0.5">
                              <span className="font-semibold text-zinc-700">Target Demographic:</span>
                              {r.affectEveryone ? (
                                <span>Entire Population</span>
                              ) : (
                                <>
                                  <span className="bg-white border border-zinc-200 px-1.5 py-0.5 rounded font-medium text-zinc-700">
                                    {r.minLS !== undefined && r.maxLS !== undefined ? `LS ${r.minLS} to ${r.maxLS}` : 
                                     r.minLS !== undefined ? `LS ${r.minLS} and above` :
                                     r.maxLS !== undefined ? `LS ${r.maxLS} and below` : 'All demographics'}
                                  </span>
                                  <span className="text-zinc-500">({Math.round(r.proportion * 100)}% coverage)</span>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                );
              })
            ) : (
              <div className="flex flex-col gap-2.5">
                {enactedLegislation.map((leg, index) => (
                  <div 
                    key={index} 
                    onMouseEnter={() => setHoveredHistoryTurn(leg.turn)}
                    onMouseLeave={() => setHoveredHistoryTurn(null)}
                    className="flex gap-3 items-start bg-white p-3 rounded-lg border border-zinc-200 shadow-sm cursor-pointer hover:border-pink-300 hover:bg-pink-50 transition-colors group"
                  >
                    <div className="w-6 h-6 rounded-full bg-zinc-100 text-zinc-500 group-hover:bg-pink-200 group-hover:text-pink-700 transition-colors flex items-center justify-center text-sm font-black shrink-0 mt-0.5">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900 group-hover:text-pink-900 transition-colors mb-0.5">{leg.enactedPolicyName}</p>
                      <p className="text-sm text-zinc-600 leading-snug line-clamp-2">{leg.description}</p>
                    </div>
                  </div>
                ))}
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