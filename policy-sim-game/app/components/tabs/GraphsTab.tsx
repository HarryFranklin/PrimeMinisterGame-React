import { useGame, useUI } from "../../context/GameStateContext";
import { FRAMEWORK_RULES } from "../../utils/frameworkRules";
import { AxisVariable, ElectionCycle } from "../../utils/types";
import D3Chart from "../D3Chart";
import SharedTabHeader from "./../SharedTabHeader";

export default function GraphsTab() {
  // 1. UI Context
  const { setActiveTab, isTutorialActive, tutorialStep } = useUI();
  
  // 2. Game Context
  const {
    currentCycle, currentChartData, previewChartData, currentHistogramData, previewHistogramData,
    ministers, selectedMinister, setSelectedMinister, selectedPolicy, turnMetricScore,
    currentDeck, presentedPolicies, setSelectedPolicy, handleApplyPolicy, approvalRating,
    population, previewPopulation
  } = useGame();

  const getTutorialClass = (columnIndex: number) => {
    if (!isTutorialActive) return "relative z-10";
    return tutorialStep === columnIndex 
      ? "relative z-[70] ring-4 ring-pink-500/50 rounded-2xl bg-white transition-all duration-500 shadow-2xl" 
      : "relative z-10 pointer-events-none opacity-40 grayscale transition-all duration-500";
  };

  const rule = FRAMEWORK_RULES[currentCycle];

  let markerLabel = undefined;
  if (currentCycle === ElectionCycle.Benthamite) markerLabel = "Mean";
  else if (currentCycle === ElectionCycle.Rawlsian) markerLabel = "Floor";

  return (
    <div className={`h-full flex flex-col gap-6 animate-in fade-in duration-300 min-h-0`}>
      
      {/* MODULARISED HEADER BANNER */}
      <SharedTabHeader
        title="Distribution Analysis"
        subtitle="Detailed side-by-side comparison of policy impacts."
        approvalRating={approvalRating}
        selectedPolicy={selectedPolicy ?? null}
        setSelectedPolicy={setSelectedPolicy}
        selectedMinister={selectedMinister}
        presentedPolicies={presentedPolicies}
        onNavigateToMinisters={() => setActiveTab('ministers')}
        tutorialClass={getTutorialClass(0)}
      > 
        <div className="text-right shrink-0">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Current Framework</p>
          <p className="text-lg font-black leading-none mt-1" style={{ color: rule.graphColor }}>{rule.frameworkTitle}</p>
        </div>
      </SharedTabHeader>

      {/* Side-by-Side Graphs */}
      <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
        
        {/* Left Column: Current State */}
        <div className={`bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col flex-1 min-h-0 ${getTutorialClass(0)}`}>
          <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50 rounded-t-xl shrink-0 flex justify-between items-center">
             <div>
               <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Current State</h3>
               <p className="text-xs text-zinc-400 font-medium mt-1">Before policy enactment</p>
             </div>
          </div>
          <div className="flex-1 p-6 min-h-0">
            <D3Chart 
              plotType={rule.plotType} 
              chartData={currentChartData} 
              histogramData={currentHistogramData} 
              xAxisType={AxisVariable.LifeSatisfaction} 
              yAxisType={rule.yAxisType} 
              color="#d4d4d8"
              ministers={ministers}
              markerValue={markerLabel ? turnMetricScore : undefined}
              markerLabel={markerLabel}
              visualStyle={'faces'}
            />
          </div>
        </div>

        {/* Right Column: Projected State */}
        <div className={`bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col flex-1 min-h-0 ${getTutorialClass(1)}`}>
          <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50 rounded-t-xl shrink-0 flex justify-between items-center">
             <div>
               <h3 className="text-sm font-bold uppercase tracking-widest" style={{ color: rule.graphColor }}>Projected State</h3>
               <p className="text-xs text-zinc-500 font-medium mt-1">Estimated impact of selected policy</p>
             </div>
          </div>
          <div className="flex-1 p-6 min-h-0 relative">
            <D3Chart 
              plotType={rule.plotType} 
              chartData={previewChartData} 
              histogramData={previewHistogramData} 
              xAxisType={AxisVariable.LifeSatisfaction} 
              yAxisType={rule.yAxisType} 
              color={rule.graphColor}
              ministers={ministers}
            />

            {/* Frosted Glass Overlay */}
            {!selectedPolicy && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-[3px] rounded-b-xl z-10 animate-in fade-in duration-300">
                <div className="bg-white px-6 py-5 rounded-2xl shadow-xl border border-zinc-200 text-center max-w-sm">
                  <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-zinc-400 text-xl">📊</span>
                  </div>
                  <h4 className="text-sm font-bold text-zinc-800 uppercase tracking-widest mb-2">Awaiting Policy</h4>
                  <p className="text-sm text-zinc-500 font-medium">
                    Return to the dashboard and select a policy from the Legislative Agenda to forecast its impact on the distribution.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}