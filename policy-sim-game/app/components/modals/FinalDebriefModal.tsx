import React, { useMemo } from 'react';
import { Respondent, AxisVariable } from '../../utils/types';
import D3Chart from '../D3Chart';

interface FinalDebriefModalProps {
  baselinePopulation: Respondent[];
  finalPopulation: Respondent[];
  yAxisMax: number;
}

export default function FinalDebriefModal({ baselinePopulation, finalPopulation, yAxisMax }: FinalDebriefModalProps) {
  
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

  const baselineHistogram = useMemo(() => generateHistogramData(baselinePopulation), [baselinePopulation]);
  const finalHistogram = useMemo(() => generateHistogramData(finalPopulation), [finalPopulation]);

  return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-900/90 backdrop-blur-md p-4 transition-all">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden animate-in zoom-in duration-500">
          
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
            
            {/* STANDARDISED DPM HEADER (Large Variant) */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-4 mb-2 border-b border-zinc-200/60 pb-4 shrink-0">
              <span className="text-5xl bg-white border border-zinc-200 w-20 h-20 flex items-center justify-center rounded-full shadow-sm shrink-0">🧑‍💼</span>
              <div className="text-center md:text-left">
                <p className="text-xs font-black uppercase tracking-widest text-pink-600 mb-1">Deputy Prime Minister</p>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-zinc-900 mb-2">Final Debrief: The Complexity of Governance</h2>
                <p className="text-sm md:text-base text-zinc-600 max-w-3xl leading-relaxed italic">
                  "Prime Minister, you have successfully navigated four distinct mathematical frameworks for measuring societal success. Compare your starting society with your final outcome below."
                </p>
              </div>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
            <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-4 flex flex-col">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 text-center">Baseline Society (Start)</h3>
              <div className="flex-1 h-[140px] min-h-[140px]">
                <D3Chart 
                  plotType="1D" 
                  chartData={[]} 
                  histogramData={baselineHistogram} 
                  xAxisType={AxisVariable.LifeSatisfaction} 
                  yAxisType={AxisVariable.LifeSatisfaction} 
                  color="#d4d4d8" 
                  visualStyle='faces'
                  yAxisMax={yAxisMax}
                />
              </div>
            </div>
            <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-4 flex flex-col">
              <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 text-center">Final Society (End)</h3>
              <div className="flex-1 h-[140px] min-h-[140px]">
                <D3Chart 
                  plotType="1D" 
                  chartData={[]} 
                  histogramData={finalHistogram} 
                  xAxisType={AxisVariable.LifeSatisfaction} 
                  yAxisType={AxisVariable.LifeSatisfaction} 
                  color="#d4d4d8" 
                  visualStyle='faces'
                  yAxisMax={yAxisMax}
                />
              </div>
            </div>
          </div>

          <div className="shrink-0 flex flex-col">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-2">
              <div className="border-b border-zinc-200 pb-1">
                <h3 className="text-lg font-black text-zinc-800 tracking-tight">Act A: Aggregations</h3>
              </div>
              <div className="border-b border-zinc-200 pb-1 hidden lg:block">
                <h3 className="text-lg font-black text-zinc-800 tracking-tight">Act B: Utility</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-800 mb-1">1. Benthamite</h4>
                <p className="text-[11px] text-zinc-600 flex-1">Maximising the total average efficiently increases overall societal wellbeing, but it does not account for how that wellbeing is distributed.</p>
              </div>
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-800 mb-1">2. Rawlsian</h4>
                <p className="text-[11px] text-zinc-600 flex-1">Prioritises the worst-off to create a minimum standard of living, but highlights the variance between objective metrics and subjective experience.</p>
              </div>

              <div className="border-b border-zinc-200 pb-1 mt-2 lg:hidden col-span-1 md:col-span-2">
                <h3 className="text-lg font-black text-zinc-800 tracking-tight">Act B: Utility</h3>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-800 mb-1">3. Personal Utility</h4>
                <p className="text-[11px] text-zinc-600 flex-1">
                  Focuses on individual rational choice. Due to loss aversion, citizens often vote to protect their current status, making redistribution difficult.
                </p>
              </div>
              
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-800 mb-1">4. Societal Utility</h4>
                <p className="text-[11px] text-zinc-600 flex-1">Incorporates empathy and fairness ideals. However, differing definitions of 'fairness' mean consensus rarely results in perfect equality.</p>
              </div>
            </div>
          </div>

          {/* System Sign-off */}
          <div className="p-4 bg-zinc-900 rounded-2xl text-center text-white relative overflow-hidden shadow-xl shrink-0 mt-2">
            <h3 className="text-base font-bold mb-1">Ready for Phase 3</h3>
            <p className="text-zinc-400 mb-2 text-[10px] max-w-lg mx-auto">
              Your decisions and policy pathways have been recorded. Please leave this screen open and notify the researcher.
            </p>
            <button className="px-5 py-2 bg-white text-zinc-900 font-bold rounded-xl transition-all opacity-50 cursor-not-allowed text-xs" disabled>
              Awaiting Researcher
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}