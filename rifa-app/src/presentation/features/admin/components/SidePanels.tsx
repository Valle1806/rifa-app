import { ClipboardList } from 'lucide-react';
import type { AuditEntry } from '../../../../domain';
import { formatDateTime } from '../../../shared/format';
import { EmptyState, Panel } from '../../../shared/ui/Panel';

export const AuditFeed = ({ entries }: { entries: AuditEntry[] }) => (
  <Panel title="Historial" icon={<ClipboardList size={18} className="text-slate-400" />}>
    {entries.length === 0 ? (
      <EmptyState>Sin actividad registrada</EmptyState>
    ) : (
      <ul className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {entries.map((e) => (
          <li key={e.id} className="border-l-2 border-slate-100 pl-3 py-0.5">
            <div className="flex justify-between gap-2 text-[11px] font-bold">
              <span className="text-indigo-600 truncate">{e.numbers.length > 0 ? `#${e.numbers.join(', #')}` : 'Rifa'}</span>
              <span className="text-slate-400 shrink-0">{formatDateTime(e.createdAt)}</span>
            </div>
            <p className="text-xs font-semibold text-slate-700">{e.detail}</p>
          </li>
        ))}
      </ul>
    )}
  </Panel>
);
