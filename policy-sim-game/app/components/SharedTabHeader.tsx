import React, { useState, useRef, useEffect } from "react";
import { Policy } from "../utils/types";

interface SharedTabHeaderProps {
  title: string;
  subtitle?: string;
  approvalRating: number;
  selectedPolicy: Policy | null;
  setSelectedPolicy?: (policy: Policy | null) => void;
  selectedMinister?: any | null;
  presentedPolicies?: Policy[];
  tutorialClass?: string;
  onNavigateToMinisters?: () => void; // Function to trigger navigation
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
  // State to manage the visibility of the policy dropdown menu
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const ministerName = typeof selectedMinister === 'string' ? selectedMinister : selectedMinister?.name;

  // Handle outside clicks to close the dropdown gracefully
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter out the currently selected policy so it doesn't appear in the "Other Recommendations" list
  const otherPolicies = presentedPolicies.filter(p => p.id !== selectedPolicy?.id);

  return (
    <div className={`bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 shrink-0 relative z-[60] ${tutorialClass}`}>
      
      {/* Left Side: Standardised Status Indicators */}
      <div className="flex items-stretch gap-3 h-[52px] shrink-0">
        
        {/* 1. Approval Box */}
        <div className="bg-zinc-900 text-white px-4 rounded-lg flex flex-col justify-center items-center shrink-0 min-w-[100px] shadow-sm">
          <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-400 mb-0.5">Approval</span>
          <span className={`text-lg font-black leading-none ${approvalRating >= 51 ? 'text-emerald-400' : 'text-rose-400'}`}>{approvalRating.toFixed(1)}%</span>
        </div>

        {/* 2. Policy Widget with Dropdown */}
        {selectedPolicy && setSelectedPolicy ? (
          <div 
            ref={dropdownRef}
            className="relative flex items-center justify-between bg-pink-50 border border-pink-200 rounded-lg px-3 cursor-pointer hover:bg-pink-100 hover:border-pink-300 transition-all shadow-sm group shrink-0 min-w-[280px]"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className="flex flex-col justify-center pr-3 border-r border-pink-200/60 mr-3 h-full flex-1 overflow-hidden py-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-pink-500 leading-none mb-1">Policy Draft Selected</span>
              <span className="text-sm font-bold text-pink-900 leading-none truncate w-full">{selectedPolicy.policyName}</span>
            </div>
            
            {/* Clear Policy Button */}
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                setSelectedPolicy(null); 
                setIsDropdownOpen(false);
              }}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-pink-200/50 text-pink-500 hover:bg-pink-500 hover:text-white transition-colors shrink-0"
              title="Clear selection"
            >
              <span className="text-xs font-bold leading-none">✕</span>
            </button>

            {/* Hover Tooltip (Hidden when dropdown is open to prevent UI clashing) */}
            {!isDropdownOpen && (
              <div className="absolute top-[calc(100%+12px)] left-0 w-[340px] bg-white border border-pink-500 rounded-xl shadow-2xl ring-4 ring-pink-500/20 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-[110] p-5 pointer-events-none text-left border-l-[6px]">
                <p className="font-bold text-base leading-tight mb-2 text-pink-900">
                  {selectedPolicy.policyName}
                </p>
                <p className="text-sm text-pink-700/80 leading-relaxed">
                  {selectedPolicy.description}
                </p>
              </div>
            )}

            {/* Interactive Dropdown Menu */}
            {isDropdownOpen && (
              <div 
                className="absolute top-[calc(100%+8px)] left-0 w-[340px] bg-white border border-pink-300 rounded-xl shadow-2xl flex flex-col overflow-hidden z-[120] animate-in fade-in slide-in-from-top-2 duration-200"
                onClick={(e) => e.stopPropagation()} 
              >
                {/* Active Selection Header */}
                <div className="p-4 bg-pink-50/50 border-b border-pink-100">
                  <span className="text-[10px] font-black uppercase tracking-widest text-pink-400 mb-1 block">Active Selection</span>
                  <p className="font-bold text-pink-900 mb-1">{selectedPolicy.policyName}</p>
                  <p className="text-xs text-pink-700/80 leading-relaxed">{selectedPolicy.description}</p>
                </div>

                {/* Other Recommendations */}
                {otherPolicies.length > 0 && (
                  <>
                    <div className="bg-zinc-50 border-b border-zinc-100 px-4 py-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Alternative Options</span>
                    </div>
                    <div className="max-h-[240px] overflow-y-auto">
                      {otherPolicies.map(policy => (
                        <div 
                          key={policy.id}
                          onClick={() => {
                            if (setSelectedPolicy) setSelectedPolicy(policy);
                            setIsDropdownOpen(false); // Close dropdown after selection
                          }}
                          className="p-4 border-b border-zinc-100 hover:bg-zinc-50 cursor-pointer transition-colors"
                        >
                          <p className="font-bold text-zinc-800 text-sm mb-1">{policy.policyName}</p>
                          <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{policy.description}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center border border-dashed border-zinc-200 bg-zinc-50 rounded-lg px-4 shrink-0 w-[280px] h-full">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">No Policy Selected</span>
          </div>
        )}

        {/* 3. Minister Profile Button */}
        {selectedMinister && (
           <button 
             onClick={() => onNavigateToMinisters && onNavigateToMinisters()}
             className="h-full px-3 flex items-center justify-center gap-3 bg-white border border-zinc-200 rounded-lg hover:bg-zinc-50 hover:border-zinc-300 transition-all shadow-sm group shrink-0"
             title={`Consulting: ${ministerName}`}
           >
             {/* Placeholder for future unique faces/emojis */}
             <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-lg shadow-inner group-hover:scale-105 transition-transform border border-zinc-200">
               {selectedMinister.emoji || '👤'} 
             </div>
             <div className="flex flex-col items-start pr-1 hidden sm:flex">
               <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 leading-none mb-1">Consulting</span>
               <span className="text-xs font-bold text-zinc-800 leading-none whitespace-nowrap">
                    {ministerName}
                </span>
             </div>
           </button>
        )}
      </div>

      {/* Right Side: Title Section & External Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between flex-1 w-full gap-4 xl:ml-8">
        <div>
          <h2 className="text-xl font-bold text-zinc-800">{title}</h2>
          {subtitle && <p className="text-sm text-zinc-500 hidden md:block">{subtitle}</p>}
        </div>
        
        {/* Render anything passed as children (e.g. demographic controls for ElectorateTab) */}
        {children && (
          <div className="shrink-0 flex items-center justify-end">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}