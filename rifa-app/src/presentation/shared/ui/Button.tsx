import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../cn';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
  secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700',
  ghost: 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
};

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-6 py-3.5 text-base rounded-2xl gap-2',
};

export interface ButtonProps extends ComponentProps<'button'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  className,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) => (
  <button
    type={type}
    disabled={disabled || loading}
    className={cn(
      'inline-flex items-center justify-center font-bold transition active:scale-[0.98]',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
      VARIANTS[variant],
      SIZES[size],
      fullWidth && 'w-full',
      className,
    )}
    {...props}
  >
    {loading ? <Spinner size={16} /> : icon}
    {children}
  </button>
);
