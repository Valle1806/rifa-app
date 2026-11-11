import type { RaffleResult } from './result';

export type RaffleStatus = 'active' | 'closed';

export interface Raffle {
  id: string;
  title: string;
  description: string;
  price: number;
  totalTickets: number;
  digitCount: number;
  imageUrl: string | null;
  status: RaffleStatus;
  /** Horas que un número queda "en revisión" mientras el admin aprueba la solicitud. */
  reservationHours: number;
  createdAt: number;
  /** Se llena cuando el admin publica el número ganador. */
  result: RaffleResult | null;
}

export type RaffleDraft = Omit<Raffle, 'id' | 'createdAt' | 'status' | 'result'>;

export const DIGIT_COUNTS = [2, 3, 4] as const;
export const DEFAULT_RESERVATION_HOURS = 24;
export const MAX_NUMBERS_PER_REQUEST = 20;

export const maxTicketsFor = (digitCount: number): number => 10 ** digitCount;

export const formatTicketNumber = (value: number, digitCount: number): string =>
  value.toString().padStart(digitCount, '0');

export const listTicketNumbers = (raffle: Pick<Raffle, 'totalTickets' | 'digitCount'>): string[] =>
  Array.from({ length: raffle.totalTickets }, (_, i) => formatTicketNumber(i, raffle.digitCount));

export const isValidTicketNumber = (
  raffle: Pick<Raffle, 'totalTickets' | 'digitCount'>,
  number: string,
): boolean =>
  number.length === raffle.digitCount && /^\d+$/.test(number) && Number(number) < raffle.totalTickets;

export const isRaffleOpen = (raffle: Pick<Raffle, 'status'>): boolean => raffle.status === 'active';
