import { collection, doc } from 'firebase/firestore';
import { db } from './app';

/** Única fuente de verdad de las rutas de Firestore (deben coincidir con firestore.rules). */
export const refs = {
  raffles: () => collection(db, 'raffles'),
  raffle: (raffleId: string) => doc(db, 'raffles', raffleId),
  board: (raffleId: string) => doc(db, 'raffles', raffleId, 'public', 'board'),
  publicCol: (raffleId: string) => collection(db, 'raffles', raffleId, 'public'),
  locks: (raffleId: string) => collection(db, 'raffles', raffleId, 'locks'),
  lock: (raffleId: string, number: string) => doc(db, 'raffles', raffleId, 'locks', number),
  orders: (raffleId: string) => collection(db, 'raffles', raffleId, 'orders'),
  order: (raffleId: string, orderId: string) => doc(db, 'raffles', raffleId, 'orders', orderId),
  submissions: (raffleId: string) => collection(db, 'raffles', raffleId, 'submissions'),
  submission: (raffleId: string, id: string) => doc(db, 'raffles', raffleId, 'submissions', id),
  lookups: (raffleId: string) => collection(db, 'raffles', raffleId, 'lookups'),
  lookup: (raffleId: string, pinHash: string) => doc(db, 'raffles', raffleId, 'lookups', pinHash),
  audit: (raffleId: string) => collection(db, 'raffles', raffleId, 'audit'),
  accessCol: () => collection(db, 'access'),
  access: (token: string) => doc(db, 'access', token),
  user: (uid: string) => doc(db, 'users', uid),
  /** Modelo anterior: un documento por número, con los datos privados en una subcolección. */
  legacyTickets: (raffleId: string) => collection(db, 'raffles', raffleId, 'tickets'),
  legacyPrivate: (raffleId: string, ticketId: string) =>
    doc(db, 'raffles', raffleId, 'tickets', ticketId, 'private', 'data'),
};
