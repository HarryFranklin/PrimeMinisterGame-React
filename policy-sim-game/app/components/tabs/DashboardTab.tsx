import React, { useState, useMemo, useEffect} from "react";
import D3Chart from "../D3Chart";
import { AxisVariable, ElectionCycle, Policy, Respondent } from "../../utils/types";
import { FRAMEWORK_RULES } from "../../utils/frameworkRules";

const DEMO_COLORS = {
  wealth: { 'Poor': '#ef4444', 'Middle': '#3b82f6', 'Wealthy': '#10b981' },
  age: { 'Youth': '#fbbf24', 'Adult': '#6366f1', 'Elderly': '#14b8a6' }
};

const IMPACT_COLORS = {
  'Will improve': '#10b981',
  'Will be stable': '#d4d4d8',
  'Will be worsened': '#ef4444'
};

interface DashboardTabProps {
  setActiveTab: (tab: any) => void;
  currentCycle: ElectionCycle;
  currentChartData: any[];
  previewChartData: any[];
  currentHistogramData: any[];
  previewHistogramData: any[];
  ministers: any[];
  setSelectedMinister: (m: any) => void;
  selectedPolicy: Policy | null;
  currentMetricScore: number;
  initialMetricScore: number;
  turnMetricScore: number;
  currentDeck: Policy[];
  setSelectedPolicy: React.Dispatch<React.SetStateAction<Policy | null>>;
  handleApplyPolicy: () => void;
  cycleMAO: number;
  approvalRating: number;
  population: Respondent[];
  previewPopulation: Respondent[];
  isTutorialActive: boolean;
  tutorialStep: number;
}

const getMinisterReaction = (delta: number) => {
  if (delta >= 0.05) return { text: "Brilliant!", badge: "text-emerald-700 bg-emerald-100", circle: "bg-emerald-500", emoji: "😊" };
  if (delta >= 0.005) return { text: "Approves.", badge: "text-emerald-700 bg-emerald-50", circle: "bg-emerald-400", emoji: "🙂" };
  if (delta <= -0.05) return { text: "Disastrous!", badge: "text-rose-700 bg-rose-100", circle: "bg-rose-500", emoji: "😠" };
  if (delta <= -0.005) return { text: "Objects.", badge: "text-rose-700 bg-rose-50", circle: "bg-rose-400", emoji: "🙁" };
  return { text: "No impact.", badge: "text-zinc-600 bg-zinc-100", circle: "bg-zinc-300", emoji: "😐" };
};

export default function DashboardTab(props: DashboardTabProps) {
  const {
    setActiveTab, currentCycle, currentChartData, previewChartData, currentHistogramData,
    ministers, setSelectedMinister, selectedPolicy, turnMetricScore,
    currentDeck, setSelectedPolicy, handleApplyPolicy, approvalRating,
    population, previewPopulation,
    isTutorialActive, tutorialStep
  } = props;

  const rule = FRAMEWORK_RULES[currentCycle];
  const [groupBy, setGroupBy] = useState<'wealth' | 'age'>('wealth');
  const [highlightedMinisters, setHighlightedMinisters] = useState<string[]>([]);

  let markerLabel = undefined;
  if (currentCycle === ElectionCycle.Benthamite) markerLabel = "Mean";
  else if (currentCycle === ElectionCycle.Rawlsian) markerLabel = "Floor";

  // Helper function to dynamically apply "spotlight" CSS classes to the columns
  const getTutorialClass = (columnIndex: number) => {
    if (!isTutorialActive) return "relative z-10";
    if (tutorialStep === 3) return "relative z-10 pointer-events-none opacity-40 grayscale-[30%] transition-all duration-500"; // Dim everything during the Tabs step
    return tutorialStep === columnIndex 
      ? "relative z-[70] ring-4 ring-pink-500/50 rounded-2xl transition-all duration-500 scale-[1.01] bg-white/5" 
      : "relative z-10 pointer-events-none opacity-40 grayscale-[30%] transition-all duration-500";
  };

  // Prepare the stacked data for the bottom graph
  const stackedData = useMemo(() => {
    return Array.from({ length: 11 }, (_, i) => {
      const name = i.toString();
      const residentsInBin = population.filter(r => Math.min(10, Math.max(0, Math.round(r.currentLS))) === i);
      
      const segments: any[] = [];
      if (selectedPolicy) {
        // Impact View: Based on change relative to currentLS
        ['Will be worsened', 'Will be stable', 'Will improve'].forEach(key => {
          const count = residentsInBin.filter(r => {
            const index = population.indexOf(r);
            const delta = previewPopulation[index].currentLS - r.currentLS;
            if (key === 'Will improve') return delta > 0.1125; // 2.25x bigger for loss aversion
            if (key === 'Will be worsened') return delta < -0.05;
            return delta >= -0.05 && delta <= 0.1125;
          }).length;
          if (count > 0) segments.push({ label: key, value: count, color: (IMPACT_COLORS as any)[key] });
        });
      } else {
        // Demographic View
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
        // Keep original breakdown for tooltip compatibility in D3Chart
        breakdown: currentHistogramData.find(d => d.name === i)?.breakdown || { wealth: {}, age: {} }
      };
    });
  }, [population, previewPopulation, selectedPolicy, groupBy, currentHistogramData]);

  return (
    <div className="grid grid-cols-12 gap-6 h-full min-h-0 animate-in fade-in duration-300 relative">
      
      {/* LEFT COLUMN: Split Graphs (Wrapped with getTutorialClass(0)) */}
      <div className={`col-span-4 flex flex-col gap-4 h-full min-h-0 ${getTutorialClass(0)}`}>

        {/* TOP: Current Distribution (Links to Graphs Tab) */}
        <div onClick={() => setActiveTab('graphs')} className="bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col flex-1 min-h-0 cursor-pointer hover:border-zinc-300 transition-all group">
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
            />
          </div>
        </div>

        {/* BOTTOM: Analysis Tool (Links to Electorate Tab) */}
        <div 
          onClick={() => setActiveTab('electorate')} 
          className="bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col flex-1 min-h-0 cursor-pointer hover:border-zinc-300 transition-all group"
        >
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
                        e.stopPropagation(); // Prevents tab switch when just toggling data
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
              {/* Arrow indicator matches the top graph */}
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

      {/* MIDDLE COLUMN: CABINET (Wrapped with getTutorialClass(1)) */}
      <div className={`col-span-4 flex flex-col gap-6 h-full min-h-0 ${getTutorialClass(1)}`}>
        <div onClick={() => setActiveTab('ministers')} className="bg-white rounded-xl border border-zinc-200 shadow-sm flex-1 flex flex-col cursor-pointer hover:border-zinc-300 hover:shadow-md transition-all group min-h-0">
          <div className="px-4 pt-5 pb-4 border-b border-zinc-100 bg-zinc-50/50 rounded-t-xl flex justify-between items-start shrink-0 group-hover:bg-zinc-100/50 transition-colors">
            <div>
              <h3 className="text-base font-bold uppercase tracking-widest text-zinc-800 group-hover:text-pink-600 transition-colors">The Cabinet</h3>
              <p className="text-sm text-zinc-500 mt-1">Click a minister for demographic details.</p>
            </div>
            <span className="text-zinc-300 group-hover:text-pink-500 font-bold text-xl leading-none mt-1">↗</span>
          </div>
          
          <div className="p-2 lg:p-3 grid grid-cols-3 grid-rows-2 gap-2 lg:gap-3 flex-1 min-h-0">
            {ministers.map((minister, i) => {
              const isReacting = selectedPolicy !== null;
              const reaction = isReacting ? getMinisterReaction(minister.policyDelta || 0) : null;
              const displayEmoji = isReacting ? reaction?.emoji : (minister.status === 'happy' ? '😊' : minister.status === 'neutral' ? '😐' : '😠');
              const displayColor = isReacting && reaction ? reaction.circle : minister.color;
              const isHighlighted = highlightedMinisters.includes(minister.name);
              const highlightClasses = isHighlighted 
                ? "ring-2 ring-pink-500 shadow-md scale-[1.02] bg-pink-50/30 border-pink-200 z-10" 
                : "border-zinc-100 bg-zinc-50";

              return (
                <div 
                  key={i} 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setSelectedMinister(minister.name); 
                    setActiveTab('ministers');
                  }} 
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border cursor-pointer hover:bg-zinc-200 hover:border-zinc-300 transition-all active:scale-95 relative group/minister h-full overflow-hidden ${highlightClasses}`}
                >
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

        {/* APPROVAL RATING */}
        <div onClick={() => setActiveTab('electorate')} className="bg-zinc-900 rounded-xl shadow-lg p-5 flex flex-col items-center justify-center shrink-0 h-40 relative overflow-hidden cursor-pointer hover:bg-black transition-colors group">
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

      {/* RIGHT COLUMN: LEGISLATIVE AGENDA (Wrapped with getTutorialClass(2)) */}
      <div className={`col-span-4 flex flex-col bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden h-full min-h-0 ${getTutorialClass(2)}`}>
        <div className="p-4 border-b border-zinc-100 bg-zinc-50/50 shrink-0">
          <h3 className="text-base font-bold uppercase tracking-widest text-zinc-800">Legislative Agenda</h3>
          <p className="text-sm text-zinc-500 mt-1">Select one of this turn's available policies to enact.</p>
        </div>
        <div className="flex-1 flex flex-col p-4 gap-3 min-h-0 overflow-hidden">
          {currentDeck.slice(0, 3).map((policy) => {
            const isSelected = selectedPolicy?.id === policy.id;
            return (
              <button
                key={policy.id}
                onClick={() => setSelectedPolicy(prev => prev?.id === policy.id ? null : policy)}
                className={`relative flex-1 flex flex-col justify-center w-full text-left p-4 rounded-xl border transition-all duration-200 group ${
                  isSelected ? 'border-pink-500 bg-pink-50 ring-2 ring-pink-500/20 shadow-md' : 'border-zinc-200 hover:border-zinc-300 hover:shadow-sm bg-white'
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
        </div>
        <div className="p-4 border-t border-zinc-100 bg-zinc-50 shrink-0">
          <button 
            onClick={handleApplyPolicy}
            disabled={!selectedPolicy}
            className="w-full py-4 bg-zinc-900 text-white font-bold rounded-xl hover:bg-black disabled:bg-zinc-300 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            Enact Policy
          </button>
        </div>
      </div>
    </div>
  );
}