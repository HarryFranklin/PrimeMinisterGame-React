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