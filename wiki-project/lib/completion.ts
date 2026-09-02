const STORAGE_KEY_VISITED = 'wiki_visited_pages';
const STORAGE_KEY_COMPLETED = 'wiki_completed_pages';

function readMap(key: string): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(key) || '{}');
  } catch {
    return {};
  }
}

function writeMap(key: string, map: Record<string, number>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(map));
}

export function getVisitedPages(): Record<string, number> {
  return readMap(STORAGE_KEY_VISITED);
}

export function getCompletedPages(): Record<string, number> {
  return readMap(STORAGE_KEY_COMPLETED);
}

export function markVisited(slug: string): Record<string, number> {
  const map = getVisitedPages();
  if (!map[slug]) {
    map[slug] = Date.now();
    writeMap(STORAGE_KEY_VISITED, map);
  }
  return map;
}

export function markCompleted(slug: string): Record<string, number> {
  const map = getCompletedPages();
  map[slug] = Date.now();
  writeMap(STORAGE_KEY_COMPLETED, map);
  return map;
}