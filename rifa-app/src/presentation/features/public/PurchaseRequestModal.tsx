import { Send } from 'lucide-react';
import { FormProvider } from 'react-hook-form';
import type { Availability, IssuedAccess } from '../../../application/useCases';
import { formatMoney, orderTotal, type Raffle } from '../../../domain';
import { useAsyncAction } from '../../shared/hooks/useAsyncAction';
import { useServices } from '../../shared/services';
import { Button } from '../../shared/ui/Button';
import { Modal } from '../../shared/ui/Modal';
import { BuyerFields, ProofFields } from '../forms/fields';
import { EMPTY_BUYER, EMPTY_PROOF, purchaseFormSchema } from '../forms/formSchemas';
import { useZodForm } from '../forms/useZodForm';

interface PurchaseRequestModalProps {
  open: boolean;
  raffle: Raffle;
  numbers: string[];
  availability: Availability;
  onClose: () => void;
  onSubmitted: (access: IssuedAccess, numbers: string[]) => void;
}

export const PurchaseRequestModal = ({ open, raffle, numbers, availability, onClose, onSubmitted }: PurchaseRequestModalProps) => {
  const { buyer } = useServices();
  const { pending, run } = useAsyncAction();
  const form = useZodForm(purchaseFormSchema, { buyer: EMPTY_BUYER, proof: EMPTY_PROOF, file: null });

  const submit = form.handleSubmit(async (values) => {
    const access = await run(() =>
      buyer.requestNumbers({
        raffle,
        numbers,
        buyer: values.buyer,
        proof: values.file ? { ...values.proof, file: values.file } : null,
        availability,
      }),
    );
    if (access) {
      form.reset();
      onSubmitted(access, numbers);
    }
  });

  return (
    <Modal open={open} onClose={onClose} title="Solicitar números" size="lg">
      <FormProvider {...form}>
        <form onSubmit={submit} className="space-y-6" noValidate>
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900 space-y-1">
            <p className="font-bold">
              {numbers.length === 1 ? 'Número' : 'Números'}: {numbers.join(', ')}
            </p>
            <p>
              Total: <strong>{formatMoney(orderTotal(numbers.length, raffle.price))}</strong>. Los números quedan en
              revisión hasta que el organizador apruebe tu solicitud.
            </p>
          </div>

          <BuyerFields idPrefix="purchase" />

          <details className="rounded-2xl border border-slate-200 p-4 group">
            <summary className="cursor-pointer font-bold text-slate-700 text-sm">
              ¿Ya pagaste? Adjunta el comprobante (opcional)
            </summary>
            <p className="text-xs text-slate-500 mt-2 mb-4">
              Si pagas después o por partes, sube cada comprobante desde tu enlace de "Mis números".
            </p>
            <ProofFields idPrefix="purchase-proof" fileLabel="Comprobante de pago" />
          </details>

          <Button type="submit" size="lg" fullWidth loading={pending} icon={<Send size={18} />}>
            Enviar solicitud
          </Button>
        </form>
      </FormProvider>
    </Modal>
  );
};
