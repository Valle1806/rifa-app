import {
  doc,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  writeBatch,
  type Transaction,
} from 'firebase/firestore';
import type { AdminContext, NewPayment, OrderRepository, SecureRandom } from '../../application/ports';
import {
  DomainError,
  NumbersUnavailableError,
  findUnavailableNumbers,
  formatMoney,
  summarizeOrder,
  toPublicAlias,
  type AdvisorRef,
  type AuditAction,
  type Order,
  type OrderStatus,
  type Payment,
} from '../../domain';
import { db } from './app';
import { toBoard, toLock, toOrder } from './mappers';
import { refs } from './paths';
import { projectOrder, writeAudit } from './projections';
import { watchQuery } from './watch';

const advisorFields = (ref: AdvisorRef | null) => ({ advisor: ref?.name ?? null, advisorId: ref?.id ?? null });

const readOrder = async (tx: Transaction, ctx: AdminContext, orderId: string, expected?: OrderStatus): Promise<Order> => {
  const snap = await tx.get(refs.order(ctx.raffle.id, orderId));
  if (!snap.exists()) throw new DomainError('NOT_FOUND', 'La orden ya no existe.');
  const order = toOrder(snap, ctx.raffle.id);
  if (expected && order.status !== expected) {
    throw new DomainError('ORDER_NOT_PENDING', 'Otra persona ya cambió esta orden. Recarga la página.');
  }
  return order;
};

/** Lee tablero y bloqueos de los números y falla si alguno está ocupado por otra orden. */
const assertNumbersFree = async (tx: Transaction, ctx: AdminContext, numbers: string[], ownOrderId?: string) => {
  const [boardSnap, ...lockSnaps] = await Promise.all([
    tx.get(refs.board(ctx.raffle.id)),
    ...numbers.map((n) => tx.get(refs.lock(ctx.raffle.id, n))),
  ]);
  const locks = lockSnaps.filter((s) => s.exists()).map(toLock);
  const unavailable = findUnavailableNumbers(
    numbers,
    toBoard(boardSnap),
    locks,
    ctx.raffle.reservationHours,
    Date.now(),
    ownOrderId,
  );
  if (unavailable.length > 0) throw new NumbersUnavailableError(unavailable);
  return locks;
};

export const createOrderRepository = (random: SecureRandom): OrderRepository => {
  const newPayment = (payment: NewPayment): Payment => ({ ...payment, id: random.token(), createdAt: Date.now() });

  /** Aplica un cambio a una orden activa y actualiza sus proyecciones en la misma transacción. */
  const mutateActiveOrder = (
    ctx: AdminContext,
    orderId: string,
    change: (order: Order) => { next: Order; patch: Record<string, unknown>; audit: AuditAction; detail: string },
  ) =>
    runTransaction(db, async (tx) => {
      const order = await readOrder(tx, ctx, orderId, 'active');
      const { next, patch, audit, detail } = change(order);
      tx.update(refs.order(ctx.raffle.id, orderId), { ...patch, updatedAt: serverTimestamp() });
      projectOrder(tx, ctx.raffle, next, order);
      writeAudit(tx, ctx, audit, next, detail);
    });

  return {
    watchAll: (raffleId) =>
      watchQuery(query(refs.orders(raffleId), orderBy('createdAt', 'desc')), (snap) => toOrder(snap, raffleId)),

    /**
     * Solicitud pública en un solo lote atómico: orden pendiente, bloqueos de números,
     * enlace del comprador, búsqueda por PIN y, si lo adjuntó, su comprobante.
     * Las reglas de Firestore validan cada documento contra los demás.
     */
    async submitPublicRequest({ raffle, numbers, buyer, advisor, credentials, proof }) {
      const batch = writeBatch(db);
      const orderRef = doc(refs.orders(raffle.id));
      const now = serverTimestamp();

      batch.set(orderRef, {
        numbers,
        buyer,
        advisor,
        status: 'pending',
        payments: [],
        accessToken: credentials.token,
        source: 'public',
        createdAt: now,
        updatedAt: now,
      });
      numbers.forEach((n) => batch.set(refs.lock(raffle.id, n), { orderId: orderRef.id, createdAt: now }));
      batch.set(refs.access(credentials.token), {
        raffleId: raffle.id,
        orderId: orderRef.id,
        alias: toPublicAlias(buyer.name),
        numbers,
        state: 'pending',
        total: numbers.length * raffle.price,
        paid: 0,
        updatedAt: now,
      });
      batch.set(refs.lookup(raffle.id, credentials.pinHash), { token: credentials.token });
      if (proof) {
        batch.set(doc(refs.submissions(raffle.id)), {
          orderId: orderRef.id,
          token: credentials.token,
          ...proof,
          createdAt: now,
        });
      }
      await batch.commit();
      return orderRef.id;
    },

    createDirect: (ctx, { numbers, buyer, advisor, payment, credentials }) =>
      runTransaction(db, async (tx) => {
        const locks = await assertNumbersFree(tx, ctx, numbers);
        const orderRef = doc(refs.orders(ctx.raffle.id));
        const order: Order = {
          id: orderRef.id,
          raffleId: ctx.raffle.id,
          numbers,
          buyer,
          ...advisorFields(advisor),
          status: 'active',
          payments: payment ? [newPayment(payment)] : [],
          accessToken: credentials.token,
          source: 'admin',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        tx.set(orderRef, {
          numbers,
          buyer,
          ...advisorFields(advisor),
          status: order.status,
          payments: order.payments,
          accessToken: order.accessToken,
          source: order.source,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        tx.set(refs.lookup(ctx.raffle.id, credentials.pinHash), { token: credentials.token });
        locks.forEach((l) => tx.delete(refs.lock(ctx.raffle.id, l.number)));
        projectOrder(tx, ctx.raffle, order);
        writeAudit(tx, ctx, 'order_created', order, `Venta directa a ${buyer.name}`);
        return orderRef.id;
      }),

    approve: (ctx, orderId, advisor) =>
      runTransaction(db, async (tx) => {
        const order = await readOrder(tx, ctx, orderId, 'pending');
        const locks = await assertNumbersFree(tx, ctx, order.numbers, order.id);
        const patch = { status: 'active' as const, ...(advisor !== undefined && advisorFields(advisor)) };
        const next: Order = { ...order, ...patch };
        tx.update(refs.order(ctx.raffle.id, orderId), { ...patch, updatedAt: serverTimestamp() });
        locks.forEach((l) => tx.delete(refs.lock(ctx.raffle.id, l.number)));
        projectOrder(tx, ctx.raffle, next);
        writeAudit(tx, ctx, 'request_approved', next, `Solicitud de ${order.buyer.name} aprobada`);
      }),

    reject: (ctx, orderId) =>
      runTransaction(db, async (tx) => {
        const order = await readOrder(tx, ctx, orderId, 'pending');
        const lockSnaps = await Promise.all(order.numbers.map((n) => tx.get(refs.lock(ctx.raffle.id, n))));
        const next: Order = { ...order, status: 'rejected' };
        tx.update(refs.order(ctx.raffle.id, orderId), { status: 'rejected', updatedAt: serverTimestamp() });
        lockSnaps
          .filter((s) => s.exists() && toLock(s).orderId === orderId)
          .forEach((s) => tx.delete(s.ref));
        projectOrder(tx, ctx.raffle, next);
        writeAudit(tx, ctx, 'request_rejected', next, `Solicitud de ${order.buyer.name} rechazada`);
      }),

    cancel: (ctx, orderId) =>
      mutateActiveOrder(ctx, orderId, (order) => ({
        next: { ...order, status: 'cancelled' },
        patch: { status: 'cancelled' },
        audit: 'order_cancelled',
        detail: `Números liberados de ${order.buyer.name}`,
      })),

    updateDetails: (ctx, orderId, { buyer, advisor }) =>
      mutateActiveOrder(ctx, orderId, (order) => {
        const patch = { buyer, ...(advisor !== undefined && advisorFields(advisor)) };
        return { next: { ...order, ...patch }, patch, audit: 'order_updated', detail: `Datos de ${buyer.name} actualizados` };
      }),

    /**
     * Solo toca el asesor: en la orden y el código en el tablero. No recalcula estados
     * ni el enlace del comprador, así unificar nombres no puede alterar nada de lo vendido.
     */
    assignAdvisor: (ctx, orderId, advisor) =>
      runTransaction(db, async (tx) => {
        const order = await readOrder(tx, ctx, orderId, 'active');
        const board = toBoard(await tx.get(refs.board(ctx.raffle.id)));
        tx.update(refs.order(ctx.raffle.id, orderId), { ...advisorFields(advisor), updatedAt: serverTimestamp() });
        // Solo números que ya están en el tablero: nunca crea una entrada a medias (sin estado ni alias).
        const tickets = Object.fromEntries(order.numbers.filter((n) => board[n]).map((n) => [n, { advisor: advisor.id }]));
        if (Object.keys(tickets).length > 0) {
          tx.set(refs.board(ctx.raffle.id), { tickets, updatedAt: serverTimestamp() }, { merge: true });
        }
        writeAudit(tx, ctx, 'order_updated', order, `Asesor de ${order.buyer.name}: ${advisor.name}`);
      }),

    addPayment: (ctx, orderId, payment) =>
      mutateActiveOrder(ctx, orderId, (order) => {
        const payments = [...order.payments, newPayment(payment)];
        const { balance } = summarizeOrder({ ...order, payments }, ctx.raffle.price);
        return {
          next: { ...order, payments },
          patch: { payments },
          audit: 'payment_added',
          detail: `Pago de ${formatMoney(payment.amount)} · saldo ${formatMoney(balance)}`,
        };
      }),

    removePayment: (ctx, orderId, paymentId) =>
      mutateActiveOrder(ctx, orderId, (order) => {
        const removed = order.payments.find((p) => p.id === paymentId);
        const payments = order.payments.filter((p) => p.id !== paymentId);
        return {
          next: { ...order, payments },
          patch: { payments },
          audit: 'payment_removed',
          detail: `Pago de ${formatMoney(removed?.amount ?? 0)} eliminado`,
        };
      }),
  };
};
