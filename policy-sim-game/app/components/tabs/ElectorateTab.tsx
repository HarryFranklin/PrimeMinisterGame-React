import React, { useState, useMemo } from "react";
import { Respondent, ElectionCycle } from "../../utils/types";
import { WelfareMetrics } from "../../utils/WelfareMetrics";
import SharedTabHeader from "./../SharedTabHeader"; 
import { DEMO_COLORS, STATUS_COLORS } from "../../utils/uiHelpers";
import { useUI, useGame } from "../../context/GameStateContext";
import { motion, AnimatePresence } from "framer-motion";

type AnalyticalLens = 'approval_ls' | 'approval_demo' | 'impact_ls';

export default function ElectorateTab() {
  const { setActiveTab, isTutorialActive, tutorialStep } = useUI();
  const { 
    population, previewPopulation, initialPopulation, currentCycle, 
    selectedPolicy, setSelectedPolicy, selectedMinister, 
    approvalRating, presentedPolicies 
  } = useGame();

  const [activeLens, setActiveLens] = useState<AnalyticalLens>('approval_ls');
  const [hoveredBin, setHoveredBin] = useState<any | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const isTurnZero = useMemo(() => {
    if (previewPopulation.length === 0 || initialPopulation.length === 0) return true;
    return previewPopulation.every((p, i) => Math.abs(p.currentLS - initialPopulation[i].currentLS) < 0.0001);
  }, [initialPopulation, previewPopulation]);

  const getTutorialClass = (columnIndex: number) => {
    if (!isTutorialActive) return "relative z-10";
    
    const isHighlighted = 
      (columnIndex === 0 && tutorialStep === 0) || 
      (columnIndex === 1 && (tutorialStep === 0 || tutorialStep === 1)) || 
      (columnIndex === 2 && tutorialStep === 2);

    return isHighlighted 
      ? "relative z-[70] ring-4 ring-pink-500/50 rounded-2xl bg-white transition-all duration-500 shadow-2xl" 
      : "relative z-10 pointer-events-none opacity-40 grayscale transition-all duration-500";
  };

  const processedVoters = useMemo(() => {
    if (!initialPopulation || initialPopulation.length === 0) return [];
    
    const allInitialLS = initialPopulation.map(p => p.currentLS);
    const allPreviewLS = previewPopulation.map(p => p.currentLS);

    const sortedIndices = initialPopulation.map((p, i) => ({ index: i, ls: p.currentLS })).sort((a, b) => b.ls - a.ls);
    const approvalCount = Math.round(initialPopulation.length * (approvalRating / 100));
    const baselineApprovingIndices = new Set(sortedIndices.slice(0, approvalCount).map(x => x.index));

    return initialPopulation.map((p: Respondent, i: number) => {
      const isPreview = selectedPolicy !== null;
      const currentPop = isPreview ? previewPopulation : population;
      const currentVoter = currentPop.find(v => v.id === p.id) || p;

      let initialUtil = 0; let currentUtil = 0;

      if (currentCycle === ElectionCycle.Benthamite || currentCycle === ElectionCycle.Rawlsian) {
        initialUtil = p.currentLS;
        currentUtil = currentVoter.currentLS;
      } else if (currentCycle === ElectionCycle.PersonalUtility) {
        initialUtil = WelfareMetrics.getUtilityForPerson(p.currentLS, p.personalUtilities);
        currentUtil = WelfareMetrics.getUtilityForPerson(currentVoter.currentLS, currentVoter.personalUtilities);
      } else {
        initialUtil = WelfareMetrics.evaluateDistribution(allInitialLS, p.societalUtilities);
        currentUtil = WelfareMetrics.evaluateDistribution(allPreviewLS, currentVoter.societalUtilities);
      }

      const utilityShift = currentUtil - initialUtil;
      const isApproving = isTurnZero ? baselineApprovingIndices.has(i) : utilityShift >= -0.01;

      return {
        ...currentVoter,
        initialLS: p.currentLS,
        utilityShift,
        isApproving, 
        lsTrajectory: currentVoter.currentLS - p.currentLS
      };
    });
  }, [initialPopulation, population, previewPopulation, currentCycle, isTurnZero, approvalRating, selectedPolicy]);

  const histogramData = useMemo(() => {
    const bins = Array.from({ length: 11 }, (_, i) => ({ bin: i, groups: {} as Record<string, number>, total: 0 }));
    
    processedVoters.forEach(v => {
      const lsBin = Math.min(10, Math.max(0, Math.round(v.currentLS)));
      
      let groupKey = "";
      if (activeLens === 'approval_ls') {
        groupKey = v.isApproving ? 'Approves' : 'Angry';
      } else if (activeLens === 'impact_ls') {
        if (v.lsTrajectory > 0.1125) groupKey = 'Will improve'; 
        else if (v.lsTrajectory < -0.05) groupKey = 'Will be worsened';
        else groupKey = 'Will be stable';
      } else if (activeLens === 'approval_demo') {
        groupKey = v.demographics.wealth; 
      }

      bins[lsBin].groups[groupKey] = (bins[lsBin].groups[groupKey] || 0) + 1;
      bins[lsBin].total++;
    });

    const maxCount = Math.max(...bins.map(b => b.total));
    return { bins, maxCount };
  }, [processedVoters, activeLens]);

  const getActiveColors = (demoKey?: 'wealth' | 'age') => {
    if (activeLens === 'approval_ls') return STATUS_COLORS.intention;
    if (activeLens === 'impact_ls') return STATUS_COLORS.trajectory;
    return demoKey ? DEMO_COLORS[demoKey] : DEMO_COLORS.wealth; 
  };

  const renderHistogram = (title: string, demoKey?: 'wealth' | 'age') => {
    const activeColors = getActiveColors(demoKey);

    return (
      <div className="flex-1 flex flex-col h-full min-w-[300px] min-h-0">
        {activeLens === 'approval_demo' && (
          <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-2 text-center shrink-0">{title}</h4>
        )}
        
        <div className="w-full flex-1 flex flex-col items-center justify-end px-4 pb-4 border-b border-zinc-200 min-h-0 overflow-hidden">
          <div className="w-full h-full flex items-end gap-1.5">
            {histogramData.bins.map((binData) => {
              const totalHeight = (binData.total / histogramData.maxCount) * 100;
              
              return (
                <div 
                  key={binData.bin} 
                  className="flex-1 flex flex-col-reverse group relative cursor-crosshair transition-all duration-500 ease-out" 
                  style={{ height: `${totalHeight}%` }}
                  onMouseMove={(e) => {
                    let x = e.clientX + 15; let y = e.clientY + 15;
                    if (x + 200 > window.innerWidth) x = e.clientX - 215;
                    setHoveredBin({ ...binData, activeDemo: demoKey }); 
                    setMousePos({ x, y });
                  }}
                  onMouseLeave={() => setHoveredBin(null)}
                >
                  {Object.entries(activeColors).map(([groupName, color]) => {
                    let count = 0;
                    if (activeLens === 'approval_demo' && demoKey) {
                      count = processedVoters.filter(v => Math.round(v.currentLS) === binData.bin && v.demographics[demoKey] === groupName).length;
                    } else {
                      count = binData.groups[groupName] || 0;
                    }
                    if (count === 0) return null;
                    const segmentHeight = (count / binData.total) * 100;
                    
                    return (
                      <div key={groupName} style={{ height: `${segmentHeight}%`, backgroundColor: color as string }} className="w-full transition-all duration-300 hover:brightness-110 border-b border-white/20" />
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
        <div className="w-full flex justify-between pt-2 px-1 text-[10px] font-bold text-zinc-400 shrink-0">
          {histogramData.bins.map(b => <span key={b.bin} className="flex-1 text-center">{b.bin}</span>)}
        </div>
        <div className="mt-1 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-300 shrink-0">Life Satisfaction Score</div>
      </div>
    );
  };

  const renderGuidedAnalysis = () => {
    if (activeLens === 'approval_ls') return (
      <div className="space-y-3">
        <p>You are viewing <strong className="text-zinc-800">Voting Intentions mapped against Life Satisfaction</strong>.</p>
        <div className="bg-white p-3 rounded-lg border border-zinc-200 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400 mb-1">Notice</p>
          <p className="text-xs">Look at where the blue blocks are concentrated. Is your support coming from the most miserable citizens, the most satisfied, or a mix of both?</p>
        </div>
      </div>
    );
    if (activeLens === 'approval_demo') return (
      <div className="space-y-3">
        <p>You are viewing the <strong className="text-zinc-800">Demographic Breakdown</strong> of the electorate.</p>
        <div className="bg-white p-3 rounded-lg border border-zinc-200 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400 mb-1">Notice</p>
          <p className="text-xs">You can clearly see how wealth classes are distributed across the wellbeing spectrum. Use this to identify which demographics are dominating the lowest scores.</p>
        </div>
      </div>
    );
    if (activeLens === 'impact_ls') return (
      <div className="space-y-3">
        <p>You are viewing the <strong className="text-zinc-800">Objective Wellbeing Impact</strong>, stripping away voting intentions.</p>
        <div className="bg-white p-3 rounded-lg border border-zinc-200 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400 mb-1">Notice</p>
          <p className="text-xs">This reveals the mechanical truth of the policy. Some voters may be "Angry" in other tabs, despite their wellbeing objectively "Improving" here, due to fairness ideals.</p>
        </div>
      </div>
    );
  };

  return (
    <div className={`h-full flex flex-col gap-4 lg:gap-6 min-h-0 overflow-hidden`}>
      <SharedTabHeader
        title="Electorate Analysis" subtitle="Break down who is supporting your administration."
        approvalRating={approvalRating} selectedPolicy={selectedPolicy ?? null} setSelectedPolicy={setSelectedPolicy}
        selectedMinister={selectedMinister} presentedPolicies={presentedPolicies} onNavigateToMinisters={() => setActiveTab('ministers')}
        tutorialClass={getTutorialClass(0)}
      >
        <div className="flex bg-zinc-100 p-1 rounded-lg shrink-0 relative w-[380px] lg:w-[450px]"> 
          <button 
            onClick={() => setActiveLens('approval_ls')} 
            className={`flex-1 px-2 lg:px-3 py-1.5 text-[10px] lg:text-xs font-bold rounded-md transition-colors relative z-10 ${activeLens === 'approval_ls' ? 'text-zinc-800' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            Wellbeing
          </button>
          <button 
            onClick={() => setActiveLens('approval_demo')} 
            className={`flex-1 px-2 lg:px-3 py-1.5 text-[10px] lg:text-xs font-bold rounded-md transition-colors relative z-10 ${activeLens === 'approval_demo' ? 'text-zinc-800' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            Demographics
          </button>
          <button 
            onClick={() => setActiveLens('impact_ls')} 
            className={`flex-1 px-2 lg:px-3 py-1.5 text-[10px] lg:text-xs font-bold rounded-md transition-colors relative z-10 ${activeLens === 'impact_ls' ? 'text-zinc-800' : 'text-zinc-500 hover:text-zinc-700'}`}
          >
            Impact
          </button>
          
          <div className="absolute inset-1 pointer-events-none flex" style={{ justifyContent: activeLens === 'approval_ls' ? 'flex-start' : activeLens === 'approval_demo' ? 'center' : 'flex-end' }}>
            <motion.div 
              layout 
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }} 
              className="bg-white rounded-md shadow-sm h-full w-1/3" 
            />
          </div>
        </div>
      </SharedTabHeader>

      <AnimatePresence mode="wait">
        <motion.div 
          key={activeLens}
          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}
          className="flex-1 flex gap-4 lg:gap-6 min-h-0 overflow-hidden"
        >
          {/* Chart Area */}
          <div className={`flex-[3] bg-white rounded-xl border border-zinc-200 shadow-sm p-4 lg:p-8 relative flex flex-col min-h-0 overflow-hidden ${getTutorialClass(1)}`}>
            
            {/* Dynamic Legend */}
            <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md border border-zinc-200 p-2 lg:p-3 rounded-lg shadow-sm z-10 flex flex-col gap-2 lg:gap-4 shrink-0">
              <div>
                <h4 className="text-[8px] lg:text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1 lg:mb-2">{activeLens === 'approval_demo' ? 'Wealth Classes' : 'Legend'}</h4>
                <div className="space-y-1">
                  {Object.entries(getActiveColors('wealth')).map(([name, color]) => (
                    <div key={name} className="flex items-center gap-2">
                      <div className="w-2 h-2 lg:w-2.5 lg:h-2.5 rounded shadow-sm" style={{backgroundColor: color as string}} />
                      <span className="text-[10px] lg:text-[11px] font-bold text-zinc-700">{name}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {activeLens === 'approval_demo' && (
                <div className="pt-2 border-t border-zinc-100">
                  <h4 className="text-[8px] lg:text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1 lg:mb-2">Age Groups</h4>
                  <div className="space-y-1">
                    {Object.entries(getActiveColors('age')).map(([name, color]) => (
                      <div key={name} className="flex items-center gap-2">
                        <div className="w-2 h-2 lg:w-2.5 lg:h-2.5 rounded shadow-sm" style={{backgroundColor: color as string}} />
                        <span className="text-[10px] lg:text-[11px] font-bold text-zinc-700">{name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Render One or Two Histograms based on active lens */}
            <div className="flex-1 flex gap-4 lg:gap-8 w-full h-full pb-2 min-h-0">
              {activeLens === 'approval_demo' ? (
                <>
                  {renderHistogram("Wealth Breakdown", 'wealth')}
                  {renderHistogram("Age Breakdown", 'age')}
                </>
              ) : (
                renderHistogram("Distribution")
              )}
            </div>

            {/* Tooltip */}
            {hoveredBin && (
              <div className="fixed z-[9999] bg-white border border-zinc-200 p-4 rounded-xl shadow-xl pointer-events-none text-zinc-800 min-w-[180px]" style={{ left: mousePos.x, top: mousePos.y }}>
                <div className="border-b border-zinc-100 pb-2 mb-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">LS Score {hoveredBin.bin}</p>
                  <p className="text-sm font-bold text-zinc-600">{hoveredBin.total} Residents</p>
                </div>
                <div className="space-y-2">
                  {Object.entries(getActiveColors(hoveredBin.activeDemo)).map(([groupName, color]) => {
                    let count = 0;
                    if (activeLens === 'approval_demo' && hoveredBin.activeDemo) {
                      count = processedVoters.filter(v => Math.round(v.currentLS) === hoveredBin.bin && v.demographics[hoveredBin.activeDemo as 'wealth' | 'age'] === groupName).length;
                    } else {
                      count = hoveredBin.groups[groupName] || 0;
                    }
                    if (count === 0) return null;
                    return (
                      <div key={groupName} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color as string }} /><span className="text-zinc-600 text-[11px] font-medium">{groupName}</span></div>
                        <span className="font-mono font-bold text-zinc-800 text-[11px]">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          <div className={`flex-1 max-w-[280px] lg:max-w-[380px] bg-zinc-50 rounded-xl border border-zinc-200 p-4 lg:p-6 flex flex-col gap-3 shrink-0 shadow-inner ${getTutorialClass(2)}`}>
            <div className="flex items-center gap-2 mb-1 shrink-0"><span className="text-lg">💡</span><h3 className="text-xs lg:text-sm font-black uppercase tracking-widest text-zinc-800">Guided Analysis</h3></div>
            <div className="text-xs lg:text-sm text-zinc-600 space-y-3 leading-relaxed flex-1 min-h-0">
              {renderGuidedAnalysis()}
            </div>
          </div>

        </motion.div>
      </AnimatePresence>
    </div>
  );
}