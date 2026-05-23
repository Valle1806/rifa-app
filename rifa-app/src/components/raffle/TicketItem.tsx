import React from 'react';
import type { Ticket } from '../../types';

interface TicketItemProps {
  ticket: Ticket;
  onClick: (ticket: Ticket) => void;
}

const TicketItem: React.FC<TicketItemProps> = ({ ticket, onClick }) => {
  const getStatusStyles = () => {
    switch (ticket.status) {
      case 'disponible':
        return 'bg-white text-slate-700 border-slate-400 hover:border-indigo-500 hover:text-indigo-600 shadow-md shadow-slate-400/50 hover:shadow-lg hover:shadow-slate-400/60';
      case 'reservado':
        return 'bg-amber-100 text-amber-700 border-amber-200 cursor-not-allowed shadow-md shadow-amber-300/70';
      case 'pagado_transferencia':
      case 'pagado_efectivo':
        return 'bg-emerald-500 text-white border-emerald-600 cursor-not-allowed shadow-md shadow-emerald-800/40';
      default:
        return 'bg-slate-100 text-slate-400 border-slate-200 shadow-sm shadow-slate-300/50';
    }
  };

  return (
    <button
      onClick={() => ticket.status === 'disponible' && onClick(ticket)}
      disabled={ticket.status !== 'disponible'}
      title={ticket.buyerName ? `Comprado por: ${ticket.buyerName}` : 'Disponible'}
      className={`
        aspect-square rounded-lg border-2 font-bold text-xs sm:text-sm transition-all duration-200 flex flex-col items-center justify-center gap-0.5
        ${getStatusStyles()}
        ${ticket.status === 'disponible' ? 'active:scale-95' : ''}
        group relative
      `}
    >
      <span>{ticket.id}</span>
      {ticket.status !== 'disponible' && (
        <span className="text-[9px] sm:text-[10px] uppercase font-bold opacity-75">
          {ticket.status === 'reservado' ? 'Reserv.' : 'Pagado'}
        </span>
      )}
      
      {/* Tooltip personalizado opcional */}
      {ticket.buyerName && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
          {ticket.buyerName}
        </div>
      )}
    </button>
  );
};

export default TicketItem;
