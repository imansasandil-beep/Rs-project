import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../lib/api.js';

/**
 * Fetches `path` and re-fetches whenever `deps` change.
 *
 * Requests are aborted on unmount and superseded by newer ones, so a slow
 * response for last month's data can never overwrite this month's.
 *
 * @returns {{data: any, error: Error|null, loading: boolean, refresh: () => void}}
 */
export function useApi(path, { query, deps = [], skip = false } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: !skip });
  const [nonce, setNonce] = useState(0);

  // Serialized so a fresh object literal each render does not loop forever.
  const queryKey = JSON.stringify(query ?? null);
  const latest = useRef(0);

  useEffect(() => {
    if (skip) {
      setState({ data: null, error: null, loading: false });
      return;
    }

    const controller = new AbortController();
    const requestId = ++latest.current;

    setState((previous) => ({ ...previous, loading: true }));

    api
      .get(path, { query: query ?? undefined, signal: controller.signal })
      .then((data) => {
        if (requestId === latest.current) setState({ data, error: null, loading: false });
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        if (requestId === latest.current) setState({ data: null, error, loading: false });
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, queryKey, nonce, skip, ...deps]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  return { ...state, refresh };
}

/**
 * Wraps a write so a form can render pending and error state without each one
 * re-implementing the same three useStates.
 */
export function useMutation(mutate) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(
    async (...args) => {
      setPending(true);
      setError(null);
      try {
        return await mutate(...args);
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setPending(false);
      }
    },
    [mutate]
  );

  return { run, pending, error, reset: () => setError(null) };
}
