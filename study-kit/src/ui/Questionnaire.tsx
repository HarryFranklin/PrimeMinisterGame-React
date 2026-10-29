'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  pagesFor, armText, DISTRIBUTIONS, QUESTIONNAIRE_VERSION,
  type Item, type Block, type Page, type Phase, type Condition, type Option, type GridRow,
} from '../content/questions';
import { getCell, setCell, setStage, syncStudy, getStudyState } from '../session';
import { Markup } from './Markup';
import { QuestionChart } from './QuestionChart';
import { ACCENT, BTN_BASE, type Accent } from './theme';

/** How the app draws a question chart (each app passes its own D3Chart). */
export type RenderChart = (args: { id: string; label: string; counts: number[]; yMax: number }) => React.ReactNode;

type Answer = string | number | string[] | Record<string, string>;
type Answers = Record<string, Answer>;

interface StoredPhase {
  version: string;
  answers: Answers;
  page_index: number;
  pages: Record<string, { shown_at: number; done_at?: number; dwell_ms?: number }>;
  started_at: number;
  completed_at?: number;
  /** Row order shown for grids with shuffleRows: { itemId: [rowValue, …] }. */
  row_orders?: Record<string, string[]>;
}

/** Rows of a shuffled grid in a fixed random order for this participant: the
 * same on every page load, different between participants and questions. */
export function rowOrder(rows: GridRow[], itemId: string, pid: string): string[] {
  let h = 2166136261;
  for (const ch of `${pid}:${itemId}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rand = () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const order = rows.map((r) => r.value);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

const isItem = (c: Item | Block): c is Item => 'id' in c;

function answered(item: Item, a: Answer | undefined): boolean {
  if (item.type === 'multi') return true; // none ticked is a valid answer
  if (a === undefined || a === null) return false;
  if (item.type === 'text') return typeof a === 'string' && a.trim().length > 0;
  if (item.type === 'grid') return item.rows.every((r) => (a as Record<string, string>)[r.value]);
  if (item.type === 'number') {
    if (typeof a === 'string') return (item.alternatives ?? []).some((o) => o.value === a);
    if (typeof a !== 'number' || Number.isNaN(a)) return false;
    if (item.min !== undefined && a < item.min) return false;
    if (item.max !== undefined && a > item.max) return false;
    if (item.integer && !Number.isInteger(a)) return false;
    return true;
  }
  return a !== '';
}

// ---------------------------------------------------------------------------
// Questionnaire: shows the baseline (phase 'pre') or post-test ('post') one
// page at a time. Answers are saved after every page (partial responses kept).
// Saves into cell `pretest` / `posttest`: { version, answers, page_index,
// pages: {id: {shown_at, done_at, dwell_ms}}, started_at, completed_at }.
// ---------------------------------------------------------------------------
export function Questionnaire({
  phase, condition, accent, renderChart,
}: { phase: Phase; condition: Condition; accent: Accent; renderChart: RenderChart }) {
  const cellName = phase === 'pre' ? 'pretest' : 'posttest';
  const pages = useMemo(() => pagesFor(phase, condition), [phase, condition]);
  const stored = getCell<StoredPhase>(cellName);
  const [pageIndex, setPageIndex] = useState(() => Math.min(stored?.page_index ?? 0, pages.length - 1));
  const [answers, setAnswers] = useState<Answers>(() => stored?.answers ?? {});
  const [showErrors, setShowErrors] = useState(false);
  const shownAt = useRef(Date.now());
  const topRef = useRef<HTMLDivElement>(null);
  const page = pages[pageIndex];
  const pid = getStudyState().session?.pid ?? 'anon';
  const rowOrders = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const c of page.content) if ('id' in c && c.type === 'grid' && c.shuffleRows) out[c.id] = rowOrder(c.rows, c.id, pid);
    return out;
  }, [page, pid]);

  // Record when each page is first shown (and the row order of any shuffled grid on it).
  useEffect(() => {
    shownAt.current = Date.now();
    const prev = getCell<StoredPhase>(cellName);
    const pagesMeta = { ...(prev?.pages ?? {}) };
    if (!pagesMeta[page.id]) pagesMeta[page.id] = { shown_at: shownAt.current };
    setCell(cellName, {
      ...prev,
      version: QUESTIONNAIRE_VERSION,
      answers: prev?.answers ?? {},
      page_index: pageIndex,
      pages: pagesMeta,
      started_at: prev?.started_at ?? shownAt.current,
      ...(Object.keys(rowOrders).length ? { row_orders: { ...(prev?.row_orders ?? {}), ...rowOrders } } : {}),
    });
    topRef.current?.scrollIntoView({ block: 'start' });
    setShowErrors(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIndex]);

  const items = page.content.filter(isItem);
  const missing = items.filter((it) => it.required !== false && !answered(it, answers[it.id]));

  const setAnswer = (id: string, value: Answer) => setAnswers((prev) => ({ ...prev, [id]: value }));

  const handleNext = () => {
    if (missing.length) {
      setShowErrors(true);
      return;
    }
    const now = Date.now();
    const prev = getCell<StoredPhase>(cellName);
    const isLast = pageIndex === pages.length - 1;
    const pagesMeta = { ...(prev?.pages ?? {}) };
    pagesMeta[page.id] = { ...pagesMeta[page.id], shown_at: pagesMeta[page.id]?.shown_at ?? shownAt.current, done_at: now, dwell_ms: now - shownAt.current };
    setCell(cellName, {
      ...prev,
      version: QUESTIONNAIRE_VERSION,
      answers,
      page_index: isLast ? pageIndex : pageIndex + 1,
      pages: pagesMeta,
      started_at: prev?.started_at ?? now,
      ...(isLast ? { completed_at: now } : {}),
    });
    if (isLast) {
      if (phase === 'pre') setStage('activity');
      else setStage('done', { completed: true, finalOutcome: 'completed' });
    } else {
      syncStudy(); // save every page – partial responses are kept
      setPageIndex(pageIndex + 1);
    }
  };

  return (
    <div className="flex flex-col gap-6" ref={topRef}>
      <header>
        <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${ACCENT[accent].text}`}>
          {phase === 'pre' ? 'Before you start' : 'Final questions'} · Page {pageIndex + 1} of {pages.length}
        </p>
        <h1 className="text-xl font-black text-white">{page.title}</h1>
        {page.intro && <div className="text-sm text-zinc-300 mt-2 leading-relaxed"><Markup text={page.intro} /></div>}
      </header>

      <div className="flex flex-col gap-6">
        {groupContent(page.content).map((g, i) =>
          g.item ? (
            <ItemView
              key={g.item.id}
              item={g.item}
              lead={g.lead}
              renderChart={renderChart}
              condition={condition}
              accent={accent}
              value={answers[g.item.id]}
              rowOrder={rowOrders[g.item.id]}
              onChange={(v) => setAnswer(g.item!.id, v)}
              error={showErrors && missing.includes(g.item)}
            />
          ) : (
            g.lead.map((b, j) => <BlockView key={`b${i}-${j}`} block={b} condition={condition} renderChart={renderChart} />)
          )
        )}
      </div>

      <div className="flex items-center justify-between border-t border-zinc-800 pt-5 gap-4">
        <p className="text-sm text-red-400">{showErrors && missing.length ? 'Please answer the highlighted questions.' : ''}</p>
        <button type="button" className={`${BTN_BASE} ${ACCENT[accent].button}`} onClick={handleNext}>
          {pageIndex === pages.length - 1 ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
/** Info, charts and tables belong to the question that follows them: they are
 * shown inside its box, under its number (so "Q6" comes first, then what Q6
 * is about, then the question itself). */
export function groupContent<T extends { id: string }>(content: (T | Block)[]): { item?: T; lead: Block[] }[] {
  const groups: { item?: T; lead: Block[] }[] = [];
  let lead: Block[] = [];
  for (const c of content) {
    if ('id' in c) {
      groups.push({ item: c as T, lead });
      lead = [];
    } else lead.push(c as Block);
  }
  if (lead.length) groups.push({ lead });
  return groups;
}

// ---------------------------------------------------------------------------
export function BlockView({ block, condition }: { block: Block; condition: Condition; renderChart?: RenderChart }) {
  if (block.type === 'info')
    return <div className="text-sm text-zinc-200 leading-relaxed rounded-xl bg-zinc-950 border border-zinc-800 p-4"><Markup text={armText(block.text, condition)} /></div>;
  if (block.type === 'table')
    return (
      <div className="overflow-x-auto">
        <table className="text-sm text-zinc-200 border-collapse">
          <thead>
            <tr>{block.columns.map((c) => <th key={c} className="border border-zinc-700 bg-zinc-800 px-3 py-2 text-left font-semibold">{c}</th>)}</tr>
          </thead>
          <tbody>
            {block.rows.map((r, i) => (
              <tr key={i}>{r.map((cell, j) => <td key={j} className="border border-zinc-700 px-3 py-2 tabular-nums">{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  // Same y-axis on every chart in a block, so the societies compare fairly by eye.
  const all = block.charts.flatMap((id) => DISTRIBUTIONS[id]?.counts ?? []);
  const yMax = Math.max(20, Math.ceil(Math.max(0, ...all) / 10) * 10);
  return (
    // Two charts side by side; three or more stacked full width (else too small to read).
    <div className={`grid gap-3 ${block.charts.length >= 3 ? 'grid-cols-1' : 'grid-cols-2'}`}>
      {block.charts.map((id) => {
        const d = DISTRIBUTIONS[id];
        return (
          <div key={id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 flex flex-col">
            <p className="text-sm font-black uppercase tracking-widest text-zinc-100 mb-2">{d?.label ?? id}</p>
            {d?.counts ? (
              // Same built-in chart for both groups (one face = one person), so the
              // question looks identical in the game and wiki arms.
              <QuestionChart id={id} counts={d.counts} yMax={yMax} perRow={block.charts.length >= 3 ? 4 : 2} />
            ) : (
              <div className="h-56 flex items-center justify-center text-xs text-zinc-500 border border-dashed border-zinc-700 rounded-lg">Chart data to be added</div>
            )}
            {d?.counts && <p className="text-xs text-zinc-400 text-center mt-1">{d.counts.reduce((a, b) => a + b, 0)} people · one face = one person</p>}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
function OptionButton({ option, selected, accent, onClick, role = 'radio' }: { option: Option; selected: boolean; accent: Accent; onClick: () => void; role?: string }) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={selected}
      onClick={onClick}
      className={`text-left rounded-lg border px-4 py-2.5 text-sm transition-colors cursor-pointer ${
        selected ? ACCENT[accent].chip : 'bg-zinc-950 border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white'
      }`}
    >
      {option.label}
    </button>
  );
}

function ItemView({
  item, lead = [], renderChart, condition, accent, value, rowOrder: order, onChange, error,
}: {
  item: Item & { num?: number };
  /** Info/charts/tables shown under the number, before the question. */
  lead?: Block[];
  renderChart: RenderChart;
  condition: Condition;
  accent: Accent;
  value: Answer | undefined;
  /** Grids with shuffleRows: the row values in the order to show them. */
  rowOrder?: string[];
  onChange: (v: Answer) => void;
  error: boolean;
}) {
  const prompt = armText(item.prompt, condition);
  const [numText, setNumText] = useState(typeof value === 'number' ? String(value) : '');

  let body: React.ReactNode = null;
  switch (item.type) {
    case 'single':
      body = (
        <div className="flex flex-col gap-2" role="radiogroup" aria-label={prompt}>
          {item.options.map((o) => <OptionButton key={o.value} option={o} selected={value === o.value} accent={accent} onClick={() => onChange(o.value)} />)}
        </div>
      );
      break;
    case 'multi': {
      const sel = Array.isArray(value) ? value : [];
      body = (
        <div className="flex flex-col gap-2">
          {item.options.map((o) => (
            <OptionButton
              key={o.value}
              role="checkbox"
              option={{ ...o, label: `${sel.includes(o.value) ? '☑' : '☐'}  ${o.label}` }}
              selected={sel.includes(o.value)}
              accent={accent}
              onClick={() => onChange(sel.includes(o.value) ? sel.filter((v) => v !== o.value) : [...sel, o.value])}
            />
          ))}
        </div>
      );
      break;
    }
    case 'scale': {
      const nums = Array.from({ length: item.max - item.min + 1 }, (_, i) => item.min + i);
      body = (
        <div className="flex flex-col gap-2">
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${nums.length}, minmax(0, 1fr))` }}>
            {nums.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                className={`h-11 rounded-lg border text-sm font-black tabular-nums transition-colors cursor-pointer ${
                  value === n ? ACCENT[accent].chip : 'bg-zinc-950 border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-sm text-zinc-300 px-1">
            <span>{item.lowLabel}</span>
            <span>{item.highLabel}</span>
          </div>
          {item.alternatives && (
            <div className="flex gap-2">
              {item.alternatives.map((o) => <OptionButton key={o.value} option={o} selected={value === o.value} accent={accent} onClick={() => onChange(o.value)} />)}
            </div>
          )}
        </div>
      );
      break;
    }
    case 'number':
      body = (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            {item.prefix && <span className="text-zinc-300">{item.prefix}</span>}
            <input
              type="text"
              inputMode="decimal"
              maxLength={12}
              value={numText}
              onChange={(e) => {
                const t = e.target.value.trim();
                setNumText(e.target.value);
                onChange(t === '' ? '' : /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : NaN);
              }}
              className="w-32 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white tabular-nums focus:outline-none focus:border-zinc-400"
            />
            {item.suffix && <span className="text-zinc-400 text-sm">{item.suffix}</span>}
          </div>
          {(item.alternatives ?? []).map((o) => (
            <OptionButton key={o.value} option={o} selected={value === o.value} accent={accent} onClick={() => { setNumText(''); onChange(o.value); }} />
          ))}
        </div>
      );
      break;
    case 'grid': {
      const v = (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as Record<string, string>;
      const rows = order ? order.map((id) => item.rows.find((r) => r.value === id)!).filter(Boolean) : item.rows;
      const pick = (row: string, opt: string) => onChange({ ...v, [row]: opt });
      const cards = (
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <div key={r.value} data-row={r.value} className={`flex flex-col gap-2 rounded-lg bg-zinc-950 border p-3 ${error && !v[r.value] ? 'border-red-500/70' : 'border-zinc-800'}`}>
              <p className="text-sm text-zinc-200">{armText(r.label, condition)}</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={armText(r.label, condition)}>
                {item.options.map((o) => (
                  <OptionButton key={o.value} option={o} selected={v[r.value] === o.value} accent={accent} onClick={() => pick(r.value, o.value)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      );
      if (item.layout !== 'matrix') {
        body = cards;
        break;
      }
      // Matrix: statements down the side, the scale across the top once. Narrow
      // screens fall back to the cards, where the labels fit.
      const cols = `minmax(0,1fr) repeat(${item.options.length}, ${item.options.length > 5 ? 50 : 64}px)`;
      body = (
        <>
          <div className="sm:hidden">{cards}</div>
          <div className="hidden sm:block rounded-lg border border-zinc-800 overflow-hidden">
            <div className="grid items-end gap-x-1 px-3 py-2 bg-zinc-900 border-b border-zinc-800" style={{ gridTemplateColumns: cols }} aria-hidden>
              <span />
              {item.options.map((o) => (
                <span key={o.value} className="text-[11px] leading-tight text-zinc-400 text-center">{o.label}</span>
              ))}
            </div>
            {rows.map((r, ri) => {
              const label = armText(r.label, condition);
              const missingRow = error && !v[r.value];
              return (
                <div
                  key={r.value}
                  data-row={r.value}
                  role="radiogroup"
                  aria-label={label}
                  className={`grid items-center gap-x-1 px-3 py-2.5 border-l-2 ${missingRow ? 'border-red-500 bg-red-500/10' : `border-transparent ${ri % 2 ? 'bg-zinc-950' : 'bg-zinc-900/40'}`}`}
                  style={{ gridTemplateColumns: cols }}
                >
                  <p className="text-sm text-zinc-200 pr-3">{label}</p>
                  {item.options.map((o) => {
                    const sel = v[r.value] === o.value;
                    return (
                      <button key={o.value} type="button" role="radio" aria-checked={sel} aria-label={o.label} onClick={() => pick(r.value, o.value)} className="flex justify-center py-1 cursor-pointer group">
                        <span className={`w-5 h-5 rounded-full border-2 transition-colors ${sel ? ACCENT[accent].dot : 'border-zinc-600 group-hover:border-zinc-300'}`} />
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </>
      );
      break;
    }
    case 'text': {
      const max = item.maxLength ?? (item.multiline ? 1500 : 200);
      const text = typeof value === 'string' ? value : '';
      body = (
        <div className="flex flex-col gap-1">
          {item.multiline ? (
            <textarea
              rows={4}
              maxLength={max}
              value={text}
              onChange={(e) => onChange(e.target.value.slice(0, max))}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-400"
            />
          ) : (
            <input
              type="text"
              maxLength={max}
              value={text}
              onChange={(e) => onChange(e.target.value.slice(0, max))}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-zinc-400"
            />
          )}
          {text.length > max * 0.8 && <p className="text-xs text-zinc-400 text-right tabular-nums">{text.length} / {max} characters</p>}
        </div>
      );
      break;
    }
  }

  return (
    <div data-item={item.id} data-type={item.type} className={`flex flex-col gap-3 rounded-xl p-4 border ${error ? 'border-red-500/70 bg-red-500/5' : 'border-transparent'}`}>
      {lead.length > 0 && (
        <>
          {item.num !== undefined && <p className={`text-base font-black ${ACCENT[accent].text}`}>Q{item.num}</p>}
          {lead.map((b, i) => <BlockView key={i} block={b} condition={condition} renderChart={renderChart} />)}
        </>
      )}
      <div>
        <div className="text-base font-semibold text-zinc-100 leading-snug">
          {item.num !== undefined && lead.length === 0 && <span className={`mr-2 font-black ${ACCENT[accent].text}`}>Q{item.num}</span>}
          <Markup text={prompt} />
          {item.required === false && <span className="text-zinc-400 font-normal text-sm"> (optional)</span>}
        </div>
        {item.help && <div className="text-sm text-zinc-400 mt-1"><Markup text={item.help} /></div>}
        {item.type === 'multi' && <p className="text-xs text-zinc-400 mt-1">Select all that apply (or none).</p>}
      </div>
      {body}
    </div>
  );
}