import { Upload } from 'lucide-react';
import { FormProvider } from 'react-hook-form';
import type { BuyerAccess } from '../../../domain';
import { useAsyncAction } from '../../shared/hooks/useAsyncAction';
import { useServices } from '../../shared/services';
import { Button } from '../../shared/ui/Button';
import { ProofFields } from '../forms/fields';
import { EMPTY_PROOF, proofFormSchema } from '../forms/formSchemas';
import { useZodForm } from '../forms/useZodForm';

/** El comprador sube un comprobante; queda pendiente hasta que el admin lo aprueba. */
export const ProofUploadForm = ({ access }: { access: BuyerAccess }) => {
  const { buyer } = useServices();
  const { pending, run } = useAsyncAction();
  const form = useZodForm(proofFormSchema, { proof: EMPTY_PROOF, file: null });

  const submit = form.handleSubmit(async ({ proof, file }) => {
    if (!file) return;
    const done = await run(
      () => buyer.submitProof(access, { ...proof, file }).then(() => true),
      'Comprobante enviado. El organizador lo revisará y actualizará tu saldo.',
    );
    if (done) form.reset();
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <ProofFields idPrefix="upload" fileLabel="Foto o captura del comprobante" />
        <Button type="submit" fullWidth loading={pending} icon={<Upload size={18} />}>
          Enviar comprobante
        </Button>
      </form>
    </FormProvider>
  );
};
