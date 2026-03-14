import React from "react";

// --- REUSABLE UI COMPONENTS ---
// Encapsulated here to keep the global namespace clean, as they are only used in this tab.
const AgeDemographicRow = ({ item, currentTurn, onClick }: { item: any, currentTurn: number, onClick: () => void }) => {
  const isUnlocked = currentTurn >= 5;
  return (
    <div 
      onClick={isUnlocked ? onClick : undefined}
      className={`group p-2 -mx-2 rounded-lg transition-colors relative ${isUnlocked ? 'hover:bg-zinc-50 cursor-pointer' : 'cursor-not-allowed'}`}
    >
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-zinc-400 text-xs transition-opacity" title={!isUnlocked ? "Unlocks after Turn 5" : "View History"}>
        {isUnlocked ? '⤢' : '🔒'}
      </div>
      <div className="flex justify-between text-sm mb-1">
        <span className={`font-bold text-zinc-700 transition-colors ${isUnlocked ? 'group-hover:text-pink-600' : ''}`}>{item.label}</span>
        <span className="text-zinc-500 mr-4">Avg LS: <strong className="text-zinc-800">{item.data.ls}</strong></span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-3 bg-zinc-100 rounded-full overflow-hidden">
          <div className={`h-full ${item.color}`} style={{ width: `${item.data.pct}%` }} />
        </div>
        <span className="text-xs font-bold w-12 text-right mr-4">{item.data.pct}%</span>
      </div>
    </div>
  );
};

const VotingBlockCard = ({ item, currentTurn, onClick }: { item: any, currentTurn: number, onClick: () => void }) => {
  const isUnlocked = currentTurn >= 5;
  return (
    <div 
      onClick={isUnlocked ? onClick : undefined}
      className={`p-4 bg-zinc-50 rounded-lg border border-zinc-100 flex flex-col items-center text-center justify-center transition-all group relative ${isUnlocked ? 'cursor-pointer hover:border-pink-300 hover:shadow-md hover:bg-white' : 'cursor-not-allowed opacity-90'}`}
    >
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-zinc-400 text-xs transition-opacity" title={!isUnlocked ? "Unlocks after Turn 5" : "View History"}>
        {isUnlocked ? '⤢' : '🔒'}
      </div>
      <span className={`text-2xl mb-2 transition-transform ${isUnlocked ? 'group-hover:scale-110' : ''}`}>{item.icon}</span>
      <span className={`text-xs font-bold uppercase tracking-wider text-zinc-500 transition-colors ${isUnlocked ? 'group-hover:text-pink-600' : ''}`}>{item.label}</span>
      <span className="text-2xl font-black text-zinc-800 my-1">{item.data.pct}%</span>
      <span className="text-xs text-zinc-500">Avg LS: <strong className="text-pink-600">{item.data.ls}</strong></span>
    </div>
  );
};

interface DemographicsTabProps {
  demoStats: any;
  initialDemoStats: any;
  currentTurn: number;
  setSelectedHistoryGroup: (group: { label: string; category: 'wealth' | 'age' | 'traits'; key: string }) => void;
}

export default function DemographicsTab({ demoStats, initialDemoStats, currentTurn, setSelectedHistoryGroup }: DemographicsTabProps) {
  if (!demoStats || !initialDemoStats) return null;

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-300 min-h-0">
      <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xl font-bold text-zinc-800">National Demographics</h2>
          <p className="text-sm text-zinc-500">Breakdown of the electorate and their current average Life Satisfaction (LS).</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Total Population</p>
          <p className="text-3xl font-black text-pink-600">{demoStats.total.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
        {/* WEALTH DISTRIBUTION */}
        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col">
          <div className="flex justify-between items-end mb-6 shrink-0">
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-800">Wealth Distribution</h3>
            <p className="text-[10px] font-bold uppercase text-zinc-400">Compared to the start of your term</p>                
          </div>
          <div className="flex-1 space-y-6 flex flex-col justify-center">
            {[
              { label: 'Wealthy (Top 10%)', key: 'wealthy', data: demoStats.wealth.wealthy, initData: initialDemoStats.wealth.wealthy, color: 'bg-emerald-500' },
              { label: 'Middle Class', key: 'middle', data: demoStats.wealth.middle, initData: initialDemoStats.wealth.middle, color: 'bg-blue-500' },
              { label: 'Poor (Relative Poverty)', key: 'poor', data: demoStats.wealth.poor, initData: initialDemoStats.wealth.poor, color: 'bg-red-500' }
            ].map((item, i) => {
              const initLs = parseFloat(item.initData.ls);
              const currentLs = parseFloat(item.data.ls);
              const initWidth = (initLs / 10) * 100;
              const currentWidth = (currentLs / 10) * 100;
              
              const hasGoneDown = currentLs < initLs;
              const hasGoneUp = currentLs > initLs;

              return (
                <div 
                  key={i}
                  onClick={() => currentTurn >= 5 ? setSelectedHistoryGroup({ label: item.label, category: 'wealth', key: item.key }) : null}
                  className={`group p-2 -mx-2 rounded-lg transition-colors relative ${currentTurn >= 5 ? 'hover:bg-zinc-50 cursor-pointer' : 'cursor-not-allowed'}`}
                >
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-zinc-400 text-xs transition-opacity" title={currentTurn < 5 ? "Unlocks after Turn 5" : "View History"}>
                    {currentTurn >= 5 ? '⤢' : '🔒'}
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className={`font-bold text-zinc-700 transition-colors ${currentTurn >= 5 ? 'group-hover:text-pink-600' : ''}`}>{item.label}</span>
                    <span className="text-zinc-500 mr-4">Avg LS: <strong className="text-zinc-800">{item.data.ls}</strong></span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1 h-3 bg-zinc-200 rounded-full overflow-hidden">
                      <div 
                        className={`absolute top-0 left-0 h-full ${item.color} shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] transition-all duration-500`} 
                        style={{ width: `${Math.min(initWidth, currentWidth)}%` }} 
                      />
                      {hasGoneDown && (
                        <div 
                          className={`absolute top-0 h-full ${item.color} opacity-20 transition-all duration-500`}
                          style={{ left: `${currentWidth}%`, width: `${initWidth - currentWidth}%` }}
                        />
                      )}
                      {hasGoneUp && (
                        <div 
                          className={`absolute top-0 h-full ${item.color} border-l-2 border-white brightness-125 transition-all duration-500`}
                          style={{ 
                            left: `${initWidth}%`, 
                            width: `${currentWidth - initWidth}%`,
                            backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.3) 4px, rgba(255,255,255,0.3) 8px)'
                          }}
                        />
                      )}
                    </div>
                    <span className="text-xs font-bold w-12 text-right mr-4 text-zinc-400" title="Population Share">{item.data.pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AGE DISTRIBUTION */}
        <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm flex flex-col">
          <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-800 mb-6 shrink-0">Age Distribution (18+)</h3>
          <div className="flex-1 space-y-4 flex flex-col justify-center">
            {[
              { label: 'Elderly (65+)', key: 'elderly', data: demoStats.age.elderly, color: 'bg-indigo-500' },
              { label: 'Adults (30-64)', key: 'adult', data: demoStats.age.adult, color: 'bg-violet-500' },
              { label: 'Youth (18-29)', key: 'youth', data: demoStats.age.youth, color: 'bg-fuchsia-500' }
            ].map((item, i) => (
              <AgeDemographicRow 
                key={i} 
                item={item} 
                currentTurn={currentTurn} 
                onClick={() => setSelectedHistoryGroup({ label: item.label, category: 'age', key: item.key })}
              />
            ))}
          </div>
        </div>
      </div>

      {/* KEY VOTING BLOCKS */}
      <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm shrink-0">
        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-800 mb-6">Key Voting Blocks</h3>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Commuters', key: 'commuters', data: demoStats.traits.commuters, icon: '🚗' },
            { label: 'Parents', key: 'parents', data: demoStats.traits.parents, icon: '👨‍👩‍👧' },
            { label: 'Environmentalists', key: 'environmentalists', data: demoStats.traits.environmentalists, icon: '🌱' },
            { label: 'Students', key: 'students', data: demoStats.traits.students, icon: '🎓' }
          ].map((item, i) => (
            <VotingBlockCard 
              key={i} 
              item={item} 
              currentTurn={currentTurn} 
              onClick={() => setSelectedHistoryGroup({ label: item.label, category: 'traits', key: item.key })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}