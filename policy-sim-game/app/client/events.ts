// Canonical telemetry taxonomy.
// Add new events here first, then emit them with track(name, payload).
// Keeping this as a single source of truth makes it easy to see the full
// picture of what's tracked, and gives you type safety when calling track().

export type TelemetryEvent =
  // ---- Session ----
  | { event: "session_started"; payload?: {} }
  | { event: "session_ended"; payload: { duration_ms: number } }

  // ---- Level attempts (a player can retry a level) ----
  | { event: "level_attempt_started"; payload: { level_id: string; attempt_number: number } }
  | {
      event: "level_attempt_ended";
      payload: { level_id: string; attempt_number: number; outcome: "win" | "lose" | "abandoned"; turns_taken: number };
    }

  // ---- Interaction quality: modals ----
  | { event: "modal_opened"; payload: { modal_id: string; modal_type: string; scrollable: boolean } }
  | {
      event: "modal_closed";
      payload: {
        modal_id: string;
        modal_type: string;
        dwell_ms: number;
        scrollable: boolean;
        max_scroll_pct: number; // 0 if not scrollable
      };
    }

  // ---- Interaction quality: dialogue / text ----
  | { event: "dialogue_shown"; payload: { text_id: string; char_count: number } }
  | {
      event: "dialogue_advanced";
      payload: {
        text_id: string;
        char_count: number;
        dwell_ms: number;
        reading_speed_wpm: number; // computed as (char_count/5) / (dwell_ms/60000)
      };
    }

  // ---- Interaction quality: level select ----
  | { event: "level_select_viewed"; payload: { level_id: string } }
  | {
      event: "level_select_continue_clicked";
      payload: { level_id: string; dwell_ms: number; opened_details: boolean };
    }

  // ---- Interaction quality: discoverable mechanics ----
  | {
      event: "tooltip_hovered";
      // tooltip_type distinguishes the mechanic: "metric_definition" | "wellbeing_info" | "enacted_legislation"
      payload: { tooltip_type: string; tooltip_id: string; turn?: number };
    }
  | { event: "view_details_opened"; payload: { policy_id: string; turn: number } }
  | {
      event: "view_details_closed";
      payload: {
        policy_id: string;
        turn: number;
        dwell_ms: number;
        // what happened right after closing/leaving details open:
        resulting_action: "dismissed" | "picked_same_policy" | "picked_other_policy";
      };
    }

  // ---- Interaction quality: scrollable panels in general (non-modal) ----
  | { event: "panel_scrolled"; payload: { panel_id: string; max_scroll_pct: number } }

  // ---- Performance / learning ----
  | { event: "turn_started"; payload: { turn: number; level_id: string; score: number; population: number } }
  | {
      event: "policy_options_presented";
      payload: { turn: number; level_id: string; options: string[] };
    }
  | {
      event: "policy_selected";
      payload: {
        turn: number;
        level_id: string;
        policy_id: string;
        options_available: string[];
        score_before: number;
        score_after: number;
        population_before: number;
        population_after: number;
      };
    }
  | {
      event: "turn_completed";
      payload: { turn: number; level_id: string; score: number; population: number; wellbeing?: number };
    }
  | {
      event: "press_conference_answered";
      payload: { question_id: string; answer: string; correct: boolean; turn?: number };
    }
  | {
      event: "level_completed";
      payload: { level_id: string; outcome: "win" | "lose"; turns_taken: number; final_score: number };
    };

// Note: Layer 0 (raw) and Layer 1 (derived) events are NOT part of this union.
// They're emitted via trackRaw()/trackDerived() in telemetry.ts with loose
// string typing on purpose - see rawCapture.ts and derive.ts. Locking raw
// sensor data into a fixed type here would defeat "log everything, figure
// out what it means later."

export type TelemetryEventName = TelemetryEvent["event"];
export type PayloadFor<N extends TelemetryEventName> = Extract<TelemetryEvent, { event: N }>["payload"];