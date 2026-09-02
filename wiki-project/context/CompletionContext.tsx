'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getVisitedPages, getCompletedPages, markVisited, markCompleted } from '@/lib/completion';
import type { NavCategory } from '@/lib/wiki';

interface CompletionContextType {
  visited: Record<string, number>;
  completed: Record<string, number>;
  visitPage: (slug: string) => void;
  completePage: (slug: string) => void;
  isCategoryComplete: (nav: NavCategory) => boolean;
  allComplete: (nav: NavCategory[]) => boolean;
}

const CompletionContext = createContext<CompletionContextType | undefined>(undefined);

export function CompletionProvider({ children }: { children: React.ReactNode }) {
  const [visited, setVisited] = useState<Record<string, number>>({});
  const [completed, setCompleted] = useState<Record<string, number>>({});

  useEffect(() => {
    setVisited(getVisitedPages());
    setCompleted(getCompletedPages());
  }, []);

  const visitPage = useCallback((slug: string) => {
    setVisited(markVisited(slug));
  }, []);

  const completePage = useCallback((slug: string) => {
    setCompleted(markCompleted(slug));
  }, []);

  const isCategoryComplete = useCallback(
    (cat: NavCategory) => cat.pages.every((p) => completed[p.slug]),
    [completed]
  );

  const allComplete = useCallback(
    (nav: NavCategory[]) => nav.every((cat) => isCategoryComplete(cat)),
    [isCategoryComplete]
  );

  return (
    <CompletionContext.Provider value={{ visited, completed, visitPage, completePage, isCategoryComplete, allComplete }}>
      {children}
    </CompletionContext.Provider>
  );
}

export function useCompletion() {
  const context = useContext(CompletionContext);
  if (!context) {
    return {
      visited: {},
      completed: {},
      visitPage: () => {},
      completePage: () => {},
      isCategoryComplete: () => false,
      allComplete: () => false,
    };
  }
  return context;
}