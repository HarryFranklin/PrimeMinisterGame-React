import React from 'react';
import { ElectionCycle, Respondent } from '../../utils/types';
import { PM_PROFILES } from '../../utils/pmProfiles';
import { PM_TONES } from '../desk/deskTheme';
import PMFigure from '../modals/ElectionModal/PMFigure';
import MiniHistogram from './MiniHistogram';

/**
 * The back cover of The Daily Ledger: "Runners and riders", the level select.
 * Used as the last page of the morning paper and as the level select screen.
 * Only the terms played and the one up next are shown; later candidates stay blurred.
 */
export type RunnerStatus = 'won' | 'lost' | 'next' | 'retry' | 'locked';

export interface RunnerEntry {
  cycle: ElectionCycle;
  status: RunnerStatus;
  /** One line for a played term, e.g. "Re-elected · NALS 7.45 vs target 7.68". */
  result?: string;
  /** Final population of a played term, for its life satisfaction chart. */
  population?: Respondent[];
  /** The big button on the next (or retry) candidate. */
  action?: { label: string; onClick: () => void; disabled?: boolean };
  /** "Replay" on a played term. */
  onReplay?: () => void;
}

/** What each measure means, in a sentence or two. */
const JUDGED: Record<ElectionCycle, { on: string; blurb: string }> = {
  [ElectionCycle.Benthamite]: { on: 'the national average', blurb: 'Adds up everyone’s life satisfaction and divides by the number of people. A point for someone thriving counts the same as a point for someone struggling.' },
  [ElectionCycle.Rawlsian]: { on: 'the single worst-off person', blurb: 'Only the lowest score in the country counts. Make everyone else happier and, if the bottom doesn’t move, her number won’t either.' },
  [ElectionCycle.SocietalUtility]: { on: 'fairness for others', blurb: 'Scores the country on how citizens judge its whole spread of life satisfaction when deciding for others.' },
  [ElectionCycle.PersonalUtility]: { on: 'own lives', blurb: 'Each citizen values their own life by their own standards. What one person prizes, another may not care about.' },
};

const lsCounts = (pop: Respondent[]) => Array.from({ length: 11 }, (_, i) => pop.filter((r) => Math.round(r.currentLS) === i).length);

const abs = (s: React.CSSProperties): React.CSSProperties => ({ position: 'absolute', ...s });

export default function RunnersAndRiders({ entries, resultsSoFar, footer }: { entries: RunnerEntry[]; resultsSoFar: number; footer?: React.ReactNode }) {
  return (
    <>
      <div className="shrink-0 flex justify-between items-end border-b-4 border-double border-stone-900 pb-1.5">
        <span className="paper-cap">Back page</span>
        <span className="font-display font-black italic text-[30px] leading-none tracking-tight">The Daily Ledger</span>
        <span className="paper-cap">Results so far: {resultsSoFar} of 4</span>
      </div>
      <div className="shrink-0 flex flex-col gap-0.5">
        <span className="font-display font-black text-[40px] leading-none">Runners and riders</span>
        <span className="font-display italic font-bold text-[13px] text-stone-600">Four candidates, four ways of keeping score. Whoever wins, the country gets judged differently.</span>
      </div>
      <div className="grid grid-cols-2 grid-rows-2 flex-1 min-h-0 border-t border-stone-900">
        {entries.map((e, i) => <RunnerCard key={e.cycle} entry={e} index={i} />)}
      </div>
      {footer}
    </>
  );
}

function RunnerCard({ entry, index }: { entry: RunnerEntry; index: number }) {
  const profile = PM_PROFILES.find((p) => p.cycle === entry.cycle)!;
  const tone = PM_TONES[entry.cycle];
  const judged = JUDGED[entry.cycle];
  const name = profile.name.replace(/^PM\s+/, '');
  const { status } = entry;
  const played = status === 'won' || status === 'lost';
  const locked = status === 'locked';
  const term = index + 1;
  const figScale = 0.62;

  return (
    <div className="relative overflow-hidden" style={{ borderLeft: index % 2 ? '1px solid #1c1917' : undefined, borderTop: index > 1 ? '1px solid #1c1917' : undefined }}>
      <div className="absolute inset-0 flex flex-col gap-1 px-3 py-2" style={{ filter: locked ? 'blur(7px) grayscale(.6)' : undefined }} aria-hidden={locked}>
        {/* Campaign photo: arms up only once re-elected */}
        <div className="relative h-[96px] shrink-0 overflow-hidden" style={{ background: `linear-gradient(180deg, ${tone.color}, ${tone.dark})`, filter: status === 'lost' ? 'grayscale(.7)' : 'saturate(.8) sepia(.1)' }}>
          <div className="absolute inset-0 bg-[repeating-linear-gradient(-45deg,rgba(255,255,255,.07)_0_10px,transparent_10px_20px)]" />
          <span className="absolute left-2 top-2 text-[10px] font-black text-white bg-black/25 px-1.5 py-0.5 rounded">{status === 'won' ? 'Victory rally' : status === 'lost' ? 'Leaving No. 10' : 'On the campaign trail'}</span>
          <div style={abs({ left: '50%', top: 20, marginLeft: -(90 * figScale) / 2 })}>
            <PMFigure cycle={entry.cycle} scale={figScale} pose={status === 'won' ? 'cheering' : 'standing'} />
          </div>
          <div className="absolute left-2.5 right-2.5 bottom-2 bg-white px-2 py-0.5 text-center font-black text-[12px] tracking-[.04em] uppercase" style={{ color: tone.dark }}>{profile.slogan}</div>
        </div>
        <span className="font-display font-black text-[21px] leading-none">{name}</span>
        <span className="text-[11.5px] font-bold" style={{ color: tone.dark }}>Judged on: {judged.on}</span>

        {played ? (
          <>
            {entry.population && entry.population.length > 0 && (
              <div className="flex flex-col">
                <span className="paper-cap text-stone-500 text-[9.5px]">Final life satisfaction</span>
                <MiniHistogram counts={lsCounts(entry.population)} max={Math.max(1, ...lsCounts(entry.population))} colour={tone.dark} height={44} />
              </div>
            )}
            <div className="mt-auto border-2 border-stone-900 px-2.5 py-1.5 flex justify-between items-center gap-2">
              <div className="flex flex-col min-w-0">
                <span className="paper-cap">Your term</span>
                <span className="text-[12px] font-bold leading-snug">{entry.result}</span>
              </div>
              {entry.onReplay && (
                <button type="button" onClick={entry.onReplay} className="paper-btn shrink-0 text-[12px] font-bold underline px-1.5 py-1">Replay</button>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="m-0 text-[12.5px] leading-snug">{judged.blurb}</p>
            {entry.action && (
              <button
                type="button"
                onClick={entry.action.onClick}
                disabled={entry.action.disabled}
                className="paper-btn mt-auto w-full py-2.5 font-black text-[13px] tracking-[.06em] uppercase disabled:opacity-50"
                style={{ background: status === 'retry' ? '#b91c1c' : '#d6b25e', color: status === 'retry' ? '#ffffff' : '#1c1917' }}
              >
                {entry.action.label}
              </button>
            )}
          </>
        )}
      </div>

      {/* Ink stamp on a played term */}
      {played && (
        <div
          className="absolute right-5 top-[30px] -rotate-[12deg] border-4 px-2.5 py-0.5 font-black text-[20px] tracking-[.12em] mix-blend-multiply pointer-events-none"
          style={{ borderColor: status === 'won' ? 'rgba(185,28,28,.85)' : 'rgba(68,64,60,.85)', color: status === 'won' ? 'rgba(185,28,28,.85)' : 'rgba(68,64,60,.85)' }}
        >
          {status === 'won' ? 'ELECTED' : 'VOTED OUT'}
        </div>
      )}

      {/* Later candidates: not yet revealed */}
      {locked && (
        <div className="absolute inset-0 flex items-center justify-center bg-[rgba(241,234,216,.35)]">
          <div className="border-2 border-dashed border-stone-500 bg-[#f1ead8] px-4 py-2.5 text-center flex flex-col gap-0.5">
            <span className="paper-cap text-stone-600">Term {term}</span>
            <span className="font-display font-black text-[17px]">Still campaigning</span>
            <span className="text-[11.5px] text-stone-600">Revealed after term {term - 1}</span>
          </div>
        </div>
      )}
    </div>
  );
}