'use client';

import React from 'react';
import D3Chart from './D3Chart';
import { personalUtility, societalUtility } from '../lib/utility';
import { interpolateRdYlGn, rgb } from 'd3';
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
      <ChartBox title="Town B (Divided Society)" desc="Mean: 5.5 | The population is split into two groups.">
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
          markers={[
            { value: 2, label: 'Floor: 2', color: '#ef4444', dashed: true },
            { value: 5, label: 'Mean: 5.0', color: '#fbbf24', dashed: true }
          ]}
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
          markers={[
            { value: 4, label: 'Floor: 4', color: '#ef4444', dashed: true },
            { value: 5, label: 'Mean: 5.0', color: '#fbbf24', dashed: true }
          ]}
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
      <ChartBox title="Low Dispersion" desc="Mean: 5.0 | Range: 3 to 7 (4 points) | High equality, minimal spread.">
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
            { value: 5, label: 'Mean: 5.0', color: '#fbbf24', dashed: true }
          ]}
        />
      </ChartBox>
      <ChartBox title="High Dispersion" desc="Mean: 5.0 | Range: 0 to 10 (10 points) | Extreme inequality, maximum spread.">
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
            { value: 5, label: 'Mean: 5.0', color: '#fbbf24', dashed: true }
          ]}
        />
      </ChartBox>
    </Container>
  );
}

export function BenthamiteMeanShift() {
  // Half the society is "just getting by" (4 to 5) and half is "comfortable" (6 to 8).
  const before = toHisto([0, 0, 0, 0, 25, 25, 17, 16, 17, 0, 0]);
  // The policy lifts everyone in the comfortable half by 1 point. The bottom half is unchanged.
  const after = toHisto([0, 0, 0, 0, 25, 25, 0, 17, 16, 17, 0]);

  // Means are calculated from the data so the captions can never disagree with the charts.
  const meanOf = (h: { name: string; count: number }[]) =>
    h.reduce((s, d) => s + Number(d.name) * d.count, 0) / h.reduce((s, d) => s + d.count, 0);
  const meanBefore = meanOf(before);
  const meanAfter = meanOf(after);

  return (
    <Container>
      <ChartBox title="Before the policy" desc={`Mean: ${meanBefore.toFixed(2)} | Blue columns show who will gain from the policy.`}>
        <D3Chart
          plotType="1D"
          chartData={[]}
          histogramData={before}
          activePolicyRules={[{ minLS: 6, maxLS: 8, impact: 1 }]}
          xAxisType={AxisVariable.LifeSatisfaction}
          yAxisType={AxisVariable.LifeSatisfaction}
          color="#3b82f6"
          visualStyle="faces"
          faceCols={1}
          yAxisMax={30}
          theme="dark"
          markers={[{ value: meanBefore, label: `Mean: ${meanBefore.toFixed(2)}`, color: '#fbbf24', dashed: true }]}
        />
      </ChartBox>
      <ChartBox title="After the policy" desc={`Mean: ${meanAfter.toFixed(2)} | The comfortable half gained 1 point each. The other half did not change.`}>
        <D3Chart
          plotType="1D"
          chartData={[]}
          histogramData={after}
          activePolicyRules={[{ minLS: 7, maxLS: 9, impact: 1 }]}
          xAxisType={AxisVariable.LifeSatisfaction}
          yAxisType={AxisVariable.LifeSatisfaction}
          color="#3b82f6"
          visualStyle="faces"
          faceCols={1}
          yAxisMax={30}
          theme="dark"
          markers={[
            { value: meanAfter, label: `Mean: ${meanAfter.toFixed(2)}`, color: '#fbbf24', dashed: true },
            { value: meanBefore, label: `Before: ${meanBefore.toFixed(2)}`, color: '#a1a1aa', dashed: true }
          ]}
        />
      </ChartBox>
    </Container>
  );
}

interface PolicyPanel {
  label: string;
  data: { name: string; count: number }[];
  rules: { minLS: number; maxLS: number; impact: number }[];
  marker: { value: number; label: string };
  desc: string;
}

function PolicyGrid({ title, titleClass, color, markerColor, panels }: {
  title: string; titleClass: string; color: string; markerColor: string; panels: PolicyPanel[];
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-xl my-8">
      <h4 className={`text-lg font-bold uppercase tracking-widest mb-4 ${titleClass}`}>{title}</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {panels.map((p) => (
          <div key={p.label} className="flex flex-col">
            <span className="text-sm font-bold text-zinc-100">{p.label}</span>
            <p className="text-xs text-zinc-400 mt-1 mb-2 min-h-[2.5rem]">{p.desc}</p>
            <div className="h-56 w-full relative">
              <D3Chart
                plotType="1D"
                chartData={[]}
                histogramData={p.data}
                activePolicyRules={p.rules}
                xAxisType={AxisVariable.LifeSatisfaction}
                yAxisType={AxisVariable.LifeSatisfaction}
                color={color}
                visualStyle="faces"
                faceCols={1}
                yAxisMax={25}
                theme="dark"
                markers={[{ value: p.marker.value, label: p.marker.label, color: markerColor, dashed: true }]}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BenthamitePolicyEffects() {
  const mean = (v: number) => ({ value: v, label: `Mean: ${v.toFixed(2)}` });
  const panels: PolicyPanel[] = [
    { label: 'Baseline', data: BASE_POP, rules: [], marker: mean(6.24),
      desc: 'Baseline society before any intervention.' },
    // Shifts populations from 7, 8, 9 up to 8, 9, 10
    { label: 'Tax Cuts', data: toHisto([0, 2, 4, 6, 8, 10, 18, 16, 22, 10, 4]), rules: [{ minLS: 7, maxLS: 10, impact: 1 }], marker: mean(6.36),
      desc: 'Broad tax cuts: The comfortable majority gains, the bottom stays exactly where they were.' },
    // Shifts a few people up across the entire distribution
    { label: 'Infrastructure', data: toHisto([0, 1, 3, 5, 7, 9, 17, 23, 21, 10, 4]), rules: [{ minLS: 1, maxLS: 10, impact: 1 }], marker: mean(6.55),
      desc: 'Universal infrastructure: Minor gains spread evenly across the entire population.' },
    // Shifts people in the lower-middle up
    { label: 'Public Health', data: toHisto([0, 2, 4, 6, 6, 12, 20, 22, 20, 8, 2]), rules: [{ minLS: 4, maxLS: 6, impact: 1 }], marker: mean(6.28),
      desc: 'Public health campaigns: Raises the average by helping the middle, but misses the most vulnerable.' },
  ];
  return <PolicyGrid title="Benthamite Policy Focus" titleClass="text-blue-400" color="#3b82f6" markerColor="#fbbf24" panels={panels} />;
}

export function RawlsianPolicyEffects() {
  const floor = (v: number) => ({ value: v, label: `Floor: ${v}` });
  const panels: PolicyPanel[] = [
    { label: 'Baseline', data: BASE_POP, rules: [], marker: floor(1),
      desc: 'Baseline society before any intervention.' },
    // Moves all 1s and 2s up to 3
    { label: 'Welfare', data: toHisto([0, 0, 0, 12, 8, 10, 18, 22, 20, 8, 2]), rules: [{ minLS: 0, maxLS: 3, impact: 1 }], marker: floor(3),
      desc: 'Means-tested welfare: Lifts the absolute worst-off to a minimum standard of 3.' },
    // Moves 2s and 3s to 4, but leaves 1s behind (unemployed)
    { label: 'Min Wage', data: toHisto([0, 2, 0, 0, 18, 10, 18, 22, 20, 8, 2]), rules: [{ minLS: 2, maxLS: 4, impact: 1 }], marker: floor(1),
      desc: 'Minimum wage: Helps the struggling working class reach 4, but misses the unemployed at 1.' },
    // Moves 1s to 4, 2s to 5
    { label: 'Housing', data: toHisto([0, 0, 0, 6, 10, 14, 18, 22, 20, 8, 2]), rules: [{ minLS: 1, maxLS: 5, impact: 1 }], marker: floor(3),
      desc: 'Targeted social housing: Radically transforms the bottom, pulling the floor up to 3.' },
  ];
  return <PolicyGrid title="Rawlsian Policy Focus" titleClass="text-emerald-400" color="#10b981" markerColor="#ef4444" panels={panels} />;
}

// Picks white or near-black text, whichever is easier to read on the given background colour.
const luminance = (colour: string) => {
  const { r, g, b } = rgb(colour);
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const contrastRatio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const readableText = (bg: string) => {
  const L = luminance(bg);
  return contrastRatio(L, luminance('#ffffff')) >= contrastRatio(L, luminance('#18181b')) ? '#ffffff' : '#18181b';
};

// 0 = red, 1 = green (the same RdYlGn scale used in the simulation heatmap).
const heat = (value: number): React.CSSProperties => {
  const bg = interpolateRdYlGn(value);
  return { backgroundColor: bg, color: readableText(bg) };
};

export function SWFWeightingComparison() {
  // Weight of a +1 Life Satisfaction gain, scaled so that a gain from 2 to 3 counts as 1.00.
  // The utility columns come straight from lib/utility.ts, so they always match the curves.
  const refPersonal = personalUtility(3) - personalUtility(2);
  const refSocietal = societalUtility(3) - societalUtility(2);

  const rows = [
    { start: 2, band: 'Struggling' },
    { start: 4, band: 'Just getting by' },
    { start: 6, band: 'Comfortable' },
    { start: 9, band: 'Thriving' },
  ].map((r) => ({
    label: `${r.start} (${r.band})`,
    benthamite: 1,
    // Assumes the lowest score in society is 2.
    rawlsian: r.start === 2 ? 1 : 0,
    personal: (personalUtility(r.start + 1) - personalUtility(r.start)) / refPersonal,
    societal: (societalUtility(r.start + 1) - societalUtility(r.start)) / refSocietal,
  }));

  const th = "border-b-2 border-zinc-700 px-3 py-2 font-bold text-zinc-100";
  const tdLabel = "border-b border-zinc-800 px-3 py-2 text-zinc-300 font-semibold";
  const cell = "border-2 border-zinc-900 px-3 py-2 text-center font-bold font-mono tabular-nums";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-xl my-8">
      <h4 className="font-bold uppercase tracking-widest text-indigo-400 mb-1">
        Weight Given to a +1 Gain
      </h4>
      <p className="text-sm text-zinc-400 mb-4">
        How much each approach counts the same +1 Life Satisfaction gain, depending on where the person starts.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr>
              <th className={th}>Person starts at</th>
              <th className={`${th} text-center`}>Benthamite</th>
              <th className={`${th} text-center`}>Rawlsian</th>
              <th className={`${th} text-center`}>Personal Utility</th>
              <th className={`${th} text-center`}>Societal Utility</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td className={tdLabel}>{r.label}</td>
                <td className={cell} style={heat(r.benthamite)}>{r.benthamite.toFixed(2)}</td>
                <td className={cell} style={heat(r.rawlsian)}>{r.rawlsian.toFixed(2)}</td>
                <td className={cell} style={heat(r.personal)}>{r.personal.toFixed(2)}</td>
                <td className={cell} style={heat(r.societal)}>{r.societal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs text-zinc-400">
        <span>Counts for nothing</span>
        <div
          className="h-2 flex-1 max-w-[12rem] rounded-full"
          style={{ background: `linear-gradient(to right, ${[0, 0.25, 0.5, 0.75, 1].map((v) => interpolateRdYlGn(v)).join(', ')})` }}
        />
        <span>Counts fully</span>
      </div>
      <p className="mt-3 text-xs text-zinc-500 leading-snug">
        Weights are scaled so that a +1 gain for someone starting at 2 counts as 1.00. The Rawlsian column assumes the lowest score in society is 2. A gain counts only if it raises that lowest score, so a gain for anyone else counts as 0.
      </p>
    </div>
  );
}