import React from 'react';
import { ClipboardList } from 'lucide-react';

interface AuditLogEntry {
  id: string;
  ticketId: string;
  timestamp: number;
  action: string;
  newState: {
    status?: string;
  };
}

interface AuditLogsProps {
  logs: AuditLogEntry[];
}

export const AuditLogs: React.FC<AuditLogsProps> = ({ logs }) => {
  return (
    <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
      <div className="flex items-center gap-3 mb-6">
        <ClipboardList size={20} className="text-slate-400" />
        <h3 className="font-black text-slate-900 uppercase text-sm tracking-widest">Registros (Auditoría)</h3>
      </div>
      <div className="space-y-4 max-h-96 overflow-y-auto pr-2 scrollbar-thin">
        {logs.length > 0 ? logs.map((log) => (
          <div key={log.id} className="border-l-2 border-slate-100 pl-4 py-1 space-y-1">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase text-indigo-600">Ticket #{log.ticketId}</span>
              <span className="text-[9px] text-slate-400 font-bold">
                {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-[11px] font-bold text-slate-700 leading-tight">
              {log.action === 'reset' ? '🔄 Número reseteado' : 
               log.action === 'status_change' ? `📝 Estado: ${log.newState.status?.replace('_', ' ')}` : 
               '✏️ Datos modificados'}
            </p>
          </div>
        )) : (
          <div className="text-center py-8 text-slate-400 font-bold text-xs italic">
            Sin actividad registrada
          </div>
        )}
      </div>
    </section>
  );
};
