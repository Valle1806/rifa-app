import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '../cn';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'md' | 'lg';
}

/**
 * Diálogo nativo: el navegador se encarga del foco, de Escape y del fondo inerte.
 */
export const Modal = ({ open, onClose, title, children, size = 'md' }: ModalProps) => {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className={cn(
        'm-auto w-[calc(100%-2rem)] p-0 bg-white text-slate-900 rounded-3xl shadow-2xl backdrop:bg-slate-900/70 backdrop:backdrop-blur-sm',
        size === 'lg' ? 'max-w-2xl' : 'max-w-md',
      )}
    >
      <div className="flex flex-col max-h-[90vh]">
        <header className="bg-indigo-600 px-6 py-5 text-white flex justify-between items-center gap-4 shrink-0">
          <h2 id="modal-title" className="text-lg font-bold">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="hover:bg-indigo-700 p-2 rounded-full transition">
            <X size={20} />
          </button>
        </header>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </dialog>
  );
};
