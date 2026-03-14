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

export default function ElectorateTab({ initialPopulation, previewPopulation, currentCycle }: ElectorateTabProps) {
  const [groupBy, setGroupBy] = useState<'wealth' | 'age'>('wealth');
  const [colorBy, setColorBy] = useState<'intention' | 'trajectory'>('intention');
  const [hoveredDot, setHoveredDot] = useState<any | null>(null);

  // 1. Calculate the exact stats and sorting order for every single voter
  const processedVoters = useMemo(() => {
    if (previewPopulation.length === 0) return [];
    
    const allInitialLS = initialPopulation.map(p => p.currentLS);
    const allPreviewLS = previewPopulation.map(p => p.currentLS);

    const mapped = previewPopulation.map((r, i) => {
      let initialUtil = 0;
      let currentUtil = 0;

      if (currentCycle === ElectionCycle.Utilitarian) {
        initialUtil = WelfareMetrics.getUtilityForPerson(initialPopulation[i].currentLS, r.personalUtilities);
        currentUtil = WelfareMetrics.getUtilityForPerson(r.currentLS, r.personalUtilities);
      } else {
        initialUtil = WelfareMetrics.evaluateDistribution(allInitialLS, r.societalUtilities);
        currentUtil = WelfareMetrics.evaluateDistribution(allPreviewLS, r.societalUtilities);
      }

      const delta = currentUtil - initialUtil;
      const multiplier = delta < 0 ? 2.5 : 1.2;
      const perceivedScore = currentUtil + (delta * multiplier);

      const isApproving = perceivedScore >= 0.90;
      const lsTrajectory = r.currentLS - initialPopulation[i].currentLS;

      return {
        ...r,
        initialLS: initialPopulation[i].currentLS,
        isApproving,
        lsTrajectory
      };
    });

    // Sort them so they group naturally into wedges in the semi-circle
    return mapped.sort((a, b) => {
      const valA = a.demographics[groupBy] as keyof typeof SORT_ORDERS[typeof groupBy];
      const valB = b.demographics[groupBy] as keyof typeof SORT_ORDERS[typeof groupBy];
      // @ts-ignore
      return SORT_ORDERS[groupBy][valA] - SORT_ORDERS[groupBy][valB];
    });
  }, [initialPopulation, previewPopulation, currentCycle, groupBy]);

  // 2. Generate Concentric Semi-Circle "Parliament" Coordinates (Left-to-Right Wedges)
  const seats = useMemo(() => {
    const totalSeats = processedVoters.length;
    if (totalSeats === 0) return [];

    const width = 800;
    const height = 400;
    const rows = 12; // Number of semi-circle rings
    const innerRadius = 100;
    const outerRadius = 380;
    const rowThickness = (outerRadius - innerRadius) / rows;

    let totalPerimeter = 0;
    for(let i=0; i<rows; i++) {
      totalPerimeter += Math.PI * (innerRadius + i * rowThickness);
    }

    const generatedSeats = [];
    let allocated = 0;
    const rowCounts = [];
    
    // Distribute dots to rows proportionally based on circumference
    for(let i=0; i<rows; i++) {
      const r = innerRadius + i * rowThickness;
      const rowPerimeter = Math.PI * r;
      let seatsInThisRow = Math.round((rowPerimeter / totalPerimeter) * totalSeats);
      rowCounts.push(seatsInThisRow);
      allocated += seatsInThisRow;
    }

    // Fix rounding errors on the outermost row
    rowCounts[rows-1] += (totalSeats - allocated);

    // Map the dots
    for(let i=0; i<rows; i++) {
      const r = innerRadius + i * rowThickness;
      const count = rowCounts[i];
      for(let j=0; j<count; j++) {
        // Spread angles from Math.PI (Left) to 0 (Right), with a 2% padding
        const angle = Math.PI - (0.02 + 0.96 * (j / Math.max(1, count - 1))) * Math.PI;
        const x = width / 2 + Math.cos(angle) * r;
        const y = height - 10 - Math.sin(angle) * r; // Y goes down in SVG
        
        // Save the angle so we can sort the seats by it later
        generatedSeats.push({ x, y, angle });
      }
    }

    // THE FIX: Sort all seats strictly by their angle (from Math.PI down to 0 -> Left to Right).
    // This ensures that when we map our sorted voters to these seats, they form clear, solid wedges.
    generatedSeats.sort((a, b) => b.angle - a.angle);

    return generatedSeats;
  }, [processedVoters.length]);

  // Ensure we have exact pairs (safeguard)
  const dots = processedVoters.map((voter, i) => ({
    voter,
    seat: seats[i] || { x: 0, y: 0 }
  }));

  // Helper for wedge labels
  const getGroups = () => {
    if (groupBy === 'wealth') return ['Poor', 'Middle Class', 'Wealthy'];
    return ['Youth', 'Adults', 'Elderly'];
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-300 min-h-0">
      
      {/* Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xl font-bold text-zinc-800">The Electorate Chamber</h2>
          <p className="text-sm text-zinc-500">Every single voter visualised. 1 dot = 1 person.</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Group Into Blocks By</span>
            <div className="flex bg-zinc-100 p-1 rounded-lg">
              <button onClick={() => setGroupBy('wealth')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${groupBy === 'wealth' ? 'bg-white text-pink-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>Wealth</button>
              <button onClick={() => setGroupBy('age')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${groupBy === 'age' ? 'bg-white text-pink-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>Age</button>
            </div>
          </div>
          
          <div className="w-px h-8 bg-zinc-200" />
          
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Colour Dots By</span>
            <div className="flex bg-zinc-100 p-1 rounded-lg">
              <button onClick={() => setColorBy('intention')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${colorBy === 'intention' ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>Voting Intention</button>
              <button onClick={() => setColorBy('trajectory')} className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${colorBy === 'trajectory' ? 'bg-white text-zinc-800 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>LS Trajectory</button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chamber Visualisation */}
      <div className="flex-1 bg-white rounded-xl border border-zinc-200 shadow-sm p-6 relative flex flex-col items-center justify-center min-h-0">
        
        {/* Dynamic Legend */}
        <div className="absolute top-6 right-6 bg-zinc-50 border border-zinc-200 p-3 rounded-lg shadow-sm">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">Legend</h4>
          {colorBy === 'intention' ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-xs font-bold text-zinc-700">Approves (Voting For You)</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500" /><span className="text-xs font-bold text-zinc-700">Disapproves (Lost Vote)</span></div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" /><span className="text-xs font-bold text-zinc-700">Life Satisfaction Up (Since T1)</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500" /><span className="text-xs font-bold text-zinc-700">Life Satisfaction Down</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-zinc-300" /><span className="text-xs font-bold text-zinc-700">No Change</span></div>
            </div>
          )}
        </div>

        {/* The SVG Parliament */}
        <svg viewBox="0 0 800 400" className="w-full max-w-4xl h-auto overflow-visible" onMouseLeave={() => setHoveredDot(null)}>
          {dots.map((dot, i) => {
            let fill = "#d4d4d8"; // default zinc-300
            
            if (colorBy === 'intention') {
              fill = dot.voter.isApproving ? "#10b981" : "#f43f5e"; // emerald-500 vs rose-500
            } else {
              if (dot.voter.lsTrajectory > 0.05) fill = "#3b82f6"; // blue-500
              else if (dot.voter.lsTrajectory < -0.05) fill = "#f59e0b"; // amber-500
            }

            return (
              <circle
                key={i}
                cx={dot.seat.x}
                cy={dot.seat.y}
                r="6"
                fill={fill}
                className="transition-all duration-500 cursor-crosshair hover:stroke-zinc-900 hover:stroke-2"
                onMouseEnter={() => setHoveredDot(dot)}
              />
            );
          })}
        </svg>

        {/* Wedge Labels at the bottom of the semi-circle */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-24 text-sm font-bold uppercase tracking-widest text-zinc-400">
           {getGroups().map((g, i) => <span key={i}>{g}</span>)}
        </div>

        {/* Custom Tooltip */}
        {hoveredDot && (
          <div 
            className="absolute z-50 bg-zinc-900 p-3 rounded-lg shadow-xl border border-zinc-700 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-4"
            style={{ left: `calc(50% - 400px + ${hoveredDot.seat.x}px)`, top: `calc(50% - 200px + ${hoveredDot.seat.y}px)` }}
          >
            <p className="text-white font-bold text-xs mb-1">
              {/* Wrapped the ID in String() to safely cast it before slicing */}
              Voter ID: {String(hoveredDot.voter.id).substring(0, 6)}
            </p>
            <p className="text-zinc-400 text-[10px] uppercase mb-2">
              {hoveredDot.voter.demographics.wealth} • {hoveredDot.voter.demographics.age}
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-zinc-500">Current LS:</span>
              <span className="text-white font-mono">{hoveredDot.voter.currentLS.toFixed(1)}</span>
              
              <span className="text-zinc-500">Initial LS:</span>
              <span className="text-white font-mono">{hoveredDot.voter.initialLS.toFixed(1)}</span>
              
              <span className="text-zinc-500 mt-1">Status:</span>
              <span className={`font-bold mt-1 ${hoveredDot.voter.isApproving ? 'text-emerald-400' : 'text-rose-400'}`}>
                {hoveredDot.voter.isApproving ? 'Approves' : 'Angry'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}