import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../../context/GameStateContext';
import { ElectionCycle, AxisVariable } from '../../utils/types';
import { Button } from '../ui';
import D3Chart from '../D3Chart';
import { MetricsEngine } from '../../utils/MetricsEngine';
import { FRAMEWORK_RULES } from '../../utils/frameworkRules';
import { PM_PROFILES } from '../../utils/pmProfiles';

const generateHistogram = (pop: any[]) => Array.from({ length: 11 }, (_, i) => ({
  name: i, count: pop.filter(r => Math.round(r.currentLS) === i).length
}));

export default function LevelSelectTab() {
  const { completedRuns, startLevel } = useGame();
  const unlockedIndex = completedRuns.length;
  
  // State to hold the current 'lens' being used to view a completed run
  const [viewLenses, setViewLenses] = useState<Record<number, ElectionCycle>>({});
  
  // State to handle the cinematic transition overlay
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleStartLevel = (cycle: ElectionCycle) => {
    setIsTransitioning(true);
    setTimeout(() => {
      startLevel(cycle);
    }, 4000); 
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 gap-6 animate-in fade-in duration-500">
       <div className="text-center max-w-3xl mx-auto mt-4 shrink-0">
         <h2 className="text-3xl font-black text-zinc-900 tracking-tight mb-2">
           {unlockedIndex >= 4 ? "Simulation Complete" : "Select Your Persona"}
         </h2>
         <p className="text-zinc-600 text-sm font-medium">
           {unlockedIndex >= 4 
             ? "You have completed all four ideological frameworks. Toggle the metric lenses below to cross-reference how the same outcomes are judged under different philosophies."
             : "Each Prime Minister represents a distinct political philosophy and is judged by a different metric of success. Complete the current administration to unlock the next."}
         </p>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 pb-6">
         {PM_PROFILES.map((profile, idx) => {
           const run = completedRuns.find(r => r.cycle === profile.cycle);
           const isLocked = idx > unlockedIndex;
           const isPlayable = idx === unlockedIndex;
           const isCompleted = !!run;

           const currentLens = viewLenses[profile.cycle] ?? profile.cycle;
           const lensRule = FRAMEWORK_RULES[currentLens];
           
           // Calculate the score of the final population using the selected framework's logic
           const displayScore = run ? MetricsEngine.getMetricScore(run.finalPopulation, currentLens) : 0;

           return (
             <div key={profile.cycle} className={`relative flex flex-col rounded-2xl border-2 overflow-hidden transition-all duration-500 ${isLocked ? 'border-zinc-200 bg-zinc-50/50 grayscale opacity-60' : isPlayable ? 'border-zinc-800 bg-white shadow-xl scale-[1.02] ring-4 ring-zinc-900/10' : 'border-zinc-200 bg-white shadow-sm'}`}>
               <div className={`p-5 pb-3 border-b flex items-center gap-3 ${isLocked ? 'bg-zinc-200 border-zinc-300' : 'bg-zinc-100 border-zinc-200'}`}>
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-3xl shrink-0 shadow-inner"
                    style={{ backgroundColor: isLocked ? undefined : `${profile.color}22` }}
                  >
                    {profile.emoji}
                  </div>
                  <div className="min-w-0">
                    <h3 className={`font-black text-xl tracking-tight truncate ${isLocked ? 'text-zinc-500' : 'text-zinc-900'}`}>{profile.name}</h3>
                    <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${isLocked ? 'text-zinc-400' : profile.colorClass}`}>{profile.philosophy}</p>
                  </div>
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
                      <Button variant="primary" fullWidth onClick={() => handleStartLevel(profile.cycle)}>
                        Begin Term
                      </Button>
                    </div>
                  )}

                  {isCompleted && run && (
                    <div className="flex-1 flex flex-col border-zinc-100">
                       <div className="flex justify-between items-end">
                         <div>
                           <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-0.5">Public Approval</span>
                           <strong className={`text-xl font-black ${run.approvalRating >= 51 ? 'text-emerald-600' : 'text-rose-600'}`}>
                             {run.approvalRating.toFixed(1) === '100.0' ? '100' : run.approvalRating.toFixed(1)}%
                           </strong>
                         </div>
                         <div className="text-right">
                           <span 
                             className="text-[10px] font-black uppercase tracking-widest block mb-0.5 transition-colors duration-300"
                             style={{ color: currentLens !== profile.cycle ? lensRule.graphColor : '#a1a1aa' }}
                           >
                             {currentLens === profile.cycle ? 'Final Score' : `${lensRule.targetMetricAbbreviation} Score`}
                           </span>
                           <strong className="text-xl font-black text-zinc-900">{displayScore.toFixed(2)}</strong>
                         </div>
                       </div>
                       
                       <div className="flex justify-end gap-1.5 mt-1 mb-1">
                         {[ElectionCycle.Benthamite, ElectionCycle.Rawlsian, ElectionCycle.SocietalUtility, ElectionCycle.PersonalUtility].map(lens => (
                           <button
                             key={lens}
                             onClick={() => setViewLenses(prev => ({ ...prev, [profile.cycle]: lens }))}
                             className={`w-5 h-5 rounded-full border transition-all cursor-pointer ${
                               currentLens === lens ? 'ring-2 ring-offset-1 border-white shadow-sm' : 'opacity-40 hover:opacity-100 border-transparent'
                             }`}
                             style={{ backgroundColor: FRAMEWORK_RULES[lens].graphColor }}
                             title={`View as ${FRAMEWORK_RULES[lens].frameworkTitle}`}
                           />
                         ))}
                       </div>

                       <div className="h-55 bg-zinc-50 rounded-lg border border-zinc-200 mt-2 p-2 pt-6 relative overflow-hidden">
                         <span className="absolute top-3 left-2 text-[11px] font-bold text-zinc-400 uppercase tracking-widest z-10">Life Satisfaction Distribution</span>
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
                       
                       <Button variant="secondary" size="sm" fullWidth className="mt-2" onClick={() => handleStartLevel(profile.cycle)}>
                         Replay Term
                       </Button>
                    </div>
                  )}
               </div>
             </div>
           );
         })}
       </div>

       {/* Cinematic Transition Overlay */}
       <AnimatePresence>
         {isTransitioning && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             transition={{ duration: 1.5, ease: "easeInOut" }}
             className="fixed inset-0 z-[9999] bg-zinc-950 flex flex-col items-center justify-center pointer-events-auto"
           >
             <motion.div
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               transition={{ delay: 0.6, duration: 1.2 }}
               className="flex flex-col items-center gap-6"
             >
               <div className="w-12 h-12 border-4 border-zinc-800 border-t-pink-600 rounded-full animate-spin" />
               <h2 className="text-zinc-400 font-bold uppercase tracking-widest text-sm animate-pulse">
                 Commencing Term
               </h2>
             </motion.div>
           </motion.div>
         )}
       </AnimatePresence>
    </div>
  );
}