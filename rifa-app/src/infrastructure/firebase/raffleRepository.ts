import {
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type CollectionReference,
  type DocumentReference,
} from 'firebase/firestore';
import type { RaffleRepository } from '../../application/ports';
import { isRaffleOpen, type Raffle } from '../../domain';
import { db } from './app';
import { commitInChunks } from './batch';
import { toRaffle } from './mappers';
import { refs } from './paths';
import { watchDoc } from './watch';

const newestFirst = (a: Raffle, b: Raffle) => b.createdAt - a.createdAt;

const listRefs = async (col: CollectionReference): Promise<DocumentReference[]> =>
  (await getDocs(col)).docs.map((d) => d.ref);

/**
 * Documentos que cuelgan de una rifa, incluidos los del modelo anterior.
 * El historial (audit) se conserva a propósito: las reglas lo hacen inmutable.
 */
const collectRaffleDocs = async (raffleId: string): Promise<DocumentReference[]> => {
  const subcollections = [
    refs.publicCol(raffleId),
    refs.locks(raffleId),
    refs.orders(raffleId),
    refs.submissions(raffleId),
    refs.lookups(raffleId),
  ];
  const [nested, legacyTickets, access] = await Promise.all([
    Promise.all(subcollections.map(listRefs)).then((lists) => lists.flat()),
    listRefs(refs.legacyTickets(raffleId)),
    getDocs(query(refs.accessCol(), where('raffleId', '==', raffleId))).then((s) => s.docs.map((d) => d.ref)),
  ]);
  const legacyPrivate = legacyTickets.map((t) => refs.legacyPrivate(raffleId, t.id));
  return [...nested, ...legacyPrivate, ...legacyTickets, ...access];
};

export const raffleRepository: RaffleRepository = {
  async listAll() {
    const snap = await getDocs(refs.raffles());
    return snap.docs.map(toRaffle).sort(newestFirst);
  },

  async findLatestActive() {
    const raffles = await this.listAll();
    return raffles.find(isRaffleOpen) ?? null;
  },

  watch: (raffleId) => watchDoc(refs.raffle(raffleId), toRaffle, null),

  async create(draft) {
    const raffleRef = doc(refs.raffles());
    const batch = writeBatch(db);
    batch.set(raffleRef, { ...draft, status: 'active', createdAt: serverTimestamp() });
    batch.set(refs.board(raffleRef.id), { tickets: {}, updatedAt: serverTimestamp() });
    await batch.commit();
    return raffleRef.id;
  },

  update: (raffleId, patch) => updateDoc(refs.raffle(raffleId), patch),

  async remove(raffleId) {
    const docs = await collectRaffleDocs(raffleId);
    await commitInChunks(docs, 1, (batch, ref) => batch.delete(ref));
    await deleteDoc(refs.raffle(raffleId));
  },
};
