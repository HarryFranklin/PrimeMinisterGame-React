import { useEffect, useRef, useCallback } from "react";
import { track } from "./telemetry";

/** Generic scroll-depth tracker for any scrollable container.
 * Attach `ref` to the scrolling element; call `getMaxScrollPct()` when you
 * need the reading (e.g. on modal close). */
function useScrollDepthRef<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const maxPct = useRef(0);

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const scrollable = el.scrollHeight - el.clientHeight;
    if (scrollable <= 0) {
      maxPct.current = 100; // nothing to scroll = fully "seen"
      return;
    }
    const pct = Math.min(100, Math.round((el.scrollTop / scrollable) * 100));
    if (pct > maxPct.current) maxPct.current = pct;
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // capture initial state (e.g. content that already fits without scrolling)
    return () => el.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  const getMaxScrollPct = useCallback(() => maxPct.current, []);
  const isScrollable = useCallback(() => {
    const el = ref.current;
    return !!el && el.scrollHeight - el.clientHeight > 4;
  }, []);

  return { ref, getMaxScrollPct, isScrollable };
}

/**
 * Wire onto any modal. Fires modal_opened when mounted/shown, and returns a
 * `close(reason?)` function to call from your close handler — it computes
 * dwell time and max scroll depth automatically.
 *
 * Usage:
 *   const { scrollRef, close } = useModalTelemetry("policy_detail", "info");
 *   <div ref={scrollRef} onClick={() => close()}>...</div>
 */
export function useModalTelemetry(modalId: string, modalType: string) {
  const openedAt = useRef<number>(Date.now());
  const closedRef = useRef(false);
  const { ref: scrollRef, getMaxScrollPct, isScrollable } = useScrollDepthRef<HTMLDivElement>();

  useEffect(() => {
    openedAt.current = Date.now();
    closedRef.current = false;
    track("modal_opened", { modal_id: modalId, modal_type: modalType, scrollable: isScrollable() });
    // fire once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalId]);

  const close = useCallback(() => {
    if (closedRef.current) return; // avoid double-firing on unmount + explicit close
    closedRef.current = true;
    track("modal_closed", {
      modal_id: modalId,
      modal_type: modalType,
      dwell_ms: Date.now() - openedAt.current,
      scrollable: isScrollable(),
      max_scroll_pct: getMaxScrollPct(),
    });
  }, [modalId, modalType, getMaxScrollPct, isScrollable]);

  // catch the case where the component just unmounts without an explicit close
  useEffect(() => () => close(), [close]);

  return { scrollRef, close };
}

/**
 * Dialogue/text reading. Call `onAdvance()` from the "Continue"/dismiss
 * handler; it computes words-per-minute from dwell time and character count.
 */
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

/** Level select screen: tracks whether they viewed and how quickly they hit Continue. */
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

/**
 * "View Details" on a policy. Call `open()` when opened, and
 * `close(resultingAction)` when it closes — pass what happened right after:
 * did they dismiss, keep the same policy, or pick a different one.
 */
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

/** Fire-and-forget hover tracking for tooltips / info icons.
 * Throttled per (tooltip_id) per mount so mouse jitter doesn't spam events —
 * only the first hover in a given "visit" to the component is recorded. */
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

/** Generic scroll-depth tracker for non-modal panels (e.g. a long policy list). */
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