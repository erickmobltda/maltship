// Firestore `in` takes at most 30 values, so the Following feed runs one query per chunk.
export const IN_LIMIT = 30;

export function chunk<T>(list: T[], size = IN_LIMIT): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** Merge per-chunk results: newest first, no duplicates, at most `limit`. */
export function mergeFeeds<T extends { id: string; updatedAt: string }>(lists: T[][], limit: number): T[] {
  const byId = new Map<string, T>();
  for (const list of lists) for (const r of list) byId.set(r.id, r);
  return [...byId.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, limit);
}
