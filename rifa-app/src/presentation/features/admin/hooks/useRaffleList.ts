import { useCallback, useEffect, useState } from 'react';
import type { Raffle } from '../../../../domain';
import { useServices } from '../../../shared/services';
import { useToast } from '../../../shared/toast';

/** Lista de rifas del admin; `reload` tras crear, editar o borrar. */
export const useRaffleList = () => {
  const { admin } = useServices();
  const toast = useToast();
  const [state, setState] = useState<{ raffles: Raffle[]; loaded: boolean }>({ raffles: [], loaded: false });

  const load = useCallback(
    () =>
      admin
        .listRaffles()
        .then((raffles) => setState({ raffles, loaded: true }))
        .catch((error) => {
          toast.error(error);
          setState((s) => ({ ...s, loaded: true }));
        }),
    [admin, toast],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, reload: load };
};
