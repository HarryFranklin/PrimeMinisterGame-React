import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { track } from '../../client/telemetry';
import { OverallBar } from './PolicyBars';
import { Direction } from './deskTheme';
import { SIGNATURE_PATH } from './BillPaper';

/** Hovers shorter than this are ignored (mouse passing through). */
const HOVER_MIN_MS = 250;
/** Moving from one slip to the next crosses a small gap; wait this long before
 * going back to "the country on polling day", so the chart doesn't flick. */
const CLEAR_DELAY_MS = 180;

type HoverStart = { index: number; policyId: string | null; turn: number; at: number } | null;

/** Log a finished hover (enacted_policy_hovered), as the old list did. */
function finishHover(ref: React.MutableRefObject<HoverStart>) {
  const h = ref.current;
  ref.current = null;
  if (h && Date.now() - h.at >= HOVER_MIN_MS) {
    track('enacted_policy_hovered', { index: h.index + 1, policy_id: h.policyId, enacted_turn: h.turn, dwell_ms: Date.now() - h.at });
  }
}

export interface SignedBill {
  /** History turn (the turn after the bill was signed), as used by the chart. */
  turn: number;
  policyId: string | null;
  name: string;
  description?: string;
  /** Change in the term's measure that day. */
  scoreChange: number;
  directions: Direction[];
}

interface SignedBillsProps {
  bills: SignedBill[];
  hoveredId: string | null;
  metricAbbreviation: string;
  /** PM's colour (dark tone). */
  color: string;
  onHover: (policyId: string | null, turn: number | null) => void;
}

/**
 * End of term: the bills signed into law, as signed slips on the right flap.
 * The slips share the flap's height equally. Hovering one shows its
 * before/after on the chart and its rules under it.
 * Tracks enacted_policy_hovered exactly as the old list did.
 */
export default function SignedBills({ bills, hoveredId, metricAbbreviation, color, onHover }: SignedBillsProps) {
  const hoverStart = useRef<HoverStart>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (clearTimer.current) clearTimeout(clearTimer.current); }, []);

  return (
    <div className="flex-1 flex flex-col gap-2.5 min-h-0">
      {bills.map((bill, index) => {
        const on = hoveredId !== null && hoveredId === bill.policyId;
        const dim = hoveredId !== null && !on;
        const up = bill.scoreChange >= 0;
        return (
          <motion.div
            key={`${bill.turn}-${bill.policyId}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: dim ? 0.55 : 1, x: on ? -6 : 0, transition: { duration: 0.25, delay: hoveredId === null ? index * 0.06 : 0 } }}
            onMouseEnter={() => {
              if (clearTimer.current) { clearTimeout(clearTimer.current); clearTimer.current = null; }
              onHover(bill.policyId, bill.turn);
              hoverStart.current = { index, policyId: bill.policyId, turn: bill.turn, at: Date.now() };
            }}
            onMouseLeave={() => {
              finishHover(hoverStart);
              clearTimer.current = setTimeout(() => { clearTimer.current = null; onHover(null, null); }, CLEAR_DELAY_MS);
            }}
            className="relative flex-1 min-h-[88px] grid grid-cols-[52px_1fr_auto] gap-3 items-center bg-[#fffdf7] rounded-[3px] px-3 py-2.5 cursor-default border-l-4 shadow-[0_2px_6px_rgba(60,40,10,.15)]"
            style={{ borderLeftColor: on ? color : '#e7dcc0' }}
          >
            {/* Little calendar page: the day it was signed */}
            <div className="rounded-[3px] overflow-hidden bg-white shadow-[0_1px_3px_rgba(0,0,0,.2)] text-center">
              <div className="text-[8px] font-black tracking-[.12em] text-white py-[2px]" style={{ backgroundColor: color }}>DAY</div>
              <div className="font-display font-black text-[22px] leading-none py-1 text-stone-900">{bill.turn - 1}</div>
            </div>

            <div className="min-w-0 flex flex-col gap-1">
              <span className="font-display font-black text-[16px] leading-tight text-[#2a1f0e] truncate">{bill.name}</span>
              {bill.description && <span className="text-[11.5px] leading-snug text-stone-600 line-clamp-4">{bill.description}</span>}
              <OverallBar directions={bill.directions} height={8} />
            </div>

            <div className="flex flex-col items-end gap-0.5 shrink-0">
              <span className="text-[13px] font-black whitespace-nowrap" style={{ color: up ? '#1d4ed8' : '#b45309' }}>
                {up ? '+' : '−'}{Math.abs(bill.scoreChange).toFixed(2)} {metricAbbreviation}
              </span>
              <svg width="78" height="20" viewBox="0 0 280 70" aria-hidden="true" className="opacity-80">
                <path d={SIGNATURE_PATH} fill="none" stroke="#1d4ed8" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[9px] font-extrabold tracking-[.12em] text-stone-400">SIGNED</span>
            </div>

          </motion.div>
        );
      })}
    </div>
  );
}