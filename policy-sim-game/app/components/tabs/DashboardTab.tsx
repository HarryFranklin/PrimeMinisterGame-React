import React, { useState, useMemo, useEffect } from "react";
import D3Chart from "../D3Chart";
import { AxisVariable, ElectionCycle, Policy, Respondent, Minister } from "../../utils/types";
import { FRAMEWORK_RULES } from "../../utils/frameworkRules";
import { DEMO_COLORS, IMPACT_COLORS, getMinisterReaction } from "../../utils/uiHelpers";

interface DashboardTabProps {
  setActiveTab: (tab: any) => void;
  currentCycle: ElectionCycle;
  currentChartData: any[];
  previewChartData: any[];
  currentHistogramData: any[];
  previewHistogramData: any[];
  ministers: Minister[];
  selectedMinister: Minister | string | null; 
  setSelectedMinister: (m: string | null) => void;
  selectedPolicy: Policy | null;
  currentMetricScore: number;
  initialMetricScore: number;
  turnMetricScore: number;
  currentDeck: Policy[];
  presentedPolicies: Policy[];
  setSelectedPolicy: React.Dispatch<React.SetStateAction<Policy | null>>;
  handleApplyPolicy: () => void;
  cycleMAO: number;
  approvalRating: number;
  population: Respondent[];
  previewPopulation: Respondent[];
  isTutorialActive: boolean;
  tutorialStep: number;
  pulsePolicy?: boolean;
}

export default function DashboardTab(props: DashboardTabProps) {
  const {
    setActiveTab, currentCycle, currentChartData, previewChartData, currentHistogramData,
    ministers, selectedMinister, setSelectedMinister, selectedPolicy, turnMetricScore,
    currentDeck, presentedPolicies, setSelectedPolicy, handleApplyPolicy, approvalRating,
    population, previewPopulation,
    isTutorialActive, tutorialStep, pulsePolicy 
  } = props;;

  const rule = FRAMEWORK_RULES[currentCycle];
  const [groupBy, setGroupBy] = useState<'wealth' | 'age'>('wealth');
  const [highlightedMinisters, setHighlightedMinisters] = useState<string[]>([]);

  let markerLabel = undefined;
  if (currentCycle === ElectionCycle.Benthamite) markerLabel = "Mean";
  else if (currentCycle === ElectionCycle.Rawlsian) markerLabel = "Floor";

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
        return "Benthamite Objective: Maximise total societal happiness. Identify policies that benefit the largest groups, even if a minority suffers. Find a minister to champion the majority.";
      case ElectionCycle.Rawlsian: 
        return "Rawlsian Objective: Raise the societal floor. Look at the graphs to identify the demographic with the lowest Life Satisfaction, then select their representative Minister to sponsor a bill.";
      case ElectionCycle.PersonalUtility: 
        return "Personal Utility Objective: Voters act on self-interest with diminishing returns. Target groups whose baseline utility gives the highest yield. Sponsor bills through ministers of vulnerable groups.";
      case ElectionCycle.SocietalUtility: 
        return "Societal Utility Objective: Voters hold ideals about fairness. You must balance actual wellbeing with the population's preferred distribution. Consult ministers to find acceptable compromises.";
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
    <div className="flex flex-col gap-6 h-full min-h-0 animate-in fade-in duration-300 relative">
      
      {/* TOP BANNER: GUIDED ANALYSIS */}
      <div className={`shrink-0 bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-4 shadow-sm ${getTutorialClass(0)}`}>
        <span className="text-2xl mt-0.5">🧭</span>
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-indigo-900 mb-1">Guided Analysis: {rule.frameworkTitle}</h3>
          <p className="text-sm text-indigo-800 leading-relaxed">{getGuidedAnalysis()}</p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
        
        {/* LEFT COLUMN: Split Graphs */}
        <div className={`col-span-4 flex flex-col gap-4 h-full min-h-0 ${getTutorialClass(0)}`}>
          <div onClick={() => setActiveTab('graphs')} className={`bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col flex-1 min-h-0 cursor-pointer hover:border-zinc-300 transition-all group ${getCardHighlight(0)}`}>
            <div className="px-4 py-2 h-[42px] border-b border-zinc-100 bg-zinc-50/50 rounded-t-xl flex justify-between items-center shrink-0">
              <h3 className="text-[12px] font-bold uppercase tracking-widest text-zinc-800">
                Current Life Satisfaction Distribution
              </h3>
              <span className="text-zinc-300 group-hover:text-pink-500 font-bold text-lg leading-none">↗</span>
            </div>
            <div className="flex-1 p-4 min-h-0">
              <D3Chart 
                plotType="1D" 
                chartData={currentChartData}
                histogramData={currentHistogramData} 
                xAxisType={AxisVariable.LifeSatisfaction}
                yAxisType={rule.yAxisType} 
                color="#d4d4d8"
                ministers={ministers}
                markerValue={markerLabel ? turnMetricScore : undefined}
                markerLabel={markerLabel}
                onHoverMinisters={setHighlightedMinisters}
                visualStyle={'faces'}
              />
            </div>
          </div>

          <div onClick={() => setActiveTab('electorate')} className={`bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col flex-1 min-h-0 cursor-pointer hover:border-zinc-300 transition-all group ${getCardHighlight(0)}`}>
            <div className="px-4 py-2 h-[42px] border-b border-zinc-100 bg-zinc-50/50 rounded-t-xl flex justify-between items-center shrink-0">
              <h3 className="text-[12px] font-bold uppercase tracking-widest text-zinc-800 whitespace-nowrap">
                {selectedPolicy ? "Wellbeing Impact" : "Demographic Breakdown"}
              </h3>
              <div className="flex items-center gap-3">
                {!selectedPolicy && (
                  <div className="flex bg-zinc-200/50 p-0.5 rounded-md shrink-0">
                    {(['wealth', 'age'] as const).map(type => (
                      <button 
                        key={type}
                        onClick={(e) => {
                          e.stopPropagation(); 
                          setGroupBy(type);
                        }}
                        className={`px-2 py-0.5 text-[9px] font-black uppercase rounded transition-all ${
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
            <div className="flex-1 p-4 pb-1 min-h-0 relative">
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
            <div className="px-4 pb-3 flex flex-wrap gap-3 justify-center border-t border-zinc-50 pt-2">
              {(selectedPolicy ? Object.entries(IMPACT_COLORS) : Object.entries(DEMO_COLORS[groupBy])).map(([label, color]) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: CABINET */}
        <div className={`col-span-4 flex flex-col gap-6 h-full min-h-0 ${getTutorialClass(1)}`}>
          <div className={`bg-white rounded-xl border border-zinc-200 shadow-sm flex-1 flex flex-col transition-all group min-h-0 ${getCardHighlight(1)}`}>
            <div className="px-4 pt-5 pb-4 border-b border-zinc-100 bg-zinc-50/50 rounded-t-xl flex justify-between items-start shrink-0">
              <div>
                <h3 className="text-base font-bold uppercase tracking-widest text-zinc-800">The Cabinet</h3>
                <p className="text-sm text-zinc-500 mt-1">Select a minister below to sponsor a bill.</p>
              </div>
            </div>
            
              <div className="p-2 lg:p-3 grid grid-cols-3 grid-rows-2 gap-2 lg:gap-3 flex-1 min-h-0">
              {ministers.map((minister, i) => {
                const isReacting = selectedPolicy !== null;
                const reaction = isReacting ? getMinisterReaction(minister.policyDelta || 0) : null;
                const displayEmoji = isReacting ? reaction?.emoji : (minister.status === 'happy' ? '😊' : minister.status === 'neutral' ? '😐' : '😠');
                const displayColor = isReacting && reaction ? reaction.circle : minister.color;
                
                // 1. Evaluate both states independently
                const isSelected = selectedMinister === minister.name;
                const isHighlightedByGraph = highlightedMinisters.includes(minister.name);

                // 2. Build the class string dynamically to handle combinations
                let highlightClasses = "";
                if (isSelected && isHighlightedByGraph) {
                  // COMBINED STATE: Sponsor AND relevant to current graph hover
                  // Solid pink background, but a dashed border to show the active graph link
                  highlightClasses = "border-pink-500 border-dashed border-[2px] bg-pink-100 hover:bg-pink-200 shadow-md scale-[1.02] z-20";
                } else if (isSelected) {
                  // PERSISTENT STATE ONLY: Sponsor, but NOT relevant to current graph hover
                  // Solid pink background, solid border
                  highlightClasses = "border-pink-500 border-solid border-[2px] bg-pink-100 hover:bg-pink-200 shadow-md scale-[1.02] z-20";
                } else if (isHighlightedByGraph) {
                  // TRANSIENT STATE ONLY: Not sponsor, but relevant to graph hover
                  // Lighter pink background, dashed border
                  highlightClasses = "border-pink-400 border-dashed border-[2px] bg-pink-50/50 hover:bg-pink-50 shadow-sm scale-[1.02] z-10";
                } else {
                  // DEFAULT STATE
                  highlightClasses = "border-zinc-200 border-solid border bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-300";
                }

                return (
                  <div 
                    key={i} 
                    onClick={() => { 
                      if (selectedMinister === minister.name) {
                        // Toggle off: Revert to unfiltered tray and clear active policy
                        setSelectedMinister(null);
                        setSelectedPolicy(null); 
                      } else {
                        // Select new minister: Sponsorship locks and reveals 3 policies
                        setSelectedMinister(minister.name);
                        setSelectedPolicy(null); 
                      }
                    }}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl cursor-pointer transition-all active:scale-95 relative group/minister h-full ${highlightClasses}`}
                  >
                    {/* 3. Floating pill badge */}
                    {isSelected && (
                      <div className="absolute -top-2.5 right-2 bg-pink-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full z-30 shadow-sm border border-pink-600">
                        SPONSOR
                      </div>
                    )}

                    <div className="flex flex-col items-center justify-center w-full mb-1">
                      <h4 className="text-[10px] lg:text-xs font-black text-zinc-800 uppercase tracking-widest leading-tight text-center">
                        {minister.name.replace(' Secretary', '')}
                        {minister.name.includes('Secretary') && (
                          <span className="block text-[8px] lg:text-[10px] text-zinc-600 mt-0.5">Secretary</span>
                        )}
                      </h4>
                    </div>
                    <div className={`w-12 h-12 lg:w-14 lg:h-14 my-1 rounded-full flex items-center justify-center ${displayColor} border-2 lg:border-4 border-white shadow-md text-2xl lg:text-3xl transition-colors shrink-0`}>
                        {displayEmoji}
                    </div>
                    <div className="h-4 lg:h-5 flex items-center justify-center mt-1 lg:mt-2 shrink-0 w-full px-1">
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

          <div onClick={() => setActiveTab('electorate')} className={`bg-zinc-900 rounded-xl shadow-lg p-5 flex flex-col items-center justify-center shrink-0 h-40 relative overflow-hidden cursor-pointer hover:bg-black transition-colors group ${getCardHighlight(1)}`}>
            <div className="absolute top-2 right-3 opacity-0 group-hover:opacity-100 text-zinc-500 text-xl font-bold transition-opacity">↗</div>
            <div className="absolute top-0 left-0 w-full h-1" style={{backgroundColor: rule.graphColor}} />
            <p className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-1">Public Approval</p>
            <div className="flex items-baseline gap-1">
              <p className={`text-5xl font-black tracking-tighter transition-colors duration-500 ${
                approvalRating >= 51 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {approvalRating.toFixed(1)}%
              </p>
            </div>
            {selectedPolicy ? (
               <p className="text-[12px] text-pink-400 font-bold uppercase tracking-widest mt-2 animate-pulse">
                 Predicted Outcome Hidden
               </p>
            ) : (
              <p className="text-sm text-zinc-500 mt-2 text-center px-4">
                Public Approval: <strong className="text-zinc-300">51.0%</strong>
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
                  <p className="text-xs text-zinc-500 mt-2">Dozens of drafts await review. Select a Minister from the Cabinet to sponsor a demographic's needs and reveal viable policies.</p>
                </div>
              </div>
            ) : (
              <>
                {presentedPolicies.map((policy) => {
                  const isSelected = selectedPolicy?.id === policy.id;
                  return (
                    <button
                      key={policy.id}
                      onClick={() => setSelectedPolicy(prev => prev?.id === policy.id ? null : policy)}
                      className={`relative flex-1 flex flex-col justify-center w-full text-left p-4 rounded-xl border transition-all duration-300 group ${
                        isSelected ? 'border-pink-500 bg-pink-50 shadow-md' : 'border-zinc-200 hover:border-zinc-300 hover:shadow-sm bg-white'
                      } ${
                        isSelected && pulsePolicy ? 'scale-[1.02] ring-4 ring-pink-500 animate-pulse' : isSelected ? 'ring-2 ring-pink-500/20' : ''
                      }`}
                    >
                      {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-pink-500 rounded-l-xl" />}
                      <p className={`font-bold text-base leading-tight mb-2 ${isSelected ? 'text-pink-900' : 'text-zinc-800'}`}>
                        {policy.policyName}
                      </p>
                      <p className={`text-sm ${isSelected ? 'text-pink-700/80' : 'text-zinc-500'}`}>
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
              className="w-full py-4 bg-zinc-900 text-white font-bold rounded-xl hover:bg-black disabled:bg-zinc-300 disabled:cursor-not-allowed transition-all shadow-lg"
            >
              Enact Policy
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}