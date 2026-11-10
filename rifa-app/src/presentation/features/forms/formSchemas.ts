import { z } from 'zod';
import { buyerSchema, optionalPaymentSchema, paymentSchema, proofSchema } from '../../../application/schemas';

/**
 * Esquemas de formularios de la UI, compuestos a partir de los esquemas de aplicación.
 * Los campos reutilizables (BuyerFields, ProofFields, PaymentFields) leen estas mismas claves.
 */

const file = z.instanceof(File).nullable();

export const purchaseFormSchema = z.object({ buyer: buyerSchema, proof: proofSchema, file });
export type PurchaseFormInput = z.input<typeof purchaseFormSchema>;

export const proofFormSchema = z.object({
  proof: proofSchema,
  file: file.refine((f) => f !== null, 'Adjunta la foto o captura del comprobante'),
});
export type ProofUploadInput = z.input<typeof proofFormSchema>;

export const buyerFormSchema = z.object({ buyer: buyerSchema });
export type BuyerOnlyInput = z.input<typeof buyerFormSchema>;

export const directSaleFormSchema = z.object({
  buyer: buyerSchema,
  payment: optionalPaymentSchema,
  file,
});
export type DirectSaleInput = z.input<typeof directSaleFormSchema>;

export const paymentFormSchema = z.object({ payment: paymentSchema, file });
export type PaymentInput = z.input<typeof paymentFormSchema>;

export const EMPTY_BUYER = { name: '', phone: '', advisor: '' };
export const EMPTY_PROOF = { amount: '', note: '' };
export const EMPTY_PAYMENT = { amount: '', method: 'transfer' as const };
