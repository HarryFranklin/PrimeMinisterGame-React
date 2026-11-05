import React from 'react';
import { motion } from 'framer-motion';

/** Perforated top edge of a tear-off page. */
const PERFORATION = (() => {
  const teeth = 14;
  const pts: string[] = [];
  for (let i = 0; i <= teeth; i++) {
    const x = (i / teeth) * 100;
    pts.push(`${x}% ${i % 2 === 0 ? '0px' : '5px'}`);
  }
  return `polygon(${pts.join(', ')}, 100% 100%, 0% 100%)`;
})();

function Page({ day, turns, color }: { day: number | null; turns: number; color: string }) {
  const left = day === null ? 0 : turns + 1 - day;
  return (
    <div
      className="absolute inset-0 bg-[#fafaf9] flex flex-col items-center justify-center text-center shadow-[0_2px_4px_rgba(0,0,0,.12)]"
      style={{ clipPath: PERFORATION }}
    >
      <span className="text-[11px] font-black tracking-[.18em]" style={{ color }}>
        {day === null ? 'POLLING DAY' : 'DAY'}
      </span>
      <span className="font-display font-black leading-none text-stone-900" style={{ fontSize: day === null ? 54 : 88 }}>
        {day === null ? 'VOTE' : day}
      </span>
      <span className="mt-1 text-[12px] font-extrabold text-stone-600">
        {day === null ? 'The term is over' : `Election in ${left} ${left === 1 ? 'day' : 'days'}`}
      </span>
    </div>
  );
}

interface DayCalendarProps {
  /** The day just finished (its page is torn off). */
  from: number;
  /** The new day underneath, or null for polling day. */
  to: number | null;
  turns: number;
  /** The PM's colour (binding and labels). */
  color: string;
}

/**
 * A tear-off desk calendar: it drops onto the desk showing today, then the
 * page is ripped off and falls away to reveal tomorrow underneath.
 * (Mount inside <AnimatePresence> for its exit.)
 */
export default function DayCalendar({ from, to, turns, color }: DayCalendarProps) {
  return (
    <motion.div
      className="relative w-[200px] drop-shadow-[0_24px_30px_rgba(0,0,0,.5)]"
      initial={{ y: -90, rotate: -6, opacity: 0 }}
      animate={{ y: 0, rotate: -2, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 20 } }}
      exit={{ y: -60, rotate: 4, opacity: 0, transition: { duration: 0.35, ease: [0.4, 0, 1, 1] } }}
    >
      {/* Binding, with two rings */}
      <div className="relative h-6 rounded-t-md" style={{ backgroundColor: color }}>
        <span className="absolute left-10 -top-2 w-3 h-5 rounded-full border-[3px] border-zinc-300" />
        <span className="absolute right-10 -top-2 w-3 h-5 rounded-full border-[3px] border-zinc-300" />
      </div>
      <div className="relative h-[170px]">
        {/* A couple of pages' thickness underneath */}
        <div className="absolute inset-x-1 -bottom-1.5 h-3 bg-[#e7e5e4] rounded-b-sm" />
        <div className="absolute inset-x-0.5 -bottom-[3px] h-3 bg-[#efeeec] rounded-b-sm" />
        {/* Tomorrow, waiting underneath */}
        <Page day={to} turns={turns} color={color} />
        {/* Today: torn off from the right, curls and falls away */}
        <motion.div
          className="absolute inset-0"
          style={{ transformOrigin: '0% 0%' }}
          initial={{ rotate: 0, x: 0, y: 0, opacity: 1 }}
          animate={{
            rotate: [0, -3, 4, 32],
            x: [0, 0, 6, 90],
            y: [0, 3, 10, 260],
            opacity: [1, 1, 1, 0],
            transition: { delay: 0.6, duration: 1.0, times: [0, 0.15, 0.35, 1], ease: 'easeIn' },
          }}
        >
          <Page day={from} turns={turns} color={color} />
        </motion.div>
      </div>
    </motion.div>
  );
}
