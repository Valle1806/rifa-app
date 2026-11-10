import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type DefaultValues, type FieldValues, type Resolver } from 'react-hook-form';
import type { z } from 'zod';

/** useForm con validación zod: los tipos de entrada y salida salen del propio esquema. */
export const useZodForm = <Schema extends z.ZodType<FieldValues, FieldValues>>(
  schema: Schema,
  defaultValues: DefaultValues<z.input<Schema>>,
) =>
  useForm<z.input<Schema>, unknown, z.output<Schema>>({
    // zodResolver no puede inferir a través de un genérico; el tipo es el del propio esquema.
    resolver: zodResolver(schema) as unknown as Resolver<z.input<Schema>, unknown, z.output<Schema>>,
    defaultValues,
    mode: 'onTouched',
  });
