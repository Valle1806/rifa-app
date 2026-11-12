import { useCallback, useMemo } from 'react';
import type { AdminContext } from '../../../../application/ports';
import {
  advisorKey,
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
  numbers: number;
  collected: number;
  receivable: number;
}

/** Órdenes activas con el asesor escrito a mano y aún sin asignar a uno registrado. */
export interface UnassignedAdvisorGroup {
  /** Como se escribió la primera vez (las variantes de mayúsculas y tildes se agrupan). */
  label: string;
  orderIds: string[];
  numbers: number;
}

const addSale = (stats: AdvisorStats | undefined, summary: OrderSummary, numbers: number): AdvisorStats => ({
  numbers: (stats?.numbers ?? 0) + numbers,
  collected: (stats?.collected ?? 0) + summary.paid,
  receivable: (stats?.receivable ?? 0) + summary.balance,
});

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

    const advisorStats = new Map<string, AdvisorStats>();
    const unassigned = new Map<string, UnassignedAdvisorGroup>();
    let withoutAdvisor = 0;
    active.forEach(({ order, summary }) => {
      if (order.advisorId) {
        advisorStats.set(order.advisorId, addSale(advisorStats.get(order.advisorId), summary, order.numbers.length));
      } else if (order.advisor) {
        const key = advisorKey(order.advisor);
        const group = unassigned.get(key) ?? { label: order.advisor, orderIds: [], numbers: 0 };
        unassigned.set(key, { ...group, orderIds: [...group.orderIds, order.id], numbers: group.numbers + order.numbers.length });
      } else {
        withoutAdvisor += order.numbers.length;
      }
    });

    return {
      rows,
      activeRows: active,
      pendingRequests: rows.filter((r) => r.order.status === 'pending'),
      rowByNumber,
      ordersById: new Map(rows.map((r) => [r.order.id, r])),
      collected: active.reduce((acc, r) => acc + r.summary.paid, 0),
      receivable: active.reduce((acc, r) => acc + r.summary.balance, 0),
      advisorStats,
      unassignedAdvisors: [...unassigned.values()].sort((a, b) => b.numbers - a.numbers),
      numbersWithoutAdvisor: withoutAdvisor,
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
