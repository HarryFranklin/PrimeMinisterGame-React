import React from "react";

interface MinistersTabProps {
  ministers: any[];
  selectedMinister?: any | null; // Accepts the minister object or name
  selectedPolicy?: any | null;   // Added this so the tab knows a policy is active!
}

// Unified reaction logic to ensure colours perfectly match the dashboard
const getMinisterReaction = (delta: number) => {
  if (delta >= 0.05) return { text: "Brilliant!", badge: "text-emerald-700 bg-emerald-100", circle: "bg-emerald-500", emoji: "😊", statusName: "happy" };
  if (delta >= 0.005) return { text: "Approves.", badge: "text-emerald-700 bg-emerald-50", circle: "bg-emerald-400", emoji: "🙂", statusName: "happy" };
  if (delta <= -0.05) return { text: "Disastrous!", badge: "text-rose-700 bg-rose-100", circle: "bg-rose-500", emoji: "😠", statusName: "angry" };
  if (delta <= -0.005) return { text: "Objects.", badge: "text-rose-700 bg-rose-50", circle: "bg-rose-400", emoji: "🙁", statusName: "angry" };
  return { text: "No impact.", badge: "text-zinc-600 bg-zinc-100", circle: "bg-zinc-300", emoji: "😐", statusName: "neutral" };
};

export default function MinistersTab({ ministers, selectedMinister, selectedPolicy }: MinistersTabProps) {
  const selectedName = typeof selectedMinister === 'string' ? selectedMinister : selectedMinister?.name;

  const getHighlightStyles = (status: string) => {
    switch(status) {
      case 'happy': return { card: 'border-emerald-500 ring-4 ring-emerald-500/20 bg-emerald-50/40 shadow-md', text: 'text-emerald-800' };
      case 'neutral': return { card: 'border-amber-400 ring-4 ring-amber-400/20 bg-amber-50/40 shadow-md', text: 'text-amber-800' };
      case 'angry': return { card: 'border-rose-500 ring-4 ring-rose-500/20 bg-rose-50/40 shadow-md', text: 'text-rose-800' };
      default: return { card: 'border-zinc-300 shadow-md', text: 'text-zinc-800' };
    }
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 h-full min-h-0 w-full animate-in fade-in duration-300">
      {ministers.map((minister, i) => {
        const isHighlighted = selectedName === minister.name;
        
        // Determine if a policy is selected and calculate the dynamic reaction
        const isReacting = selectedPolicy != null;
        const reaction = isReacting ? getMinisterReaction(minister.policyDelta || 0) : null;
        
        // Override the default status/colours if they are reacting to a policy
        const displayStatus = isReacting && reaction ? reaction.statusName : minister.status;
        const displayColor = isReacting && reaction ? reaction.circle : minister.color;
        const displayEmoji = isReacting && reaction ? reaction.emoji : (minister.status === 'happy' ? '😊' : minister.status === 'neutral' ? '😐' : '😠');

        const styles = isHighlighted ? getHighlightStyles(displayStatus) : { card: 'border-zinc-200 bg-white', text: 'text-zinc-800' };
        
        return (
          <div 
            key={i} 
            className={`rounded-xl border p-4 lg:p-6 flex flex-col h-full min-h-0 transition-all duration-300 ${styles.card}`}
          >
            
            {/* Header */}
            <div className="flex justify-between items-start mb-3 lg:mb-4 shrink-0">
              <div className="flex-1 pr-2">
                <h3 className={`text-sm lg:text-base font-black uppercase tracking-widest ${styles.text}`}>
                  {minister.name}
                </h3>
                <p className="text-xs lg:text-sm font-bold text-zinc-500 mt-0.5">{minister.mandate}</p>
                {/* Dynamically update the subtitle text based on reaction */}
                <p className="text-[10px] lg:text-xs text-zinc-500 mt-1 font-medium">
                  {isReacting && reaction ? reaction.text : <span className="capitalize">{minister.status} with trajectory</span>}
                </p>
              </div>
              <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center ${displayColor} border-2 lg:border-4 border-white shadow-md text-2xl lg:text-3xl shrink-0 transition-colors`}>
                {displayEmoji}
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1 flex flex-col justify-center gap-3 lg:gap-4 min-h-0">
              <div>
                <p className="text-[10px] lg:text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">Current Dem. Score</p>
                <p className="text-3xl lg:text-4xl font-black text-zinc-800 tracking-tighter leading-none">
                  {minister.currentScore !== undefined ? (minister.currentScore * 10).toFixed(2) : "0.00"}
                  <span className="text-sm lg:text-base text-zinc-400 font-bold ml-1">/ 10</span>
                </p>
              </div>
              
              <div>
                <p className="text-[10px] lg:text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">Projected with Policy</p>
                <div className="flex items-center gap-3">
                  <p className="text-xl lg:text-2xl font-bold text-zinc-600 leading-none">
                    {minister.projectedScore !== undefined ? (minister.projectedScore * 10).toFixed(2) : "0.00"}
                  </p>
                  {isReacting && reaction && minister.policyDelta !== undefined && Math.abs(minister.policyDelta) >= 0.005 && (
                    <span className={`text-sm lg:text-sm font-black px-2 lg:px-2.5 py-0.5 rounded-full ${reaction.badge}`}>
                      {minister.policyDelta > 0 ? '↑' : '↓'} {Math.abs(minister.policyDelta * 10).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quote */}
            {minister.quote && (
              <div className="mt-3 lg:mt-4 pt-3 lg:pt-4 border-t border-zinc-200/60 italic text-xs lg:text-sm text-zinc-500 shrink-0">
                "{minister.quote}"
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}