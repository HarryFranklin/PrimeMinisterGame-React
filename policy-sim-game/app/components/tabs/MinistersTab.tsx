import React from "react";

interface MinistersTabProps {
  ministers: any[];
  selectedMinister?: any | null; 
  selectedPolicy?: any | null;   
  isTutorialActive?: boolean; 
  tutorialStep?: number;
  setSelectedPolicy?: any;
  onNavigateToPolicy?: () => void;
}

const getMinisterReaction = (delta: number) => {
  if (delta >= 0.5) return { text: "Brilliant!", badge: "text-emerald-700 bg-emerald-100", circle: "bg-emerald-500", emoji: "😊", statusName: "happy" };
  if (delta >= 0.05) return { text: "Approves.", badge: "text-emerald-700 bg-emerald-50", circle: "bg-emerald-400", emoji: "🙂", statusName: "happy" };
  if (delta <= -0.5) return { text: "Disastrous!", badge: "text-rose-700 bg-rose-100", circle: "bg-rose-500", emoji: "😠", statusName: "angry" };
  if (delta <= -0.05) return { text: "Objects.", badge: "text-rose-700 bg-rose-50", circle: "bg-rose-400", emoji: "🙁", statusName: "angry" };
  return { text: "No impact.", badge: "text-zinc-600 bg-zinc-100", circle: "bg-zinc-300", emoji: "😐", statusName: "neutral" };
};

export default function MinistersTab({ ministers, selectedMinister, selectedPolicy, isTutorialActive, tutorialStep, setSelectedPolicy, onNavigateToPolicy }: MinistersTabProps) {
  const selectedName = typeof selectedMinister === 'string' ? selectedMinister : selectedMinister?.name;

  const getHighlightStyles = (status: string) => {
    switch(status) {
      case 'happy': return { card: 'border-emerald-500 ring-4 ring-emerald-500/20 bg-emerald-50/40 shadow-md', text: 'text-emerald-800' };
      case 'neutral': return { card: 'border-amber-400 ring-4 ring-amber-400/20 bg-amber-50/40 shadow-md', text: 'text-amber-800' };
      case 'angry': return { card: 'border-rose-500 ring-4 ring-rose-500/20 bg-rose-50/40 shadow-md', text: 'text-rose-800' };
      default: return { card: 'border-zinc-300 shadow-md', text: 'text-zinc-800' };
    }
  };

  const getTutorialClass = (columnIndex: number) => {
    if (!isTutorialActive) return "relative z-10";
    return tutorialStep === columnIndex 
      ? "relative z-[70] ring-4 ring-pink-500/50 rounded-2xl bg-white transition-all duration-500 shadow-2xl" 
      : "relative z-10 pointer-events-none opacity-40 grayscale transition-all duration-500";
  };

  return (
    <div className="flex flex-col gap-6 h-full animate-in fade-in duration-300">
      
      {/* HEADER BANNER WITH WIDGET */}
      <div className={`bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 ${getTutorialClass(0)}`}>
        <div>
          <h2 className="text-xl font-bold text-zinc-800">The Cabinet</h2>
          <p className="text-sm text-zinc-500">Review departmental projections and ministerial reactions.</p>
        </div>
        
        {selectedPolicy && onNavigateToPolicy && setSelectedPolicy && (
          <div 
            onClick={onNavigateToPolicy}
            className="flex items-center justify-between bg-pink-50 border border-pink-200 rounded-lg p-2 pl-3 md:px-4 cursor-pointer hover:bg-pink-100 hover:border-pink-300 transition-all shadow-sm group shrink-0"
          >
            <div className="flex flex-col pr-4 border-r border-pink-200/60 mr-3">
              <span className="text-[9px] font-black uppercase tracking-widest text-pink-500 mb-0.5">Draft Selected</span>
              <span className="text-sm font-bold text-pink-900 leading-none truncate max-w-[200px]">{selectedPolicy.policyName}</span>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setSelectedPolicy(null);
              }}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-pink-200/50 text-pink-500 hover:bg-pink-500 hover:text-white transition-colors shrink-0"
            >
              <span className="text-xs font-bold">✕</span>
            </button>
          </div>
        )}
      </div>

      <div className={`grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 flex-1 min-h-0 w-full ${getTutorialClass(0)}`}>
        {ministers.map((minister, i) => {
          const isHighlighted = selectedName === minister.name;
          const isReacting = selectedPolicy != null;
          const reaction = isReacting ? getMinisterReaction(minister.policyDelta || 0) : null;
          
          const displayStatus = isReacting && reaction ? reaction.statusName : minister.status;
          const displayColor = isReacting && reaction ? reaction.circle : minister.color;
          const displayEmoji = isReacting && reaction ? reaction.emoji : (minister.status === 'happy' ? '😊' : minister.status === 'neutral' ? '😐' : '😠');

          const styles = isHighlighted ? getHighlightStyles(displayStatus) : { card: 'border-zinc-200 bg-white', text: 'text-zinc-800' };
          const tutorialIndex = i === 0 ? 0 : 1;
          
          return (
            <div key={i} className={`rounded-xl border p-4 lg:p-6 flex flex-col h-full min-h-0 transition-all duration-300 ${styles.card} ${getTutorialClass(tutorialIndex)}`}>
              
              <div className="flex justify-between items-start mb-3 lg:mb-4 shrink-0">
                <div className="flex-1 pr-2">
                  <h3 className={`text-sm lg:text-base font-black uppercase tracking-widest ${styles.text}`}>
                    {minister.name}
                  </h3>
                  <p className="text-xs lg:text-sm font-bold text-zinc-500 mt-0.5">{minister.mandate}</p>
                  <p className="text-[10px] lg:text-xs text-zinc-500 mt-1 font-medium">
                    {isReacting && reaction ? reaction.text : <span className="capitalize">{minister.status} with trajectory</span>}
                  </p>
                </div>
                <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center ${displayColor} border-2 lg:border-4 border-white shadow-md text-2xl lg:text-3xl shrink-0 transition-colors`}>
                  {displayEmoji}
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-center gap-3 lg:gap-4 min-h-0">
                <div>
                  <p className="text-[10px] lg:text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">Current Dem. Score</p>
                  <p className="text-3xl lg:text-4xl font-black text-zinc-800 tracking-tighter leading-none">
                    {minister.currentScore !== undefined ? minister.currentScore.toFixed(2) : "0.00"}
                    <span className="text-sm lg:text-base text-zinc-400 font-bold ml-1">/ 10</span>
                  </p>
                </div>
                
                <div>
                  <p className="text-[10px] lg:text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">Projected with Policy</p>
                  <div className="flex items-center gap-3">
                    <p className="text-xl lg:text-2xl font-bold text-zinc-600 leading-none">
                      {minister.projectedScore !== undefined ? minister.projectedScore.toFixed(2) : "0.00"}
                    </p>
                    {isReacting && reaction && minister.policyDelta !== undefined && Math.abs(minister.policyDelta) >= 0.05 && (
                      <span className={`text-sm lg:text-sm font-black px-2 lg:px-2.5 py-0.5 rounded-full ${reaction.badge}`}>
                        {minister.policyDelta > 0 ? '↑' : '↓'} {Math.abs(minister.policyDelta).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {minister.quote && (
                <div className="mt-3 lg:mt-4 pt-3 lg:pt-4 border-t border-zinc-200/60 italic text-xs lg:text-sm text-zinc-500 shrink-0">
                  "{minister.quote}"
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}