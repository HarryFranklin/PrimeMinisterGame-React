import React from 'react';

/**
 * Card is the single source of truth for the "white bordered panel" look used
 * across the dashboard (population charts, utility table, agenda list, etc).
 * Previously this exact class string (bg-white rounded-xl border border-zinc-200
 * shadow-sm ...) was hand-typed in half a dozen places; changing the visual
 * language now means editing it here once.
 */
export const Card = ({
  children,
  className = '',
  flex = true,
}: {
  children: React.ReactNode;
  className?: string;
  /** Card grows/shrinks to fill a flex parent (the common case in this app's layout). */
  flex?: boolean;
}) => (
  <div
    className={`bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden ${
      flex ? 'flex flex-col flex-1 min-h-0' : ''
    } ${className}`}
  >
    {children}
  </div>
);

export const CardHeader = ({
  title,
  subtitle,
  action,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) => (
  <div className="px-4 py-2 border-b border-zinc-200 bg-zinc-100 shrink-0 flex justify-between items-center gap-2">
    <div className="min-w-0">
      <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-900 truncate">{title}</h3>
      {subtitle && <p className="text-sm text-zinc-600 mt-1">{subtitle}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

/** Larger variant of CardHeader used where the title is the page's primary heading (e.g. Legislative Agenda). */
export const CardHeaderLarge = ({
  title,
  subtitle,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
}) => (
  <div className="p-4 border-b border-zinc-200 bg-zinc-100 shrink-0">
    <h3 className="text-xl font-bold text-zinc-900 tracking-tight">{title}</h3>
    {subtitle && <p className="text-sm text-zinc-600 mt-1">{subtitle}</p>}
  </div>
);

export const CardBody = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={`flex-1 min-h-0 ${className}`}>{children}</div>;
