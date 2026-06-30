import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ElectionCycle, Policy } from '../utils/types';
import { FRAMEWORK_RULES } from '../utils/frameworkRules';

interface DPMCardProps {
  currentCycle: ElectionCycle;
  currentTurn: number;
  isParliamentDissolved: boolean;
  selectedPolicy: Policy | null;
  cycleMAO: number;
  currentMetricScore: number;
}

export default function DPMCard({ currentCycle, currentTurn, isParliamentDissolved, selectedPolicy, cycleMAO, currentMetricScore }: DPMCardProps) {
  const rule = FRAMEWORK_RULES[currentCycle];
  const targetScore = (cycleMAO * rule.winThresholdScalar).toFixed(2);
  
  const [isCompact, setIsCompact] = useState(false);
  const [activeSlide, setActiveSlide] = useState<0 | 1>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Monitor available vertical height to toggle compact carousel mode
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // If the container has less than 220px of height, switch to carousel
        setIsCompact(entry.contentRect.height < 220);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Handle the carousel timer
  useEffect(() => {
    if (!isCompact) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev === 0 ? 1 : 0));
    }, 6000); // Rotates every 6 seconds
    return () => clearInterval(timer);
  }, [isCompact]);

  if (isParliamentDissolved) {
    return (
      <div className="flex-1 rounded-xl border-2 border-rose-400 bg-rose-50 flex flex-col shrink-0 min-h-0 overflow-hidden shadow-md">
        <div className="p-4 border-b border-rose-200/50 bg-white/50 flex items-center gap-3 shrink-0">
          <span className="text-3xl bg-white border border-rose-200 w-12 h-12 flex items-center justify-center rounded-full shadow-sm shrink-0">🏛️</span>
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-rose-600 leading-tight">
              Deputy Prime Minister
            </p>
            <p className="text-sm md:text-base font-bold text-zinc-800 mt-0.5">
              Term Concluded
            </p>
          </div>
        </div>
        
        <div className="p-4 flex-1 flex flex-col justify-center items-center text-center">
          <p className="text-lg md:text-xl font-black text-rose-900 mb-2">Parliament is Dissolved.</p>
          <p className="text-sm text-rose-700 font-medium">The public are heading to the polls to deliver their verdict.</p>
        </div>
      </div>
    );
  }

  const getAdvisory = () => {
    if (selectedPolicy) return "If you have any Wellbeing Impact Forecasts remaining, review the policy's impact before enacting it.";
    
    switch (currentCycle) {
      case ElectionCycle.Benthamite:
        return "We need to boost the national average. Prioritise policies that deliver widespread gains, as total numbers are all that matter right now.";
      case ElectionCycle.Rawlsian:
        return "The public is watching how we treat the most vulnerable. Focus your political capital entirely on raising the baseline for those worst-off.";
      case ElectionCycle.PersonalUtility:
        return "Voters are fiercely protective of their own finances. If a policy costs them anything personally, they will vote against us.";
      case ElectionCycle.SocietalUtility:
        return "The public demands a fairer country. If we only enrich the wealthy while leaving others behind, they will turn on us regardless of economic growth.";
      default:
        return "";
    }
  };

  return (
    <div className="flex-1 rounded-xl border border-zinc-200 bg-white flex flex-col shrink-0 min-h-0 overflow-hidden shadow-sm relative z-0">
      <div className="p-4 lg:p-5 border-b border-zinc-200 bg-zinc-100 flex items-center gap-4 shrink-0 relative z-10">
        <span className="text-4xl bg-white border border-zinc-200 w-12 h-12 flex items-center justify-center rounded-full shadow-sm shrink-0">🏛️</span>
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-zinc-500 leading-tight">
            Deputy Prime Minister
          </p>
          <h3 className="text-lg lg:text-xl font-bold text-zinc-900 tracking-tight">What is your decision, Prime Minister?</h3>
        </div>
      </div>
      
      <div className="p-4 lg:p-5 flex-1 flex flex-col gap-4 lg:gap-5 overflow-hidden">
        <div className="grid grid-cols-2 gap-4 shrink-0">
          <div className="bg-white border-l-4 border-l-pink-500 border-y border-r border-zinc-200 p-4 rounded-r-xl shadow-sm flex flex-col justify-center">
            <span className="text-xs font-black uppercase tracking-widest text-pink-600 block mb-1">Current Score</span>
            <span className="block text-2xl lg:text-3xl font-black text-zinc-900">{currentMetricScore.toFixed(2)}</span>
          </div>
          <div className="bg-white border-l-4 border-l-zinc-500 border-y border-r border-zinc-200 p-4 rounded-r-xl shadow-sm opacity-90 flex flex-col justify-center">
            <span className="text-xs font-black uppercase tracking-widest text-zinc-500 block mb-1">Target Score</span>
            <span className="block text-2xl lg:text-3xl font-black text-zinc-700">{targetScore}</span>
          </div>
        </div>
        
        <div 
          ref={containerRef}
          className="bg-zinc-100 border border-zinc-200 p-4 lg:p-5 rounded-xl shadow-sm flex-1 flex flex-col min-h-0 relative"
        >
          {!isCompact ? (
            // Standard Layout (Sufficient Height)
            <>
              <div className="mb-3 shrink-0">
                <span className="text-sm lg:text-base font-bold text-zinc-900 block mb-1">{rule.targetMetricName}</span>
                <p className="text-[13px] lg:text-sm text-zinc-600 leading-relaxed">
                  {rule.targetMetricDescription}
                </p>
              </div>
              
              <div className="border-t border-zinc-200 pt-3 flex-1 flex flex-col min-h-0">
                <span className="text-[11px] lg:text-[12px] font-black uppercase tracking-widest text-pink-600 block mb-1.5 shrink-0">Advisory Note</span>
                <p className="text-[13px] lg:text-sm text-zinc-700 italic overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden leading-relaxed flex-1">"{getAdvisory()}"</p>
              </div>
            </>
          ) : (
            // Compact Carousel Layout (Constrained Height)
            <div className="flex-1 flex flex-col h-full relative overflow-hidden pb-4">
              <AnimatePresence mode="wait">
                {activeSlide === 0 ? (
                  <motion.div 
                    key="slide1" 
                    initial={{ opacity: 0, y: 5 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -5 }} 
                    transition={{ duration: 0.3 }}
                    className="flex flex-col h-full absolute inset-0"
                  >
                    <span className="text-sm font-bold text-zinc-900 block mb-1 truncate">{rule.targetMetricName}</span>
                    <p className="text-[13px] text-zinc-600 leading-relaxed overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-4">
                      {rule.targetMetricDescription}
                    </p>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="slide2" 
                    initial={{ opacity: 0, y: 5 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -5 }} 
                    transition={{ duration: 0.3 }}
                    className="flex flex-col h-full absolute inset-0"
                  >
                    <span className="text-[11px] font-black uppercase tracking-widest text-pink-600 block mb-1.5 shrink-0">Advisory Note</span>
                    <p className="text-[13px] text-zinc-700 italic leading-relaxed overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-4">
                      "{getAdvisory()}"
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Carousel Indicators */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-1.5 pt-2 bg-zinc-100 z-10">
                <div className={`h-1.5 rounded-full transition-all duration-500 ${activeSlide === 0 ? 'w-4 bg-pink-500' : 'w-1.5 bg-zinc-300'}`} />
                <div className={`h-1.5 rounded-full transition-all duration-500 ${activeSlide === 1 ? 'w-4 bg-pink-500' : 'w-1.5 bg-zinc-300'}`} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}