import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../cn';

const CONTROL =
  'w-full px-4 py-3 bg-slate-50 border rounded-xl outline-none transition focus:ring-2 focus:ring-indigo-500 focus:bg-white';

const controlClass = (invalid: boolean, className?: string) =>
  cn(CONTROL, invalid ? 'border-rose-400' : 'border-slate-200', className);

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}

/** Etiqueta + control + ayuda/error, con los ids enlazados para lectores de pantalla. */
export const Field = ({ label, htmlFor, error, hint, children }: FieldProps) => (
  <div className="space-y-1.5">
    <label htmlFor={htmlFor} className="block text-sm font-bold text-slate-700">
      {label}
    </label>
    {children}
    {error ? (
      <p id={`${htmlFor}-error`} role="alert" className="text-xs font-semibold text-rose-600">
        {error}
      </p>
    ) : (
      hint && <p className="text-xs text-slate-400">{hint}</p>
    )}
  </div>
);

type ControlProps<T extends 'input' | 'textarea' | 'select'> = ComponentProps<T> & { invalid?: boolean };

const describedBy = (id: string | undefined, invalid: boolean) => (invalid && id ? `${id}-error` : undefined);

export const TextInput = ({ invalid = false, className, ...props }: ControlProps<'input'>) => (
  <input
    aria-invalid={invalid}
    aria-describedby={describedBy(props.id, invalid)}
    className={controlClass(invalid, className)}
    {...props}
  />
);

export const TextArea = ({ invalid = false, className, ...props }: ControlProps<'textarea'>) => (
  <textarea
    aria-invalid={invalid}
    aria-describedby={describedBy(props.id, invalid)}
    className={controlClass(invalid, className)}
    {...props}
  />
);

export const Select = ({ invalid = false, className, ...props }: ControlProps<'select'>) => (
  <select
    aria-invalid={invalid}
    aria-describedby={describedBy(props.id, invalid)}
    className={controlClass(invalid, cn('font-semibold', className))}
    {...props}
  />
);
