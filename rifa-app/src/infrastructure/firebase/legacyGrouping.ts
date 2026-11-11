import { normalizeName, normalizePhone, type Buyer, type Payment } from '../../domain';

export type LegacyStatus = 'disponible' | 'reservado' | 'pagado_transferencia' | 'pagado_efectivo';

/** Un número del modelo anterior, ya combinado con su documento privado. */
export interface LegacyTicket {
  id: string;
  status: LegacyStatus;
  buyerName: string;
  buyerPhone: string;
  advisor: string | null;
  receiptUrl: string | null;
  reservedAt: number;
  updatedAt: number;
}

export interface PendingReceipt {
  ticketId: string;
  receiptUrl: string;
}

/** Todo lo que compró una misma persona en el modelo anterior: se convierte en una sola orden. */
export interface LegacyGroup {
  /** Identifica al comprador de forma estable entre ejecuciones (celular + nombre, o el número si no hay celular). */
  key: string;
  numbers: string[];
  buyer: Buyer;
  advisor: string | null;
  payments: Payment[];
  pendingReceipts: PendingReceipt[];
  createdAt: number;
}

const isPaid = (status: LegacyStatus) => status.startsWith('pagado');

/** Nombre comparable: sin tildes, mayúsculas ni espacios de más. */
const comparableName = (name: string): string =>
  normalizeName(name).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

/**
 * Mismo celular y mismo nombre = mismo comprador. Se exigen ambos porque en el
 * modelo anterior un vendedor podía registrar a varias personas con su propio celular.
 */
const buyerKey = (ticket: LegacyTicket): string => {
  const phone = normalizePhone(ticket.buyerPhone);
  return phone ? `buyer:${phone}|${comparableName(ticket.buyerName)}` : `ticket:${ticket.id}`;
};

/** Pago del número ya cobrado; el id se deriva del número para que repetir la migración no lo duplique. */
const toPayment = (ticket: LegacyTicket, price: number): Payment => ({
  id: `legacy-${ticket.id}`,
  amount: price,
  method: ticket.status === 'pagado_efectivo' ? 'cash' : 'transfer',
  receiptUrl: ticket.receiptUrl,
  source: 'admin',
  createdAt: ticket.updatedAt,
});

/**
 * Agrupa los números vendidos del modelo anterior por comprador (celular + nombre),
 * para crear una orden por persona con todos sus números y pagos.
 */
export const groupLegacyTickets = (tickets: LegacyTicket[], price: number): LegacyGroup[] => {
  const groups = new Map<string, LegacyGroup>();

  for (const ticket of tickets) {
    if (ticket.status === 'disponible') continue;
    const key = buyerKey(ticket);
    const group =
      groups.get(key) ??
      ({
        key,
        numbers: [],
        buyer: { name: '', phone: normalizePhone(ticket.buyerPhone) },
        advisor: null,
        payments: [],
        pendingReceipts: [],
        createdAt: ticket.reservedAt,
      } satisfies LegacyGroup);

    group.numbers.push(ticket.id);
    group.buyer.name ||= normalizeName(ticket.buyerName);
    group.advisor ??= ticket.advisor;
    group.createdAt = Math.min(group.createdAt, ticket.reservedAt);
    if (isPaid(ticket.status)) group.payments.push(toPayment(ticket, price));
    else if (ticket.receiptUrl) group.pendingReceipts.push({ ticketId: ticket.id, receiptUrl: ticket.receiptUrl });

    groups.set(key, group);
  }

  return [...groups.values()].map((group) => ({
    ...group,
    numbers: group.numbers.sort(),
    buyer: { ...group.buyer, name: group.buyer.name || 'Sin nombre' },
  }));
};
