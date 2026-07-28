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

  // ---- Intro / initial load ----
  | { event: "intro_opened"; payload: {} }
  | {
      event: "intro_text_skipped";
      payload: {
        /** ms elapsed before the skip click */
        elapsed_ms: number;
        /** how far through the text they were (0–100) */
        pct_seen: number;
      };
    }
  | { event: "intro_proceeded"; payload: { dwell_ms: number } }

  // ---- Level select ----
  | { event: "level_select_viewed"; payload: { level_id: string } }
  | {
      event: "level_select_continue_clicked";
      payload: { level_id: string; dwell_ms: number; opened_details: boolean };
    }
  | {
      /** Player clicked a completed-cycle graph or metric from a previous cycle on the level-select screen */
      event: "level_select_history_explored";
      payload: { source_cycle: string; lens_cycle: string };
    }

  // ---- Briefing (per cycle — fires every time, including retries) ----
  | {
      event: "briefing_opened";
      payload: {
        cycle: string;
        attempt_number: number;
        /** true when the Skip Briefing button is visible (retry) */
        is_retry: boolean;
      };
    }
  | {
      event: "briefing_metric_definition_clicked";
      payload: { cycle: string; metric_name: string };
    }
  | {
      event: "briefing_text_skipped";
      payload: { cycle: string; elapsed_ms: number; pct_seen: number };
    }
  | {
      event: "briefing_proceeded";
      payload: {
        cycle: string;
        dwell_ms: number;
        /** true if they used the dedicated Skip Briefing button rather than the typewriter skip */
        used_skip_button: boolean;
      };
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
        max_scroll_pct: number;
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
        reading_speed_wpm: number;
      };
    }

  // ---- Interaction quality: discoverable mechanics ----
  | {
      event: "tooltip_hovered";
      payload: { tooltip_type: string; tooltip_id: string; turn?: number };
    }
  | { event: "view_details_opened"; payload: { policy_id: string; turn: number } }
  | {
      event: "view_details_closed";
      payload: {
        policy_id: string;
        turn: number;
        dwell_ms: number;
        resulting_action: "dismissed" | "picked_same_policy" | "picked_other_policy";
      };
    }

  // ---- Interaction quality: scrollable panels (non-modal) ----
  | { event: "panel_scrolled"; payload: { panel_id: string; max_scroll_pct: number } }

  // ---- Graph / chart interactions ----
  | {
      event: "graph_hovered";
      payload: {
        /** which chart context: "dashboard" | "level_select" | "term_summary" | etc. */
        chart_context: string;
        turn?: number;
      };
    }

  // ---- Main play: turn lifecycle ----
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
      payload: {
        turn: number;
        level_id: string;
        score: number;
        population: number;
        wellbeing?: number;
        /** ms from turn_started to policy confirm */
        time_on_turn_ms: number;
      };
    }
  | {
      /** After turn 5: did they open the enacted policy history panel, and for how long? */
      event: "enacted_policies_reviewed";
      payload: {
        turn: number;
        policies_viewed: number;
        /** ms spent on the panel before confirming/proceeding */
        dwell_ms: number;
      };
    }
  | {
      event: "hold_press_conference_clicked";
      payload: {
        /** ms between end of turn 5 (score shown) and this click */
        time_after_turn5_ms: number;
      };
    }

  // ---- Policy impact pop-up ----
  | {
      event: "policy_impact_popup_interacted";
      payload: {
        policy_id: string;
        turn: number;
        /** "hover" | "click" */
        interaction_type: "hover" | "click";
      };
    }

  // ---- Press Conference ----
  | {
      event: "press_conference_started";
      payload: { cycle: string; approval_rating: number };
    }
  | {
      event: "press_q1_answered";
      payload: {
        cycle: string;
        answer_given: string;
        correct: boolean;
        /** ms from question finishing/being skipped to answer click */
        time_to_answer_ms: number;
        text_was_skipped: boolean;
      };
    }
  | {
      event: "press_q2_answered";
      payload: {
        cycle: string;
        answer_given: string;
        correct: boolean;
        time_to_answer_ms: number;
        text_was_skipped: boolean;
        /** true when the player picked a policy they never actually enacted */
        picked_unenacted_policy: boolean;
      };
    }
  | {
      event: "press_conference_completed";
      payload: {
        cycle: string;
        correct_count: number;
        total_score_delta: number;
        final_approval: number;
      };
    }
  // kept for back-compat with existing wiring in useGameEngine
  | {
      event: "press_conference_answered";
      payload: { question_id: string; answer: string; correct: boolean; turn?: number };
    }

  // ---- Term Summary ----
  | {
      event: "term_summary_opened";
      payload: { cycle: string; dwell_ms?: never };
    }
  | {
      event: "term_summary_closed";
      payload: { cycle: string; dwell_ms: number };
    }
  | {
      /** Play button clicked */
      event: "term_summary_timeline_started";
      payload: { cycle: string };
    }
  | {
      /** T1–T5 or Start button used */
      event: "term_summary_timeline_jumped";
      payload: { cycle: string; to_turn: number };
    }
  | {
      /** Timeline reached the final turn (either auto-played or manually jumped to it) */
      event: "term_summary_timeline_completed";
      payload: { cycle: string; was_auto: boolean };
    }

  // ---- Verdict ----
  | {
      event: "verdict_shown";
      payload: { cycle: string; won: boolean; approval_rating: number; attempt_number: number };
    }
  | {
      event: "verdict_dwell";
      payload: { cycle: string; won: boolean; dwell_ms: number };
    }
  | {
      event: "verdict_celebrate_clicked";
      payload: { cycle: string };
    }

  // ---- Wellbeing Changes (StagePopulationChange) ----
  | {
      event: "wellbeing_changes_opened";
      payload: { cycle: string };
    }
  | {
      event: "wellbeing_changes_closed";
      payload: { cycle: string; dwell_ms: number };
    }
  | {
      /** The info "note" button clicked */
      event: "wellbeing_note_clicked";
      payload: { cycle: string };
    }

  // ---- Electorate Feedback ----
  | {
      event: "electorate_feedback_opened";
      payload: { cycle: string };
    }
  | {
      event: "electorate_feedback_closed";
      payload: { cycle: string; dwell_ms: number; policies_clicked: number };
    }

  // ---- Academic Debrief ----
  | {
      event: "academic_debrief_opened";
      payload: { cycle: string };
    }
  | {
      event: "academic_debrief_first_interaction";
      payload: { cycle: string; time_to_first_ms: number };
    }
  | {
      event: "academic_debrief_closed";
      payload: {
        cycle: string;
        dwell_ms: number;
        /** ms between last reveal interaction and clicking proceed */
        idle_before_proceed_ms: number;
      };
    }

  // ---- Level complete ----
  | {
      event: "level_completed";
      payload: { level_id: string; outcome: "win" | "lose"; turns_taken: number; final_score: number };
    }

  // ---- Utility Intervention (post-Rawls) ----
  | {
      event: "utility_intervention_opened";
      payload: { after_cycle: string };
    }
  | {
      event: "utility_scenario_answered";
      payload: {
        scenario_index: number;
        answer_given: string;
        time_to_answer_ms: number;
      };
    }
  | {
      event: "utility_maths_seen";
      payload: {
        scenario_index: number;
        /** ms between answer and seeing the maths explanation */
        time_to_maths_ms: number;
      };
    }
  | {
      event: "utility_graph_animation_awaited";
      payload: {
        scenario_index: number;
        /** ms on the graph screen; did they wait for the animation to finish? */
        dwell_ms: number;
        animation_finished: boolean;
      };
    }
  | {
      event: "utility_objective_subjective_proceeded";
      payload: {
        scenario_index: number;
        /** ms on the objective/subjective comparison screen */
        dwell_ms: number;
      };
    }
  | {
      event: "utility_intervention_completed";
      payload: { total_scenarios: number; dwell_ms: number };
    }
  | {
      /** The "Resume Simulation" button at start of Level 3 */
      event: "utility_resume_clicked";
      payload: { ts: number };
    }

  // ---- Cycles 3 & 4: utility table "?" button ----
  | {
      event: "utility_table_help_clicked";
      payload: { cycle: string; turn: number };
    }

  // ---- Post-game ----
  | {
      event: "postgame_finish_clicked";
      payload: {
        /** ms after completing 4th level until clicking "Finish Game" */
        time_after_level4_ms: number;
      };
    }
  | {
      event: "postgame_replay_clicked";
      payload: {};
    }

  // ---- Final Debrief ----
  | {
      event: "final_debrief_opened";
      payload: { dwell_ms?: never };
    }
  | {
      event: "final_debrief_submitted";
      payload: { best_metric: string; best_society: string };
    }
  | {
      event: "final_debrief_celebrate_clicked";
      payload: {};
    }
  | {
      event: "final_debrief_closed";
      payload: { dwell_ms: number };
    };

// Note: Layer 0 (raw) and Layer 1 (derived) events are NOT part of this union.
// They're emitted via trackRaw()/trackDerived() in telemetry.ts with loose
// string typing on purpose — see rawCapture.ts and derive.ts.

export type TelemetryEventName = TelemetryEvent["event"];
export type PayloadFor<N extends TelemetryEventName> = Extract<TelemetryEvent, { event: N }>["payload"];