import { useCallback, useState } from 'react';
import { useToast } from '../toast';

/**
 * Ejecuta una acción asíncrona con estado de carga y aviso de éxito o error.
 * Devuelve el resultado, o `undefined` si falló (el error ya se mostró).
 */
export const useAsyncAction = () => {
  const toast = useToast();
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async <T>(action: () => Promise<T>, successMessage?: string): Promise<T | undefined> => {
      setPending(true);
      try {
        const result = await action();
        if (successMessage) toast.success(successMessage);
        return result;
      } catch (error) {
        toast.error(error);
        return undefined;
      } finally {
        setPending(false);
      }
    },
    [toast],
  );

  return { pending, run };
};
