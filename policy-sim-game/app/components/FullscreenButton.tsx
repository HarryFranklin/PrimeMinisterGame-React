'use client';
import React, { useSyncExternalStore } from 'react';
import { isFullscreen, enterFullscreen, subscribeFullscreen } from '../client/fullscreen';

/** Small "Go full screen" button, shown whenever the player is not in fullscreen:
 * on the title screen (source 'title', so they can switch before Start game) and
 * during the game (source 'nudge', e.g. after pressing Esc). Never blocks anything. */
export default function FullscreenButton({ source = 'nudge' }: { source?: 'nudge' | 'title' }) {
  const full = useSyncExternalStore(subscribeFullscreen, isFullscreen, () => true);
  if (full) return null;
  return (
    <button
      type="button"
      onClick={() => enterFullscreen(source)}
      className="fixed top-2 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-2 rounded-full bg-zinc-900/85 hover:bg-zinc-800 text-white text-xs font-bold px-3 py-1.5 shadow-lg border border-zinc-700 cursor-pointer"
      title="Play in full screen"
    >
      <span aria-hidden>⛶</span> Go full screen
    </button>
  );
}
