import { getDoc, limit, orderBy, query } from 'firebase/firestore';
import type { AccessRepository, AuditRepository, BoardRepository } from '../../application/ports';
import { toAccess, toAuditEntry, toBoard, toLock } from './mappers';
import { refs } from './paths';
import { watchDoc, watchQuery } from './watch';

/** Lectura pública del tablero: 1 documento + los bloqueos vigentes. */
export const boardRepository: BoardRepository = {
  watchBoard: (raffleId) => watchDoc(refs.board(raffleId), toBoard, {}),
  watchLocks: (raffleId) => watchQuery(refs.locks(raffleId), toLock),
};

export const accessRepository: AccessRepository = {
  watch: (token) => watchDoc(refs.access(token), toAccess, null),

  async findTokenByPinHash(raffleId, pinHash) {
    const snap = await getDoc(refs.lookup(raffleId, pinHash));
    return snap.exists() ? (snap.data().token as string) : null;
  },
};

export const auditRepository: AuditRepository = {
  watchRecent: (raffleId, max) =>
    watchQuery(query(refs.audit(raffleId), orderBy('createdAt', 'desc'), limit(max)), toAuditEntry),
};
