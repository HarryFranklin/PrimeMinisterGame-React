// Types for scoring.mjs (so the TypeScript worker can import it).
export type Charts = Record<string, { label?: string; counts?: number[] } | string>;
export interface ItemSpec {
  type: string;
  correct?: unknown;
  options?: unknown;
  rows?: Record<string, string>;
  measure?: string;
  explain?: string;
  [k: string]: unknown;
}
export type Marks = Record<string, number | ''>;
export function measure(charts: Charts, id: string, m: string): number | null;
export function chartAnswer(charts: Charts, options: Record<string, string>, m: string): string | null;
export function markItem(spec: ItemSpec, ans: unknown, charts: Charts): { marks: Marks; correct: unknown };
export function itemMax(spec: ItemSpec): number;
export function itemScore(marks: Marks): number;
