import { useEffect, useCallback, useRef } from 'react';
import { safeSetItem } from '@study';

export const SAVE_KEY = 'policy-sim-save-v3';

export function useSaveGame(
  snapshot: any,
  onLoad: (parsedData: any) => void,
  onLoadError: () => void
) {
  const loadedRef = useRef(false);

  // Load game effect
  useEffect(() => {
    const savedGame = localStorage.getItem(SAVE_KEY);
    if (savedGame) {
      try {
        const parsed = JSON.parse(savedGame);
        onLoad(parsed);
      } catch (e) {
        console.error("Failed to load save file, starting fresh.", e);
        localStorage.removeItem(SAVE_KEY);
        onLoadError();
      }
    } else {
      onLoadError();
    }
    loadedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save game effect (Serialises the entire snapshot to prevent desyncs)
  useEffect(() => {
    if (!loadedRef.current) return;
    if (!snapshot.population || snapshot.population.length === 0 || !snapshot.cycleSchedule || snapshot.cycleSchedule.length === 0) {
        return;
    }
    // Never throws (a full browser storage used to crash the game here); if
    // storage is full, throwaway data is cleared and the save retried.
    if (!safeSetItem(SAVE_KEY, JSON.stringify(snapshot))) console.warn('Game: could not save progress to browser storage (full?)');
  }, [snapshot]);

  const wipeSave = useCallback(() => {
    localStorage.removeItem(SAVE_KEY);
  }, []);

  return { wipeSave };
}