import type { PaymentLevel } from './order';
import { listTicketNumbers, type Raffle } from './raffle';

export type TicketState = 'available' | 'pending' | PaymentLevel;

/** Lo que el público ve de un número vendido (documento "board"). */
export interface BoardEntry {
  state: PaymentLevel;
  alias: string;
  /** Código del asesor que vendió el número, si se conoce. */
  advisor?: string;
}

export type Board = Record<string, BoardEntry>;

/** Bloqueo temporal de un número mientras el admin revisa la solicitud. */
export interface TicketLock {
  number: string;
  orderId: string;
  createdAt: number;
}

export interface TicketView {
  number: string;
  state: TicketState;
  alias: string | null;
}

const HOUR_MS = 3_600_000;

export const isLockActive = (lock: TicketLock, reservationHours: number, now: number): boolean =>
  now - lock.createdAt < reservationHours * HOUR_MS;

const activeLocksByNumber = (locks: TicketLock[], reservationHours: number, now: number) =>
  new Map(locks.filter((l) => isLockActive(l, reservationHours, now)).map((l) => [l.number, l]));

export const buildTicketViews = (
  raffle: Pick<Raffle, 'totalTickets' | 'digitCount' | 'reservationHours'>,
  board: Board,
  locks: TicketLock[],
  now: number,
): TicketView[] => {
  const activeLocks = activeLocksByNumber(locks, raffle.reservationHours, now);
  return listTicketNumbers(raffle).map((number) => {
    const entry = board[number];
    if (entry) return { number, state: entry.state, alias: entry.alias };
    if (activeLocks.has(number)) return { number, state: 'pending', alias: null };
    return { number, state: 'available', alias: null };
  });
};

/**
 * Números que no puede tomar una orden: ya vendidos o bloqueados por otra solicitud vigente.
 * `ownOrderId` permite que una solicitud pase sus propios bloqueos al ser aprobada.
 */
export const findUnavailableNumbers = (
  numbers: string[],
  board: Board,
  locks: TicketLock[],
  reservationHours: number,
  now: number,
  ownOrderId?: string,
): string[] => {
  const activeLocks = activeLocksByNumber(locks, reservationHours, now);
  return numbers.filter((n) => {
    if (board[n]) return true;
    const lock = activeLocks.get(n);
    return lock !== undefined && lock.orderId !== ownOrderId;
  });
};

export type TicketCounts = Record<TicketState, number>;

export const countTicketStates = (views: TicketView[]): TicketCounts =>
  views.reduce<TicketCounts>(
    (acc, v) => ({ ...acc, [v.state]: acc[v.state] + 1 }),
    { available: 0, pending: 0, reserved: 0, partial: 0, paid: 0 },
  );
