import { useEffect, useState } from "react";
import { subscribeSaveStatus, type SaveStatus } from "./telemetry";

/**
 * Pulses "Saving progress…" whenever an attempt is closed out (level
 * completed, or a retry abandons the previous attempt), then briefly shows
 * a checkmark before fading. Invisible the rest of the time.
 */
export function SavingIndicator() {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    return subscribeSaveStatus((s) => {
      setStatus(s);
      if (s === "saving") setVisible(true);
      if (s === "saved") {
        setVisible(true);
        const t = setTimeout(() => setVisible(false), 1500);
        return () => clearTimeout(t);
      }
    });
  }, []);

  if (!visible || status === "idle") return null;

  return (
    <div style={styles.wrap}>
      {status === "saving" ? (
        <>
          <span style={styles.dot} />
          <span style={styles.label}>Saving progress…</span>
        </>
      ) : (
        <>
          <span style={styles.check}>✓</span>
          <span style={styles.label}>Saved</span>
        </>
      )}
      <style>{`
        @keyframes telemetry-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontFamily: "-apple-system, system-ui, sans-serif",
    fontSize: 12,
    color: "#c9cdd6",
    background: "rgba(20,22,28,0.85)",
    padding: "5px 10px",
    borderRadius: 20,
    backdropFilter: "blur(4px)",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#3b6ef2",
    animation: "telemetry-pulse 1s ease-in-out infinite",
  },
  check: { color: "#5fd08a", fontWeight: 700 },
  label: { whiteSpace: "nowrap" },
};
