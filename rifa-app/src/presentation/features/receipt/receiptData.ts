import { deriveAccessState, summarizeOrder, type AccessState, type BuyerAccess, type Order, type Raffle } from '../../../domain';

/** Lo que muestra el comprobante, venga del enlace del comprador o de la orden en el panel. */
export interface ReceiptData {
  raffleTitle: string;
  holder: string;
  numbers: string[];
  state: AccessState;
  total: number;
  paid: number;
  balance: number;
  issuedAt: number;
  reference: string;
}

/** Referencia corta y legible; no expone el token del enlace personal. */
const referenceOf = (orderId: string) => orderId.slice(0, 8).toUpperCase();

export const receiptFromAccess = (access: BuyerAccess, raffleTitle: string): ReceiptData => ({
  raffleTitle,
  holder: access.alias,
  numbers: access.numbers,
  state: access.state,
  total: access.total,
  paid: access.paid,
  balance: Math.max(access.total - access.paid, 0),
  issuedAt: access.updatedAt,
  reference: referenceOf(access.orderId),
});

export const receiptFromOrder = (order: Order, raffle: Pick<Raffle, 'title' | 'price'>): ReceiptData => {
  const summary = summarizeOrder(order, raffle.price);
  return {
    raffleTitle: raffle.title,
    holder: order.buyer.name,
    numbers: order.numbers,
    state: deriveAccessState(order, raffle.price),
    total: summary.total,
    paid: summary.paid,
    balance: summary.balance,
    issuedAt: order.updatedAt,
    reference: referenceOf(order.id),
  };
};

export const receiptFileName = (data: ReceiptData) => `rifa-numeros-${data.numbers.join('-')}.png`;

export const receiptShareText = (data: ReceiptData) =>
  `${data.raffleTitle}: ${data.numbers.length === 1 ? 'número' : 'números'} ${data.numbers.join(', ')}`;
