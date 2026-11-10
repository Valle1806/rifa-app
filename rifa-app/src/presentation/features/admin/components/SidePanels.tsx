import { ClipboardList, Trophy } from 'lucide-react';
import { formatMoney, type AuditEntry } from '../../../../domain';
import { formatDateTime } from '../../../shared/format';
import { EmptyState, Panel } from '../../../shared/ui/Panel';
import type { AdvisorStats } from '../hooks/useAdminRaffle';

export const AdvisorRanking = ({ advisors }: { advisors: AdvisorStats[] }) => (
  <Panel title="Asesores" icon={<Trophy size={18} className="text-amber-500" />}>
    {advisors.length === 0 ? (
      <EmptyState>Sin ventas registradas</EmptyState>
    ) : (
      <ol className="space-y-3">
        {advisors.map((a, i) => (
          <li key={a.name} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-7 h-7 shrink-0 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500 text-xs">
                {i + 1}
              </span>
              <div className="min-w-0">
                <p className="font-bold text-slate-800 truncate">{a.name}</p>
                <p className="text-[11px] text-slate-400 font-bold">{a.numbers} números</p>
              </div>
            </div>
            <span className="font-black text-slate-900 text-sm tabular-nums">{formatMoney(a.collected)}</span>
          </li>
        ))}
      </ol>
    )}
  </Panel>
);

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
