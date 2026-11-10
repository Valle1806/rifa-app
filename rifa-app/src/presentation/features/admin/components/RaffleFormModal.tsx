import { Save } from 'lucide-react';
import { Controller } from 'react-hook-form';
import { z } from 'zod';
import { raffleSchema } from '../../../../application/schemas';
import { DEFAULT_RESERVATION_HOURS, DIGIT_COUNTS, formatTicketNumber, maxTicketsFor, type Raffle } from '../../../../domain';
import { useAsyncAction } from '../../../shared/hooks/useAsyncAction';
import { useServices } from '../../../shared/services';
import { Button } from '../../../shared/ui/Button';
import { ImagePicker } from '../../../shared/ui/ImagePicker';
import { Field, Select, TextArea, TextInput } from '../../../shared/ui/form';
import { Modal } from '../../../shared/ui/Modal';
import { useZodForm } from '../../forms/useZodForm';

const formSchema = z.object({ raffle: raffleSchema, image: z.instanceof(File).nullable() });

const NEW_RAFFLE = {
  title: '',
  description: '',
  price: 10000,
  digitCount: 2,
  totalTickets: 100,
  reservationHours: DEFAULT_RESERVATION_HOURS,
  imageUrl: null,
};

interface RaffleFormModalProps {
  open: boolean;
  /** Sin rifa = crear una nueva. */
  raffle?: Raffle;
  onClose: () => void;
  onSaved: (raffleId: string) => void;
}

const RaffleForm = ({ raffle, onSaved }: Pick<RaffleFormModalProps, 'raffle' | 'onSaved'>) => {
  const { admin } = useServices();
  const { pending, run } = useAsyncAction();
  const editing = raffle !== undefined;
  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors },
  } = useZodForm(formSchema, { raffle: raffle ?? NEW_RAFFLE, image: null });
  const e = errors.raffle;
  const digitCount = Number(watch('raffle.digitCount'));
  const totalTickets = Number(watch('raffle.totalTickets'));

  const submit = handleSubmit(async ({ raffle: values, image }) => {
    const raffleId = await run(async () => {
      if (!editing) return admin.createRaffle(values, image);
      const imageUrl = image ? await admin.uploadPrizeImage(raffle.id, image) : values.imageUrl;
      const { title, description, price, reservationHours } = values;
      await admin.updateRaffle(raffle.id, { title, description, price, reservationHours, imageUrl });
      return raffle.id;
    }, editing ? 'Rifa actualizada' : 'Rifa creada');
    if (raffleId) onSaved(raffleId);
  });

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <Field label="Título" htmlFor="raffle-title" error={e?.title?.message}>
        <TextInput id="raffle-title" placeholder="Ej. Sorteo moto 2026" invalid={!!e?.title} {...register('raffle.title')} />
      </Field>
      <Field label="Descripción del premio y condiciones" htmlFor="raffle-description" error={e?.description?.message}>
        <TextArea id="raffle-description" rows={4} invalid={!!e?.description} {...register('raffle.description')} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Precio por número" htmlFor="raffle-price" error={e?.price?.message}>
          <TextInput id="raffle-price" type="number" inputMode="numeric" min={1} invalid={!!e?.price} {...register('raffle.price')} />
        </Field>
        <Field label="Horas en revisión" htmlFor="raffle-hours" error={e?.reservationHours?.message} hint="Luego se liberan solos">
          <TextInput id="raffle-hours" type="number" min={1} max={168} {...register('raffle.reservationHours')} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Cifras" htmlFor="raffle-digits" error={e?.digitCount?.message} hint={editing ? 'No se puede cambiar' : undefined}>
          <Select id="raffle-digits" disabled={editing} {...register('raffle.digitCount')}>
            {DIGIT_COUNTS.map((d) => (
              <option key={d} value={d}>
                {d} cifras ({formatTicketNumber(0, d)} - {formatTicketNumber(maxTicketsFor(d) - 1, d)})
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Cantidad de números"
          htmlFor="raffle-total"
          error={e?.totalTickets?.message}
          hint={editing ? 'No se puede cambiar' : `Del ${formatTicketNumber(0, digitCount)} al ${formatTicketNumber(Math.max(totalTickets - 1, 0), digitCount)}`}
        >
          <TextInput id="raffle-total" type="number" min={2} disabled={editing} invalid={!!e?.totalTickets} {...register('raffle.totalTickets')} />
        </Field>
      </div>
      <Controller
        control={control}
        name="image"
        render={({ field }) => (
          <ImagePicker id="raffle-image" label="Imagen del premio (opcional)" value={field.value} onChange={field.onChange} currentUrl={raffle?.imageUrl} />
        )}
      />
      <Button type="submit" size="lg" fullWidth loading={pending} icon={<Save size={18} />}>
        {editing ? 'Guardar cambios' : 'Crear rifa'}
      </Button>
    </form>
  );
};

export const RaffleFormModal = ({ open, raffle, onClose, onSaved }: RaffleFormModalProps) => (
  <Modal open={open} onClose={onClose} title={raffle ? 'Configurar rifa' : 'Nueva rifa'} size="lg">
    <RaffleForm key={raffle?.id ?? 'new'} raffle={raffle} onSaved={onSaved} />
  </Modal>
);
