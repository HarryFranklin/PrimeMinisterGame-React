import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Respondent, AxisVariable } from '../../utils/types';
import { CYCLE_COLORS } from '../../utils/uiHelpers';
import D3Chart from '../D3Chart';
import { ModalContent, ModalHeader, DPMMessage } from './SharedModalComponents';

const CONFETTI_COLORS = [...Object.values(CYCLE_COLORS), '#f59e0b'];

// Multi-directional confetti for the final win state
const OmniConfetti = ({ triggerKey }: { triggerKey: number }) => {
  return (
    <div key={triggerKey} className="fixed inset-0 overflow-hidden pointer-events-none z-[9999]">
      {Array.from({ length: 200 }).map((_, i) => {
        const side = i % 4; // 0: top, 1: bottom, 2: left, 3: right
        const randomX = Math.random() * 100;
        const randomY = Math.random() * 100;
        
        let initial = {};
        let animate = {};
        
        if (side === 0) { // Top down
          initial = { top: '-10%', left: `${randomX}vw` };
          animate = { top: '110%', left: `${randomX + (Math.random() * 20 - 10)}vw`, rotate: 720 };
        } else if (side === 1) { // Bottom up
          initial = { top: '110%', left: `${randomX}vw` };
          animate = { top: '-10%', left: `${randomX + (Math.random() * 20 - 10)}vw`, rotate: 720 };
        } else if (side === 2) { // Left to right
          initial = { left: '-10%', top: `${randomY}vh` };
          animate = { left: '110%', top: `${randomY + (Math.random() * 20 - 10)}vh`, rotate: 720 };
        } else { // Right to left
          initial = { left: '110%', top: `${randomY}vh` };
          animate = { left: '-10%', top: `${randomY + (Math.random() * 20 - 10)}vh`, rotate: 720 };
        }

        return (
          <motion.div
            key={i}
            initial={{ ...initial, opacity: 1 }}
            animate={{ ...animate, opacity: [1, 1, 0] }}
            transition={{ duration: 3 + Math.random() * 4, ease: 'easeOut', delay: Math.random() * 0.5 }}
            className="absolute w-3 h-3"
            style={{
              backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              borderRadius: i % 3 === 0 ? '50%' : '2px',
            }}
          />
        );
      })}
    </div>
  );
};

interface FinalDebriefModalProps {
  baselinePopulation: Respondent[];
  finalPopulation: Respondent[];
  yAxisMax: number;
}

export default function FinalDebriefModal({ baselinePopulation, finalPopulation, yAxisMax }: FinalDebriefModalProps) {
  const [confettiKey, setConfettiKey] = useState(0);
  const [showReplay, setShowReplay] = useState(false);

  // Fade in the replay button after the OmniConfetti clears
  useEffect(() => {
    setShowReplay(false);
    const timer = setTimeout(() => setShowReplay(true), 5000); // Slightly longer delay for the extra particles
    return () => clearTimeout(timer);
  }, [confettiKey]);

  const generateHistogramData = (targetPopulation: Respondent[]) => {
    if (!targetPopulation || targetPopulation.length === 0) return [];
    
    return Array.from({ length: 11 }, (_, i) => {
      const peopleInBar = targetPopulation.filter(r => Math.round(r.currentLS) === i);
      return {
        name: i,
        count: peopleInBar.length
      };
    });
  };

  const baselineHistogram = useMemo(() => generateHistogramData(baselinePopulation), [baselinePopulation]);
  const finalHistogram = useMemo(() => generateHistogramData(finalPopulation), [finalPopulation]);

  const debriefYAxisMax = useMemo(() => {
    const maxBaseline = Math.max(...baselineHistogram.map(d => d.count), 0);
    const maxFinal = Math.max(...finalHistogram.map(d => d.count), 0);
    return Math.max(100, Math.ceil(Math.max(maxBaseline, maxFinal) / 20) * 20);
  }, [baselineHistogram, finalHistogram]);

  return (
    <ModalContent maxWidth="max-w-5xl">
      <OmniConfetti triggerKey={confettiKey} />

      <ModalHeader title="Final Debrief: The Complexity of Governance" />
      
      <DPMMessage title="Simulation Concluded">
        "Prime Minister, you have successfully navigated four distinct mathematical frameworks for measuring societal success. Compare your starting society with your final outcome below."
      </DPMMessage>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
        <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-4 flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 text-center">Baseline Society (Start)</h3>
          <div className="flex-1 h-[180px] min-h-[180px]">
            <D3Chart 
              plotType="1D" 
              chartData={[]} 
              histogramData={baselineHistogram} 
              xAxisType={AxisVariable.LifeSatisfaction} 
              yAxisType={AxisVariable.LifeSatisfaction} 
              color="#d4d4d8" 
              visualStyle='faces'
              yAxisMax={debriefYAxisMax}
              faceCols={3}
            />
          </div>
        </div>

        <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-4 flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 text-center">Final Society (End)</h3>
          <div className="flex-1 h-[180px] min-h-[180px]">
            <D3Chart 
              plotType="1D" 
              chartData={[]} 
              histogramData={finalHistogram} 
              xAxisType={AxisVariable.LifeSatisfaction} 
              yAxisType={AxisVariable.LifeSatisfaction} 
              color="#d4d4d8" 
              visualStyle='faces'
              yAxisMax={debriefYAxisMax}
              faceCols={3}
            />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
        <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col">
          <h4 className="text-xs font-black uppercase tracking-widest text-zinc-800">1. Benthamite</h4>
          <span className="text-[10px] font-bold text-pink-600 block mb-2">National Average Life Satisfaction</span>
          <p className="text-xs text-zinc-600 flex-1 leading-relaxed">Maximising the total average efficiently increases overall societal wellbeing, but it does not account for how that wellbeing is distributed.</p>
        </div>
        
        <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col">
          <h4 className="text-xs font-black uppercase tracking-widest text-zinc-800">2. Rawlsian</h4>
          <span className="text-[10px] font-bold text-blue-500 block mb-2">Minimum Wellbeing Baseline</span>
          <p className="text-xs text-zinc-600 flex-1 leading-relaxed">Prioritises the worst-off to create a minimum standard of living, but highlights the variance between objective metrics and subjective experience.</p>
        </div>
        
        <div className="border-b border-zinc-200 pb-1 lg:hidden col-span-1 md:col-span-2">
          <h3 className="text-lg font-black text-zinc-800 tracking-tight">Act B: Utility</h3>
        </div>
        
        <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col">
          <h4 className="text-xs font-black uppercase tracking-widest text-zinc-800">3. Personal Utility</h4>
          <span className="text-[10px] font-bold text-purple-500 block mb-2">National Average Satisfaction</span>
          <p className="text-xs text-zinc-600 flex-1 leading-relaxed">Focuses on individual rational choice. Due to loss aversion, citizens often vote to protect their current status, making redistribution difficult.</p>
        </div>
        
        <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col">
          <h4 className="text-xs font-black uppercase tracking-widest text-zinc-800">4. Societal Utility</h4>
          <span className="text-[10px] font-bold text-emerald-600 block mb-2">National Fairness Index</span>
          <p className="text-xs text-zinc-600 flex-1 leading-relaxed">Incorporates empathy and fairness ideals. However, differing definitions of 'fairness' mean consensus rarely results in perfect equality.</p>
        </div>
      </div>

      <div className="p-4 bg-zinc-900 rounded-xl flex items-center justify-between text-white relative overflow-hidden shadow-xl shrink-0">
        <div>
          <h3 className="text-base font-bold mb-1">Ready for Phase 3</h3>
          <p className="text-zinc-400 text-xs max-w-xl mx-auto">
            Your decisions and policy pathways have been recorded. Please leave this screen open and notify the researcher.
          </p>
        </div>

        <div className="flex gap-4 items-center">
          <AnimatePresence>
            {showReplay && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => setConfettiKey(k => k + 1)}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer"
              >
                <span className="text-base">🎉</span> Celebrate
              </motion.button>
            )}
          </AnimatePresence>
          <button className="px-6 py-2.5 bg-white text-zinc-900 font-bold rounded-xl transition-all opacity-50 cursor-not-allowed text-xs" disabled>
            Awaiting Researcher
          </button>
        </div>
      </div>
    </ModalContent>
  );
}