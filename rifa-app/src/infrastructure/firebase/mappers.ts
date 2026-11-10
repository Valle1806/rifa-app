import { Timestamp, type DocumentData, type DocumentSnapshot } from 'firebase/firestore';
import {
  DEFAULT_RESERVATION_HOURS,
  type AuditEntry,
  type Board,
  type BuyerAccess,
  type Order,
  type PaymentSubmission,
  type Raffle,
  type TicketLock,
} from '../../domain';

/** Acepta Timestamp, milisegundos (modelo anterior) o null (serverTimestamp aún sin confirmar). */
export const toMillis = (value: unknown): number => {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === 'number') return value;
  return Date.now();
};

const data = (snap: DocumentSnapshot): DocumentData => snap.data({ serverTimestamps: 'estimate' }) ?? {};

export const toRaffle = (snap: DocumentSnapshot): Raffle => {
  const d = data(snap);
  return {
    id: snap.id,
    title: d.title ?? '',
    description: d.description ?? '',
    price: d.price ?? 0,
    totalTickets: d.totalTickets ?? 0,
    digitCount: d.digitCount ?? 2,
    imageUrl: d.imageUrl || null,
    status: d.status ?? (d.isActive === false ? 'closed' : 'active'),
    reservationHours: d.reservationHours ?? DEFAULT_RESERVATION_HOURS,
    createdAt: toMillis(d.createdAt),
  };
};

export const toBoard = (snap: DocumentSnapshot): Board => (data(snap).tickets as Board | undefined) ?? {};

export const toLock = (snap: DocumentSnapshot): TicketLock => {
  const d = data(snap);
  return { number: snap.id, orderId: d.orderId, createdAt: toMillis(d.createdAt) };
};

export const toOrder = (snap: DocumentSnapshot, raffleId: string): Order => {
  const d = data(snap);
  return {
    id: snap.id,
    raffleId,
    numbers: d.numbers ?? [],
    buyer: d.buyer ?? { name: '', phone: '' },
    advisor: d.advisor ?? null,
    status: d.status,
    payments: d.payments ?? [],
    accessToken: d.accessToken,
    source: d.source,
    createdAt: toMillis(d.createdAt),
    updatedAt: toMillis(d.updatedAt),
  };
};

export const toAccess = (snap: DocumentSnapshot): BuyerAccess => {
  const d = data(snap);
  return {
    token: snap.id,
    raffleId: d.raffleId,
    orderId: d.orderId,
    alias: d.alias,
    numbers: d.numbers ?? [],
    state: d.state,
    total: d.total ?? 0,
    paid: d.paid ?? 0,
    updatedAt: toMillis(d.updatedAt),
  };
};

export const toSubmission = (snap: DocumentSnapshot, raffleId: string): PaymentSubmission => {
  const d = data(snap);
  return {
    id: snap.id,
    raffleId,
    orderId: d.orderId,
    token: d.token,
    amount: d.amount ?? null,
    receiptUrl: d.receiptUrl,
    note: d.note ?? null,
    createdAt: toMillis(d.createdAt),
  };
};

export const toAuditEntry = (snap: DocumentSnapshot): AuditEntry => {
  const d = data(snap);
  return {
    id: snap.id,
    action: d.action,
    orderId: d.orderId ?? null,
    numbers: d.numbers ?? [],
    detail: d.detail ?? '',
    performedBy: d.performedBy,
    createdAt: toMillis(d.createdAt),
  };
};
