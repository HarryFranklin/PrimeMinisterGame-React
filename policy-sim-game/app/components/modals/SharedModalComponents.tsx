import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Variants, Easing } from 'framer-motion';
import { useTypewriter } from '../../hooks/useTypewriter';
import { Button } from '../ui/Button';

const easeOut: Easing = [0.22, 1, 0.36, 1];
const easeIn: Easing = [0.47, 0, 0.74, 0.58];

export interface HighlightConfig {
  word: string;
  onClick?: () => void;
}

export const HighlightText = ({ text, highlights }: { text: string; highlights?: HighlightConfig[] }) => {
  if (!highlights || highlights.length === 0) return <>{text}</>;

  let result: (string | React.ReactNode)[] = [text];

  highlights.forEach((h, hIdx) => {
    const nextResult: (string | React.ReactNode)[] = [];
    result.forEach((item, i) => {
      if (typeof item === 'string') {
        const parts = item.split(h.word);
        parts.forEach((part, j) => {
          nextResult.push(part);
          if (j < parts.length - 1) {
            nextResult.push(
              <span
                key={`${hIdx}-${i}-${j}`}
                onClick={(e) => { e.stopPropagation(); h.onClick?.(); }}
                className="font-bold underline decoration-pink-300 decoration-2 underline-offset-2 text-pink-700 hover:text-pink-900 transition-colors cursor-pointer relative group pointer-events-auto"
              >
                {h.word}
              </span>
            );
          }
        });
      } else {
        nextResult.push(item);
      }
    });
    result = nextResult;
  });

  return <>{result}</>;
};

export const FloatingDefinitionPanel = ({ title, description, isVisible }: { title: string; description: string; isVisible: boolean }) => (
  <AnimatePresence>
    {isVisible && (
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 24 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-1/2 -translate-y-1/2 left-full w-[280px] md:w-[320px] pointer-events-auto"
      >
        <div className="bg-pink-50 border border-pink-200 rounded-xl p-5 shadow-xl">
          <div className="flex items-center gap-3 mb-3 border-b border-pink-200/60 pb-3">
            <span className="text-xl">📖</span>
            <h4 className="text-sm font-black text-pink-900 uppercase tracking-widest leading-tight">
              {title}
            </h4>
          </div>
          <p className="text-sm text-pink-800 leading-relaxed font-medium whitespace-pre-wrap">
            {description}
          </p>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

export const FloatingPolicyPanel = ({ policies, isVisible }: { policies: { id: string, name: string, description: string }[], isVisible: boolean }) => (
  <AnimatePresence>
    {isVisible && (
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 24 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-1/2 -translate-y-1/2 left-full w-[280px] md:w-[320px] pointer-events-auto max-h-[85vh] flex flex-col"
      >
        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xl flex flex-col gap-3 min-h-0">
          <div className="flex items-center gap-3 border-b border-zinc-200/60 pb-3 shrink-0">
            <span className="text-xl">📖</span>
            <h4 className="text-[13px] font-black text-zinc-900 uppercase tracking-widest leading-tight">
              Referenced Legislation
            </h4>
          </div>
          <div className="flex flex-col gap-3 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden min-h-0">
            {policies.length === 0 ? (
              <p className="text-xs text-zinc-500 italic">No specific policies referenced.</p>
            ) : (
              policies.map(p => (
                <div key={p.id} className="bg-zinc-50 border border-zinc-100 p-3.5 rounded-lg flex flex-col gap-1.5 shadow-sm shrink-0">
                  <span className="text-[9px] font-black uppercase tracking-widest text-pink-500 block">Enacted</span>
                  <h5 className="font-bold text-sm text-zinc-900 leading-tight">{p.name}</h5>
                  <p className="text-xs text-zinc-600 leading-relaxed whitespace-pre-wrap">
                    {p.description}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

interface InteractiveDPMEmailProps {
  title: string;
  message: string;
  typeSpeed?: number;
  delayAfterComplete?: number;
  onAcknowledge: () => void;
  buttonText?: string;
  highlights?: HighlightConfig[];
}

export const ModalOverlay = ({ children, exitDelay = 0 }: { children: React.ReactNode; exitDelay?: number }) => (
  <motion.div
    key="overlay"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0, transition: { duration: 0.5, delay: exitDelay } }}
    className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/80 backdrop-blur-md p-2 md:p-4"
  >
    {children}
  </motion.div>
);

const modalVariants: Variants = {
  hidden: (isSliding: boolean) => ({
    opacity: 0,
    x: isSliding ? -800 : 0,
    scale: isSliding ? 1 : 0.95
  }),
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.6, ease: easeOut }
  },
  exit: (isSliding: boolean) => (isSliding
    ? { x: 800, opacity: 0, transition: { duration: 0.6, ease: easeIn } }
    : { opacity: 0, scale: 0.95, transition: { duration: 0.4, ease: easeIn } })
};

export const ModalContent = ({
  children,
  floatingPanel,
  maxWidth = "max-w-xl",
  slideEntry = false,
  slideExit = false
}: {
  children: React.ReactNode;
  floatingPanel?: React.ReactNode;
  maxWidth?: string;
  slideEntry?: boolean;
  slideExit?: boolean;
}) => {
  return (
    <motion.div
      layout
      variants={modalVariants}
      custom={slideEntry || slideExit}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`relative w-full ${maxWidth} transition-[max-width] duration-500 ease-in-out`}
    >
      <div className="absolute inset-0 z-0 pointer-events-none">
        {floatingPanel}
      </div>

      <div className="absolute inset-0 bg-white rounded-2xl shadow-2xl border-x border-zinc-200 border-t-[6px] border-t-pink-600 border-b-0 z-10 pointer-events-none" />

      {/* LAYER 3: Modal Content Layer (Front) */}
      <div className="relative z-20 flex flex-col max-h-[95vh]">
        <div className="flex-1 overflow-y-auto p-5 md:p-6 flex flex-col gap-4">
          {children}
        </div>
      </div>
    </motion.div>
  );
};

export const ModalHeader = ({ title, subtitle }: { title: string, subtitle?: string }) => (
  <div className="text-center shrink-0">
    <h2 className="text-2xl font-bold text-zinc-900 tracking-tight mb-1">{title}</h2>
    {subtitle && <p className="text-xs font-bold text-pink-600 uppercase tracking-widest">{subtitle}</p>}
  </div>
);

export const DPMMessage = ({ title, children, className = "" }: { title: string, children: React.ReactNode, className?: string }) => (
  <div className={`p-4 bg-zinc-50 rounded-xl border border-zinc-200 text-left shrink-0 ${className}`}>
    <div className="flex items-center gap-3 mb-3 border-b border-zinc-200/60 pb-3">
      <span className="text-2xl bg-white border border-zinc-200 w-10 h-10 flex items-center justify-center rounded-full shadow-sm shrink-0">🏛️</span>
      <div>
        <span className="text-sm font-black uppercase tracking-widest text-pink-600 leading-tight block mb-0.5">Deputy Prime Minister</span>
        <span className="font-bold text-zinc-800 text-base">{title}</span>
      </div>
    </div>
    <div className="italic text-zinc-700 text-sm leading-relaxed whitespace-pre-wrap">
      {children}
    </div>
  </div>
);

export const ModalActionBtn = ({ onClick, children, variant = "primary" }: { onClick: () => void, children: React.ReactNode, variant?: "primary" | "secondary" | "accent" }) => (
  // Thin wrapper over the shared Button atom (see components/ui/Button.tsx) —
  // this used to maintain its own separate copy of the variant styling.
  // shrink-0 flex-1 kept as modal-footer-specific layout, not part of Button itself.
  <Button onClick={onClick} variant={variant} className="md:py-3.5 shrink-0 flex-1">
    {children}
  </Button>
);

export const InteractiveDPMEmail = ({
  title,
  message,
  typeSpeed = 70,
  delayAfterComplete = 2000,
  onAcknowledge,
  highlights,
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
    <motion.div layout className="w-full flex flex-col shrink-0">
      <AnimatePresence mode="popLayout" initial={false}>
        {!isOpen ? (
          <motion.button
            key="closed-envelope"
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            onClick={() => setIsOpen(true)}
            className="w-full p-4 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between shadow-sm group hover:bg-zinc-100 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-full border border-zinc-200 shadow-sm flex items-center justify-center shrink-0">
                <span className="text-xl">✉️</span>
              </div>
              <div>
                <p className="text-xs font-bold text-pink-600 uppercase tracking-widest mb-0.5">Secure Message</p>
                <p className="text-lg font-bold text-zinc-900 group-hover:text-black transition-colors">Open Briefing</p>
              </div>
            </div>
            <span className="text-zinc-400 group-hover:translate-x-1 transition-transform">→</span>
          </motion.button>
        ) : (
          <motion.div
            key="open-message"
            layout
            initial={{ opacity: 0, height: 0, filter: "blur(4px)" }}
            animate={{ opacity: 1, height: 'auto', filter: "blur(0px)" }}
            exit={{ opacity: 0, height: 0, filter: "blur(4px)" }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex flex-col gap-4 w-full overflow-hidden"
          >
            <DPMMessage title={title}>
              <div className={`relative ${isTyping ? 'cursor-pointer' : ''}`} onClick={() => { if (isTyping) skip(); }}>
                <span className="whitespace-pre-wrap invisible block" aria-hidden="true">
                  <HighlightText text={message} highlights={highlights} />
                </span>
                <span className="whitespace-pre-wrap absolute top-0 left-0 w-full h-full">
                  <HighlightText text={displayedText} highlights={highlights} />
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
                buttonUnlocked ? 'bg-zinc-900 text-white hover:bg-black opacity-100 cursor-pointer' : 'bg-zinc-200 text-zinc-400 cursor-not-allowed opacity-50 pointer-events-none'
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
  title, message, typeSpeed = 40, onComplete, isUnlocked, onUnlock
}: {
  title: string; message: string; typeSpeed?: number; onComplete?: () => void; isUnlocked: boolean; onUnlock: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const isInstant = isUnlocked;

  useEffect(() => {
    if (isUnlocked) {
      setIsOpen(true);
      if (onComplete) onComplete();
    }
  }, [isUnlocked, onComplete]);

  const { displayedText, isTyping, isComplete, skip } = useTypewriter(message, typeSpeed, isOpen && !isUnlocked);

  useEffect(() => {
    if (isComplete && !isUnlocked) {
      onUnlock();
      if (onComplete) onComplete();
    }
  }, [isComplete, isUnlocked, onUnlock, onComplete]);

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
                <span className="text-sm">💬</span>
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
              <div className={`relative ${isTyping ? 'cursor-pointer' : ''}`} onClick={() => { if (isTyping) skip(); }}>
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