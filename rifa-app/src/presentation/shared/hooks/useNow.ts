import { useEffect, useState } from 'react';

/** Hora actual que se refresca cada cierto tiempo (para vencer bloqueos sin recargar). */
export const useNow = (intervalMs = 60_000): number => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
};
