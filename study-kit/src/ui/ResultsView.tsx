'use client';
import React, { useEffect, useRef, useState } from 'react';
import { WORKER_URL } from '../config';
import { pagesFor, armText, type Condition, type Item, type Block, type Option } from '../content/questions';
import { getStudyState, getCell, setCell, syncStudy } from '../session';
import { BlockView, groupContent } from './Questionnaire';
import { Markup } from './Markup';
import { ACCENT, BTN_BASE, BTN_GHOST, type Accent } from './theme';

// ============================================================================
// "See my answers" – after the study, the knowledge questions from the final
// questionnaire again, on one page, marked, with a short explanation and the
// participant's score. Marking happens on the study server (GET /results), so
// the answers are never in the browser before someone has finished.
// ============================================================================

type Marks = Record<string, number | ''>;
interface ResultItem {
  id: string;
  type: string;
  given: unknown;
  correct: unknown;
  marks: Marks;
  score: number;
  max: number;
  measure: string | Record<string, string> | null;
  figures?: Record<string, { mean: number; floor: number; spread: number }>;
  explain: string | null;
}
interface Results {
  score: number;
  max: number;
  items: ResultItem[];
}

const MEASURE_LABEL: Record<string, string> = { mean: 'Average', floor: 'Floor (lowest score)', spread: 'Spread (standard deviation)' };

function Tick({ ok }: { ok: boolean }) {
  return <span className={`font-black ${ok ? 'text-emerald-400' : 'text-red-400'}`}>{ok ? '✓' : '✗'}</span>;
}

/** "Average: Society 1 = 7.24, Society 2 = 6.06" for the chart questions. */
function Figures({ item, options }: { item: ResultItem; options: Option[] }) {
  if (!item.figures) return null;
  const measures = typeof item.measure === 'string' ? [item.measure] : Object.values(item.measure ?? {});
  const label = (v: string) => options.find((o) => o.value === v)?.label ?? v;
  return (
    <div className="text-sm text-zinc-300 flex flex-col gap-0.5">
      {measures.map((m) => (
        <p key={m}>
          <span className="font-semibold text-zinc-100">{MEASURE_LABEL[m] ?? m}:</span>{' '}
          {Object.entries(item.figures!).map(([opt, f], i) => (
            <span key={opt}>{i > 0 && ', '}{label(opt)} = {m === 'mean' ? f.mean.toFixed(1) : m === 'floor' ? f.floor : f.spread.toFixed(1)}</span>
          ))}
        </p>
      ))}
    </div>
  );
}

function OptionRow({ label, chosen, isCorrect }: { label: string; chosen: boolean; isCorrect: boolean }) {
  const cls = isCorrect
    ? 'border-emerald-500/70 bg-emerald-500/10 text-zinc-100'
    : chosen
      ? 'border-red-500/70 bg-red-500/10 text-zinc-100'
      : 'border-zinc-800 bg-zinc-950 text-zinc-400';
  return (
    <div className={`rounded-lg border px-4 py-2 text-sm flex justify-between gap-3 ${cls}`}>
      <span>{label}</span>
      <span className="shrink-0 text-xs font-bold uppercase tracking-wider">
        {chosen && isCorrect && <span className="text-emerald-400">Your answer ✓</span>}
        {chosen && !isCorrect && <span className="text-red-400">Your answer ✗</span>}
        {!chosen && isCorrect && <span className="text-emerald-400">Correct answer</span>}
      </span>
    </div>
  );
}

function MarkedItem({ item, result, lead, condition, accent }: { item: Item & { num?: number }; result: ResultItem; lead: Block[]; condition: Condition; accent: Accent }) {
  const prompt = armText(item.prompt, condition);
  const allRight = result.score === result.max;
  let body: React.ReactNode = null;

  if (item.type === 'single') {
    body = (
      <div className="flex flex-col gap-1.5">
        {item.options.map((o) => <OptionRow key={o.value} label={o.label} chosen={result.given === o.value} isCorrect={result.correct === o.value} />)}
      </div>
    );
  } else if (item.type === 'multi') {
    const picked = Array.isArray(result.given) ? (result.given as string[]) : [];
    const right = Array.isArray(result.correct) ? (result.correct as string[]) : [];
    body = (
      <div className="flex flex-col gap-1.5">
        {item.options.map((o) => {
          const shouldTick = right.includes(o.value);
          const ticked = picked.includes(o.value);
          return (
            <div key={o.value} className={`rounded-lg border px-4 py-2 text-sm flex justify-between gap-3 ${shouldTick === ticked ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-red-500/60 bg-red-500/10'}`}>
              <span className="text-zinc-200">{ticked ? '☑' : '☐'}  {o.label}</span>
              <span className={`shrink-0 text-xs font-bold uppercase tracking-wider ${shouldTick ? 'text-emerald-400' : 'text-zinc-400'}`}>{shouldTick ? 'True' : 'Not true'}</span>
            </div>
          );
        })}
      </div>
    );
  } else if (item.type === 'grid') {
    const given = (result.given ?? {}) as Record<string, string>;
    const correct = (result.correct ?? {}) as Record<string, string>;
    const label = (v: string | undefined) => (v ? item.options.find((o) => o.value === v)?.label ?? v : '–');
    body = (
      <div className="flex flex-col gap-2">
        {item.rows.map((r) => {
          const ok = given[r.value] !== undefined && given[r.value] === correct[r.value];
          return (
            <div key={r.value} className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 text-sm flex flex-col gap-1">
              <p className="text-zinc-200">{armText(r.label, condition)}</p>
              <p className="text-zinc-300">
                <Tick ok={ok} /> Your answer: <span className="font-semibold text-zinc-100">{label(given[r.value])}</span>
                {!ok && <> · Correct answer: <span className="font-semibold text-emerald-400">{label(correct[r.value])}</span></>}
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  const options = 'options' in item ? item.options : [];
  return (
    <div className={`flex flex-col gap-3 rounded-xl p-4 border ${allRight ? 'border-emerald-600/40' : 'border-red-600/30'}`}>
      <div className="flex items-center justify-between gap-3">
        <p className={`text-base font-black ${ACCENT[accent].text}`}>Q{item.num}</p>
        <p className={`text-sm font-black ${allRight ? 'text-emerald-400' : result.score > 0 ? 'text-amber-400' : 'text-red-400'}`}>
          {result.score} / {result.max}
        </p>
      </div>
      {lead.map((b, i) => <BlockView key={i} block={b} condition={condition} />)}
      <div className="text-base font-semibold text-zinc-100 leading-snug"><Markup text={prompt} /></div>
      {body}
      {(result.explain || result.figures) && (
        <div className="rounded-lg bg-zinc-800/60 p-3 flex flex-col gap-1.5">
          <Figures item={result} options={options} />
          {result.explain && <p className="text-sm text-zinc-200 leading-relaxed">{result.explain}</p>}
        </div>
      )}
    </div>
  );
}

export function ResultsView({ condition, accent, onBack, prolificUrl }: { condition: Condition; accent: Accent; onBack: () => void; prolificUrl?: string }) {
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    topRef.current?.scrollIntoView({ block: 'start' });
    const s = getStudyState().session;
    if (!s) return;
    fetch(`${WORKER_URL}/results?${new URLSearchParams({ pid: s.pid, t: s.t })}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`results ${r.status}`))))
      .then((r: Results) => {
        setResults(r);
        // Note that they looked (and their score), saved with the final answers.
        const prev = getCell('posttest');
        if (prev && !prev.results_viewed_at) {
          setCell('posttest', { ...prev, results_viewed_at: Date.now(), results_score: r.score, results_max: r.max });
          syncStudy();
        }
      })
      .catch(() => setError('We couldn’t load your answers just now. Please check your connection and try again.'));
  }, []);

  const byId = new Map((results?.items ?? []).map((i) => [i.id, i]));
  const groups = pagesFor('post', condition).flatMap((p) => groupContent(p.content)).filter((g) => g.item && byId.has(g.item.id));

  return (
    <div className="flex flex-col gap-6" ref={topRef}>
      <header className="flex flex-col gap-2">
        <h1 className="text-xl font-black text-white">Your answers</h1>
        {results && (
          <p className="text-lg text-zinc-100">
            You got <span className={`font-black ${ACCENT[accent].text}`}>{results.score} out of {results.max}</span> on the knowledge questions.
          </p>
        )}
        <p className="text-sm text-zinc-300">
          These are the questions from the final questionnaire that have a right answer, with a short explanation of each.
          {prolificUrl && ' Your score does not affect your payment.'}
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <button type="button" className={`${BTN_BASE} ${BTN_GHOST}`} onClick={onBack}>← Back</button>
          {prolificUrl && <a href={prolificUrl} className={`${BTN_BASE} ${ACCENT[accent].button}`}>Return to Prolific to complete</a>}
        </div>
      </header>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {!results && !error && <p className="text-sm text-zinc-400">Loading your answers…</p>}

      {results && groups.map((g) => (
        <MarkedItem key={g.item!.id} item={g.item!} result={byId.get(g.item!.id)!} lead={g.lead} condition={condition} accent={accent} />
      ))}

      {results && (
        <div className="flex flex-wrap gap-3 border-t border-zinc-800 pt-5">
          <button type="button" className={`${BTN_BASE} ${BTN_GHOST}`} onClick={onBack}>← Back</button>
          {prolificUrl && <a href={prolificUrl} className={`${BTN_BASE} ${ACCENT[accent].button}`}>Return to Prolific to complete</a>}
        </div>
      )}
    </div>
  );
}
