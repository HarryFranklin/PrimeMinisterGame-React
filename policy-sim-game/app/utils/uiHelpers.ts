/**
 * Centralised colour dictionaries for consistent visual language across all graphs and tabs.
 * Keeping these here means changing a colour updates the entire app instantly.
 */
export const DEMO_COLORS = {
  wealth: { 'Poor': '#ef4444', 'Middle': '#3b82f6', 'Wealthy': '#10b981' },
  age: { 'Youth': '#ec4899', 'Adult': '#8b5cf6', 'Elderly': '#7ff163' }
};

export const IMPACT_COLORS = {
  'Will improve': '#3b82f6',
  'Will be stable': '#d4d4d8',
  'Will be worsened': '#f59e0b'
};

export const STATUS_COLORS = {
  intention: { 'Approves': '#3b82f6', 'Angry': '#f59e0b' },
  trajectory: { 'Will improve': '#3b82f6', 'Will be worsened': '#f59e0b', 'Will be stable': '#d4d4d8' }
};

export const SORT_ORDERS = {
  wealth: { 'Poor': 1, 'Middle': 2, 'Wealthy': 3 },
  age: { 'Youth': 1, 'Adult': 2, 'Elderly': 3 }
};

/**
 * Evaluates a minister's reaction based on the policy's impact on their demographic.
 * Standardised across the Dashboard and Ministers tab.
 */
export const getMinisterReaction = (delta: number) => {
  if (delta >= 0.05) return { text: "Brilliant!", badge: "text-emerald-700 bg-emerald-100", circle: "bg-emerald-500", emoji: "😊", statusName: "happy" };
  if (delta >= 0.005) return { text: "Approves.", badge: "text-emerald-700 bg-emerald-50", circle: "bg-emerald-400", emoji: "🙂", statusName: "happy" };
  if (delta <= -0.05) return { text: "Disastrous!", badge: "text-rose-700 bg-rose-100", circle: "bg-rose-500", emoji: "😠", statusName: "angry" };
  if (delta <= -0.005) return { text: "Objects.", badge: "text-rose-700 bg-rose-50", circle: "bg-rose-400", emoji: "🙁", statusName: "angry" };
  return { text: "No impact.", badge: "text-zinc-600 bg-zinc-100", circle: "bg-zinc-300", emoji: "😐", statusName: "neutral" };
};