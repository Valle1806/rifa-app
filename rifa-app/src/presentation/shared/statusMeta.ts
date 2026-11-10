import type { AccessState, TicketState } from '../../domain';

export type Tone = 'neutral' | 'amber' | 'sky' | 'emerald' | 'rose' | 'indigo';

interface StatusMeta {
  label: string;
  tone: Tone;
  /** Clases de la celda en la grilla de números. */
  cell: string;
}

/** Única definición de textos y colores de cada estado. */
export const STATUS_META: Record<TicketState | AccessState, StatusMeta> = {
  available: {
    label: 'Disponible',
    tone: 'neutral',
    cell: 'bg-white text-slate-700 border-slate-200 hover:border-indigo-500 hover:text-indigo-600',
  },
  pending: { label: 'En revisión', tone: 'sky', cell: 'bg-sky-50 text-sky-700 border-sky-200' },
  reserved: { label: 'Reservado', tone: 'amber', cell: 'bg-amber-100 text-amber-800 border-amber-200' },
  partial: { label: 'Abonado', tone: 'indigo', cell: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  paid: { label: 'Pagado', tone: 'emerald', cell: 'bg-emerald-500 text-white border-emerald-600' },
  rejected: { label: 'Rechazada', tone: 'rose', cell: 'bg-rose-50 text-rose-700 border-rose-200' },
  cancelled: { label: 'Cancelada', tone: 'rose', cell: 'bg-rose-50 text-rose-700 border-rose-200' },
};

export const TONE_CLASSES: Record<Tone, string> = {
  neutral: 'bg-slate-100 text-slate-600',
  amber: 'bg-amber-100 text-amber-800',
  sky: 'bg-sky-100 text-sky-800',
  emerald: 'bg-emerald-100 text-emerald-800',
  rose: 'bg-rose-100 text-rose-800',
  indigo: 'bg-indigo-100 text-indigo-800',
};
