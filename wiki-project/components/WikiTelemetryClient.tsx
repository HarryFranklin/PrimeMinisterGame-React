'use client';

import { useEffect, useRef } from 'react';
import { useTelemetrySession } from '@/context/TelemetryContext';
import { WORKER_URL, getNextViewIndex, trackWikiEvent } from '@/lib/telemetry';

interface TelemetryProps {
  slug: string;
  title: string;
  wordCount: number;
}

const WPM = 238; // Standard reading speed baseline

export default function WikiTelemetryClient({ slug, title, wordCount }: TelemetryProps) {
  // Safely handle context during server-side prerendering / static exports
  const telemetry = useTelemetrySession();
  const session = telemetry?.session;
  const isInitialised = telemetry?.isInitialised ?? false;

  const hasMounted = useRef(false);
  const viewId = useRef<string>('');
  const viewIndex = useRef<number>(0);
  const enteredAt = useRef<number>(0);
  const activeDurationMs = useRef<number>(0);
  const lastActiveTimestamp = useRef<number>(0);
  const maxScrollPct = useRef<number>(0);

  useEffect(() => {
    // Skip entirely during SSR / static build or before session is initialised by modal
    if (typeof window === 'undefined' || !isInitialised || !session || hasMounted.current) return;
    hasMounted.current = true;

    viewId.current = crypto.randomUUID();
    viewIndex.current = getNextViewIndex();
    enteredAt.current = Date.now();
    lastActiveTimestamp.current = enteredAt.current;

    const expectedReadingSeconds = Math.ceil((wordCount / WPM) * 60);

    // 1. Initial Page Arrival Ping
    const arrivalPayload = {
      user_id: session.userId,
      prolific_pid: session.prolificPid,
      session_id: session.sessionId,
      prolific_session_id: session.prolificSessionId,
      study_id: session.studyId,
      view_id: viewId.current,
      page_slug: slug,
      page_title: title,
      view_index: viewIndex.current,
      word_count: wordCount,
      expected_reading_seconds: expectedReadingSeconds,
      entered_at: enteredAt.current,
    };

    fetch(`${WORKER_URL}/wiki-page-view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(arrivalPayload),
      keepalive: true,
    }).catch(console.error);

    // 2. Tab Visibility Tracking (Dwell Time Calibration)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        activeDurationMs.current += Date.now() - lastActiveTimestamp.current;
      } else {
        lastActiveTimestamp.current = Date.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 3. Scroll Depth Tracking
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPct = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 100;
      if (scrollPct > maxScrollPct.current) {
        maxScrollPct.current = Math.round(scrollPct);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // 4. Link Interaction Tracking
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (anchor && anchor.href) {
        trackWikiEvent(session, slug, 'link_click', {
          href: anchor.getAttribute('href'),
          text: anchor.innerText.trim(),
        });
      }
    };
    document.addEventListener('click', handleLinkClick);

    // 5. Page Departure Logging
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('click', handleLinkClick);

      if (!document.hidden) {
        activeDurationMs.current += Date.now() - lastActiveTimestamp.current;
      }

      const leftAt = Date.now();
      const totalDurationMs = leftAt - enteredAt.current;
      const minReadingTimeMs = expectedReadingSeconds * 0.75 * 1000;
      const metMinimum = activeDurationMs.current >= minReadingTimeMs;

      const departurePayload = {
        user_id: session.userId,
        prolific_pid: session.prolificPid,
        prolific_session_id: session.prolificSessionId,
        session_id: session.sessionId,
        study_id: session.studyId,
        view_id: viewId.current,
        left_at: leftAt,
        duration_ms: totalDurationMs,
        active_duration_ms: activeDurationMs.current,
        max_scroll_pct: maxScrollPct.current,
        met_minimum_reading_time: metMinimum,
      };

      // Replace navigator.sendBeacon with a keepalive fetch
      fetch(`${WORKER_URL}/wiki-page-view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(departurePayload),
        keepalive: true,
      }).catch(console.error);
    };
  }, [slug, title, wordCount, isInitialised, session]);

  return null;
}