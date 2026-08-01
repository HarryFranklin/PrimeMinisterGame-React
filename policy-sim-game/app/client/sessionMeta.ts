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