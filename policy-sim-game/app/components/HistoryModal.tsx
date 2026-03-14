import { TurnHistory } from "../utils/types";

interface HistoryModalProps {
  selectedGroup: { label: string; category: 'wealth' | 'age' | 'traits'; key: string };
  history: TurnHistory[];
  onClose: () => void;
}

export default function HistoryModal({ selectedGroup, history, onClose }: HistoryModalProps) {
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/30 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 border border-zinc-200 transform scale-100 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-xl font-bold text-zinc-800">{selectedGroup.label}</h3>
            <p className="text-sm text-zinc-500 uppercase tracking-widest font-bold">Historical Life Satisfaction</p>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800 transition-colors font-bold"
          >
            ✕
          </button>
        </div>

        <div className="w-full h-80 relative bg-zinc-50 rounded-lg border border-zinc-100 p-4">
          <svg className="w-full h-full overflow-visible">
            {/* Gridlines */}
            {[0, 2, 4, 6, 8, 10].map(y => (
              <line key={y} x1="0%" y1={`${((10 - y) / 10) * 100}%`} x2="100%" y2={`${((10 - y) / 10) * 100}%`} stroke="#e4e4e7" strokeWidth="1" />
            ))}

            {/* The Line */}
            {history.map((h, i) => {
              if (i === 0) return null;
              const prev = history[i - 1];
              const maxTurns = Math.max(20, history.length - 1);
              
              // @ts-ignore
              const prevLs = prev.lsAverages[selectedGroup.category][selectedGroup.key];
              // @ts-ignore
              const currentLs = h.lsAverages[selectedGroup.category][selectedGroup.key];

              return (
                <line
                  key={`line-${i}`}
                  x1={`${(prev.turn / maxTurns) * 100}%`}
                  y1={`${((10 - prevLs) / 10) * 100}%`}
                  x2={`${(h.turn / maxTurns) * 100}%`}
                  y2={`${((10 - currentLs) / 10) * 100}%`}
                  stroke="#ec4899"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              );
            })}

            {/* Data Points */}
            {history.map((h, i) => {
              const maxTurns = Math.max(20, history.length - 1);
              // @ts-ignore
              const ls = h.lsAverages[selectedGroup.category][selectedGroup.key];
              const xPos = `${(h.turn / maxTurns) * 100}%`;
              const yPos = `${((10 - ls) / 10) * 100}%`;

              return (
                <g key={`point-${i}`} className="group/point cursor-crosshair">
                  <circle cx={xPos} cy={yPos} r="5" fill="#ffffff" stroke="#ec4899" strokeWidth="2" className="group-hover/point:stroke-[#be185d] transition-colors" />
                  
                  {/* Tooltip */}
                  <svg x={xPos} y={yPos} className="opacity-0 group-hover/point:opacity-100 transition-opacity pointer-events-none z-50 overflow-visible">
                    <g transform={`translate(${h.turn > 15 ? -100 : h.turn < 5 ? 10 : -50}, -60)`}>
                       <rect x="0" y="0" width="100" height="45" rx="4" fill="#27272a" className="shadow-lg" />
                       <text x="50" y="14" fill="#ffffff" fontSize="10" textAnchor="middle" fontWeight="bold">Turn {h.turn}</text>
                       <text x="50" y="26" fill="#a1a1aa" fontSize="9" textAnchor="middle">Avg LS: {ls.toFixed(2)}</text>
                       {h.enactedPolicyName && (
                         <text x="50" y="38" fill="#f472b6" fontSize="8" textAnchor="middle">"{h.enactedPolicyName}"</text>
                       )}
                    </g>
                  </svg>
                </g>
              );
            })}
          </svg>

          <div className="absolute left-0 top-4 bottom-4 w-6 flex flex-col justify-between items-end pr-2 pointer-events-none text-[9px] font-bold text-zinc-400">
            <span>10</span><span>8</span><span>6</span><span>4</span><span>2</span><span>0</span>
          </div>
        </div>

        <p className="text-xs text-zinc-400 mt-4 text-center">Hover over points to see the policy enacted that turn.</p>
      </div>
    </div>
  );
}