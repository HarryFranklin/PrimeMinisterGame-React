import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ElectionCycle, Respondent, TurnHistory } from '../../utils/types';
import { ModalContent, ModalHeader } from './SharedModalComponents'; 

import StageTermSummary from './ElectionModal/StageTermSummary';
import StageVerdict from './ElectionModal/StageVerdict';
import StagePopulationChange from './ElectionModal/StagePopulationChange';
import StageElectorateFeedback from './ElectionModal/StageElectorateFeedback';
import StageAcademicDebrief from './ElectionModal/StageAcademicDebrief';
import StagePressConference from './ElectionModal/StagePressConference';
import PMIdentityBanner from '../PMIdentityBanner';

interface ElectionModalProps {
  currentMetricScore: number;
  currentCycle: ElectionCycle;
  approvalRating: number;
  cycleAttempts: number;
  initialPopulation: Respondent[];
  baselinePopulation: Respondent[];
  finalPopulation: Respondent[];
  history: TurnHistory[];
  yAxisMax: number;
  onNextCycle: () => void;
  onReset: () => void;
  onFinish?: () => void;
  onAnswerPressQuestion: (delta: number) => void;
}

export default function ElectionModal(props: ElectionModalProps) {
  const { currentCycle, approvalRating, cycleAttempts, onNextCycle, onReset, onFinish, onAnswerPressQuestion } = props;
  const [page, setPage] = useState(0);
  const [pageReady, setPageReady] = useState(false);
  
  const [definitions, setDefinitions] = useState<{title: string, desc: string}[]>([]);
  
  const won = approvalRating >= 51.0;
  
  const isFinalCycle = currentCycle === ElectionCycle.PersonalUtility;
  
  let canProceed = won || cycleAttempts >= 3;
  const totalPages = canProceed ? 6 : 5;

  useEffect(() => {
    setDefinitions([]);
  }, [page]);

  const handleToggle = (title: string, desc: string) => {
    setDefinitions(prev => {
      const exists = prev.some(d => d.title === title);
      if (exists) {
        return prev.filter(d => d.title !== title);
      }
      return [...prev, { title, desc }];
    });
  };

  const getModalTitle = () => {
    if (page === 0) return "Press Conference";
    if (page === 1) return "Term Summary";
    if (page === 2) return "Election Verdict";
    if (page === 3) return "Wellbeing Changes";
    if (page === 4) return "Electorate Feedback";
    if (page === 5) return "Academic Debrief";
    return "Election Sequence";
  };

  const getModalWidth = () => {
    if (page === 0) return "max-w-2xl";
    if (page === 2) return "max-w-xl";
    if (page === 3) return "max-w-[880px]";
    if (page === 4) return "max-w-2xl";
    return "max-w-3xl";
  };

  return (
    <ModalContent 
      maxWidth={getModalWidth()}
      floatingPanel={
        definitions.length > 0 ? (
          <div className="absolute inset-y-0 right-0 translate-x-[105%] flex items-center pointer-events-none z-[100] py-4">
            <div className="flex flex-col gap-4 w-72 max-h-[100%] overflow-y-auto pointer-events-auto pr-3 pl-1 pb-2 overscroll-contain">
              {definitions.map((def) => (
                <div 
                  key={def.title} 
                  className="bg-white/95 backdrop-blur-md border border-pink-300 shadow-2xl rounded-xl p-4 shrink-0 relative animate-in fade-in zoom-in-95 duration-200"
                >
                  <span className="text-sm font-black uppercase tracking-widest text-pink-500 block mb-2">
                    {def.title}
                  </span>
                  <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">
                    {def.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : undefined
      }
    >
      <ModalHeader title={getModalTitle()} />
      <PMIdentityBanner cycle={currentCycle} className="-mt-2 shrink-0" />
      
      <motion.div className="flex-1 min-h-0 overflow-y-auto pr-1 w-full flex flex-col gap-4">
        {page === 0 && <StagePressConference currentCycle={currentCycle} approvalRating={approvalRating} history={props.history} onAnswerQuestion={onAnswerPressQuestion} onReady={() => setPageReady(true)} />}
        {page === 1 && <StageTermSummary {...props} onReady={() => setPageReady(true)} onDefinitionToggle={handleToggle} />}
        {page === 2 && <StageVerdict approvalRating={approvalRating} won={won} currentCycle={currentCycle} attemptNumber={cycleAttempts} onReady={() => setPageReady(true)} />}
        {page === 3 && <StagePopulationChange finalPopulation={props.finalPopulation} currentCycle={currentCycle} onReady={() => setPageReady(true)} onDefinitionToggle={handleToggle} />}
        {page === 4 && <StageElectorateFeedback {...props} onReady={() => setPageReady(true)} onDefinitionToggle={handleToggle} />}
        {page === 5 && <StageAcademicDebrief currentCycle={currentCycle} finalPopulation={props.finalPopulation} yAxisMax={props.yAxisMax} onReady={() => setPageReady(true)} />}
      </motion.div>

      <div className="flex justify-between items-center mt-auto pt-3 border-t border-zinc-100 shrink-0 h-16">
        {page > 0 ? (
          <button 
            onClick={() => { setPageReady(false); setPage(p => p - 1); }} 
            className="px-4 py-2 text-sm font-bold text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
          >
            &larr; Back
          </button>
        ) : <div />}

        {page < totalPages - 1 ? (
          <button 
            onClick={() => { setPageReady(false); setPage(p => p + 1); }} 
            disabled={!pageReady}
            className={`px-6 py-3 rounded-lg text-sm font-bold shadow-md transition-all duration-500 ${pageReady ? 'bg-zinc-900 text-white hover:bg-black opacity-100 cursor-pointer' : 'bg-zinc-200 text-zinc-400 opacity-50 cursor-not-allowed'}`}
          >
            {page === 0 ? "Continue to Term Summary \u2192" : page === 1 ? "Continue to Verdict \u2192" : page === 2 ? "View Wellbeing Changes \u2192" : page === 3 ? "Electorate Feedback \u2192" : "Academic Debrief \u2192"}
          </button>
        ) : (
          <div className="flex gap-3 animate-in fade-in slide-in-from-right-4">
            {!canProceed ? (
              <button onClick={onReset} className="px-6 py-2.5 bg-rose-600 text-white rounded-lg text-sm font-bold hover:bg-rose-700 shadow-md cursor-pointer">Election Lost - Restart Term</button>
            ) : (
              <>
                <button onClick={onReset} className="px-4 py-2.5 bg-zinc-100 text-zinc-700 rounded-lg text-sm font-bold hover:bg-zinc-200 transition-colors cursor-pointer">Restart Term</button>
                
                {!isFinalCycle && (
                  <button 
                    onClick={onNextCycle} 
                    disabled={!pageReady}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all ${pageReady ? 'bg-pink-600 text-white hover:bg-pink-700 cursor-pointer' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed opacity-50'}`}
                  >
                    Proceed to Next Term
                  </button>
                )}
                
                {isFinalCycle && onFinish && (
                  <button 
                    onClick={onFinish} 
                    disabled={!pageReady}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all ${pageReady ? 'bg-pink-600 text-white hover:bg-pink-700 cursor-pointer' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed opacity-50'}`}
                  >
                    Finish Game
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </ModalContent>
  );
}