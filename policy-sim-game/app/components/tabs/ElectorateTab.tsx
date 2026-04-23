import React, { useState, useMemo } from "react";
import { Respondent, ElectionCycle } from "../../utils/types";
import { WelfareMetrics } from "../../utils/WelfareMetrics";

interface ElectorateTabProps {
  initialPopulation: Respondent[];
  previewPopulation: Respondent[];
  currentCycle: ElectionCycle;
  approvalRating: number;
}

const SORT_ORDERS = {
  wealth: { 'Poor': 1, 'Middle': 2, 'Wealthy': 3 },
  age: { 'Youth': 1, 'Adult': 2, 'Elderly': 3 }
};

const DEMO_COLORS = {
  wealth: { 'Poor': '#ef4444', 'Middle': '#3b82f6', 'Wealthy': '#10b981' }, 
  age: { 'Youth': '#ec4899', 'Adult': '#8b5cf6', 'Elderly': '#7ff163' }    
};

const STATUS_COLORS = {
  intention: { 'Approves': '#10b981', 'Angry': '#f43f5e' },
  trajectory: { 'Improved': '#3b82f6', 'Worsened': '#f59e0b', 'Stable': '#d4d4d8' }
};

export default function ElectorateTab({ initialPopulation, previewPopulation, currentCycle, approvalRating }: ElectorateTabProps) {
  const [groupBy, setGroupBy] = useState<'wealth' | 'age'>('wealth');
  const [colorBy, setColorBy] = useState<'intention' | 'trajectory' | 'demographic'>('intention');
  const [viewMode, setViewMode] = useState<'chamber' | 'histogram'>('chamber');
  const [hoveredDot, setHoveredDot] = useState<any | null>(null);

  const isTurnZero = useMemo(() => {
    if (previewPopulation.length === 0 || initialPopulation.length === 0) return true;
    return previewPopulation.every((p, i) => Math.abs(p.currentLS - initialPopulation[i].currentLS) < 0.0001);
  }, [initialPopulation, previewPopulation]);

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

      if (colorBy === 'demographic') {
        groupKey = v.demographics[groupBy] as string;
      } else if (colorBy === 'intention') {
        groupKey = v.isApproving ? 'Approves' : 'Angry';
      } else {
        if (v.lsTrajectory > 0.05) groupKey = 'Improved';
        else if (v.lsTrajectory < -0.05) groupKey = 'Worsened';
        else groupKey = 'Stable';
      }

      bins[lsBin].groups[groupKey] = (bins[lsBin].groups[groupKey] || 0) + 1;
      bins[lsBin].total++;
    });

    const maxCount = Math.max(...bins.map(b => b.total));
    return { bins, maxCount };
  }, [processedVoters, groupBy, colorBy]);
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

  const colorOptions = [
    { id: 'intention', label: 'Voting Intention' },
    { id: 'trajectory', label: 'Wellbeing Impact' },
    { id: 'demographic', label: 'Demographic' }
  ];

  const renderGuidedAnalysis = () => {
    if (colorBy === 'intention') {
      return (
        <>
          <p>You are currently viewing the population mapped by their <strong className="text-zinc-800">Voting Intention</strong>.</p>
          <div className="bg-white p-4 rounded-lg border border-zinc-200 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-400 mb-2">Notice</p>
            {isTurnZero ? (
              <p>No policy selected. You are currently viewing the baseline government approval. The most satisfied {Math.round(approvalRating)}% of the population are content with the status quo.</p>
            ) : (
              <p>
                {currentCycle === ElectionCycle.Benthamite || currentCycle === ElectionCycle.Rawlsian 
                  ? "Voters are currently acting on raw self-interest, voting to approve the policy if their own Life Satisfaction does not decrease." 
                  : currentCycle === ElectionCycle.PersonalUtility
                  ? "Voters operate on a rational choice model based on their own personal utility curve. If this policy decreases their personal wellbeing, they will vote against it."
                  : "Voters evaluate the policy based on their individual societal fairness ideals. They will vote against the policy if it moves society away from their preferred distribution."}
              </p>
            )}
          </div>
          {!isTurnZero && (
            <>
              <p className="font-bold text-pink-600 mt-4">Why might this be misleading?</p>
              <p>
                {currentCycle === ElectionCycle.Benthamite 
                  ? "Your goal is total average happiness. A policy might make a minority very angry, but vastly improve the majority, passing your objective despite the red dots."
                  : currentCycle === ElectionCycle.Rawlsian
                  ? "Your goal is protecting the worst-off. A sea of green 'Approving' voters means nothing if the poorest individuals are in the red."
                  : currentCycle === ElectionCycle.PersonalUtility
                  ? "A voter might be 'Angry' even if their raw life satisfaction goes up, due to diminishing returns. Switch to Wellbeing Impact to see this divergence."
                  : "A voter whose personal situation worsens might still vote 'Yes' because they prefer the new, fairer societal distribution. Not all green dots are selfish."}
              </p>
            </>
          )}
        </>
      );
    }

    if (colorBy === 'trajectory') {
      return (
        <>
          <p>You are viewing the <strong className="text-zinc-800">Wellbeing Impact</strong> of the current policy. This strips away complex utility math and shows raw changes to life satisfaction.</p>
          <div className="bg-white p-4 rounded-lg border border-zinc-200 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-400 mb-2">Notice</p>
            <p>{isTurnZero ? "No policy selected. Everyone's trajectory is currently completely stable." : "This view ignores how a voter feels about the policy, and purely maps whether they objectively gained or lost wellbeing."}</p>
          </div>
          {!isTurnZero && (
            <>
              <p className="font-bold text-pink-600 mt-4">Who is bearing the cost?</p>
              <p>
                {currentCycle === ElectionCycle.Benthamite
                  ? "Under Bentham, it is acceptable for a minority to be 'Worsened' if the majority is 'Improved' enough to raise the average. Switch to Demographic to see who is paying the price."
                  : currentCycle === ElectionCycle.Rawlsian
                  ? "Look closely at the 'Worsened' (orange) dots. Under Rawlsian rules, if even one of the poorest voters is worsened, the policy is a failure."
                  : "Do the 'Worsened' dots align with the 'Angry' voters from the Intention tab? Switch to Demographic to see who is actually bearing the real-world cost."}
              </p>
            </>
          )}
        </>
      );
    }

    if (colorBy === 'demographic') {
      return (
        <>
          <p>You are analysing the electorate by their <strong className="text-zinc-800">Demographic Breakdown</strong>.</p>
          <div className="bg-white p-4 rounded-lg border border-zinc-200 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-zinc-400 mb-2">Notice</p>
            <p>Look at how the clusters of wealth and age are distributed. Are they grouped tightly together, or spread evenly across the chamber?</p>
          </div>
          <p className="font-bold text-pink-600 mt-4">Connect the dots</p>
          <p>
            {currentCycle === ElectionCycle.Benthamite
              ? "Utilitarianism can sometimes punish specific minority groups to benefit the majority. Check if one demographic (e.g., the Poor or Elderly) is disproportionately bearing the cost of your decisions."
              : currentCycle === ElectionCycle.Rawlsian
              ? "Rawlsian ethics demands we focus on the worst-off. Look closely at the 'Poor' cluster. Are they isolated from the benefits of your policies?"
              : currentCycle === ElectionCycle.PersonalUtility
              ? "Different demographics have different baseline utilities. A wealthy person might barely notice a 0.5 LS drop, but it could devastate a poor person."
              : "Fairness ideals often correlate with demographics. Do the wealthy prefer different distributions than the poor? Watch how different groups react to the exact same policy."}
          </p>
        </>
      );
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-300 min-h-0">
      {/* Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex justify-between items-center shrink-0">
        <div className="flex gap-8 items-center">
          <div>
            <h2 className="text-xl font-bold text-zinc-800">Electorate Analysis</h2>
            <p className="text-sm text-zinc-500">Visualising demographic distribution and individual voter sentiment.</p>
          </div>
          
          <div className="flex bg-zinc-100 p-1 rounded-lg border border-zinc-200">
            <button 
              onClick={() => setViewMode('chamber')} 
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'chamber' ? 'bg-white text-pink-600 shadow-sm' : 'text-zinc-500'}`}
            >
              Chamber View
            </button>
            <button 
              onClick={() => setViewMode('histogram')} 
              className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'histogram' ? 'bg-white text-pink-600 shadow-sm' : 'text-zinc-500'}`}
            >
              Distribution View
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex bg-zinc-100 p-1 rounded-lg">
            {colorOptions.map(opt => (
              <button 
                key={opt.id} 
                onClick={() => setColorBy(opt.id as any)} 
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${colorBy === opt.id ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-500'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="w-px h-8 bg-zinc-200" />
          <div className="flex bg-zinc-100 p-1 rounded-lg">
            {['wealth', 'age'].map(t => (
              <button key={t} onClick={() => setGroupBy(t as any)} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${groupBy === t ? 'bg-white text-pink-600 shadow-sm' : 'text-zinc-500'}`}>
                Group by {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        
        {/* Chart Area */}
        <div className="flex-[3] bg-white rounded-xl border border-zinc-200 shadow-sm p-10 relative flex flex-col items-center justify-center min-h-0 overflow-hidden">
          {/* Dynamic Legend */}
          <div className="absolute top-6 right-6 bg-white/80 backdrop-blur-sm border border-zinc-200 p-4 rounded-lg shadow-sm z-10">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 text-center">Legend</h4>
            <div className="space-y-2">
              {colorBy === 'demographic' ? (
                Object.entries(DEMO_COLORS[groupBy]).map(([name, color]) => (
                  <div key={name} className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full shadow-sm" style={{backgroundColor: color}} />
                    <span className="text-xs font-bold text-zinc-700">{name}</span>
                  </div>
                ))
              ) : colorBy === 'intention' ? (
                Object.entries(STATUS_COLORS.intention).map(([name, color]) => (
                  <div key={name} className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full shadow-sm" style={{backgroundColor: color}} />
                    <span className="text-xs font-bold text-zinc-700">{name}</span>
                  </div>
                ))
              ) : (
                Object.entries(STATUS_COLORS.trajectory).map(([name, color]) => (
                  <div key={name} className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full shadow-sm" style={{backgroundColor: color}} />
                    <span className="text-xs font-bold text-zinc-700">{name}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {viewMode === 'chamber' ? (
            <svg viewBox="0 0 900 450" className="w-full h-full max-h-[80vh]" onMouseLeave={() => setHoveredDot(null)}>
              {dots.map((dot, i) => {
                let fill = "#d4d4d8"; 
                if (colorBy === 'demographic') {
                  // @ts-ignore
                  fill = DEMO_COLORS[groupBy][dot.voter.demographics[groupBy]];
                } else if (colorBy === 'intention') {
                  fill = dot.voter.isApproving ? "#10b981" : "#f43f5e";
                } else {
                  if (dot.voter.lsTrajectory > 0.05) fill = "#3b82f6";
                  else if (dot.voter.lsTrajectory < -0.05) fill = "#f59e0b";
                }

                return (
                  <circle 
                    key={i} 
                    cx={dot.seat.x} 
                    cy={dot.seat.y} 
                    r="8"
                    fill={fill} 
                    className="transition-all duration-500 cursor-crosshair hover:r-10 hover:stroke-zinc-900 hover:stroke-2" 
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
                  
                  const activeColorMap = colorBy === 'demographic' 
                    ? DEMO_COLORS[groupBy] 
                    : colorBy === 'intention' 
                      ? STATUS_COLORS.intention 
                      : STATUS_COLORS.trajectory;

                  return (
                    <div key={binData.bin} className="flex-1 flex flex-col-reverse group relative" style={{ height: `${totalHeight}%` }}>
                      {Object.entries(activeColorMap).map(([groupName, color]) => {
                        const count = binData.groups[groupName] || 0;
                        if (count === 0) return null;
                        const segmentHeight = (count / binData.total) * 100;
                        
                        return (
                          <div 
                            key={groupName}
                            style={{ height: `${segmentHeight}%`, backgroundColor: color }}
                            className="w-full"
                            title={`${groupName}: ${count}`}
                          />
                        );
                      })}
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        Total: {binData.total}
                      </div>
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

          {/* Tooltip for Chamber View */}
          {viewMode === 'chamber' && hoveredDot && (
            <div 
              className="absolute z-50 bg-zinc-900 p-4 rounded-xl shadow-2xl border border-zinc-700 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-6" 
              style={{ left: `calc(50% - 450px + ${hoveredDot.seat.x}px)`, top: `calc(50% - 225px + ${hoveredDot.seat.y}px)` }}
            >
              <p className="text-white font-bold text-sm mb-1">Voter ID: {String(hoveredDot.voter.id).substring(0, 6)}</p>
              <p className="text-zinc-400 text-[11px] uppercase tracking-wider mb-3">{hoveredDot.voter.demographics.wealth} Class • {hoveredDot.voter.demographics.age}</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-white">
                <span className="text-zinc-500">Current LS:</span><span className="font-mono font-bold text-right">{hoveredDot.voter.currentLS.toFixed(1)}</span>
                <span className="text-zinc-500">LS Change:</span><span className={`font-mono font-bold text-right ${hoveredDot.voter.lsTrajectory >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{hoveredDot.voter.lsTrajectory >= 0 ? '+' : ''}{hoveredDot.voter.lsTrajectory.toFixed(1)}</span>
                <div className="col-span-2 h-px bg-zinc-800 my-1" />
                <span className="text-zinc-500 font-bold">Government:</span><span className={`font-black text-right ${hoveredDot.voter.isApproving ? 'text-emerald-400' : 'text-rose-400'}`}>{hoveredDot.voter.isApproving ? 'APPROVES' : 'ANGRY'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Guided Analysis Sidebar */}
        <div className="flex-1 max-w-[380px] bg-zinc-50 rounded-xl border border-zinc-200 p-6 flex flex-col gap-4 overflow-y-auto shrink-0 shadow-inner">
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