import { useMemo } from 'react';
import type { Availability } from '../../../application/useCases';
import { buildTicketViews, countTicketStates, type Board, type TicketLock } from '../../../domain';
import { useNow } from '../../shared/hooks/useNow';
import { useWatch } from '../../shared/hooks/useWatch';
import { useServices } from '../../shared/services';

const EMPTY_BOARD: Board = {};
const NO_LOCKS: TicketLock[] = [];

/**
 * Rifa + tablero + bloqueos en tiempo real, combinados en la vista de cada número.
 * Cuesta 2 lecturas más una por número en revisión, sin importar cuántos números tenga la rifa.
 */
export const useRaffleBoard = (raffleId: string | null) => {
  const { raffles, board } = useServices();
  const raffle = useWatch(raffleId, raffles.watch, null);
  const boardState = useWatch(raffleId, board.watchBoard, EMPTY_BOARD);
  const locks = useWatch(raffleId, board.watchLocks, NO_LOCKS);
  const now = useNow();

  const views = useMemo(
    () => (raffle.data ? buildTicketViews(raffle.data, boardState.data, locks.data, now) : []),
    [raffle.data, boardState.data, locks.data, now],
  );
  const counts = useMemo(() => countTicketStates(views), [views]);
  const availability = useMemo<Availability>(
    () => ({ board: boardState.data, locks: locks.data }),
    [boardState.data, locks.data],
  );

  return {
    raffle: raffle.data,
    views,
    counts,
    availability,
    loading: raffle.loading || boardState.loading || locks.loading,
    error: raffle.error ?? boardState.error ?? locks.error,
  };
};
