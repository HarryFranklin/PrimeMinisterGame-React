import { useMemo } from "react";
import { useGame, useUI } from "../../context/GameStateContext";
import { FRAMEWORK_RULES } from "../../utils/frameworkRules";
import { AxisVariable, ElectionCycle } from "../../utils/types";
import { IMPACT_COLORS } from "../../utils/uiHelpers";
import D3Chart, { ChartMarker } from "../D3Chart";
import DPMCard from "../DPMCard";

export default function DashboardTab() {
  const { setActiveTab, pulsePolicy } = useUI();
  const {
    currentCycle, currentTurn, currentChartData, previewChartData, currentHistogramData,
    selectedPolicy, turnMetricScore, currentDeck, setSelectedPolicy, handleApplyPolicy, 
    approvalRating, cycleMAO, isAgendaUnlocked, setIsAgendaUnlocked, yAxisMax,
    population, previewPopulation
  } = useGame();

  const rule = FRAMEWORK_RULES[currentCycle];
  const targetScore = cycleMAO * rule.winThresholdScalar;

  const activeMarkers: ChartMarker[] = [];
  if (currentCycle === ElectionCycle.Benthamite) {
    activeMarkers.push({ value: turnMetricScore, label: "Current Average", color: "#3f3f46", dashed: false, hideLabelText: true });
    activeMarkers.push({ value: targetScore, label: "Target Average", color: rule.graphColor, dashed: true, hideLabelText: true });
  } else if (currentCycle === ElectionCycle.Rawlsian) {
    activeMarkers.push({ value: turnMetricScore, label: "Current Floor", color: "#3f3f46", dashed: false, hideLabelText: true });
    activeMarkers.push({ value: targetScore, label: "Target Floor", color: rule.graphColor, dashed: true, hideLabelText: true });
  }

  // Calculates Wellbeing Impact based on Life Satisfaction trajectory
  const stackedData = useMemo(() => {
    return Array.from({ length: 11 }, (_, i) => {
      const name = i.toString();
      const residentsInBin = population.filter(r => Math.min(10, Math.max(0, Math.round(r.currentLS))) === i);
      const segments: any[] = [];

      if (selectedPolicy) {
        const improveCount = residentsInBin.filter(r => {
          const idx = population.indexOf(r);
          return previewPopulation[idx].currentLS - r.currentLS > 0.05;
        }).length;

        const worsenCount = residentsInBin.filter(r => {
          const idx = population.indexOf(r);
          return previewPopulation[idx].currentLS - r.currentLS < -0.05;
        }).length;

        const stableCount = residentsInBin.length - improveCount - worsenCount;

        if (improveCount > 0) segments.push({ label: 'Will improve', value: improveCount, color: (IMPACT_COLORS as any)['Will improve'] });
        if (stableCount > 0) segments.push({ label: 'Will be stable', value: stableCount, color: (IMPACT_COLORS as any)['Will be stable'] });
        if (worsenCount > 0) segments.push({ label: 'Will be worsened', value: worsenCount, color: (IMPACT_COLORS as any)['Will be worsened'] });
      } else {
        segments.push({ label: "Residents", value: residentsInBin.length, color: "#d4d4d8" });
      }
      return { name, count: residentsInBin.length, segments };
    });
  }, [population, previewPopulation, selectedPolicy]);

  return (
    <div className="flex flex-col gap-4 lg:gap-6 h-full min-h-0 overflow-hidden animate-in fade-in duration-300">
      <div className="grid grid-cols-12 gap-4 lg:gap-6 flex-1 min-h-0 overflow-hidden">
        
        {/* LEFT COLUMN: Stacked Graphs (4 Cols wide) */}
        <div className="col-span-4 flex flex-col gap-4 lg:gap-6 h-full min-h-0 overflow-hidden">
          
          {/* TOP: Current Distribution */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden transition-all group">
            <div 
              onClick={() => setActiveTab('graphs')} 
              className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50 rounded-t-xl flex justify-between items-center shrink-0 cursor-pointer hover:bg-zinc-100 transition-colors"
            >
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-800">Current Life Satisfaction Distribution</h3>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 group-hover:text-zinc-800 transition-colors">
                <path d="M7 17l9.2-9.2M17 17V7H7"/>
              </svg>
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
            <div 
              onClick={() => setActiveTab('electorate')} 
              className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50 rounded-t-xl flex justify-between items-center shrink-0 cursor-pointer hover:bg-zinc-100 transition-colors"
            >
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-800">
                {selectedPolicy ? "Wellbeing Impact Forecast" : "Wellbeing Forecast"}
              </h3>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400 group-hover:text-zinc-800 transition-colors">
                <path d="M7 17l9.2-9.2M17 17V7H7"/>
              </svg>
            </div>
            
            <div className="flex-1 p-3 pb-0 min-h-0 relative pointer-events-none">
              <D3Chart 
                plotType="1D" 
                chartData={[]}
                histogramData={stackedData} 
                xAxisType={AxisVariable.LifeSatisfaction}
                yAxisType={rule.yAxisType} 
                color="#d4d4d8"
                visualStyle={'solid'} 
                yAxisMax={yAxisMax}
              />
              
              {!selectedPolicy && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px] rounded-b-xl z-10 animate-in fade-in duration-300">
                  <div className="bg-white px-5 py-4 rounded-xl shadow-lg border border-zinc-200 text-center max-w-[250px]">
                    <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-zinc-400 text-lg">📄</span>
                    </div>
                    <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-widest mb-1">Awaiting Policy</h4>
                    <p className="text-xs text-zinc-500 font-medium">
                      Select a policy from the Legislative Agenda to forecast its impact.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 3-Colour Legend (Always visible to prevent layout shift) */}
            <div className={`px-4 pb-3 flex flex-wrap gap-4 justify-center border-t border-zinc-50 pt-2 shrink-0 transition-all duration-300 ${selectedPolicy ? 'opacity-100' : 'opacity-40 grayscale'}`}>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: (IMPACT_COLORS as any)['Will improve'] }} />
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight">Will Improve</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: (IMPACT_COLORS as any)['Will be stable'] }} />
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight">Stable</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: (IMPACT_COLORS as any)['Will be worsened'] }} />
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight">Will Worsen</span>
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: DPM & Approval (4 Cols) */}
        <div className="col-span-4 flex flex-col gap-4 lg:gap-6 h-full min-h-0 overflow-hidden">
          <DPMCard 
            currentCycle={currentCycle} 
            currentTurn={currentTurn}
            isAgendaUnlocked={isAgendaUnlocked}
            setIsAgendaUnlocked={setIsAgendaUnlocked}
            selectedPolicy={selectedPolicy}
          />

          <div onClick={() => setActiveTab('electorate')} className="bg-zinc-900 rounded-xl shadow-lg p-5 flex flex-col items-center justify-center shrink-0 h-36 lg:h-40 relative overflow-hidden cursor-pointer hover:bg-black transition-colors group">
            <div className="absolute top-0 left-0 w-full h-1.5" style={{backgroundColor: rule.graphColor}} />
            <p className="text-xs lg:text-sm font-bold uppercase tracking-widest text-zinc-400 mb-1">Public Approval</p>
            <p className={`text-5xl lg:text-6xl font-black tracking-tighter transition-colors duration-500 ${approvalRating >= 51 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {approvalRating.toFixed(1)}%
            </p>
            <p className="text-sm text-zinc-500 mt-2 text-center px-4">
              Requirement: <strong className="text-zinc-300">51.0%</strong>
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Legislative Agenda (4 Cols) */}
        <div className="col-span-4 flex flex-col bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden h-full min-h-0">
          <div className="p-3 border-b border-zinc-100 bg-zinc-50/50 shrink-0">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-800">Legislative Agenda</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Select a policy to forecast its impact.</p>
          </div>
          
          <div className="flex-1 flex flex-col p-2 gap-2 min-h-0 overflow-hidden relative">
            
            {/* IN-TRAY LOCK OVERLAY */}
            {!isAgendaUnlocked && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-50/80 backdrop-blur-[2px] z-10 px-6 animate-in fade-in duration-300">
                <div className="relative w-full max-w-[220px] h-32 mb-4">
                  {Array.from({length: 4}).map((_, i) => (
                    <div 
                      key={i} 
                      className="absolute top-0 left-0 right-0 bg-white border border-zinc-200 rounded-xl shadow-sm transition-all"
                      style={{ 
                        height: '70px', 
                        transform: `translateY(${i * 8}px) scale(${1 - i * 0.04})`, 
                        zIndex: 10 - i,
                        opacity: 1 - i * 0.1
                      }} 
                    />
                  ))}
                </div>
                <div className="relative z-20 text-center bg-white p-4 rounded-xl shadow-md border border-zinc-200">
                  <span className="text-2xl block mb-1">🔒</span>
                  <h4 className="font-bold text-zinc-800 text-xs uppercase tracking-widest">Unfiltered Policy Options</h4>
                  <p className="text-xs text-zinc-500 mt-1 font-medium">Review the Deputy Prime Minister's briefing to unlock policies.</p>
                </div>
              </div>
            )}

            {currentDeck.slice(0, 4).map((policy) => {
              const isSelected = selectedPolicy?.id === policy.id;
              return (
                <button
                  key={policy.id}
                  disabled={!isAgendaUnlocked}
                  onClick={() => setSelectedPolicy(selectedPolicy?.id === policy.id ? null : policy)}
                  className={`relative shrink-0 flex-1 flex flex-col justify-start items-start w-full text-left p-4 rounded-xl border transition-all duration-300 group overflow-hidden ${
                    isSelected ? 'border-pink-500 bg-pink-50 shadow-md' : 'border-zinc-200 hover:border-zinc-300 hover:shadow-sm bg-white'
                  } ${
                    isSelected && pulsePolicy ? 'scale-[1.02] ring-4 ring-pink-500 animate-pulse' : isSelected ? 'ring-2 ring-pink-500/20' : ''
                  }`}
                >
                  {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-pink-500 rounded-l-xl" />}
                  <p className={`font-bold text-base lg:text-lg leading-tight mb-2 ${isSelected ? 'text-pink-900' : 'text-zinc-800'}`}>
                    {policy.policyName}
                  </p>
                  <p className={`text-sm leading-relaxed ${isSelected ? 'text-pink-700/80' : 'text-zinc-500'}`}>
                    {policy.description}
                  </p>
                </button>
              );
            })}
          </div>
          
          <div className="p-3 border-t border-zinc-100 bg-zinc-50 shrink-0">
            <button 
              onClick={handleApplyPolicy}
              disabled={!selectedPolicy || !isAgendaUnlocked}
              className="w-full py-3 bg-zinc-900 text-white text-sm font-bold rounded-xl hover:bg-black disabled:bg-zinc-300 disabled:cursor-not-allowed transition-all shadow-md"
            >
              Enact Policy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}