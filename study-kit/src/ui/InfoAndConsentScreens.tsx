'use client';
import React, { useEffect, useRef, useState } from 'react';
import { infoSheetFor, consentFormFor, type DocBlock } from '../content/infoAndConsent';
import { getStudyState, getCell, setCell, setStage } from '../session';
import { Markup } from './Markup';
import { downloadStudyCopy } from './download';
import { ACCENT, BTN_BASE, BTN_GHOST, type Accent } from './theme';

function Blocks({ blocks }: { blocks: DocBlock[] }) {
  return (
    <>
      {blocks.map((b, i) =>
        b.kind === 'p' ? (
          <p key={i} className="text-sm text-zinc-300 leading-relaxed mb-3">
            <Markup text={b.text ?? ''} />
          </p>
        ) : b.kind === 'ul' ? (
          <ul key={i} className="list-disc pl-6 mb-3 space-y-1 text-sm text-zinc-300 leading-relaxed">
            {(b.items ?? []).map((it, j) => (
              <li key={j}><Markup text={it} /></li>
            ))}
          </ul>
        ) : (
          <ol key={i} className="list-decimal pl-6 mb-3 space-y-1 text-sm text-zinc-300 leading-relaxed">
            {(b.items ?? []).map((it, j) => (
              <li key={j}><Markup text={it} /></li>
            ))}
          </ol>
        )
      )}
    </>
  );
}

function downloadCopy() {
  const s = getStudyState();
  if (!s.session) return;
  const consent = getCell<{ ticked?: Record<string, number>; signed_at?: number }>('consent');
  downloadStudyCopy({
    sheet: infoSheetFor(s.session.mode),
    form: consentFormFor(s.session.mode),
    pid: s.session.pid,
    ticked: consent?.ticked ?? {},
    signedAt: consent?.signed_at ?? null,
  });
}

// ---------------------------------------------------------------------------
// Participant Information Sheet
// Saves: pis = { version, opened_at, read_at, reached_end, dwell_ms, downloaded }
// ---------------------------------------------------------------------------
export function InfoSheetScreen({ accent }: { accent: Accent }) {
  const session = getStudyState().session!;
  const sheet = infoSheetFor(session.mode);
  const openedAt = useRef(Date.now());
  const [reachedEnd, setReachedEnd] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = getCell('pis');
    setCell('pis', { ...prev, version: sheet.version, opened_at: (prev?.opened_at as number) ?? Date.now() });
    const el = endRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setReachedEnd(true));
    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleContinue = () => {
    const prev = getCell('pis');
    setCell('pis', {
      ...prev,
      version: sheet.version,
      opened_at: (prev?.opened_at as number) ?? openedAt.current,
      read_at: Date.now(),
      reached_end: reachedEnd,
      dwell_ms: Date.now() - openedAt.current,
      downloaded,
    });
    setStage('consent');
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${ACCENT[accent].text}`}>{sheet.title}</p>
        <h1 className="text-xl font-black text-white leading-snug">{sheet.subtitle}</h1>
      </header>
      <div>
        <Blocks blocks={sheet.intro} />
        {sheet.sections.map((s, i) => (
          <section key={i} className="mt-5">
            <h2 className="text-base font-bold text-white mb-2">
              {i + 1}. {s.heading}
            </h2>
            <Blocks blocks={s.blocks} />
          </section>
        ))}
        <p className="text-xs text-zinc-500 mt-4">Version: {sheet.version}</p>
        <div ref={endRef} />
      </div>
      <div className="flex flex-wrap gap-3 justify-between items-center border-t border-zinc-800 pt-5">
        <button
          type="button"
          className={`${BTN_BASE} ${BTN_GHOST}`}
          onClick={() => {
            setDownloaded(true);
            downloadCopy();
          }}
        >
          Download a copy
        </button>
        <button type="button" className={`${BTN_BASE} ${ACCENT[accent].button}`} onClick={handleContinue}>
          I have read this – continue to consent
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Consent form: one tick box per statement, all required.
// Saves: consent = { version, srec, shown_at, ticked: {c1: ts, …}, untick_count,
//                    signed: bool, signed_at | declined_at }
// ---------------------------------------------------------------------------
export function ConsentScreen({ accent }: { accent: Accent }) {
  const session = getStudyState().session!;
  const form = consentFormFor(session.mode);
  const [ticked, setTicked] = useState<Record<string, number>>(
    () => (getCell<{ ticked?: Record<string, number> }>('consent')?.ticked as Record<string, number>) ?? {}
  );
  const [confirmDecline, setConfirmDecline] = useState(false);
  const unticks = useRef(0);
  const allTicked = form.statements.every((s) => ticked[s.id]);

  useEffect(() => {
    const prev = getCell('consent');
    setCell('consent', { ...prev, version: form.version, srec: form.srecReference, shown_at: (prev?.shown_at as number) ?? Date.now() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (id: string) => {
    setTicked((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
        unticks.current += 1;
      } else next[id] = Date.now();
      return next;
    });
  };

  const save = (extra: Record<string, unknown>) => {
    const prev = getCell('consent');
    setCell('consent', { ...prev, version: form.version, srec: form.srecReference, ticked, untick_count: unticks.current, ...extra });
  };

  const handleAgree = () => {
    if (!allTicked) return;
    save({ signed: true, signed_at: Date.now() });
    setStage('pretest', { consentStatus: 'signed' });
  };

  const handleDecline = () => {
    save({ signed: false, declined_at: Date.now() });
    setStage('declined', { consentStatus: 'declined' });
  };

  return (
    <div className="flex flex-col gap-6">
      <header>
        <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${ACCENT[accent].text}`}>Consent form</p>
        <h1 className="text-xl font-black text-white leading-snug">{form.projectTitle}</h1>
        <p className="text-xs text-zinc-500 mt-2">
          Lead researcher: {form.leadResearcher}
          {form.srecReference ? ` · SREC reference: ${form.srecReference}` : ''} · Version: {form.version}
        </p>
      </header>
      <p className="text-sm text-zinc-400">Please tick each box to confirm you agree. You need to tick every box to take part.</p>
      <ul className="flex flex-col gap-2">
        {form.statements.map((s, i) => (
          <li key={s.id}>
            <label
              className={`flex gap-3 items-start rounded-xl border p-4 cursor-pointer transition-colors ${
                ticked[s.id] ? ACCENT[accent].ring : 'border-zinc-800 bg-zinc-950 hover:border-zinc-600'
              }`}
            >
              <input
                type="checkbox"
                checked={!!ticked[s.id]}
                onChange={() => toggle(s.id)}
                className={`mt-0.5 h-5 w-5 shrink-0 ${ACCENT[accent].check}`}
              />
              <span className="text-sm text-zinc-200 leading-relaxed">
                <span className="text-zinc-500 mr-1">{i + 1}.</span>
                {s.text}
              </span>
            </label>
          </li>
        ))}
      </ul>

      {confirmDecline ? (
        <div className="rounded-xl border border-zinc-700 bg-zinc-950 p-5 flex flex-col gap-3">
          <p className="text-sm text-zinc-200">Are you sure you don’t want to take part? You won’t be able to return to the study.</p>
          <div className="flex gap-3">
            <button type="button" className={`${BTN_BASE} ${BTN_GHOST}`} onClick={() => setConfirmDecline(false)}>
              Go back
            </button>
            <button type="button" className={`${BTN_BASE} bg-red-700 hover:bg-red-800 text-white`} onClick={handleDecline}>
              Yes, I do not wish to take part
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3 justify-between items-center border-t border-zinc-800 pt-5">
          <div className="flex gap-3">
            <button type="button" className={`${BTN_BASE} ${BTN_GHOST}`} onClick={() => setConfirmDecline(true)}>
              I do not wish to take part
            </button>
            <button type="button" className={`${BTN_BASE} ${BTN_GHOST}`} onClick={() => { save({}); downloadCopy(); }}>
              Download a copy
            </button>
          </div>
          <button type="button" disabled={!allTicked} className={`${BTN_BASE} ${ACCENT[accent].button}`} onClick={handleAgree}>
            I agree to take part
          </button>
        </div>
      )}
    </div>
  );
}
