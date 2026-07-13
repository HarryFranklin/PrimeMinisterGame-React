import { useEffect, useRef, useState } from 'react';

/**
 * Smoothly tweens a displayed number toward `target` using a cubic ease-out,
 * instead of snapping instantly. Extracted from DashboardTab, where this was
 * a 25-line inline useEffect used only for the Public Approval readout — the
 * logic itself is fully generic ("animate toward a number") and had nothing
 * dashboard-specific about it, so it belongs in its own hook.
 */
export function useAnimatedNumber(target: number, durationMs: number = 1200): number {
  const [displayValue, setDisplayValue] = useState(target);
  const displayRef = useRef(target);
  displayRef.current = displayValue;

  useEffect(() => {
    let animationFrameId: number;
    let startTime: number;
    const startValue = displayRef.current;
    const change = target - startValue;

    if (Math.abs(change) < 0.01) {
      setDisplayValue(target);
      return;
    }

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(startValue + change * easeProgress);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(target);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return displayValue;
}
