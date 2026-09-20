'use client';

import React, { useState } from 'react';
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

type Mode = Zone['id'] | 'compare';

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

function describe(mode: Mode | null): string {
  const [steep, slowing, flat] = ZONES;
  switch (mode) {
    case 'steep':
      return `Steep climb: going from ${steep.from} to ${steep.to} adds ${fmt(rise(steep))} utility, about ${pct(rise(steep))} of all the utility there is, in just ${steep.to - steep.from} points.`;
    case 'slowing':
      return `Slowing down: going from ${slowing.from} to ${slowing.to} adds ${fmt(rise(slowing))} utility. That is ${slowing.to - slowing.from} points, but it adds less than the steep climb did in 2.`;
    case 'flat':
      return `Flat top: going from ${flat.from} to ${flat.to} adds only ${fmt(rise(flat))} utility, about ${pct(rise(flat))} of the total. It is the same ${flat.to - flat.from}-point step as the steep climb, but worth far less.`;
    case 'compare':
      return `Both steps are ${steep.to - steep.from} points wide. Going from ${steep.from} to ${steep.to} adds ${fmt(rise(steep))} utility. Going from ${flat.from} to ${flat.to} adds only ${fmt(rise(flat))}. The first step is worth about ${Math.round(rise(steep) / rise(flat))} times as much.`;
    default:
      return 'Utility climbs quickly at low Life Satisfaction scores and flattens out near the top. Each extra point is worth a little less than the one before it. Hover over or select a zone to see how much utility each step adds.';
  }
}

export default function UtilityCurveDiagram() {
  const [selected, setSelected] = useState<Mode | null>(null);
  const [hovered, setHovered] = useState<Mode | null>(null);
  const mode = hovered ?? selected;

  const toggle = (m: Mode) => setSelected((cur) => (cur === m ? null : m));

  const steps: CurveStep[] =
    mode === 'compare'
      ? [stepFor(ZONES[0]), stepFor(ZONES[2])]
      : mode
        ? [stepFor(ZONES.find((z) => z.id === mode) as Zone)]
        : [];
  const activeZoneIds = mode === 'compare' ? ['steep', 'flat'] : mode ? [mode] : [];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 my-8 shadow-xl flex flex-col">
      <div className="mb-3 shrink-0">
        <span className="text-xs font-bold uppercase tracking-widest text-pink-500">
          Why Each Extra Point of Satisfaction Matters Less
        </span>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {ZONES.map((z) => {
          const on = selected === z.id;
          return (
            <button
              key={z.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(z.id)}
              onMouseEnter={() => setHovered(z.id)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(z.id)}
              onBlur={() => setHovered(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                on ? 'text-zinc-950' : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
              }`}
              style={on ? { backgroundColor: z.color, borderColor: z.color } : undefined}
            >
              <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: on ? '#18181b' : z.color }} />
              {z.name} <span className="opacity-70 font-semibold">({z.from} to {z.to})</span>
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={selected === 'compare'}
          onClick={() => toggle('compare')}
          onMouseEnter={() => setHovered('compare')}
          onMouseLeave={() => setHovered(null)}
          onFocus={() => setHovered('compare')}
          onBlur={() => setHovered(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
            selected === 'compare'
              ? 'bg-violet-400 border-violet-400 text-zinc-950'
              : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
          }`}
        >
          Compare equal steps
        </button>
      </div>

      <UtilityCurveChart
        steps={steps}
        zones={ZONES}
        activeZoneIds={activeZoneIds}
        onZoneEnter={(id) => setHovered(id as Mode)}
        onZoneLeave={() => setHovered(null)}
        onZoneClick={(id) => toggle(id as Mode)}
        ariaLabel="Personal Utility curve. Utility rises steeply between Life Satisfaction 2 and 4, then flattens out."
      />

      <p className="mt-3 text-sm text-zinc-400 leading-relaxed min-h-[4.5rem]">{describe(mode)}</p>
    </div>
  );
}