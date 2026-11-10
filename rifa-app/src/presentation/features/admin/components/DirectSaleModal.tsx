import { HandCoins } from 'lucide-react';
import { FormProvider } from 'react-hook-form';
import type { AdminContext } from '../../../../application/ports';
import type { Availability, IssuedAccess } from '../../../../application/useCases';
import { formatMoney, orderTotal } from '../../../../domain';
import { useAsyncAction } from '../../../shared/hooks/useAsyncAction';
import { useServices } from '../../../shared/services';
import { Button } from '../../../shared/ui/Button';
import { Modal } from '../../../shared/ui/Modal';
import { BuyerFields, PaymentFields } from '../../forms/fields';
import { EMPTY_BUYER, EMPTY_PAYMENT, directSaleFormSchema } from '../../forms/formSchemas';
import { useZodForm } from '../../forms/useZodForm';

interface DirectSaleModalProps {
  ctx: AdminContext;
  open: boolean;
  numbers: string[];
  availability: Availability;
  onClose: () => void;
  onCreated: (access: IssuedAccess, numbers: string[]) => void;
}

/** Venta hecha por el admin: no pasa por aprobación y puede registrar un abono inicial. */
export const DirectSaleModal = ({ ctx, open, numbers, availability, onClose, onCreated }: DirectSaleModalProps) => {
  const { admin } = useServices();
  const { pending, run } = useAsyncAction();
  const form = useZodForm(directSaleFormSchema, { buyer: EMPTY_BUYER, payment: EMPTY_PAYMENT, file: null });

  const submit = form.handleSubmit(async ({ buyer, payment, file }) => {
    const initial = payment.amount === null ? null : { amount: payment.amount, method: payment.method, file };
    const access = await run(() => admin.createDirectOrder(ctx, { numbers, buyer, payment: initial, availability }));
    if (access) {
      form.reset();
      onCreated(access, numbers);
    }
  });

  return (
    <Modal open={open} onClose={onClose} title="Asignar números" size="lg">
      <FormProvider {...form}>
        <form onSubmit={submit} className="space-y-6" noValidate>
          <p className="rounded-2xl bg-indigo-50 border border-indigo-100 p-4 text-sm text-indigo-900">
            <strong>#{numbers.join(', #')}</strong> · total {formatMoney(orderTotal(numbers.length, ctx.raffle.price))}
          </p>
          <BuyerFields idPrefix="sale" />
          <PaymentFields idPrefix="sale-pay" amountOptional />
          <Button type="submit" size="lg" fullWidth loading={pending} icon={<HandCoins size={18} />}>
            Asignar
          </Button>
        </form>
      </FormProvider>
    </Modal>
  );
};
