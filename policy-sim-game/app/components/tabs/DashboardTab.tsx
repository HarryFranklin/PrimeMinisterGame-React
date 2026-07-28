// components/tabs/DashboardTab.tsx
import { useState, useEffect, useRef } from "react";
import { useGame } from "../../context/GameStateContext";
import { FRAMEWORK_RULES } from "../../utils/frameworkRules";
import { ElectionCycle } from "../../utils/types";
import { availablePolicies } from "../../data/policies";
import { useDashboardHistograms } from "../../hooks/useDashboardHistograms";
import DPMCard from "../DPMCard";
import ApprovalCard from "../ApprovalCard";
import PopulationPanel from "./PopulationPanel";
import AgendaPanel from "./AgendaPanel";
import TurnSummaryToast from "../TurnSummaryToast";
import { track, startTimer, stopTimer } from "../../client/telemetry";
import { useTooltipTelemetry } from "../../client/hooks";

/**
 * Orchestrates the main game screen: wires game state + the derived
 * histogram/history data (useDashboardHistograms) into three presentational
 * panels (PopulationPanel, DPMCard + ApprovalCard, AgendaPanel).
 */
export default function DashboardTab() {
  const {
    currentCycle, currentTurn, currentChartData, currentHistogramData,
    selectedPolicy, turnMetricScore, currentDeck, setSelectedPolicy, handleApplyPolicy,
    turnApprovalRating: approvalRating, cycleMAO, isAgendaUnlocked, yAxisMax, isEnacting,
    population, previewPopulation, isParliamentDissolved, history, handleFaceElectorate,
    lastTurnSummary, clearLastTurnSummary
  } = useGame();

  const rule = FRAMEWORK_RULES[currentCycle];
  const targetScore = cycleMAO * rule.winThresholdScalar;
  const isUtilityCycle = currentCycle === ElectionCycle.PersonalUtility || currentCycle === ElectionCycle.SocietalUtility;

  const [hoveredEnactedId, setHoveredEnactedId] = useState<string | null>(null);
  const [hoveredHistoryTurn, setHoveredHistoryTurn] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { trackHover } = useTooltipTelemetry();

  useEffect(() => {
    setDetailsOpen(false);
  }, [selectedPolicy]);

  // "Did they click View Details, and for how long, and what did they do
  // right after" - works no matter which UI path opened/closed it (picking
  // a different policy, toggling the panel, etc), since it just watches the
  // (detailsOpen, selectedPolicy) pair rather than a specific click handler.
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
        { value: turnMetricScore, label: `CURRENT ${rule.targetMetricAbbreviation}`, color: rule.graphColor, dashed: false },
        { value: targetScore, label: `TARGET ${rule.targetMetricAbbreviation}`, color: "#3f3f46", dashed: true }
      ];

  const { topHistogramData, bottomHistogramData, enactedLegislation } = useDashboardHistograms({
    population,
    previewPopulation,
    currentCycle,
    currentHistogramData,
    isParliamentDissolved,
    hoveredHistoryTurn,
    selectedPolicy,
    history,
    availablePolicies,
    detailsOpen,
  });

  const hoveredPolicyDetails = hoveredEnactedId ? availablePolicies.find(p => p.id === hoveredEnactedId) : null;
  const bottomChartTitle = isParliamentDissolved
    ? (hoveredPolicyDetails ? `Historical Policy Impact (${hoveredPolicyDetails.policyName})` : "Historical Policy Impact")
    : "Projected Population";

  const handleHoverEnacted = (policyId: string | null, turn: number | null) => {
    setHoveredEnactedId(policyId);
    setHoveredHistoryTurn(turn);
    if (policyId) trackHover("enacted_legislation", policyId, currentTurn);
  };

  return (
    <div className="flex flex-col gap-4 lg:gap-6 h-full min-h-0 overflow-hidden animate-in fade-in duration-300 relative">
      <TurnSummaryToast
        summary={lastTurnSummary}
        accentColor={rule.graphColor}
        metricAbbreviation={rule.targetMetricAbbreviation}
        onDismiss={clearLastTurnSummary}
        onInteract={(type) => {
          if (lastTurnSummary) {
            track('policy_impact_popup_interacted', {
              policy_id: selectedPolicy?.id ?? lastTurnSummary.policyName,
              turn: lastTurnSummary.turn,
              interaction_type: type,
            });
          }
        }}
      />
      <div className="grid grid-cols-12 gap-3 lg:gap-4 flex-1 min-h-0 overflow-hidden">

        {/* LEFT COLUMN: Stacked Graphs OR Utility Table */}
        <div
          className="col-span-4 flex flex-col gap-4 lg:gap-6 h-full min-h-0 overflow-hidden"
          onMouseEnter={() => track('graph_hovered', { chart_context: 'dashboard', turn: currentTurn })}
        >
          <PopulationPanel
            isUtilityCycle={isUtilityCycle}
            isParliamentDissolved={isParliamentDissolved}
            hoveredHistoryTurn={hoveredHistoryTurn}
            bottomChartTitle={bottomChartTitle}
            rule={rule}
            currentChartData={currentChartData}
            topHistogramData={topHistogramData}
            bottomHistogramData={bottomHistogramData}
            yAxisMax={yAxisMax}
            detailsOpen={detailsOpen}
            selectedPolicy={selectedPolicy}
            population={population}
            previewPopulation={selectedPolicy && !isParliamentDissolved ? previewPopulation : null}
            currentCycle={currentCycle}
            metricName={rule.targetMetricName}
            activeMarkers={activeMarkers}
          />
        </div>

        {/* MIDDLE COLUMN: DPM & Approval */}
        <div className="col-span-4 flex flex-col gap-4 lg:gap-6 h-full min-h-0 overflow-hidden">
          <DPMCard
            currentCycle={currentCycle}
            currentTurn={currentTurn}
            isParliamentDissolved={isParliamentDissolved}
            selectedPolicy={selectedPolicy}
            cycleMAO={cycleMAO}
            currentMetricScore={turnMetricScore}
          />

          <ApprovalCard
            approvalRating={approvalRating}
            isParliamentDissolved={isParliamentDissolved}
            accentColor={rule.graphColor}
          />
        </div>

        {/* RIGHT COLUMN: Legislative Agenda OR Enacted History */}
        <AgendaPanel
          isParliamentDissolved={isParliamentDissolved}
          currentDeck={currentDeck}
          selectedPolicy={selectedPolicy}
          onSelectPolicy={(policy) => { setSelectedPolicy(policy); setDetailsOpen(false); }}
          population={population}
          detailsOpen={detailsOpen}
          onToggleDetails={setDetailsOpen}
          enactedLegislation={enactedLegislation}
          availablePolicies={availablePolicies}
          hoveredEnactedId={hoveredEnactedId}
          onHoverEnacted={handleHoverEnacted}
          isAgendaUnlocked={isAgendaUnlocked}
          isEnacting={isEnacting}
          onApplyPolicy={handleApplyPolicy}
          onFaceElectorate={handleFaceElectorate}
        />

      </div>
    </div>
  );
}
