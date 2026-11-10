import { ShoppingCart, X } from 'lucide-react';
import { formatMoney, orderTotal } from '../../../domain';
import { Button } from '../../shared/ui/Button';

interface SelectionBarProps {
  numbers: string[];
  price: number;
  max: number;
  onClear: () => void;
  onContinue: () => void;
}

export const SelectionBar = ({ numbers, price, max, onClear, onContinue }: SelectionBarProps) => {
  if (numbers.length === 0) return null;
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="max-w-6xl mx-auto flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">
            {numbers.length} {numbers.length === 1 ? 'número' : 'números'}: {numbers.join(', ')}
          </p>
          <p className="text-xs text-slate-500">
            Total {formatMoney(orderTotal(numbers.length, price))} · máximo {max} por solicitud
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClear} icon={<X size={16} />} aria-label="Quitar selección" />
        <Button onClick={onContinue} icon={<ShoppingCart size={18} />}>
          Continuar
        </Button>
      </div>
    </div>
  );
};
