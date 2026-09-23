'use client';

import { useEffect } from 'react';
import { useTelemetrySession } from '@/context/TelemetryContext';
import { useCompletion } from '@/context/CompletionContext';
import { startView, endView } from '@/lib/telemetry';

interface TelemetryProps {
  slug: string;
  title: string;
  wordCount: number;
}

/** Opens a page view when a wiki page appears and closes it when the page
 * changes or unmounts. Nothing is sent to the database here: the view is
 * added to the local payload, which goes up with the next sync. Tab
 * visibility, scroll depth and link sources are tracked in TelemetryProvider. */
export default function WikiTelemetryClient({ slug, wordCount }: TelemetryProps) {
  const { session, isInitialised } = useTelemetrySession();
  const { visitPage } = useCompletion();

  useEffect(() => {
    if (!isInitialised || !session) return;
    visitPage(slug);
    startView(slug, wordCount);
    return () => endView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, isInitialised, session]);

  return null;
}