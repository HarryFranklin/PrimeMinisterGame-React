'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  ParticipantSession,
  getStoredSession,
  storeSession,
  resetPayload,
  syncPayload,
  syncIfNeeded,
  syncIfDirty,
  setVisible,
  recordScroll,
  noteNavigation,
  HEARTBEAT_MS,
} from '@/lib/telemetry';

interface TelemetryContextType {
  session: ParticipantSession | null;
  isInitialised: boolean;
  initialiseSession: (prolificId: string) => Promise<void>;
}

const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined);

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<ParticipantSession | null>(null);
  const [isInitialised, setIsInitialised] = useState<boolean>(false);
  const sessionRef = useRef<ParticipantSession | null>(null);
  sessionRef.current = session;

  useEffect(() => {
    const existing = getStoredSession();
    if (existing) {
      setSession(existing);
      setIsInitialised(true);
    }
  }, []);

  // Page-wide listeners, attached once a session exists. None of these write
  // to the database except the hide/close and heartbeat syncs.
  useEffect(() => {
    if (!session) return;

    // How the participant reached the next page: sidebar link, or a link in
    // the page content (e.g. "Next: ..."). Capture phase, so this runs
    // before Next.js handles the navigation.
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement | null)?.closest('a');
      if (!anchor?.getAttribute('href')?.startsWith('/wiki/')) return;
      noteNavigation(anchor.closest('aside') ? 'sidebar' : 'content');
    };

    // Browser back/forward buttons.
    const onPopState = () => noteNavigation('history');

    const onVisibility = () => {
      const hidden = document.hidden;
      setVisible(!hidden);
      if (hidden && sessionRef.current) syncIfNeeded(sessionRef.current, { beacon: true });
    };

    // Backup for browsers that close the tab without a visibility change.
    const onPageHide = () => {
      if (sessionRef.current) syncIfNeeded(sessionRef.current, { beacon: true });
    };

    const onScroll = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      recordScroll(docHeight > 0 ? Math.min(100, (window.scrollY / docHeight) * 100) : 100);
    };

    const heartbeat = setInterval(() => {
      if (sessionRef.current && !document.hidden) syncIfDirty(sessionRef.current);
    }, HEARTBEAT_MS);

    document.addEventListener('click', onClick, true);
    window.addEventListener('popstate', onPopState);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      document.removeEventListener('click', onClick, true);
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('scroll', onScroll);
      clearInterval(heartbeat);
    };
  }, [session]);

  const initialiseSession = async (prolificId: string) => {
    const urlParams = new URLSearchParams(window.location.search);
    const studyId = urlParams.get('STUDY_ID');
    const urlSessionId = urlParams.get('SESSION_ID');

    const newSession: ParticipantSession = {
      userId: crypto.randomUUID(),
      prolificPid: prolificId.trim(),
      sessionId: urlSessionId || crypto.randomUUID(),
      prolificSessionId: urlSessionId || null,
      studyId: studyId || null,
      appVersion: process.env.NEXT_PUBLIC_CF_PAGES_COMMIT_SHA?.slice(0, 8) ?? 'dev',
    };

    storeSession(newSession);
    resetPayload();
    setSession(newSession);
    setIsInitialised(true);

    // Creates the participant's row straight away, so someone who enters
    // their ID and leaves before opening a page is still recorded.
    syncPayload(newSession);
  };

  return (
    <TelemetryContext.Provider value={{ session, isInitialised, initialiseSession }}>
      {children}
    </TelemetryContext.Provider>
  );
}

export function useTelemetrySession() {
  const context = useContext(TelemetryContext);
  if (!context) {
    // Return a safe fallback during Next.js static build passes instead of crashing
    return {
      session: null,
      isInitialised: false,
      initialiseSession: async () => {},
    };
  }
  return context;
}