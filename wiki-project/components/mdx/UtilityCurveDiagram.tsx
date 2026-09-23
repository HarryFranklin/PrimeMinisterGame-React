import React from 'react';
import UtilityCurveChart, { CurveStep } from './UtilityCurveChart';
import { personalUtility } from '../../lib/utility';

interface Zone {
  id: 'steep' | 'slowing' | 'flat';
  name: string;
  from: number;
  to: number;
  color: string;
}

// Colours match the "+1 Point Is Worth" table: greenest at the bottom, reddest at the top.
const ZONES: Zone[] = [
  { id: 'steep',   name: 'Steep climb',  from: 2, to: 4,  color: '#34d399' },
  { id: 'slowing', name: 'Slowing down', from: 4, to: 8,  color: '#fbbf24' },
  { id: 'flat',    name: 'Flat top',     from: 8, to: 10, color: '#f87171' },
];

const rise = (z: Zone) => personalUtility(z.to) - personalUtility(z.from);
const fmt = (n: number) => n.toFixed(2);
const pct = (n: number) => `${Math.round(n * 100)}%`;

const stepFor = (z: Zone): CurveStep => ({
  from: z.from,
  to: z.to,
  color: z.color,
  runLabel: `${z.to - z.from} points`,
  riseLabel: `+${fmt(rise(z))}`,
});

/** Static (control group) version: every zone and step is shown at once,
 * with no buttons, hover states or click targets. */
export default function UtilityCurveDiagram() {
  const [steep, slowing, flat] = ZONES;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 my-8 shadow-xl flex flex-col">
      <div className="mb-3 shrink-0">
        <span className="text-xs font-bold uppercase tracking-widest text-pink-500">
          Why Each Extra Point of Satisfaction Matters Less
        </span>
      </div>

      <div className="flex flex-wrap gap-3 mb-3">
        {ZONES.map((z) => (
          <span key={z.id} className="flex items-center text-xs font-bold text-zinc-300">
            <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5" style={{ backgroundColor: z.color }} />
            {z.name} <span className="opacity-70 font-semibold ml-1">({z.from} to {z.to})</span>
          </span>
        ))}
      </div>

      <UtilityCurveChart
        steps={ZONES.map(stepFor)}
        zones={ZONES}
        activeZoneIds={ZONES.map((z) => z.id)}
        ariaLabel="Personal Utility curve. Utility rises steeply between Life Satisfaction 2 and 4, then flattens out."
      />

      <div className="mt-3 text-sm text-zinc-400 leading-relaxed space-y-2">
        <p>
          <span className="font-bold" style={{ color: steep.color }}>Steep climb:</span> going from {steep.from} to {steep.to} adds {fmt(rise(steep))} utility, about {pct(rise(steep))} of all the utility there is, in just {steep.to - steep.from} points.
        </p>
        <p>
          <span className="font-bold" style={{ color: slowing.color }}>Slowing down:</span> going from {slowing.from} to {slowing.to} adds {fmt(rise(slowing))} utility. That is {slowing.to - slowing.from} points, but it adds less than the steep climb did in 2.
        </p>
        <p>
          <span className="font-bold" style={{ color: flat.color }}>Flat top:</span> going from {flat.from} to {flat.to} adds only {fmt(rise(flat))} utility, about {pct(rise(flat))} of the total.
        </p>
        <p>
          The steep climb and the flat top are both {steep.to - steep.from} points wide, but the first is worth about {Math.round(rise(steep) / rise(flat))} times as much.
        </p>
      </div>
    </div>
  );
}