import React from 'react';
import { ElectionCycle } from '../utils/types';

interface ElectionModalProps {
  approvalRating: number;
  currentCycle: ElectionCycle;
  onNextCycle: () => void;
  onReset: () => void;
}

export default function ElectionModal({ approvalRating, currentCycle, onNextCycle, onReset }: ElectionModalProps) {
  
  const won = approvalRating >= 60; // 60% of the target metric must be achieved
  const approvalPercentage = approvalRating.toFixed(1);
  
  let cycleName = "";
  let evaluatedMetric = "";
  let nextCycleName = "";
  let isFinalCycle = false;

  if (currentCycle === ElectionCycle.Benthamite) {
    cycleName = "Cycle 1: Benthamite";
    evaluatedMetric = "Average Life Satisfaction";
    nextCycleName = "Start Cycle 2: Rawlsian";
  } else if (currentCycle === ElectionCycle.Rawlsian) {
    cycleName = "Cycle 2: Rawlsian";
    evaluatedMetric = "Least Well-Off LS";
    nextCycleName = "Start Cycle 3: Societal";
  } else if (currentCycle === ElectionCycle.SocietalUtility) {
    cycleName = "Cycle 3: Societal";
    evaluatedMetric = "Average Societal Utility";
    nextCycleName = "Start Cycle 4: Personal";
  } else {
    cycleName = "Cycle 4: Personal";
    evaluatedMetric = "Average Personal Utility";
    isFinalCycle = true;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 border border-zinc-200">
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-800 mb-2">
            Election Results
          </h2>
          <p className="text-zinc-500 font-medium">{cycleName} Framework</p>
        </div>

        <div className={`p-6 rounded-xl border-2 mb-8 text-center ${
          won ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}>
          <p className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-2">
            Target Metric ({evaluatedMetric})
          </p>
          <p className={`text-5xl font-black mb-4 ${won ? 'text-green-600' : 'text-red-600'}`}>
            {approvalPercentage}%
          </p>
          <div className={`inline-block px-4 py-1 rounded-full text-sm font-bold ${
            won ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
          }`}>
            {won ? 'Re-elected' : 'Term in Opposition'}
          </div>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={onReset}
            className="flex-1 py-4 bg-zinc-100 text-zinc-700 font-bold rounded-xl hover:bg-zinc-200 transition-all"
          >
            Restart Cycle
          </button>
          {won && !isFinalCycle && (
            <button 
              onClick={onNextCycle}
              className="flex-1 py-4 bg-zinc-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-lg"
            >
              {nextCycleName}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}