// components/tabs/DashboardTab.tsx
import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useGame } from "../../context/GameStateContext";
import { FRAMEWORK_RULES } from "../../utils/frameworkRules";
import { ElectionCycle, Policy } from "../../utils/types";
import { availablePolicies } from "../../data/policies";
import { PM_PROFILES } from "../../utils/pmProfiles";
import { useDashboardHistograms } from "../../hooks/useDashboardHistograms";
import TurnSummaryToast from "../TurnSummaryToast";
import EnactedLegislationHistory from "../EnactedLegislationHistory";
import DeskTopBar, { ContinueState } from "../desk/DeskTopBar";
import DailyReturn from "../desk/DailyReturn";
import InTray from "../desk/InTray";
import BillPaper, { SIGN_SEQUENCE_MS } from "../desk/BillPaper";
import { PM_TONES, termStatus } from "../desk/deskTheme";
import { track, startTimer, stopTimer } from "../../client/telemetry";
import { useTooltipTelemetry } from "../../client/hooks";

/**
 * The main game screen: the PM's desk.
 *  - Top bar: who you are, what you're judged on and how it's going, approval,
 *    the countdown to the vote, and Continue.
 *  - An open case folder: the country on graph paper on the left flap; the
 *    open bill (or the Deputy PM's note) on the right flap.
 *  - The in-tray: today's four bills as files, each with its paper sticking out.
 * A turn: pull a bill's paper out (its effect is ghosted on the chart) → Sign
 * (pen writes the signature, the paper slides away) → Continue (enacts it).
 */
export default function DashboardTab() {
  const {
    currentCycle, currentTurn, currentHistogramData,
    selectedPolicy, turnMetricScore, currentDeck, setSelectedPolicy, handleApplyPolicy,
    turnApprovalRating: approvalRating, cycleMAO, isAgendaUnlocked, yAxisMax, isEnacting,
    population, previewPopulation, isParliamentDissolved, history, handleFaceElectorate,
    lastTurnSummary, clearLastTurnSummary, TURNS_PER_CYCLE,
  } = useGame();

  const rule = FRAMEWORK_RULES[currentCycle];
  const tone = PM_TONES[currentCycle];
  const profile = PM_PROFILES.find((p) => p.cycle === currentCycle);
  const targetScore = cycleMAO * rule.winThresholdScalar;
  const startScore = history.find((h) => h.turn === 1)?.metricScore ?? turnMetricScore;
  const isUtilityCycle = currentCycle === ElectionCycle.PersonalUtility || currentCycle === ElectionCycle.SocietalUtility;

  const [hoveredEnactedId, setHoveredEnactedId] = useState<string | null>(null);
  const [hoveredHistoryTurn, setHoveredHistoryTurn] = useState<number | null>(null);
  const { trackHover } = useTooltipTelemetry();

  // Signing: `signingId` while the pen writes and the paper slides away;
  // `signedId` once it has gone (Continue then enacts it).
  // Both belong to one day only: a new day (or term) starts with a clear desk.
  const dayKey = `${currentCycle}-${currentTurn}`;
  const [sign, setSign] = useState<{ day: string; signing: string | null; signed: string | null }>({ day: "", signing: null, signed: null });
  const signingId = sign.day === dayKey ? sign.signing : null;
  const signedId = sign.day === dayKey ? sign.signed : null;
  const signTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // New-day card: a calendar page that drops onto the desk after Continue.
  const [dayCard, setDayCard] = useState<{ day: number | null; key: number } | null>(null);
  const dayTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => {
    if (signTimer.current) clearTimeout(signTimer.current);
    dayTimers.current.forEach(clearTimeout);
  }, []);

  // Reading a bill = its details are open (kept so the view_details_* events,
  // and their dwell times, mean the same as before: time spent on a bill's details).
  const detailsOpen = !!selectedPolicy && !isParliamentDissolved;
  const prevDetailsPolicyId = useRef<string | null>(null);
  useEffect(() => {
    const openPolicyId = detailsOpen && selectedPolicy ? selectedPolicy.id : null;
    const prevId = prevDetailsPolicyId.current;

    if (prevId && prevId !== openPolicyId) {
      const dwellMs = stopTimer(`view_details_${prevId}`);
      const resultingAction =
        selectedPolicy?.id === prevId ? "picked_same_policy" : selectedPolicy ? "picked_other_policy" : "dismissed";
      track("view_details_closed", { policy_id: prevId, turn: currentTurn, dwell_ms: dwellMs, resulting_action: resultingAction });
    }

    if (openPolicyId && openPolicyId !== prevId) {
      startTimer(`view_details_${openPolicyId}`);
      track("view_details_opened", { policy_id: openPolicyId, turn: currentTurn });
    }

    prevDetailsPolicyId.current = openPolicyId;
  }, [detailsOpen, selectedPolicy, currentTurn]);

  const activeMarkers = isParliamentDissolved && hoveredHistoryTurn !== null
    ? []
    : [
        { value: turnMetricScore, label: `CURRENT ${rule.targetMetricAbbreviation}`, color: tone.dark, dashed: false },
        { value: targetScore, label: `TARGET ${rule.targetMetricAbbreviation}`, color: "#3f3f46", dashed: true },
      ];

  const { topHistogramData, ghostHistogramData, enactedLegislation } = useDashboardHistograms({
    population,
    previewPopulation,
    currentCycle,
    currentHistogramData,
    isParliamentDissolved,
    hoveredHistoryTurn,
    selectedPolicy: signingId || signedId ? null : selectedPolicy,
    history,
    availablePolicies,
    detailsOpen,
  });

  const handleHoverEnacted = (policyId: string | null, turn: number | null) => {
    setHoveredEnactedId(policyId);
    setHoveredHistoryTurn(turn);
    if (policyId) trackHover("enacted_legislation", policyId, currentTurn);
  };

  const pickPolicy = (policy: Policy | null) => {
    track("policy_card_selected", {
      turn: currentTurn,
      level_id: ElectionCycle[currentCycle],
      policy_id: policy?.id ?? null,
      action: policy ? "picked" : "deselected",
    });
    setSelectedPolicy(policy);
  };

  const signBill = () => {
    if (!selectedPolicy || signingId || signedId) return;
    const id = selectedPolicy.id;
    const day = dayKey;
    setSign({ day, signing: id, signed: null });
    signTimer.current = setTimeout(() => {
      setSign((s) => (s.day === day ? { day, signing: null, signed: id } : s));
    }, SIGN_SEQUENCE_MS);
  };

  const continueState: ContinueState = isParliamentDissolved
    ? "press"
    : isEnacting
      ? "busy"
      : signedId && selectedPolicy?.id === signedId && isAgendaUnlocked
        ? "ready"
        : "locked";

  const onContinue = () => {
    if (continueState === "press") handleFaceElectorate();
    else if (continueState === "ready") {
      handleApplyPolicy();
      // The bill becomes law (~0.8 s), then tomorrow's page drops in while the
      // country updates and the new files are dealt. `day: null` = polling day.
      const next = currentTurn < TURNS_PER_CYCLE ? currentTurn + 1 : null;
      const key = Date.now();
      dayTimers.current.push(setTimeout(() => setDayCard({ day: next, key }), 450));
      dayTimers.current.push(setTimeout(() => setDayCard((c) => (c?.key === key ? null : c)), 2300));
    }
  };

  const status = termStatus(turnMetricScore, startScore, targetScore, currentTurn, TURNS_PER_CYCLE);
  const deckIndex = selectedPolicy ? currentDeck.slice(0, 4).findIndex((p) => p.id === selectedPolicy.id) : -1;
  const billOpen = !!selectedPolicy && !isParliamentDissolved && !signedId;
  const hoveredEnacted = hoveredEnactedId ? availablePolicies.find((p) => p.id === hoveredEnactedId) : null;
  const chartTitle = isParliamentDissolved
    ? hoveredHistoryTurn !== null
      ? `Before and after: ${hoveredEnacted?.policyName ?? "this bill"}`
      : "The country on polling day"
    : "The country today";

  return (
    <div className="desk-wood -m-4 h-[calc(100%+2rem)] flex flex-col relative overflow-hidden">
      {/* Just under the top bar, so it never covers it */}
      <div className="absolute left-0 right-0 top-[78px] z-[80] pointer-events-none">
        <TurnSummaryToast
          summary={lastTurnSummary}
          accentColor={rule.graphColor}
          metricAbbreviation={rule.targetMetricAbbreviation}
          onDismiss={clearLastTurnSummary}
          onInteract={(type) => {
            if (lastTurnSummary) {
              track("policy_impact_popup_interacted", {
                policy_id: selectedPolicy?.id ?? lastTurnSummary.policyName,
                turn: lastTurnSummary.turn,
                interaction_type: type,
              });
            }
          }}
        />
      </div>

      <DeskTopBar
        cycle={currentCycle}
        turn={currentTurn}
        turnsPerCycle={TURNS_PER_CYCLE}
        approval={approvalRating}
        isDissolved={isParliamentDissolved}
        score={turnMetricScore}
        target={targetScore}
        status={status}
        continueState={continueState}
        onContinue={onContinue}
      />

      <div className="flex-1 min-h-0 flex gap-5 p-5">
        {/* The open case folder */}
        <div className="relative flex-1 min-w-0">
          <div className="absolute inset-0 rounded-[6px_14px_14px_6px] shadow-[0_24px_46px_rgba(0,0,0,.55)] bg-[linear-gradient(90deg,#eadbb2_0%,#f2e6c4_47%,#cdb98a_50%,#f2e6c4_53%,#eadbb2_100%)]" />
          <div className="absolute left-12 -top-3.5 h-[26px] px-3 pt-1.5 rounded-t-[10px] bg-[#eadbb2] text-[11px] font-black tracking-[.1em] text-[#5c4214]">
            CABINET · {isParliamentDissolved ? "END OF TERM" : `DAY ${currentTurn}`}
          </div>

          <div className="absolute inset-0 grid grid-cols-2 gap-[4%] p-[22px]">
            {/* Left flap: the country */}
            <div className="relative min-h-0 min-w-0" onMouseEnter={() => track("graph_hovered", { chart_context: "dashboard", turn: currentTurn })}>
              <DailyReturn
                cycle={currentCycle}
                rule={rule}
                title={chartTitle}
                histogramData={topHistogramData}
                ghostHistogramData={ghostHistogramData}
                markers={activeMarkers}
                yAxisMax={yAxisMax}
                population={population}
                isUtilityCycle={isUtilityCycle}
                activeRules={billOpen ? selectedPolicy!.specificRules : isParliamentDissolved && hoveredEnacted ? hoveredEnacted.specificRules : null}
                emptyHint={
                  isParliamentDissolved
                    ? "Hover over a bill on the right to see what it did."
                    : "Pull a bill from the in-tray: who it moves appears here, lined up under the people it touches."
                }
              />
            </div>

            {/* Right flap: the bill, the Deputy PM's note, or the term's bills */}
            <div className="relative min-h-0 min-w-0">
              {isParliamentDissolved ? (
                <div className="desk-paper absolute inset-0 shadow-[0_6px_14px_rgba(0,0,0,.2)] pl-14 pr-6 py-5 flex flex-col gap-3">
                  <span className="text-[10px] font-extrabold tracking-[.14em] uppercase text-[#7c5a1d]">Parliament is dissolved</span>
                  <span className="font-display font-black text-[clamp(22px,2vw,30px)] leading-tight text-[#2a1f0e]">The bills you signed this term</span>
                  <span className="text-[13px] text-stone-600">Hover over a bill to see what it did. Then face the press.</span>
                  <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-visible relative z-[60]">
                    <EnactedLegislationHistory
                      enactedLegislation={enactedLegislation}
                      availablePolicies={availablePolicies}
                      hoveredEnactedId={hoveredEnactedId}
                      onHover={handleHoverEnacted}
                    />
                  </div>
                </div>
              ) : (
                <>
                  {/* Underneath the paper: an empty flap, or "sent" once signed */}
                  <div className="absolute inset-0 border-[3px] border-dashed border-[rgba(92,66,20,.35)] flex flex-col items-center justify-center gap-2 text-center px-10 text-[#5c4214]">
                    <span className="font-display font-black text-[clamp(22px,2vw,28px)]">
                      {signedId ? "Sent to Parliament ✓" : "Four bills in the tray"}
                    </span>
                    <span className="text-[14px] leading-relaxed">
                      {signedId
                        ? "It becomes law when you press Continue. Its effects show tomorrow."
                        : "Pull one out to read it. It lands here, and its effect shows on the country."}
                    </span>
                  </div>

                  <AnimatePresence>
                    {selectedPolicy && !signedId && (
                      <BillPaper
                        key={selectedPolicy.id}
                        policy={selectedPolicy}
                        billNumber={deckIndex + 1}
                        population={population}
                        pmName={(profile?.name ?? "").replace(/^PM\s+/, "").toUpperCase()}
                        signing={signingId === selectedPolicy.id}
                        onSign={signBill}
                        onPutBack={() => pickPolicy(null)}
                      />
                    )}
                  </AnimatePresence>
                </>
              )}
            </div>
          </div>
        </div>

        {/* The in-tray */}
        <div className="w-[clamp(200px,18vw,270px)] shrink-0 min-h-0">
          {isParliamentDissolved ? (
            <div className="h-full flex flex-col gap-3">
              <span className="text-[10px] font-extrabold tracking-[.14em] uppercase text-[#f5e9d6]">In-tray · empty</span>
              <div className="flex-1 border-[3px] border-dashed border-[rgba(245,233,214,.35)] rounded-xl flex items-center justify-center text-center px-6 text-[13px] text-[#f5e9d6]">
                No more bills this term. The country goes to the polls.
              </div>
            </div>
          ) : (
            <InTray
              deck={currentDeck}
              selectedId={selectedPolicy?.id ?? null}
              signedId={signedId ?? signingId}
              locked={!isAgendaUnlocked || isEnacting || !!signingId || !!signedId}
              onPick={(p) => pickPolicy(selectedPolicy?.id === p.id ? null : p)}
            />
          )}
        </div>
      </div>

      {/* A new day: tomorrow's calendar page drops onto the desk, then lifts away */}
      <AnimatePresence>
        {dayCard && (
          <motion.div
            key={dayCard.key}
            className="absolute inset-0 top-[78px] z-[70] flex items-center justify-center pointer-events-none"
            initial={{ backgroundColor: "rgba(20,12,6,0)" }}
            animate={{ backgroundColor: "rgba(20,12,6,.28)" }}
            exit={{ backgroundColor: "rgba(20,12,6,0)", transition: { duration: 0.4 } }}
          >
            <motion.div
              className="w-[190px] rounded-lg overflow-hidden bg-[#fafaf9] shadow-[0_24px_50px_rgba(0,0,0,.55)] text-center"
              initial={{ y: -90, rotate: -6, opacity: 0 }}
              animate={{ y: 0, rotate: -2, opacity: 1, transition: { type: "spring", stiffness: 260, damping: 20 } }}
              exit={{ y: -60, rotate: 4, opacity: 0, transition: { duration: 0.35, ease: [0.4, 0, 1, 1] } }}
            >
              <div className="py-1.5 text-[12px] font-black tracking-[.14em] text-white" style={{ backgroundColor: tone.dark }}>
                {dayCard.day === null ? "POLLING DAY" : "DAY"}
              </div>
              <div className="font-display font-black text-[86px] leading-none py-3 text-stone-900">
                {dayCard.day === null ? "✓" : dayCard.day}
              </div>
              <div className="pb-3 text-[12px] font-extrabold text-stone-600">
                {dayCard.day === null
                  ? "The term is over"
                  : `Election in ${TURNS_PER_CYCLE + 1 - dayCard.day} ${TURNS_PER_CYCLE + 1 - dayCard.day === 1 ? "day" : "days"}`}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}