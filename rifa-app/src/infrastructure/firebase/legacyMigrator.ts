import { doc, getDoc, getDocs, limit, query, serverTimestamp, writeBatch, type QueryDocumentSnapshot } from 'firebase/firestore';
import type { AdminContext, LegacyMigrator, SecureRandom } from '../../application/ports';
import { DEFAULT_RESERVATION_HOURS, type Order } from '../../domain';
import { db } from './app';
import { commitInChunks } from './batch';
import { groupLegacyTickets, type LegacyGroup, type LegacyTicket } from './legacyGrouping';
import { toMillis } from './mappers';
import { refs } from './paths';
import { projectOrder, writeAudit } from './projections';

interface MigratedItem {
  order: Order;
  group: LegacyGroup;
  /** La orden ya existía (ejecución anterior interrumpida): no se repiten sus comprobantes. */
  existed: boolean;
}

/** Escrituras fijas por orden: la orden, el tablero y el enlace del comprador. */
const BASE_OPS_PER_ORDER = 3;

/**
 * Convierte el modelo anterior (un documento público por número, con nombre y
 * comprobante expuestos) al modelo nuevo de órdenes, y borra los documentos viejos.
 *
 * Crea una orden por comprador (agrupando por celular) con un id derivado del
 * comprador, así que si se interrumpe se puede volver a ejecutar sin duplicar nada.
 */
export const createLegacyMigrator = (random: SecureRandom): LegacyMigrator => {
  const readLegacyTickets = async (raffleId: string): Promise<{ tickets: LegacyTicket[]; refsToDelete: QueryDocumentSnapshot[] }> => {
    const docs = (await getDocs(refs.legacyTickets(raffleId))).docs;
    const privates = await Promise.all(docs.map((t) => getDoc(refs.legacyPrivate(raffleId, t.id))));
    const tickets = docs.map((t, i): LegacyTicket => {
      const ticket = t.data();
      const priv = privates[i].data() ?? {};
      return {
        id: t.id,
        status: ticket.status,
        buyerName: priv.buyerName || ticket.buyerName || '',
        buyerPhone: priv.buyerPhone || '',
        advisor: ticket.advisor || null,
        receiptUrl: priv.receiptUrl || ticket.receiptUrl || null,
        reservedAt: toMillis(priv.reservedAt ?? ticket.updatedAt),
        updatedAt: toMillis(ticket.updatedAt),
      };
    });
    return { tickets, refsToDelete: docs };
  };

  const toItem = async (raffleId: string, group: LegacyGroup): Promise<MigratedItem> => {
    const id = `legacy-${(await random.sha256(`${raffleId}|${group.key}`)).slice(0, 24)}`;
    const existing = await getDoc(refs.order(raffleId, id));
    return {
      group,
      existed: existing.exists(),
      order: {
        id,
        raffleId,
        numbers: group.numbers,
        buyer: group.buyer,
        advisor: group.advisor,
        advisorId: null,
        status: 'active',
        payments: group.payments,
        // Reutiliza el enlace si la orden ya se había creado en un intento anterior.
        accessToken: existing.data()?.accessToken ?? random.token(),
        source: 'admin',
        createdAt: group.createdAt,
        updatedAt: group.createdAt,
      },
    };
  };

  return {
    async hasLegacyData(raffleId) {
      const snap = await getDocs(query(refs.legacyTickets(raffleId), limit(1)));
      return !snap.empty;
    },

    async migrate(ctx: AdminContext) {
      const { raffle } = ctx;
      const { tickets, refsToDelete } = await readLegacyTickets(raffle.id);
      const groups = groupLegacyTickets(tickets, raffle.price);
      const items = await Promise.all(groups.map((group) => toItem(raffle.id, group)));
      const maxReceipts = Math.max(0, ...groups.map((g) => g.pendingReceipts.length));

      // orden + tablero + enlace + comprobantes pendientes, atómicos por comprador
      await commitInChunks(items, BASE_OPS_PER_ORDER + maxReceipts, (batch, { order, group, existed }) => {
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
        if (existed) return;
        group.pendingReceipts.forEach(({ receiptUrl }) =>
          batch.set(doc(refs.submissions(raffle.id)), {
            orderId: order.id,
            token: order.accessToken,
            amount: null,
            receiptUrl,
            note: 'Comprobante del sistema anterior',
            createdAt: serverTimestamp(),
          }),
        );
      });

      const migratedNumbers = items.reduce((total, { order }) => total + order.numbers.length, 0);
      const finish = writeBatch(db);
      finish.set(refs.board(raffle.id), { updatedAt: serverTimestamp() }, { merge: true });
      finish.update(refs.raffle(raffle.id), {
        status: raffle.status,
        reservationHours: raffle.reservationHours || DEFAULT_RESERVATION_HOURS,
      });
      writeAudit(
        finish,
        ctx,
        'legacy_migrated',
        null,
        `${migratedNumbers} números vendidos migrados al nuevo modelo (${items.length} compradores)`,
      );
      await finish.commit();

      await commitInChunks(refsToDelete, 2, (batch, t) => {
        batch.delete(refs.legacyPrivate(raffle.id, t.id));
        batch.delete(t.ref);
      });
      return migratedNumbers;
    },
  };
};
