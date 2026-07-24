import { trackRaw } from "./telemetry";

// ---------------------------------------------------------------------------
// Layer 0 — raw capture.
//
// Attach these attributes to anything interactive:
//   data-telemetry-id="carbon_tax_policy_card"   (required — identity)
//   data-telemetry-type="policy_card"            (optional — grouping/category)
//
// Any tagged element automatically gets clicks + hover-dwell tracked, no
// per-component wiring needed. Scrollable containers additionally need:
//   data-telemetry-scroll-id="policy_list"
//
// This exists so debugging questions like "I saw them click X but the data
// says they didn't" have a ground-truth answer independent of whatever your
// semantic track() calls believe happened — and so behavior nobody thought
// to explicitly instrument still shows up in the log.
//
// Call once, after the DOM exists (e.g. in your root component's effect):
//   import { startRawCapture } from "./telemetry/rawCapture";
//   useEffect(() => startRawCapture(), []);
// ---------------------------------------------------------------------------

const HOVER_DWELL_THRESHOLD_MS = 150; // ignore mouse just passing over on the way elsewhere
const SCROLL_SAMPLE_MS = 250; // throttle scroll loglines per element

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

  // --- clicks ---
  document.addEventListener(
    "click",
    (e) => {
      const target = describeTarget(e.target as Element);
      trackRaw("raw_click", {
        target_id: target?.id ?? null,
        target_type: target?.type ?? null,
        target_text: target?.text ?? null,
        tagged: !!target,
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
      if (dwellMs < HOVER_DWELL_THRESHOLD_MS) return; // too brief to count as real hover
      trackRaw("raw_hover", {
        target_id: tagged.getAttribute("data-telemetry-id"),
        target_type: tagged.getAttribute("data-telemetry-type") || null,
        dwell_ms: dwellMs,
      });
    },
    { capture: true }
  );

  // --- scroll (capture phase catches descendant scroll containers too) ---
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

  // --- keys (mainly to catch Enter/Space-mashing through dialogue) ---
  document.addEventListener(
    "keydown",
    (e) => {
      if (!["Enter", " ", "Escape", "Tab"].includes(e.key)) return;
      const target = describeTarget(e.target as Element);
      trackRaw("raw_keydown", { key: e.key, target_id: target?.id ?? null });
    },
    { capture: true }
  );

  // --- tab visibility (did they alt-tab away mid-modal, etc.) ---
  document.addEventListener("visibilitychange", () => {
    trackRaw("raw_visibility_change", { state: document.visibilityState });
  });
}