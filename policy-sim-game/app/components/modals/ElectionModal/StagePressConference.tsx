import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ElectionCycle, TurnHistory } from '../../../utils/types';
import { availablePolicies } from '../../../data/policies';
import { useTypewriter } from '../../../hooks/useTypewriter';
import { useAnimatedNumber } from '../../../hooks/useAnimatedNumber';
import { getPressPair, buildMetricQuestion } from '../../../utils/pressConferenceData';
import { getPMProfile } from '../../../utils/pmProfiles';
import { track } from '../../../client/telemetry';
import { useTypewriterTelemetry } from '../../../client/hooks';
import { makePoll, formatPollRange, pollBarPercent, POLL_STATUS_COLOURS, POLL_HALF_WIDTH_POLLING_DAY, POLL_HALF_WIDTH_FINAL, WIN_THRESHOLD, Poll, PollStatus } from '../../../utils/polls';
import PressScene, { STAGE_W, STAGE_H, ASKER_LEFT, ASKER_RIGHT, CROWD_SPOTS, crowdHeadCentre } from './PressScene';

interface StagePressConferenceProps {
  currentCycle: ElectionCycle;
  /** The real approval. Never shown: the player sees a poll around it. */
  approvalRating: number;
  /** This term's poll error (utils/polls.ts). */
  pollError: number;
  history: TurnHistory[];
  onAnswerQuestion: (delta: number) => void;
  onReady: () => void;
  /** Moves the election sequence on to the Term Summary. */
  onContinue: () => void;
  /** True when coming Back to this stage: the conference already happened, so don't hold it again. */
  alreadyHeld?: boolean;
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

  // "Impact" has to be measured by whatever the player was actually being
  // judged on that term (worst-off citizen for Rawlsian, utility for the
  // utility cycles, etc) - falling back to lsAverage only covers old saves
  // made before metricScore was recorded.
  const metricOf = (h: TurnHistory) => h.metricScore ?? h.lsAverage;

  const withDelta = enacted.map(h => {
    const prevEntry = history.find(x => x.turn === h.turn - 1);
    const delta = prevEntry ? metricOf(h) - metricOf(prevEntry) : 0;
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
  afterCorrect: "Prime Minister, over here! Of everything you enacted this term, which policy do you think was most impactful for ordinary people?",
  afterWrong: "That's not how I remember it, Prime Minister. But of everything you enacted this term, which policy do you think was most impactful for ordinary people?",
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
const AIDE_REACTION = { name: "Chief of Staff", outlet: "Backstage, Off the Record" };

type Phase = 'q1' | 'q2' | 'summary';

// Window size, for scaling the 1440 × 900 scene to cover the screen.
const subscribeResize = (cb: () => void) => {
  window.addEventListener('resize', cb);
  return () => window.removeEventListener('resize', cb);
};
const getViewW = () => window.innerWidth;
const getViewH = () => window.innerHeight;

/** Coming Back to this stage: the conference already happened, so it isn't held (or scored) again. */
function PressConferenceHeld({ onReady }: { onReady: () => void }) {
  useEffect(() => { onReady(); }, [onReady]);
  return (
    <div className="flex flex-col items-center justify-center py-10 animate-in fade-in duration-300 text-center">
      <h3 className="text-xl font-black text-zinc-900 mb-2">Press Conference Concluded</h3>
      <p className="text-zinc-500 font-medium max-w-md">Your answers are on the record.</p>
    </div>
  );
}

export default function StagePressConference(props: StagePressConferenceProps) {
  if (props.alreadyHeld) return <PressConferenceHeld onReady={props.onReady} />;
  return <PressConferenceLive {...props} />;
}

function PressConferenceLive({ currentCycle, approvalRating, pollError, history, onAnswerQuestion, onReady, onContinue }: StagePressConferenceProps) {
  const [pressPair] = useState(getPressPair);
  // Approval as the press conference began, for the final poll's "this morning"
  const [startApproval] = useState(approvalRating);
  const [introSequence, setIntroSequence] = useState(0);
  // 0 = Fade in from black, 1 = Journalist appears & typing starts

  const [phase, setPhase] = useState<Phase>('q1');
  const [q1Selected, setQ1Selected] = useState<number | null>(null);
  const [q2Selected, setQ2Selected] = useState<number | null>(null);
  const [concluded, setConcluded] = useState(false);
  // The PM reads the chosen answer out loud; only then is it marked, approval
  // moves, and (if it was wrong) the press react.
  const [said, setSaid] = useState<{ text: string; correct: boolean; next: Phase } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const nextPhaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const readyFiredRef = useRef(false);
  const finalCorrectCountRef = useRef(0);

  const tier = useMemo(() => getApprovalTier(approvalRating), [approvalRating]);
  const q1 = useMemo(() => buildMetricQuestion(currentCycle), [currentCycle]);
  const q2 = useMemo(() => buildPolicyQuestion(history), [history]);

  const displayScore = useAnimatedNumber(approvalRating, 900);

  const viewW = useSyncExternalStore(subscribeResize, getViewW, () => STAGE_W);
  const viewH = useSyncExternalStore(subscribeResize, getViewH, () => STAGE_H);

  // Cinematic Choreography Timer
  useEffect(() => {
    const t1 = setTimeout(() => setIntroSequence(1), 1200);
    return () => clearTimeout(t1);
  }, []);

  const currentPrompt =
    phase === 'q1'
      ? Q1_OPENERS[tier]
      : phase === 'q2' && q2 !== null
      ? (q1Selected === q1.correctIndex ? Q2_OPENERS.afterCorrect : Q2_OPENERS.afterWrong)
      : getClosingLine(finalCorrectCountRef.current, tier);

  // Slowed down typing to 35ms per character for readability
  const { displayedText, isTyping, isComplete, skip } = useTypewriter(currentPrompt, 35, introSequence >= 1);

  const tw = useTypewriterTelemetry(currentPrompt);
  const questionReadyAt = useRef<number | null>(null);

  // Reset timer each time the question text changes (q1 → q2 → summary)
  useEffect(() => {
    tw.reset();
    questionReadyAt.current = null;
  }, [phase]);

  // When typing completes (or is skipped), record when answers become available
  useEffect(() => {
    if (isComplete && questionReadyAt.current === null) {
      questionReadyAt.current = Date.now();
    }
  }, [isComplete]);

  const pmSpeech = useTypewriter(said?.text ?? '', 18, said !== null);

  // Once the PM has finished speaking: mark the answer, move approval, then
  // the next question (same 1.5 s to register the tick / cross as before).
  useEffect(() => {
    if (said === null || !pmSpeech.isComplete || revealed) return;
    const t = setTimeout(() => {
      setRevealed(true);
      onAnswerQuestion(said.correct ? SCORE_DELTA : -SCORE_DELTA);
      nextPhaseTimer.current = setTimeout(() => {
        setSaid(null);
        setRevealed(false);
        setPhase(said.next);
      }, said.correct ? 1500 : 2200); // a little longer to take in the press reaction
    }, 450);
    return () => clearTimeout(t);
  }, [said, pmSpeech.isComplete, revealed, onAnswerQuestion]);

  useEffect(() => () => { if (nextPhaseTimer.current) clearTimeout(nextPhaseTimer.current); }, []);

  const handleAnswerQ1 = (index: number) => {
    if (q1Selected !== null) return;
    setQ1Selected(index);
    const isCorrect = index === q1.correctIndex;
    if (isCorrect) {
      finalCorrectCountRef.current += 1;
    }
    const skipInfo = tw.getSkipInfo();
    track('press_q1_answered', {
      cycle: ElectionCycle[currentCycle],
      answer_given: q1.options[index].text ?? '',
      correct: isCorrect,
      time_to_answer_ms: questionReadyAt.current ? Date.now() - questionReadyAt.current : 0,
      text_was_skipped: skipInfo.was_skipped,
    });
    // The PM says it out loud first; the mark, approval change and next question follow
    setSaid({ text: q1.options[index].text, correct: isCorrect, next: q2 ? 'q2' : 'summary' });
  };

  const handleAnswerQ2 = (index: number) => {
    if (!q2 || q2Selected !== null) return;
    setQ2Selected(index);
    const isCorrect = index === q2.correctIndex;
    if (isCorrect) {
      finalCorrectCountRef.current += 1;
    }
    const skipInfo = tw.getSkipInfo();
    // Detect if they picked a policy they never actually enacted
    const enactedIds = new Set(history.filter(h => h.enactedPolicyId).map(h => h.enactedPolicyId));
    const chosenOption = q2.options[index];
    const chosenPolicy = availablePolicies.find(p => p.policyName === chosenOption.text);
    const pickedUnenacted = chosenPolicy ? !enactedIds.has(chosenPolicy.id) : false;

    track('press_q2_answered', {
      cycle: ElectionCycle[currentCycle],
      answer_given: chosenOption.text ?? '',
      correct: isCorrect,
      time_to_answer_ms: questionReadyAt.current ? Date.now() - questionReadyAt.current : 0,
      text_was_skipped: skipInfo.was_skipped,
      picked_unenacted_policy: pickedUnenacted,
    });
    setSaid({ text: chosenOption.text, correct: isCorrect, next: 'summary' });
  };

  // Backstage, the Chief of Staff has their say; 4 s later the conference is
  // concluded and Continue unlocks (same timing as before).
  useEffect(() => {
    if (phase === 'summary' && !readyFiredRef.current) {
      readyFiredRef.current = true;
      const t1 = setTimeout(() => {
        setConcluded(true);
        onReady();
      }, 4000);
      return () => clearTimeout(t1);
    }
  }, [phase, onReady]);

  useEffect(() => {
    track('press_conference_started', {
      cycle: ElectionCycle[currentCycle],
      approval_rating: approvalRating,
    });
  }, []);

  // ── Layout: the scene covers the screen; text and buttons sit on top at real size ──
  const scale = Math.max(viewW / STAGE_W, viewH / STAGE_H);
  const offX = (viewW - STAGE_W * scale) / 2;
  const offY = (viewH - STAGE_H * scale) / 2;

  const backstage = phase === 'summary';
  const asking = phase === 'q2' ? pressPair.second : pressPair.first;
  const askOnLeft = phase === 'q2' ? !pressPair.firstOnLeft : pressPair.firstOnLeft;
  const askerIndex = backstage ? null : askOnLeft ? ASKER_LEFT : ASKER_RIGHT;
  const speaker = backstage ? AIDE_REACTION : asking;

  // Keep the bubble clear of the PM in the middle of the screen
  const margin = Math.max(24, viewW * 0.04);
  const bubbleW = Math.min(600, viewW / 2 - 80 - margin);
  const bubbleX = backstage ? margin : askOnLeft ? margin : viewW - bubbleW - margin;
  const bubbleY = Math.max(140, viewH * 0.17); // backstage
  // Backstage: the final poll slip, handed over on the right
  const slipW = Math.min(520, viewW / 2 - 40 - margin);
  const pollNow = makePoll(displayScore, backstage ? POLL_HALF_WIDTH_FINAL : POLL_HALF_WIDTH_POLLING_DAY, pollError);
  const pollThisMorning = makePoll(startApproval, POLL_HALF_WIDTH_POLLING_DAY, pollError);
  const finalPoll = makePoll(approvalRating, POLL_HALF_WIDTH_FINAL, pollError);
  const correctSoFar = (q1Selected === q1.correctIndex ? 1 : 0) + (q2 && q2Selected === q2.correctIndex ? 1 : 0);
  // Questions come from low down, just above whoever is asking
  const askerTagTop = askerIndex === null ? 0 : offY + (CROWD_SPOTS[askerIndex][1] - 34) * scale;
  const bubbleBottom = viewH - askerTagTop + 26;
  // The PM's answer, just above their head
  const pmBubbleW = Math.min(460, viewW * 0.36);
  const pmBubbleX = offX + (STAGE_W / 2) * scale - pmBubbleW / 2;
  const pmBubbleBottom = viewH - (offY + 290 * scale) + 18;
  // A wrong answer: the press aren't convinced
  const HUH = ['?', 'Huh??', '?!?', 'Eh?'];
  const reactors = (phase === 'q2' ? [3, 5, 8, 10] : [1, 4, 7, 9]).filter(i => i !== askerIndex);
  const reactions = revealed && said && !said.correct
    ? reactors.map((i, n) => {
        const [, y, k, fd] = CROWD_SPOTS[i];
        return {
          key: i, text: HUH[n % HUH.length], delay: n * 0.15, rot: [-8, 6, -4, 9][n % 4],
          left: Math.min(viewW - 50, Math.max(50, offX + crowdHeadCentre(i).x * scale)),
          top: offY + (y - (fd > 0 ? 125 * k : 40)) * scale - 24,
        };
      })
    : [];
  const askerHeadX = askerIndex === null ? 0 : offX + crowdHeadCentre(askerIndex).x * scale;
  const tailX = Math.min(bubbleW - 56, Math.max(28, askerHeadX - bubbleX - 14));

  const tone = getPMProfile(currentCycle);
  const pmName = tone.name.replace(/^PM\s+/, '').toUpperCase();

  const renderOptions = (options: AnswerOption[], selected: number | null, onSelect: (i: number) => void, big: boolean) => (
    <div className="grid grid-cols-3 gap-4 items-end">
      {options.map((opt, i) => {
        const picked = selected !== null;
        const shown = picked && revealed; // marked once the PM has said it
        const mine = selected === i;
        const tag = !shown ? `Option ${'ABC'[i]}` : opt.correct ? (mine ? '✓ Correct · +5 approval' : '✓ The right answer') : mine ? '✗ Not quite · −5 approval' : '';
        const tagColour = !shown ? '#78716c' : opt.correct ? '#15803d' : '#b91c1c';
        const ring = !shown ? (mine ? '#fde68a' : 'transparent') : opt.correct ? '#22c55e' : mine ? '#f43f5e' : 'transparent';
        const fade = !shown ? (picked && !mine ? 0.5 : 1) : (!opt.correct && !mine ? 0.4 : 1);
        return (
          <div key={i} style={{ rotate: `${[-1.2, 0.6, -0.5][i]}deg` }}>
            <button
              type="button"
              onClick={() => onSelect(i)}
              disabled={picked}
              className="w-full text-left bg-[#fbfaf6] text-stone-900 rounded-[10px] px-[18px] py-4 flex flex-col gap-2 transition-[translate,opacity] duration-200 enabled:hover:-translate-y-1.5 enabled:cursor-pointer disabled:cursor-default"
              style={{ boxShadow: `0 0 0 4px ${ring}, 0 16px 32px rgba(0,0,0,.55)`, opacity: fade }}
            >
              <span className="text-[10px] font-extrabold tracking-[.14em] uppercase min-h-[14px]" style={{ color: tagColour }}>{tag}</span>
              <span className={`font-semibold leading-snug ${big ? 'text-xl' : 'text-base'}`}>“{opt.text}”</span>
            </button>
          </div>
        );
      })}
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div
        key="fullscreen-press"
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9999] bg-black overflow-hidden text-slate-50"
      >
        {/* The scene, fading in from black */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="absolute left-0 top-0 origin-top-left"
          style={{ transform: `translate(${offX}px, ${offY}px) scale(${scale})` }}
        >
          <PressScene cycle={currentCycle} askerIndex={askerIndex} askerName={asking.name} />
        </motion.div>

        {/* Backstage: the lights go down */}
        <div className="absolute inset-0 bg-[rgba(5,5,8,.78)] pointer-events-none transition-opacity duration-700" style={{ opacity: backstage ? 1 : 0 }} />

        {/* Who you are */}
        <div className="absolute left-7 top-[22px] rounded-md px-3.5 py-2 flex flex-col bg-[linear-gradient(180deg,#e3c27a,#b38a3e)] shadow-[inset_0_1px_0_rgba(255,255,255,.5),0_6px_14px_rgba(0,0,0,.4)]">
          <span className="font-black text-[15px] tracking-[.08em] text-[#2a1a08]">{pmName}</span>
          <span className="text-[11px] italic text-[#4a3210]">Press conference · Downing Street</span>
        </div>

        {/* The polls (never the exact approval), separate from the journalist's box */}
        <div className="absolute right-8 top-5 w-[260px] flex flex-col items-end gap-1">
          <span className="text-[11px] font-extrabold tracking-[.14em] uppercase text-zinc-400">Polls</span>
          <span className="text-[44px] font-black leading-none tabular-nums transition-colors duration-500" style={{ color: POLL_STATUS_COLOURS[pollNow.status].onDark }}>
            {formatPollRange(pollNow)}
          </span>
          <PollBar poll={pollNow} className="w-full h-2.5 mt-1.5 bg-white/15" band="#f472b6" line="#f8fafc" />
          <span className="text-[12px] font-extrabold" style={{ color: POLL_STATUS_COLOURS[pollNow.status].onDark }}>{pollNow.status}</span>
        </div>

        {/* The journalist asking, then the Chief of Staff backstage */}
        {introSequence >= 1 && (
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
            className={`absolute bg-[#fffdf7] text-stone-900 rounded-[18px] px-[22px] pt-[18px] pb-5 shadow-[0_18px_40px_rgba(0,0,0,.55)] ${isTyping ? 'cursor-pointer' : ''}`}
            style={{ left: bubbleX, width: bubbleW, ...(backstage ? { top: bubbleY } : { bottom: bubbleBottom }) }}
            onClick={() => { if (isTyping) { skip(); tw.onSkip(); questionReadyAt.current = Date.now(); } }}
          >
            <div className="flex flex-col border-b border-stone-200 pb-2.5 mb-2.5">
              <span className="text-[13px] font-black tracking-[.1em] uppercase" style={{ color: tone.color }}>{speaker.name}</span>
              <span className="text-[10px] font-extrabold tracking-[.14em] uppercase text-stone-500">{speaker.outlet}</span>
            </div>
            <div className={`whitespace-pre-wrap min-h-[4em] leading-[1.45] ${backstage ? 'font-hand text-[30px] text-[#1e3a8a]' : 'text-[19px]'}`}>
              {displayedText}
              {isTyping && <span className="inline-block w-2 h-5 ml-1 bg-zinc-400 animate-pulse translate-y-1" />}
            </div>
            {!backstage && (
              <div
                className="absolute -bottom-[18px] w-0 h-0 border-x-[14px] border-x-transparent border-t-[20px] border-t-[#fffdf7]"
                style={{ left: tailX }}
              />
            )}
          </motion.div>
        )}

        {/* The PM reads the chosen answer out */}
        <AnimatePresence>
          {said && !backstage && (
            <motion.div
              key={`pm-${phase}`}
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute bg-white text-stone-900 rounded-[18px] px-5 pt-3.5 pb-4 shadow-[0_18px_40px_rgba(0,0,0,.55)]"
              style={{ left: pmBubbleX, bottom: pmBubbleBottom, width: pmBubbleW }}
            >
              <span className="block text-[11px] font-black tracking-[.12em] uppercase mb-1" style={{ color: tone.color }}>{pmName} · Prime Minister</span>
              <p className="m-0 font-semibold text-[18px] leading-snug">“{pmSpeech.displayedText}{pmSpeech.isComplete ? '”' : ''}</p>
              <div className="absolute -bottom-[18px] left-1/2 -ml-[14px] w-0 h-0 border-x-[14px] border-x-transparent border-t-[20px] border-t-white" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Your answers - only once the question has been asked in full */}
        <div className="absolute left-[2.5vw] right-[2.5vw] bottom-[3vh]">
          <AnimatePresence mode="wait">
            {introSequence >= 1 && isComplete && phase === 'q1' && (
              <motion.div key="q1" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
                {renderOptions(q1.options.map(o => ({ text: o.text, correct: o.cycle === currentCycle })), q1Selected, handleAnswerQ1, false)}
              </motion.div>
            )}

            {introSequence >= 1 && isComplete && phase === 'q2' && q2 && (
              <motion.div key="q2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}>
                {renderOptions(q2.options, q2Selected, handleAnswerQ2, true)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* The press aren't convinced */}
        {reactions.map(r => (
          <motion.span
            key={`${phase}-${r.key}`}
            initial={{ opacity: 0, scale: 0.4, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: r.delay, duration: 0.3, ease: [0.2, 0.8, 0.3, 1.4] }}
            className="absolute -translate-x-1/2 bg-white text-stone-900 font-black text-[22px] leading-none px-3 py-2 rounded-2xl shadow-[0_8px_18px_rgba(0,0,0,.45)] pointer-events-none"
            style={{ left: r.left, top: r.top, rotate: `${r.rot}deg` }}
          >
            {r.text}
          </motion.span>
        ))}

        {/* Backstage: the Chief of Staff hands over the final poll */}
        {backstage && (
          <motion.div
            initial={{ opacity: 0, x: 260, y: 420, rotate: 18 }}
            animate={{ opacity: 1, x: 0, y: 0, rotate: -2 }}
            transition={{ delay: 0.9, duration: 0.9, ease: [0.2, 0.8, 0.25, 1] }}
            className="absolute bg-[#faf6ec] text-stone-900 px-[26px] pt-[22px] pb-6 shadow-[0_24px_50px_rgba(0,0,0,.6)] flex flex-col gap-3"
            style={{ right: margin, top: bubbleY, width: slipW }}
          >
            {/* Staple */}
            <div className="absolute left-[22px] -top-3.5 w-[18px] h-[50px] border-[3px] border-zinc-400 rounded-[10px]" />
            <div className="flex justify-between gap-3 border-b-2 border-stone-900 pb-1.5 ml-[30px] text-[10px] font-extrabold tracking-[.14em] uppercase text-[#7c5a1d]">
              <span>Party pollster · final poll</span>
              <span>Polling day, 6pm</span>
            </div>
            <div className="flex justify-between items-end gap-3">
              <span className="font-display font-black text-[clamp(40px,4.4vw,64px)] leading-[.9] tabular-nums">{formatPollRange(finalPoll)}</span>
              <span className="text-[18px] font-black text-right" style={{ color: POLL_STATUS_COLOURS[finalPoll.status].onLight }}>{finalPoll.status}</span>
            </div>
            <PollBar poll={finalPoll} before={pollThisMorning} className="w-full h-[22px] bg-[#e7dfcb]" band="#be185d" line="#1c1917" />
            <div className="flex justify-between text-[11px] font-bold text-stone-500"><span>20%</span><span>{WIN_THRESHOLD}% to win</span><span>80%</span></div>
            <div className="grid grid-cols-2 gap-3 border-t border-stone-300 pt-2.5">
              <div className="flex flex-col gap-0.5 text-stone-500">
                <span className="text-[10px] font-extrabold tracking-[.14em] uppercase">This morning</span>
                <span className="text-[18px] font-black tabular-nums">{formatPollRange(pollThisMorning)}</span>
                <span className="text-[11px]">hatched on the bar</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-extrabold tracking-[.14em] uppercase text-stone-500">Your press answers</span>
                <span className="text-[18px] font-black">{correctSoFar} of {q2 ? 2 : 1} correct</span>
              </div>
            </div>
            <span className="font-hand text-[24px] text-[#1e3a8a] -rotate-[1.5deg]">{SCRIBBLE[finalPoll.status]}</span>
          </motion.div>
        )}

        {/* Concluded */}
        {concluded && (
          <div className="absolute bottom-[8vh] flex flex-col items-center gap-8" style={{ left: margin, width: bubbleW }}>
            <motion.div
              initial={{ opacity: 0, scale: 1.4, rotate: -4, y: -16 }}
              animate={{ opacity: 1, scale: 1, rotate: -6, y: 0 }}
              transition={{ duration: 0.35, ease: [0.2, 0.8, 0.3, 1.3] }}
              className="border-[5px] px-[22px] py-2.5 font-black text-[clamp(18px,2vw,30px)] tracking-[.14em] uppercase whitespace-nowrap"
              style={{ borderColor: PM_LIGHT[currentCycle], color: PM_LIGHT[currentCycle] }}
            >
              Press conference concluded
            </motion.div>
            <button
              type="button"
              onClick={onContinue}
              className="font-black text-[15px] bg-[#d6b25e] text-stone-900 rounded-[10px] px-6 py-3.5 cursor-pointer hover:bg-[#e3c27a]"
            >
              Continue to Term Summary ▶
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

/** Light tint of each PM's colour, readable on the dark backstage. */
const PM_LIGHT: Record<ElectionCycle, string> = {
  [ElectionCycle.Benthamite]: '#f9a8d4',
  [ElectionCycle.Rawlsian]: '#93c5fd',
  [ElectionCycle.SocietalUtility]: '#6ee7b7',
  [ElectionCycle.PersonalUtility]: '#c4b5fd',
};

/** The Chief of Staff's note on the final poll. */
const SCRIBBLE: Record<PollStatus, string> = {
  'Comfortable lead': 'Pop the champagne. Quietly.',
  Ahead: 'Should be fine. Should.',
  'Too close to call': 'Coin toss. Get some sleep.',
  Behind: 'Start drafting a speech. Either kind.',
};

/** A poll as a soft band on a 20–80% bar, with the 51% line; optionally an earlier poll hatched behind it. */
function PollBar({ poll, before, className, band, line }: { poll: Poll; before?: Poll; className: string; band: string; line: string }) {
  const left = pollBarPercent(poll.low);
  const width = pollBarPercent(poll.high) - left;
  return (
    <div className={`relative rounded-full overflow-hidden ${className}`}>
      {before && (
        <div
          className="absolute top-0 bottom-0 bg-[repeating-linear-gradient(-45deg,rgba(120,113,108,.45)_0_4px,transparent_4px_8px)]"
          style={{ left: `${pollBarPercent(before.low)}%`, width: `${pollBarPercent(before.high) - pollBarPercent(before.low)}%` }}
        />
      )}
      <div
        className="absolute top-0 bottom-0 transition-[left,width] duration-700 ease-out"
        style={{ left: `${left}%`, width: `${width}%`, background: `linear-gradient(90deg, transparent, ${band} 22%, ${band} 78%, transparent)` }}
      />
      <div className="absolute top-0 bottom-0 w-0.5" style={{ left: `${pollBarPercent(WIN_THRESHOLD)}%`, backgroundColor: line }} />
    </div>
  );
}