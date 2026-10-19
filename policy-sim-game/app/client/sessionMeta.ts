// Captures Prolific's URL params once per participant and persists them so
// they survive a refresh/relaunch on the same device. This is the join key
// between telemetry events and Prolific submissions.

const META_KEY = "prolific_meta_v1";

export interface ProlificMeta {
  prolific_pid: string | null;
  study_id: string | null;
  prolific_session_id: string | null;
}

let cached: ProlificMeta | null = null;

export function getProlificMeta(): ProlificMeta {
  if (cached) return cached;
  if (typeof window === "undefined") {
    return { prolific_pid: null, study_id: null, prolific_session_id: null };
  }

  const params = new URLSearchParams(window.location.search);
  const fromUrl: ProlificMeta = {
    prolific_pid: params.get("PROLIFIC_PID"),
    study_id: params.get("STUDY_ID"),
    prolific_session_id: params.get("SESSION_ID"),
  };

  // URL params win when present (fresh arrival from a Prolific study link)
  // and get persisted so a mid-study refresh doesn't lose them.
  if (fromUrl.prolific_pid) {
    localStorage.setItem(META_KEY, JSON.stringify(fromUrl));
    cached = fromUrl;
    return cached;
  }

  try {
    const saved = localStorage.getItem(META_KEY);
    if (saved) {
      cached = JSON.parse(saved);
      return cached!;
    }
  } catch {
    // ignore corrupt data
  }

  cached = { prolific_pid: null, study_id: null, prolific_session_id: null };
  return cached;
}

// ---------------------------------------------------------------------------
// Life satisfaction from the baseline survey. Qualtrics adds ?LS=<0-10> to
// the game link; it's persisted so a mid-game refresh doesn't lose it. Kept
// separate from ProlificMeta so it isn't copied onto every telemetry event.
// ---------------------------------------------------------------------------

const LS_KEY = "baseline_ls_v1";

/** A whole number 0-10, or null if missing/invalid. */
export function parseLS(raw: string | null): number | null {
  if (raw === null || !/^\d{1,2}$/.test(raw.trim())) return null;
  const n = Number(raw.trim());
  return n >= 0 && n <= 10 ? n : null;
}

/** The participant's baseline LS from the URL (or saved from an earlier
 * visit in this browser), or null if the survey didn't pass one. */
export function getBaselineLS(): number | null {
  if (typeof window === "undefined") return null;
  const fromUrl = parseLS(new URLSearchParams(window.location.search).get("LS"));
  try {
    if (fromUrl !== null) {
      localStorage.setItem(LS_KEY, String(fromUrl));
      return fromUrl;
    }
    return parseLS(localStorage.getItem(LS_KEY));
  } catch {
    return fromUrl;
  }
}