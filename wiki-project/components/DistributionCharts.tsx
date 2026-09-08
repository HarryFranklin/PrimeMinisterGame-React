'use client';

import React from 'react';
import D3Chart from './D3Chart'; // Adjust this import path if D3Chart is located elsewhere
import { AxisVariable } from '../utils/types'; 

// Shared layout components to keep the MDX file clean and consistent
const Container = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col md:flex-row gap-6 my-8">
    {children}
  </div>
);

const ChartBox = ({ title, children, desc }: { title: string, children: React.ReactNode, desc: string }) => (
  <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-xl flex flex-col">
    <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-100 mb-4">{title}</h4>
    <div className="h-64 w-full relative min-h-0">
      {children}
    </div>
    <p className="mt-4 text-xs text-zinc-400 text-center">{desc}</p>
  </div>
);

export function DistributionMeanDiagram() {
  const townA = [
    { name: '0', count: 0 }, { name: '1', count: 1 }, { name: '2', count: 3 },
    { name: '3', count: 8 }, { name: '4', count: 15 }, { name: '5', count: 23 },
    { name: '6', count: 23 }, { name: '7', count: 15 }, { name: '8', count: 8 },
    { name: '9', count: 3 }, { name: '10', count: 1 },
  ];

  const townB = [
    { name: '0', count: 5 }, { name: '1', count: 5 }, { name: '2', count: 15 },
    { name: '3', count: 25 }, { name: '4', count: 5 }, { name: '5', count: 0 },
    { name: '6', count: 0 }, { name: '7', count: 5 }, { name: '8', count: 25 },
    { name: '9', count: 15 }, { name: '10', count: 5 },
  ];

  return (
    <Container>
      <ChartBox title="Town A (Stable Middle)" desc="Mean: 5.5 | Most citizens cluster around the average.">
        <D3Chart
          plotType="1D"
          chartData={[]}
          histogramData={townA}
          xAxisType={AxisVariable.LifeSatisfaction}
          yAxisType={AxisVariable.LifeSatisfaction}
          color="#3b82f6"
          visualStyle="faces"
          faceCols={1}
          yAxisMax={30}
          theme="dark"
          markers={[{ value: 5.5, label: 'Mean: 5.5', color: '#fbbf24', dashed: true }]}
        />
      </ChartBox>
      <ChartBox title="Town B (Divided Society)" desc="Mean: 5.5 | A high mean driven by one wealthy half.">
        <D3Chart
          plotType="1D"
          chartData={[]}
          histogramData={townB}
          xAxisType={AxisVariable.LifeSatisfaction}
          yAxisType={AxisVariable.LifeSatisfaction}
          color="#3b82f6"
          visualStyle="faces"
          faceCols={1}
          yAxisMax={30}
          theme="dark"
          markers={[{ value: 5.5, label: 'Mean: 5.5', color: '#fbbf24', dashed: true }]}
        />
      </ChartBox>
    </Container>
  );
}

export function DistributionFloorDiagram() {
  // Both societies average 5.0, but Society A has citizens living in significantly worse hardship.
  const societyA = [
    { name: '0', count: 0 }, { name: '1', count: 0 }, { name: '2', count: 15 },
    { name: '3', count: 20 }, { name: '4', count: 15 }, { name: '5', count: 0 },
    { name: '6', count: 15 }, { name: '7', count: 20 }, { name: '8', count: 15 },
    { name: '9', count: 0 }, { name: '10', count: 0 },
  ];

  const societyB = [
    { name: '0', count: 0 }, { name: '1', count: 0 }, { name: '2', count: 0 },
    { name: '3', count: 0 }, { name: '4', count: 35 }, { name: '5', count: 30 },
    { name: '6', count: 35 }, { name: '7', count: 0 }, { name: '8', count: 0 },
    { name: '9', count: 0 }, { name: '10', count: 0 },
  ];

  return (
    <Container>
      <ChartBox title="Society A (Low Floor)" desc="Mean: 5.0 | The most vulnerable score just 2 out of 10.">
        <D3Chart
          chartData={[]}
          plotType="1D"
          histogramData={societyA}
          xAxisType={AxisVariable.LifeSatisfaction}
          yAxisType={AxisVariable.LifeSatisfaction}
          color="#10b981"
          visualStyle="faces"
          faceCols={1}
          yAxisMax={40}
          theme="dark"
          markers={[{ value: 2, label: 'Floor: 2', color: '#ef4444', dashed: true }]}
        />
      </ChartBox>
      <ChartBox title="Society B (High Floor)" desc="Mean: 5.0 | The most vulnerable score 4 out of 10.">
        <D3Chart
          chartData={[]}
          plotType="1D"
          histogramData={societyB}
          xAxisType={AxisVariable.LifeSatisfaction}
          yAxisType={AxisVariable.LifeSatisfaction}
          color="#10b981"
          visualStyle="faces"
          faceCols={1}
          yAxisMax={40}
          theme="dark"
          markers={[{ value: 4, label: 'Floor: 4', color: '#ef4444', dashed: true }]}
        />
      </ChartBox>
    </Container>
  );
}

export function DistributionDispersionDiagram() {
  const clustered = [
    { name: '0', count: 0 }, { name: '1', count: 0 }, { name: '2', count: 0 },
    { name: '3', count: 5 }, { name: '4', count: 30 }, { name: '5', count: 30 },
    { name: '6', count: 30 }, { name: '7', count: 5 }, { name: '8', count: 0 },
    { name: '9', count: 0 }, { name: '10', count: 0 },
  ];

  const spread = [
    { name: '0', count: 9 }, { name: '1', count: 9 }, { name: '2', count: 9 },
    { name: '3', count: 9 }, { name: '4', count: 9 }, { name: '5', count: 10 },
    { name: '6', count: 9 }, { name: '7', count: 9 }, { name: '8', count: 9 },
    { name: '9', count: 9 }, { name: '10', count: 9 },
  ];

  return (
    <Container>
      <ChartBox title="Low Dispersion" desc="Mean: 5.0 | High equality, minimal spread.">
        <D3Chart
          plotType="1D"
          chartData={[]}
          histogramData={clustered}
          xAxisType={AxisVariable.LifeSatisfaction}
          yAxisType={AxisVariable.LifeSatisfaction}
          color="#8b5cf6"
          visualStyle="faces"
          faceCols={1}
          yAxisMax={35}
          theme="dark"
          markers={[
            { value: 3, label: 'Floor: 3', color: '#ef4444', dashed: true },
            { value: 7, label: 'Ceiling: 7', color: '#10b981', dashed: true },
            { value: 5, label: 'Range: 3 to 7', color: '#fbbf24', dashed: true }
          ]}
        />
      </ChartBox>
      <ChartBox title="High Dispersion" desc="Mean: 5.0 | Extreme inequality, maximum spread.">
        <D3Chart
          plotType="1D"
          chartData={[]}
          histogramData={spread}
          xAxisType={AxisVariable.LifeSatisfaction}
          yAxisType={AxisVariable.LifeSatisfaction}
          color="#8b5cf6"
          visualStyle="faces"
          faceCols={1}
          yAxisMax={35}
          theme="dark"
          markers={[
            { value: 0, label: 'Floor: 0', color: '#ef4444', dashed: true },
            { value: 10, label: 'Ceiling: 10', color: '#10b981', dashed: true },
            { value: 5, label: 'Range: 0 to 10', color: '#fbbf24', dashed: true }
          ]}
        />
      </ChartBox>
    </Container>
  );
}