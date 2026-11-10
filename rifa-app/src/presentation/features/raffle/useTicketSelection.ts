import { useCallback, useMemo, useState } from 'react';

/** Selección de números con límite; devuelve el conjunto y la lista ordenada. */
export const useTicketSelection = (max: number) => {
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());

  const toggle = useCallback(
    (number: string) =>
      setSelected((current) => {
        const next = new Set(current);
        if (next.has(number)) next.delete(number);
        else if (next.size < max) next.add(number);
        return next;
      }),
    [max],
  );

  const clear = useCallback(() => setSelected(new Set()), []);
  const numbers = useMemo(() => [...selected].sort(), [selected]);

  return { selected, numbers, toggle, clear, isFull: selected.size >= max };
};
