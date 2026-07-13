import React from 'react';
import { useGame } from '../../context/GameStateContext';
import { ElectionCycle, AxisVariable } from '../../utils/types';
import { Button } from '../ui';
import D3Chart from '../D3Chart';

const PM_PROFILES = [
  {
    cycle: ElectionCycle.Benthamite,
    name: "PM Victoria Sterling",
    philosophy: "Utilitarian Growth",
    governance: "I will govern for the majority. A rising tide lifts all boats, and we must maximise total national happiness, even if some are left behind.",
    metric: "National Average Happiness",
    color: "#ec4899",
    colorClass: "text-pink-600"
  },
  {
    cycle: ElectionCycle.Rawlsian,
    name: "PM Evelyn Vance",
    philosophy: "Social Justice",
    governance: "A society is judged by how it treats its most vulnerable. I will focus entirely on raising the baseline standard of living.",
    metric: "Minimum Wellbeing Baseline",
    color: "#3b82f6",
    colorClass: "text-blue-600"
  },
  {
    cycle: ElectionCycle.SocietalUtility,
    name: "PM Eleanor Croft",
    philosophy: "Social Cohesion",
    governance: "Visible inequality breeds division. The public demands fairness, and we must grow together to avoid resentment.",
    metric: "National Fairness Index",
    color: "#10b981",
    colorClass: "text-emerald-600"
  },
  {
    cycle: ElectionCycle.PersonalUtility,
    name: "PM Julian Thorne",
    philosophy: "Individual Liberty",
    governance: "Voters vote with their wallets. We must deliver personal prosperity and protect what citizens have already earned.",
    metric: "National Personal Satisfaction",
    color: "#8b5cf6",
    colorClass: "text-purple-600"
  }
];

const generateHistogram = (pop: any[]) => Array.from({ length: 11 }, (_, i) => ({
  name: i, count: pop.filter(r => Math.round(r.currentLS) === i).length
}));

export default function LevelSelectTab() {
  const { completedRuns, startLevel } = useGame();
  const unlockedIndex = completedRuns.length;

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-6 animate-in fade-in duration-500">
       <div className="text-center max-w-2xl mx-auto mt-4 shrink-0">
         <h2 className="text-3xl font-black text-zinc-900 tracking-tight mb-2">
           {unlockedIndex >= 4 ? "Simulation Complete" : "Select Your Prime Minister"}
         </h2>
         <p className="text-zinc-600 text-sm font-medium">
           {unlockedIndex >= 4 
             ? "You have completed all four ideological frameworks. Review the differing outcomes of your governance below."
             : "Each Prime Minister represents a distinct political philosophy and is judged by a different metric of success. Complete the current administration to unlock the next."}
         </p>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
         {PM_PROFILES.map((profile, idx) => {
           const run = completedRuns.find(r => r.cycle === profile.cycle);
           const isLocked = idx > unlockedIndex;
           const isPlayable = idx === unlockedIndex;
           const isCompleted = !!run;

           return (
             <div key={profile.cycle} className={`relative flex flex-col rounded-2xl border-2 overflow-hidden transition-all duration-500 ${isLocked ? 'border-zinc-200 bg-zinc-50/50 grayscale opacity-60' : isPlayable ? 'border-zinc-800 bg-white shadow-xl scale-[1.02] ring-4 ring-zinc-900/10' : 'border-zinc-200 bg-white shadow-sm'}`}>
               <div className={`p-5 border-b ${isLocked ? 'bg-zinc-200 border-zinc-300' : 'bg-zinc-100 border-zinc-200'}`}>
                  <h3 className={`font-black text-xl tracking-tight ${isLocked ? 'text-zinc-500' : 'text-zinc-900'}`}>{profile.name}</h3>
                  <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isLocked ? 'text-zinc-400' : profile.colorClass}`}>{profile.philosophy}</p>
               </div>
               
               <div className="p-5 flex-1 flex flex-col gap-4">
                  <div className="text-sm text-zinc-600 font-medium leading-relaxed italic">
                    "{profile.governance}"
                  </div>
                  
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-1">Target Metric</span>
                    <strong className="text-sm text-zinc-800">{profile.metric}</strong>
                  </div>

                  {isLocked && (
                    <div className="flex-1 flex items-center justify-center pt-8 pb-4">
                      <div className="w-12 h-12 rounded-full bg-zinc-200 flex items-center justify-center text-zinc-400 shadow-inner">
                        🔒
                      </div>
                    </div>
                  )}

                  {isPlayable && (
                    <div className="mt-auto pt-4">
                      <Button variant="primary" fullWidth onClick={() => startLevel(profile.cycle)}>
                        Begin Term
                      </Button>
                    </div>
                  )}

                  {isCompleted && run && (
                    <div className="flex-1 flex flex-col gap-3 mt-2 border-t border-zinc-100 pt-4">
                       <div className="flex justify-between items-end">
                         <div>
                           <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-0.5">Public Approval</span>
                           <strong className={`text-xl font-black ${run.approvalRating >= 51 ? 'text-emerald-600' : 'text-rose-600'}`}>
                             {run.approvalRating.toFixed(1) === '100.0' ? '100' : run.approvalRating.toFixed(1)}%
                           </strong>
                         </div>
                         <div className="text-right">
                           <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-0.5">Final Score</span>
                           <strong className="text-xl font-black text-zinc-900">{run.finalScore.toFixed(2)}</strong>
                         </div>
                       </div>
                       
                       <div className="h-28 bg-zinc-50 rounded-lg border border-zinc-200 mt-2 p-2 pt-6 relative overflow-hidden">
                         <span className="absolute top-2 left-2 text-[9px] font-bold text-zinc-400 uppercase tracking-widest z-10">LS Distribution</span>
                         <D3Chart 
                           plotType="1D"
                           chartData={[]}
                           histogramData={generateHistogram(run.finalPopulation)}
                           xAxisType={AxisVariable.LifeSatisfaction}
                           yAxisType={AxisVariable.LifeSatisfaction}
                           color={profile.color}
                           visualStyle="solid"
                           yAxisMax={100}
                         />
                       </div>
                       
                       <Button variant="secondary" size="sm" fullWidth className="mt-2" onClick={() => startLevel(profile.cycle)}>
                         Replay Term
                       </Button>
                    </div>
                  )}
               </div>
             </div>
           );
         })}
       </div>
    </div>
  );
}