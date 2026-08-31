'use client';

import { useEffect, useRef } from 'react';

interface TelemetryProps {
  slug: string;
  title: string;
  wordCount: number;
}

// Ensure you set this in your environment or hardcode the production worker URL
const WORKER_URL = process.env.NEXT_PUBLIC_TELEMETRY_WORKER_URL || 'https://wiki-telemetry-worker.franklinh.workers.dev';
const WPM = 238; 

export default function WikiTelemetryClient({ slug, title, wordCount }: TelemetryProps) {
  const hasInitialised = useRef(false);
  const viewId = useRef<string>('');
  const entryTime = useRef<number>(0);
  const activeTimeMs = useRef<number>(0);
  const lastActiveTimestamp = useRef<number>(0);
  const maxScroll = useRef<number>(0);

  useEffect(() => {
    if (hasInitialised.current) return;
    hasInitialised.current = true;

    // 1. Participant Tracking (Read from URL or generate anonymous ID)
    const urlParams = new URLSearchParams(window.location.search);
    const urlPid = urlParams.get('PROLIFIC_PID');
    const urlSession = urlParams.get('SESSION_ID');
    const urlStudy = urlParams.get('STUDY_ID');

    let userId = localStorage.getItem('wiki_user_id');
    if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem('wiki_user_id', userId);
    }

    const prolificPid = urlPid || localStorage.getItem('wiki_prolific_pid') || null;
    if (urlPid) localStorage.setItem('wiki_prolific_pid', urlPid);

    const participantData = {
      user_id: userId,
      prolific_pid: prolificPid,
      session_id: urlSession || null,
      study_id: urlStudy || null,
    };

    // 2. Initialise Page View
    viewId.current = crypto.randomUUID();
    entryTime.current = Date.now();
    lastActiveTimestamp.current = entryTime.current;
    
    const expectedReadingSeconds = Math.ceil((wordCount / WPM) * 60);

    const initialPayload = {
      ...participantData,
      view_id: viewId.current,
      page_slug: slug,
      page_title: title,
      word_count: wordCount,
      expected_reading_seconds: expectedReadingSeconds,
      entered_at: entryTime.current,
    };

    fetch(`${WORKER_URL}/wiki-page-view`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(initialPayload),
      keepalive: true,
    }).catch(console.error);

    // 3. Track Active Time (Pause timer when tab is hidden)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        activeTimeMs.current += Date.now() - lastActiveTimestamp.current;
      } else {
        lastActiveTimestamp.current = Date.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 4. Track Scroll Depth
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.body.scrollHeight - window.innerHeight;
      const scrollPct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 100;
      if (scrollPct > maxScroll.current) {
        maxScroll.current = scrollPct;
      }
    };
    const scrollListener = () => requestAnimationFrame(handleScroll);
    window.addEventListener('scroll', scrollListener);

    // 5. Track Link Clicks
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (anchor && anchor.href) {
        fetch(`${WORKER_URL}/wiki-event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...participantData,
            page_slug: slug,
            event_type: 'link_click',
            event_data: { href: anchor.href, text: anchor.innerText },
            occurred_at: Date.now(),
          }),
          keepalive: true,
        }).catch(console.error);
      }
    };
    document.addEventListener('click', handleGlobalClick);

    // 6. Finalise Page View on Unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('scroll', scrollListener);
      document.removeEventListener('click', handleGlobalClick);

      // Add final chunk of active time if tab was visible
      if (!document.hidden) {
        activeTimeMs.current += Date.now() - lastActiveTimestamp.current;
      }

      const leftAt = Date.now();
      const durationMs = leftAt - entryTime.current;
      const minReadingTimeMs = expectedReadingSeconds * 0.75 * 1000;
      const metMinimum = activeTimeMs.current >= minReadingTimeMs;

      const finalPayload = {
        ...participantData,
        view_id: viewId.current,
        left_at: leftAt,
        duration_ms: durationMs,
        active_duration_ms: activeTimeMs.current,
        max_scroll_pct: maxScroll.current,
        met_minimum_reading_time: metMinimum,
      };

      // sendBeacon is more reliable for page unloads/navigation than standard fetch
      const blob = new Blob([JSON.stringify(finalPayload)], { type: 'application/json' });
      navigator.sendBeacon(`${WORKER_URL}/wiki-page-view`, blob);
    };
  }, [slug, title, wordCount]);

  return null; // This is a logic-only component
}