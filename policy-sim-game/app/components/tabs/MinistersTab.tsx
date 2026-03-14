import React from "react";

interface MinistersTabProps {
  ministers: any[];
}

export default function MinistersTab({ ministers }: MinistersTabProps) {
  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-300 min-h-0">
      <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xl font-bold text-zinc-800">The Cabinet Room</h2>
          <p className="text-sm text-zinc-500">Detailed breakdown of ministerial approval and underlying demographic utility.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 grid-rows-2 gap-6 flex-1 min-h-0 pb-2">
        {ministers.map((m, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm flex flex-col h-full">
            <div className="flex items-center gap-4 mb-4 shrink-0">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${m.color} border-2 border-white shadow-sm text-2xl shrink-0`}>
                  {m.status === 'happy' && '😊'}
                  {m.status === 'neutral' && '😐'}
                  {m.status === 'angry' && '😠'}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-zinc-800 text-lg truncate">Minister for {m.name}</h4>
                <p className="text-xs uppercase tracking-widest text-zinc-400 font-bold">
                  Status: <span className={m.status === 'angry' ? 'text-red-500' : ''}>{m.status}</span>
                </p>
              </div>
            </div>
            
            <div className="flex-1 flex items-center mb-5 min-h-0">
              <p className="text-zinc-600 text-sm leading-relaxed italic border-l-2 border-zinc-200 pl-3 py-1 line-clamp-4">
                "{m.quote}"
              </p>
            </div>

            <div className="bg-zinc-50 rounded-lg border border-zinc-100 p-4 space-y-2 text-sm shrink-0">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Base Utility (Turn 1):</span>
                  <span className="font-mono text-zinc-700">{m.baseScore.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Current Utility:</span>
                  <span className="font-mono text-zinc-700">{m.projScore.toFixed(3)}</span>
                </div>
                <div className="w-full h-px bg-zinc-200 my-1" />
                <div className="flex justify-between items-center pt-1">
                  <span className="font-bold text-zinc-700">Trajectory (Δ):</span>
                  <span className={`font-black ${m.delta < -0.0001 ? 'text-red-500' : m.delta > 0.0001 ? 'text-emerald-500' : 'text-zinc-500'}`}>
                    {m.delta > 0.0001 ? '+' : ''}{(m.delta * 100).toFixed(2)}%
                  </span>
                </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}