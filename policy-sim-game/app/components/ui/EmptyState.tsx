import React from 'react';

/**
 * Frosted-glass placeholder overlay shown when a panel has nothing to display
 * yet ("Awaiting Policy", "Select Legislation", etc). Previously this exact
 * markup was duplicated three times across DashboardTab with only the icon
 * and copy changing.
 */
export const EmptyState = ({
  icon,
  title,
  description,
  maxWidthClassName = 'max-w-[280px]',
}: {
  icon: React.ReactNode;
  title: React.ReactNode;
  description: React.ReactNode;
  maxWidthClassName?: string;
}) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-[2px] rounded-b-xl z-10 animate-in fade-in duration-300 pointer-events-auto">
    <div className={`bg-white px-5 py-4 rounded-xl shadow-lg border border-zinc-200 text-center ${maxWidthClassName}`}>
      <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center mx-auto mb-2">
        <span className="text-zinc-400 text-lg">{icon}</span>
      </div>
      <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-widest mb-1">{title}</h4>
      <p className="text-sm text-zinc-500 font-medium">{description}</p>
    </div>
  </div>
);
