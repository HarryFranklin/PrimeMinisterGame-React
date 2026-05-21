import React, { useState, useRef, useEffect } from "react";
import { Policy, Minister } from "../utils/types";

interface SharedTabHeaderProps {
  title: string;
  subtitle?: string;
  approvalRating: number;
  selectedPolicy: Policy | null;
  setSelectedPolicy?: (policy: Policy | null) => void;
  selectedMinister?: Minister | string | null;
  presentedPolicies?: Policy[];
  tutorialClass?: string;
  onNavigateToMinisters?: () => void; 
  children?: React.ReactNode; 
}

export default function SharedTabHeader({
  title,
  subtitle,
  approvalRating,
  selectedPolicy,
  setSelectedPolicy,
  selectedMinister,
  presentedPolicies = [],
  tutorialClass = "relative z-10",
  onNavigateToMinisters,
  children
}: SharedTabHeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const ministerName = typeof selectedMinister === 'string' ? selectedMinister : selectedMinister?.name;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const otherPolicies = presentedPolicies.filter(p => p.id !== selectedPolicy?.id);

  return (
    <div className={`bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex flex-wrap xl:flex-nowrap justify-between items-center gap-4 shrink-0 relative z-[60] ${tutorialClass}`}>
      
      {/* Left Side: Standardised Status Indicators */}
      <div className="flex items-stretch gap-2 sm:gap-3 h-[52px] shrink min-w-0 max-w-full">
        
        {/* 1. Approval Box */}
        <div className="bg-zinc-900 text-white px-3 sm:px-4 rounded-lg flex flex-col justify-center items-center shrink-0 shadow-sm">
          <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-400 mb-0.5">Approval</span>
          <span className={`text-base sm:text-lg font-black leading-none ${approvalRating >= 51 ? 'text-emerald-400' : 'text-rose-400'}`}>{approvalRating.toFixed(1)}%</span>
        </div>

        {/* 2 & 3. Grouped Policy & Minister Area */}
        <div 
          ref={dropdownRef}
          className="relative flex items-stretch gap-2 sm:gap-3 shrink min-w-0 flex-1"
          onMouseLeave={() => setIsDropdownOpen(false)}
        >
          {/* 2. Policy Widget */}
          {selectedPolicy && setSelectedPolicy ? (
            <div 
              className="flex items-center justify-between bg-pink-50 border border-pink-200 rounded-lg px-2 sm:px-3 cursor-pointer hover:bg-pink-100 hover:border-pink-300 transition-all shadow-sm group shrink min-w-0 max-w-[280px] flex-1"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              onMouseEnter={() => setIsDropdownOpen(true)}
            >
              <div className="flex flex-col justify-center pr-2 sm:pr-3 border-r border-pink-200/60 mr-2 sm:mr-3 h-full flex-1 overflow-hidden py-1 min-w-0">
                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-pink-500 leading-none mb-1 truncate">Policy Draft Selected</span>
                <span className="text-xs sm:text-sm font-bold text-pink-900 leading-none truncate w-full">{selectedPolicy.policyName}</span>
              </div>
              
              {/* Clear Policy Button */}
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setSelectedPolicy(null); 
                  setIsDropdownOpen(false);
                }}
                className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full bg-pink-200/50 text-pink-500 hover:bg-pink-500 hover:text-white transition-colors shrink-0"
                title="Clear selection"
              >
                <span className="text-[10px] sm:text-xs font-bold leading-none">✕</span>
              </button>
            </div>
          ) : (
            // Allowed default state to shrink as well
            <div className="flex items-center justify-center border border-dashed border-zinc-200 bg-zinc-50 rounded-lg px-4 shrink min-w-0 max-w-[280px] flex-1 h-full">
              <span className="text-[9px] sm:text-[10px] font-bold text-zinc-400 uppercase tracking-widest truncate">No Policy Selected</span>
            </div>
          )}

          {/* 3. Minister Profile Button */}
          {selectedMinister && (
             <button 
               onClick={() => onNavigateToMinisters && onNavigateToMinisters()}
               className="h-full px-2 sm:px-3 flex items-center justify-center gap-2 sm:gap-3 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 hover:border-zinc-300 transition-all shadow-sm group shrink min-w-0"
               title={`Consulting: ${ministerName}`}
             >
               <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-zinc-100 flex items-center justify-center text-base sm:text-lg shadow-inner group-hover:scale-105 transition-transform border border-zinc-200 shrink-0">
                 {(typeof selectedMinister !== 'string' && selectedMinister?.emoji) || '👤'} 
               </div>
               <div className="flex flex-col items-start pr-1 hidden md:flex min-w-0">
                 <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-zinc-400 leading-none mb-1">Consulting</span>
                 <span className="text-xs font-bold text-zinc-800 leading-none truncate w-full max-w-[120px]">
                   {ministerName}
                 </span>
               </div>
             </button>
          )}

          {/* Interactive Dropdown Menu */}
          {selectedPolicy && setSelectedPolicy && isDropdownOpen && (
            <div className="absolute top-full left-0 w-[calc(100vw-32px)] sm:w-full min-w-[280px] sm:min-w-[340px] pt-2 z-[120]">
              <div 
                className="bg-white border border-pink-300 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                onClick={(e) => e.stopPropagation()} 
              >
                {/* Active Selection Header */}
                <div className="p-4 bg-pink-50/50 border-b border-pink-100">
                  <span className="text-[10px] font-black uppercase tracking-widest text-pink-400 mb-1 block">Active Selection</span>
                  <p className="font-bold text-pink-900 mb-1">{selectedPolicy.policyName}</p>
                  <p className="text-sm text-pink-700/80 leading-relaxed">{selectedPolicy.description}</p>
                </div>

                {/* Other Recommendations */}
                {otherPolicies.length > 0 && (
                  <>
                    <div className="bg-zinc-50 border-b border-zinc-100 px-4 py-2">
                      <span className="text-[12px] font-black uppercase tracking-widest text-zinc-400">Alternative Options</span>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
                      {otherPolicies.map(policy => (
                        <div 
                          key={policy.id}
                          onClick={() => {
                            setSelectedPolicy(policy);
                            setIsDropdownOpen(false); 
                          }}
                          className="p-4 border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer transition-colors"
                        >
                          <p className="font-bold text-zinc-800 text-sm mb-1">{policy.policyName}</p>
                          <p className="text-xs text-zinc-500 leading-relaxed">{policy.description}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Side: Title Section & External Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between flex-1 w-full gap-4 xl:ml-8 min-w-[200px]">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-zinc-800 truncate">{title}</h2>
          {subtitle && <p className="text-sm text-zinc-500 hidden md:block truncate">{subtitle}</p>}
        </div>
        
        {children && (
          <div className="shrink-0 flex items-center justify-end">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}