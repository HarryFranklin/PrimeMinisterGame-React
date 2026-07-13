import React from 'react';

export interface LegendItem {
  label: string;
  color: string;
}

/**
 * A row of "swatch + label" legend entries (e.g. Improved/Stable/Worsened
 * under the projected-population chart). Extracted so the legend markup
 * lives in one place and can later grow a non-color indicator (icon/pattern)
 * for accessibility without editing it in multiple spots.
 */
export const Legend = ({ items, visible = true }: { items: LegendItem[]; visible?: boolean }) => (
  <div
    className={`px-4 pb-3 flex flex-wrap gap-4 justify-center border-t border-zinc-50 pt-2 shrink-0 transition-all duration-300 ${
      visible ? 'opacity-100' : 'opacity-0 grayscale pointer-events-none hidden'
    }`}
  >
    {items.map((item) => (
      <div key={item.label} className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight">{item.label}</span>
      </div>
    ))}
  </div>
);
