import React, { useState, useMemo } from "react";
import { Respondent, ElectionCycle } from "../../utils/types";
import { WelfareMetrics } from "../../utils/WelfareMetrics";

interface ElectorateTabProps {
  initialPopulation: Respondent[];
  previewPopulation: Respondent[];
  currentCycle: ElectionCycle;
}

// Fixed sort orders to ensure wedges always appear in a logical left-to-right sequence
const SORT_ORDERS = {
  wealth: { 'Poor': 1, 'Middle': 2, 'Wealthy': 3 },
  age: { 'Youth': 1, 'Adult': 2, 'Elderly': 3 }
};

// Distinct colours for demographic grouping
const DEMO_COLORS = {
  wealth: { 'Poor': '#ef4444', 'Middle': '#3b82f6', 'Wealthy': '#10b981' }, // Red, Blue, Emerald
  age: { 'Youth': '#ec4899', 'Adult': '#8b5cf6', 'Elderly': '#208b67' }    // Pink, Violet, Green
};

export default function ElectorateTab({ initialPopulation, previewPopulation, currentCycle }: ElectorateTabProps) {
  const [groupBy, setGroupBy] = useState<'wealth' | 'age'>('wealth');
  const [colorBy, setColorBy] = useState<'demographic' | 'intention' | 'trajectory'>('demographic');
  const [hoveredDot, setHoveredDot] = useState<any | null>(null);

  // 1. Calculate stats anchoring strictly to "When you took office"
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

      // Use multiplier to simulate the effect of people feeling losses more than gains.
      const multiplier = utilityShift < 0 ? 2.5 : 1.2;
      const perceivedScore = currentUtil + (utilityShift * multiplier);

      // 0.90 as the threshold for approval (arbitrarily chosen number)
      const isApproving = perceivedScore >= 0.90;
      const lsTrajectory = r.currentLS - initialPopulation[i].currentLS;

      return {
        ...r,
        initialLS: initialPopulation[i].currentLS,
        utilityShift,
        isApproving,
        lsTrajectory
      };
    });

    return mapped.sort((a, b) => {
      const valA = a.demographics[groupBy] as keyof typeof SORT_ORDERS[typeof groupBy];
      const valB = b.demographics[groupBy] as keyof typeof SORT_ORDERS[typeof groupBy];
      // @ts-ignore
      return SORT_ORDERS[groupBy][valA] - SORT_ORDERS[groupBy][valB];
    });
  }, [initialPopulation, previewPopulation, currentCycle, groupBy]);

  // 2. Generate Concentric Semi-Circle coordinates sorted by angle
  const seats = useMemo(() => {
    const totalSeats = processedVoters.length;
    if (totalSeats === 0) return [];
    const width = 800; const height = 400; const rows = 12; 
    const innerRadius = 100; const outerRadius = 380;
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
        generatedSeats.push({ x: width / 2 + Math.cos(angle) * r, y: height - 10 - Math.sin(angle) * r, angle });
      }
    }
    generatedSeats.sort((a, b) => b.angle - a.angle);
    return generatedSeats;
  }, [processedVoters.length]);

  const dots = processedVoters.map((voter, i) => ({ voter, seat: seats[i] || { x: 0, y: 0 } }));

  const getGroups = () => groupBy === 'wealth' ? ['Poor', 'Middle Class', 'Wealthy'] : ['Youth', 'Adults', 'Elderly'];

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-300 min-h-0">
      <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xl font-bold text-zinc-800">The Electorate Chamber</h2>
          <p className="text-sm text-zinc-500">Visualizing the weight of each demographic block.</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Group By</span>
            <div className="flex bg-zinc-100 p-1 rounded-lg">
              {['wealth', 'age'].map(t => (
                <button key={t} onClick={() => setGroupBy(t as any)} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${groupBy === t ? 'bg-white text-pink-600 shadow-sm' : 'text-zinc-500'}`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
              ))}
            </div>
          </div>
          
          <div className="w-px h-8 bg-zinc-200" />
          
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Colour Dots By</span>
            <div className="flex bg-zinc-100 p-1 rounded-lg">
              {[
                {id: 'demographic', label: 'Demographic'},
                {id: 'intention', label: 'Voting Intention'},
                {id: 'trajectory', label: 'LS Trajectory'}
              ].map(opt => (
                <button key={opt.id} onClick={() => setColorBy(opt.id as any)} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${colorBy === opt.id ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-500'}`}>{opt.label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border border-zinc-200 shadow-sm p-6 relative flex flex-col items-center justify-center min-h-0">
        <div className="absolute top-6 right-6 bg-zinc-50 border border-zinc-200 p-3 rounded-lg shadow-sm z-10">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Legend</h4>
          <div className="space-y-1">
            {colorBy === 'demographic' ? (
              Object.entries(DEMO_COLORS[groupBy]).map(([name, color]) => (
                <div key={name} className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{backgroundColor: color}} /><span className="text-xs font-bold text-zinc-700">{name}</span></div>
              ))
            ) : colorBy === 'intention' ? (
              <>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-xs font-bold text-zinc-700">Approves (Voting For You)</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500" /><span className="text-xs font-bold text-zinc-700">Disapproves (Lost Vote)</span></div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" /><span className="text-xs font-bold text-zinc-700">LS Improved</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /><span className="text-xs font-bold text-zinc-700">LS Worsened</span></div>
              </>
            )}
          </div>
        </div>

        <svg viewBox="0 0 800 400" className="w-full max-w-4xl h-auto overflow-visible" onMouseLeave={() => setHoveredDot(null)}>
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
              <circle key={i} cx={dot.seat.x} cy={dot.seat.y} r="6" fill={fill} className="transition-all duration-500 cursor-crosshair hover:stroke-zinc-900 hover:stroke-2" onMouseEnter={() => setHoveredDot(dot)} />
            );
          })}
        </svg>

        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-24 text-sm font-bold uppercase tracking-widest text-zinc-400">
           {getGroups().map((g, i) => <span key={i}>{g}</span>)}
        </div>

        {hoveredDot && (
          <div className="absolute z-50 bg-zinc-900 p-3 rounded-lg shadow-xl border border-zinc-700 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-4" style={{ left: `calc(50% - 400px + ${hoveredDot.seat.x}px)`, top: `calc(50% - 200px + ${hoveredDot.seat.y}px)` }}>
            <p className="text-white font-bold text-xs mb-1">Voter ID: {String(hoveredDot.voter.id).substring(0, 6)}</p>
            <p className="text-zinc-400 text-[10px] uppercase mb-2">{hoveredDot.voter.demographics.wealth} • {hoveredDot.voter.demographics.age}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-white">
              <span className="text-zinc-500">Current LS:</span><span className="font-mono">{hoveredDot.voter.currentLS.toFixed(1)}</span>
              <span className="text-zinc-500">LS Change:</span><span className={hoveredDot.voter.lsTrajectory >= 0 ? 'text-emerald-400' : 'text-amber-400'}>{hoveredDot.voter.lsTrajectory >= 0 ? '+' : ''}{hoveredDot.voter.lsTrajectory.toFixed(1)}</span>
              <div className="col-span-2 h-px bg-zinc-800 my-1" />
              <span className="text-zinc-500">Status:</span><span className={`font-bold ${hoveredDot.voter.isApproving ? 'text-emerald-400' : 'text-rose-400'}`}>{hoveredDot.voter.isApproving ? 'Approves' : 'Angry'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}