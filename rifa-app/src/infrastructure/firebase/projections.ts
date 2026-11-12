import {
  deleteField,
  doc,
  serverTimestamp,
  type DocumentData,
  type DocumentReference,
  type SetOptions,
} from 'firebase/firestore';
import type { AdminContext } from '../../application/ports';
import {
  deriveAccessState,
  isOrderHoldingNumbers,
  summarizeOrder,
  toPublicAlias,
  type AuditAction,
  type Order,
  type Raffle,
} from '../../domain';
import { refs } from './paths';

/** Lo que comparten Transaction y WriteBatch, para reutilizar las proyecciones en ambos. */
export interface Writer {
  set(ref: DocumentReference, data: DocumentData, options: SetOptions): unknown;
  set(ref: DocumentReference, data: DocumentData): unknown;
}

/**
 * Mantiene sincronizadas las vistas derivadas de una orden: el tablero público
 * (estado + alias + código del asesor por número) y el enlace del comprador. Se llama dentro de la misma
 * transacción que modifica la orden, para que nunca queden desalineadas.
 */
export const projectOrder = (writer: Writer, raffle: Raffle, order: Order, previous?: Order): void => {
  const alias = toPublicAlias(order.buyer.name);
  const summary = summarizeOrder(order, raffle.price);

  const tickets: Record<string, unknown> = {};
  if (previous && isOrderHoldingNumbers(previous)) {
    previous.numbers.forEach((n) => (tickets[n] = deleteField()));
  }
  if (isOrderHoldingNumbers(order)) {
    const advisor = order.advisorId ?? deleteField();
    order.numbers.forEach((n) => (tickets[n] = { state: summary.level, alias, advisor }));
  }
  if (Object.keys(tickets).length > 0) {
    writer.set(refs.board(raffle.id), { tickets, updatedAt: serverTimestamp() }, { merge: true });
  }

  writer.set(
    refs.access(order.accessToken),
    {
      raffleId: raffle.id,
      orderId: order.id,
      alias,
      numbers: order.numbers,
      state: deriveAccessState(order, raffle.price),
      total: summary.total,
      paid: summary.paid,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

export const writeAudit = (
  writer: Writer,
  ctx: AdminContext,
  action: AuditAction,
  order: Pick<Order, 'id' | 'numbers'> | null,
  detail: string,
): void => {
  writer.set(doc(refs.audit(ctx.raffle.id)), {
    action,
    orderId: order?.id ?? null,
    numbers: order?.numbers ?? [],
    detail,
    performedBy: ctx.actor,
    createdAt: serverTimestamp(),
  });
};
