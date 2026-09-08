'use client';

import React from 'react';
import { useState } from 'react';
import D3Chart from './D3Chart';
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

// Helper to quickly generate histogram arrays
const toHisto = (arr: number[]) => arr.map((count, i) => ({ name: String(i), count }));

// A shared baseline population for both interactive charts
const BASE_POP = toHisto([0, 2, 4, 6, 8, 10, 18, 22, 20, 8, 2]);

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

export function BenthamitePolicyEffects() {
  const [active, setActive] = useState<'base' | 'tax' | 'infra' | 'health'>('base');

  const policies = {
    base: {
      data: BASE_POP,
      rules: [],
      mean: 6.24,
      desc: "Baseline society before any intervention."
    },
    tax: {
      // Shifts populations from 7, 8, 9 up to 8, 9, 10
      data: toHisto([0, 2, 4, 6, 8, 10, 18, 16, 22, 10, 4]),
      rules: [{ minLS: 7, maxLS: 10, impact: 1 }],
      mean: 6.36,
      desc: "Broad tax cuts: The comfortable majority gains, the bottom stays exactly where they were."
    },
    infra: {
      // Shifts a few people up across the entire distribution
      data: toHisto([0, 1, 3, 5, 7, 9, 17, 23, 21, 10, 4]),
      rules: [{ minLS: 1, maxLS: 10, impact: 1 }],
      mean: 6.55,
      desc: "Universal infrastructure: Minor gains spread evenly across the entire population."
    },
    health: {
      // Shifts people in the lower-middle up
      data: toHisto([0, 2, 4, 6, 6, 12, 20, 22, 20, 8, 2]),
      rules: [{ minLS: 4, maxLS: 6, impact: 1 }],
      mean: 6.28,
      desc: "Public health campaigns: Raises the average by helping the middle, but misses the most vulnerable."
    }
  };

  const current = policies[active];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-xl my-8">
      <div className="flex flex-col gap-4 mb-6">
        <div>
          <h4 className="text-lg font-bold uppercase tracking-widest text-blue-400">Benthamite Policy Focus</h4>
          <p className="text-sm text-zinc-400 mt-1">{current.desc}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['base', 'tax', 'infra', 'health'] as const).map((key) => {
            const labels = { base: 'Baseline', tax: 'Tax Cuts', infra: 'Infrastructure', health: 'Public Health' };
            return (
              <button
                key={key}
                onClick={() => setActive(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  active === key 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                }`}
              >
                {labels[key]}
              </button>
            );
          })}
        </div>
      </div>
      <div className="h-72 w-full relative">
        <D3Chart
          plotType="1D"
          chartData={[]}
          histogramData={current.data}
          activePolicyRules={current.rules}
          xAxisType={AxisVariable.LifeSatisfaction}
          yAxisType={AxisVariable.LifeSatisfaction}
          color="#3b82f6"
          visualStyle="faces"
          faceCols={1}
          yAxisMax={25}
          theme="dark"
          markers={[{ value: current.mean, label: `Mean: ${current.mean.toFixed(2)}`, color: '#fbbf24', dashed: true }]}
        />
      </div>
    </div>
  );
}

export function RawlsianPolicyEffects() {
  const [active, setActive] = useState<'base' | 'welfare' | 'wage' | 'housing'>('base');

  const policies = {
    base: {
      data: BASE_POP,
      rules: [],
      floor: 1,
      desc: "Baseline society before any intervention."
    },
    welfare: {
      // Moves all 1s and 2s up to 3
      data: toHisto([0, 0, 0, 12, 8, 10, 18, 22, 20, 8, 2]),
      rules: [{ minLS: 0, maxLS: 3, impact: 1 }],
      floor: 3,
      desc: "Means-tested welfare: Lifts the absolute worst-off to a minimum standard of 3."
    },
    wage: {
      // Moves 2s and 3s to 4, but leaves 1s behind (unemployed)
      data: toHisto([0, 2, 0, 0, 18, 10, 18, 22, 20, 8, 2]),
      rules: [{ minLS: 2, maxLS: 4, impact: 1 }],
      floor: 1,
      desc: "Minimum wage: Helps the struggling working class reach 4, but misses the unemployed at 1."
    },
    housing: {
      // Moves 1s to 4, 2s to 5
      data: toHisto([0, 0, 0, 6, 10, 14, 18, 22, 20, 8, 2]),
      rules: [{ minLS: 1, maxLS: 5, impact: 1 }],
      floor: 3,
      desc: "Targeted social housing: Radically transforms the bottom, pulling the floor up to 3."
    }
  };

  const current = policies[active];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-xl my-8">
      <div className="flex flex-col gap-4 mb-6">
        <div>
          <h4 className="text-lg font-bold uppercase tracking-widest text-emerald-400">Rawlsian Policy Focus</h4>
          <p className="text-sm text-zinc-400 mt-1">{current.desc}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['base', 'welfare', 'wage', 'housing'] as const).map((key) => {
            const labels = { base: 'Baseline', welfare: 'Welfare', wage: 'Min Wage', housing: 'Housing' };
            return (
              <button
                key={key}
                onClick={() => setActive(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  active === key 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                }`}
              >
                {labels[key]}
              </button>
            );
          })}
        </div>
      </div>
      <div className="h-72 w-full relative">
        <D3Chart
          plotType="1D"
          chartData={[]}
          histogramData={current.data}
          activePolicyRules={current.rules}
          xAxisType={AxisVariable.LifeSatisfaction}
          yAxisType={AxisVariable.LifeSatisfaction}
          color="#10b981"
          visualStyle="faces"
          faceCols={1}
          yAxisMax={25}
          theme="dark"
          markers={[{ value: current.floor, label: `Floor: ${current.floor}`, color: '#ef4444', dashed: true }]}
        />
      </div>
    </div>
  );
}

export function SWFWeightingComparison() {
  const rows = [
    { range: '0 to 2 (Deprivation)', benthamite: '1.0×', rawlsian: '1.0× (Targeted)', utility: 'High (Steep curve)' },
    { range: '3 to 6 (Middle)', benthamite: '1.0×', rawlsian: '0.0× (Ignored)', utility: 'Moderate' },
    { range: '7 to 10 (Comfortable)', benthamite: '1.0×', rawlsian: '0.0× (Ignored)', utility: 'Low (Flat)' },
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-xl my-8">
      <h4 className="font-bold uppercase tracking-widest text-indigo-400 mb-1">
        Social Welfare Function Weights
      </h4>
      <p className="text-sm text-zinc-400 mb-4">
        How each framework weights a +1 Life Satisfaction gain depending on where it lands.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr>
              <th className="border-b-2 border-zinc-700 px-3 py-2 font-bold text-zinc-100">Life Satisfaction Range</th>
              <th className="border-b-2 border-zinc-700 px-3 py-2 font-bold text-zinc-100">Benthamite</th>
              <th className="border-b-2 border-zinc-700 px-3 py-2 font-bold text-zinc-100">Rawlsian</th>
              <th className="border-b-2 border-zinc-700 px-3 py-2 font-bold text-zinc-100">Utility-Weighted</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="border-b border-zinc-800 px-3 py-2 text-zinc-300 font-semibold">{r.range}</td>
                <td className="border-b border-zinc-800 px-3 py-2 text-zinc-400 font-mono">{r.benthamite}</td>
                <td className="border-b border-zinc-800 px-3 py-2 text-zinc-400 font-mono">{r.rawlsian}</td>
                <td className="border-b border-zinc-800 px-3 py-2 text-zinc-400 font-mono">{r.utility}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}