import { useEffect, useState } from 'react';
import type { Watch } from '../../../application/ports';

interface WatchState<T> {
  key: string | null;
  data: T;
  error: Error | null;
}

export interface WatchResult<T> {
  data: T;
  loading: boolean;
  error: Error | null;
}

/**
 * Se suscribe a datos en tiempo real identificados por `key` (por ejemplo el id de la rifa).
 * Con `key = null` no se suscribe. `source` e `initial` deben ser referencias estables.
 */
export const useWatch = <T>(key: string | null, source: (key: string) => Watch<T>, initial: T): WatchResult<T> => {
  const [state, setState] = useState<WatchState<T>>({ key: null, data: initial, error: null });

  useEffect(() => {
    if (key === null) return;
    return source(key)(
      (data) => setState({ key, data, error: null }),
      (error) => setState({ key, data: initial, error }),
    );
  }, [key, source, initial]);

  const ready = key !== null && state.key === key;
  return {
    data: ready ? state.data : initial,
    loading: key !== null && !ready,
    error: ready ? state.error : null,
  };
};
