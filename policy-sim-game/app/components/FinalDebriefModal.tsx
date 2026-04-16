import React from 'react';

export default function FinalDebriefModal() {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-900/90 backdrop-blur-md p-4 lg:p-8 transition-all">
      
      {/* The modal is now hard-capped at 85% of the viewport height (max-h-[85vh]) 
        guaranteeing a healthy margin at the top and bottom of the screen.
      */}
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in duration-500">
        
        {/* Internal gaps and padding have been tightened up */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 flex flex-col gap-8">
          
          {/* Header */}
          <div className="text-center shrink-0">
            <p className="text-xs font-bold uppercase tracking-widest text-pink-600 mb-2">Simulation Complete</p>
            <h2 className="text-3xl font-black tracking-tight text-zinc-900 mb-3">The Complexity of Governance</h2>
            <p className="text-base text-zinc-600 max-w-3xl mx-auto leading-relaxed">
              You have successfully navigated four distinct mathematical frameworks for measuring societal success. 
            </p>
          </div>

          {/* Act A: Aggregation Frameworks */}
          <div className="shrink-0">
            <div className="border-b border-zinc-200 pb-2 mb-4">
              <h3 className="text-xl font-black text-zinc-800 tracking-tight">Act A: Aggregation Frameworks</h3>
              <p className="text-xs text-zinc-500 font-medium mt-1">Focusing strictly on raw Life Satisfaction (LS) scores.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-200 shadow-sm">
                <h4 className="text-xs font-black uppercase tracking-widest text-zinc-800 mb-2">1. Benthamite (Averages)</h4>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  You learned that simply maximising the "average" Life Satisfaction can mask severe underlying inequality, leaving vulnerable demographics behind while the majority prospers.
                </p>
              </div>
              <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-200 shadow-sm">
                <h4 className="text-xs font-black uppercase tracking-widest text-zinc-800 mb-2">2. Rawlsian (The Floor)</h4>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  You learned to protect the most vulnerable by raising the societal floor. However, raw "Life Satisfaction" fails to capture the subjective, emotional reality of human happiness.
                </p>
              </div>
            </div>
          </div>

          {/* Act B: Utility Frameworks */}
          <div className="shrink-0">
            <div className="border-b border-zinc-200 pb-2 mb-4">
              <h3 className="text-xl font-black text-zinc-800 tracking-tight">Act B: Utility Frameworks</h3>
              <p className="text-xs text-zinc-500 font-medium mt-1">Accounting for subjective happiness, diminishing returns, and empathy.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 bg-zinc-50 rounded-2xl border border-zinc-200 shadow-sm">
                <h4 className="text-xs font-black uppercase tracking-widest text-zinc-800 mb-2">3. Personal Utility</h4>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  You encountered Diminishing Marginal Utility and Loss Aversion. A gain for a wealthy citizen generates far less happiness than the same gain for a poor citizen.
                </p>
              </div>
              <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-100 rounded-bl-full -mr-10 -mt-10 transition-transform duration-500 group-hover:scale-110" />
                <h4 className="text-xs font-black uppercase tracking-widest text-emerald-800 mb-2 relative z-10">4. Societal Utility</h4>
                <p className="text-xs text-emerald-700 leading-relaxed relative z-10">
                  You discovered that humans possess empathy. Even if an individual is thriving personally, extreme societal inequality drags down their overall wellbeing.
                </p>
              </div>
            </div>
          </div>

          {/* Footer / CTA Box */}
          <div className="p-6 bg-zinc-900 rounded-2xl text-center text-white relative overflow-hidden shadow-xl mt-2 shrink-0">
            <div className="absolute top-0 left-0 w-full h-1 bg-pink-500" />
            <h3 className="text-lg font-bold mb-2">Ready for Phase 3</h3>
            <p className="text-zinc-400 mb-4 text-xs max-w-lg mx-auto">
              Your decisions and policy pathways have been recorded. Please leave this screen open and notify the researcher to begin the final interview.
            </p>
            <button 
              className="px-6 py-2.5 bg-white text-zinc-900 font-bold rounded-xl transition-all opacity-50 cursor-not-allowed text-sm"
              disabled
            >
              Awaiting Researcher
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}