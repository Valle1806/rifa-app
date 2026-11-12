import { useMemo, useState } from 'react';
import { Controller, useFormContext, type FieldError } from 'react-hook-form';
import type { BuyerFormInput, PaymentFormInput, ProofFormInput } from '../../../application/schemas';
import { BUYER_RULES, advisorKey, findAdvisorByName, type Advisor } from '../../../domain';

type PaymentSection = Pick<PaymentFormInput, 'method'> & { amount: string | number };
import { ImagePicker } from '../../shared/ui/ImagePicker';
import { Field, Select, TextArea, TextInput } from '../../shared/ui/form';

/*
 * Grupos de campos reutilizables. Cada uno lee su sección del formulario padre
 * mediante useFormContext, así el mismo bloque sirve en varios formularios.
 */

const message = (error?: FieldError) => error?.message;

const OTHER = '__other__';

/**
 * Lista de asesores con opción "Otro". Escribe el nombre elegido en `buyer.advisor`;
 * con "Otro" muestra el campo de texto y el admin decide al aprobar.
 */
const AdvisorField = ({ id, advisors, otherHint }: { id: string; advisors: Advisor[]; otherHint?: string }) => {
  const {
    register,
    setValue,
    getValues,
    watch,
    formState: { errors, isDirty },
  } = useFormContext<{ buyer: BuyerFormInput }>();
  const error = errors.buyer?.advisor;
  // Los inactivos no se ofrecen, salvo el que ya tiene la orden que se está editando.
  const [initialKey] = useState(() => advisorKey(getValues('buyer.advisor') ?? ''));
  const options = useMemo(
    () =>
      advisors
        .filter((a) => a.active || advisorKey(a.name) === initialKey)
        .sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [advisors, initialKey],
  );
  const [otherMode, setOtherMode] = useState(false);
  const value = watch('buyer.advisor') ?? '';
  const match = findAdvisorByName(options, value);
  // Tras un reset del formulario (no "dirty") vuelve a la lista aunque antes se eligiera "Otro".
  const choice = (otherMode && isDirty) || (value && !match) ? OTHER : (match?.name ?? '');

  const input = (
    <TextInput
      id={id}
      maxLength={BUYER_RULES.advisorMax}
      placeholder={options.length > 0 ? 'Nombre del asesor' : 'Quién te vendió el número'}
      invalid={!!error}
      {...register('buyer.advisor')}
    />
  );

  if (options.length === 0) {
    return (
      <Field label="Asesor (opcional)" htmlFor={id} error={message(error)}>
        {input}
      </Field>
    );
  }

  return (
    <Field label="Asesor (opcional)" htmlFor={`${id}-select`} error={message(error)} hint={choice === OTHER ? otherHint : undefined}>
      <Select
        id={`${id}-select`}
        value={choice}
        onChange={(event) => {
          const next = event.target.value;
          setOtherMode(next === OTHER);
          setValue('buyer.advisor', next === OTHER ? '' : next, { shouldValidate: true, shouldDirty: true });
        }}
      >
        <option value="">Sin asesor / no sé</option>
        {options.map((a) => (
          <option key={a.id} value={a.name}>
            {a.name}
          </option>
        ))}
        <option value={OTHER}>Otro…</option>
      </Select>
      {choice === OTHER && input}
    </Field>
  );
};

interface BuyerFieldsProps {
  idPrefix: string;
  advisors: Advisor[];
  /** Ayuda bajo "Otro": en el público se aprueba después; en el panel se crea al guardar. */
  otherAdvisorHint?: string;
}

export const BuyerFields = ({ idPrefix, advisors, otherAdvisorHint }: BuyerFieldsProps) => {
  const {
    register,
    formState: { errors },
  } = useFormContext<{ buyer: BuyerFormInput }>();
  const e = errors.buyer;
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="space-y-4">
      <Field label="Nombre completo" htmlFor={id('name')} error={message(e?.name)}>
        <TextInput id={id('name')} autoComplete="name" placeholder="Ej. Juan Pérez" invalid={!!e?.name} {...register('buyer.name')} />
      </Field>
      <Field label="WhatsApp / celular" htmlFor={id('phone')} error={message(e?.phone)}>
        <TextInput
          id={id('phone')}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="Ej. 310 123 4567"
          invalid={!!e?.phone}
          {...register('buyer.phone')}
        />
      </Field>
      <AdvisorField id={id('advisor')} advisors={advisors} otherHint={otherAdvisorHint} />
    </div>
  );
};

export const ProofFields = ({ idPrefix, fileLabel }: { idPrefix: string; fileLabel: string }) => {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<{ proof: ProofFormInput; file: File | null }>();
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="space-y-4">
      <Controller
        control={control}
        name="file"
        render={({ field, fieldState }) => (
          <>
            <ImagePicker id={id('file')} label={fileLabel} value={field.value} onChange={field.onChange} />
            {fieldState.error && <p role="alert" className="text-xs font-semibold text-rose-600">{fieldState.error.message}</p>}
          </>
        )}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Valor pagado (opcional)" htmlFor={id('amount')} error={message(errors.proof?.amount)} hint="Si lo dejas vacío, el admin lo confirma">
          <TextInput id={id('amount')} type="number" inputMode="numeric" min={1} placeholder="Ej. 20000" {...register('proof.amount')} />
        </Field>
        <Field label="Nota (opcional)" htmlFor={id('note')} error={message(errors.proof?.note)}>
          <TextArea id={id('note')} rows={1} maxLength={BUYER_RULES.noteMax} placeholder="Ej. Primer abono" {...register('proof.note')} />
        </Field>
      </div>
    </div>
  );
};

export const PaymentFields = ({ idPrefix, amountOptional = false }: { idPrefix: string; amountOptional?: boolean }) => {
  const {
    register,
    control,
    formState: { errors },
  } = useFormContext<{ payment: PaymentSection; file: File | null }>();
  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={amountOptional ? 'Abono inicial (opcional)' : 'Valor recibido'} htmlFor={id('amount')} error={message(errors.payment?.amount)}>
          <TextInput id={id('amount')} type="number" inputMode="numeric" min={1} invalid={!!errors.payment?.amount} {...register('payment.amount')} />
        </Field>
        <Field label="Medio" htmlFor={id('method')}>
          <Select id={id('method')} {...register('payment.method')}>
            <option value="transfer">Transferencia</option>
            <option value="cash">Efectivo</option>
          </Select>
        </Field>
      </div>
      <Controller
        control={control}
        name="file"
        render={({ field }) => (
          <ImagePicker id={id('file')} label="Comprobante (opcional)" value={field.value} onChange={field.onChange} />
        )}
      />
    </div>
  );
};
