// Fullscreen for the game.
// Browsers only allow fullscreen straight after a click, and the player can
// always leave it (Esc). So: "Start game" switches to fullscreen, a small
// button offers to go back if they leave it, and "Continue to the final
// questions" leaves it again.
//
// Telemetry: fullscreen_requested {source, ok}, fullscreen_changed {fullscreen}
// (summarised in activity.flow by networkSink.ts).
import { track } from './telemetry';

type FsDocument = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => Promise<void> };
type FsElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };

export function isFullscreen(): boolean {
  if (typeof document === 'undefined') return false;
  const d = document as FsDocument;
  return !!(d.fullscreenElement || d.webkitFullscreenElement);
}

/** Call from a click handler. Never throws; records whether it worked. */
export function enterFullscreen(source: 'start' | 'nudge'): void {
  if (typeof document === 'undefined' || isFullscreen()) return;
  const el = document.documentElement as FsElement;
  const request = el.requestFullscreen?.bind(el) ?? el.webkitRequestFullscreen?.bind(el);
  if (!request) {
    track('fullscreen_requested', { source, ok: false });
    return;
  }
  try {
    Promise.resolve(request())
      .then(() => track('fullscreen_requested', { source, ok: true }))
      .catch(() => track('fullscreen_requested', { source, ok: false }));
  } catch {
    track('fullscreen_requested', { source, ok: false });
  }
}

export function exitFullscreen(): void {
  if (!isFullscreen()) return;
  const d = document as FsDocument;
  try {
    Promise.resolve((d.exitFullscreen ?? d.webkitExitFullscreen)?.call(d)).catch(() => {});
  } catch {
    /* ignore */
  }
}

/** Records every switch into / out of fullscreen. Returns an unsubscribe. */
export function trackFullscreenChanges(): () => void {
  if (typeof document === 'undefined') return () => {};
  const onChange = () => track('fullscreen_changed', { fullscreen: isFullscreen() });
  document.addEventListener('fullscreenchange', onChange);
  document.addEventListener('webkitfullscreenchange', onChange);
  return () => {
    document.removeEventListener('fullscreenchange', onChange);
    document.removeEventListener('webkitfullscreenchange', onChange);
  };
}

/** Re-renders when fullscreen changes (for the "Go full screen" button). */
export function subscribeFullscreen(cb: () => void): () => void {
  if (typeof document === 'undefined') return () => {};
  document.addEventListener('fullscreenchange', cb);
  document.addEventListener('webkitfullscreenchange', cb);
  return () => {
    document.removeEventListener('fullscreenchange', cb);
    document.removeEventListener('webkitfullscreenchange', cb);
  };
}
