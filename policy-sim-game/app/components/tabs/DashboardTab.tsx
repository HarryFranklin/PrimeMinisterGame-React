import { useMemo, useState } from "react";
import { useGame, useUI } from "../../context/GameStateContext";
import { FRAMEWORK_RULES } from "../../utils/frameworkRules";
import { AxisVariable, ElectionCycle } from "../../utils/types";
import { DEMO_COLORS, IMPACT_COLORS, getMinisterReaction } from "../../utils/uiHelpers";
import D3Chart, { ChartMarker } from "../D3Chart";

export default function DashboardTab() {
  const { setActiveTab, isTutorialActive, tutorialStep, pulsePolicy } = useUI();
  
  const {
    currentCycle, currentChartData, previewChartData, currentHistogramData, previewHistogramData,
    ministers, selectedMinister, setSelectedMinister, selectedPolicy, turnMetricScore,
    currentDeck, presentedPolicies, setSelectedPolicy, handleApplyPolicy, approvalRating,
    population, previewPopulation, cycleMAO
  } = useGame();

  const [groupBy, setGroupBy] = useState<'wealth' | 'age'>('wealth');
  const [highlightedMinisters, setHighlightedMinisters] = useState<string[]>([]);

  const rule = FRAMEWORK_RULES[currentCycle];
  const targetScore = cycleMAO * rule.winThresholdScalar;

  const activeMarkers: ChartMarker[] = [];
  if (currentCycle === ElectionCycle.Benthamite) {
    activeMarkers.push({ value: turnMetricScore, label: "Current Mean", color: "#3f3f46", dashed: false, hideLabelText: true });
    activeMarkers.push({ value: targetScore, label: "Target Mean", color: rule.graphColor, dashed: true, hideLabelText: true });
  } else if (currentCycle === ElectionCycle.Rawlsian) {
    activeMarkers.push({ value: turnMetricScore, label: "Current Floor", color: "#3f3f46", dashed: false, hideLabelText: true });
    activeMarkers.push({ value: targetScore, label: "Target Floor", color: rule.graphColor, dashed: true, hideLabelText: true });
  }

  const getTutorialClass = (columnIndex: number) => {
    if (!isTutorialActive) return "relative z-10";
    if (tutorialStep === 3) return "relative z-10 pointer-events-none opacity-40 grayscale-[30%] transition-all duration-500";
    return tutorialStep === columnIndex 
      ? "relative z-[70] transition-all duration-500" 
      : "relative z-10 pointer-events-none opacity-40 grayscale-[30%] transition-all duration-500";
  };

  const getCardHighlight = (columnIndex: number) => {
    return isTutorialActive && tutorialStep === columnIndex 
      ? "ring-4 ring-pink-500/50 shadow-2xl z-20" 
      : "";
  };

  const getGuidedAnalysis = () => {
    switch(currentCycle) {
      case ElectionCycle.Benthamite: 
        return "Benthamite Objective: Maximise total societal happiness. Identify policies that benefit the largest groups. Find a minister to champion the majority.";
      case ElectionCycle.Rawlsian: 
        return "Rawlsian Objective: Raise the societal floor. Identify the demographic with the lowest Life Satisfaction, then select their Minister to sponsor a bill.";
      case ElectionCycle.PersonalUtility: 
        return "Personal Utility Objective: Target groups whose baseline utility gives the highest yield. Sponsor bills through ministers of vulnerable groups.";
      case ElectionCycle.SocietalUtility: 
        return "Societal Utility Objective: Balance actual wellbeing with the population's preferred distribution. Consult ministers to find acceptable compromises.";
      default: return "";
    }
  };

  const stackedData = useMemo(() => {
    return Array.from({ length: 11 }, (_, i) => {
      const name = i.toString();
      const residentsInBin = population.filter(r => Math.min(10, Math.max(0, Math.round(r.currentLS))) === i);
      
      const segments: any[] = [];
      if (selectedPolicy) {
        ['Will be worsened', 'Will be stable', 'Will improve'].forEach(key => {
          const count = residentsInBin.filter(r => {
            const index = population.indexOf(r);
            const delta = previewPopulation[index].currentLS - r.currentLS;
            if (key === 'Will improve') return delta > 0.1125;
            if (key === 'Will be worsened') return delta < -0.05;
            return delta >= -0.05 && delta <= 0.1125;
          }).length;
          if (count > 0) segments.push({ label: key, value: count, color: (IMPACT_COLORS as any)[key] });
        });
      } else {
        const options = groupBy === 'wealth' ? ['Poor', 'Middle', 'Wealthy'] : ['Youth', 'Adult', 'Elderly'];
        options.forEach(key => {
          const count = residentsInBin.filter(r => r.demographics[groupBy] === key).length;
          if (count > 0) segments.push({ label: key, value: count, color: (DEMO_COLORS[groupBy] as any)[key] });
        });
      }

      return {
        name,
        count: residentsInBin.length,
        segments,
        breakdown: currentHistogramData.find(d => d.name === i)?.breakdown || { wealth: {}, age: {} }
      };
    });
  }, [population, previewPopulation, selectedPolicy, groupBy, currentHistogramData]);

  return (
    <div className="flex flex-col gap-4 lg:gap-6 h-full min-h-0 overflow-hidden animate-in fade-in duration-300 relative">
      
      <div className="grid grid-cols-12 gap-4 lg:gap-6 flex-1 min-h-0 overflow-hidden">
        
        {/* LEFT COLUMN: Split Graphs */}
        <div className={`col-span-4 flex flex-col gap-4 lg:gap-6 h-full min-h-0 overflow-hidden ${getTutorialClass(0)}`}>
          <div onClick={() => setActiveTab('graphs')} className={`bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden cursor-pointer hover:border-zinc-300 transition-all group ${getCardHighlight(0)}`}>
            <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50 rounded-t-xl flex justify-between items-center shrink-0">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-800">
                Current Distribution
              </h3>
              <span className="text-zinc-300 group-hover:text-pink-500 font-bold text-lg leading-none">↗</span>
            </div>
            
            {/* IDENTICAL PADDING FOR BOTH GRAPHS */}
            <div className="flex-1 p-3 pb-0 min-h-0 relative">
              <D3Chart 
                plotType="1D" 
                chartData={currentChartData}
                histogramData={currentHistogramData} 
                xAxisType={AxisVariable.LifeSatisfaction}
                yAxisType={rule.yAxisType} 
                color="#d4d4d8"
                ministers={ministers}
                markers={activeMarkers} 
                onHoverMinisters={setHighlightedMinisters}
                visualStyle={'faces'}
              />
            </div>
            
            {/* IDENTICAL LEGEND FOR BOTH GRAPHS */}
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

          <div onClick={() => setActiveTab('electorate')} className={`bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden cursor-pointer hover:border-zinc-300 transition-all group ${getCardHighlight(0)}`}>
            <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50 rounded-t-xl flex justify-between items-center shrink-0">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-800 whitespace-nowrap">
                {selectedPolicy ? "Impact" : "Demographics"}
              </h3>
              <div className="flex items-center gap-3">
                {!selectedPolicy && (
                  <div className="flex bg-zinc-200/50 p-1 rounded-md shrink-0">
                    {(['wealth', 'age'] as const).map(type => (
                      <button 
                        key={type}
                        onClick={(e) => {
                          e.stopPropagation(); 
                          setGroupBy(type);
                        }}
                        className={`px-2 py-1 text-[9px] font-black uppercase rounded transition-all ${
                          groupBy === type ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                )}
                <span className="text-zinc-300 group-hover:text-pink-500 font-bold text-lg leading-none">↗</span>
              </div>
            </div>
            
            {/* IDENTICAL PADDING FOR BOTH GRAPHS */}
            <div className="flex-1 p-3 pb-0 min-h-0 relative">
              <D3Chart 
                plotType="1D" 
                chartData={currentChartData} 
                histogramData={stackedData} 
                xAxisType={AxisVariable.LifeSatisfaction}
                yAxisType={rule.yAxisType}
                isStacked={true}
                ministers={ministers}
                onHoverMinisters={setHighlightedMinisters}
              />
            </div>
            
            {/* IDENTICAL LEGEND FOR BOTH GRAPHS */}
            <div className="px-4 pb-3 flex flex-wrap gap-3 justify-center border-t border-zinc-50 pt-2 shrink-0">
              {(selectedPolicy ? Object.entries(IMPACT_COLORS) : Object.entries(DEMO_COLORS[groupBy])).map(([label, color]) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color as string }} />
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: CABINET */}
        <div className={`col-span-4 flex flex-col gap-4 lg:gap-6 h-full min-h-0 overflow-hidden ${getTutorialClass(1)}`}>
          <div className={`bg-white rounded-xl border border-zinc-200 shadow-sm flex-1 flex flex-col overflow-hidden transition-all group min-h-0 ${getCardHighlight(1)}`}>
            <div className="px-4 py-4 border-b border-zinc-100 bg-zinc-50/50 rounded-t-xl flex justify-between items-start shrink-0">
              <div>
                <h3 className="text-base font-bold uppercase tracking-widest text-zinc-800">The Cabinet</h3>
                <p className="text-sm text-zinc-500 mt-1">Select a minister to sponsor a bill.</p>
              </div>
            </div>
            
            <div className="p-3 grid grid-cols-3 grid-rows-2 gap-3 flex-1 min-h-0">
              {ministers.map((minister, i) => {
                const isReacting = selectedPolicy !== null;
                const reaction = isReacting ? getMinisterReaction(minister.policyDelta || 0) : null;
                const displayEmoji = isReacting ? reaction?.emoji : (minister.status === 'happy' ? '😊' : minister.status === 'neutral' ? '😐' : '😠');
                const displayColor = isReacting && reaction ? reaction.circle : minister.color;
                
                const isSelected = selectedMinister === minister.name;
                const isHighlightedByGraph = highlightedMinisters.includes(minister.name);

                let highlightClasses = "";
                if (isSelected && isHighlightedByGraph) {
                  highlightClasses = "border-pink-500 border-dashed border-[2px] bg-pink-100 shadow-md scale-[1.02] z-20";
                } else if (isSelected) {
                  highlightClasses = "border-pink-500 border-solid border-[2px] bg-pink-100 shadow-md scale-[1.02] z-20";
                } else if (isHighlightedByGraph) {
                  highlightClasses = "border-pink-400 border-dashed border-[2px] bg-pink-50/50 shadow-sm scale-[1.02] z-10";
                } else {
                  highlightClasses = "border-zinc-200 border-solid border bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-300";
                }

                return (
                  <div 
                    key={i} 
                    onClick={() => { 
                      if (selectedMinister === minister.name) {
                        setSelectedMinister(null);
                        setSelectedPolicy(null); 
                      } else {
                        setSelectedMinister(minister.name);
                        setSelectedPolicy(null); 
                      }
                    }}
                    className={`flex flex-col items-center justify-between p-2 rounded-xl cursor-pointer transition-all active:scale-95 relative group/minister h-full min-h-0 ${highlightClasses}`}
                  >
                    {isSelected && (
                      <div className="absolute -top-2.5 right-2 bg-pink-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full z-30 shadow-sm border border-pink-600">
                        SPONSOR
                      </div>
                    )}

                    <div className="flex-1 flex flex-col items-center justify-end w-full pb-1.5">
                      <h4 className="text-[10px] lg:text-xs font-black text-zinc-800 uppercase tracking-widest leading-tight text-center">
                        {minister.name.replace(' Secretary', '')}
                      </h4>
                    </div>
                    
                    <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center ${displayColor} border-2 border-white shadow-md text-2xl transition-colors shrink-0`}>
                        {displayEmoji}
                    </div>
                    
                    <div className="flex-1 flex flex-col items-center justify-start w-full pt-1.5 px-1">
                      {isReacting && reaction ? (
                        <span className={`text-[9px] lg:text-[10px] font-bold px-2 py-0.5 rounded shadow-sm w-full text-center truncate ${reaction.badge}`}>
                          {reaction.text}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div onClick={() => setActiveTab('electorate')} className={`bg-zinc-900 rounded-xl shadow-lg p-5 flex flex-col items-center justify-center shrink-0 h-36 lg:h-40 relative overflow-hidden cursor-pointer hover:bg-black transition-colors group ${getCardHighlight(1)}`}>
            <div className="absolute top-3 right-4 opacity-0 group-hover:opacity-100 text-zinc-500 text-xl font-bold transition-opacity">↗</div>
            <div className="absolute top-0 left-0 w-full h-1.5" style={{backgroundColor: rule.graphColor}} />
            <p className="text-xs lg:text-sm font-bold uppercase tracking-widest text-zinc-400 mb-1">Public Approval</p>
            <div className="flex items-baseline gap-1">
              <p className={`text-5xl lg:text-6xl font-black tracking-tighter transition-colors duration-500 ${
                approvalRating >= 51 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {approvalRating.toFixed(1)}%
              </p>
            </div>
            {selectedPolicy ? (
               <p className="text-xs text-pink-400 font-bold uppercase tracking-widest mt-2 animate-pulse">
                 Predicted Outcome Hidden
               </p>
            ) : (
              <p className="text-sm text-zinc-500 mt-2 text-center px-4">
                Requirement: <strong className="text-zinc-300">51.0%</strong>
              </p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: LEGISLATIVE AGENDA WITH ROLODEX LOCK */}
        <div className={`col-span-4 flex flex-col bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden h-full min-h-0 ${getTutorialClass(2)} ${getCardHighlight(2)}`}>
          <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 shrink-0">
            <h3 className="text-base font-bold uppercase tracking-widest text-zinc-800">Legislative Agenda</h3>
            {selectedMinister ? (
              <p className="text-sm text-emerald-600 font-medium mt-1">
                Sponsorship locked: {typeof selectedMinister === 'string' ? selectedMinister : selectedMinister.name}
              </p>
            ) : (
              <p className="text-sm text-zinc-500 mt-1">Pending ministerial sponsorship.</p>
            )}
          </div>
          
          <div className="flex-1 flex flex-col p-4 gap-3 min-h-0 overflow-hidden relative">
            {!selectedMinister ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-50/80 backdrop-blur-[1px] z-10 px-6">
                <div className="relative w-full max-w-[220px] h-32 mb-4">
                  {Array.from({length: 8}).map((_, i) => (
                    <div 
                      key={i} 
                      className="absolute top-0 left-0 right-0 bg-white border border-zinc-200 rounded-xl shadow-sm transition-all"
                      style={{ 
                        height: '70px', 
                        transform: `translateY(${i * 6}px) scale(${1 - i * 0.03})`, 
                        zIndex: 10 - i,
                        opacity: 1 - i * 0.1
                      }} 
                    />
                  ))}
                </div>
                <div className="relative z-20 text-center">
                  <h4 className="font-bold text-zinc-800 text-sm">Unfiltered In-Tray</h4>
                  <p className="text-xs text-zinc-500 mt-2">Select a Minister from the Cabinet to sponsor a demographic's needs and reveal viable policies.</p>
                </div>
              </div>
            ) : (
              <>
                {presentedPolicies.map((policy) => {
                  const isSelected = selectedPolicy?.id === policy.id;
                  return (
                    <button
                      key={policy.id}
                      onClick={() => setSelectedPolicy(selectedPolicy?.id === policy.id ? null : policy)}
                      className={`relative flex-1 flex flex-col justify-center w-full text-left p-4 rounded-xl border transition-all duration-300 group min-h-0 overflow-hidden ${
                        isSelected ? 'border-pink-500 bg-pink-50 shadow-md' : 'border-zinc-200 hover:border-zinc-300 hover:shadow-sm bg-white'
                      } ${
                        isSelected && pulsePolicy ? 'scale-[1.02] ring-4 ring-pink-500 animate-pulse' : isSelected ? 'ring-2 ring-pink-500/20' : ''
                      }`}
                    >
                      {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-pink-500 rounded-l-xl" />}
                      <p className={`font-bold text-base leading-tight mb-1.5 truncate ${isSelected ? 'text-pink-900' : 'text-zinc-800'}`}>
                        {policy.policyName}
                      </p>
                      <p className={`text-sm line-clamp-2 ${isSelected ? 'text-pink-700/80' : 'text-zinc-500'}`}>
                        {policy.description}
                      </p>
                    </button>
                  );
                })}
              </>
            )}
          </div>
          
          <div className="p-4 border-t border-zinc-100 bg-zinc-50 shrink-0">
            <button 
              onClick={handleApplyPolicy}
              disabled={!selectedPolicy || !selectedMinister}
              className="w-full py-4 bg-zinc-900 text-white text-base font-bold rounded-xl hover:bg-black disabled:bg-zinc-300 disabled:cursor-not-allowed transition-all shadow-md"
            >
              Enact Policy
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}