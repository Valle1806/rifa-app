import { Search } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { pinLookupSchema } from '../../../application/schemas';
import { PIN_LENGTH } from '../../../domain';
import { useAsyncAction } from '../../shared/hooks/useAsyncAction';
import { useServices } from '../../shared/services';
import { useToast } from '../../shared/toast';
import { Button } from '../../shared/ui/Button';
import { Field, TextInput } from '../../shared/ui/form';
import { Panel } from '../../shared/ui/Panel';
import { useZodForm } from '../forms/useZodForm';
import { PublicShell } from '../public/PublicShell';

/** Consulta con celular + PIN para quien perdió su enlace personal. */
export const FindMyNumbersPage = () => {
  const { raffleId = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { buyer } = useServices();
  const { pending, run } = useAsyncAction();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useZodForm(pinLookupSchema, { phone: '', pin: '' });

  const submit = handleSubmit(async (values) => {
    const token = await run(() => buyer.findAccessToken(raffleId, values));
    if (token) navigate(`/mis-numeros/${token}`);
    else if (token === null) toast.error(new Error('No encontramos números con ese celular y PIN.'));
  });

  return (
    <PublicShell title="Consultar mis números" homeHref={`/r/${raffleId}`}>
      <Panel className="max-w-md mx-auto">
        <form onSubmit={submit} className="space-y-5" noValidate>
          <p className="text-sm text-slate-600">
            Escribe el celular con el que reservaste y el PIN de {PIN_LENGTH} dígitos que recibiste al enviar la
            solicitud.
          </p>
          <Field label="Celular" htmlFor="lookup-phone" error={errors.phone?.message}>
            <TextInput id="lookup-phone" type="tel" inputMode="tel" autoComplete="tel-national" invalid={!!errors.phone} {...register('phone')} />
          </Field>
          <Field label="PIN" htmlFor="lookup-pin" error={errors.pin?.message}>
            <TextInput
              id="lookup-pin"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={PIN_LENGTH}
              className="tracking-[0.5em] font-mono text-center text-lg"
              invalid={!!errors.pin}
              {...register('pin')}
            />
          </Field>
          <Button type="submit" fullWidth loading={pending} icon={<Search size={18} />}>
            Consultar
          </Button>
        </form>
      </Panel>
    </PublicShell>
  );
};
