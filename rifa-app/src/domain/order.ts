import type { Buyer } from './buyer';

export type OrderStatus = 'pending' | 'active' | 'rejected' | 'cancelled';
export type OrderSource = 'public' | 'admin';
export type PaymentMethod = 'transfer' | 'cash';
export type PaymentLevel = 'reserved' | 'partial' | 'paid';

/** Pago ya verificado por el admin. Los que envía el comprador esperan en PaymentSubmission. */
export interface Payment {
  id: string;
  amount: number;
  method: PaymentMethod;
  receiptUrl: string | null;
  source: 'buyer' | 'admin';
  createdAt: number;
}

export interface Order {
  id: string;
  raffleId: string;
  numbers: string[];
  buyer: Buyer;
  advisor: string | null;
  status: OrderStatus;
  payments: Payment[];
  accessToken: string;
  source: OrderSource;
  createdAt: number;
  updatedAt: number;
}

export interface OrderSummary {
  total: number;
  paid: number;
  balance: number;
  level: PaymentLevel;
}

export const orderTotal = (numberCount: number, price: number): number => numberCount * price;

export const sumPayments = (payments: Pick<Payment, 'amount'>[]): number =>
  payments.reduce((acc, p) => acc + p.amount, 0);

export const paymentLevel = (paid: number, total: number): PaymentLevel => {
  if (paid <= 0) return 'reserved';
  return paid < total ? 'partial' : 'paid';
};

export const summarizeOrder = (order: Pick<Order, 'numbers' | 'payments'>, price: number): OrderSummary => {
  const total = orderTotal(order.numbers.length, price);
  const paid = sumPayments(order.payments);
  return { total, paid, balance: Math.max(total - paid, 0), level: paymentLevel(paid, total) };
};

/** Órdenes que ocupan números en la grilla. */
export const isOrderHoldingNumbers = (order: Pick<Order, 'status'>): boolean => order.status === 'active';
