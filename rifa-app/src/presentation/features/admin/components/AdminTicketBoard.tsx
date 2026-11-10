import { HandCoins, X } from 'lucide-react';
import { useCallback } from 'react';
import { MAX_NUMBERS_PER_REQUEST, type TicketView } from '../../../../domain';
import { Button } from '../../../shared/ui/Button';
import { Panel } from '../../../shared/ui/Panel';
import { TicketGrid, TicketLegend } from '../../raffle/TicketGrid';
import { useTicketSelection } from '../../raffle/useTicketSelection';
import type { OrderRow } from '../hooks/useAdminRaffle';

interface AdminTicketBoardProps {
  views: TicketView[];
  rowByNumber: Map<string, OrderRow>;
  onOpenOrder: (row: OrderRow) => void;
  onSell: (numbers: string[]) => void;
}

const always = () => true;

/**
 * Misma grilla que la vista pública, pero con el nombre completo en el tooltip.
 * Pulsar un número vendido abre su compra; pulsar disponibles los selecciona para asignarlos.
 */
export const AdminTicketBoard = ({ views, rowByNumber, onOpenOrder, onSell }: AdminTicketBoardProps) => {
  const selection = useTicketSelection(MAX_NUMBERS_PER_REQUEST);
  const { toggle, clear } = selection;

  const tooltipFor = useCallback(
    (t: TicketView) => {
      const row = rowByNumber.get(t.number);
      return row ? `${row.order.buyer.name} · ${row.order.buyer.phone}` : null;
    },
    [rowByNumber],
  );

  const handleClick = useCallback(
    (t: TicketView) => {
      const row = rowByNumber.get(t.number);
      if (row) onOpenOrder(row);
      else if (t.state === 'available') toggle(t.number);
    },
    [rowByNumber, onOpenOrder, toggle],
  );

  return (
    <Panel
      title="Números"
      actions={
        selection.numbers.length > 0 ? (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={clear} icon={<X size={14} />} aria-label="Quitar selección" />
            <Button
              size="sm"
              icon={<HandCoins size={14} />}
              onClick={() => {
                onSell(selection.numbers);
                clear();
              }}
            >
              Asignar {selection.numbers.length}
            </Button>
          </div>
        ) : (
          <span className="text-xs text-slate-400 font-semibold">Toca disponibles para asignarlos a mano</span>
        )
      }
    >
      <div className="space-y-5">
        <TicketLegend />
        <TicketGrid
          tickets={views}
          selected={selection.selected}
          isClickable={always}
          onTicketClick={handleClick}
          tooltipFor={tooltipFor}
        />
      </div>
    </Panel>
  );
};
