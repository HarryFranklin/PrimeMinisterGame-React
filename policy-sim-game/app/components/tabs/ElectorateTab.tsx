import React, { useState, useMemo } from "react";
import { Respondent, ElectionCycle, Policy, Minister } from "../../utils/types";
import { WelfareMetrics } from "../../utils/WelfareMetrics";
import SharedTabHeader from "./../SharedTabHeader"; 
import { DEMO_COLORS, STATUS_COLORS, SORT_ORDERS } from "../../utils/uiHelpers";
import { useGameState } from "../../context/GameStateContext";

type AnalyticalLens = 'approval_ls' | 'approval_demo' | 'impact_ls';

export default function ElectorateTab()
{
  const {
    initialPopulation, previewPopulation, currentCycle, approvalRating, 
    isTutorialActive, tutorialStep,
    selectedPolicy, setSelectedPolicy, onNavigateToPolicy,
    selectedMinister, presentedPolicies,
    setActiveTab
} = useGameState();

  const [activeLens, setActiveLens] = useState<AnalyticalLens>('approval_ls');
  const [groupBy, setGroupBy] = useState<'wealth' | 'age'>('wealth');
  const [hoveredDot, setHoveredDot] = useState<any | null>(null);
  const [hoveredBin, setHoveredBin] = useState<any | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const isTurnZero = useMemo(() => {
    if (previewPopulation.length === 0 || initialPopulation.length === 0) return true;
    return previewPopulation.every((p, i) => Math.abs(p.currentLS - initialPopulation[i].currentLS) < 0.0001);
  }, [initialPopulation, previewPopulation]);

  const getTutorialClass = (columnIndex: number) => {
    if (!isTutorialActive) return "relative z-10";
    
    // Explicitly check which element should be highlighted based on the tutorial step
    const isHighlighted = 
      (columnIndex === 0 && (tutorialStep === 0 || tutorialStep === 1)) || // Step 0 & 1 focus on the Header Area
      (columnIndex === 1 && tutorialStep === 2) ||                         // Step 2 focuses on the Chamber
      (columnIndex === 2 && tutorialStep === 3);                         // Step 3 focuses on the Guided Analysis Sidebar

    return isHighlighted 
      ? "relative z-[70] ring-4 ring-pink-500/50 rounded-2xl bg-white transition-all duration-500 shadow-2xl"
      : "relative z-10 pointer-events-none opacity-40 grayscale transition-all duration-500";
  };

  // Derive internal drawing states from the active lens
  const colorBy = activeLens === 'impact_ls' ? 'trajectory' : 'intention';
  const viewMode = activeLens === 'approval_demo' ? 'chamber' : 'histogram';

  // #region Data Processing
  const processedVoters = useMemo(() => {
    if (previewPopulation.length === 0) return [];
    const allInitialLS = initialPopulation.map(p => p.currentLS);
    const allPreviewLS = previewPopulation.map(p => p.currentLS);

    const sortedIndices = initialPopulation
      .map((p, i) => ({ index: i, ls: p.currentLS }))
      .sort((a, b) => b.ls - a.ls);
    const approvalCount = Math.round(initialPopulation.length * (approvalRating / 100));
    const baselineApprovingIndices = new Set(sortedIndices.slice(0, approvalCount).map(x => x.index));

    const mapped = previewPopulation.map((r, i) => {
      let initialUtil = 0;
      let currentUtil = 0;

      if (currentCycle === ElectionCycle.Benthamite || currentCycle === ElectionCycle.Rawlsian) {
        initialUtil = initialPopulation[i].currentLS;
        currentUtil = r.currentLS;
      } else if (currentCycle === ElectionCycle.PersonalUtility) {
        initialUtil = WelfareMetrics.getUtilityForPerson(initialPopulation[i].currentLS, r.personalUtilities);
        currentUtil = WelfareMetrics.getUtilityForPerson(r.currentLS, r.personalUtilities);
      } else {
        initialUtil = WelfareMetrics.evaluateDistribution(allInitialLS, r.societalUtilities);
        currentUtil = WelfareMetrics.evaluateDistribution(allPreviewLS, r.societalUtilities);
      }

      const utilityShift = currentUtil - initialUtil;

      const isApproving = isTurnZero 
        ? baselineApprovingIndices.has(i)
        : utilityShift >= -0.01;

      return {
        ...r,
        initialLS: initialPopulation[i].currentLS,
        utilityShift,
        isApproving, 
        lsTrajectory: r.currentLS - initialPopulation[i].currentLS
      };
    });

    return mapped.sort((a, b) => {
      const valA = a.demographics[groupBy];
      const valB = b.demographics[groupBy];
      // @ts-ignore
      return SORT_ORDERS[groupBy][valA] - SORT_ORDERS[groupBy][valB];
    });
  }, [initialPopulation, previewPopulation, currentCycle, groupBy, isTurnZero, approvalRating]);

  // #region Histogram Logic
  const histogramData = useMemo(() => {
    const bins = Array.from({ length: 11 }, (_, i) => ({
      bin: i,
      groups: {} as Record<string, number>,
      total: 0
    }));

    processedVoters.forEach(v => {
      const lsBin = Math.min(10, Math.max(0, Math.round(v.currentLS)));
      let groupKey = "";

      if (colorBy === 'intention') {
        groupKey = v.isApproving ? 'Approves' : 'Angry';
      } else {
        if (v.lsTrajectory > 0.1125) groupKey = 'Will improve'; 
        else if (v.lsTrajectory < -0.05) groupKey = 'Will be worsened';
        else groupKey = 'Will be stable';
      }

      bins[lsBin].groups[groupKey] = (bins[lsBin].groups[groupKey] || 0) + 1;
      bins[lsBin].total++;
    });

    const maxCount = Math.max(...bins.map(b => b.total));
    return { bins, maxCount };
  }, [processedVoters, colorBy]);
  // #endregion

  // #region Layout Logic
  const seats = useMemo(() => {
    const totalSeats = processedVoters.length;
    if (totalSeats === 0) return [];
    
    const width = 900;
    const height = 450;
    const rows = 10;
    const innerRadius = 120;
    const outerRadius = 420;
    const rowThickness = (outerRadius - innerRadius) / rows;

    let totalPerimeter = 0;
    for(let i=0; i<rows; i++) totalPerimeter += Math.PI * (innerRadius + i * rowThickness);

    const generatedSeats = [];
    let allocated = 0;
    const rowCounts = [];
    
    for(let i=0; i<rows; i++) {
      const r = innerRadius + i * rowThickness;
      let seatsInThisRow = Math.round(((Math.PI * r) / totalPerimeter) * totalSeats);
      rowCounts.push(seatsInThisRow);
      allocated += seatsInThisRow;
    }
    rowCounts[rows-1] += (totalSeats - allocated);

    for(let i=0; i<rows; i++) {
      const r = innerRadius + i * rowThickness;
      const count = rowCounts[i];
      for(let j=0; j<count; j++) {
        const angle = Math.PI - (0.02 + 0.96 * (j / Math.max(1, count - 1))) * Math.PI;
        generatedSeats.push({ 
          x: width / 2 + Math.cos(angle) * r, 
          y: height - 20 - Math.sin(angle) * r, 
          angle 
        });
      }
    }
    generatedSeats.sort((a, b) => b.angle - a.angle);
    return generatedSeats;
  }, [processedVoters.length]);

  const dots = processedVoters.map((voter, i) => ({ voter, seat: seats[i] || { x: 0, y: 0 } }));
  // #endregion

  const renderGuidedAnalysis = () => {
    if (activeLens === 'approval_ls') {
      return (
        <>
          <p>You are viewing <strong className="text-zinc-800">Voting Intentions mapped against Life Satisfaction</strong>.</p>
          <div className="bg-white p-4 rounded-lg border border-zinc-200 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-400 mb-2">Notice</p>
            <p>Look at where the green blocks are concentrated. Is your support coming from the most miserable citizens, the most satisfied, or a mix of both?</p>
          </div>
          <p className="font-bold text-pink-600 mt-4">Why it matters</p>
          <p>
            {currentCycle === ElectionCycle.Benthamite 
              ? "If the majority is green, you are succeeding, regardless of where they sit on the spectrum."
              : currentCycle === ElectionCycle.Rawlsian
              ? "If the lowest bins (0-3) contain red voters, your policy is failing the Rawlsian test, even if your overall approval is high."
              : "Voters on the lower end of the spectrum generally gain more utility from small boosts than those at the top. Target them to efficiently boost support."}
          </p>
        </>
      );
    }

    if (activeLens === 'approval_demo') {
      return (
        <>
          <p>You are viewing <strong className="text-zinc-800">Voting Intentions broken down by Demographics</strong>.</p>
          <div className="bg-white p-4 rounded-lg border border-zinc-200 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-400 mb-2">Notice</p>
            <p>The chamber is physically divided into demographic blocks. Are there entire sections glowing red in anger, or is discontent spread evenly?</p>
          </div>
          <p className="font-bold text-pink-600 mt-4">Connect the dots</p>
          <p>If you see a solid red block (e.g., all the 'Poor' voters), you need to consult the Welfare Secretary to sponsor a bill that directly addresses their needs in the next turn.</p>
        </>
      );
    }

    if (activeLens === 'impact_ls') {
      return (
        <>
          <p>You are viewing the <strong className="text-zinc-800">Objective Wellbeing Impact</strong>, stripping away voting intentions.</p>
          <div className="bg-white p-4 rounded-lg border border-zinc-200 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-400 mb-2">Notice</p>
            <p>This reveals the mechanical truth of the policy. Some voters may be "Angry" (red) in the other tabs, despite their wellbeing objectively "Improving" (blue) here, due to their personal utility curves or fairness ideals.</p>
          </div>
        </>
      );
    }
  };

  return (
    <div className={`h-full flex flex-col gap-6 animate-in fade-in duration-300 min-h-0`}>
      
      {/* MODULARISED HEADER BANNER */}
      <SharedTabHeader
        title="Electorate Analysis"
        subtitle="Break down who is supporting your administration."
        approvalRating={approvalRating}
        selectedPolicy={selectedPolicy ?? null}
        setSelectedPolicy={setSelectedPolicy}
        selectedMinister={selectedMinister}
        presentedPolicies={presentedPolicies}
        onNavigateToMinisters={() => setActiveTab('ministers')}
        tutorialClass={getTutorialClass(0)}
      >
        <div className="flex items-center gap-4">
          <div className="flex bg-zinc-100 p-1 rounded-lg shrink-0">
            <button onClick={() => setActiveLens('approval_ls')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeLens === 'approval_ls' ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-500'}`}>Support by Wellbeing</button>
            <button onClick={() => setActiveLens('approval_demo')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeLens === 'approval_demo' ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-500'}`}>Support by Demographic</button>
            <button onClick={() => setActiveLens('impact_ls')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${activeLens === 'impact_ls' ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-500'}`}>Objective Impact</button>
          </div>
        </div>
      </SharedTabHeader>

      <div className="flex-1 flex gap-6 min-h-0">
        
        {/* Chart Area */}
        <div className={`flex-[3] bg-white rounded-xl border border-zinc-200 shadow-sm p-10 relative flex flex-col items-center justify-center min-h-0 overflow-hidden ${getTutorialClass(1)}`}>
          {/* Dynamic Legend */}
          <div className="absolute top-6 right-6 bg-white/80 backdrop-blur-sm border border-zinc-200 p-4 rounded-lg shadow-sm z-10 flex flex-col gap-4">
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Dot Colors</h4>
              <div className="space-y-1.5">
                {Object.entries(colorBy === 'intention' ? STATUS_COLORS.intention : STATUS_COLORS.trajectory).map(([name, color]) => (
                  <div key={name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shadow-sm" style={{backgroundColor: color}} />
                    <span className="text-xs font-bold text-zinc-700">{name}</span>
                  </div>
                ))}
              </div>
            </div>

            {viewMode === 'chamber' && (
              <div className="pt-3 border-t border-zinc-200">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Seating Groups</h4>
                <div className="space-y-1.5">
                  {Object.entries(DEMO_COLORS[groupBy]).map(([name, color]) => (
                    <div key={name} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded border" style={{borderColor: color, backgroundColor: `${color}20`}} />
                      <span className="text-xs font-bold text-zinc-700">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {viewMode === 'chamber' ? (
            <svg viewBox="0 0 900 450" className="w-full h-full max-h-[80vh]" onMouseLeave={() => setHoveredDot(null)}>
              {dots.map((dot, i) => {
                let fill = colorBy === 'intention'
                ? (dot.voter.isApproving ? "#3b82f6" : "#f59e0b")
                : (dot.voter.lsTrajectory > 0.05 ? "#3b82f6" : dot.voter.lsTrajectory < -0.05 ? "#f59e0b" : "#d4d4d8")
                
                return (
                  <circle 
                    key={i} 
                    cx={dot.seat.x} 
                    cy={dot.seat.y} 
                    r="8"
                    fill={fill} 
                    stroke="rgba(0,0,0,0.1)"
                    strokeWidth="1"
                    className="transition-all duration-500 cursor-crosshair hover:r-[10px] hover:stroke-zinc-900 hover:stroke-[3px]" 
                    onMouseEnter={() => setHoveredDot(dot)} 
                  />
                );
              })}
            </svg>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-end px-12 pb-8">
              <div className="w-full flex-1 flex items-end gap-2 border-b border-zinc-200 pb-1">
                {histogramData.bins.map((binData) => {
                  const totalHeight = (binData.total / histogramData.maxCount) * 100;
                  const activeColorMap = colorBy === 'intention' ? STATUS_COLORS.intention : STATUS_COLORS.trajectory;

                  return (
                    <div 
                      key={binData.bin} 
                      className="flex-1 flex flex-col-reverse group relative cursor-crosshair" 
                      style={{ height: `${totalHeight}%` }}
                      onMouseMove={(e) => {
                        let x = e.clientX + 15;
                        let y = e.clientY + 15;
                        if (typeof window !== 'undefined') {
                          if (x + 200 > window.innerWidth) x = e.clientX - 215;
                          if (y + 150 > window.innerHeight) y = e.clientY - 165;
                        }
                        setHoveredBin(binData);
                        setMousePos({ x, y });
                      }}
                      onMouseLeave={() => setHoveredBin(null)}
                    >
                      {Object.entries(activeColorMap).map(([groupName, color]) => {
                        const count = binData.groups[groupName] || 0;
                        if (count === 0) return null;
                        const segmentHeight = (count / binData.total) * 100;
                        
                        return (
                          <div 
                            key={groupName}
                            style={{ height: `${segmentHeight}%`, backgroundColor: color }}
                            className="w-full transition-opacity hover:opacity-90"
                          />
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              <div className="w-full flex justify-between pt-4 px-1 text-[10px] font-bold text-zinc-400">
                {histogramData.bins.map(b => <span key={b.bin} className="flex-1 text-center">{b.bin}</span>)}
              </div>
              <div className="mt-2 text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                Life Satisfaction Score
              </div>
            </div>
          )}

          {/* Tooltip overlay for Histogram groups */}
          {viewMode === 'histogram' && hoveredBin && (
            <div 
              className="fixed z-[9999] bg-white border border-zinc-200 p-4 rounded-xl shadow-xl pointer-events-none text-zinc-800 min-w-[180px] transition-opacity duration-150"
              style={{ left: mousePos.x, top: mousePos.y }}
            >
              <div className="border-b border-zinc-100 pb-2 mb-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">LS Score {hoveredBin.bin}</p>
                <p className="text-sm font-bold text-zinc-600">{hoveredBin.total} Residents</p>
              </div>
              <div className="space-y-2">
                {Object.entries(colorBy === 'intention' ? STATUS_COLORS.intention : STATUS_COLORS.trajectory).map(([groupName, color]) => {
                  const count = hoveredBin.groups[groupName] || 0;
                  if (count === 0) return null;
                  return (
                    <div key={groupName} className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                        <span className="text-zinc-600 text-[11px] font-medium">{groupName}</span>
                      </div>
                      <span className="font-mono font-bold text-zinc-800 text-[11px]">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tooltip for Chamber View */}
          {viewMode === 'chamber' && hoveredDot && (
            <div 
              className="absolute z-50 bg-white p-4 rounded-xl shadow-xl border border-zinc-200 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-6 min-w-[200px]" 
              style={{ left: `calc(50% - 450px + ${hoveredDot.seat.x}px)`, top: `calc(50% - 225px + ${hoveredDot.seat.y}px)` }}
            >
              <p className="text-zinc-800 font-bold text-sm mb-1">Voter ID: {String(hoveredDot.voter.id).substring(0, 6)}</p>
              <p className="text-zinc-500 text-[11px] uppercase tracking-wider mb-3">{hoveredDot.voter.demographics.wealth} Class • {hoveredDot.voter.demographics.age}</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-zinc-800">
                <span className={`font-mono font-bold text-right ${hoveredDot.voter.lsTrajectory >= 0 ? 'text-blue-500' : 'text-amber-500'}`}>
                  {hoveredDot.voter.lsTrajectory >= 0 ? '+' : ''}{hoveredDot.voter.lsTrajectory.toFixed(1)}
                  </span>
                <span className="text-zinc-500">LS Change:</span><span className={`font-mono font-bold text-right ${hoveredDot.voter.lsTrajectory >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{hoveredDot.voter.lsTrajectory >= 0 ? '+' : ''}{hoveredDot.voter.lsTrajectory.toFixed(1)}</span>
                <div className="col-span-2 h-px bg-zinc-100 my-1" />
                <span className={`font-black text-right ${hoveredDot.voter.isApproving ? 'text-blue-500' : 'text-amber-500'}`}>
                  {hoveredDot.voter.isApproving ? 'APPROVES' : 'ANGRY'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Guided Analysis Sidebar */}
        <div className={`flex-1 max-w-[380px] bg-zinc-50 rounded-xl border border-zinc-200 p-6 flex flex-col gap-4 overflow-y-auto shrink-0 shadow-inner ${getTutorialClass(2)}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">💡</span>
            <h3 className="text-sm font-black uppercase tracking-widest text-zinc-800">Guided Analysis</h3>
          </div>
          <div className="text-sm text-zinc-600 space-y-4 leading-relaxed">
            {renderGuidedAnalysis()}
          </div>
        </div>

      </div>
    </div>
  );
}