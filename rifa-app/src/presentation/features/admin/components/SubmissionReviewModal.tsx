import { Check, ExternalLink, X } from 'lucide-react';
import { z } from 'zod';
import type { AdminContext } from '../../../../application/ports';
import { paymentSchema } from '../../../../application/schemas';
import { formatMoney, type PaymentSubmission } from '../../../../domain';
import { useAsyncAction } from '../../../shared/hooks/useAsyncAction';
import { useServices } from '../../../shared/services';
import { Button } from '../../../shared/ui/Button';
import { Field, TextInput } from '../../../shared/ui/form';
import { Modal } from '../../../shared/ui/Modal';
import { useZodForm } from '../../forms/useZodForm';
import type { OrderRow } from '../hooks/useAdminRaffle';

const reviewSchema = z.object({ amount: paymentSchema.shape.amount });

interface ReviewFormProps {
  ctx: AdminContext;
  submission: PaymentSubmission;
  row: OrderRow | undefined;
  onDone: () => void;
}

const ReviewForm = ({ ctx, submission, row, onDone }: ReviewFormProps) => {
  const { admin } = useServices();
  const approve = useAsyncAction();
  const reject = useAsyncAction();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useZodForm(reviewSchema, { amount: submission.amount ?? row?.summary.balance ?? '' });

  const submit = handleSubmit(async ({ amount }) => {
    const ok = await approve.run(() => admin.approveSubmission(ctx, submission.id, amount).then(() => true), 'Pago registrado');
    if (ok) onDone();
  });

  const discard = async () => {
    const ok = await reject.run(() => admin.rejectSubmission(ctx, submission.id).then(() => true), 'Comprobante descartado');
    if (ok) onDone();
  };

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <a href={submission.receiptUrl} target="_blank" rel="noopener noreferrer" className="block group relative">
        <img src={submission.receiptUrl} alt="Comprobante enviado" className="w-full max-h-80 object-contain rounded-2xl bg-slate-900" />
        <span className="absolute bottom-3 right-3 flex items-center gap-1 bg-white/90 rounded-lg px-2 py-1 text-xs font-bold text-slate-700">
          Ver completo <ExternalLink size={12} />
        </span>
      </a>

      {row ? (
        <p className="text-sm text-slate-600">
          <strong>{row.order.buyer.name}</strong> · #{row.order.numbers.join(', #')} · saldo actual{' '}
          <strong>{formatMoney(row.summary.balance)}</strong>
        </p>
      ) : (
        <p className="text-sm text-rose-600">La orden de este comprobante ya no existe.</p>
      )}
      {submission.note && <p className="text-sm text-slate-600 italic">"{submission.note}"</p>}

      <Field label="Valor que confirmas" htmlFor="review-amount" error={errors.amount?.message} hint="Revisa que coincida con el comprobante">
        <TextInput id="review-amount" type="number" inputMode="numeric" min={1} invalid={!!errors.amount} {...register('amount')} />
      </Field>

      <div className="flex gap-3">
        <Button variant="secondary" fullWidth loading={reject.pending} icon={<X size={16} />} onClick={discard}>
          Descartar
        </Button>
        <Button type="submit" variant="success" fullWidth loading={approve.pending} disabled={!row} icon={<Check size={16} />}>
          Aprobar pago
        </Button>
      </div>
    </form>
  );
};

export const SubmissionReviewModal = ({
  ctx,
  submission,
  row,
  onClose,
}: {
  ctx: AdminContext;
  submission: PaymentSubmission | null;
  row: OrderRow | undefined;
  onClose: () => void;
}) => (
  <Modal open={submission !== null} onClose={onClose} title="Revisar comprobante">
    {submission && <ReviewForm key={submission.id} ctx={ctx} submission={submission} row={row} onDone={onClose} />}
  </Modal>
);
