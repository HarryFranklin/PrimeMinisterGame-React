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
    // Check localStorage on initial mount
    const existing = getStoredSession();
    if (existing) {
      setSession(existing);
      setIsInitialised(true);
    }
  }, []);

  const initialiseSession = async (prolificId: string) => {
    // Extract optional study/session parameters from URL if present
    const urlParams = new URLSearchParams(window.location.search);
    const studyId = urlParams.get('STUDY_ID');
    const urlSessionId = urlParams.get('SESSION_ID');

    const newSession: ParticipantSession = {
      userId: crypto.randomUUID(),
      prolificPid: prolificId.trim(),
      sessionId: urlSessionId || crypto.randomUUID(),
      studyId: studyId || null,
      appVersion: process.env.NEXT_PUBLIC_CF_PAGES_COMMIT_SHA?.slice(0, 8) ?? 'dev',
    };

    storeSession(newSession);
    setSession(newSession);
    setIsInitialised(true);

    // Sync to Cloudflare D1
    await registerParticipant(newSession);
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
    throw new Error('useTelemetrySession must be used within a TelemetryProvider');
  }
  return context;
}