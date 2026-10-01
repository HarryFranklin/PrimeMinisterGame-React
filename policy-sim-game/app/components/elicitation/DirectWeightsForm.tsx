import React, { useRef, useState } from 'react';
import { DIRECT_ANCHOR } from '../../utils/ElicitationEngine';
import { DIRECT_FORM as T } from './elicitationText';

const STEPS = ['4 to 6', '6 to 8', '8 to 10'];

interface DirectWeightsFormProps {
  onSubmit: (weights: number[], dwellMs: number) => void;
}

/** Layard & Oparina's direct question, in 2-point steps: 2->4 is fixed at
 * 100 and each remaining step must be set before continuing. */
export default function DirectWeightsForm({ onSubmit }: DirectWeightsFormProps) {
  const [values, setValues] = useState<number[]>([0, 0, 0]);
  const [touched, setTouched] = useState<boolean[]>([false, false, false]);
  // What is shown in each number box (kept as text so it can be empty while typing).
  const [drafts, setDrafts] = useState<string[]>(['', '', '']);
  const openedAt = useRef(Date.now());
  const ready = touched.every(Boolean);

  const setAt = <V,>(arr: V[], i: number, v: V) => arr.map((p, j) => (j === i ? v : p));

  /** Slider moved: update the value and the box. */
  const set = (i: number, v: number) => {
    setValues((prev) => setAt(prev, i, v));
    setTouched((prev) => setAt(prev, i, true));
    setDrafts((prev) => setAt(prev, i, String(v)));
  };

  /** Box typed in: update the slider. An empty box doesn't count as answered. */
  const type = (i: number, text: string) => {
    if (!/^\d{0,3}$/.test(text)) return;
    setDrafts((prev) => setAt(prev, i, text));
    if (text === '') {
      setTouched((prev) => setAt(prev, i, false));
      return;
    }
    const v = Math.min(100, Number(text));
    setValues((prev) => setAt(prev, i, v));
    setTouched((prev) => setAt(prev, i, true));
  };

  /** On leaving the box, tidy it to the value actually used (e.g. 150 -> 100). */
  const tidy = (i: number) => {
    if (drafts[i] !== '') setDrafts((prev) => setAt(prev, i, String(values[i])));
  };

  const row = (label: string, content: React.ReactNode, value: React.ReactNode) => (
    <div key={label} className="grid grid-cols-[5.5rem_1fr_4.5rem] items-center gap-4 py-3 border-b border-zinc-800 last:border-b-0">
      <span className="text-sm font-bold text-zinc-200">From {label}</span>
      {content}
      <div className="text-right text-lg font-black tabular-nums text-white">{value}</div>
    </div>
  );

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col gap-5">
      <div>
        <span className="text-sm font-bold text-pink-500">{T.kicker}</span>
        <h1 className="text-2xl md:text-3xl font-black text-white mt-1">{T.title}</h1>
      </div>
      <p className="text-base text-zinc-300 leading-relaxed">{T.intro}</p>
      <p className="text-base text-zinc-300 leading-relaxed">{T.guide}</p>

      <div className="rounded-xl bg-zinc-950/60 border border-zinc-800 px-4">
        {row(
          '2 to 4',
          <div className="flex flex-col gap-1">
            <div className="h-2 rounded-full bg-pink-600/70" />
            <span className="text-xs text-zinc-500">{T.fixedNote}</span>
          </div>,
          <span className="block w-full border border-zinc-800 rounded-lg px-2 py-1.5">{DIRECT_ANCHOR}</span>,
        )}
        {STEPS.map((label, i) =>
          row(
            label,
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={values[i]}
              aria-label={`Importance of helping someone move from ${label}`}
              onChange={(e) => set(i, Number(e.target.value))}
              onPointerDown={() => set(i, values[i])}
              className="w-full accent-pink-500 cursor-pointer"
            />,
            <input
              type="text"
              inputMode="numeric"
              value={drafts[i]}
              placeholder="0–100"
              aria-label={`Importance of helping someone move from ${label}, typed`}
              onChange={(e) => type(i, e.target.value)}
              onBlur={() => tidy(i)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-right text-lg font-black tabular-nums text-white placeholder:text-xs placeholder:font-bold placeholder:text-zinc-600 focus:outline-none focus:border-pink-500"
            />,
          ),
        )}
        <div className="flex justify-between text-xs text-zinc-500 pb-3 pl-[6.5rem] pr-[5rem]">
          <span>{T.lowLabel}</span>
          <span>{T.highLabel}</span>
        </div>
      </div>

      <button
        type="button"
        disabled={!ready}
        onClick={() => onSubmit(values, Date.now() - openedAt.current)}
        className={`self-end px-8 py-3 rounded-xl font-black transition-colors ${
          ready ? 'bg-pink-600 hover:bg-pink-500 text-white cursor-pointer' : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
        }`}
      >
        {ready ? T.button : T.waiting}
      </button>
    </div>
  );
}