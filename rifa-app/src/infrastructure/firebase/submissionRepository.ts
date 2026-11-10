import { doc, orderBy, query, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import type { SecureRandom, SubmissionRepository } from '../../application/ports';
import { DomainError, formatMoney, summarizeOrder, type Order } from '../../domain';
import { db } from './app';
import { toOrder, toSubmission } from './mappers';
import { refs } from './paths';
import { projectOrder, writeAudit } from './projections';
import { watchQuery } from './watch';

export const createSubmissionRepository = (random: SecureRandom): SubmissionRepository => ({
  submit: (access, proof) =>
    setDoc(doc(refs.submissions(access.raffleId)), {
      orderId: access.orderId,
      token: access.token,
      ...proof,
      createdAt: serverTimestamp(),
    }),

  watchAll: (raffleId) =>
    watchQuery(query(refs.submissions(raffleId), orderBy('createdAt', 'asc')), (snap) => toSubmission(snap, raffleId)),

  approve: (ctx, submissionId, amount) =>
    runTransaction(db, async (tx) => {
      const subRef = refs.submission(ctx.raffle.id, submissionId);
      const subSnap = await tx.get(subRef);
      if (!subSnap.exists()) throw new DomainError('NOT_FOUND', 'Este comprobante ya fue revisado.');
      const submission = toSubmission(subSnap, ctx.raffle.id);

      const orderSnap = await tx.get(refs.order(ctx.raffle.id, submission.orderId));
      if (!orderSnap.exists()) throw new DomainError('NOT_FOUND', 'La orden de este comprobante ya no existe.');
      const order = toOrder(orderSnap, ctx.raffle.id);
      if (order.status !== 'active') {
        throw new DomainError('ORDER_NOT_PENDING', 'Aprueba primero la solicitud de números de este comprador.');
      }

      const payments = [
        ...order.payments,
        {
          id: random.token(),
          amount,
          method: 'transfer' as const,
          receiptUrl: submission.receiptUrl,
          source: 'buyer' as const,
          createdAt: Date.now(),
        },
      ];
      const next: Order = { ...order, payments };
      const { balance } = summarizeOrder(next, ctx.raffle.price);

      tx.update(orderSnap.ref, { payments, updatedAt: serverTimestamp() });
      tx.delete(subRef);
      projectOrder(tx, ctx.raffle, next, order);
      writeAudit(tx, ctx, 'submission_approved', next, `Comprobante de ${formatMoney(amount)} aprobado · saldo ${formatMoney(balance)}`);
    }),

  reject: (ctx, submissionId) =>
    runTransaction(db, async (tx) => {
      const subRef = refs.submission(ctx.raffle.id, submissionId);
      const subSnap = await tx.get(subRef);
      if (!subSnap.exists()) return;
      const { orderId } = toSubmission(subSnap, ctx.raffle.id);
      tx.delete(subRef);
      writeAudit(tx, ctx, 'submission_rejected', { id: orderId, numbers: [] }, 'Comprobante rechazado');
    }),
});
