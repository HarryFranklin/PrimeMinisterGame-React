import React from 'react';
import { AxisVariable, ElectionCycle, Policy, PolicyRule, Respondent } from '../../utils/types';
import { FrameworkRule } from '../../utils/frameworkRules';
import { IMPACT_COLORS } from '../../utils/uiHelpers';
import D3Chart, { ChartMarker } from '../D3Chart';
import UtilityTable from '../UtilityTable';
import { Card, CardHeader, EmptyState, Legend } from '../ui';
import type { HistogramBin } from '../../hooks/useDashboardHistograms';

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
    <Card className={isUtilityCycle ? 'flex-[0.8] min-h-[200px]' : ''}>
      <CardHeader title={populationTitle} />
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
    </Card>
  );

  if (isUtilityCycle) {
    return (
      <div className="flex flex-col gap-4 lg:gap-6 h-full min-h-0 overflow-hidden">
        {topChart}
        <Card className="flex-[1.2] min-h-[250px] relative">
          <CardHeader title="Utility Analysis" />
          <div className="flex-1 p-2 min-h-0 overflow-y-auto relative">
            <UtilityTable
              population={population}
              previewPopulation={previewPopulation}
              cycle={currentCycle}
              metricName={metricName}
              forecastState={isParliamentDissolved ? 'idle' : !selectedPolicy ? 'idle' : 'previewing'}
              forecastsRemaining={1}
              onRunForecast={() => {}}
            />
            {isParliamentDissolved && (
              <EmptyState
                icon="📊"
                title="Select Legislation"
                description="Hover over a policy in your Enacted Legislation to review its historical impact on the population."
              />
            )}
          </div>
        </Card>
      </div>
    );
  }

  const showLegend = hoveredHistoryTurn !== null || (!!selectedPolicy && !isParliamentDissolved);

  return (
    <>
      {topChart}
      <Card className="pb-0">
        <CardHeader title={<span className="truncate pr-2 block">{bottomChartTitle}</span>} />
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

        <Legend items={LEGEND_ITEMS} visible={showLegend} />
      </Card>
    </>
  );
}