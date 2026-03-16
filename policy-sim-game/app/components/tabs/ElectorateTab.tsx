import React, { useState, useMemo } from "react";
import { Respondent, ElectionCycle } from "../../utils/types";
import { WelfareMetrics } from "../../utils/WelfareMetrics";

interface ElectorateTabProps {
  initialPopulation: Respondent[];
  previewPopulation: Respondent[];
  currentCycle: ElectionCycle;
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

export default function ElectorateTab({ initialPopulation, previewPopulation, currentCycle }: ElectorateTabProps) {
  const [groupBy, setGroupBy] = useState<'wealth' | 'age'>('wealth');
  const [colorBy, setColorBy] = useState<'demographic' | 'intention' | 'trajectory'>('demographic');
  const [viewMode, setViewMode] = useState<'chamber' | 'histogram'>('chamber');
  const [hoveredDot, setHoveredDot] = useState<any | null>(null);

  // #region Data Processing
  const processedVoters = useMemo(() => {
    if (previewPopulation.length === 0) return [];
    const allInitialLS = initialPopulation.map(p => p.currentLS);
    const allPreviewLS = previewPopulation.map(p => p.currentLS);

    const mapped = previewPopulation.map((r, i) => {
      const initialUtil = currentCycle === ElectionCycle.Utilitarian 
        ? WelfareMetrics.getUtilityForPerson(initialPopulation[i].currentLS, r.personalUtilities)
        : WelfareMetrics.evaluateDistribution(allInitialLS, r.societalUtilities);
        
      const currentUtil = currentCycle === ElectionCycle.Utilitarian 
        ? WelfareMetrics.getUtilityForPerson(r.currentLS, r.personalUtilities)
        : WelfareMetrics.evaluateDistribution(allPreviewLS, r.societalUtilities);

      const utilityShift = currentUtil - initialUtil;
      const multiplier = utilityShift < 0 ? 2.5 : 1.2; // Multiplier to account for loss aversion
      const perceivedScore = currentUtil + (utilityShift * multiplier);

      return {
        ...r,
        initialLS: initialPopulation[i].currentLS,
        utilityShift,
        isApproving: perceivedScore >= 0.90, // Happiness threshold
        lsTrajectory: r.currentLS - initialPopulation[i].currentLS
      };
    });

    return mapped.sort((a, b) => {
      const valA = a.demographics[groupBy];
      const valB = b.demographics[groupBy];
      // @ts-ignore
      return SORT_ORDERS[groupBy][valA] - SORT_ORDERS[groupBy][valB];
    });
  }, [initialPopulation, previewPopulation, currentCycle, groupBy]);

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
            {['wealth', 'age'].map(t => (
              <button key={t} onClick={() => setGroupBy(t as any)} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${groupBy === t ? 'bg-white text-pink-600 shadow-sm' : 'text-zinc-500'}`}>
                Group by {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <div className="w-px h-8 bg-zinc-200" />
          <div className="flex bg-zinc-100 p-1 rounded-lg">
            {['demographic', 'intention', 'trajectory'].map(opt => (
              <button key={opt} onClick={() => setColorBy(opt as any)} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${colorBy === opt ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-500'}`}>
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-zinc-200 shadow-sm p-10 relative flex flex-col items-center justify-center min-h-0 overflow-hidden">
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
                
                // Determine which color set to iterate over
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
                    {/* Hover Info */}
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
    </div>
  );
}