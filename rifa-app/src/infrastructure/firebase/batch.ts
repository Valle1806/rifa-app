import { writeBatch, type WriteBatch } from 'firebase/firestore';
import { db } from './app';

/** Firestore admite 500 operaciones por lote; se deja margen. */
const MAX_OPS = 450;

/**
 * Ejecuta operaciones en lotes sucesivos sin superar el límite de Firestore.
 * Cada operación declara cuántas escrituras ocupa.
 */
export const commitInChunks = async <T>(
  items: T[],
  opsPerItem: number,
  write: (batch: WriteBatch, item: T) => void,
): Promise<void> => {
  const perBatch = Math.max(1, Math.floor(MAX_OPS / opsPerItem));
  for (let i = 0; i < items.length; i += perBatch) {
    const batch = writeBatch(db);
    items.slice(i, i + perBatch).forEach((item) => write(batch, item));
    await batch.commit();
  }
};
