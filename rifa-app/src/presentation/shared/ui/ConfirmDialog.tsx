import type { ReactNode } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({
  open,
  title,
  children,
  confirmLabel,
  tone = 'danger',
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => (
  <Modal open={open} onClose={onCancel} title={title}>
    <div className="space-y-6">
      <div className="text-sm text-slate-700 leading-relaxed">{children}</div>
      <div className="flex gap-3">
        <Button variant="secondary" fullWidth onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant={tone} fullWidth loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  </Modal>
);
