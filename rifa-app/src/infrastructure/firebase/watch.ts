import {
  onSnapshot,
  type DocumentReference,
  type DocumentSnapshot,
  type Query,
} from 'firebase/firestore';
import type { Watch } from '../../application/ports';

/** Adapta onSnapshot de un documento al contrato `Watch` de la aplicación. */
export const watchDoc =
  <T>(ref: DocumentReference, map: (snap: DocumentSnapshot) => T, fallback: T): Watch<T> =>
  (onNext, onError) =>
    onSnapshot(ref, (snap) => onNext(snap.exists() ? map(snap) : fallback), onError);

/** Adapta onSnapshot de una consulta al contrato `Watch` de la aplicación. */
export const watchQuery =
  <T>(query: Query, map: (snap: DocumentSnapshot) => T): Watch<T[]> =>
  (onNext, onError) =>
    onSnapshot(query, (snap) => onNext(snap.docs.map(map)), onError);
