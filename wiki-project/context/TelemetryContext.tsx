'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ParticipantSession, getStoredSession, storeSession, registerParticipant } from '@/lib/telemetry';

interface TelemetryContextType {
  session: ParticipantSession | null;
  isInitialised: boolean;
  initialiseSession: (prolificId: string) => Promise<void>;
}

const TelemetryContext = createContext<TelemetryContextType | undefined>(undefined);

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<ParticipantSession | null>(null);
  const [isInitialised, setIsInitialised] = useState<boolean>(false);

  useEffect(() => {
    const existing = getStoredSession();
    if (existing) {
      setSession(existing);
      setIsInitialised(true);
    }
  }, []);

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
    setSession(newSession);
    setIsInitialised(true);

    // Fire-and-forget: this call still matters (it's the only write that
    // captures a participant who enters their ID and bounces before ever
    // opening a wiki page), but there's no reason to hold the setup modal
    // open while it's in flight — every subsequent telemetry call upserts
    // the participant row again anyway, so nothing downstream depends on
    // this one finishing first.
    registerParticipant(newSession);
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
      initialiseSession: async () => {} 
    };
  }
  return context;
}