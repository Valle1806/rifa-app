import { Banknote, Image as ImageIcon, Plus, Receipt, Save, Trash2, Unlock } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { FormProvider } from 'react-hook-form';
import type { AdminContext } from '../../../../application/ports';
import { deriveAccessState, formatMoney, type Payment } from '../../../../domain';
import { accessUrl, formatDateTime } from '../../../shared/format';
import { useAsyncAction } from '../../../shared/hooks/useAsyncAction';
import { useServices } from '../../../shared/services';
import { StatusBadge } from '../../../shared/ui/Badge';
import { Button } from '../../../shared/ui/Button';
import { ConfirmDialog } from '../../../shared/ui/ConfirmDialog';
import { CopyField } from '../../../shared/ui/CopyField';
import { Modal } from '../../../shared/ui/Modal';
import { BuyerFields, PaymentFields } from '../../forms/fields';
import { EMPTY_PAYMENT, buyerFormSchema, paymentFormSchema } from '../../forms/formSchemas';
import { useZodForm } from '../../forms/useZodForm';
import { receiptFromOrder } from '../../receipt/receiptData';
import { ShareableReceipt } from '../../receipt/ShareableReceipt';
import type { OrderRow } from '../hooks/useAdminRaffle';

const METHOD_LABEL: Record<Payment['method'], string> = { transfer: 'Transferencia', cash: 'Efectivo' };

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="space-y-3">
    <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">{title}</h3>
    {children}
  </section>
);

const BuyerEditor = ({ ctx, row }: { ctx: AdminContext; row: OrderRow }) => {
  const { admin } = useServices();
  const { pending, run } = useAsyncAction();
  const { order } = row;
  const form = useZodForm(buyerFormSchema, {
    buyer: {
      name: order.buyer.name,
      phone: order.buyer.phone,
      // El nombre vigente del asesor (pudo haberse renombrado después de la venta).
      advisor: ctx.raffle.advisors.find((a) => a.id === order.advisorId)?.name ?? order.advisor ?? '',
    },
  });

  const submit = form.handleSubmit(({ buyer }) => run(() => admin.updateOrderDetails(ctx, order, buyer), 'Datos actualizados'));

  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <BuyerFields
          idPrefix={`edit-${order.id}`}
          advisors={ctx.raffle.advisors}
          otherAdvisorHint="Se agrega a la lista de asesores al guardar."
        />
        <Button type="submit" variant="secondary" fullWidth loading={pending} icon={<Save size={16} />}>
          Guardar datos
        </Button>
      </form>
    </FormProvider>
  );
};

const PaymentList = ({ ctx, row }: { ctx: AdminContext; row: OrderRow }) => {
  const { admin } = useServices();
  const { pending, run } = useAsyncAction();
  const [removing, setRemoving] = useState<Payment | null>(null);

  if (row.order.payments.length === 0) return <p className="text-sm text-slate-400">Aún no hay pagos registrados.</p>;

  return (
    <>
      <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-100">
        {row.order.payments.map((p) => (
          <li key={p.id} className="flex items-center gap-3 p-3">
            <Banknote size={18} className="text-emerald-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-900 tabular-nums">{formatMoney(p.amount)}</p>
              <p className="text-xs text-slate-500">
                {METHOD_LABEL[p.method]} · {formatDateTime(p.createdAt)} · {p.source === 'buyer' ? 'subido por el comprador' : 'registrado por ti'}
              </p>
            </div>
            {p.receiptUrl && (
              <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer" aria-label="Ver comprobante" className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                <ImageIcon size={16} />
              </a>
            )}
            <button type="button" onClick={() => setRemoving(p)} aria-label="Eliminar pago" className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg">
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={removing !== null}
        title="¿Eliminar pago?"
        confirmLabel="Eliminar"
        loading={pending}
        onCancel={() => setRemoving(null)}
        onConfirm={async () => {
          if (removing) await run(() => admin.removePayment(ctx, row.order.id, removing.id), 'Pago eliminado');
          setRemoving(null);
        }}
      >
        Se quitará el pago de <strong>{removing && formatMoney(removing.amount)}</strong> y se recalculará el saldo.
      </ConfirmDialog>
    </>
  );
};

const AddPaymentForm = ({ ctx, row }: { ctx: AdminContext; row: OrderRow }) => {
  const { admin } = useServices();
  const { pending, run } = useAsyncAction();
  const form = useZodForm(paymentFormSchema, {
    payment: { ...EMPTY_PAYMENT, amount: row.summary.balance || '' },
    file: null,
  });

  const submit = form.handleSubmit(async ({ payment, file }) => {
    const ok = await run(() => admin.addPayment(ctx, row.order.id, { ...payment, file }).then(() => true), 'Pago registrado');
    if (ok) form.reset({ payment: EMPTY_PAYMENT, file: null });
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="space-y-4 rounded-2xl bg-slate-50 p-4" noValidate>
        <PaymentFields idPrefix={`pay-${row.order.id}`} />
        <Button type="submit" variant="success" fullWidth loading={pending} icon={<Plus size={16} />}>
          Registrar pago
        </Button>
      </form>
    </FormProvider>
  );
};

interface OrderDetailModalProps {
  ctx: AdminContext;
  row: OrderRow | undefined;
  onClose: () => void;
}

/** Ficha completa de una compra: comprador, pagos, enlace y liberación de números. */
export const OrderDetailModal = ({ ctx, row, onClose }: OrderDetailModalProps) => {
  const { admin } = useServices();
  const { pending, run } = useAsyncAction();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);

  if (!row) return null;
  const { order, summary } = row;
  const isActive = order.status === 'active';

  return (
    <Modal open onClose={onClose} title={`Números #${order.numbers.join(', #')}`} size="lg">
      <div className="space-y-8">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge state={deriveAccessState(order, ctx.raffle.price)} />
          <span className="text-sm text-slate-600">
            Total {formatMoney(summary.total)} · abonado {formatMoney(summary.paid)} · saldo{' '}
            <strong>{formatMoney(summary.balance)}</strong>
          </span>
        </div>

        <Section title="Enlace del comprador">
          <CopyField label="Mis números" value={accessUrl(order.accessToken)} />
        </Section>

        <Section title="Comprobante para compartir">
          {showReceipt ? (
            <ShareableReceipt data={receiptFromOrder(order, ctx.raffle)} />
          ) : (
            <Button variant="secondary" fullWidth icon={<Receipt size={16} />} onClick={() => setShowReceipt(true)}>
              Ver comprobante
            </Button>
          )}
        </Section>

        {isActive && (
          <>
            <Section title="Pagos">
              <PaymentList ctx={ctx} row={row} />
              {summary.balance > 0 && <AddPaymentForm key={summary.paid} ctx={ctx} row={row} />}
            </Section>
            <Section title="Comprador">
              <BuyerEditor ctx={ctx} row={row} />
            </Section>
            <Button variant="danger" fullWidth icon={<Unlock size={16} />} onClick={() => setConfirmCancel(true)}>
              Liberar números
            </Button>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title="¿Liberar estos números?"
        confirmLabel="Liberar"
        loading={pending}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={async () => {
          const ok = await run(() => admin.cancelOrder(ctx, order.id).then(() => true), 'Números liberados');
          setConfirmCancel(false);
          if (ok) onClose();
        }}
      >
        Los números <strong>#{order.numbers.join(', #')}</strong> quedarán disponibles y la orden de {order.buyer.name}{' '}
        pasará a cancelada. Los pagos registrados se conservan en el historial de la orden.
      </ConfirmDialog>
    </Modal>
  );
};
