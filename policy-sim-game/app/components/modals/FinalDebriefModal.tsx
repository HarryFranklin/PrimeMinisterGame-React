import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AxisVariable, ElectionCycle, Respondent } from '../../utils/types';
import { CYCLE_COLORS } from '../../utils/uiHelpers';
import { FRAMEWORK_RULES } from '../../utils/frameworkRules';
import { getPMProfile } from '../../utils/pmProfiles';
import { MetricsEngine } from '../../utils/MetricsEngine';
import { loadPopulation } from '../../utils/dataLoader';
import D3Chart from '../D3Chart';
import { ModalContent, ModalHeader, DPMMessage } from './SharedModalComponents';
import { useGame } from '../../context/GameStateContext';
import { track } from '../../client/telemetry';
import { useDwellTimer } from '../../client/hooks';

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

// ---------------------------------------------------------------------------
// Where "Finish" sends the player. Paste the Prolific completion link or the
// post-test questionnaire link here. Leave empty to show TEXT.finishedNoLink.
// ---------------------------------------------------------------------------
const STUDY_COMPLETION_URL = 'https://www.prolific.com/e';

const TEXT = {
  header: 'Final Debrief: Your Four Terms',
  dpmTitle: 'Four terms, four ideas of a good society',
  dpmBody:
    'You have governed under four different ideas of what makes a society succeed. Every term started from the same society. Here is what each one left behind, and how it was judged.',
  lensLabel: 'Score every society on:',
  ownLens: 'Each term’s own measure',
  lensHint: 'Switch the measure to see how the same four societies are judged by a different idea of success.',
  term: (n: number) => `Term ${n}`,
  start: 'Start',
  end: 'End',
  target: 'Target',
  approval: 'Approval',
  reElected: 'Re-elected',
  notReElected: 'Not re-elected',
  highest: 'Highest of the four',
  showMeasured: 'What this measured',
  hideMeasured: 'Hide',
  principle: 'Governing principle',
  finish: 'Finish',
  finishing: 'Opening the next part of the study…',
  finishedTitle: 'Thank you for playing',
  finishedNoLink: 'You have finished the game. Please return to the study to continue.',
  celebrate: 'Celebrate',
};

const histogram = (pop: Respondent[]) =>
  Array.from({ length: 11 }, (_, i) => ({ name: i, count: pop.filter((r) => Math.round(r.currentLS) === i).length }));

const fmt = (n: number) => n.toFixed(2);
const fmtPct = (n: number) => (n.toFixed(1) === '100.0' ? '100' : n.toFixed(1));

export default function FinalDebriefModal() {
  const { completedRuns } = useGame();
  const [confettiKey, setConfettiKey] = useState(0);
  const [lens, setLens] = useState<ElectionCycle | null>(null);
  const [openDefs, setOpenDefs] = useState<Record<number, boolean>>({});
  const [finished, setFinished] = useState(false);
  const dwell = useDwellTimer();

  useEffect(() => {
    track('final_debrief_opened', {});
    dwell.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Every term starts from the same baseline society.
  const baseline = useMemo(() => loadPopulation(), []);
  const baselineHist = useMemo(() => histogram(baseline), [baseline]);
  const runs = useMemo(() => [...completedRuns].sort((a, b) => a.cycle - b.cycle), [completedRuns]);

  // Same y-axis on every chart so the societies can be compared by eye.
  const yAxisMax = useMemo(() => {
    let max = Math.max(...baselineHist.map((d) => d.count), 0);
    runs.forEach((r) => { max = Math.max(max, ...histogram(r.finalPopulation).map((d) => d.count)); });
    return Math.max(100, Math.ceil(max / 20) * 20);
  }, [baselineHist, runs]);

  // Scores under the selected lens, and which society comes out highest.
  const lensScores = useMemo(() => {
    if (lens === null) return null;
    const scores = runs.map((r) => MetricsEngine.getMetricScore(r.finalPopulation, lens));
    const best = Math.max(...scores);
    return {
      start: MetricsEngine.getMetricScore(baseline, lens),
      scores,
      isBest: scores.map((s) => fmt(s) === fmt(best)),
    };
  }, [lens, runs, baseline]);

  const handleLens = (next: ElectionCycle | null) => {
    setLens(next);
    track('final_debrief_lens_changed', { lens: next === null ? 'own' : ElectionCycle[next] });
  };

  const toggleDef = (cycle: ElectionCycle) => {
    const open = !openDefs[cycle];
    setOpenDefs((prev) => ({ ...prev, [cycle]: open }));
    track('final_debrief_definition_toggled', { cycle: ElectionCycle[cycle], open });
  };

  const handleFinish = () => {
    if (finished) return;
    // This event is what marks the participant as completed on the server.
    track('final_debrief_closed', { dwell_ms: dwell.stop() });
    setFinished(true);
    if (STUDY_COMPLETION_URL) {
      // Short pause so the completion ping is sent before the page changes.
      setTimeout(() => { window.location.href = STUDY_COMPLETION_URL; }, 1500);
    }
  };

  const lensRule = lens !== null ? FRAMEWORK_RULES[lens] : null;

  return (
    <ModalContent maxWidth="max-w-6xl">
      <OmniConfetti triggerKey={confettiKey} />
      <ModalHeader title={TEXT.header} />
      <DPMMessage title={TEXT.dpmTitle}>{TEXT.dpmBody}</DPMMessage>

      {/* Lens switch */}
      <div className="flex flex-col gap-2 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-zinc-700 mr-1">{TEXT.lensLabel}</span>
          <button
            type="button"
            onClick={() => handleLens(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
              lens === null ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
            }`}
          >
            {TEXT.ownLens}
          </button>
          {runs.map((r) => {
            const rule = FRAMEWORK_RULES[r.cycle];
            const on = lens === r.cycle;
            return (
              <button
                key={r.cycle}
                type="button"
                onClick={() => handleLens(r.cycle)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  on ? 'text-white' : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100'
                }`}
                style={on ? { backgroundColor: rule.graphColor, borderColor: rule.graphColor } : undefined}
              >
                {!on && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: rule.graphColor }} />}
                {rule.targetMetricName}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-zinc-500">{TEXT.lensHint}</p>
      </div>

      {/* One card per term */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0">
        {runs.map((run, i) => {
          const profile = getPMProfile(run.cycle);
          const rule = FRAMEWORK_RULES[run.cycle];
          const won = run.approvalRating >= 51;
          const startOwn = MetricsEngine.getMetricScore(baseline, run.cycle);
          const shownRule = lensRule ?? rule;
          const shownStart = lensScores ? lensScores.start : startOwn;
          const shownEnd = lensScores ? lensScores.scores[i] : run.finalScore;
          const defOpen = !!openDefs[run.cycle];
          return (
            <div key={run.cycle} className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-4 flex flex-col gap-3">
              {/* Who */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-2xl shrink-0"
                  style={{ backgroundColor: `${profile.color}22` }}>{profile.emoji}</div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-zinc-400">{TEXT.term(i + 1)}</span>
                  <h3 className="font-black text-zinc-900 leading-tight truncate">{profile.name}</h3>
                  <span className={`text-xs font-bold ${profile.colorClass}`}>{profile.philosophy}</span>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${won ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {won ? TEXT.reElected : TEXT.notReElected}
                </span>
              </div>

              {/* Before and after */}
              <div className="grid grid-cols-2 gap-2">
                {[{ label: TEXT.start, hist: baselineHist, color: '#a1a1aa' },
                  { label: TEXT.end, hist: histogram(run.finalPopulation), color: rule.graphColor }].map((c) => (
                  <div key={c.label} className="bg-zinc-50 rounded-lg border border-zinc-200 p-1.5 pt-5 relative h-[150px]">
                    <span className="absolute top-1 left-2 text-[11px] font-bold text-zinc-500 z-10">{c.label}</span>
                    <D3Chart plotType="1D" chartData={[]} histogramData={c.hist}
                      xAxisType={AxisVariable.LifeSatisfaction} yAxisType={AxisVariable.LifeSatisfaction}
                      color={c.color} visualStyle="solid" yAxisMax={yAxisMax} />
                  </div>
                ))}
              </div>

              {/* Score */}
              <div className="rounded-lg border p-3 flex flex-wrap items-center gap-x-5 gap-y-1"
                style={{ borderColor: `${shownRule.graphColor}55`, backgroundColor: `${shownRule.graphColor}0d` }}>
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold" style={{ color: shownRule.graphColor }}>
                    {shownRule.targetMetricName} ({shownRule.targetMetricAbbreviation})
                  </span>
                  <span className="text-lg font-black text-zinc-900 tabular-nums">
                    {fmt(shownStart)} <span className="text-zinc-400 font-bold">→</span> {fmt(shownEnd)}
                  </span>
                </div>
                {lensScores ? (
                  lensScores.isBest[i] && (
                    <span className="text-xs font-bold px-2 py-1 rounded-full text-white" style={{ backgroundColor: shownRule.graphColor }}>
                      {TEXT.highest}
                    </span>
                  )
                ) : (
                  <>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-zinc-400">{TEXT.target}</span>
                      <span className="text-sm font-black text-zinc-700 tabular-nums">{fmt(run.targetScore)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-zinc-400">{TEXT.approval}</span>
                      <span className={`text-sm font-black tabular-nums ${won ? 'text-emerald-600' : 'text-rose-600'}`}>{fmtPct(run.approvalRating)}%</span>
                    </div>
                  </>
                )}
              </div>

              {/* Reminder of what this term measured */}
              <button type="button" onClick={() => toggleDef(run.cycle)}
                className="self-start text-xs font-bold text-zinc-500 hover:text-zinc-800 underline underline-offset-2 cursor-pointer">
                {defOpen ? TEXT.hideMeasured : TEXT.showMeasured}
              </button>
              <AnimatePresence>
                {defOpen && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden">
                    <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-3 flex flex-col gap-2 text-sm text-zinc-700 leading-relaxed">
                      <p><strong className="text-zinc-900">{rule.targetMetricName}:</strong> {rule.targetMetricDescription}</p>
                      <p><strong className="text-zinc-900">{TEXT.principle}:</strong> <span className="italic">“{profile.governance}”</span></p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Finish */}
      <AnimatePresence mode="wait">
        {!finished ? (
          <motion.div key="finish" exit={{ opacity: 0 }} className="flex justify-end shrink-0">
            <button type="button" onClick={handleFinish}
              className="px-10 py-3 bg-pink-600 text-white font-bold rounded-xl hover:bg-pink-700 transition-colors shadow-md cursor-pointer">
              {TEXT.finish}
            </button>
          </motion.div>
        ) : (
          <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="p-5 bg-zinc-900 rounded-xl flex items-center justify-between gap-4 text-white shadow-xl shrink-0">
            <div>
              <h3 className="text-base font-bold mb-1 text-emerald-400">✓ {TEXT.finishedTitle}</h3>
              <p className="text-zinc-300 text-sm">{STUDY_COMPLETION_URL ? TEXT.finishing : TEXT.finishedNoLink}</p>
            </div>
            <button type="button"
              onClick={() => { track('final_debrief_celebrate_clicked', {}); setConfettiKey((k) => k + 1); }}
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0">
              <span className="text-base">🎉</span> {TEXT.celebrate}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </ModalContent>
  );
}