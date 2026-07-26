import React, { useEffect, useMemo, useState } from "react";
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
    <details className="mt-1 border-t border-zinc-800 pt-1 px-3 pb-2 [&::-webkit-details-marker]:hidden group/entry">
      <summary className="flex gap-2 items-center cursor-pointer text-[10px] text-zinc-400 hover:text-zinc-200 list-none select-none">
        <span className="text-zinc-500 font-mono shrink-0">{formatTime(e.ts)}</span>
        <span className="text-[8px] ml-auto transition-transform group-open/entry:rotate-180">▼</span>
        
        <div className="flex flex-wrap gap-1 flex-1">
            {e.level_id && <span className="bg-zinc-800 rounded px-1.5 py-0.5 text-zinc-300 font-mono">lvl:{e.level_id}</span>}
            {e.attempt_number !== undefined && <span className="bg-zinc-800 rounded px-1.5 py-0.5 text-zinc-300 font-mono">#{e.attempt_number}</span>}
            {e.turn !== undefined && <span className="bg-zinc-800 rounded px-1.5 py-0.5 text-zinc-300 font-mono">turn:{e.turn}</span>}
            {e.ms_since_last_same_event !== null && (
            <span className="text-zinc-600">+{e.ms_since_last_same_event}ms since last {e.event}</span>
            )}
        </div>
      </summary>
      <pre className="bg-zinc-950 border border-zinc-800 rounded p-2 text-[10px] overflow-x-auto mt-2 text-pink-300/80 font-mono leading-relaxed">
        {JSON.stringify({ payload: e.payload, ms_since_last_event: e.ms_since_last_event }, null, 2)}
      </pre>
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
    return <div className="text-zinc-500 italic text-[11px] p-3 text-center">No events yet — go interact with the game.</div>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {groups.map(([eventName, entries]) => {
        const layer = entries[0]?.layer ?? "semantic";
        return (
          <details key={eventName} open={layer !== "raw"} className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900/50 [&::-webkit-details-marker]:hidden group/group">
            <summary className="bg-zinc-800/80 px-3 py-2 text-[11px] font-bold cursor-pointer hover:bg-zinc-700/80 flex items-center gap-2 list-none select-none">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: LAYER_COLORS[layer] }} />
              <span className="text-zinc-200">{eventName}</span> 
              <span className="text-zinc-500 font-normal">({entries.length})</span>
              <span className="text-[8px] text-zinc-500 ml-auto transition-transform group-open/group:rotate-180">▼</span>
            </summary>
            <div className="pb-2">
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
    return <div className="text-zinc-500 italic text-[11px] p-3 text-center">No attempts yet — call startLevelAttempt() when a level begins.</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <select
        className="w-full bg-zinc-950 text-zinc-200 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] mb-2 shrink-0 outline-none focus:border-zinc-600"
        value={activeAttemptId ?? ""}
        onChange={(e) => setSelected(e.target.value)}
      >
        {attempts.map((a) => (
          <option key={a.attempt_id} value={a.attempt_id}>
            {a.level_id ?? "?"} — attempt #{a.attempt_number ?? "?"} ({new Date(a.started_at).toLocaleTimeString()})
          </option>
        ))}
      </select>
      <div className="flex-1 overflow-y-auto pr-1">
        {timeline.map((e, i) => (
          <div key={i} className="flex items-center gap-2 text-[10px] py-1.5 border-b border-zinc-800/50">
            <span className="text-zinc-500 font-mono shrink-0">{formatTime(e.ts)}</span>
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: LAYER_COLORS[e.layer] }} />
            <span className="text-zinc-300 font-mono truncate">{e.event}</span>
            {e.turn !== undefined && <span className="text-zinc-600 shrink-0 ml-auto">turn {e.turn}</span>}
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
    <div className="fixed bottom-4 right-4 z-[99999] flex flex-col items-end gap-3 font-sans">
      {!open && (
        <button 
          className="bg-zinc-800/80 backdrop-blur-sm text-zinc-400 text-[10px] uppercase tracking-widest font-bold px-4 py-2 rounded-full hover:bg-zinc-700 hover:text-white transition-colors border border-zinc-600 shadow-lg cursor-pointer"
          onClick={() => setOpen(true)}
        >
          🔭 Telemetry ({log.length})
        </button>
      )}

      {open && (
        <div className="bg-zinc-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-zinc-700 w-80 lg:w-[420px] max-h-[70vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          
          <div className="flex justify-between items-center p-3 border-b border-zinc-800 shrink-0">
            <strong className="text-pink-500 uppercase tracking-widest text-xs font-bold">Telemetry (dev)</strong>
            <button 
              className="text-zinc-500 hover:text-zinc-300 cursor-pointer text-sm leading-none px-1" 
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="flex flex-wrap gap-2 items-center p-3 border-b border-zinc-800 shrink-0">
            <label className="flex items-center gap-1.5 text-[11px] text-zinc-400 cursor-pointer hover:text-zinc-200">
              <input
                type="checkbox"
                checked={consoleOn}
                className="accent-pink-600 rounded-sm bg-zinc-800 border-zinc-700 cursor-pointer"
                onChange={(e) => {
                  setConsoleOn(e.target.checked);
                  setConsoleLogging(e.target.checked);
                }}
              />
              Log to console
            </label>
            
            <div className="flex gap-2 ml-auto">
              <button 
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-md px-2 py-1 text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer" 
                onClick={() => setDataOpen((v) => !v)}
              >
                {dataOpen ? "Hide data" : "Show data"}
              </button>
              <button 
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-md px-2 py-1 text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer" 
                onClick={() => downloadLog()}
              >
                Download JSON
              </button>
              <button
                className="bg-rose-900/30 hover:bg-rose-900/50 text-rose-400 border border-rose-900/50 rounded-md px-2 py-1 text-[10px] uppercase font-bold tracking-wider transition-colors cursor-pointer"
                onClick={() => {
                  clearLog();
                  setLog([]);
                }}
              >
                Clear
              </button>
            </div>
          </div>

          {dataOpen && (
            <div className="flex flex-col flex-1 min-h-0">
              <div className="flex gap-1.5 p-3 pb-2 shrink-0 border-b border-zinc-800/50">
                <button
                  className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer flex-1 ${viewMode === "grouped" ? 'bg-zinc-800 text-zinc-200 border border-pink-600/50 shadow-sm' : 'bg-transparent text-zinc-500 border border-zinc-800 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
                  onClick={() => setViewMode("grouped")}
                >
                  Grouped
                </button>
                <button
                  className={`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer flex-1 ${viewMode === "timeline" ? 'bg-zinc-800 text-zinc-200 border border-pink-600/50 shadow-sm' : 'bg-transparent text-zinc-500 border border-zinc-800 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
                  onClick={() => setViewMode("timeline")}
                >
                  Timeline
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 pt-2">
                {viewMode === "grouped" ? <GroupedLog log={log} /> : <TimelineView log={log} />}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}