'use client';
import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../context/GameStateContext';
import { GamePhase } from '../utils/types';
import { PM_PROFILES } from '../utils/pmProfiles';
import { track } from '../client/telemetry';
import { safeSetItem } from '@study';
import { enterFullscreen, isFullscreen } from '../client/fullscreen';
import FullscreenButton from './FullscreenButton';
import { OPTIONS_KEY, DEFAULT_OPTIONS, loadOptions, applyFlashSetting, type Options } from '../utils/gameOptions';
import PMFigure from './modals/ElectionModal/PMFigure';
import { PM_TONES } from './desk/deskTheme';

/**
 * Start menu: the front page of The Daily Ledger, "Prime Minister Game", with the
 * four candidates and three boxes: Start game / What's this game about? / Options.
 * Hovering a box turns it black (the active one). Shown after the loading screen;
 * "Start game" turns the paper over (its back cover is the level select), fades to
 * black and opens the welcome briefing.
 *
 * Telemetry (all outside term attempts, so on the session timeline):
 *   title_screen_shown, title_panel_opened / title_panel_closed {panel, dwell_ms},
 *   title_option_changed {option, value}, title_start_clicked {ms_on_title, …}
 *
 * Options are saved and tracked (utils/gameOptions.ts). Text speed and sound are
 * placeholders for now; "Camera flashes" turns off the press conference flashes
 * and the flash into election night (also off if the device asks for reduced motion).
 */

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
  close: 'Close ✕',
};

// The page sits on a 1440 × 900 desk, scaled to fit the screen
const STAGE_W = 1440;
const STAGE_H = 900;
const subscribeResize = (cb: () => void) => {
  window.addEventListener('resize', cb);
  return () => window.removeEventListener('resize', cb);
};
const getViewW = () => window.innerWidth;
const getViewH = () => window.innerHeight;

function Choice<T extends string>({ label, value, choices, onChange }: { label: string; value: T; choices: { value: T; label: string }[]; onChange: (v: T) => void }) {
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

/** onStart: called after the paper turns over and the screen fades to black (the page
 * puts up its curtain and moves on to the welcome briefing). */
export default function TitleScreen({ onStart }: { onStart?: () => void }) {
  const { setGamePhase } = useGame();
  const [panel, setPanel] = useState<'about' | 'options' | null>(null);
  const [options, setOptions] = useState<Options>(DEFAULT_OPTIONS);
  const [leaving, setLeaving] = useState(false);
  const shownAt = useRef(Date.now());
  const panelOpenedAt = useRef(0);
  const opened = useRef({ about: 0, options: 0 });

  const viewW = useSyncExternalStore(subscribeResize, getViewW, () => STAGE_W);
  const viewH = useSyncExternalStore(subscribeResize, getViewH, () => STAGE_H);
  const scale = Math.min(viewW / STAGE_W, viewH / STAGE_H);

  useEffect(() => {
    shownAt.current = Date.now();
    setOptions(loadOptions());
    applyFlashSetting();
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
    applyFlashSetting();
    track('title_option_changed', { option: key, value });
  };

  const start = () => {
    if (leaving) return;
    // Before the request below (which is async): did they already go full screen here?
    const alreadyFullscreen = isFullscreen();
    // Must happen inside the click: browsers only allow fullscreen then.
    // Does nothing (and logs nothing) if they're already in fullscreen.
    enterFullscreen('start');
    track('title_start_clicked', {
      ms_on_title: Date.now() - shownAt.current,
      about_opens: opened.current.about,
      options_opens: opened.current.options,
      text_speed: options.textSpeed,
      sound: options.sound,
      flashes: options.flashes,
      already_fullscreen: alreadyFullscreen,
    });
    setLeaving(true);
    // Turn the paper over, fade to black, then the welcome briefing (on the back cover).
    setTimeout(() => (onStart ? onStart() : setGamePhase(GamePhase.Intro)), 1300);
  };

  return (
    <div className="fixed inset-0 z-[80] overflow-hidden select-none desk-wood">
      <div
        className="absolute left-1/2 top-1/2"
        style={{ width: STAGE_W, height: STAGE_H, transform: `translate(-50%, -50%) scale(${scale})`, perspective: 2600 }}
      >
        {/* ── The front page ── */}
        <motion.article
          initial={{ opacity: 0, y: -30, rotate: -2 }}
          animate={leaving ? { rotateY: -90, x: -140, rotate: -1 } : { opacity: 1, y: 0, rotate: -1 }}
          transition={leaving ? { duration: 0.65, ease: [0.5, 0, 0.75, 0.4] } : { duration: 0.7, ease: [0.2, 0.8, 0.25, 1] }}
          className="paper-page"
          style={{ left: 340, top: 28, width: 760, height: 844, padding: '22px 32px 28px', transformOrigin: '0 50%', boxShadow: '0 30px 60px rgba(0,0,0,.5)' }}
        >
          <div className="shrink-0 flex flex-col items-center gap-1 border-b-4 border-double border-stone-900 pb-2">
            <div className="w-full flex justify-between paper-cap whitespace-nowrap"><span>Election special · final edition</span><span>Price: one vote</span></div>
            <span className="font-display font-black italic text-[52px] leading-none tracking-tight whitespace-nowrap">The Daily Ledger</span>
          </div>
          <h1 className="m-0 font-display font-black text-[76px] leading-[.9] text-center uppercase">{TEXT.title}<br />{TEXT.subtitle}</h1>
          <p className="m-0 font-display italic font-bold text-[18px] text-center text-stone-700">Four candidates. Four ways to judge a country. You will govern as each of them.</p>

          {/* The four candidates */}
          <div className="grid grid-cols-4 gap-3 border-t border-stone-900 pt-3">
            {PM_PROFILES.map((pm) => {
              const tone = PM_TONES[pm.cycle];
              return (
                <div key={pm.cycle} className="flex flex-col gap-1">
                  <div className="relative h-[220px] overflow-hidden" style={{ background: `linear-gradient(180deg, ${tone.color}, ${tone.dark})`, filter: 'saturate(.75) sepia(.12)' }}>
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(-45deg,rgba(255,255,255,.07)_0_10px,transparent_10px_20px)]" />
                    <div className="absolute left-1/2 top-[30px]" style={{ marginLeft: -(90 * 1.25) / 2 }}><PMFigure cycle={pm.cycle} scale={1.25} /></div>
                  </div>
                  <span className="font-display font-black text-[18px] leading-tight">{pm.name.replace(/^PM\s+/, '')}</span>
                  <span className="font-display italic text-[14px] text-stone-600">“{pm.slogan}”</span>
                </div>
              );
            })}
          </div>

          {/* Start / About / Options: black when hovered (the active one) */}
          <div className="mt-auto grid grid-cols-[1.3fr_1fr_1fr] gap-3 border-t border-stone-900 pt-3">
            <button type="button" onClick={start} className="title-box title-box-start text-left h-[136px] px-4 py-3.5 flex flex-col">
              <span className="paper-cap title-box-sub">Inside today</span>
              <span className="mt-auto font-display font-black text-[32px] leading-none">{TEXT.start}</span>
              <span className="title-box-sub text-[13px] mt-1">Turn over for the candidates ▸</span>
            </button>
            <button type="button" onClick={() => openPanel('about')} className="title-box text-left h-[136px] px-4 py-3.5 flex flex-col">
              <span className="paper-cap title-box-sub">Explainer</span>
              <span className="mt-auto font-display font-black text-[21px] leading-tight">{TEXT.about}</span>
              <span className="title-box-sub text-[13px] mt-1">Page 2 ▸</span>
            </button>
            <button type="button" onClick={() => openPanel('options')} className="title-box text-left h-[136px] px-4 py-3.5 flex flex-col">
              <span className="paper-cap title-box-sub">Small print</span>
              <span className="mt-auto font-display font-black text-[21px] leading-tight">{TEXT.options}</span>
              <span className="title-box-sub text-[13px] mt-1">Page 3 ▸</span>
            </button>
          </div>
        </motion.article>

        {/* ── About / Options: a cutting laid on top of the page ── */}
        <AnimatePresence>
          {panel && (
            <motion.div
              key="panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/45"
              onClick={closePanel}
            >
              <motion.div
                initial={{ y: 24, rotate: 1.5, opacity: 0 }}
                animate={{ y: 0, rotate: 0.6, opacity: 1 }}
                exit={{ y: 12, opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.2, 0.8, 0.25, 1] }}
                className="paper-page"
                style={{ left: 420, top: 150, width: 600, height: 'auto', padding: '24px 30px 26px', boxShadow: '0 30px 60px rgba(0,0,0,.55)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between border-b-2 border-stone-900 pb-1">
                  <span className="paper-cap">{panel === 'about' ? 'Explainer' : 'Small print'}</span>
                  <span className="paper-cap">{panel === 'about' ? 'Page 2' : 'Page 3'}</span>
                </div>
                {panel === 'about' ? (
                  <>
                    <h2 className="m-0 font-display font-black text-[36px] leading-none">{TEXT.aboutTitle}</h2>
                    <div className="flex flex-col gap-3 text-[16px] leading-relaxed">
                      {TEXT.aboutBody.map((p) => <p key={p} className="m-0">{p}</p>)}
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="m-0 font-display font-black text-[36px] leading-none">{TEXT.options}</h2>
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
                    <Choice
                      label="Camera flashes"
                      value={options.flashes}
                      choices={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]}
                      onChange={(v) => changeOption('flashes', v)}
                    />
                    <p className="m-0 -mt-1.5 text-[13px] text-stone-600">Turn off if flashing lights affect you. Off also swaps the flashes before election night for a time skip.</p>
                  </>
                )}
                <button type="button" onClick={closePanel} className="paper-btn self-end mt-1 px-5 py-2 border-2 border-stone-900 font-bold text-[14px]">
                  {TEXT.close}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fade to black once the paper has turned */}
      <motion.div className="absolute inset-0 bg-black pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: leaving ? 1 : 0 }} transition={{ duration: 0.6, delay: leaving ? 0.55 : 0 }} />
      {/* Same "Go full screen" button as in the game, so they can switch on a still screen */}
      {!leaving && <FullscreenButton source="title" />}
    </div>
  );
}