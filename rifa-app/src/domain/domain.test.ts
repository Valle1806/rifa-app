import { describe, expect, it } from 'vitest';
import {
  buildTicketViews,
  countTicketStates,
  deriveAccessState,
  findUnavailableNumbers,
  isValidPhone,
  isValidTicketNumber,
  listTicketNumbers,
  normalizePhone,
  paymentLevel,
  summarizeOrder,
  toPublicAlias,
  type Board,
  type TicketLock,
} from './index';

const HOUR = 3_600_000;
const raffle = { totalTickets: 100, digitCount: 2, reservationHours: 24 };

describe('buyer', () => {
  it('abrevia el nombre público', () => {
    expect(toPublicAlias('  carlos   mario pérez ')).toBe('carlos P.');
    expect(toPublicAlias('Ana')).toBe('Ana');
    expect(toPublicAlias('')).toBe('');
  });

  it('normaliza y valida celulares colombianos', () => {
    expect(normalizePhone('+57 310-123-4567')).toBe('3101234567');
    expect(isValidPhone('310 123 4567')).toBe(true);
    expect(isValidPhone('12345')).toBe(false);
  });
});

describe('raffle', () => {
  it('genera los números con ceros a la izquierda', () => {
    expect(listTicketNumbers({ totalTickets: 3, digitCount: 3 })).toEqual(['000', '001', '002']);
  });

  it('valida el rango y el formato', () => {
    expect(isValidTicketNumber(raffle, '07')).toBe(true);
    expect(isValidTicketNumber(raffle, '7')).toBe(false);
    expect(isValidTicketNumber({ totalTickets: 50, digitCount: 2 }, '60')).toBe(false);
  });
});

describe('order', () => {
  it('calcula el nivel de pago', () => {
    expect(paymentLevel(0, 100)).toBe('reserved');
    expect(paymentLevel(40, 100)).toBe('partial');
    expect(paymentLevel(100, 100)).toBe('paid');
  });

  it('resume total, abonado y saldo', () => {
    const summary = summarizeOrder({ numbers: ['01', '02'], payments: [{ amount: 30 } as never, { amount: 20 } as never] }, 50);
    expect(summary).toEqual({ total: 100, paid: 50, balance: 50, level: 'partial' });
  });

  it('deriva el estado del enlace del comprador', () => {
    expect(deriveAccessState({ status: 'pending', numbers: ['01'], payments: [] }, 10)).toBe('pending');
    expect(deriveAccessState({ status: 'active', numbers: ['01'], payments: [] }, 10)).toBe('reserved');
  });
});

describe('ticket', () => {
  const now = 10 * HOUR;
  const board: Board = { '01': { state: 'paid', alias: 'Ana' } };
  const locks: TicketLock[] = [
    { number: '02', orderId: 'a', createdAt: now - HOUR },
    { number: '03', orderId: 'b', createdAt: now - 30 * HOUR },
  ];

  it('combina tablero y bloqueos vigentes', () => {
    const views = buildTicketViews(raffle, board, locks, now);
    expect(views[1]).toEqual({ number: '01', state: 'paid', alias: 'Ana' });
    expect(views[2].state).toBe('pending');
    expect(views[3].state).toBe('available');
    expect(countTicketStates(views)).toMatchObject({ paid: 1, pending: 1, available: 98 });
  });

  it('detecta números no disponibles respetando los bloqueos propios', () => {
    expect(findUnavailableNumbers(['01', '02', '03'], board, locks, 24, now)).toEqual(['01', '02']);
    expect(findUnavailableNumbers(['02'], board, locks, 24, now, 'a')).toEqual([]);
  });
});
