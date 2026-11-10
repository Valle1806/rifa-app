export type AuditAction =
  | 'request_approved'
  | 'request_rejected'
  | 'order_created'
  | 'order_updated'
  | 'order_cancelled'
  | 'payment_added'
  | 'payment_removed'
  | 'submission_approved'
  | 'submission_rejected'
  | 'legacy_migrated';

export interface AuditEntry {
  id: string;
  action: AuditAction;
  orderId: string | null;
  numbers: string[];
  detail: string;
  performedBy: string;
  createdAt: number;
}
