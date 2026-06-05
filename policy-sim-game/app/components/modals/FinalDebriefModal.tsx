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

  // Calculates a perfectly uniform but tailored max height specifically so these final debrief charts aren't broken.
  const debriefYAxisMax = useMemo(() => {
    const maxBaseline = Math.max(...baselineHistogram.map(d => d.count), 0);
    const maxFinal = Math.max(...finalHistogram.map(d => d.count), 0);
    return Math.max(100, Math.ceil(Math.max(maxBaseline, maxFinal) / 20) * 20);
  }, [baselineHistogram, finalHistogram]);

  return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-900/90 backdrop-blur-md p-4 transition-all">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl flex flex-col overflow-hidden animate-in zoom-in duration-500">
            
          <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
            
            {/* STANDARDISED DPM HEADER */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-5 mb-2 border-b border-zinc-200/60 pb-5 shrink-0">
              <span className="text-5xl bg-white border border-zinc-200 w-20 h-20 flex items-center justify-center rounded-full shadow-sm shrink-0">🧑‍💼</span>
              <div className="text-center md:text-left">
                <p className="text-sm font-black uppercase tracking-widest text-pink-600 mb-1">Deputy Prime Minister</p>
                <h2 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-900 mb-2">Final Debrief: The Complexity of Governance</h2>
                <p className="text-base md:text-lg text-zinc-600 max-w-3xl leading-relaxed italic">
                  "Prime Minister, you have successfully navigated four distinct mathematical frameworks for measuring societal success. Compare your starting society with your final outcome below."
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0">
              <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-5 flex flex-col">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-3 text-center">Baseline Society (Start)</h3>
                {/* Vastly taller chart container */}
                <div className="flex-1 h-[240px] min-h-[240px]">
                  <D3Chart 
                    plotType="1D" 
                    chartData={[]} 
                    histogramData={baselineHistogram} 
                    xAxisType={AxisVariable.LifeSatisfaction} 
                    yAxisType={AxisVariable.LifeSatisfaction} 
                    color="#d4d4d8" 
                    visualStyle='faces'
                    yAxisMax={debriefYAxisMax}
                  />
                </div>
              </div>

              <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-5 flex flex-col">
                <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-3 text-center">Final Society (End)</h3>
                <div className="flex-1 h-[240px] min-h-[240px]">
                  <D3Chart 
                    plotType="1D" 
                    chartData={[]} 
                    histogramData={finalHistogram} 
                    xAxisType={AxisVariable.LifeSatisfaction} 
                    yAxisType={AxisVariable.LifeSatisfaction} 
                    color="#d4d4d8" 
                    visualStyle='faces'
                    yAxisMax={debriefYAxisMax}
                  />
                </div>
              </div>
            </div>

            <div className="shrink-0 flex flex-col mt-2">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-3">
                <div className="border-b border-zinc-200 pb-2">
                  <h3 className="text-xl font-black text-zinc-800 tracking-tight">Act A: Aggregations</h3>
                </div>
                <div className="border-b border-zinc-200 pb-2 hidden lg:block">
                  <h3 className="text-xl font-black text-zinc-800 tracking-tight">Act B: Utility</h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col">
                  <h4 className="text-sm font-black uppercase tracking-widest text-zinc-800 mb-2">1. Benthamite</h4>
                  <p className="text-sm text-zinc-600 flex-1 leading-relaxed">Maximising the total average efficiently increases overall societal wellbeing, but it does not account for how that wellbeing is distributed.</p>
                </div>
                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col">
                  <h4 className="text-sm font-black uppercase tracking-widest text-zinc-800 mb-2">2. Rawlsian</h4>
                  <p className="text-sm text-zinc-600 flex-1 leading-relaxed">Prioritises the worst-off to create a minimum standard of living, but highlights the variance between objective metrics and subjective experience.</p>
                </div>

                <div className="border-b border-zinc-200 pb-2 mt-4 lg:hidden col-span-1 md:col-span-2">
                  <h3 className="text-xl font-black text-zinc-800 tracking-tight">Act B: Utility</h3>
                </div>

                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col">
                  <h4 className="text-sm font-black uppercase tracking-widest text-zinc-800 mb-2">3. Personal Utility</h4>
                  <p className="text-sm text-zinc-600 flex-1 leading-relaxed">
                    Focuses on individual rational choice. Due to loss aversion, citizens often vote to protect their current status, making redistribution difficult.
                  </p>
                </div>
                
                <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col">
                  <h4 className="text-sm font-black uppercase tracking-widest text-zinc-800 mb-2">4. Societal Utility</h4>
                  <p className="text-sm text-zinc-600 flex-1 leading-relaxed">Incorporates empathy and fairness ideals. However, differing definitions of 'fairness' mean consensus rarely results in perfect equality.</p>
                </div>
              </div>
            </div>

            {/* System Sign-off */}
            <div className="p-5 bg-zinc-900 rounded-2xl text-center text-white relative overflow-hidden shadow-xl shrink-0 mt-4">
              <h3 className="text-lg font-bold mb-2">Ready for Phase 3</h3>
              <p className="text-zinc-400 mb-4 text-sm max-w-xl mx-auto">
                Your decisions and policy pathways have been recorded. Please leave this screen open and notify the researcher.
              </p>
              <button className="px-6 py-3 bg-white text-zinc-900 font-bold rounded-xl transition-all opacity-50 cursor-not-allowed text-sm" disabled>
                Awaiting Researcher
              </button>
            </div>
          </div>

        </div>
      </div>
  );
}