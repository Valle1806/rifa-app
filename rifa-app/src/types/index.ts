export type TicketStatus = 'disponible' | 'reservado' | 'pagado_transferencia' | 'pagado_efectivo';

export interface Ticket {
  id: string;
  status: TicketStatus;
  advisor?: string;
  updatedAt?: number;
  updatedBy?: string;
  hasReceipt?: boolean; // Indicador público de si existe un comprobante
  // Campos privados (ahora en subcolección o manejados con cuidado)
  buyerName?: string;
  buyerPhone?: string;
  receiptUrl?: string;
  reservedAt?: number;
}

export interface AppConfig {
  id: string;
  title: string;
  price: number;
  description: string;
  totalTickets: number;
  digitCount: number; // Nueva propiedad para definir si es 00-99 (2) o 000-999 (3)
  imageUrl?: string; // URL de la imagen principal del premio
  isActive: boolean;
  createdAt: number;
}

export interface AuditLog {
  id: string;
  ticketId: string;
  action: 'reset' | 'status_change' | 'edit';
  previousState: Partial<Ticket>;
  newState: Partial<Ticket>;
  performedBy: string;
  timestamp: number;
}

export interface AdvisorStats {
  name: string;
  totalSold: number;
  totalRevenue: number;
}
