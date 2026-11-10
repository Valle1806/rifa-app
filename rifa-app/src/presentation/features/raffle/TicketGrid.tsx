import { memo } from 'react';
import type { TicketView } from '../../../domain';
import { cn } from '../../shared/cn';
import { STATUS_META } from '../../shared/statusMeta';

interface TicketGridProps {
  tickets: TicketView[];
  selected?: ReadonlySet<string>;
  /** Qué números se pueden pulsar (en público solo los disponibles; en admin todos). */
  isClickable: (ticket: TicketView) => boolean;
  onTicketClick: (ticket: TicketView) => void;
  /** Texto del tooltip: alias en público, nombre completo en admin. */
  tooltipFor: (ticket: TicketView) => string | null;
}

interface CellProps {
  ticket: TicketView;
  isSelected: boolean;
  clickable: boolean;
  tooltip: string | null;
  onClick: (ticket: TicketView) => void;
}

const TicketCell = memo(({ ticket, isSelected, clickable, tooltip, onClick }: CellProps) => {
  const meta = STATUS_META[ticket.state];
  return (
    <button
      type="button"
      onClick={() => onClick(ticket)}
      disabled={!clickable}
      aria-pressed={isSelected}
      aria-label={`Número ${ticket.number}: ${meta.label}${tooltip ? `, ${tooltip}` : ''}`}
      className={cn(
        'group relative aspect-square rounded-xl border-2 font-bold text-base sm:text-lg transition flex flex-col items-center justify-center',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500',
        isSelected ? 'bg-indigo-600 text-white border-indigo-700 scale-95' : meta.cell,
        clickable ? 'cursor-pointer active:scale-95' : 'cursor-not-allowed',
      )}
    >
      <span>{ticket.number}</span>
      {ticket.state !== 'available' && !isSelected && (
        <span className="text-[9px] uppercase font-bold opacity-75 leading-none">{meta.label}</span>
      )}
      {tooltip && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-[11px] rounded whitespace-nowrap z-10 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity"
        >
          {tooltip}
        </span>
      )}
    </button>
  );
});
TicketCell.displayName = 'TicketCell';

export const TicketGrid = ({ tickets, selected, isClickable, onTicketClick, tooltipFor }: TicketGridProps) => (
  <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1.5 sm:gap-2">
    {tickets.map((ticket) => (
      <TicketCell
        key={ticket.number}
        ticket={ticket}
        isSelected={selected?.has(ticket.number) ?? false}
        clickable={isClickable(ticket)}
        tooltip={tooltipFor(ticket)}
        onClick={onTicketClick}
      />
    ))}
  </div>
);

const LEGEND_STATES = ['available', 'pending', 'reserved', 'partial', 'paid'] as const;

export const TicketLegend = () => (
  <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold uppercase text-slate-600">
    {LEGEND_STATES.map((state) => (
      <li key={state} className="flex items-center gap-2">
        <span className={cn('w-3.5 h-3.5 rounded border-2', STATUS_META[state].cell)} />
        {STATUS_META[state].label}
      </li>
    ))}
  </ul>
);
