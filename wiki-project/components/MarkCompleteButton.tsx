'use client';

import { Check } from 'lucide-react';
import { useTelemetrySession } from '@/context/TelemetryContext';
import { useCompletion } from '@/context/CompletionContext';
import { markPageComplete } from '@/lib/telemetry';

export default function MarkCompleteButton({ slug }: { slug: string }) {
  const telemetry = useTelemetrySession();
  const { completed, completePage } = useCompletion();
  const session = telemetry?.session;
  const isDone = Boolean(completed[slug]);

  const handleClick = () => {
    if (isDone || !session) return;
    completePage(slug);
    markPageComplete(session, slug);
  };

  return (
    <button
      onClick={handleClick}
      disabled={isDone}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
        isDone
          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 cursor-default'
          : 'bg-indigo-600 text-white hover:bg-indigo-700'
      }`}
    >
      <Check size={16} />
      {isDone ? 'Marked as Complete' : 'Mark as Complete'}
    </button>
  );
}