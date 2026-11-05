import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Policy } from '../../utils/types';
import { OverallBar } from './PolicyBars';

const TABS = ['#ecdcb0', '#e8d6a6', '#e4d09d', '#eadaab'];
const TILT = [-1.5, 1, -1, 1.5];

interface InTrayProps {
  deck: Policy[];
  selectedId: string | null;
  signedId: string | null;
  /** No picking while a bill is being signed or enacted, or after the term. */
  locked: boolean;
  onPick: (policy: Policy) => void;
}

/**
 * Today's four bills as manila files, each with its paper sticking out.
 * Closed files show only the bill's name and its overall blue/orange bar.
 * Clicking a file pulls its paper onto the folder; clicking it again puts it back.
 * On a new day, yesterday's files slide away and the new ones are dealt in.
 */
export default function InTray({ deck, selectedId, signedId, locked, onPick }: InTrayProps) {
  const files = deck.slice(0, 4);
  return (
    <div className="h-full flex flex-col gap-3 min-h-0">
      <span className="text-[10px] font-extrabold tracking-[.14em] uppercase text-[#f5e9d6]">
        In-tray · {signedId ? 'done for today' : `${files.length} bills`}
      </span>
      <AnimatePresence mode="popLayout" initial={false}>
        {files.map((policy, i) => {
          const out = policy.id === selectedId || policy.id === signedId;
          const status = policy.id === signedId ? 'Signed' : out ? 'Paper on your desk' : 'Unread';
          const dim = !!signedId && policy.id !== signedId;
          return (
            <motion.div
              key={policy.id}
              className="relative flex-1 min-h-[96px] max-h-[170px]"
              style={{ rotate: TILT[i % 4] }}
              initial={{ x: 60, y: -30, opacity: 0 }}
              animate={{ x: 0, y: 0, opacity: dim ? 0.45 : 1, transition: { delay: 0.12 + i * 0.09, duration: 0.4, ease: [0.2, 0.75, 0.25, 1] } }}
              exit={{ x: 140, opacity: 0, transition: { delay: i * 0.05, duration: 0.3, ease: [0.4, 0, 1, 1] } }}
            >
              <button
                type="button"
                disabled={locked}
                onClick={() => onPick(policy)}
                aria-pressed={out}
                aria-label={`${policy.policyName}: ${out ? 'put the paper back' : 'take the paper out'}`}
                className={`desk-file absolute inset-0 w-full text-left ${locked ? 'cursor-default' : 'cursor-pointer'}`}
                style={{ filter: 'drop-shadow(0 10px 12px rgba(0,0,0,.45))' }}
              >
                {/* Tab: runs down behind the front so there's never a gap */}
                <span className="absolute left-2.5 top-0 w-[110px] h-9 rounded-t-lg px-2 pt-0.5 text-[10px] font-extrabold text-[#3b2a0c] truncate" style={{ backgroundColor: TABS[i % 4] }}>
                  Bill {i + 1}
                </span>
                {/* The paper inside, sticking out across the full width */}
                <AnimatePresence initial={false}>
                  {!out && (
                    <motion.span
                      key="paper"
                      initial={{ y: 14, opacity: 0 }}
                      animate={{ y: 0, opacity: 1, transition: { delay: 0.15, duration: 0.25 } }}
                      exit={{ y: -10, opacity: 0, transition: { duration: 0.12 } }}
                      className="absolute left-1.5 right-1.5 top-5 h-[80%]"
                    >
                      <span className="desk-peek absolute inset-0 rounded-[2px] bg-[#faf6ec] shadow-[0_-1px_3px_rgba(0,0,0,.18)] px-2.5 pt-1.5 flex flex-col gap-1">
                        <span className="block h-[3px] w-[46%] rounded bg-[#c9c3b8]" />
                        <span className="block h-[3px] w-[72%] rounded bg-[#ddd7cc]" />
                      </span>
                    </motion.span>
                  )}
                </AnimatePresence>
                {/* Front of the file */}
                <span
                  className="absolute left-0 right-0 top-[30px] bottom-0 rounded-[3px_8px_8px_8px] px-3.5 py-2.5 flex flex-col gap-1 transition-colors"
                  style={{ backgroundColor: out && !signedId ? '#fbf3dc' : '#f3e5bf' }}
                >
                  <span className="font-display font-black text-[clamp(14px,1.15vw,17px)] leading-tight text-[#2a1f0e] line-clamp-2">{policy.policyName}</span>
                  <span className="text-[10px] font-extrabold text-[#7c5a1d]">{status}</span>
                  <OverallBar rules={policy.specificRules} height={11} className="mt-auto" />
                </span>
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}