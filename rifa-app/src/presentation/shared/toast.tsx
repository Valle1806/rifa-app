import { AlertCircle, CheckCircle, X } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from './cn';
import { errorMessage } from './errors';

type ToastKind = 'success' | 'error';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

interface Notifier {
  success(message: string): void;
  error(error: unknown): void;
}

const ToastContext = createContext<Notifier | null>(null);

const DURATION_MS = 5000;

/** Un solo sistema de avisos para toda la app. */
export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = ++nextId.current;
      setItems((list) => [...list.slice(-2), { id, kind, message }]);
      setTimeout(() => dismiss(id), DURATION_MS);
    },
    [dismiss],
  );

  const notifier = useMemo<Notifier>(
    () => ({ success: (m) => push('success', m), error: (e) => push('error', errorMessage(e)) }),
    [push],
  );

  return (
    <ToastContext.Provider value={notifier}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-6 inset-x-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role={t.kind === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto w-full max-w-md px-5 py-4 rounded-2xl shadow-2xl border flex items-center gap-3',
              t.kind === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-rose-50 border-rose-100 text-rose-800',
            )}
          >
            {t.kind === 'success' ? <CheckCircle size={20} className="shrink-0" /> : <AlertCircle size={20} className="shrink-0" />}
            <span className="flex-1 text-sm font-bold">{t.message}</span>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Cerrar aviso" className="hover:opacity-70">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = (): Notifier => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
};
