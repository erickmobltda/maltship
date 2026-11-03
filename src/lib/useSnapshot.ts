import * as React from 'react';
import { onSnapshot, type DocumentData, type Query } from 'firebase/firestore';

/** Live query results; `query` must be memoised by the caller (null = no query). */
export function useSnapshot<T>(query: Query<DocumentData> | null): { data: (T & { id: string })[]; loading: boolean } {
  const [state, setState] = React.useState<{ data: (T & { id: string })[]; loading: boolean }>({ data: [], loading: !!query });

  React.useEffect(() => {
    if (!query) {
      setState({ data: [], loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    return onSnapshot(
      query,
      (snap) => setState({ data: snap.docs.map((d) => ({ ...(d.data() as T), id: d.id })), loading: false }),
      () => setState({ data: [], loading: false }),
    );
  }, [query]);

  return state;
}

/** Several live queries at once (e.g. one per chunk of 30 uids); `queries` must be memoised. */
export function useSnapshots<T>(queries: Query<DocumentData>[]): { data: (T & { id: string })[][]; loading: boolean } {
  const [state, setState] = React.useState<{ data: (T & { id: string })[][]; loading: boolean }>({ data: [], loading: queries.length > 0 });
  const latest = React.useRef(state.data);
  latest.current = state.data;

  React.useEffect(() => {
    if (!queries.length) {
      setState({ data: [], loading: false });
      return;
    }
    // Keep what is on screen until each new query answers (a longer list shouldn't blink).
    const results: (T & { id: string })[][] = queries.map((_, i) => latest.current[i] ?? []);
    const ready = new Set<number>();
    setState((s) => ({ ...s, loading: true }));
    const unsubs = queries.map((q, i) =>
      onSnapshot(
        q,
        (snap) => {
          results[i] = snap.docs.map((d) => ({ ...(d.data() as T), id: d.id }));
          ready.add(i);
          setState({ data: [...results], loading: ready.size < queries.length });
        },
        () => {
          ready.add(i);
          setState({ data: [...results], loading: ready.size < queries.length });
        },
      ),
    );
    return () => unsubs.forEach((u) => u());
  }, [queries]);

  return state;
}
