import React from 'react';
import { Edit2, RotateCcw, Image as ImageIcon } from 'lucide-react';
import type { Ticket } from '../../types';
import { Badge } from '../common/Badge';
import { TICKET_STATUS_OPTIONS } from '../../utils/constants';

interface TicketTableProps {
  tickets: Ticket[];
  onEdit: (ticket: Ticket) => void;
  onReset: (ticket: Ticket) => void;
}

export const TicketTable: React.FC<TicketTableProps> = ({ tickets, onEdit, onReset }) => {
  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'buyer', label: 'Comprador' },
    { key: 'status', label: 'Estado' },
    { key: 'advisor', label: 'Asesor' },
    { key: 'img', label: 'Img' },
    { key: 'actions', label: 'Acciones', align: 'text-right' },
  ];

  const getStatusLabel = (status: string) => {
    const option = TICKET_STATUS_OPTIONS.find(opt => opt.value === status);
    return {
      label: option?.label.replace(' (Transf.)', '').replace(' (Efec.)', '') || status,
      variant: option?.variant || 'default'
    };
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {columns.map(col => (
                <th key={col.key} className={`px-6 py-4 text-xs font-black uppercase text-slate-500 ${col.align || ''}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tickets.map(ticket => {
              const statusInfo = getStatusLabel(ticket.status);
              return (
                <tr key={ticket.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 font-black text-slate-900">#{ticket.id}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800">{ticket.buyerName || '---'}</span>
                      <span className="text-xs text-slate-400 font-medium">{ticket.buyerPhone || ''}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={statusInfo.variant}>
                      {statusInfo.label}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-600 text-sm">
                    {ticket.advisor || '---'}
                  </td>
                  <td className="px-6 py-4">
                    {ticket.hasReceipt && (
                      ticket.receiptUrl ? (
                        <a 
                          href={ticket.receiptUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg inline-block hover:bg-indigo-200 transition-colors"
                          title="Ver comprobante"
                        >
                          <ImageIcon size={14} />
                        </a>
                      ) : (
                        <button
                          onClick={() => onEdit(ticket)}
                          className="bg-slate-100 text-slate-400 p-1.5 rounded-lg inline-block hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                          title="Comprobante en datos privados (Haz clic para editar)"
                        >
                          <ImageIcon size={14} />
                        </button>
                      )
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onEdit(ticket)}
                        className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-lg transition"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => onReset(ticket)}
                        className="p-2 hover:bg-rose-50 text-rose-600 rounded-lg transition"
                      >
                        <RotateCcw size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
