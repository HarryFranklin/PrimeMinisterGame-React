import { trackRaw } from "./telemetry";

// ---------------------------------------------------------------------------
// Layer 0 — raw capture.
//
// This is a BACKUP layer, not the primary source of truth.
// Your semantic track() calls in components/hooks are the primary signal.
// Raw capture exists so that "did they click X" has a ground-truth answer
// even if a semantic event was accidentally not wired up.
//
// Attach these attributes to elements you want in the raw log:
//   data-telemetry-id="policy_card_carbon_tax"   (required — identity)
//   data-telemetry-type="policy_card"             (optional — grouping)
//
// For scrollable containers:
//   data-telemetry-scroll-id="policy_list"
//
// KEY RULE: raw_click only fires on elements that have data-telemetry-id.
// Clicks on untagged elements are silently ignored — they add noise without
// value. Tag something deliberately if you want it in the raw log.
//
// Call once at app startup:
//   useEffect(() => startRawCapture(), []);
// ---------------------------------------------------------------------------

const HOVER_DWELL_THRESHOLD_MS = 150;
const SCROLL_SAMPLE_MS = 250;

function describeTarget(el: Element | null): { id: string; type: string; text: string } | null {
  const tagged = el?.closest("[data-telemetry-id]");
  if (!tagged) return null;
  return {
    id: tagged.getAttribute("data-telemetry-id") || "",
    type: tagged.getAttribute("data-telemetry-type") || "",
    text: (tagged.textContent || "").trim().slice(0, 60),
  };
}

let started = false;

export function startRawCapture() {
  if (started || typeof document === "undefined") return;
  started = true;

  // --- clicks — ONLY fire if the click landed on a tagged element ---
  document.addEventListener(
    "click",
    (e) => {
      const target = describeTarget(e.target as Element);
      if (!target) return; // ← ignore untagged clicks entirely
      trackRaw("raw_click", {
        target_id: target.id,
        target_type: target.type,
        target_text: target.text,
        x: e.clientX,
        y: e.clientY,
        disabled: (e.target as HTMLButtonElement)?.disabled ?? null,
      });
    },
    { capture: true }
  );

  // --- hover, with a dwell threshold so mouse-passing-through doesn't spam ---
  const hoverStarts = new Map<Element, number>();
  document.addEventListener(
    "mouseover",
    (e) => {
      const tagged = (e.target as Element)?.closest("[data-telemetry-id]");
      if (tagged && !hoverStarts.has(tagged)) hoverStarts.set(tagged, Date.now());
    },
    { capture: true }
  );
  document.addEventListener(
    "mouseout",
    (e) => {
      const tagged = (e.target as Element)?.closest("[data-telemetry-id]");
      if (!tagged) return;
      const start = hoverStarts.get(tagged);
      hoverStarts.delete(tagged);
      if (!start) return;
      const dwellMs = Date.now() - start;
      if (dwellMs < HOVER_DWELL_THRESHOLD_MS) return;
      trackRaw("raw_hover", {
        target_id: tagged.getAttribute("data-telemetry-id"),
        target_type: tagged.getAttribute("data-telemetry-type") || null,
        dwell_ms: dwellMs,
      });
    },
    { capture: true }
  );

  // --- scroll (only fires on elements tagged with data-telemetry-scroll-id) ---
  const lastScrollSample = new Map<Element, number>();
  document.addEventListener(
    "scroll",
    (e) => {
      const el = e.target as Element;
      if (!el || !("closest" in el)) return;
      const tagged = el.closest?.("[data-telemetry-scroll-id]") === el ? el : null;
      if (!tagged) return;

      const now = Date.now();
      if (now - (lastScrollSample.get(tagged) ?? 0) < SCROLL_SAMPLE_MS) return;
      lastScrollSample.set(tagged, now);

      const scrollable = tagged.scrollHeight - tagged.clientHeight;
      const pct = scrollable > 0 ? Math.min(100, Math.round((tagged.scrollTop / scrollable) * 100)) : 100;
      trackRaw("raw_scroll", {
        target_id: tagged.getAttribute("data-telemetry-scroll-id"),
        scroll_pct: pct,
      });
    },
    { capture: true }
  );

  // --- keys — only Enter/Space/Escape/Tab, and only on tagged elements ---
  document.addEventListener(
    "keydown",
    (e) => {
      if (!["Enter", " ", "Escape", "Tab"].includes(e.key)) return;
      const target = describeTarget(e.target as Element);
      if (!target) return; // ignore keydowns on untagged elements
      trackRaw("raw_keydown", { key: e.key, target_id: target.id });
    },
    { capture: true }
  );

  // --- tab visibility — this one is always useful regardless of tagging ---
  document.addEventListener("visibilitychange", () => {
    trackRaw("raw_visibility_change", { state: document.visibilityState });
  });
}