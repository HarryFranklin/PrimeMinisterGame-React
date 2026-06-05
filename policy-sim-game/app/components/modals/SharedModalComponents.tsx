import React from 'react';

export const ModalOverlay = ({ children }: { children: React.ReactNode }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-900/80 backdrop-blur-md transition-all animate-in fade-in p-2 md:p-4">
    {children}
  </div>
);

export const ModalContent = ({ children, maxWidth = "max-w-4xl" }: { children: React.ReactNode, maxWidth?: string }) => (
  <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} flex flex-col border-x border-zinc-200 border-t-[6px] border-t-pink-600 border-b-[6px] border-b-zinc-900 animate-in zoom-in duration-300 max-h-[95vh]`}>
    <div className="flex-1 overflow-y-auto p-5 md:p-8 flex flex-col gap-4 md:gap-5">
      {children}
    </div>
  </div>
);

export const ModalHeader = ({ title, subtitle }: { title: string, subtitle?: string }) => (
  <div className="text-center max-w-3xl mx-auto shrink-0 mb-2">
    <h2 className="text-2xl md:text-3xl font-black tracking-tight text-zinc-900 mb-2 leading-tight break-words">{title}</h2>
    {subtitle && <p className="text-sm font-bold uppercase tracking-widest text-zinc-500">{subtitle}</p>}
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