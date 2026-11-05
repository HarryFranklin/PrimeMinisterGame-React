import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Policy, Respondent } from '../../utils/types';
import { ruleCoverageText } from '../PolicyRuleCard';
import { OverallBar } from './PolicyBars';
import { overallByBin } from './deskTheme';

/** Must match .desk-ink / .desk-nib in globals.css. */
export const SIGNATURE_PATH =
  'M8 52 C 18 30 26 8 34 22 C 40 34 30 48 22 44 C 14 40 30 30 46 34 C 60 38 58 54 70 46 C 82 38 84 20 92 26 C 100 32 92 52 104 48 C 116 44 118 30 126 34 C 134 38 128 52 140 48 C 152 44 156 28 166 32 C 176 36 170 52 184 46 C 198 40 206 30 222 36 C 238 42 250 44 270 30';

/** Signature (~1 s), pen lifts away, then the paper slides off (done by ~1.9 s). */
export const SIGN_SEQUENCE_MS = 1950;

/** Where the paper comes from and goes back to: the in-tray, to the right. */
const FROM_TRAY = { x: '60%', y: -20, scale: 0.55, rotate: 4, opacity: 0 };

interface BillPaperProps {
  policy: Policy;
  billNumber: number;
  population: Respondent[];
  /** e.g. "AVERY RIDGE" — printed under the signature line. */
  pmName: string;
  signing: boolean;
  onSign: () => void;
  onPutBack: () => void;
}

/**
 * The bill, pulled out of its file onto the right flap of the folder.
 * It glides in from the in-tray and back again when put back. Signing draws
 * the PM's signature with a moving pen, then the paper slides off the folder.
 * (Mount inside <AnimatePresence> so putting it back can play.)
 */
export default function BillPaper({ policy, billNumber, population, pmName, signing, onSign, onPutBack }: BillPaperProps) {
  const directions = useMemo(() => overallByBin(policy, population), [policy, population]);
  return (
    <motion.div
      initial={FROM_TRAY}
      animate={
        signing
          ? { x: '115%', y: 60, rotate: 14, scale: 1, opacity: 0, transition: { delay: 1.25, duration: 0.6, ease: [0.55, 0, 0.8, 0.3] } }
          : { x: 0, y: 0, rotate: 0.5, scale: 1, opacity: 1, transition: { duration: 0.38, ease: [0.2, 0.75, 0.25, 1] } }
      }
      exit={signing ? { opacity: 0, transition: { duration: 0 } } : { ...FROM_TRAY, transition: { duration: 0.28, ease: [0.4, 0, 1, 1] } }}
      style={{ transformOrigin: '100% 0%' }}
      className="desk-paper absolute inset-0 shadow-[0_8px_18px_rgba(60,40,10,.3)] pl-14 pr-7 py-5 flex flex-col gap-3 z-10 overflow-hidden"
      data-telemetry-id="bill_paper"
      data-telemetry-type="panel"
    >
      <div className="flex justify-between items-center gap-3">
        <span className="text-[10px] font-extrabold tracking-[.14em] uppercase text-[#7c5a1d]">Bill {billNumber} · for your signature</span>
        <button
          type="button"
          onClick={onPutBack}
          disabled={signing}
          className="text-[12px] font-extrabold border border-stone-300 rounded-lg px-2.5 py-1.5 hover:bg-stone-100 disabled:opacity-40"
        >
          Put it back
        </button>
      </div>

      <h2 className="font-display font-black text-[clamp(24px,2.3vw,36px)] leading-[1.05] text-[#2a1f0e] m-0">{policy.policyName}</h2>
      <p className="text-[15px] leading-relaxed text-stone-700 m-0">{policy.description}</p>

      <div className="flex flex-col gap-1">
        <span className="text-[10px] font-extrabold tracking-[.14em] uppercase text-[#7c5a1d]">Overall</span>
        <OverallBar directions={directions} height={14} />
        <div className="flex justify-between text-[10px] font-bold text-stone-500"><span>0</span><span>5</span><span>10</span></div>
      </div>

      <div className="flex flex-col gap-1.5 min-h-0 overflow-y-auto">
        <span className="text-[10px] font-extrabold tracking-[.14em] uppercase text-[#7c5a1d]">In numbers</span>
        {policy.specificRules.map((r, i) => (
          <span key={i} className="text-[13px] text-stone-700 leading-snug">
            <strong style={{ color: r.impact > 0 ? '#1d4ed8' : '#b45309' }}>{r.impact > 0 ? '▲' : '▼'}</strong>{' '}
            {ruleCoverageText(r, population)} · {r.note}
          </span>
        ))}
      </div>

      <div className="mt-auto flex items-end gap-4 shrink-0">
        <div className="flex-1 relative h-[84px]">
          <div className="absolute left-0 right-0 bottom-0 border-t-[1.5px] border-stone-900 pt-[3px] text-[10px] font-bold text-stone-500">
            {pmName}, PRIME MINISTER
          </div>
          {signing && (
            <div className="absolute left-0 top-0 w-[280px] h-[70px]">
              <svg width="280" height="70" viewBox="0 0 280 70" aria-hidden="true" className="absolute left-0 top-0 overflow-visible">
                <path className="desk-ink" d={SIGNATURE_PATH} fill="none" stroke="#1d4ed8" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div className="desk-nib absolute left-0 top-0 w-3.5 h-[120px] pointer-events-none">
                <div className="desk-nib-out absolute inset-0 origin-bottom">
                  <div className="absolute inset-0 origin-bottom rotate-[28deg]">
                    <div className="absolute inset-x-0 top-0 bottom-[18px] rounded-t-[7px] rounded-b-[2px] bg-[linear-gradient(90deg,#111827,#374151_45%,#111827)] shadow-[4px_6px_8px_rgba(0,0,0,.25)]" />
                    <div className="absolute inset-x-0 top-[22px] h-2 bg-[#d6b25e]" />
                    <div className="absolute left-px right-px bottom-0 h-[19px] bg-[#d6b25e] [clip-path:polygon(0_0,100%_0,50%_100%)]" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onSign}
          disabled={signing}
          className="bg-stone-900 text-[#faf6ec] rounded-[10px] px-5 py-3.5 font-black text-[15px] hover:bg-stone-800 disabled:cursor-default"
        >
          {signing ? 'Signed ✓' : 'Sign this bill ✒'}
        </button>
      </div>
    </motion.div>
  );
}
