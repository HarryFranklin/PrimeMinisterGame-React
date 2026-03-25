import React from "react";

interface MinistersTabProps {
  ministers: any[];
}

export default function MinistersTab({ ministers }: MinistersTabProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 h-full animate-in fade-in duration-300 overflow-y-auto pb-6">
      {ministers.map((minister, i) => (
        <div key={i} className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 flex flex-col min-h-[250px]">
          
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-base font-black uppercase tracking-widest text-zinc-800">{minister.name}</h3>
              <p className="text-sm text-zinc-500 capitalize">{minister.status} with trajectory</p>
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
          <div className="mt-6 pt-4 border-t border-zinc-100 italic text-base text-zinc-500">
            "{minister.quote}"
          </div>
        </div>
      ))}
    </div>
  );
}