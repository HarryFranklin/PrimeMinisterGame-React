import React, { useMemo } from 'react';
import { Respondent, AxisVariable } from '../../utils/types';
import D3Chart from '../D3Chart';

interface FinalDebriefModalProps {
  baselinePopulation: Respondent[];
  finalPopulation: Respondent[];
}

export default function FinalDebriefModal({ baselinePopulation, finalPopulation }: FinalDebriefModalProps) {
  
  const generateHistogramData = (targetPopulation: Respondent[]) => {
    if (!targetPopulation || targetPopulation.length === 0) return [];
    
    return Array.from({ length: 11 }, (_, i) => {
      const peopleInBar = targetPopulation.filter(r => Math.round(r.currentLS) === i);
      const total = peopleInBar.length;
      
      const getPct = (count: number) => (total > 0 ? (count / total) * 100 : 0);
      
      return {
        name: i,
        count: total,
        breakdown: {
          wealth: { 
            Poor: getPct(peopleInBar.filter(p => p.demographics.wealth === 'Poor').length), 
            Middle: getPct(peopleInBar.filter(p => p.demographics.wealth === 'Middle').length), 
            Wealthy: getPct(peopleInBar.filter(p => p.demographics.wealth === 'Wealthy').length) 
          }, 
          age: { 
            Youth: getPct(peopleInBar.filter(p => p.demographics.age === 'Youth').length), 
            Adult: getPct(peopleInBar.filter(p => p.demographics.age === 'Adult').length), 
            Elderly: getPct(peopleInBar.filter(p => p.demographics.age === 'Elderly').length) 
          },
        }
      };
    });
  };

  const baselineHistogram = useMemo(() => generateHistogramData(baselinePopulation), [baselinePopulation]);
  const finalHistogram = useMemo(() => generateHistogramData(finalPopulation), [finalPopulation]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-900/90 backdrop-blur-md p-4 lg:p-8 transition-all">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in duration-500">
        
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 flex flex-col gap-8">
          
          <div className="text-center shrink-0">
            <p className="text-xs font-bold uppercase tracking-widest text-pink-600 mb-2">Simulation Complete</p>
            <h2 className="text-3xl font-black tracking-tight text-zinc-900 mb-3">The Complexity of Governance</h2>
            <p className="text-base text-zinc-600 max-w-3xl mx-auto leading-relaxed">
              You have successfully navigated four distinct mathematical frameworks for measuring societal success. Compare your starting society with your final outcome below.
            </p>
          </div>

          {/* Graph Comparison Block - Made shorter to free up vertical space */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0">
            <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-5 flex flex-col">
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-4 text-center">Baseline Society (Start)</h3>
              <div className="flex-1 h-[220px] min-h-[220px]">
                <D3Chart 
                  plotType="1D" 
                  chartData={[]} 
                  histogramData={baselineHistogram} 
                  xAxisType={AxisVariable.LifeSatisfaction} 
                  yAxisType={AxisVariable.LifeSatisfaction} 
                  color="#d4d4d8" 
                />
              </div>
            </div>
            <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-5 flex flex-col">
              <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-600 mb-4 text-center">Final Society (End)</h3>
              <div className="flex-1 h-[220px] min-h-[220px]">
                <D3Chart 
                  plotType="1D" 
                  chartData={[]} 
                  histogramData={finalHistogram} 
                  xAxisType={AxisVariable.LifeSatisfaction} 
                  yAxisType={AxisVariable.LifeSatisfaction} 
                  color="#10b981" 
                />
              </div>
            </div>
          </div>

          {/* Act Summaries */}
          <div className="shrink-0 flex flex-col">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
              <div className="border-b border-zinc-200 pb-2">
                <h3 className="text-xl font-black text-zinc-800 tracking-tight">Act A: Aggregations</h3>
              </div>
              <div className="border-b border-zinc-200 pb-2 hidden lg:block">
                <h3 className="text-xl font-black text-zinc-800 tracking-tight">Act B: Utility</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col">
                <h4 className="text-xs font-black uppercase tracking-widest text-zinc-800 mb-2">1. Benthamite</h4>
                <p className="text-xs text-zinc-600 flex-1">Maximising the "average" masks severe inequality, leaving vulnerable demographics behind.</p>
              </div>
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col">
                <h4 className="text-xs font-black uppercase tracking-widest text-zinc-800 mb-2">2. Rawlsian</h4>
                <p className="text-xs text-zinc-600 flex-1">Protecting the vulnerable is crucial, but raw "Life Satisfaction" fails to capture emotional reality.</p>
              </div>

              <div className="border-b border-zinc-200 pb-2 mt-4 lg:hidden col-span-1 md:col-span-2">
                <h3 className="text-xl font-black text-zinc-800 tracking-tight">Act B: Utility</h3>
              </div>

              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col">
                <h4 className="text-xs font-black uppercase tracking-widest text-zinc-800 mb-2">3. Personal Utility</h4>
                <p className="text-xs text-zinc-600 flex-1">
                  Humans feel the pain of a loss twice as strongly as the joy of a gain. Because citizens voted to protect their own wealth, meaningful redistribution became impossible (The Status Quo Trap).
                </p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex flex-col">
                <h4 className="text-xs font-black uppercase tracking-widest text-emerald-800 mb-2">4. Societal Utility</h4>
                <p className="text-xs text-emerald-700 flex-1">Humans possess empathy. Even if thriving personally, extreme societal inequality drags down their overall wellbeing.</p>
              </div>
            </div>
          </div>

          {/* Footer / CTA Box */}
          <div className="p-5 bg-zinc-900 rounded-2xl text-center text-white relative overflow-hidden shadow-xl shrink-0 mt-4">
            <h3 className="text-lg font-bold mb-1">Ready for Phase 3</h3>
            <p className="text-zinc-400 mb-3 text-xs max-w-lg mx-auto">
              Your decisions and policy pathways have been recorded. Please leave this screen open and notify the researcher.
            </p>
            <button className="px-6 py-2 bg-white text-zinc-900 font-bold rounded-xl transition-all opacity-50 cursor-not-allowed text-sm" disabled>
              Awaiting Researcher
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}