import type { TicketStatus } from '../types';

export const TICKET_STATUS_OPTIONS: { value: TicketStatus | 'all'; label: string; variant: any }[] = [
  { value: 'all', label: 'Todos los Estados', variant: 'slate' },
  { value: 'disponible', label: 'Disponibles', variant: 'default' },
  { value: 'reservado', label: 'Reservados', variant: 'amber' },
  { value: 'pagado_transferencia', label: 'Pagado (Transf.)', variant: 'emerald' },
  { value: 'pagado_efectivo', label: 'Pagado (Efec.)', variant: 'emerald' },
];

export const DIGIT_COUNT_OPTIONS = [
  { value: 2, label: '2 Cifras (00 - 99)' },
  { value: 3, label: '3 Cifras (000 - 999)' },
  { value: 4, label: '4 Cifras (0000 - 9999)' },
];

export const SORT_OPTIONS = [
  { value: 'id', label: 'Ordenar por: Número' },
  { value: 'date', label: 'Ordenar por: Más Recientes' },
];
