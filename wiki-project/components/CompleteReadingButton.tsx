'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useTelemetrySession } from '@/context/TelemetryContext';
import { useCompletion } from '@/context/CompletionContext';
import { markStudyComplete } from '@/lib/telemetry';
import type { NavCategory } from '@/lib/wiki';

// Placeholder — replace with your actual Prolific completion URL.
const PROLIFIC_COMPLETION_URL = 'https://app.prolific.com/submissions/complete?cc=PLACEHOLDER';

export default function CompleteReadingButton({ nav }: { nav: NavCategory[] }) {
  const telemetry = useTelemetrySession();
  const { allComplete } = useCompletion();
  const [submitting, setSubmitting] = useState(false);
  const session = telemetry?.session;
  const ready = allComplete(nav);

  if (!ready) return null;

  const handleClick = async () => {
    if (!session || submitting) return;
    setSubmitting(true);
    await markStudyComplete(session);
    window.location.href = PROLIFIC_COMPLETION_URL;
  };

  return (
    <button
      onClick={handleClick}
      disabled={submitting}
      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-base font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-60"
    >
      <CheckCircle2 size={20} />
      {submitting ? 'Submitting...' : 'Complete Reading'}
    </button>
  );
}