import { Loader2 } from 'lucide-react';
import { cn } from '../cn';

export const Spinner = ({ size = 20, className }: { size?: number; className?: string }) => (
  <Loader2 size={size} className={cn('animate-spin', className)} aria-hidden="true" />
);

export const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50" role="status" aria-label="Cargando">
    <Spinner size={40} className="text-indigo-600" />
  </div>
);
