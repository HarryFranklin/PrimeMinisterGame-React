import { useEffect, useRef, useCallback, useState } from "react";
import { track, startTimer, stopTimer } from "./telemetry";

// ---------------------------------------------------------------------------
// Internal helper — tracks max scroll depth on a scrollable container.
// Shared by useModalTelemetry and usePanelScrollTelemetry.
// ---------------------------------------------------------------------------
function useScrollDepthRef<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const maxPct = useRef(0);

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const scrollable = el.scrollHeight - el.clientHeight;
    if (scrollable <= 0) {
      maxPct.current = 100;
      return;
    }
    const pct = Math.min(100, Math.round((el.scrollTop / scrollable) * 100));
    if (pct > maxPct.current) maxPct.current = pct;
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  const getMaxScrollPct = useCallback(() => maxPct.current, []);
  const isScrollable = useCallback(() => {
    const el = ref.current;
    return !!el && el.scrollHeight - el.clientHeight > 4;
  }, []);

  return { ref, getMaxScrollPct, isScrollable };
}

// ---------------------------------------------------------------------------
// useModalTelemetry
// Wire onto any modal. Fires modal_opened on mount, returns close() to call
// from your close handler (computes dwell + scroll depth automatically).
//
// Usage:
//   const { scrollRef, close } = useModalTelemetry("policy_detail", "info");
//   <div ref={scrollRef} onClick={() => close()}>...</div>
// ---------------------------------------------------------------------------
export function useModalTelemetry(modalId: string, modalType: string) {
  const openedAt = useRef<number>(Date.now());
  const closedRef = useRef(false);
  const { ref: scrollRef, getMaxScrollPct, isScrollable } = useScrollDepthRef<HTMLDivElement>();

  useEffect(() => {
    openedAt.current = Date.now();
    closedRef.current = false;
    track("modal_opened", { modal_id: modalId, modal_type: modalType, scrollable: isScrollable() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalId]);

  const close = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    track("modal_closed", {
      modal_id: modalId,
      modal_type: modalType,
      dwell_ms: Date.now() - openedAt.current,
      scrollable: isScrollable(),
      max_scroll_pct: getMaxScrollPct(),
    });
  }, [modalId, modalType, getMaxScrollPct, isScrollable]);

  useEffect(() => () => close(), [close]);

  return { scrollRef, close };
}

// ---------------------------------------------------------------------------
// useDialogueTelemetry
// Tracks dialogue shown + dwell time when the player advances past it.
// Call onAdvance() from your Continue/dismiss handler.
// ---------------------------------------------------------------------------
export function useDialogueTelemetry(textId: string, text: string) {
  const shownAt = useRef<number>(Date.now());

  useEffect(() => {
    shownAt.current = Date.now();
    track("dialogue_shown", { text_id: textId, char_count: text.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textId]);

  const onAdvance = useCallback(() => {
    const dwellMs = Date.now() - shownAt.current;
    const words = text.length / 5;
    const minutes = dwellMs / 60000;
    const wpm = minutes > 0 ? Math.round(words / minutes) : 9999;
    track("dialogue_advanced", { text_id: textId, char_count: text.length, dwell_ms: dwellMs, reading_speed_wpm: wpm });
  }, [textId, text]);

  return { onAdvance };
}

// ---------------------------------------------------------------------------
// useLevelSelectTelemetry
// Tracks time on level select and whether they clicked any graphs/history.
// ---------------------------------------------------------------------------
export function useLevelSelectTelemetry(levelId: string) {
  const viewedAt = useRef<number>(Date.now());
  const openedDetails = useRef(false);

  useEffect(() => {
    viewedAt.current = Date.now();
    openedDetails.current = false;
    track("level_select_viewed", { level_id: levelId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelId]);

  const markDetailsOpened = useCallback(() => {
    openedDetails.current = true;
  }, []);

  const onContinue = useCallback(() => {
    track("level_select_continue_clicked", {
      level_id: levelId,
      dwell_ms: Date.now() - viewedAt.current,
      opened_details: openedDetails.current,
    });
  }, [levelId]);

  return { markDetailsOpened, onContinue };
}

// ---------------------------------------------------------------------------
// useViewDetailsTelemetry
// "View Details" on a policy. Call open() when opened, close(action) when it
// closes — pass what happened next: dismissed / picked_same / picked_other.
// ---------------------------------------------------------------------------
export function useViewDetailsTelemetry(policyId: string, turn: number) {
  const openedAt = useRef<number | null>(null);

  const open = useCallback(() => {
    openedAt.current = Date.now();
    track("view_details_opened", { policy_id: policyId, turn });
  }, [policyId, turn]);

  const close = useCallback(
    (resultingAction: "dismissed" | "picked_same_policy" | "picked_other_policy") => {
      if (openedAt.current === null) return;
      track("view_details_closed", {
        policy_id: policyId,
        turn,
        dwell_ms: Date.now() - openedAt.current,
        resulting_action: resultingAction,
      });
      openedAt.current = null;
    },
    [policyId, turn]
  );

  return { open, close };
}

// ---------------------------------------------------------------------------
// useTooltipTelemetry
// Fire-and-forget hover tracking for tooltips / info icons.
// Throttled per (tooltip_id) per mount so mouse jitter doesn't spam.
// ---------------------------------------------------------------------------
export function useTooltipTelemetry() {
  const seen = useRef<Set<string>>(new Set());

  const trackHover = useCallback((tooltipType: string, tooltipId: string, turn?: number) => {
    const key = `${tooltipType}:${tooltipId}`;
    if (seen.current.has(key)) return;
    seen.current.add(key);
    track("tooltip_hovered", { tooltip_type: tooltipType, tooltip_id: tooltipId, turn });
  }, []);

  return { trackHover };
}

// ---------------------------------------------------------------------------
// usePanelScrollTelemetry
// Generic scroll-depth for non-modal panels (e.g. a long policy list).
// ---------------------------------------------------------------------------
export function usePanelScrollTelemetry(panelId: string) {
  const { ref, getMaxScrollPct } = useScrollDepthRef<HTMLDivElement>();

  useEffect(() => {
    return () => {
      track("panel_scrolled", { panel_id: panelId, max_scroll_pct: getMaxScrollPct() });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelId]);

  return { ref };
}

// ---------------------------------------------------------------------------
// useTypewriterTelemetry
// Wraps a typewriter sequence to capture:
//   - when/whether the player skipped the text
//   - % through the text they were when they skipped
//
// Call onSkip() from the skip handler, onComplete() when typing finishes
// naturally, and getSkipInfo() to read the result before firing your
// semantic event (e.g. briefing_proceeded).
//
// Usage:
//   const tw = useTypewriterTelemetry(text);
//   // in your skip handler:  tw.onSkip();  skip();
//   // in your proceed handler: const info = tw.getSkipInfo(); track(...)
// ---------------------------------------------------------------------------
export function useTypewriterTelemetry(text: string) {
  const startedAt = useRef(Date.now());
  const skippedAt = useRef<number | null>(null);
  const displayedLengthRef = useRef(0); // caller should update this each render

  const reset = useCallback(() => {
    startedAt.current = Date.now();
    skippedAt.current = null;
    displayedLengthRef.current = 0;
  }, []);

  // Call this every render with displayedText.length so we can compute % seen on skip
  const updateDisplayed = useCallback((len: number) => {
    displayedLengthRef.current = len;
  }, []);

  const onSkip = useCallback(() => {
    skippedAt.current = Date.now();
  }, []);

  const getSkipInfo = useCallback(() => {
    const elapsed = (skippedAt.current ?? Date.now()) - startedAt.current;
    const pct_seen =
      text.length > 0
        ? Math.round((displayedLengthRef.current / text.length) * 100)
        : 100;
    return {
      was_skipped: skippedAt.current !== null,
      elapsed_ms: elapsed,
      pct_seen,
    };
  }, [text]);

  return { reset, updateDisplayed, onSkip, getSkipInfo };
}

// ---------------------------------------------------------------------------
// useTurnTimer
// Simple named timer scoped to a turn. start() on turn_started,
// stop() returns elapsed ms for the time_on_turn_ms payload field.
//
// The underlying startTimer/stopTimer in telemetry.ts is a plain Map so this
// is just a thin convenience wrapper that names the key consistently.
// ---------------------------------------------------------------------------
export function useTurnTimer() {
  const timerKey = "turn_active";

  const start = useCallback(() => {
    startTimer(timerKey);
  }, []);

  const stop = useCallback((): number => {
    return stopTimer(timerKey);
  }, []);

  return { start, stop };
}

// ---------------------------------------------------------------------------
// useDwellTimer
// Generic start/stop dwell timer for any stage/screen.
// Returns elapsed ms when stop() is called. Safe to call stop multiple times.
//
// Usage:
//   const dwell = useDwellTimer();
//   useEffect(() => { dwell.start(); }, []);
//   // on proceed: const ms = dwell.stop(); track("foo_closed", { dwell_ms: ms });
// ---------------------------------------------------------------------------
export function useDwellTimer() {
  const startedAt = useRef<number | null>(null);
  const stopped = useRef<number | null>(null);

  const start = useCallback(() => {
    startedAt.current = Date.now();
    stopped.current = null;
  }, []);

  const stop = useCallback((): number => {
    if (stopped.current !== null) return stopped.current;
    if (startedAt.current === null) return 0;
    stopped.current = Date.now() - startedAt.current;
    return stopped.current;
  }, []);

  const peek = useCallback((): number => {
    if (stopped.current !== null) return stopped.current;
    return startedAt.current !== null ? Date.now() - startedAt.current : 0;
  }, []);

  return { start, stop, peek };
}

// ---------------------------------------------------------------------------
// useFirstInteractionTimer
// For screens like Academic Debrief where you want to track both:
//   a) time until first interaction
//   b) time between last interaction and clicking Proceed
//
// Call markInteraction() on every interactive click/reveal.
// Call getFinalTimes() just before the Proceed handler fires.
// ---------------------------------------------------------------------------
export function useFirstInteractionTimer() {
  const mountedAt = useRef(Date.now());
  const firstInteractionAt = useRef<number | null>(null);
  const lastInteractionAt = useRef<number | null>(null);

  const markInteraction = useCallback(() => {
    const now = Date.now();
    if (firstInteractionAt.current === null) firstInteractionAt.current = now;
    lastInteractionAt.current = now;
  }, []);

  const getFinalTimes = useCallback(() => {
    const now = Date.now();
    return {
      time_to_first_ms: firstInteractionAt.current !== null
        ? firstInteractionAt.current - mountedAt.current
        : now - mountedAt.current,
      idle_before_proceed_ms: lastInteractionAt.current !== null
        ? now - lastInteractionAt.current
        : now - mountedAt.current,
    };
  }, []);

  return { markInteraction, getFinalTimes };
}

// ---------------------------------------------------------------------------
// useEnactedPoliciesReview
// After turn 5, tracks how many policies the player viewed in the enacted
// policy history list and for how long before proceeding.
// ---------------------------------------------------------------------------
export function useEnactedPoliciesReview() {
  const openedAt = useRef<number | null>(null);
  const viewedCount = useRef(0);

  const onOpen = useCallback(() => {
    openedAt.current = Date.now();
  }, []);

  const onPolicyViewed = useCallback(() => {
    viewedCount.current += 1;
  }, []);

  /** Call just before the "Hold Press Conference" button is clicked. */
  const onProceed = useCallback((turn: number) => {
    if (openedAt.current === null) return;
    track("enacted_policies_reviewed", {
      turn,
      policies_viewed: viewedCount.current,
      dwell_ms: Date.now() - openedAt.current,
    });
  }, []);

  return { onOpen, onPolicyViewed, onProceed };
}