import { type DependencyList, type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncState<T> {
  data: T | undefined;
  error: Error | undefined;
  /** True until the first result arrives, and again whenever the dependencies change. */
  loading: boolean;
  /** Re-runs the request, keeping the current data on screen while it loads. */
  reload: () => Promise<void>;
  setData: Dispatch<SetStateAction<T | undefined>>;
}

/** Runs an async function when its dependencies change and tracks loading, data and error. */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const latest = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async (showLoading: boolean) => {
    const id = ++latest.current;
    if (showLoading) setLoading(true);
    try {
      const result = await fnRef.current();
      // Ignore responses that arrive after a newer request has started.
      if (id !== latest.current) return;
      setData(result);
      setError(undefined);
    } catch (caught) {
      if (id !== latest.current) return;
      setError(caught instanceof Error ? caught : new Error('Something went wrong.'));
    } finally {
      if (id === latest.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void run(true);
    return () => {
      latest.current += 1;
    };
    // The caller's dependency list decides when to re-run.
  }, deps);

  const reload = useCallback(() => run(false), [run]);
  return { data, error, loading, reload, setData };
}
