'use client';

// --- DEV_TOOLS ------------------------------------------------------------
import { clearAllLocalState } from '@/lib/telemetry';

export default function ClearStateButton() {
  const handleClick = () => {
    if (!window.confirm('Clear local session/progress and reload as a new user?')) return;
    clearAllLocalState();
    window.location.href = '/';
  };

  return (
    <button
      onClick={handleClick}
      title="DEV: clear local state and reload as a new user"
      className="fixed bottom-4 left-4 z-50 rounded-full bg-red-600 text-white text-xs font-semibold px-3 py-2 shadow-lg hover:bg-red-700"
    >
      Clear state (dev)
    </button>
  );
}
// --- END DEV_TOOLS ----------------------------------------------------------