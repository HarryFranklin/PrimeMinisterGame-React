import { useGame, useUI } from "../../context/GameStateContext";
import { FRAMEWORK_RULES } from "../../utils/frameworkRules";
import { AxisVariable, ElectionCycle } from "../../utils/types";
import SharedTabHeader from "./../SharedTabHeader";
import D3Chart, { ChartMarker } from "../D3Chart";

export default function GraphsTab() {
  const { setActiveTab, isTutorialActive, tutorialStep } = useUI();
  
  const {
    currentCycle, currentChartData, previewChartData, currentHistogramData, previewHistogramData,
    ministers, selectedMinister, setSelectedMinister, selectedPolicy, turnMetricScore, currentMetricScore,
    currentDeck, presentedPolicies, setSelectedPolicy, handleApplyPolicy, approvalRating,
    population, previewPopulation, cycleMAO
  } = useGame();

  const getTutorialClass = (columnIndex: number) => {
    if (!isTutorialActive) return "relative z-10";
    return tutorialStep === columnIndex 
      ? "relative z-[70] ring-4 ring-pink-500/50 rounded-2xl bg-white transition-all duration-500 shadow-2xl" 
      : "relative z-10 pointer-events-none opacity-40 grayscale transition-all duration-500";
  };

  const rule = FRAMEWORK_RULES[currentCycle];
  const targetScore = cycleMAO * rule.winThresholdScalar;

  const currentMarkers: ChartMarker[] = [];
  const projectedMarkers: ChartMarker[] = [];

  if (currentCycle === ElectionCycle.Benthamite) {
    currentMarkers.push({ value: turnMetricScore, label: "Current Mean", color: "#3f3f46", dashed: false, hideLabelText: true });
    currentMarkers.push({ value: targetScore, label: "Target Mean", color: rule.graphColor, dashed: true, hideLabelText: true });

    projectedMarkers.push({ value: currentMetricScore, label: "Projected Mean", color: "#3f3f46", dashed: false, hideLabelText: true });
    projectedMarkers.push({ value: targetScore, label: "Target Mean", color: rule.graphColor, dashed: true, hideLabelText: true });
  } else if (currentCycle === ElectionCycle.Rawlsian) {
    currentMarkers.push({ value: turnMetricScore, label: "Current Floor", color: "#3f3f46", dashed: false, hideLabelText: true });
    currentMarkers.push({ value: targetScore, label: "Target Floor", color: rule.graphColor, dashed: true, hideLabelText: true });

    projectedMarkers.push({ value: currentMetricScore, label: "Projected Floor", color: "#3f3f46", dashed: false, hideLabelText: true });
    projectedMarkers.push({ value: targetScore, label: "Target Floor", color: rule.graphColor, dashed: true, hideLabelText: true });
  }

  return (
    <div className={`h-full flex flex-col gap-6 animate-in fade-in duration-300 min-h-0`}>
      
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

      <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
        
        {/* Left Column: Current State */}
        <div className={`bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col flex-1 min-h-0 ${getTutorialClass(0)}`}>
          <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50 rounded-t-xl shrink-0 flex justify-between items-center">
             <div>
               <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Current State</h3>
               <p className="text-xs text-zinc-400 font-medium mt-1">Before policy enactment</p>
             </div>
          </div>
          
          <div className="flex-1 p-6 pb-0 min-h-0 relative">
            <D3Chart 
               plotType={rule.plotType} 
               chartData={currentChartData}
               histogramData={currentHistogramData} 
               xAxisType={AxisVariable.LifeSatisfaction}
               yAxisType={rule.yAxisType} 
               color="#d4d4d8"
               ministers={ministers}
               markers={currentMarkers}
               visualStyle={'faces'}
            />
          </div>
          
          <div className="px-6 pb-4 flex flex-wrap gap-4 justify-center border-t border-zinc-50 pt-3 shrink-0">
            {currentMarkers.map((marker, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <svg width="16" height="4" className="shrink-0">
                  <line x1="0" y1="2" x2="16" y2="2" stroke={marker.color || '#3f3f46'} strokeWidth="2" strokeDasharray={marker.dashed ? "4,2" : "none"} />
                </svg>
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight">{marker.label}</span>
              </div>
            ))}
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
          
          <div className="flex-1 p-6 pb-0 min-h-0 relative">
            <D3Chart 
              plotType={rule.plotType} 
              chartData={previewChartData} 
              histogramData={previewHistogramData} 
              xAxisType={AxisVariable.LifeSatisfaction} 
              yAxisType={rule.yAxisType} 
              color={rule.graphColor}
              ministers={ministers}
              markers={projectedMarkers}
            />

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
          
          <div className="px-6 pb-4 flex flex-wrap gap-4 justify-center border-t border-zinc-50 pt-3 shrink-0">
            {projectedMarkers.map((marker, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <svg width="16" height="4" className="shrink-0">
                  <line x1="0" y1="2" x2="16" y2="2" stroke={marker.color || '#3f3f46'} strokeWidth="2" strokeDasharray={marker.dashed ? "4,2" : "none"} />
                </svg>
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight">{marker.label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}