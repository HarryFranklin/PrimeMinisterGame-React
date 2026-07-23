import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../../context/GameStateContext';
import { ElectionCycle } from '../../utils/types';

export default function UtilityInterventionOverlay() {
  const { currentCycle, setHasSeenUtilityIntervention, startCycle } = useGame();
  
  // 0 = Risk vs Inequality Gamble, 1 = Animating the Curve, 2 = The +1/-1 Demo
  const [step, setStep] = useState(0);

  const handleComplete = () => {
    setHasSeenUtilityIntervention(true);
    startCycle(currentCycle); // Kick off the Societal Utility briefing
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      className="fixed inset-0 z-[9999] bg-zinc-950 text-zinc-200 flex flex-col p-6 md:p-12 overflow-y-auto"
    >
      <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col justify-center mt-12">
        <AnimatePresence mode="wait">
          
          {step === 0 && (
            <motion.div 
              key="step0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-8"
            >
              <h2 className="text-pink-500 font-black uppercase tracking-widest text-sm mb-4">
                Simulation Paused
              </h2>
              <h1 className="text-3xl md:text-4xl font-black text-white">
                You are no longer the Prime Minister.
              </h1>
              <p className="text-lg md:text-xl text-zinc-400 leading-relaxed">
                For a moment, you are an average citizen. Your current Life Satisfaction is a comfortable 7 out of 10. The government is proposing a radical new policy.
              </p>
              
              {/* GAMBLE UI GOES HERE */}
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                 <p className="italic text-zinc-500 text-center">Gamble interaction to be built...</p>
              </div>

              <button 
                onClick={() => setStep(1)}
                className="self-end px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-colors"
              >
                Proceed &rarr;
              </button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-8"
            >
              <h1 className="text-3xl md:text-4xl font-black text-white">
                Diminishing Returns
              </h1>
              
              {/* D3 ANIMATED CURVE GOES HERE */}
              <div className="h-64 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center">
                 <p className="italic text-zinc-500">Animated D3 curve to be built...</p>
              </div>

              <button 
                onClick={() => setStep(2)}
                className="self-end px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-colors"
              >
                Proceed &rarr;
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col gap-8"
            >
              <h1 className="text-3xl md:text-4xl font-black text-white">
                Objective vs Subjective Value
              </h1>
              
              {/* +1/-1 DEMO GOES HERE */}
              <div className="h-64 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center">
                 <p className="italic text-zinc-500">Citizen comparison to be built...</p>
              </div>

              <button 
                onClick={handleComplete}
                className="self-end px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl transition-colors"
              >
                Resume Simulation
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </motion.div>
  );
}