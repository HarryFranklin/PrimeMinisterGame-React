'use client';
import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameStateContext';
import { ElectionCycle, GamePhase } from '../utils/types';
import { FRAMEWORK_RULES } from '../utils/frameworkRules';
import { getPMProfile } from '../utils/pmProfiles';
import { PM_TONES } from './desk/deskTheme';
import { JUDGED } from './paper/RunnersAndRiders';
import { OPTIONS_KEY, DEFAULT_OPTIONS, loadOptions, applyFlashSetting, type Options } from '../utils/gameOptions';
import { safeSetItem } from '@study';
import { track } from '../client/telemetry';
import { isFullscreen, enterFullscreen } from '../client/fullscreen';

/**
 * Pause menu: "Parliament in recess". Esc (or the small button) during a term.
 * In full screen the browser keeps Esc for itself (it leaves full screen), so leaving
 * full screen during a term opens the menu too, and Resume goes back into full screen.
 * Resume, Options (same as the front page), and "Your term": what you're judged on,
 * the score now against the target, the day, and how a day works.
 *
 * Telemetry: pause_opened {cycle, turn, via}, pause_closed {cycle, turn, dwell_ms, via, tab},
 * pause_option_changed {option, value}. Time paused is summed per term in cycleSummary.
 */

const STAGE_W = 1440;
const STAGE_H = 900;
const subscribeResize = (cb: () => void) => {
  window.addEventListener('resize', cb);
  return () => window.removeEventListener('resize', cb);
};
const getViewW = () => window.innerWidth;
const getViewH = () => window.innerHeight;

const STEPS = [
  { head: 'Read the bills', body: 'Open each bill in the in-tray. The chart shows who gains and who loses, and what it would do to your measure.' },
  { head: 'Sign one', body: 'Sign the bill you think does most for what you’re judged on. You can put a bill back before you sign.' },
  { head: 'Continue', body: 'Move on to the next day. The country changes, and the polls update overnight.' },
];

type Tab = 'term' | 'options';

function Toggle<T extends string>({ label, value, choices, onChange }: { label: string; value: T; choices: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex items-center justify-between gap-6 border-t border-stone-400 pt-3">
      <span className="text-[16px] font-bold">{label}</span>
      <div className="flex border-2 border-stone-900">
        {choices.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange(c.value)}
            className={`px-3.5 py-1.5 text-[13px] font-bold transition-colors ${value === c.value ? 'bg-stone-900 text-[#f4efe3]' : 'bg-transparent text-stone-700 hover:bg-stone-900/10'}`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PauseMenu() {
  const { gamePhase, currentCycle, currentTurn, TURNS_PER_CYCLE, turnMetricScore, cycleMAO, isParliamentDissolved } = useGame();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('term');
  const [options, setOptions] = useState<Options>(DEFAULT_OPTIONS);
  const openedAt = useRef(0);
  const openedVia = useRef('');
  const active = gamePhase === GamePhase.Playing;

  const viewW = useSyncExternalStore(subscribeResize, getViewW, () => STAGE_W);
  const viewH = useSyncExternalStore(subscribeResize, getViewH, () => STAGE_H);
  const scale = Math.min(viewW / STAGE_W, viewH / STAGE_H);

  const cycleName = ElectionCycle[currentCycle];
  const rule = FRAMEWORK_RULES[currentCycle];
  const tone = PM_TONES[currentCycle];
  const name = getPMProfile(currentCycle).name.replace(/^PM\s+/, '');
  const target = cycleMAO * rule.winThresholdScalar;

  const show = useCallback((via: string) => {
    openedAt.current = Date.now();
    openedVia.current = via;
    setOptions(loadOptions());
    setTab('term');
    setOpen(true);
    track('pause_opened', { cycle: cycleName, turn: currentTurn, via });
  }, [cycleName, currentTurn]);

  const hide = useCallback((via: string) => {
    track('pause_closed', { cycle: cycleName, turn: currentTurn, dwell_ms: Date.now() - openedAt.current, via, tab });
    setOpen(false);
  }, [cycleName, currentTurn, tab]);

  // Esc toggles the menu during a term
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.repeat) return;
      e.preventDefault();
      if (open) hide('escape');
      else show('escape');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, open, show, hide]);

  // Esc in full screen: the browser leaves full screen instead of passing the key on.
  const wasFullscreen = useRef(false);
  const leftFullscreen = useRef(false);
  useEffect(() => {
    wasFullscreen.current = isFullscreen();
    const onChange = () => {
      const fs = isFullscreen();
      if (!fs && wasFullscreen.current && active && !open) {
        leftFullscreen.current = true;
        show('fullscreen_exit');
      }
      wasFullscreen.current = fs;
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, [active, open, show]);

  const resume = () => {
    hide('resume');
    // Back into full screen if Esc took them out of it (a click is allowed to)
    if (leftFullscreen.current) {
      leftFullscreen.current = false;
      enterFullscreen('resume');
    }
  };

  // Leaving the term (e.g. Face the Electorate) closes it
  useEffect(() => {
    if (!active && open) {
      const t = setTimeout(() => hide('phase_change'), 0);
      return () => clearTimeout(t);
    }
  }, [active, open, hide]);

  const changeOption = <K extends keyof Options>(key: K, value: Options[K]) => {
    const next = { ...options, [key]: value };
    setOptions(next);
    safeSetItem(OPTIONS_KEY, JSON.stringify(next));
    applyFlashSetting();
    track('pause_option_changed', { option: key, value });
  };

  if (!active) return null;

  return (
    <>
      {/* A small way in, for anyone who doesn't know about Esc */}
      {!open && (
        <button
          type="button"
          onClick={() => show('button')}
          className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[60] rounded-md border border-white/25 bg-black/45 px-2.5 py-1 text-[11px] font-bold tracking-[.08em] text-white/75 hover:bg-black/70 hover:text-white"
        >
          Esc · Pause
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            key="recess"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[9000] bg-[rgba(10,8,6,.55)] backdrop-blur-[4px]"
            onClick={() => hide('backdrop')}
          >
            <div className="absolute left-1/2 top-1/2" style={{ width: STAGE_W, height: STAGE_H, transform: `translate(-50%, -50%) scale(${scale})` }}>
              <motion.div
                initial={{ y: 40, rotate: 2, opacity: 0 }}
                animate={{ y: 0, rotate: -0.6, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.2, 0.8, 0.25, 1] }}
                className="paper-page"
                style={{ left: 230, top: 50, width: 980, height: 800, padding: '26px 34px', gap: 14, boxShadow: '0 30px 60px rgba(0,0,0,.6)' }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-label="Paused"
              >
                {/* The order paper */}
                <div className="shrink-0 flex flex-col items-center gap-0.5 border-b-4 border-double border-stone-900 pb-2">
                  <div className="w-full flex justify-between paper-cap"><span>House of Commons · order paper</span><span>Press Esc to resume</span></div>
                  <span className="font-display font-black text-[54px] leading-none">Parliament in recess</span>
                  <span className="font-display italic font-bold text-[16px] text-stone-600">The country waits. Nothing moves until you return.</span>
                </div>

                <div className="grid grid-cols-[250px_1fr] gap-[26px] flex-1 min-h-0">
                  {/* What you can do */}
                  <div className="flex flex-col gap-2.5">
                    <button type="button" onClick={resume} className="paper-btn text-left bg-stone-900 text-[#f4efe3] px-4 py-[18px] font-display font-black text-[28px]">Resume ▸</button>
                    {(['term', 'options'] as Tab[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTab(t)}
                        className="paper-btn text-left border-2 border-stone-900 px-4 py-3.5 font-display font-black text-[22px]"
                        style={{ background: tab === t ? '#1c1917' : 'transparent', color: tab === t ? '#f4efe3' : '#1c1917' }}
                      >
                        {t === 'term' ? 'Your term' : 'Options'}
                      </button>
                    ))}
                    <span className="mt-auto text-[13px] text-stone-600">Your progress is saved. The term carries on where you left it.</span>
                  </div>

                  {tab === 'term' ? (
                    <div className="flex flex-col gap-3.5 border-l border-stone-900 pl-[26px] min-h-0">
                      {/* What you're judged on */}
                      <div className="grid grid-cols-[1fr_auto] gap-4 border-2 px-4 py-3.5" style={{ borderColor: tone.dark }}>
                        <div className="flex flex-col gap-1">
                          <span className="paper-cap" style={{ color: tone.dark }}>{name} is judged on</span>
                          <span className="font-display font-black text-[26px] leading-[1.05]">{rule.targetMetricName} ({rule.targetMetricAbbreviation})</span>
                          <span className="text-[15px] leading-snug">{JUDGED[currentCycle].blurb}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1 min-w-[150px]">
                          <span className="paper-cap text-stone-500">Now</span>
                          <span className="font-display font-black text-[30px] leading-none tabular-nums">{turnMetricScore.toFixed(2)}</span>
                          <span className="paper-cap text-stone-500 mt-1">Target</span>
                          <span className="font-display font-black text-[22px] leading-none tabular-nums">{target.toFixed(2)}</span>
                          <span className="paper-cap text-stone-500 mt-1">{isParliamentDissolved ? 'Polling day' : `Day ${currentTurn} of ${TURNS_PER_CYCLE}`}</span>
                        </div>
                      </div>
                      {/* How a day works */}
                      <span className="paper-cap">How a day works</span>
                      <div className="grid grid-cols-3 gap-3.5">
                        {STEPS.map((s, i) => (
                          <div key={s.head} className="border-t-[3px] border-stone-900 pt-2 flex flex-col gap-1.5">
                            <span className="font-display font-black text-[34px] leading-none" style={{ color: tone.dark }}>{i + 1}</span>
                            <span className="font-display font-black text-[19px] leading-tight">{s.head}</span>
                            <span className="text-[14px] leading-snug">{s.body}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 border-l border-stone-900 pl-[26px]">
                      <span className="font-display font-black text-[30px]">Options</span>
                      <Toggle
                        label="Text speed"
                        value={options.textSpeed}
                        choices={[{ value: 'normal', label: 'Normal' }, { value: 'fast', label: 'Fast' }, { value: 'instant', label: 'Instant' }]}
                        onChange={(v) => changeOption('textSpeed', v)}
                      />
                      <Toggle
                        label="Sound"
                        value={options.sound}
                        choices={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]}
                        onChange={(v) => changeOption('sound', v)}
                      />
                      <Toggle
                        label="Camera flashes"
                        value={options.flashes}
                        choices={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]}
                        onChange={(v) => changeOption('flashes', v)}
                      />
                      <p className="m-0 -mt-1.5 text-[13px] text-stone-600">Turn off if flashing lights affect you. Off also swaps the flashes before election night for a time skip.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}