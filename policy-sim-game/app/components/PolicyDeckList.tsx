import React from 'react';
import { Policy, Respondent } from '../utils/types';
import { PolicyRuleList } from './PolicyRuleCard';

interface PolicyDeckListProps {
  deck: Policy[];
  selectedPolicy: Policy | null;
  onSelect: (policy: Policy | null) => void;
  population: Respondent[];
  detailsOpen: boolean;
  onToggleDetails: (open: boolean) => void;
}

/**
 * The four selectable policy cards shown while parliament is in session.
 */
export default function PolicyDeckList({
  deck,
  selectedPolicy,
  onSelect,
  population,
  detailsOpen,
  onToggleDetails,
}: PolicyDeckListProps) {
  return (
    <>
      {deck.slice(0, 4).map((policy, index) => {
        const isSelected = selectedPolicy?.id === policy.id;
        const isOtherSelectedAndOpen = selectedPolicy && !isSelected && detailsOpen;

        return (
          <div
            key={policy.id}
            className={`relative flex w-full transition-all duration-300 ease-in-out ${
              isSelected ? 'flex-[2.5] z-[70]' : 'flex-1 z-10'
            } ${isOtherSelectedAndOpen ? 'blur-[2px] opacity-40' : ''}`}
          >
            <div
              className={`w-full flex rounded-xl border transition-all duration-300 overflow-hidden relative ${
                isSelected ? 'border-pink-500 bg-pink-50 shadow-md' : 'border-zinc-200 hover:border-zinc-300 bg-white'
              }`}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(isSelected ? null : policy);
                  onToggleDetails(false);
                }}
                className={`flex-col text-left flex-grow-0 flex transition-all duration-300 cursor-pointer ${
                  isSelected ? 'w-[85%] items-start justify-start p-3' : 'w-full items-start justify-center px-4 py-2'
                }`}
              >
                <p className={`font-bold text-base leading-tight ${isSelected ? 'text-pink-900' : 'text-zinc-900'}`}>
                  {policy.policyName}
                </p>
                <div
                  className={`transition-all duration-300 overflow-hidden ${
                    isSelected ? 'opacity-100 max-h-[120px] mt-1' : 'opacity-0 max-h-0'
                  }`}
                >
                  <p className="text-sm text-pink-700/80 leading-relaxed">{policy.description}</p>
                </div>
              </button>

              {isSelected && (
                <div
                  className="w-[15%] border-l border-pink-200 flex items-center justify-center cursor-pointer hover:bg-pink-100"
                  onClick={() => onToggleDetails(!detailsOpen)}
                >
                  <span className="text-[10px] font-black uppercase text-pink-600 text-center leading-tight px-1">
                    View
                    <br />
                    Details
                  </span>
                </div>
              )}
            </div>

            {isSelected && detailsOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className={`absolute left-0 right-0 bg-white border border-pink-300 shadow-2xl rounded-xl p-3 z-[100] cursor-auto ${
                  index > 1 ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]'
                }`}
              >
                <div className="max-h-[25vh] overflow-y-auto pr-1">
                  <PolicyRuleList rules={policy.specificRules} population={population} showCoverage />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}