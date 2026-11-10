import { summarizeOrder, type Order, type PaymentLevel } from './order';

export type AccessState = 'pending' | PaymentLevel | 'rejected' | 'cancelled';

/**
 * Vista que ve el comprador en su enlace personal. La mantiene el admin
 * y no contiene teléfono ni comprobantes.
 */
export interface BuyerAccess {
  token: string;
  raffleId: string;
  orderId: string;
  alias: string;
  numbers: string[];
  state: AccessState;
  total: number;
  paid: number;
  updatedAt: number;
}

export const deriveAccessState = (order: Pick<Order, 'status' | 'numbers' | 'payments'>, price: number): AccessState => {
  if (order.status !== 'active') return order.status;
  return summarizeOrder(order, price).level;
};

/** Comprobante que sube el comprador y espera la aprobación del admin. */
export interface PaymentSubmission {
  id: string;
  raffleId: string;
  orderId: string;
  token: string;
  amount: number | null;
  receiptUrl: string;
  note: string | null;
  createdAt: number;
}

export const PIN_LENGTH = 6;
