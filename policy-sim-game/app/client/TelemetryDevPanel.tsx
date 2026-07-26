import { useEffect, useMemo, useState } from "react";
import {
  isTelemetryDebugEnabled,
  subscribeToEvents,
  setConsoleLogging,
  isConsoleLoggingEnabled,
  downloadLog,
  clearLog,
  getFullLog,
  type LoggedEvent,
} from "./telemetry";

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour12: false }) + "." + String(d.getMilliseconds()).padStart(3, "0");
}

const LAYER_COLORS: Record<string, string> = {
  raw: "#6b7078",
  semantic: "#3b6ef2",
  derived: "#a875f0",
};

function EventEntry({ e }: { e: LoggedEvent }) {
  return (
    <details style={styles.entry}>
      <summary style={styles.entrySummary}>
        <span style={styles.entryTime}>{formatTime(e.ts)}</span>
        {e.level_id && <span style={styles.tag}>lvl:{e.level_id}</span>}
        {e.attempt_number !== undefined && <span style={styles.tag}>#{e.attempt_number}</span>}
        {e.turn !== undefined && <span style={styles.tag}>turn:{e.turn}</span>}
        {e.ms_since_last_same_event !== null && (
          <span style={styles.tagMuted}>+{e.ms_since_last_same_event}ms since last {e.event}</span>
        )}
      </summary>
      <pre style={styles.pre}>{JSON.stringify({ payload: e.payload, ms_since_last_event: e.ms_since_last_event }, null, 2)}</pre>
    </details>
  );
}

function GroupedLog({ log }: { log: LoggedEvent[] }) {
  const groups = useMemo(() => {
    const m = new Map<string, LoggedEvent[]>();
    for (const e of log) {
      if (!m.has(e.event)) m.set(e.event, []);
      m.get(e.event)!.push(e);
    }
    // most-recently-active groups first
    return [...m.entries()].sort((a, b) => {
      const aLast = a[1][a[1].length - 1]?.ts ?? 0;
      const bLast = b[1][b[1].length - 1]?.ts ?? 0;
      return bLast - aLast;
    });
  }, [log]);

  if (groups.length === 0) {
    return <div style={styles.empty}>No events yet — go interact with the game.</div>;
  }

  return (
    <div>
      {groups.map(([eventName, entries]) => {
        const layer = entries[0]?.layer ?? "semantic";
        return (
          <details key={eventName} open={layer !== "raw"} style={styles.group}>
            <summary style={styles.groupSummary}>
              <span style={{ ...styles.layerDot, background: LAYER_COLORS[layer] }} />
              {eventName} <span style={styles.count}>({entries.length})</span>
            </summary>
            <div style={styles.groupBody}>
              {entries
                .slice()
                .reverse()
                .map((e, i) => (
                  <EventEntry key={i} e={e} />
                ))}
            </div>
          </details>
        );
      })}
    </div>
  );
}

function TimelineView({ log }: { log: LoggedEvent[] }) {
  const attempts = useMemo(() => {
    const seen = new Map<string, { attempt_id: string; level_id?: string; attempt_number?: number; started_at: number }>();
    for (const e of log) {
      if (!e.attempt_id) continue;
      if (!seen.has(e.attempt_id)) {
        seen.set(e.attempt_id, { attempt_id: e.attempt_id, level_id: e.level_id, attempt_number: e.attempt_number, started_at: e.ts });
      }
    }
    return [...seen.values()].sort((a, b) => b.started_at - a.started_at); // most recent first
  }, [log]);

  const [selected, setSelected] = useState<string | null>(null);
  const activeAttemptId = selected ?? attempts[0]?.attempt_id ?? null;
  const timeline = useMemo(
    () => (activeAttemptId ? log.filter((e) => e.attempt_id === activeAttemptId).sort((a, b) => a.ts - b.ts) : []),
    [log, activeAttemptId]
  );

  if (attempts.length === 0) {
    return <div style={styles.empty}>No attempts yet — call startLevelAttempt() when a level begins.</div>;
  }

  return (
    <div>
      <select
        style={styles.select}
        value={activeAttemptId ?? ""}
        onChange={(e) => setSelected(e.target.value)}
      >
        {attempts.map((a) => (
          <option key={a.attempt_id} value={a.attempt_id}>
            {a.level_id ?? "?"} — attempt #{a.attempt_number ?? "?"} ({new Date(a.started_at).toLocaleTimeString()})
          </option>
        ))}
      </select>
      <div style={{ marginTop: 8 }}>
        {timeline.map((e, i) => (
          <div key={i} style={styles.timelineRow}>
            <span style={styles.entryTime}>{formatTime(e.ts)}</span>
            <span style={{ ...styles.layerDot, background: LAYER_COLORS[e.layer] }} />
            <span style={styles.timelineEvent}>{e.event}</span>
            {e.turn !== undefined && <span style={styles.tagMuted}>turn {e.turn}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TelemetryDevPanel() {
  const [enabled] = useState(() => isTelemetryDebugEnabled());
  const [open, setOpen] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grouped" | "timeline">("grouped");
  const [consoleOn, setConsoleOn] = useState(() => isConsoleLoggingEnabled());
  const [log, setLog] = useState<LoggedEvent[]>(() => getFullLog());

  useEffect(() => {
    if (!enabled) return;
    return subscribeToEvents((_entry, fullLog) => setLog([...fullLog]));
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div style={styles.root}>
      {!open && (
        <button style={styles.tab} onClick={() => setOpen(true)}>
          🔭 Telemetry ({log.length})
        </button>
      )}

      {open && (
        <div style={styles.panel}>
          <div style={styles.header}>
            <strong>Telemetry (dev)</strong>
            <button style={styles.iconButton} onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>

          <div style={styles.controls}>
            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={consoleOn}
                onChange={(e) => {
                  setConsoleOn(e.target.checked);
                  setConsoleLogging(e.target.checked);
                }}
              />
              Log to console
            </label>
            <button style={styles.smallButton} onClick={() => setDataOpen((v) => !v)}>
              {dataOpen ? "Hide live data" : "Show live data"}
            </button>
            <button style={styles.smallButton} onClick={() => downloadLog()}>
              Download JSON
            </button>
            <button
              style={styles.smallButtonDanger}
              onClick={() => {
                clearLog();
                setLog([]);
              }}
            >
              Clear
            </button>
          </div>

          {dataOpen && (
            <>
              <div style={styles.viewToggle}>
                <button
                  style={viewMode === "grouped" ? styles.viewTabActive : styles.viewTab}
                  onClick={() => setViewMode("grouped")}
                >
                  Grouped by type
                </button>
                <button
                  style={viewMode === "timeline" ? styles.viewTabActive : styles.viewTab}
                  onClick={() => setViewMode("timeline")}
                >
                  Timeline (per attempt)
                </button>
              </div>
              <div style={styles.dataView}>
                {viewMode === "grouped" ? <GroupedLog log={log} /> : <TimelineView log={log} />}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { position: "fixed", bottom: 16, right: 16, zIndex: 99999, fontFamily: "-apple-system, system-ui, sans-serif" },
  tab: {
    background: "#1e2129",
    color: "#e6e6e6",
    border: "1px solid #2a2e38",
    borderRadius: 20,
    padding: "8px 14px",
    fontSize: 13,
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
  },
  panel: {
    width: 420,
    maxHeight: "70vh",
    display: "flex",
    flexDirection: "column",
    background: "#16181d",
    border: "1px solid #2a2e38",
    borderRadius: 10,
    boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
    color: "#e6e6e6",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    borderBottom: "1px solid #2a2e38",
    fontSize: 13,
  },
  iconButton: { background: "none", border: "none", color: "#8a8f98", cursor: "pointer", fontSize: 14 },
  controls: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", padding: "10px 12px", borderBottom: "1px solid #2a2e38" },
  checkboxRow: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#c9cdd6" },
  smallButton: {
    background: "#262a33",
    color: "#e6e6e6",
    border: "1px solid #333844",
    borderRadius: 6,
    padding: "5px 10px",
    fontSize: 12,
    cursor: "pointer",
  },
  smallButtonDanger: {
    background: "#3a2226",
    color: "#f28b82",
    border: "1px solid #4a2a2f",
    borderRadius: 6,
    padding: "5px 10px",
    fontSize: 12,
    cursor: "pointer",
  },
  dataView: { overflowY: "auto", padding: "8px 12px 12px" },
  viewToggle: { display: "flex", gap: 4, padding: "8px 12px 0" },
  viewTab: {
    background: "none",
    color: "#8a8f98",
    border: "1px solid #2a2e38",
    borderRadius: 6,
    padding: "4px 10px",
    fontSize: 11,
    cursor: "pointer",
  },
  viewTabActive: {
    background: "#262a33",
    color: "#e6e6e6",
    border: "1px solid #3b6ef2",
    borderRadius: 6,
    padding: "4px 10px",
    fontSize: 11,
    cursor: "pointer",
  },
  select: {
    width: "100%",
    background: "#0f1115",
    color: "#e6e6e6",
    border: "1px solid #2a2e38",
    borderRadius: 6,
    padding: "6px 8px",
    fontSize: 12,
  },
  timelineRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 11,
    padding: "3px 0",
    borderBottom: "1px solid #1c1f26",
  },
  timelineEvent: { color: "#c9cdd6", flex: 1 },
  layerDot: { width: 6, height: 6, borderRadius: "50%", flexShrink: 0 },
  empty: { color: "#8a8f98", fontSize: 12, padding: "12px 0" },
  group: { marginBottom: 6, border: "1px solid #23262e", borderRadius: 6, overflow: "hidden" },
  groupSummary: {
    background: "#1e2129",
    padding: "8px 10px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    listStyle: "none",
  },
  groupBody: { padding: "4px 10px 8px" },
  count: { color: "#8a8f98", fontWeight: 400 },
  entry: { marginTop: 4, borderTop: "1px solid #23262e", paddingTop: 4 },
  entrySummary: { display: "flex", gap: 8, alignItems: "center", cursor: "pointer", fontSize: 11, listStyle: "none" },
  entryTime: { color: "#8a8f98", fontVariantNumeric: "tabular-nums" },
  tag: { background: "#262a33", borderRadius: 4, padding: "1px 6px", color: "#c9cdd6" },
  tagMuted: { color: "#6b7078" },
  pre: {
    background: "#0f1115",
    border: "1px solid #23262e",
    borderRadius: 4,
    padding: 8,
    fontSize: 11,
    overflowX: "auto",
    marginTop: 4,
  },
};