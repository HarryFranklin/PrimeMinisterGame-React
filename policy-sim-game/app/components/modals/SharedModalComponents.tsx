import React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTypewriter } from '../../hooks/useTypewriter';
import { useGame } from "../../context/GameStateContext";

interface InteractiveDPMEmailProps {
  title: string;
  message: string;
  typeSpeed?: number;
  delayAfterComplete?: number;
  onAcknowledge: () => void;
  buttonText?: string;
}

export const ModalOverlay = ({ children }: { children: React.ReactNode }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/80 backdrop-blur-md transition-all animate-in fade-in p-2 md:p-4">
    {children}
  </div>
);

export const ModalContent = ({ children, maxWidth = "max-w-4xl" }: { children: React.ReactNode, maxWidth?: string }) => (
  <motion.div 
    layout
    className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} flex flex-col border-x border-zinc-200 border-t-[6px] border-t-pink-600 border-b-[6px] border-b-zinc-900 animate-in zoom-in duration-300 max-h-[95vh]`}
  >
    <div className="flex-1 overflow-y-auto p-5 md:p-8 flex flex-col gap-4 md:gap-5">
      {children}
    </div>
  </motion.div>
);

export const ModalHeader = ({ title, subtitle }: { title: string, subtitle?: string }) => (
  <div className="text-center max-w-2xl mx-auto">
    <h2 className="text-2xl font-bold text-zinc-900 tracking-tight mb-1">{title}</h2>
    {subtitle && <p className="text-xs font-bold text-pink-600 uppercase tracking-widest">{subtitle}</p>}
  </div>
);

export const DPMMessage = ({ title, children, className = "" }: { title: string, children: React.ReactNode, className?: string }) => (
  <div className={`p-4 bg-zinc-50 rounded-xl border border-zinc-200 text-left shrink-0 ${className}`}>
    <div className="flex items-center gap-3 mb-3 border-b border-zinc-200/60 pb-3">
      <span className="text-2xl bg-white border border-zinc-200 w-10 h-10 flex items-center justify-center rounded-full shadow-sm shrink-0">👱‍♂️</span>
      <div>
        <span className="text-[10px] font-black uppercase tracking-widest text-pink-600 leading-tight block mb-0.5">Deputy Prime Minister</span>
        <span className="font-bold text-zinc-800 text-sm">{title}</span>
      </div>
    </div>
    <div className="italic text-zinc-700 text-sm leading-relaxed">{children}</div>
  </div>
);

export const ModalActionBtn = ({ onClick, children, variant = "primary" }: { onClick: () => void, children: React.ReactNode, variant?: "primary" | "secondary" | "accent" }) => {
  const baseClass = "w-full py-3 md:py-3.5 text-sm md:text-base font-bold rounded-xl transition-all shadow-md shrink-0 flex-1";
  const variants = {
    primary: "bg-zinc-900 text-white hover:bg-black",
    secondary: "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 shadow-none border border-zinc-300",
    accent: "bg-pink-600 text-white hover:bg-pink-700"
  };
  return (
    <button onClick={onClick} className={`${baseClass} ${variants[variant]}`}>
      {children}
    </button>
  );
};

export const InteractiveDPMEmail = ({ 
  title, 
  message, 
  typeSpeed = 70, 
  delayAfterComplete = 2000, 
  onAcknowledge,
  buttonText = "Begin Term"
}: InteractiveDPMEmailProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [buttonUnlocked, setButtonUnlocked] = useState(false);
  
  const { displayedText, isTyping, isComplete, skip } = useTypewriter(message, typeSpeed, isOpen);

  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => {
        setButtonUnlocked(true);
      }, delayAfterComplete);
      return () => clearTimeout(timer);
    }
  }, [isComplete, delayAfterComplete]);

  const handleAcknowledge = () => {
    if (!buttonUnlocked) return;
    
    setButtonUnlocked(false); 
    onAcknowledge();
  };

  return (
    <motion.div layout className="w-full relative flex flex-col">
      <AnimatePresence mode="popLayout" initial={false}>
        {!isOpen ? (
          <motion.button 
            key="envelope" layout
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4 }}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setIsOpen(true)}
            className="w-full p-6 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between shadow-sm group hover:border-pink-300 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-zinc-200 shadow-sm group-hover:border-pink-300 transition-colors">
                <span className="text-2xl">📁</span>
              </div>
              <div className="text-left">
                <span className="text-[10px] font-black uppercase tracking-widest text-pink-600 block mb-0.5">Secure Message</span>
                <span className="font-bold text-zinc-800">Open Briefing from Deputy Prime Minister</span>
              </div>
            </div>
            <span className="text-zinc-400 group-hover:text-pink-500 transition-colors">→</span>
          </motion.button>
        ) : (
          <motion.div 
            key="message" layout
            initial={{ opacity: 0, filter: "blur(4px)" }} animate={{ opacity: 1, filter: "blur(0px)" }} exit={{ opacity: 0, filter: "blur(4px)" }} transition={{ duration: 0.4 }}
            className="flex flex-col gap-6 w-full"
          >
            <DPMMessage title={title}>
              <div className={`relative ${isTyping ? 'cursor-pointer' : ''}`} onClick={() => { if(isTyping) skip(); }}>
                <span className="whitespace-pre-wrap invisible block" aria-hidden="true">{message}</span>
                <span className="whitespace-pre-wrap absolute top-0 left-0 w-full h-full">
                  {displayedText}
                  {isTyping && <span className="inline-block w-1.5 h-4 ml-1 bg-zinc-400 animate-pulse" />}
                </span>
                {isTyping && (
                  <span className="absolute bottom-0 right-0 text-[10px] font-bold text-pink-500 bg-pink-50/90 px-2 py-0.5 rounded-full border border-pink-100 hover:bg-pink-100 transition-colors pointer-events-none">
                    Skip ⏭
                  </span>
                )}
              </div>
            </DPMMessage>

            <button 
              onClick={handleAcknowledge}
              disabled={!buttonUnlocked}
              className={`w-full py-4 text-sm font-bold uppercase tracking-widest rounded-xl transition-all shadow-md shrink-0 duration-500 ${
                buttonUnlocked ? 'bg-zinc-900 text-white hover:bg-black translate-y-0 opacity-100 cursor-pointer' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed translate-y-2 opacity-50 pointer-events-none'
              }`}
            >
              {buttonText}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const InlineDPMMessage = ({ 
  title, message, typeSpeed = 40, onComplete, persistenceId 
}: { 
  title: string; message: string; typeSpeed?: number; onComplete?: () => void; persistenceId: string; 
}) => {
  const { dpmConsulted, setDpmConsulted } = useGame();
  const [isOpen, setIsOpen] = useState(false);

  const isUnlocked = persistenceId ? !!dpmConsulted[persistenceId] : false;
  const isInstant = isUnlocked;

  useEffect(() => {
    if (isUnlocked) {
      setIsOpen(true);
      if (onComplete) onComplete();
    }
  }, [isUnlocked, onComplete]);

  const { displayedText, isTyping, isComplete, skip } = useTypewriter(message, typeSpeed, isOpen && !isUnlocked);

  useEffect(() => {
    if (isComplete && !isUnlocked && persistenceId) {
      setDpmConsulted(persistenceId, true);
      if (onComplete) onComplete();
    }
  }, [isComplete, isUnlocked, persistenceId, setDpmConsulted, onComplete]);

  const textToShow = isInstant ? message : displayedText;

  return (
    <motion.div layout className="w-full relative flex flex-col shrink-0">
      <AnimatePresence mode="popLayout" initial={false}>
        {!isOpen ? (
          <motion.button 
            key="button" layout
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={() => setIsOpen(true)}
            className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-between shadow-md group hover:bg-black transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700 shadow-inner">
                <span className="text-sm">👱‍♂️</span>
              </div>
              <span className="font-bold text-white text-sm">Consult Deputy Prime Minister</span>
            </div>
            <span className="text-zinc-400 group-hover:text-white transition-colors">→</span>
          </motion.button>
        ) : (
          <motion.div 
            key="message" layout
            initial={isInstant ? false : { opacity: 0, filter: "blur(4px)" }} animate={{ opacity: 1, filter: "blur(0px)" }} transition={{ duration: 0.4 }}
            className="w-full"
          >
            <DPMMessage title={title}>
              <div className={`relative ${isTyping ? 'cursor-pointer' : ''}`} onClick={() => { if(isTyping) skip(); }}>
                <span className="whitespace-pre-wrap invisible block" aria-hidden="true">{message}</span>
                <span className="whitespace-pre-wrap absolute top-0 left-0 w-full h-full">
                  {textToShow}
                  {isTyping && <span className="inline-block w-1.5 h-4 ml-1 bg-zinc-400 animate-pulse" />}
                </span>
                {isTyping && (
                  <span className="absolute bottom-0 right-0 text-[10px] font-bold text-pink-500 bg-pink-50/90 px-2 py-0.5 rounded-full border border-pink-100 hover:bg-pink-100 transition-colors pointer-events-none">
                    Skip ⏭
                  </span>
                )}
              </div>
            </DPMMessage>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};