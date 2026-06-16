import { useEffect, useCallback, useRef } from 'react';

export const SAVE_KEY = 'policy-sim-save-v1';

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
    localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
  }, [snapshot]);

  const wipeSave = useCallback(() => {
    localStorage.removeItem(SAVE_KEY);
  }, []);

  return { wipeSave };
}