import { useQuery } from '@tanstack/react-query';
import { getDoc } from 'firebase/firestore';
import { decodeItemStats, type ItemStatsMap } from '@/lib/catalog';
import { paths } from '@/lib/firebase';

/** null when there is nothing to show: the server hasn't run yet, or the read failed. Discover works without it. */
async function loadItemStats(): Promise<ItemStatsMap | null> {
  try {
    const snap = await getDoc(paths.itemStats());
    return snap.exists() ? decodeItemStats(snap.data()) : null;
  } catch {
    return null;
  }
}

/** Read once per visit: the server rewrites the document only once an hour. */
export function useItemStats() {
  return useQuery({ queryKey: ['itemStats'], queryFn: loadItemStats, staleTime: Infinity, gcTime: Infinity, retry: false });
}
