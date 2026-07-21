import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ElectionCycle, TurnHistory } from '../../../utils/types';
import { availablePolicies } from '../../../data/policies';
import { useTypewriter } from '../../../hooks/useTypewriter';
import { useAnimatedNumber } from '../../../hooks/useAnimatedNumber';
import { getRandomPressPerson, buildMetricQuestion } from '../../../utils/pressConferenceData';

interface StagePressConferenceProps {
  currentCycle: ElectionCycle;
  approvalRating: number;
  history: TurnHistory[];
  onAnswerQuestion: (delta: number) => void;
  onReady: () => void;
}

const SCORE_DELTA = 5;

interface AnswerOption {
  text: string;
  correct: boolean;
}

interface PolicyQuestion {
  options: AnswerOption[];
  correctIndex: number;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildPolicyQuestion(history: TurnHistory[]): PolicyQuestion | null {
  const enacted = history.filter(h => h.turn > 1 && h.enactedPolicyId && h.enactedPolicyName);
  if (enacted.length < 2) return null;

  const withDelta = enacted.map(h => {
    const prevEntry = history.find(x => x.turn === h.turn - 1);
    const delta = prevEntry ? h.lsAverage - prevEntry.lsAverage : 0;
    return { id: h.enactedPolicyId as string, name: h.enactedPolicyName as string, delta };
  });

  const sorted = [...withDelta].sort((a, b) => b.delta - a.delta);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1].id === best.id ? sorted[sorted.length - 2] : sorted[sorted.length - 1];

  if (!worst) return null;

  const enactedIds = new Set(enacted.map(e => e.enactedPolicyId));
  const neverEnacted = availablePolicies.filter(p => !enactedIds.has(p.id));
  if (neverEnacted.length === 0) return null;

  const neverPicked = neverEnacted[Math.floor(Math.random() * neverEnacted.length)];

  const options = shuffle([
    { text: best.name, correct: true },
    { text: worst.name, correct: false },
    { text: neverPicked.policyName, correct: false },
  ]);

  return {
    options,
    correctIndex: options.findIndex(o => o.correct),
  };
}

type ApprovalTier = 'comfortable' | 'contested' | 'trailing';

function getApprovalTier(approvalRating: number): ApprovalTier {
  if (approvalRating >= 65) return 'comfortable';
  if (approvalRating >= 40) return 'contested';
  return 'trailing';
}

const Q1_OPENERS: Record<ApprovalTier, string> = {
  comfortable: "The polls have been kind to you this term. Prime Minister, you've led your government according to a specific measure of success. Which of these best describes what your actual focus was?",
  contested: "It's shaping up to be a close race. Prime Minister, you've led your government according to a specific measure of success. Which of these best describes what your actual focus was?",
  trailing: "The numbers aren't looking kind to you right now. Prime Minister, you've led your government according to a specific measure of success. Which of these best describes what your actual focus was?",
};

const Q2_OPENERS = {
  afterCorrect: "Good—glad we've cleared that up. Now, of everything you enacted this term, which policy do you think was most impactful for ordinary people?",
  afterWrong: "Hm. Not quite, but let's move on. Of everything you enacted this term, which policy do you think was most impactful for ordinary people?",
};

const getClosingLine = (correctCount: number, tier: ApprovalTier): string => {
  if (tier === 'comfortable') {
    if (correctCount === 2) return "Brilliant work out there, Prime Minister. You absolutely smashed it. That just cements our lead even further.";
    if (correctCount === 1) return "A bit of a mixed bag today, Prime Minister, but frankly, with our current polling, we can afford a minor slip-up.";
    return "Well, that wasn't your best performance. Luckily, our ratings are strong enough to absorb the hit, but let's not make a habit of it.";
  }
  
  if (tier === 'contested') {
    if (correctCount === 2) return "Nice work out there, Prime Minister. You smashed it — that should give our ratings a real boost right when we need it to secure this election.";
    if (correctCount === 1) return "You held your own out there, just about. It's still a tight race, so let's hope the electorate focuses on the positives.";
    return "I'm honestly not sure what happened out there today, Prime Minister. That's tanked our momentum right when we needed it most.";
  }

  // Trailing
  if (correctCount === 2) return "A stellar performance, Prime Minister! That might just be the lifeline we needed to turn this sinking ship around.";
  if (correctCount === 1) return "Well... that might have just saved us. Just about. We're still in dangerous territory, though.";
  return "A disaster, frankly. Our ratings were already in the gutter, and that certainly hasn't helped.";
};

// The closing reaction reads as an internal aide debriefing the PM after the
// cameras stop rolling, not the journalist — the "our ratings" framing only
// makes sense coming from someone on the PM's own team.
const AIDE_REACTION = { name: "Chief of Staff", outlet: "Backstage, Off the Record", emoji: "🧑‍💼" };

type Phase = 'q1' | 'q2' | 'summary';

export default function StagePressConference({ currentCycle, approvalRating, history, onAnswerQuestion, onReady }: StagePressConferenceProps) {
  const [pressPerson] = useState(getRandomPressPerson);
  const [introSequence, setIntroSequence] = useState(0); 
  // 0 = Fade to black, 1 = Journalist appears & typing starts
  
  const [phase, setPhase] = useState<Phase>('q1');
  const [q1Selected, setQ1Selected] = useState<number | null>(null);
  const [q2Selected, setQ2Selected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(true);

  const readyFiredRef = useRef(false);

  const tier = useMemo(() => getApprovalTier(approvalRating), [approvalRating]);
  const q1 = useMemo(() => buildMetricQuestion(currentCycle), [currentCycle]);
  const q2 = useMemo(() => buildPolicyQuestion(history), [history]);

  const displayScore = useAnimatedNumber(approvalRating, 900);

  // Cinematic Choreography Timer
  useEffect(() => {
    const t1 = setTimeout(() => setIntroSequence(1), 1200); // Wait 1.2s in pitch black, then pop the dialogue
    return () => clearTimeout(t1);
  }, []);

  const currentPrompt =
    phase === 'q1'
      ? Q1_OPENERS[tier]
      : phase === 'q2' && q2
      ? (q1Selected === q1.correctIndex ? Q2_OPENERS.afterCorrect : Q2_OPENERS.afterWrong)
      : getClosingLine(correctCount, tier);

  // Slowed down typing to 35ms per character for readability
  const { displayedText, isTyping, isComplete, skip } = useTypewriter(currentPrompt, 35, introSequence >= 1);

  const handleAnswerQ1 = (index: number) => {
    if (q1Selected !== null) return;
    setQ1Selected(index);
    const isCorrect = index === q1.correctIndex;
    if (isCorrect) setCorrectCount(c => c + 1);
    
    onAnswerQuestion(isCorrect ? SCORE_DELTA : -SCORE_DELTA);
    
    // Slowed down transition so the user can register the green check / red cross
    setTimeout(() => {
      setPhase(q2 ? 'q2' : 'summary');
    }, 2500);
  };

  const handleAnswerQ2 = (index: number) => {
    if (!q2 || q2Selected !== null) return;
    setQ2Selected(index);
    const isCorrect = index === q2.correctIndex;
    if (isCorrect) setCorrectCount(c => c + 1);
    
    onAnswerQuestion(isCorrect ? SCORE_DELTA : -SCORE_DELTA);
    
    setTimeout(() => {
      setPhase('summary');
    }, 2500);
  };

  // Gracefully transition back to the normal Modal flow
  useEffect(() => {
    if (phase === 'summary' && !readyFiredRef.current) {
      readyFiredRef.current = true;
      const t1 = setTimeout(() => {
        setIsFullscreen(false); // Fade out the cinematic black overlay
        onReady(); // Unlock the modal's standard "Continue" button
      }, 4000);
      return () => clearTimeout(t1);
    }
  }, [phase, onReady]);

  const renderOptions = (options: AnswerOption[], selected: number | null, onSelect: (i: number) => void) => (
    <div className="flex flex-col gap-3 w-full">
      {options.map((opt, i) => {
        const isSelected = selected === i;
        const isCorrectOption = opt.correct;
        const revealed = selected !== null;

        let stateClasses = 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 hover:border-zinc-500 cursor-pointer';
        
        if (revealed) {
          if (isCorrectOption) stateClasses = 'border-emerald-500 bg-emerald-500/20 text-emerald-50';
          else if (isSelected) stateClasses = 'border-rose-500 bg-rose-500/20 text-rose-50';
          else stateClasses = 'border-zinc-800 bg-zinc-800/40 opacity-40';
        }

        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            disabled={revealed}
            className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-300 text-sm font-medium text-zinc-200 disabled:cursor-default flex items-center justify-between gap-3 ${stateClasses}`}
          >
            <span>{opt.text}</span>
            {revealed && isCorrectOption && <span className="text-emerald-400 text-xl shrink-0">✔️</span>}
            {revealed && isSelected && !isCorrectOption && <span className="text-rose-400 text-xl shrink-0">❌</span>}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {/* 
        LAYER 1: The Cinematic Fullscreen Overlay 
        This completely eclipses the standard Modal formatting while active.
      */}
      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            key="fullscreen-press"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="fixed inset-0 z-[9999] bg-zinc-950 flex flex-col p-6 md:p-12 overflow-y-auto"
          >
            {/* Live Approval - Explicitly separated from the journalist's box */}
            <div className="absolute top-6 right-6 md:top-10 md:right-12 z-20 flex flex-col items-end">
              <span className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-1">Your Live Approval</span>
              <span
                className="text-4xl md:text-5xl font-black tabular-nums transition-colors duration-500"
                style={{ color: approvalRating >= 51 ? '#34d399' : '#fb7185' }}
              >
                {displayScore.toFixed(1) === '100.0' ? '100' : displayScore.toFixed(1)}%
              </span>
            </div>

            {/* Journalist Dialogue & Answer Flow */}
            <div className="flex-1 flex flex-col justify-center gap-6 max-w-2xl mx-auto w-full mt-16 md:mt-24">
              
              {introSequence >= 1 && (() => {
                const speaker = phase === 'summary' ? AIDE_REACTION : pressPerson;
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl relative"
                  >
                    {/* Decorative speech bubble tail */}
                    <div className="absolute top-full left-10 -mt-px border-[12px] border-transparent border-t-zinc-900 z-10" />
                    <div className="absolute top-full left-[39px] -mt-px border-[13px] border-transparent border-t-zinc-800 z-0" />

                    <div className="flex items-center gap-4 mb-4 border-b border-zinc-800 pb-4">
                      <span className="text-3xl bg-zinc-800 border border-zinc-700 w-14 h-14 flex items-center justify-center rounded-full shadow-inner shrink-0">
                        {speaker.emoji}
                      </span>
                      <div>
                        <span className="text-sm font-black uppercase tracking-widest text-pink-500 leading-tight block mb-0.5">
                          {speaker.name}
                        </span>
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{speaker.outlet}</span>
                      </div>
                    </div>
                    <div
                      className={`text-zinc-200 text-base md:text-lg leading-relaxed whitespace-pre-wrap min-h-[4em] ${isTyping ? 'cursor-pointer' : ''}`}
                      onClick={() => { if (isTyping) skip(); }}
                    >
                      {displayedText}
                      {isTyping && <span className="inline-block w-2 h-5 ml-1 bg-zinc-500 animate-pulse translate-y-1" />}
                    </div>
                  </motion.div>
                );
              })()}

              {/* Answer Options - only appear once typing is fully complete */}
              <AnimatePresence mode="wait">
                {introSequence >= 1 && isComplete && phase === 'q1' && (
                  <motion.div key="q1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
                    {renderOptions(q1.options.map(o => ({ text: o.text, correct: o.cycle === currentCycle })), q1Selected, handleAnswerQ1)}
                  </motion.div>
                )}

                {introSequence >= 1 && isComplete && phase === 'q2' && q2 && (
                  <motion.div key="q2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
                    {renderOptions(q2.options, q2Selected, handleAnswerQ2)}
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 
        LAYER 2: The standard Modal placeholder 
        This is what the user is safely returned to once the fullscreen effect ends.
      */}
      {!isFullscreen && (
        <div className="flex flex-col items-center justify-center p-8 bg-zinc-50 border border-zinc-200 rounded-2xl h-full min-h-[200px] animate-in fade-in zoom-in-95 duration-500 text-center">
          <span className="text-4xl mb-4">🎤</span>
          <h3 className="text-xl font-black text-zinc-900 mb-2">Press Conference Concluded</h3>
          <p className="text-zinc-600 font-medium max-w-md mb-6">The Chief of Staff has concluded your debrief.</p>
        </div>
      )}
    </>
  );
}