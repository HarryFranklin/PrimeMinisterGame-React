'use client';
import React, { useEffect, useState, useSyncExternalStore } from 'react';
import { PROLIFIC, MIN_SCREEN, CONTACT } from '../config';
import type { Condition } from '../content/questions';
import { infoSheetFor, consentFormFor } from '../content/infoAndConsent';
import {
  initStudy, subscribeStudy, getStudyState, getCell, isStudyTestMode, resetStudyOnDevice, finishActivity, setStage,
  isStudySuspended, getStorageHealth,
  type InitResult, type StudyState,
} from '../session';
import { InfoSheetScreen, ConsentScreen } from './InfoAndConsentScreens';
import { Questionnaire, type RenderChart } from './Questionnaire';
import { downloadStudyCopy } from './download';
import { ACCENT, BTN_BASE, BTN_GHOST, type Accent } from './theme';

const EMPTY_SNAPSHOT: StudyState = {
  session: null, stage: 'pis', cells: {}, dirty: [], metaDirty: false, consentStatus: null, completed: false, finalOutcome: null,
};

/** Current study state, re-rendering when it changes. */
export function useStudy(): StudyState {
  return useSyncExternalStore(subscribeStudy, getStudyState, () => EMPTY_SNAPSHOT);
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[9000] overflow-y-auto bg-zinc-950 text-zinc-100 font-sans">
      <div className="min-h-full flex justify-center px-4 py-10">
        <div className="w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-8 h-fit">{children}</div>
      </div>
    </div>
  );
}

function Message({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-black text-white">{title}</h1>
      <div className="text-sm text-zinc-300 leading-relaxed flex flex-col gap-3">{children}</div>
    </div>
  );
}

function downloadCopy() {
  const s = getStudyState();
  if (!s.session) return;
  const c = getCell<{ ticked?: Record<string, number>; signed_at?: number }>('consent');
  downloadStudyCopy({
    sheet: infoSheetFor(s.session.mode), form: consentFormFor(s.session.mode), pid: s.session.pid,
    ticked: c?.ticked ?? {}, signedAt: c?.signed_at ?? null,
  });
}

function useScreenTooSmall(enabled: boolean) {
  const [small, setSmall] = useState(false);
  useEffect(() => {
    if (!enabled) return;
    const check = () => setSmall(window.innerWidth < MIN_SCREEN.width || window.innerHeight < MIN_SCREEN.height);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [enabled]);
  return small;
}

/**
 * Wraps an app. Shows the study screens (information sheet → consent →
 * baseline questions), then the app itself (`children`) during the activity
 * stage, then the post-test and the end screen. The app calls
 * `finishActivity()` when the game/reading is done.
 */
export function StudyGate({
  condition, accent, appVersion, renderChart, enforceMinScreen = true, children,
}: {
  condition: Condition;
  accent: Accent;
  appVersion: string;
  renderChart: RenderChart;
  enforceMinScreen?: boolean;
  children: React.ReactNode;
}) {
  const [init, setInit] = useState<InitResult | null>(null);
  const study = useStudy();
  const suspended = useSyncExternalStore(subscribeStudy, isStudySuspended, () => false);
  const tooSmall = useScreenTooSmall(enforceMinScreen);
  const [noticeHidden, setNoticeHidden] = useState(false);

  useEffect(() => {
    initStudy(condition, appVersion).then(setInit);
  }, [condition, appVersion]);

  // Test mode only: say if this browser's saved copy was behind the server
  // (restored on load) or browser storage is failing – so pilots spot it.
  const health = getStorageHealth();
  const storageNotice = init?.status === 'ready' && isStudyTestMode() && !noticeHidden &&
    (health.restoredFromServer.length > 0 || health.storageFailed) && (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[9600] max-w-xl rounded-lg bg-amber-500 text-black text-xs font-semibold px-4 py-2 shadow-xl flex gap-3 items-start">
      <span>
        Test notice:{' '}
        {health.restoredFromServer.length > 0 && <>this browser&apos;s saved copy was behind the server – restored {health.restoredFromServer.join(', ')}. </>}
        {health.storageFailed && <>browser storage is full – progress is only being saved to the server.</>}
      </span>
      <button type="button" className="underline cursor-pointer" onClick={() => setNoticeHidden(true)}>Hide</button>
    </div>
  );

  // Test mode only (mode=test or localhost): shortcuts for checking the flow.
  const testTools = init?.status === 'ready' && isStudyTestMode() && (
    <div className="fixed bottom-4 right-4 z-[9500] flex gap-2">
      {storageNotice}
      {['pis', 'consent', 'pretest'].includes(study.stage) && (
        <button
          type="button"
          onClick={() => setStage('activity')}
          className="rounded-full bg-amber-600 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 shadow-lg cursor-pointer"
          title="Test mode only: skip the information sheet, consent and baseline questions"
        >
          Test: skip to {condition === 'game' ? 'game' : 'reading'}
        </button>
      )}
      {study.stage === 'activity' && (
        <button
          type="button"
          onClick={finishActivity}
          className="rounded-full bg-amber-600 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 shadow-lg cursor-pointer"
          title="Test mode only: skip the game/reading and go to the final questions"
        >
          Test: skip to final questions
        </button>
      )}
      <button
        type="button"
        onClick={() => { resetStudyOnDevice(); window.location.href = window.location.pathname + '?mode=test&new=1'; }}
        className="rounded-full bg-red-700 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 shadow-lg cursor-pointer"
        title="Test mode only: start again as a new test participant"
      >
        Test: restart as new participant
      </button>
    </div>
  );

  if (tooSmall)
    return (
      <Shell>
        <Message title="Desktop or laptop required">
          <p>This study needs a screen at least {MIN_SCREEN.width} × {MIN_SCREEN.height} pixels. Please open the link on a desktop or laptop computer, or make this window larger.</p>
        </Message>
      </Shell>
    );

  if (suspended)
    return (
      <Shell>
        <Message title="This study is open in another tab">
          <p>You opened the study again in another tab or window, so this one has been paused to keep your progress safe. Please carry on in the other tab and close this one.</p>
        </Message>
      </Shell>
    );

  if (!init) return <Shell><p className="text-sm text-zinc-400">Loading…</p></Shell>;
  if (init.status === 'redirecting') return <Shell><p className="text-sm text-zinc-400">Taking you to your activity…</p></Shell>;
  if (init.status === 'error')
    return (
      <Shell>
        <Message title="Something went wrong">
          <p>We couldn’t connect to the study server. Please check your internet connection and refresh the page.</p>
          <p className="text-xs text-zinc-500">{init.message}</p>
        </Message>
      </Shell>
    );
  if (init.status === 'no-session' || init.status === 'wrong-app' || !study.session)
    return (
      <Shell>
        <Message title="Please use your study link">
          <p>To take part, please open the link you were given (for example, from Prolific). If you’ve already started, use the same browser on the same computer.</p>
        </Message>
      </Shell>
    );

  const s = study.session;
  const { stage } = study;

  if (stage === 'activity') return <>{children}{testTools}</>;

  let screen: React.ReactNode;
  if (stage === 'pis') screen = <InfoSheetScreen accent={accent} />;
  else if (stage === 'consent') screen = <ConsentScreen accent={accent} />;
  else if (stage === 'pretest') screen = <Questionnaire key="pre" phase="pre" condition={condition} accent={accent} renderChart={renderChart} />;
  else if (stage === 'posttest') screen = <Questionnaire key="post" phase="post" condition={condition} accent={accent} renderChart={renderChart} />;
  else if (stage === 'declined')
    screen = (
      <Message title="Thank you for your interest">
        <p>You have chosen not to take part. No study answers have been collected.</p>
        {s.mode === 'live' ? (
          <p>
            Please return to Prolific using this link:{' '}
            <a className={`underline ${ACCENT[accent].text}`} href={PROLIFIC.noConsentUrl}>{PROLIFIC.noConsentUrl}</a>
          </p>
        ) : (
          <p>You can now close this tab.</p>
        )}
      </Message>
    );
  else
    screen = (
      <Message title="Thank you for taking part">
        <p>Your answers have been saved. Thank you for your time – your contribution helps us understand how people learn about ways of making policy.</p>
        <p>If you have any questions, or want your data removed within {CONTACT.withdrawalDays} days, contact {CONTACT.name} ({CONTACT.email}) quoting your ID: <span className="font-mono text-zinc-100">{s.pid}</span></p>
        <div className="flex flex-wrap gap-3 pt-2">
          <button type="button" className={`${BTN_BASE} ${BTN_GHOST}`} onClick={downloadCopy}>Download your information sheet and consent record</button>
          {s.mode === 'live' && (
            <a href={PROLIFIC.completeUrl} className={`${BTN_BASE} ${ACCENT[accent].button}`}>Return to Prolific to complete</a>
          )}
        </div>
        {s.mode !== 'live' && <p>You can now close this tab.</p>}
      </Message>
    );

  return (
    <>
      <Shell>{screen}</Shell>
      {testTools}
    </>
  );
}
