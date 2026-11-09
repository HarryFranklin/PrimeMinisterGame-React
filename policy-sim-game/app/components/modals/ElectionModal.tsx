import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { ElectionCycle, Respondent, TurnHistory } from '../../utils/types';
import { ModalContent, ModalHeader } from './SharedModalComponents'; 
import { track } from '../../client/telemetry';

import StageVerdict from './ElectionModal/StageVerdict';
import StagePressConference, { type PressSummary } from './ElectionModal/StagePressConference';
import StageMorningPaper, { type PaperExit } from './ElectionModal/StageMorningPaper';
import PMIdentityBanner from '../PMIdentityBanner';

interface ElectionModalProps {
  currentMetricScore: number;
  currentCycle: ElectionCycle;
  approvalRating: number;
  /** This term's poll error (utils/polls.ts). */
  pollError: number;
  cycleAttempts: number;
  initialPopulation: Respondent[];
  baselinePopulation: Respondent[];
  finalPopulation: Respondent[];
  history: TurnHistory[];
  yAxisMax: number;
  onReset: (outcome?: "win" | "lose") => void;
  onRequestDebrief: (action: 'restart' | 'complete', outcome: 'win' | 'lose') => void;
  onAnswerPressQuestion: (delta: number) => void;
}

export default function ElectionModal(props: ElectionModalProps) {
  const { currentCycle, approvalRating, cycleAttempts, onReset, onRequestDebrief, onAnswerPressQuestion } = props;
  const [page, setPage] = useState(0);
  const [pageReady, setPageReady] = useState(false);
  // Once you leave the press conference it has been held: coming Back must not hold (and score) it again.
  const [pressHeld, setPressHeld] = useState(false);
  // Likewise the count: coming Back to the verdict shows the result, it isn't counted (or logged) again.
  const [verdictSeen, setVerdictSeen] = useState(false);
  // What happened at the press conference, for the front page of the morning paper
  const [pressSummary, setPressSummary] = useState<PressSummary | null>(null);
  // Arriving at the paper straight from the victory rally (the rally shrinks into the front-page photo)
  const [paperFromRally, setPaperFromRally] = useState(false);

  // Stable across every ElectionModal re-render (unlike an inline arrow
  // function would be) - several stage components use onReady inside a
  // ref-guarded auto-advance timer's dependency array, and a fresh
  // function identity on every render cancels that timer via the effect's
  // cleanup without rescheduling it, silently hard-locking the stage.
  const handlePageReady = useCallback(() => setPageReady(true), []);

  
  const won = approvalRating >= 51.0;
  
  const isFinalCycle = currentCycle === ElectionCycle.PersonalUtility;
  
  let canProceed = won || cycleAttempts >= 3;
  const totalPages = 3;

  // We removed all track('cycle_ended', ...) calls from these handlers.
  // The cycle isn't truly over until the Academic Debrief finishes.
  // The paper passes its own page timings (its pages are the old stages).
  const trackExit = (action: string, timing?: { msOnStage: number; msAfterUnlock: number | null }) => {
    const now = Date.now();
    track('election_exit_clicked', {
      cycle: ElectionCycle[currentCycle],
      action,
      won,
      attempt_number: cycleAttempts,
      ms_on_stage: timing ? timing.msOnStage : now - stageShownAt.current,
      ms_after_unlock: timing ? timing.msAfterUnlock : (stageReadyAt.current ? now - stageReadyAt.current : null),
    });
  };

  const handleRestartTerm = (timing?: { msOnStage: number; msAfterUnlock: number | null }) => {
    trackExit('restart', timing);
    onRequestDebrief('restart', won ? "win" : "lose");
  };

  const handleProceedNextTerm = (timing?: { msOnStage: number; msAfterUnlock: number | null }) => {
    trackExit('next_term', timing);
    onRequestDebrief('complete', 'win');
  };

  const handleFinishGame = (timing?: { msOnStage: number; msAfterUnlock: number | null }) => {
    trackExit('finish_game', timing);
    onRequestDebrief('complete', 'win');
  };

  const handleLostFinal = (timing?: { msOnStage: number; msAfterUnlock: number | null }) => {
    trackExit('lost_restart', timing);
    onReset("lose");
  };

  // Telemetry: every Continue/Back between the stages, with time on the stage
  // (from when it appeared) and time since its Continue button unlocked.
  // Election night comes straight after the press conference, then the morning paper
  // reviews the term. The paper's pages keep the old stage names (term_summary,
  // wellbeing_changes, electorate_feedback) and log their own page turns.
  const STAGES = ['press_conference', 'verdict', 'paper_front'];
  const stageShownAt = useRef(Date.now());
  const stageReadyAt = useRef<number | null>(null);
  useEffect(() => {
    stageShownAt.current = Date.now();
    stageReadyAt.current = null;
  }, [page]);
  useEffect(() => {
    if (pageReady && stageReadyAt.current === null) stageReadyAt.current = Date.now();
  }, [pageReady]);
  const goToPage = (to: number) => {
    const now = Date.now();
    track('election_stage_navigated', {
      cycle: ElectionCycle[currentCycle],
      from_stage: STAGES[page],
      to_stage: STAGES[to],
      direction: to > page ? 'continue' : 'back',
      ms_on_stage: now - stageShownAt.current,
      ms_after_unlock: stageReadyAt.current ? now - stageReadyAt.current : null,
    });
    if (page === 0) setPressHeld(true);
    if (page === 1) setVerdictSeen(true);
    setPaperFromRally(page === 1 && to === 2 && won);
    setPageReady(false);
    setPage(to);
  };

  // A page turn inside the paper, logged like a move between stages
  const handlePaperNavigate = (from: string, to: string, direction: 'continue' | 'back', msOnStage: number, msAfterUnlock: number | null) => {
    track('election_stage_navigated', {
      cycle: ElectionCycle[currentCycle],
      from_stage: from,
      to_stage: to,
      direction,
      ms_on_stage: msOnStage,
      ms_after_unlock: msAfterUnlock,
    });
  };

  const handlePaperExit = (action: PaperExit, msOnStage: number, msAfterUnlock: number | null) => {
    const timing = { msOnStage, msAfterUnlock };
    if (action === 'lost_restart') handleLostFinal(timing);
    else if (action === 'restart') handleRestartTerm(timing);
    else if (action === 'finish_game') handleFinishGame(timing);
    else handleProceedNextTerm(timing);
  };

  const getModalTitle = () => {
    if (page === 0) return "Press Conference";
    if (page === 1) return "Election Verdict";
    if (page === 2) return "The Morning Paper";
    return "Election Sequence";
  };

  const getModalWidth = () => {
    if (page === 0) return "max-w-2xl";
    if (page === 1) return "max-w-xl";
    return "max-w-3xl";
  };

  return (
    <ModalContent 
      maxWidth={getModalWidth()}
    >
      <ModalHeader title={getModalTitle()} />
      <PMIdentityBanner cycle={currentCycle} className="-mt-2 shrink-0" />
      
      <motion.div className="flex-1 min-h-0 overflow-y-auto pr-1 w-full flex flex-col gap-4">
        {page === 0 && <StagePressConference currentCycle={currentCycle} approvalRating={approvalRating} pollError={props.pollError} history={props.history} onAnswerQuestion={onAnswerPressQuestion} onReady={handlePageReady} onContinue={() => goToPage(1)} alreadyHeld={pressHeld} onSummary={setPressSummary} />}
        {page === 1 && (
          <StageVerdict
            approvalRating={approvalRating} won={won} currentCycle={currentCycle} attemptNumber={cycleAttempts}
            pollError={props.pollError}
            startScore={props.history[0]?.metricScore ?? props.history[0]?.lsAverage ?? props.currentMetricScore}
            endScore={props.currentMetricScore}
            onReady={handlePageReady} onContinue={() => goToPage(2)} alreadySeen={verdictSeen}
          />
        )}
        {page === 2 && (
          <StageMorningPaper
            currentCycle={currentCycle} won={won} canProceed={canProceed} isFinalCycle={isFinalCycle}
            approvalRating={approvalRating} pollError={props.pollError}
            initialPopulation={props.initialPopulation} baselinePopulation={props.baselinePopulation} finalPopulation={props.finalPopulation}
            yAxisMax={props.yAxisMax} pressSummary={pressSummary} fromRally={paperFromRally}
            onBack={() => goToPage(1)} onNavigate={handlePaperNavigate} onExit={handlePaperExit}
          />
        )}
      </motion.div>

      <div className="flex justify-between items-center mt-auto pt-3 border-t border-zinc-100 shrink-0 h-16">
        {page > 0 ? (
          <button 
            onClick={() => goToPage(page - 1)} 
            className="px-4 py-2 text-sm font-bold text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
          >
            &larr; Back
          </button>
        ) : <div />}

        {page < totalPages - 1 ? (
          <button 
            onClick={() => goToPage(page + 1)} 
            disabled={!pageReady}
            className={`px-6 py-3 rounded-lg text-sm font-bold shadow-md transition-all duration-500 ${pageReady ? 'bg-zinc-900 text-white hover:bg-black opacity-100 cursor-pointer' : 'bg-zinc-200 text-zinc-400 opacity-50 cursor-not-allowed'}`}
          >
            {page === 0 ? "Election night \u2192" : "Tomorrow\u2019s paper \u2192"}
          </button>
        ) : (
          <div className="flex gap-3 animate-in fade-in slide-in-from-right-4">
            {!canProceed ? (
              <button onClick={() => handleLostFinal()} className="px-6 py-2.5 bg-rose-600 text-white rounded-lg text-sm font-bold hover:bg-rose-700 shadow-md cursor-pointer">Election Lost - Restart Term</button>
            ) : (
              <>
                <button onClick={() => handleRestartTerm()} className="px-4 py-2.5 bg-zinc-100 text-zinc-700 rounded-lg text-sm font-bold hover:bg-zinc-200 transition-colors cursor-pointer">Restart Term</button>
                
                {!isFinalCycle && (
                  <button 
                    onClick={() => handleProceedNextTerm()} 
                    disabled={!pageReady}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold shadow-md transition-all ${pageReady ? 'bg-pink-600 text-white hover:bg-pink-700 cursor-pointer' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed opacity-50'}`}
                  >
                    Proceed to Next Term
                  </button>
                )}
                
                {isFinalCycle && (
                  <button 
                    onClick={() => handleFinishGame()} 
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