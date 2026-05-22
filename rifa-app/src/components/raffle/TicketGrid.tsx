import React from 'react';
import TicketItem from './TicketItem';
import type { Ticket } from '../../types';

interface TicketGridProps {
  tickets: Ticket[];
  onTicketClick: (ticket: Ticket) => void;
}

const TicketGrid: React.FC<TicketGridProps> = ({ tickets, onTicketClick }) => {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-3">
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
