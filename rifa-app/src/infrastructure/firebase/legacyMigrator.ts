import { doc, getDoc, getDocs, limit, query, serverTimestamp, writeBatch, type DocumentData } from 'firebase/firestore';
import type { AdminContext, LegacyMigrator, SecureRandom } from '../../application/ports';
import { DEFAULT_RESERVATION_HOURS, normalizeName, normalizePhone, type Order, type Payment } from '../../domain';
import { db } from './app';
import { commitInChunks } from './batch';
import { toMillis } from './mappers';
import { refs } from './paths';
import { projectOrder, writeAudit } from './projections';

type LegacyStatus = 'disponible' | 'reservado' | 'pagado_transferencia' | 'pagado_efectivo';

interface MigratedItem {
  order: Order;
  pendingReceipt: string | null;
}

/**
 * Convierte el modelo anterior (un documento público por número, con nombre y
 * comprobante expuestos) al modelo nuevo de órdenes, y borra los documentos viejos.
 */
export const createLegacyMigrator = (random: SecureRandom): LegacyMigrator => {
  const toItem = (raffleId: string, price: number, id: string, ticket: DocumentData, priv: DocumentData): MigratedItem => {
    const status = ticket.status as LegacyStatus;
    const receiptUrl: string | null = priv.receiptUrl || ticket.receiptUrl || null;
    const isPaid = status.startsWith('pagado');
    const payments: Payment[] = isPaid
      ? [
          {
            id: random.token(),
            amount: price,
            method: status === 'pagado_efectivo' ? 'cash' : 'transfer',
            receiptUrl,
            source: 'admin',
            createdAt: toMillis(ticket.updatedAt),
          },
        ]
      : [];
    const createdAt = toMillis(priv.reservedAt ?? ticket.updatedAt);
    return {
      order: {
        id: doc(refs.orders(raffleId)).id,
        raffleId,
        numbers: [id],
        buyer: {
          name: normalizeName(priv.buyerName || ticket.buyerName || '') || 'Sin nombre',
          phone: normalizePhone(priv.buyerPhone || ''),
        },
        advisor: ticket.advisor || null,
        status: 'active',
        payments,
        accessToken: random.token(),
        source: 'admin',
        createdAt,
        updatedAt: createdAt,
      },
      pendingReceipt: !isPaid && receiptUrl ? receiptUrl : null,
    };
  };

  return {
    async hasLegacyData(raffleId) {
      const snap = await getDocs(query(refs.legacyTickets(raffleId), limit(1)));
      return !snap.empty;
    },

    async migrate(ctx: AdminContext) {
      const { raffle } = ctx;
      const tickets = (await getDocs(refs.legacyTickets(raffle.id))).docs;
      const sold = tickets.filter((t) => t.data().status !== 'disponible');
      const privates = await Promise.all(sold.map((t) => getDoc(refs.legacyPrivate(raffle.id, t.id))));
      const items = sold.map((t, i) => toItem(raffle.id, raffle.price, t.id, t.data(), privates[i].data() ?? {}));

      // orden + tablero + enlace + comprobante pendiente
      await commitInChunks(items, 4, (batch, { order, pendingReceipt }) => {
        batch.set(refs.order(raffle.id, order.id), {
          numbers: order.numbers,
          buyer: order.buyer,
          advisor: order.advisor,
          status: order.status,
          payments: order.payments,
          accessToken: order.accessToken,
          source: order.source,
          createdAt: new Date(order.createdAt),
          updatedAt: serverTimestamp(),
        });
        projectOrder(batch, raffle, order);
        if (pendingReceipt) {
          batch.set(doc(refs.submissions(raffle.id)), {
            orderId: order.id,
            token: order.accessToken,
            amount: null,
            receiptUrl: pendingReceipt,
            note: 'Comprobante del sistema anterior',
            createdAt: serverTimestamp(),
          });
        }
      });

      const finish = writeBatch(db);
      finish.set(refs.board(raffle.id), { updatedAt: serverTimestamp() }, { merge: true });
      finish.update(refs.raffle(raffle.id), {
        status: raffle.status,
        reservationHours: raffle.reservationHours || DEFAULT_RESERVATION_HOURS,
      });
      writeAudit(finish, ctx, 'legacy_migrated', null, `${items.length} números vendidos migrados al nuevo modelo`);
      await finish.commit();

      await commitInChunks(tickets, 2, (batch, t) => {
        batch.delete(refs.legacyPrivate(raffle.id, t.id));
        batch.delete(t.ref);
      });
      return items.length;
    },
  };
};
