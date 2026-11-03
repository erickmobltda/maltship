import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export const PAGE_SIZE = 48;
export const LIST_GRID = 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3';

// Per history entry, so coming back from an item finds the list as long as it was and the browser can restore the scroll.
const remembered = new Map<string, number>();

function useRememberedCount(name: string) {
  const { key } = useLocation();
  const id = `${key}:${name}`;
  const [count, setCount] = React.useState(() => remembered.get(id) ?? PAGE_SIZE);
  React.useEffect(() => {
    remembered.set(id, count);
  }, [id, count]);
  return [count, setCount] as const;
}

/** A growing `limit()` for a Firestore list. There may be more while a full page keeps coming back. */
export function usePageLimit(name: string) {
  const [limit, setLimit] = useRememberedCount(`limit:${name}`);
  const grow = React.useCallback(() => setLimit((n) => n + PAGE_SIZE), [setLimit]);
  return { limit, moreIf: (loaded: number) => (loaded >= limit ? grow : undefined) };
}

interface Props<T> {
  /** Tells apart the lists of one page (its tabs). */
  name?: string;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  className?: string;
  /** Back to the first page when this changes (e.g. a new search). */
  resetKey?: string;
  /** Asks Firestore for more, once every loaded item is on screen. */
  more?: () => void;
  loading?: boolean;
}

/** Shows PAGE_SIZE items and adds the next ones when the end of the list comes near. */
export function InfiniteList<T>({ name = 'list', items, renderItem, className = LIST_GRID, resetKey, more, loading }: Props<T>) {
  const [shown, setShown] = useRememberedCount(`shown:${name}`);
  const [lastReset, setLastReset] = React.useState(resetKey);
  if (resetKey !== lastReset) {
    setLastReset(resetKey);
    setShown(PAGE_SIZE);
  }

  const end = React.useRef<HTMLDivElement>(null);
  const hasLocal = shown < items.length;
  const hasNext = hasLocal || !!more;
  // Watching again after each page also covers an end that is still in view.
  React.useEffect(() => {
    if (!hasNext || loading || !end.current) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        if (hasLocal) setShown((n) => n + PAGE_SIZE);
        else more?.();
      },
      { rootMargin: '600px' },
    );
    io.observe(end.current);
    return () => io.disconnect();
  }, [hasNext, hasLocal, loading, more, shown, items.length, setShown]);

  return (
    <>
      <div className={className}>{items.slice(0, shown).map(renderItem)}</div>
      {hasNext ? <div ref={end} className="h-px" aria-hidden /> : null}
      {loading && items.length ? <Skeleton className="mt-3 h-24 rounded-xl" /> : null}
    </>
  );
}
