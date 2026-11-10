import { useCallback, useMemo } from 'react';
import type { AdminContext } from '../../../../application/ports';
import {
  isOrderHoldingNumbers,
  summarizeOrder,
  type AuditEntry,
  type Order,
  type OrderSummary,
  type PaymentSubmission,
} from '../../../../domain';
import { useWatch } from '../../../shared/hooks/useWatch';
import { useServices } from '../../../shared/services';
import { useRaffleBoard } from '../../raffle/useRaffleBoard';

const NO_ORDERS: Order[] = [];
const NO_SUBMISSIONS: PaymentSubmission[] = [];
const NO_AUDIT: AuditEntry[] = [];
const AUDIT_LIMIT = 30;

export interface OrderRow {
  order: Order;
  summary: OrderSummary;
  pendingProofs: number;
}

export interface AdvisorStats {
  name: string;
  numbers: number;
  collected: number;
}

/** Todo lo que el panel necesita de una rifa, en tiempo real y ya calculado. */
export const useAdminRaffle = (raffleId: string | null, actor: string) => {
  const services = useServices();
  const board = useRaffleBoard(raffleId);
  const orders = useWatch(raffleId, services.orders.watchAll, NO_ORDERS);
  const submissions = useWatch(raffleId, services.submissions.watchAll, NO_SUBMISSIONS);
  // useWatch necesita una fuente estable; si no, se volvería a suscribir en cada render.
  const watchAudit = useCallback((id: string) => services.audit.watchRecent(id, AUDIT_LIMIT), [services.audit]);
  const auditFeed = useWatch(raffleId, watchAudit, NO_AUDIT);

  const derived = useMemo(() => {
    const price = board.raffle?.price ?? 0;
    const proofsByOrder = new Map<string, number>();
    submissions.data.forEach((s) => proofsByOrder.set(s.orderId, (proofsByOrder.get(s.orderId) ?? 0) + 1));

    const rows: OrderRow[] = orders.data.map((order) => ({
      order,
      summary: summarizeOrder(order, price),
      pendingProofs: proofsByOrder.get(order.id) ?? 0,
    }));
    const active = rows.filter((r) => isOrderHoldingNumbers(r.order));

    const rowByNumber = new Map<string, OrderRow>();
    active.forEach((r) => r.order.numbers.forEach((n) => rowByNumber.set(n, r)));

    const advisors = new Map<string, AdvisorStats>();
    active.forEach(({ order, summary }) => {
      const name = order.advisor ?? 'Sin asesor';
      const current = advisors.get(name) ?? { name, numbers: 0, collected: 0 };
      advisors.set(name, { name, numbers: current.numbers + order.numbers.length, collected: current.collected + summary.paid });
    });

    return {
      rows,
      activeRows: active,
      pendingRequests: rows.filter((r) => r.order.status === 'pending'),
      rowByNumber,
      ordersById: new Map(rows.map((r) => [r.order.id, r])),
      collected: active.reduce((acc, r) => acc + r.summary.paid, 0),
      receivable: active.reduce((acc, r) => acc + r.summary.balance, 0),
      advisors: [...advisors.values()].sort((a, b) => b.numbers - a.numbers),
    };
  }, [orders.data, submissions.data, board.raffle?.price]);

  const ctx = useMemo<AdminContext | null>(() => (board.raffle ? { raffle: board.raffle, actor } : null), [board.raffle, actor]);

  return {
    ...board,
    ...derived,
    ctx,
    submissions: submissions.data,
    audit: auditFeed.data,
    loading: board.loading || orders.loading,
  };
};

export type AdminRaffleData = ReturnType<typeof useAdminRaffle>;
