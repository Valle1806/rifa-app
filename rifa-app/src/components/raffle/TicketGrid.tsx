import React from 'react';
import TicketItem from './TicketItem';
import type { Ticket } from '../../types';

interface TicketGridProps {
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
}

const TicketGrid: React.FC<TicketGridProps> = ({ tickets, onTicketClick }) => {
  return (
    <div className="grid grid-cols-6 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-11 gap-1.5 sm:gap-2">
      {tickets.map((ticket) => (
        <TicketItem 
          key={ticket.id} 
          ticket={ticket} 
          onClick={onTicketClick} 
        />
      ))}
    </div>
  );
};

export default TicketGrid;
