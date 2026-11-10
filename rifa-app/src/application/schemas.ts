import { z } from 'zod';
import {
  BUYER_RULES,
  DEFAULT_RESERVATION_HOURS,
  DIGIT_COUNTS,
  MAX_NUMBERS_PER_REQUEST,
  PIN_LENGTH,
  isValidPhone,
  maxTicketsFor,
  normalizeName,
  normalizePhone,
} from '../domain';

/**
 * Esquemas compartidos por formularios y casos de uso, para que la validación
 * de la UI y la de la aplicación sean exactamente la misma.
 */

const name = z
  .string()
  .transform(normalizeName)
  .pipe(
    z
      .string()
      .min(BUYER_RULES.nameMin, 'Escribe tu nombre completo')
      .max(BUYER_RULES.nameMax, `Máximo ${BUYER_RULES.nameMax} caracteres`),
  );

const phone = z
  .string()
  .refine(isValidPhone, 'Celular de 10 dígitos, por ejemplo 310 123 4567')
  .transform(normalizePhone);

const optionalText = (max: number) =>
  z
    .string()
    .max(max, `Máximo ${max} caracteres`)
    .transform((v) => normalizeName(v) || null);

const money = z.coerce.number<string | number>().int('Usa un valor entero').positive('Debe ser mayor que cero');

const optionalMoney = z
  .union([z.literal(''), z.coerce.number<string | number>().int().positive('Debe ser mayor que cero')])
  .transform((v) => (v === '' ? null : v));

export const buyerSchema = z.object({
  name,
  phone,
  advisor: optionalText(BUYER_RULES.advisorMax),
});
export type BuyerFormInput = z.input<typeof buyerSchema>;
export type BuyerFormValues = z.output<typeof buyerSchema>;

export const numbersSchema = z
  .array(z.string())
  .min(1, 'Elige al menos un número')
  .max(MAX_NUMBERS_PER_REQUEST, `Máximo ${MAX_NUMBERS_PER_REQUEST} números por solicitud`);

export const proofSchema = z.object({
  amount: optionalMoney,
  note: optionalText(BUYER_RULES.noteMax),
});
export type ProofFormInput = z.input<typeof proofSchema>;
export type ProofFormValues = z.output<typeof proofSchema>;

export const paymentSchema = z.object({
  amount: money,
  method: z.enum(['transfer', 'cash']),
});
export type PaymentFormInput = z.input<typeof paymentSchema>;
export type PaymentFormValues = z.output<typeof paymentSchema>;

/** Pago inicial opcional de una venta directa: sin valor = solo reserva. */
export const optionalPaymentSchema = paymentSchema.extend({ amount: optionalMoney });

export const pinLookupSchema = z.object({
  phone,
  pin: z.string().regex(new RegExp(`^\\d{${PIN_LENGTH}}$`), `El código tiene ${PIN_LENGTH} dígitos`),
});
export type PinLookupInput = z.input<typeof pinLookupSchema>;
export type PinLookupValues = z.output<typeof pinLookupSchema>;

export const raffleSchema = z
  .object({
    title: z.string().trim().min(3, 'Mínimo 3 caracteres').max(80),
    description: z.string().trim().min(3, 'Describe el premio').max(2000),
    price: money,
    digitCount: z.coerce
      .number<string | number>()
      .refine((d) => (DIGIT_COUNTS as readonly number[]).includes(d), 'Cantidad de cifras no válida'),
    totalTickets: z.coerce.number<string | number>().int().min(2, 'Mínimo 2 números'),
    reservationHours: z.coerce.number<string | number>().int().min(1).max(168).default(DEFAULT_RESERVATION_HOURS),
    imageUrl: z.string().nullable().default(null),
  })
  .refine((r) => r.totalTickets <= maxTicketsFor(r.digitCount), {
    path: ['totalTickets'],
    message: 'Supera la cantidad de números posibles con esas cifras',
  });
export type RaffleFormInput = z.input<typeof raffleSchema>;
export type RaffleFormValues = z.output<typeof raffleSchema>;

export const loginSchema = z.object({
  email: z.email('Correo no válido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const passwordResetSchema = loginSchema.pick({ email: true });
export type PasswordResetValues = z.infer<typeof passwordResetSchema>;
