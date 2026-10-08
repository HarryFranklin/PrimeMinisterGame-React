import React from 'react';
import { AxisVariable, ElectionCycle, Policy, PolicyRule, Respondent } from '../../utils/types';
import { FrameworkRule } from '../../utils/frameworkRules';
import { IMPACT_COLORS } from '../../utils/uiHelpers';
import D3Chart, { ChartMarker } from '../D3Chart';
import { Card, CardHeader, EmptyState } from '../ui';
import type { HistogramBin } from '../../hooks/useDashboardHistograms';
import PointsStrip from '../PointsStrip';

interface PopulationPanelProps {
  isUtilityCycle: boolean;
  isParliamentDissolved: boolean;
  hoveredHistoryTurn: number | null;
  bottomChartTitle: string;
  rule: FrameworkRule;
  currentChartData: { id: number; x: number; y: number }[];
  topHistogramData: HistogramBin[];
  bottomHistogramData: HistogramBin[];
  yAxisMax: number;
  detailsOpen: boolean;
  selectedPolicy: Policy | null;
  population: Respondent[];
  previewPopulation: Respondent[] | null;
  currentCycle: ElectionCycle;
  metricName: string;
  activeMarkers: ChartMarker[];
}

const LEGEND_ITEMS = [
  { label: 'Improved', color: IMPACT_COLORS['Will improve'] },
  { label: 'Stable', color: IMPACT_COLORS['Will be stable'] },
  { label: 'Worsened', color: IMPACT_COLORS['Will worsen'] },
];

/** Key for the "View details" highlight on the current population chart and strip. */
const DETAILS_LEGEND_ITEMS = [
  { label: 'Lifts people', color: IMPACT_COLORS['Will improve'] },
  { label: 'Pushes people down', color: IMPACT_COLORS['Will worsen'] },
];

/** Small colour key in a card's title bar. Fades rather than unmounting, so
 * the title doesn't shift when it appears. */
function HeaderKey({ items, visible }: { items: { label: string; color: string }[]; visible: boolean }) {
  return (
    <div
      aria-hidden={!visible}
      className={`flex items-center gap-3 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight whitespace-nowrap">{item.label}</span>
        </span>
      ))}
    </div>
  );
}

export default function PopulationPanel({
  isUtilityCycle,
  isParliamentDissolved,
  hoveredHistoryTurn,
  bottomChartTitle,
  rule,
  currentChartData,
  topHistogramData,
  bottomHistogramData,
  yAxisMax,
  detailsOpen,
  selectedPolicy,
  population,
  previewPopulation,
  currentCycle,
  metricName,
  activeMarkers,
}: PopulationPanelProps) {
  const populationTitle = isParliamentDissolved
    ? hoveredHistoryTurn !== null
      ? `Population at Turn ${hoveredHistoryTurn - 1}`
      : 'Final Population'
    : 'Current Population';

  const activePolicyRules: PolicyRule[] | null =
    detailsOpen && selectedPolicy && !isParliamentDissolved ? selectedPolicy.specificRules : null;

  const topChart = (
    <Card className="basis-[76px]">
      <CardHeader
        title={populationTitle}
        action={<HeaderKey items={DETAILS_LEGEND_ITEMS} visible={!!activePolicyRules} />}
      />
      <div className="flex-1 p-2 min-h-0 relative" data-telemetry-id="population_graph_current" data-telemetry-type="graph">
        <D3Chart
          plotType="1D"
          chartData={currentChartData}
          histogramData={topHistogramData}
          xAxisType={AxisVariable.LifeSatisfaction}
          yAxisType={rule.yAxisType}
          color="#d4d4d8"
          markers={activeMarkers}
          visualStyle="faces"
          yAxisMax={yAxisMax}
          faceCols={2}
          activePolicyRules={activePolicyRules}
        />
      </div>
      <PointsStrip
        cycle={currentCycle}
        histogramData={topHistogramData}
        population={population}
        color={rule.graphColor}
        activePolicyRules={activePolicyRules}
      />
    </Card>
  );

  return (
    <>
      {topChart}
      <Card className="pb-0">
        <CardHeader
          title={<span className="truncate pr-2 block">{bottomChartTitle}</span>}
          action={<HeaderKey items={LEGEND_ITEMS} visible={hoveredHistoryTurn !== null} />}
        />
        <div className="flex-1 p-3 pb-0 min-h-0 relative" data-telemetry-id="population_graph_projected" data-telemetry-type="graph">
          <div className="absolute inset-0 p-3 pb-0 pointer-events-none">
            <D3Chart
              plotType="1D"
              chartData={[]}
              histogramData={bottomHistogramData}
              xAxisType={AxisVariable.LifeSatisfaction}
              yAxisType={rule.yAxisType}
              color="#ec4899"
              visualStyle={isParliamentDissolved && hoveredHistoryTurn !== null ? 'faces-segmented' : 'faces'}
              yAxisMax={yAxisMax}
            />
          </div>

          {!selectedPolicy && !isParliamentDissolved && (
            <EmptyState
              icon="⚖️"
              title="Awaiting Policy"
              description="Select a policy from the Legislative Agenda to forecast its impact."
              maxWidthClassName="max-w-[250px]"
            />
          )}
          {isParliamentDissolved && hoveredHistoryTurn === null && (
            <EmptyState
              icon="📜"
              title="Select Legislation"
              description="Hover over a policy in your Enacted Legislation to review its historical impact on the population."
            />
          )}
        </div>
      </Card>
    </>
  );
}