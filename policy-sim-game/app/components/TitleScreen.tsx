'use client';
import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameStateContext';
import { GamePhase } from '../utils/types';
import { PM_PROFILES } from '../utils/pmProfiles';
import { track } from '../client/telemetry';
import { safeSetItem } from '@study';
import { enterFullscreen } from '../client/fullscreen';

/**
 * Start menu: "Prime Minister Game" with Start game / What's this game about? /
 * Options. Shown after the loading screen; "Start game" fades to black and
 * opens the welcome briefing.
 *
 * Telemetry (all outside term attempts, so on the session timeline):
 *   title_screen_shown, title_panel_opened / title_panel_closed {panel, dwell_ms},
 *   title_option_changed {option, value}, title_start_clicked {ms_on_title, …}
 *
 * Options are placeholders for now: they are saved and tracked but do not yet
 * change the game.
 */

const OPTIONS_KEY = 'game_options_v1';
type Options = { textSpeed: 'normal' | 'fast' | 'instant'; sound: 'on' | 'off' };
const DEFAULT_OPTIONS: Options = { textSpeed: 'normal', sound: 'on' };

const TEXT = {
  title: 'Prime Minister',
  subtitle: 'Game',
  start: 'Start game',
  about: 'What’s this game about?',
  options: 'Options',
  aboutTitle: 'What’s this game about?',
  aboutBody: [
    'You will serve as four different Prime Ministers, one after another. Each one is judged by a different way of measuring how well the country is doing.',
    'Each term lasts five turns. Every turn, you choose one policy from your agenda and see how it changes people’s lives across the country.',
    'At the end of each term, the public give their verdict at an election. Win, and the next Prime Minister steps up. Lose, and you can try the term again.',
    'There are no trick questions – just make the best decisions you can.',
  ],
  close: 'Close',
};

function loadOptions(): Options {
  try {
    return { ...DEFAULT_OPTIONS, ...JSON.parse(localStorage.getItem(OPTIONS_KEY) || '{}') };
  } catch {
    return DEFAULT_OPTIONS;
  }
}

function Choice<T extends string>({ label, value, choices, onChange }: { label: string; value: T; choices: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="text-sm font-bold text-zinc-200">{label}</span>
      <div className="flex rounded-lg border border-zinc-700 overflow-hidden">
        {choices.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => onChange(c.value)}
            className={`px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${value === c.value ? 'bg-pink-600 text-white' : 'bg-zinc-900 text-zinc-400 hover:text-white'}`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** onStart: called after the fade to black (the page puts up its curtain and
 * moves on to the welcome briefing). */
export default function TitleScreen({ onStart }: { onStart?: () => void }) {
  const { setGamePhase } = useGame();
  const [panel, setPanel] = useState<'about' | 'options' | null>(null);
  const [options, setOptions] = useState<Options>(DEFAULT_OPTIONS);
  const [leaving, setLeaving] = useState(false);
  const shownAt = useRef(Date.now());
  const panelOpenedAt = useRef(0);
  const opened = useRef({ about: 0, options: 0 });

  useEffect(() => {
    shownAt.current = Date.now();
    setOptions(loadOptions());
    track('title_screen_shown', {});
  }, []);

  const openPanel = (p: 'about' | 'options') => {
    panelOpenedAt.current = Date.now();
    opened.current[p] += 1;
    setPanel(p);
    track('title_panel_opened', { panel: p });
  };
  const closePanel = () => {
    if (panel) track('title_panel_closed', { panel, dwell_ms: Date.now() - panelOpenedAt.current });
    setPanel(null);
  };

  const changeOption = <K extends keyof Options>(key: K, value: Options[K]) => {
    const next = { ...options, [key]: value };
    setOptions(next);
    safeSetItem(OPTIONS_KEY, JSON.stringify(next));
    track('title_option_changed', { option: key, value });
  };

  const start = () => {
    if (leaving) return;
    // Must happen inside the click: browsers only allow fullscreen then.
    enterFullscreen('start');
    track('title_start_clicked', {
      ms_on_title: Date.now() - shownAt.current,
      about_opens: opened.current.about,
      options_opens: opened.current.options,
      text_speed: options.textSpeed,
      sound: options.sound,
    });
    setLeaving(true);
    // Fade to black, then the welcome briefing.
    setTimeout(() => (onStart ? onStart() : setGamePhase(GamePhase.Intro)), 900);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black text-white overflow-hidden select-none">
      {/* Slow glow in the four Prime Ministers' colours */}
      <div className="absolute inset-0 opacity-40">
        {PM_PROFILES.map((pm, i) => (
          <motion.div
            key={pm.name}
            className="absolute w-[45vw] h-[45vw] rounded-full blur-3xl"
            style={{ backgroundColor: pm.color, left: `${[5, 55, 10, 50][i]}%`, top: `${[5, 0, 50, 45][i]}%` }}
            animate={{ x: [0, 30, -20, 0], y: [0, -20, 25, 0], opacity: [0.35, 0.6, 0.4, 0.35] }}
            transition={{ duration: 14 + i * 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/60 to-black" />

      <motion.div
        className="relative h-full flex flex-col items-center justify-center gap-12 px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: leaving ? 0 : 1 }}
        transition={{ duration: leaving ? 0.8 : 1 }}
      >
        <div className="text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.9, ease: 'easeOut' }}
            className="flex justify-center gap-3 text-4xl mb-6"
          >
            {PM_PROFILES.map((pm) => <span key={pm.name}>{pm.emoji}</span>)}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.9, ease: 'easeOut' }}
            className="text-6xl md:text-8xl font-black tracking-tight"
          >
            {TEXT.title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, letterSpacing: '1em' }}
            animate={{ opacity: 1, letterSpacing: '0.5em' }}
            transition={{ delay: 0.9, duration: 1 }}
            className="mt-3 text-lg md:text-xl font-black uppercase text-pink-500"
          >
            {TEXT.subtitle}
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          className="flex flex-col items-center gap-3 w-72"
        >
          <button
            type="button"
            onClick={start}
            className="w-full py-4 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-lg font-black uppercase tracking-widest shadow-[0_0_40px_rgba(236,72,153,0.45)] transition-colors cursor-pointer"
          >
            {TEXT.start}
          </button>
          <button type="button" onClick={() => openPanel('about')} className="w-full py-3 rounded-xl border border-zinc-700 bg-zinc-900/70 hover:bg-zinc-800 text-sm font-bold text-zinc-200 transition-colors cursor-pointer">
            {TEXT.about}
          </button>
          <button type="button" onClick={() => openPanel('options')} className="w-full py-3 rounded-xl border border-zinc-700 bg-zinc-900/70 hover:bg-zinc-800 text-sm font-bold text-zinc-200 transition-colors cursor-pointer">
            {TEXT.options}
          </button>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {panel && (
          <motion.div
            key="panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 bg-black/60 backdrop-blur-md flex items-center justify-center p-6"
            onClick={closePanel}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-7 flex flex-col gap-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {panel === 'about' ? (
                <>
                  <h2 className="text-2xl font-black">{TEXT.aboutTitle}</h2>
                  <div className="flex flex-col gap-3 text-zinc-300 leading-relaxed">
                    {TEXT.aboutBody.map((p) => <p key={p}>{p}</p>)}
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-black">{TEXT.options}</h2>
                  <Choice
                    label="Text speed"
                    value={options.textSpeed}
                    choices={[{ value: 'normal', label: 'Normal' }, { value: 'fast', label: 'Fast' }, { value: 'instant', label: 'Instant' }]}
                    onChange={(v) => changeOption('textSpeed', v)}
                  />
                  <Choice
                    label="Sound"
                    value={options.sound}
                    choices={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]}
                    onChange={(v) => changeOption('sound', v)}
                  />
                </>
              )}
              <button type="button" onClick={closePanel} className="self-end px-5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-bold cursor-pointer">
                {TEXT.close}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fade to black on Start */}
      <motion.div className="absolute inset-0 bg-black pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: leaving ? 1 : 0 }} transition={{ duration: 0.8 }} />
    </div>
  );
}
