import React, { useMemo } from 'react';
import { Respondent, AxisVariable } from '../../utils/types';
import D3Chart from '../D3Chart';
import { ModalOverlay, ModalContent, ModalHeader, DPMMessage } from './SharedModalComponents';

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

  const debriefYAxisMax = useMemo(() => {
    const maxBaseline = Math.max(...baselineHistogram.map(d => d.count), 0);
    const maxFinal = Math.max(...finalHistogram.map(d => d.count), 0);
    return Math.max(100, Math.ceil(Math.max(maxBaseline, maxFinal) / 20) * 20);
  }, [baselineHistogram, finalHistogram]);

  return (
    <ModalContent maxWidth="max-w-5xl">
      
      <ModalHeader title="Final Debrief: The Complexity of Governance" />
      <DPMMessage title="Simulation Concluded">
        "Prime Minister, you have successfully navigated four distinct mathematical frameworks for measuring societal success. Compare your starting society with your final outcome below."
      </DPMMessage>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
        <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-4 flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 text-center">Baseline Society (Start)</h3>
          <div className="flex-1 h-[180px] min-h-[180px]">
            <D3Chart 
              plotType="1D" 
              chartData={[]} 
              histogramData={baselineHistogram} 
              xAxisType={AxisVariable.LifeSatisfaction} 
              yAxisType={AxisVariable.LifeSatisfaction} 
              color="#d4d4d8" 
              visualStyle='faces'
              yAxisMax={debriefYAxisMax}
              faceCols={3}
            />
          </div>
        </div>

        <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-4 flex flex-col">
          <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2 text-center">Final Society (End)</h3>
          <div className="flex-1 h-[180px] min-h-[180px]">
            <D3Chart 
              plotType="1D" 
              chartData={[]} 
              histogramData={finalHistogram} 
              xAxisType={AxisVariable.LifeSatisfaction} 
              yAxisType={AxisVariable.LifeSatisfaction} 
              color="#d4d4d8" 
              visualStyle='faces'
              yAxisMax={debriefYAxisMax}
              faceCols={3}
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
          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col">
            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-800 mb-1">1. Benthamite</h4>
            <p className="text-xs text-zinc-600 flex-1 leading-relaxed">Maximising the total average efficiently increases overall societal wellbeing, but it does not account for how that wellbeing is distributed.</p>
          </div>
          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col">
            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-800 mb-1">2. Rawlsian</h4>
            <p className="text-xs text-zinc-600 flex-1 leading-relaxed">Prioritises the worst-off to create a minimum standard of living, but highlights the variance between objective metrics and subjective experience.</p>
          </div>

          <div className="border-b border-zinc-200 pb-1 mt-2 lg:hidden col-span-1 md:col-span-2">
            <h3 className="text-lg font-black text-zinc-800 tracking-tight">Act B: Utility</h3>
          </div>

          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col">
            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-800 mb-1">3. Personal Utility</h4>
            <p className="text-xs text-zinc-600 flex-1 leading-relaxed">
              Focuses on individual rational choice. Due to loss aversion, citizens often vote to protect their current status, making redistribution difficult.
            </p>
          </div>
          
          <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 flex flex-col">
            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-800 mb-1">4. Societal Utility</h4>
            <p className="text-xs text-zinc-600 flex-1 leading-relaxed">Incorporates empathy and fairness ideals. However, differing definitions of 'fairness' mean consensus rarely results in perfect equality.</p>
          </div>
        </div>
      </div>

      {/* System Sign-off */}
      <div className="p-4 bg-zinc-900 rounded-xl text-center text-white relative overflow-hidden shadow-xl shrink-0 mt-2">
        <h3 className="text-base font-bold mb-1">Ready for Phase 3</h3>
        <p className="text-zinc-400 mb-3 text-xs max-w-xl mx-auto">
          Your decisions and policy pathways have been recorded. Please leave this screen open and notify the researcher.
        </p>
        <button className="px-6 py-2 bg-white text-zinc-900 font-bold rounded-xl transition-all opacity-50 cursor-not-allowed text-xs" disabled>
          Awaiting Researcher
        </button>
      </div>

    </ModalContent>
  );
}