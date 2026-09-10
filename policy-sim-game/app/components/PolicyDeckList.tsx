import React, { useState } from 'react';
import { Policy, Respondent } from '../utils/types';
import { PolicyRuleList } from './PolicyRuleCard';
import { motion, AnimatePresence, Easing } from 'framer-motion';

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
  // Store the available screen space above/below the card for the popup
  const [dynamicMaxHeight, setDynamicMaxHeight] = useState<number | null>(null);

  // A strictly typed cubic-bezier curve for high-quality UI animations
  const uiEase: Easing = [0.22, 1, 0.36, 1];

  return (
    <>
      {deck.slice(0, 4).map((policy, index) => {
        const isSelected = selectedPolicy?.id === policy.id;
        const isOtherSelectedAndOpen = selectedPolicy && !isSelected && detailsOpen;

        return (
          <motion.div
            layout
            key={policy.id}
            className={`relative flex w-full ${
              isSelected ? 'flex-none shrink-0 z-[70]' : 'flex-1 min-h-0 z-10'
            } ${isOtherSelectedAndOpen ? 'blur-[2px] opacity-40' : ''}`}
            transition={{ duration: 0.4, ease: uiEase }}
          >
            <motion.div
              layout
              className={`w-full flex rounded-xl border overflow-hidden relative ${
                isSelected ? 'border-pink-500 bg-pink-50 shadow-md' : 'border-zinc-200 hover:border-zinc-300 bg-white'
              }`}
              transition={{ duration: 0.4, ease: uiEase }}
            >
              <motion.button
                layout
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(isSelected ? null : policy);
                  setDynamicMaxHeight(null); // Reset bounds on deselect
                  onToggleDetails(false);
                }}
                className={`flex-col text-left flex cursor-pointer h-full ${
                  isSelected ? 'w-[85%] p-3.5' : 'w-full px-4 py-2'
                }`}
                transition={{ duration: 0.4, ease: uiEase }}
              >
                {/* Vertical centering wrapper */}
                <motion.div 
                  layout 
                  className={`w-full flex flex-col ${isSelected ? 'justify-start' : 'my-auto'}`}
                  transition={{ duration: 0.4, ease: uiEase }}
                >
                  <motion.p 
                    layout 
                    className={`font-bold text-base leading-tight ${isSelected ? 'text-pink-900' : 'text-zinc-900'}`}
                    transition={{ duration: 0.4, ease: uiEase }}
                  >
                    {policy.policyName}
                  </motion.p>
                  
                  {/* SEQUENCED DESCRIPTION ANIMATION */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ 
                          opacity: 1, 
                          transition: { duration: 0.3, delay: 0.15, ease: 'easeOut' } 
                        }}
                        exit={{ 
                          opacity: 0, 
                          height: 0, 
                          transition: { 
                            // Fade out very fast...
                            opacity: { duration: 0.15, ease: 'easeIn' },
                            // ...then smoothly collapse the height to slide the title down
                            height: { duration: 0.3, delay: 0.1, ease: uiEase }
                          } 
                        }}
                        className="w-full overflow-hidden"
                      >
                        <p className="text-sm text-pink-700/80 leading-relaxed mt-1.5">
                          {policy.description}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </motion.button>

              {/* View Details Side-Tab */}
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ 
                      opacity: 1, 
                      x: 0, 
                      transition: { delay: 0.15, duration: 0.3, ease: uiEase } 
                    }}
                    exit={{ 
                      opacity: 0, 
                      x: 20, 
                      transition: { duration: 0.2, ease: uiEase } 
                    }}
                    className="w-[15%] border-l border-pink-200 flex items-center justify-center cursor-pointer hover:bg-pink-100 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!detailsOpen) {
                        const cardElement = e.currentTarget.parentElement;
                        if (cardElement) {
                          const rect = cardElement.getBoundingClientRect();
                          const buffer = 60; 
                          if (index > 1) {
                            setDynamicMaxHeight(rect.top - buffer);
                          } else {
                            setDynamicMaxHeight(window.innerHeight - rect.bottom - buffer);
                          }
                        }
                      } else {
                        setDynamicMaxHeight(null);
                      }
                      onToggleDetails(!detailsOpen);
                    }}
                  >
                    <span className="text-[10px] font-black uppercase text-pink-600 text-center leading-tight px-1">
                      View
                      <br />
                      Details
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* The Popup Details Overlay */}
            <AnimatePresence>
              {isSelected && detailsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: index > 1 ? 10 : -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: index > 1 ? 10 : -10 }}
                  transition={{ duration: 0.2, ease: uiEase }}
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute left-0 right-0 bg-white/95 backdrop-blur-md border border-pink-300 shadow-2xl rounded-xl p-3 z-[100] cursor-auto flex flex-col ${
                    index > 1 ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]'
                  }`}
                  style={{ maxHeight: dynamicMaxHeight ? `${dynamicMaxHeight}px` : '45vh' }}
                >
                  <div className="flex-1 overflow-y-auto pr-1 min-h-0">
                    <PolicyRuleList rules={policy.specificRules} population={population} showCoverage />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </>
  );
}