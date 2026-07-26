import React, { useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AxisVariable, ElectionCycle, Respondent } from '../../utils/types';
import { CYCLE_COLORS } from '../../utils/uiHelpers';
import { FRAMEWORK_RULES } from '../../utils/frameworkRules';
import D3Chart from '../D3Chart';
import { ModalContent, ModalHeader, DPMMessage } from './SharedModalComponents';
import { useGame } from '../../context/GameStateContext';
import { track } from '../../client/telemetry';

const CONFETTI_COLORS = [...Object.values(CYCLE_COLORS), '#f59e0b'];

// Multi-directional confetti for the final win state
const OmniConfetti = ({ triggerKey }: { triggerKey: number }) => {
  return (
    <div key={triggerKey} className="fixed inset-0 overflow-hidden pointer-events-none z-[9999]">
      {Array.from({ length: 200 }).map((_, i) => {
        const side = i % 4; // 0: top, 1: bottom, 2: left, 3: right
        const randomX = Math.random() * 100;
        const randomY = Math.random() * 100;
        
        let initial = {};
        let animate = {};
        
        if (side === 0) { // Top down
          initial = { top: '-10%', left: `${randomX}vw` };
          animate = { top: '110%', left: `${randomX + (Math.random() * 20 - 10)}vw`, rotate: 720 };
        } else if (side === 1) { // Bottom up
          initial = { top: '110%', left: `${randomX}vw` };
          animate = { top: '-10%', left: `${randomX + (Math.random() * 20 - 10)}vw`, rotate: 720 };
        } else if (side === 2) { // Left to right
          initial = { left: '-10%', top: `${randomY}vh` };
          animate = { left: '110%', top: `${randomY + (Math.random() * 20 - 10)}vh`, rotate: 720 };
        } else { // Right to left
          initial = { left: '110%', top: `${randomY}vh` };
          animate = { left: '-10%', top: `${randomY + (Math.random() * 20 - 10)}vh`, rotate: 720 };
        }

        return (
          <motion.div
            key={i}
            initial={{ ...initial, opacity: 1 }}
            animate={{ ...animate, opacity: [1, 1, 0] }}
            transition={{ duration: 3 + Math.random() * 4, ease: 'easeOut', delay: Math.random() * 0.5 }}
            className="absolute w-3 h-3"
            style={{
              backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              borderRadius: i % 3 === 0 ? '50%' : '2px',
            }}
          />
        );
      })}
    </div>
  );
};

// Custom Dropdown Component
interface SelectOption {
  value: string;
  label: string;
}

const CustomSelect = ({ 
  value, 
  onChange, 
  options, 
  disabled, 
  placeholder 
}: { 
  value: string; 
  onChange: (v: string) => void; 
  options: SelectOption[]; 
  disabled: boolean; 
  placeholder: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between bg-zinc-50 border ${
          isOpen ? 'border-pink-500 ring-1 ring-pink-500' : 'border-zinc-300'
        } text-zinc-900 text-sm rounded-xl p-3.5 font-medium transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-zinc-400'
        }`}
      >
        <span className={`block truncate ${!selectedOption ? 'text-zinc-500 font-normal' : 'text-zinc-900'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="text-zinc-400 ml-3 shrink-0">
          <svg className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-pink-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      
      <AnimatePresence>
        {isOpen && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-[100] w-full bottom-[calc(100%+8px)] bg-white border border-zinc-200 shadow-2xl rounded-xl overflow-hidden origin-bottom"
          >
            <ul className="max-h-64 overflow-y-auto py-1.5 custom-scrollbar">
              {options.map((opt) => (
                <li
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`px-4 py-3 text-sm font-medium cursor-pointer transition-colors ${
                    value === opt.value 
                      ? 'bg-pink-50 text-pink-700' 
                      : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                >
                  {opt.label}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function FinalDebriefModal() {
  const { initialPopulation, completedRuns } = useGame();
  
  const [confettiKey, setConfettiKey] = useState(0);
  const [showReplay, setShowReplay] = useState(false);
  
  // Questionnaire State
  const [bestMetric, setBestMetric] = useState<string>("");
  const [bestSociety, setBestSociety] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setShowReplay(false);
    const timer = setTimeout(() => setShowReplay(true), 5000); 
    return () => clearTimeout(timer);
  }, [confettiKey]);

  const generateHistogramData = (targetPopulation: Respondent[]) => {
    if (!targetPopulation || targetPopulation.length === 0) return [];
    return Array.from({ length: 11 }, (_, i) => {
      const peopleInBar = targetPopulation.filter(r => Math.round(r.currentLS) === i);
      return {
        name: i,
        count: peopleInBar.length
      };
    });
  };

  const baselineHistogram = useMemo(() => generateHistogramData(initialPopulation), [initialPopulation]);

  // Ensure scales are identical across all 5 charts
  const debriefYAxisMax = useMemo(() => {
    let max = Math.max(...baselineHistogram.map(d => d.count), 0);
    completedRuns.forEach(run => {
      const hist = generateHistogramData(run.finalPopulation);
      const localMax = Math.max(...hist.map(d => d.count), 0);
      if (localMax > max) max = localMax;
    });
    return Math.max(100, Math.ceil(max / 20) * 20);
  }, [baselineHistogram, completedRuns]);

  const sortedRuns = useMemo(() => {
    return [...completedRuns].sort((a, b) => a.cycle - b.cycle);
  }, [completedRuns]);

  const handleSubmit = () => {
    if (!bestMetric || !bestSociety) return;
    track("final_debrief_submitted", { best_metric: bestMetric, best_society: bestSociety });
    setSubmitted(true);
  };

  const q1Options = [
    { value: "Benthamite", label: "National Average (Benthamite)" },
    { value: "Rawlsian", label: "Minimum Baseline (Rawlsian)" },
    { value: "SocietalUtility", label: "National Fairness Index (Societal Utility)" },
    { value: "PersonalUtility", label: "Average Satisfaction (Personal Utility)" },
    { value: "Other", label: "None / A combination / Other" }
  ];

  const q2Options = [
    { value: "Benthamite", label: "Society 1 (Benthamite Outcome)" },
    { value: "Rawlsian", label: "Society 2 (Rawlsian Outcome)" },
    { value: "SocietalUtility", label: "Society 3 (Societal Utility Outcome)" },
    { value: "PersonalUtility", label: "Society 4 (Personal Utility Outcome)" }
  ];

  return (
    <ModalContent maxWidth="max-w-5xl">
      <OmniConfetti triggerKey={confettiKey} />
      <ModalHeader title="Final Debrief: Your Verdict" />
      
      <DPMMessage title="Simulation Concluded" kicker="Study Concluded">
        "You have now played as four different Prime Ministers, successfully navigating four distinct mathematical frameworks for measuring societal success. Below is the starting society you inherited, followed by the four different societies you created. It is time for you to decide which approach is best."
      </DPMMessage>
      
      {/* Baseline Society */}
      <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-4 flex flex-col shrink-0 w-full md:w-1/2 mx-auto">
        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-2 text-center">Starting Society (Baseline)</h3>
        <div className="h-[200px] min-h-[200px]">
          <D3Chart 
            plotType="1D"
            chartData={[]}
            histogramData={baselineHistogram}
            xAxisType={AxisVariable.LifeSatisfaction}
            yAxisType={AxisVariable.LifeSatisfaction}
            color="#d4d4d8"
            visualStyle="solid"
            yAxisMax={debriefYAxisMax}
          />
        </div>
      </div>

      {/* The 4 Outcomes (Now forced to a 2x2 grid on desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
        {sortedRuns.map((run, index) => {
          const rule = FRAMEWORK_RULES[run.cycle];
          const hist = generateHistogramData(run.finalPopulation);
          
          return (
            <div key={run.cycle} className="bg-white rounded-2xl border border-zinc-200 p-4 flex flex-col shadow-sm">
              <h4 className="text-sm font-black uppercase tracking-widest text-zinc-800 text-center">{index + 1}. {rule.frameworkTitle}</h4>
              <span className="text-[12px] font-bold text-center block mb-3" style={{ color: rule.graphColor }}>
                {rule.targetMetricName}
              </span>
              <div className="h-[200px] min-h-[200px] mb-3">
                <D3Chart 
                  plotType="1D"
                  chartData={[]}
                  histogramData={hist}
                  xAxisType={AxisVariable.LifeSatisfaction}
                  yAxisType={AxisVariable.LifeSatisfaction}
                  color={rule.graphColor}
                  visualStyle="solid"
                  yAxisMax={debriefYAxisMax}
                />
              </div>
              <div className="mt-auto bg-zinc-50 border border-zinc-100 p-2 rounded-lg text-center flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Final Score</span>
                <strong className="text-sm font-black text-zinc-900">{run.finalScore.toFixed(2)}</strong>
              </div>
            </div>
          );
        })}
      </div>

      {/* Questionnaire */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-lg p-5 lg:p-6 shrink-0 mt-2 relative">
        <h3 className="text-lg font-black text-zinc-900 tracking-tight mb-5 border-b border-zinc-100 pb-3">Final Evaluation</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex flex-col gap-3">
            <label className="text-sm font-bold text-zinc-800 leading-relaxed">
              1. Which metric of success do you believe is the most appropriate guide for real-world policymaking?
            </label>
            <CustomSelect 
              value={bestMetric}
              onChange={setBestMetric}
              options={q1Options}
              disabled={submitted}
              placeholder="Select an option..."
            />
          </div>

          <div className="flex flex-col gap-3">
            <label className="text-sm font-bold text-zinc-800 leading-relaxed">
              2. Looking purely at the distributions above, which resulting society would you most want to live in?
            </label>
            <CustomSelect 
              value={bestSociety}
              onChange={setBestSociety}
              options={q2Options}
              disabled={submitted}
              placeholder="Select an option..."
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-8 flex justify-end">
              <button 
                onClick={handleSubmit}
                disabled={!bestMetric || !bestSociety}
                className="px-8 py-3 bg-pink-600 text-white font-bold rounded-xl hover:bg-pink-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Submit Verdict
              </button>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 p-5 bg-zinc-900 rounded-xl flex items-center justify-between text-white shadow-xl">
              <div>
                <h3 className="text-base font-bold mb-1 text-emerald-400 flex items-center gap-2">
                  <span className="text-lg">✓</span> Verdict Recorded
                </h3>
                <p className="text-zinc-400 text-xs">
                  Your decisions and policy pathways have been logged. Please leave this screen open and notify the researcher.
                </p>
              </div>
              <div className="flex gap-4 items-center">
                <AnimatePresence>
                  {showReplay && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      onClick={() => setConfettiKey(k => k + 1)}
                      className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer"
                    >
                      <span className="text-base">🎉</span> Celebrate
                    </motion.button>
                  )}
                </AnimatePresence>
                <button className="px-6 py-2.5 bg-white text-zinc-900 font-bold rounded-xl transition-all opacity-50 cursor-not-allowed text-xs" disabled>
                  Awaiting Researcher
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </ModalContent>
  );
}