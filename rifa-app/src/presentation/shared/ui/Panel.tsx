import type { ReactNode } from 'react';
import { cn } from '../cn';

interface PanelProps {
  title?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Contenedor blanco con encabezado opcional, usado en todo el panel y la vista pública. */
export const Panel = ({ title, icon, actions, children, className }: PanelProps) => (
  <section className={cn('bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-6', className)}>
    {(title || actions) && (
      <header className="flex items-center justify-between gap-3 mb-5">
        {title && (
          <h3 className="flex items-center gap-2 font-black text-slate-900 uppercase text-sm tracking-widest">
            {icon}
            {title}
          </h3>
        )}
        {actions}
      </header>
    )}
    {children}
  </section>
);

export const EmptyState = ({ children }: { children: ReactNode }) => (
  <p className="text-center py-8 text-slate-400 font-semibold text-sm">{children}</p>
);
