import React, { useEffect, useRef } from "react";

interface MinistersTabProps {
  ministers: any[];
  selectedMinisterName?: string | null;
}

export default function MinistersTab({ ministers, selectedMinisterName }: MinistersTabProps) {
  const ministerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    // If a minister was clicked from the dashboard, scroll them into view
    if (selectedMinisterName && ministerRefs.current[selectedMinisterName]) {
      ministerRefs.current[selectedMinisterName]?.scrollIntoView({ 
        behavior: "smooth", 
        block: "center" 
      });
    }
  }, [selectedMinisterName]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 h-full animate-in fade-in duration-300 overflow-y-auto pb-6">
      {ministers.map((minister, i) => {
        const isHighlighted = selectedMinisterName === minister.name;
        
        return (
          <div 
            key={i} 
            ref={(el) => { ministerRefs.current[minister.name] = el; }}
            className={`bg-white rounded-xl border shadow-sm p-6 flex flex-col min-h-[250px] transition-all duration-500 ${
              isHighlighted ? 'border-pink-500 ring-4 ring-pink-500/20 shadow-md scale-[1.02]' : 'border-zinc-200'
            }`}
          >
            
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className={`text-base font-black uppercase tracking-widest ${isHighlighted ? 'text-pink-700' : 'text-zinc-800'}`}>
                  {minister.name}
                </h3>
                <p className="text-sm font-bold text-zinc-500 mt-1">{minister.mandate}</p>
                <p className="text-xs text-zinc-400 capitalize mt-1">{minister.status} with trajectory</p>
              </div>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${minister.color} border-4 border-white shadow-md text-4xl shrink-0`}>
                {minister.status === 'happy' && '😊'}
                {minister.status === 'neutral' && '😐'}
                {minister.status === 'angry' && '😠'}
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-4 flex-1">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">Current Dem. Score</p>
                <p className="text-4xl font-black text-zinc-800 tracking-tighter">
                  {minister.currentScore !== undefined ? (minister.currentScore * 10).toFixed(2) : "0.00"}
                  <span className="text-base text-zinc-400 font-bold ml-1">/ 10</span>
                </p>
              </div>
              
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">Projected with Policy</p>
                <div className="flex items-baseline gap-3">
                  <p className="text-2xl font-bold text-zinc-600">
                    {minister.projectedScore !== undefined ? (minister.projectedScore * 10).toFixed(2) : "0.00"}
                  </p>
                  {minister.policyDelta !== undefined && Math.abs(minister.policyDelta) > 0.0005 && (
                    <span className={`text-sm font-black px-2.5 py-0.5 rounded-full ${minister.policyDelta > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {minister.policyDelta > 0 ? '↑' : '↓'} {Math.abs(minister.policyDelta * 10).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quote */}
            {minister.quote && (
              <div className="mt-6 pt-4 border-t border-zinc-100 italic text-base text-zinc-500">
                "{minister.quote}"
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}