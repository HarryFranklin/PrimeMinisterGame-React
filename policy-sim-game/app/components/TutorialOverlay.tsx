import React from 'react';

interface TutorialOverlayProps {
  isTutorialActive: boolean;
  currentStepData: any;
  activeTab: string;
  tutorialStep: number;
  tabs: readonly string[];
  tutorialVisitedTabs: string[];
  currentTutorialSequence: any[];
  setIsTutorialActive: (active: boolean) => void;
  targetNextTab: string | null;
  isLastTutorialStep: boolean;
  setTutorialVisitedTabs: React.Dispatch<React.SetStateAction<string[]>>;
  setActiveTab: (tab: any) => void;
  setTutorialStep: React.Dispatch<React.SetStateAction<number>>;
}

export default function TutorialOverlay({
  isTutorialActive, currentStepData, activeTab, tutorialStep, tabs, tutorialVisitedTabs,
  currentTutorialSequence, setIsTutorialActive, targetNextTab, isLastTutorialStep,
  setTutorialVisitedTabs, setActiveTab, setTutorialStep
}: TutorialOverlayProps) {
  
  if (!isTutorialActive || !currentStepData) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-zinc-900/60 backdrop-blur-[2px] transition-all duration-500 pointer-events-none" />
      
      <div className={`fixed z-[80] bg-white rounded-2xl shadow-2xl p-6 md:p-8 border-2 border-pink-200 max-w-lg w-full flex flex-col gap-4 animate-in fade-in duration-500 transition-all ${currentStepData.pos}`}>
        <div>
          <h3 className="text-2xl font-black text-pink-600 tracking-tight">{currentStepData.title}</h3>
          <p className="text-zinc-700 mt-2 leading-relaxed">{currentStepData.text}</p>
        </div>
        
        {activeTab === 'dashboard' && tutorialStep === 3 && (
          <div className="flex gap-2 mt-2">
            {tabs.map(t => (
              <span key={t} className={`text-[10px] font-bold uppercase px-2 py-1 rounded transition-colors ${tutorialVisitedTabs.includes(t) ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-400'}`}>
                {t} {tutorialVisitedTabs.includes(t) && '✓'}
              </span>
            ))}
          </div>
        )}
        
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-zinc-100">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
            Step {tutorialStep + 1} of {currentTutorialSequence.length}
          </span>
          <div className="flex gap-3">
            <button onClick={() => setIsTutorialActive(false)} className="px-4 py-2 text-sm font-bold text-zinc-500 hover:text-zinc-800 transition-colors pointer-events-auto">
              Close Tutorial
            </button>
            <button 
              disabled={targetNextTab !== null}
              onClick={() => {
                if (isLastTutorialStep && targetNextTab === null) {
                  setTutorialVisitedTabs(prev => prev.includes(activeTab) ? prev : [...prev, activeTab]);
                  setIsTutorialActive(false);
                  setActiveTab('dashboard'); 
                } else {
                  setTutorialStep(s => s + 1);
                }
              }} 
              className={`px-6 py-2 text-sm font-bold rounded-xl shadow-md transition-all pointer-events-auto ${targetNextTab !== null ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed border border-zinc-200' : 'bg-pink-600 text-white hover:bg-pink-700 active:scale-95'}`}
            >
              {(() => {
                if (!isLastTutorialStep) return 'Next Step';
                if (targetNextTab) return `Select ${targetNextTab.charAt(0).toUpperCase() + targetNextTab.slice(1)} ☝️`;
                return 'Finish Onboarding';
              })()}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}